import { Component, inject } from '@angular/core';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { DatePipe } from '@angular/common';
import { WebSocketService } from '../../../../../services/websocket.service';

@Component({
  selector: 'app-notifications',
  imports: [
    DatePipe,
    MatToolbarModule,
    MatMenuModule,
    MatButtonModule,
    MatBadgeModule,
    MatIconModule,
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
   * Mapeo de tipos a iconos de Angular Material
   */
  getMaterialIcon(type: string): string {
    switch (type) {
      case 'new_order':
        return 'shopping_cart';
      case 'order_status':
        return 'local_shipping';
      case 'payment_received':
        return 'payments';
      default:
        return 'info';
    }
  }

  getIconBgClass(type: string): string {
    switch (type) {
      case 'new_order':
        return 'bg-emerald-500';
      case 'order_status':
        return 'bg-blue-500';
      case 'payment_received':
        return 'bg-amber-500';
      default:
        return 'bg-slate-400 dark:bg-slate-600';
    }
  }
}
