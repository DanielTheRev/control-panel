import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Notifications } from './components/notifications/notifications';
import { UserDropdown } from './components/user-dropdown/user-dropdown';
import { SidebarService } from '../../../services/sidebar.service';
import { WebSocketService } from '../../../services/websocket.service';

@Component({
  selector: 'app-navbar',
  imports: [CommonModule, RouterLink, Notifications, UserDropdown],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class Navbar {
  private wsService = inject(WebSocketService);
  private sidebarService = inject(SidebarService);

  isDark = false;

  get wsConnected() {
    return this.wsService.connected();
  }

  toggleExpanded() {
    this.sidebarService.toggleExpanded();
  }

  toggleTheme() {
    this.isDark = !this.isDark;
    const html = document.documentElement;
    html.setAttribute('data-theme', this.isDark ? 'electromix-dark' : 'electromix-light');
  }

  getConnectionStatus() {
    return this.wsService.wsState();
  }
}
