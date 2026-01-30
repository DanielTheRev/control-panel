import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { DatePipe } from '@angular/common';
import { WebSocketService } from '../../../../../services/websocket.service';
import { NotificationSeverity, NotificationType } from '../../../../../interfaces/notification.interface';

@Component({
  selector: 'app-notifications',
  imports: [
    DatePipe,
    CommonModule,
    MatIconModule,
    MatMenuModule,
    MatButtonModule
  ],
  templateUrl: './notifications.html',
  styleUrl: './notifications.scss',
})
export class Notifications {
  private wsService = inject(WebSocketService);

  get notificationCount() {
    return this.wsService.unreadCount();
  }

  get latestNotifications() {
    return this.wsService.latestNotifications();
  }

  markNotificationsAsRead() {
    this.wsService.markAsRead();
  }

  clearNotifications() {
    this.wsService.clearNotifications();
  }

  /**
   * Mapeo de tipos a iconos de Material Icons
   */
  getMaterialIcon(type: NotificationType): string {
    switch (type) {
      case NotificationType.NEW_ORDER:
        return 'shopping_cart';
      case NotificationType.ORDER_STATUS_CHANGED:
        return 'local_shipping';
      case NotificationType.PAYMENT_SUCCESS:
        return 'payments';
      case NotificationType.PAYMENT_FAILED:
        return 'credit_card_off';
      case NotificationType.LOW_STOCK:
        return 'inventory_2';
      case NotificationType.SYSTEM_ALERT:
        return 'warning';
      default:
        return 'notifications';
    }
  }

  getIconBgClass(type: NotificationType): string {
    switch (type) {
      case NotificationType.NEW_ORDER:
        return 'bg-emerald-500';
      case NotificationType.ORDER_STATUS_CHANGED:
        return 'bg-blue-500';
      case NotificationType.PAYMENT_SUCCESS:
        return 'bg-amber-500';
      case NotificationType.PAYMENT_FAILED:
      case NotificationType.SYSTEM_ALERT:
        return 'bg-red-500';
      case NotificationType.LOW_STOCK:
        return 'bg-orange-500';
      default:
        return 'bg-slate-400 dark:bg-slate-600';
    }
  }
}
