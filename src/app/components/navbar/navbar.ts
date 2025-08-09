import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { WebSocketService } from '../../services/websocket.service';

@Component({
  selector: 'app-navbar',
  imports: [CommonModule, RouterLink],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class Navbar implements OnInit {
  private authService = inject(AuthService);
  private wsService = inject(WebSocketService);

  ngOnInit() {
    // Solicitar permisos de notificación
    this.wsService.requestNotificationPermission();
  }

  // Computed properties
  get user() {
    return this.authService.user();
  }

  get wsConnected() {
    return this.wsService.connected();
  }

  get notificationCount() {
    return this.wsService.unreadCount();
  }

  get latestNotifications() {
    return this.wsService.latestNotifications();
  }

  logout() {
    this.authService.logout().subscribe();
  }

  markNotificationsAsRead() {
    this.wsService.markAsRead();
  }

  clearNotifications() {
    this.wsService.clearNotifications();
  }

  getConnectionStatus() {
    return this.wsService.getConnectionStats();
  }
}
