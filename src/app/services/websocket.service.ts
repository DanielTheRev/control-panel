import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import {
  IAdminNotification,
  INotification,
  NotificationType,
} from '../interfaces/notification.interface';
import { WebSocketState } from '../interfaces/websocket.interface';
import { OrdersStateService } from '../states/order.state.service';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';
import { getTenantSlug } from '../utils/tenant.utils';

@Injectable({
  providedIn: 'root',
})
export class WebSocketService {
  private socket: Socket | null = null;
  private orderState = inject(OrdersStateService);

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

  constructor(private authService: AuthService) {
    console.log('🔌 Inicializando WebSocketService');
    effect(() => {
      if (this.authService.isAuthenticated()) {
        console.log('✅ Usuario admin autenticado, conectando WebSocket...');
        this.connect();
      } else {
        console.log(
          '❌ Usuario no admin o no autenticado, desconectando WebSocket...',
        );
        this.disconnect();
      }
    });
  }

  connect(): void {
    if (this.socket?.connected) {
      console.log('ℹ️ WebSocket ya está conectado');
      return;
    }

    console.log('🔌 Creando conexión WebSocket:');

    const tenantId = getTenantSlug();

    this.socket = io(environment.socket_config.url, {
      withCredentials: true,
      path: environment.socket_config.path,
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

  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.updateConnectionState(true);
    });

    this.socket.on('disconnect', () => {
      this.updateConnectionState(false);
    });

    // Unificada: Notificación de Admin
    this.socket.on('admin-notification', (notification: IAdminNotification) => {
      console.log('📨 Notificación de Admin:', notification);

      this.handleSideEffects(notification);
      this.addNotification(notification);

      // Mostrar notificación nativa si es relevante
      if (!notification.read) {
        this.showNotification(notification.title, notification.message);
      }
    });
  }

  private handleSideEffects(notification: IAdminNotification) {
    // Si es una nueva orden, actualizar el estado
    if (notification.type === NotificationType.NEW_ORDER) {
      this.orderState.addNewOrder(notification.data);
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.updateConnectionState(false);
    }
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

  private showNotification(title: string, body: string): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: 'nexocommerce-admin',
      });
    } else {
      this.requestNotificationPermission().then(() => {
        if (Notification.permission === 'granted') {
          new Notification(title, {
            body,
            icon: '/favicon.ico',
            tag: 'nexocommerce-admin',
          });
        }
      });
    }
  }

  // Métodos públicos para interactuar con WebSocket
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

  markAsRead(notificationId?: string): void {
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
