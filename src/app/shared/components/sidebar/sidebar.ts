import { CommonModule } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../services/auth.service';
import { BusinessProfileService } from '../../../services/business-profile.service';
import { SidebarService } from '../../../services/sidebar.service';
import { StoreConfigStateService } from '../../../states/store.config.state.service';
import { COUNTER_SIDEBAR_GROUPS, RETAIL_SIDEBAR_GROUPS } from './sidebar.config';
import { ISidebarGroup } from './sidebar.models';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    MatIconModule,
    MatTooltipModule,
  ],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class SidebarComponent {
  /** Indica si se está renderizando dentro del drawer mobile o como aside desktop */
  isMobile = input<boolean>(false);

  sidebarService = inject(SidebarService);
  authService = inject(AuthService);
  profile = inject(BusinessProfileService);
  #storeConfig = inject(StoreConfigStateService);

  storeConfig = computed(() => this.#storeConfig.StoreConfig());
  isExpanded = computed(() => this.sidebarService.SidebarStatus().isExpanded);
  isCollapsed = computed(() => this.sidebarService.SidebarStatus().isCollapsed);

  currentUser = computed(() => this.authService.user());

  userInitials = computed(() => {
    const name = this.currentUser()?.name?.trim();
    if (!name) return 'VX';
    const parts = name.split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  });

  userRoleLabel = computed(() => {
    const role = this.currentUser()?.role;
    if (role === 'admin') return 'Administrador';
    if (role === 'employee') return 'Operador';
    return 'Staff';
  });

  appVersion = environment.appVersion || 'v1.4.2';
  buildDate = environment.buildDate || '28/08/2026';

  get brandName(): string {
    const tenant = localStorage.getItem('lastTenantSlug');
    if (tenant) {
      return tenant.charAt(0).toUpperCase() + tenant.slice(1);
    }
    return environment.brandName;
  }

  /**
   * Grupos de navegación calculados reactivamente según el rubro comercial (vertical),
   * el rol de usuario (Admin vs Empleado) y las capacidades habilitadas.
   */
  readonly visibleGroups = computed<ISidebarGroup[]>(() => {
    const isAdmin = this.authService.isAdmin();
    const features = this.profile.features();
    const isCounter = this.profile.isKioskOrCounter();

    const baseGroups = isCounter ? COUNTER_SIDEBAR_GROUPS : RETAIL_SIDEBAR_GROUPS;

    return baseGroups
      .filter((group) => {
        if (group.adminOnly && !isAdmin) return false;
        if (group.requiredFeature && !features[group.requiredFeature]) return false;
        return true;
      })
      .map((group) => {
        const visibleItems = group.items.filter((item) => {
          if (item.adminOnly && !isAdmin) return false;
          if (item.requiredFeature && !features[item.requiredFeature]) return false;
          return true;
        });
        return {
          ...group,
          items: visibleItems,
        };
      })
      .filter((group) => group.items.length > 0);
  });

  onItemClick(): void {
    if (this.isMobile()) {
      this.sidebarService.closeMobile();
    }
  }
}
