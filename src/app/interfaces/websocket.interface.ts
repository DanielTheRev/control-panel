export interface SocketNotification {
  id: string;
  type: string;
  message: string;
  data: any;
  timestamp: string;
  read?: boolean;
}

export interface TransactionNotification extends SocketNotification {
  type: 'new-transaction';
  data: {
    orderId: string;
    user: {
      id: string;
      name: string;
      email: string;
    };
    total: number;
    status: string;
    paymentMethod: string;
    items: Array<{
      product: any;
      quantity: number;
      price: number;
    }>;
  };
}

export interface OrderUpdateNotification extends SocketNotification {
  type: 'order-update';
  data: {
    orderId: string;
    user: {
      id: string;
      name: string;
      email: string;
    };
    previousStatus: string;
    newStatus: string;
    total: number;
    updatedBy: string;
  };
}

export interface WebSocketState {
  connected: boolean;
  notifications: SocketNotification[];
  unreadCount: number;
}
