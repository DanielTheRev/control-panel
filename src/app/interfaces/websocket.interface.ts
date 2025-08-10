import { IOrder } from './order.interface';

export interface SocketNotification {
  id: string;
  type: string;
  message: string;
  data: any;
  timestamp: string;
  read?: boolean;
}

export interface newOrderNotification extends SocketNotification {
  type: 'transaction-new';
  data: IOrder;
}

export interface OrderUpdateNotification extends SocketNotification {
  type: 'order_new';
  data: IOrder;
}

export interface WebSocketState {
  connected: boolean;
  notifications: SocketNotification[];
  unreadCount: number;
}
