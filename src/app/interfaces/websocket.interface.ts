import { INotification } from './notification.interface';

export interface WebSocketState {
  connected: boolean;
  notifications: INotification[];
  unreadCount: number;
}
