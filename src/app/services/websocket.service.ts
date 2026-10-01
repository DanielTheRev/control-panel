import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { createClient, RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import {
  IAdminNotification,
  INotification,
  NotificationType,
} from '../interfaces/notification.interface';
import { WebSocketState } from '../interfaces/websocket.interface';
import { OrdersStateService } from '../states/order.state.service';
import { AuthService } from './auth.service';
import { SoundService } from './sound.service';
import { DebugService } from './debug.service';
import { environment } from '../../environments/environment';
import { getTenantSlug } from '../utils/tenant.utils';

@Injectable({
  providedIn: 'root',
})
export class WebSocketService {
  private socket: Socket | null = null;
  private supabase: SupabaseClient | null = null;
  private adminChannel: RealtimeChannel | null = null;
  private posChannel: RealtimeChannel | null = null;
  private terminalChannel: RealtimeChannel | null = null;

  private orderState = inject(OrdersStateService);
  private soundService = inject(SoundService);
  #debug = inject(DebugService);
  private barcodeScanned$ = new Subject<{ barcode: string; deviceId?: string }>();

  // Signals para el estado de WebSocket
  private _wsState = signal<WebSocketState>({
    connected: false,
    notifications: [],
    unreadCount: 0,
  });

  // Computed properties
  public wsState = computed(() => this._wsState());
  public connected = computed(() => this._wsState().connected);
  public notifications = computed(() => this._wsState().notifications as INotification[]);
  public unreadCount = computed(() => this._wsState().unreadCount);
  public latestNotifications = computed(() =>
    (this._wsState().notifications as INotification[]).slice(0, 50)
  );

  // Scanner status para terminales POS
  public activeScannersCount = signal<number>(0);
  public activeScanners = signal<any[]>([]);
  public isScannerConnected = computed(() => this.activeScannersCount() > 0);
  private currentTerminalId: string | null = null;

  /**
   * Proveedor activo: configurado formalmente desde environment
   */
  public get provider(): 'socketio' | 'supabase' {
    const env = environment as any;
    return env.realtimeProvider || env.realtime_provider || 'supabase';
  }

  constructor(private authService: AuthService) {
    this.#debug.log(`🔌 Inicializando WebSocketService [Provider: ${this.provider}]`);
    effect(() => {
      if (this.authService.isAuthenticated()) {
        this.#debug.log(`✅ Usuario admin autenticado, conectando Realtime [${this.provider}]...`);
        this.connect();
      } else {
        this.#debug.log(
          '❌ Usuario no admin o no autenticado, desconectando Realtime...',
        );
        this.disconnect();
      }
    });
  }

  connect(): void {
    if (this.provider === 'supabase') {
      this.connectSupabase();
    } else {
      this.connectSocketIo();
    }
  }

  private connectSocketIo(): void {
    if (this.socket?.connected) {
      this.#debug.log('ℹ️ WebSocket Socket.io ya está conectado');
      return;
    }

    this.#debug.log('🔌 Creando conexión WebSocket Socket.io:');

    const tenantId = getTenantSlug();

    const env = environment as any;
    const socketUrl = env.socketUrl || env.socket_config?.url;
    const socketPath = env.socketPath || env.socket_config?.path;

    this.socket = io(socketUrl, {
      withCredentials: true,
      path: socketPath,
      extraHeaders: { 'x-tenant-id': tenantId },
      query: { tenantId },
      transports: ['websocket', 'polling'],
      autoConnect: true,
      timeout: 5000,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    this.setupEventListeners();
  }

  private connectSupabase(): void {
    if (this.adminChannel) {
      this.#debug.log('ℹ️ Supabase Realtime ya está conectado');
      return;
    }

    const env = environment as any;
    const supabaseUrl = env.supabaseUrl || env.supabase?.url;
    const supabaseKey = env.supabasePublishableKey || env.supabase?.publishableKey;

    if (!supabaseUrl || !supabaseKey) {
      console.warn('[Supabase Realtime] ⚠️ Falta configuración de Supabase en environment');
      return;
    }

    this.#debug.log('⚡ Creando conexión Supabase Realtime...');

    if (!this.supabase) {
      this.supabase = createClient(supabaseUrl, supabaseKey);
    }

    const tenantId = getTenantSlug();
    const adminTopic = `tenant:${tenantId}:admins`;
    const posTopic = `tenant:${tenantId}:pos`;

    // 1. Canal de administradores
    this.adminChannel = this.supabase.channel(adminTopic);
    this.adminChannel
      .on('broadcast', { event: 'admin-notification' }, (payload: any) => {
        const notification = payload.payload as IAdminNotification;
        this.#debug.log('📨 [Supabase Realtime] Notificación de Admin:', notification);

        this.handleSideEffects(notification);
        this.addNotification(notification);

        if (!notification.read) {
          this.showNotification(notification.title, notification.message, notification.id);
        }
      })
      .on('broadcast', { event: 'pos:barcode_scanned' }, (payload: any) => {
        this.#debug.log('📷 [Supabase Realtime] Código de barras escaneado:', payload.payload);
        this.barcodeScanned$.next(payload.payload);
      })
      .on('broadcast', { event: 'pos:scanner_status' }, (payload: any) => {
        this.#debug.log('📱 [Supabase Realtime] Estado de escáner:', payload.payload);
        this.activeScannersCount.set(payload.payload?.scannersCount || 0);
        this.activeScanners.set(payload.payload?.scanners || []);
      })
      .subscribe((status) => {
        this.#debug.log(`⚡ [Supabase Realtime] Canal Admin [${adminTopic}] estado: ${status}`);
        if (status === 'SUBSCRIBED') {
          this.updateConnectionState(true);
          if (this.currentTerminalId) {
            this.joinPosTerminal(this.currentTerminalId);
          }
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          this.updateConnectionState(false);
        }
      });

    // 2. Canal de mostrador POS global
    this.posChannel = this.supabase.channel(posTopic);
    this.posChannel
      .on('broadcast', { event: 'pos:barcode_scanned' }, (payload: any) => {
        this.barcodeScanned$.next(payload.payload);
      })
      .on('broadcast', { event: 'pos:scanner_status' }, (payload: any) => {
        this.activeScannersCount.set(payload.payload?.scannersCount || 0);
        this.activeScanners.set(payload.payload?.scanners || []);
      })
      .subscribe();
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.updateConnectionState(true);
      if (this.currentTerminalId) {
        this.joinPosTerminal(this.currentTerminalId);
      }
    });

    this.socket.on('disconnect', () => {
      this.updateConnectionState(false);
      this.activeScannersCount.set(0);
      this.activeScanners.set([]);
    });

    // Unificada: Notificación de Admin
    this.socket.on('admin-notification', (notification: IAdminNotification) => {
      this.#debug.log('📨 Notificación de Admin:', notification);

      this.handleSideEffects(notification);
      this.addNotification(notification);

      // Mostrar notificación nativa si es relevante
      if (!notification.read) {
        this.showNotification(notification.title, notification.message, notification.id);
      }
    });

    // Evento de escaneo remoto de código de barras (desde app móvil)
    this.socket.on('pos:barcode_scanned', (data: { barcode: string; deviceId?: string }) => {
      this.#debug.log('📷 Código de barras escaneado remotamente:', data);
      this.barcodeScanned$.next(data);
    });

    // Evento de estado de escáneres móviles conectados
    this.socket.on('pos:scanner_status', (data: { connected: boolean; scannersCount: number; scanners: any[]; terminalId?: string }) => {
      this.#debug.log('📱 Estado de escáneres remotos:', data);
      this.activeScannersCount.set(data?.scannersCount || 0);
      this.activeScanners.set(data?.scanners || []);
    });
  }

  private handleSideEffects(notification: IAdminNotification) {
    // Si es una nueva orden, actualizar el estado
    if (notification.type === NotificationType.NEW_ORDER) {
      this.orderState.addNewOrder(notification.data);
      if (!notification.read) {
        this.soundService.startOrderAlarm();
      }
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    if (this.adminChannel) {
      this.supabase?.removeChannel(this.adminChannel);
      this.adminChannel = null;
    }

    if (this.posChannel) {
      this.supabase?.removeChannel(this.posChannel);
      this.posChannel = null;
    }

    if (this.terminalChannel) {
      this.supabase?.removeChannel(this.terminalChannel);
      this.terminalChannel = null;
    }

    this.updateConnectionState(false);
    this.activeScannersCount.set(0);
    this.activeScanners.set([]);
  }

  private updateConnectionState(connected: boolean): void {
    this._wsState.update((state) => ({ ...state, connected }));
  }

  private addNotification(notification: any): void {
    this._wsState.update((state) => ({
      ...state,
      notifications: [notification, ...state.notifications].slice(0, 100),
      unreadCount: state.unreadCount + 1,
    }));
  }

  private showNotification(title: string, body: string, notificationId?: string): void {
    const options: NotificationOptions = {
      body,
      icon: '/favicon.ico',
      tag: notificationId || 'nexocommerce-admin',
    };

    const createNotification = () => {
      const n = new Notification(title, options);
      n.onclick = (e) => {
        e.preventDefault();
        window.focus();
        this.soundService.stopAlarm();
      };
    };

    if ('Notification' in window && Notification.permission === 'granted') {
      createNotification();
    } else {
      this.requestNotificationPermission().then(() => {
        if (Notification.permission === 'granted') {
          createNotification();
        }
      });
    }
  }

  // Métodos públicos para interactuar con WebSocket / Realtime
  joinRoom(room: string): void {
    if (this.socket?.connected) {
      this.socket.emit('join-room', room);
    }
  }

  leaveRoom(room: string): void {
    if (this.socket?.connected) {
      this.socket.emit('leave-room', room);
    }
  }

  onBarcodeScanned(): Observable<{ barcode: string; deviceId?: string }> {
    return this.barcodeScanned$.asObservable();
  }

  joinPosTerminal(terminalId: string): void {
    this.currentTerminalId = terminalId;
    const tenantId = getTenantSlug();

    if (this.provider === 'supabase') {
      if (this.terminalChannel) {
        this.supabase?.removeChannel(this.terminalChannel);
        this.terminalChannel = null;
      }
      if (this.supabase && terminalId) {
        const cleanTerminal = terminalId.trim().toLowerCase();
        const terminalTopic = `tenant:${tenantId}:terminal:${cleanTerminal}`;
        this.#debug.log(`⚡ [Supabase Realtime] Suscribiendo terminal POS a [${terminalTopic}]`);

        this.terminalChannel = this.supabase.channel(terminalTopic);
        this.terminalChannel
          .on('broadcast', { event: 'pos:barcode_scanned' }, (payload: any) => {
            this.#debug.log(`📷 [Supabase Realtime] Barcode recibido en terminal [${cleanTerminal}]:`, payload.payload);
            this.barcodeScanned$.next(payload.payload);
          })
          .on('broadcast', { event: 'pos:scanner_status' }, (payload: any) => {
            this.activeScannersCount.set(payload.payload?.scannersCount || 0);
            this.activeScanners.set(payload.payload?.scanners || []);
          })
          .subscribe();
      }
    } else if (this.socket?.connected) {
      this.socket.emit('pos:join_terminal', { terminalId, tenantSlug: tenantId });
    }
  }

  markAsRead(notificationId?: string): void {
    this.soundService.stopAlarm();
    if (notificationId) {
      this._wsState.update((state) => ({
        ...state,
        notifications: state.notifications.map((n: any) =>
          n.id === notificationId ? { ...n, read: true } : n,
        ),
        unreadCount: Math.max(0, state.unreadCount - 1)
      }));
    } else {
      this._wsState.update((state) => ({
        ...state,
        notifications: state.notifications.map((n: any) => ({ ...n, read: true })),
        unreadCount: 0,
      }));
    }
  }

  clearNotifications(): void {
    this.soundService.stopAlarm();
    this._wsState.update((state) => ({
      ...state,
      notifications: [],
      unreadCount: 0,
    }));
  }

  async requestNotificationPermission(): Promise<boolean> {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }
}
