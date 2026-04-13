import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';

import { SidebarService } from '../../../services/sidebar.service';
import { WebSocketService } from '../../../services/websocket.service';
import { Notifications } from './components/notifications/notifications';
import { UserDropdown } from './components/user-dropdown/user-dropdown';

@Component({
  selector: 'app-navbar',
  imports: [CommonModule, Notifications, UserDropdown],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class Navbar {
  private wsService = inject(WebSocketService);
  private sidebarService = inject(SidebarService);

  navbarTitle = computed(() => this.sidebarService.navbarTitle());

  isDark = document.documentElement.getAttribute('data-theme') === 'luxury';

  get wsConnected() {
    return this.wsService.connected();
  }

  toggleExpanded() {
    this.sidebarService.toggleExpanded();
  }

  toggleTheme() {
    this.isDark = !this.isDark;
    const theme = this.isDark ? 'luxury' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }

  getConnectionStatus() {
    return this.wsService.wsState();
  }
}
