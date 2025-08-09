import { Injectable, signal, computed, effect } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable, fromEvent, of } from 'rxjs';
import {
  SocketNotification,
  TransactionNotification,
  OrderUpdateNotification,
  WebSocketState,
} from '../interfaces/websocket.interface';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class WebSocketService {
  private socket: Socket | null = null;
  private readonly SERVER_URL = 'http://localhost:3000';

  // Signals para el estado de WebSocket
  private _wsState = signal<WebSocketState>({
    connected: false,
    notifications: [],
    unreadCount: 0,
  });

  // Computed properties
  public wsState = computed(() => this._wsState());
  public connected = computed(() => this._wsState().connected);
  public notifications = computed(() => this._wsState().notifications);
  public unreadCount = computed(() => this._wsState().unreadCount);
  public latestNotifications = computed(() =>
    this._wsState().notifications.slice(-10).reverse()
  );

  constructor(private authService: AuthService) {
    console.log('🔌 Inicializando WebSocketService');
    // Escuchar cambios en el estado de autenticación usando effect
    effect(() => {
      const isAuth = this.authService.isAuthenticated();
      const isAdmin = this.authService.isAdmin();
      const user = this.authService.user();

      console.log('🔄 Estado de auth cambió:', {
        isAuth,
        isAdmin,
        user: user?.email,
      });

      if (isAuth && isAdmin) {
        console.log('✅ Usuario admin autenticado, conectando WebSocket...');
        this.connect();
      } else {
        console.log(
          '❌ Usuario no admin o no autenticado, desconectando WebSocket...'
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

    // Obtenemos las cookies que contienen el token de autenticación
    const token = this.getCookieToken();

    if (!token) {
      console.warn('⚠️ No se pudo obtener el token para WebSocket');
      const user = this.authService.user();
      console.log('👤 Estado del usuario:', user);
      return;
    }

    console.log(
      '🔌 Creando conexión WebSocket con token:',
      token.substring(0, 20) + '...'
    );

    this.socket = io(this.SERVER_URL, {
      auth: {
        token: token,
      },
      transports: ['websocket', 'polling'],
      autoConnect: true,
      timeout: 5000,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    this.setupEventListeners();

    console.log('🔌 Intentando conectar WebSocket a:', this.SERVER_URL);
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    // Eventos de conexión
    this.socket.on('connect', () => {
      console.log('✅ WebSocket conectado:', this.socket?.id);
      this.updateConnectionState(true);
    });

    this.socket.on('disconnect', (reason: string) => {
      console.log('❌ WebSocket desconectado:', reason);
      this.updateConnectionState(false);
    });

    this.socket.on('connect_error', (error: Error) => {
      console.error('❌ Error de conexión WebSocket:', error);
      this.updateConnectionState(false);
    });

    // Evento de confirmación de conexión exitosa
    this.socket.on('connection-success', (data: any) => {
      console.log('✅ Conexión WebSocket confirmada:', data);
    });

    // Notificaciones de transacciones
    this.socket.on(
      'transaction-notification',
      (notification: TransactionNotification) => {
        console.log('📨 Nueva transacción:', notification);
        this.addNotification(notification);
        this.showNotification(
          'Nueva Transacción',
          `Orden #${notification.data.orderId.slice(-6)} - $${
            notification.data.total
          }`
        );
      }
    );

    // Notificaciones de actualizaciones de órdenes
    this.socket.on(
      'order-notification',
      (notification: OrderUpdateNotification) => {
        console.log('📨 Actualización de orden:', notification);
        this.addNotification(notification);
        this.showNotification(
          'Orden Actualizada',
          `Orden #${notification.data.orderId.slice(-6)} - ${
            notification.data.newStatus
          }`
        );
      }
    );

    // Notificaciones generales de admin
    this.socket.on('admin-notification', (notification: SocketNotification) => {
      console.log('📨 Notificación de admin:', notification);
      this.addNotification(notification);
      this.showNotification('Notificación', `${notification.type}`);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.updateConnectionState(false);
      console.log('🔴 WebSocket desconectado manualmente');
    }
  }

  // Obtener token de las cookies (simulado, ya que las httpOnly cookies no son accesibles desde JS)
  private getCookieToken(): string | null {
    // En un entorno real con httpOnly cookies, necesitaríamos un endpoint del servidor
    // que nos proporcione un token específico para WebSocket, o usar el mismo sistema de cookies
    // Para este ejemplo, simularemos que tenemos acceso al token

    // Intentar obtener de una cookie accesible o hacer una petición al servidor
    const user = this.authService.user();
    console.log('🍪 Obteniendo token de cookie para usuario:', user?.email);

    if (user) {
      // Simular token basado en el usuario actual
      const token = user.token;
      console.log('✅ Token generado para WebSocket');
      return token;
    }

    console.log('❌ No se pudo generar token - usuario no encontrado');
    return null;
  }

  private updateConnectionState(connected: boolean): void {
    this._wsState.update((state: WebSocketState) => ({ ...state, connected }));
  }

  private addNotification(notification: SocketNotification): void {
    this._wsState.update((state: WebSocketState) => ({
      ...state,
      notifications: [notification, ...state.notifications].slice(0, 100), // Limitar a 100 notificaciones
      unreadCount: state.unreadCount + 1,
    }));
  }

  private showNotification(title: string, body: string): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: 'electro-hub-admin',
      });
    }
  }

  // Métodos públicos para interactuar con WebSocket
  joinRoom(room: string): void {
    if (this.socket?.connected) {
      this.socket.emit('join-room', room);
      console.log(`🛋️ Unido a la sala: ${room}`);
    }
  }

  leaveRoom(room: string): void {
    if (this.socket?.connected) {
      this.socket.emit('leave-room', room);
      console.log(`🛋️ Salido de la sala: ${room}`);
    }
  }

  markAsRead(notificationId?: string): void {
    if (notificationId) {
      // Marcar una notificación específica como leída
      this._wsState.update((state: WebSocketState) => ({
        ...state,
        notifications: state.notifications.map((n: SocketNotification) =>
          n.id === notificationId ? { ...n, read: true } : n
        ),
      }));
    } else {
      // Marcar todas como leídas
      this._wsState.update((state: WebSocketState) => ({
        ...state,
        unreadCount: 0,
      }));
    }
  }

  clearNotifications(): void {
    this._wsState.update((state: WebSocketState) => ({
      ...state,
      notifications: [],
      unreadCount: 0,
    }));
  }

  // Solicitar permisos de notificación
  async requestNotificationPermission(): Promise<boolean> {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }

  // Obtener estadísticas de conexión
  getConnectionStats(): { connected: boolean; socketId: string | null } {
    return {
      connected: this.socket?.connected || false,
      socketId: this.socket?.id || null,
    };
  }

  // Método para pruebas - simular estado conectado
  simulateConnection(): void {
    console.log('🧪 Simulando conexión WebSocket para pruebas');
    this.updateConnectionState(true);

    // Agregar notificación de prueba
    const testNotification: SocketNotification = {
      id: 'test-' + Date.now(),
      type: 'new_order',
      message: 'Nueva orden recibida - Orden #123456',
      data: { orderId: '123456', total: 299.99 },
      timestamp: new Date().toISOString(),
      read: false,
    };

    this.addNotification(testNotification);
    console.log('✅ Notificación de prueba agregada');
  }

  // Forzar reconexión
  forceReconnect(): void {
    console.log('🔄 Forzando reconexión WebSocket');
    this.disconnect();
    setTimeout(() => {
      this.connect();
    }, 1000);
  }
}
