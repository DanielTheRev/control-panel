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
import { TenantBootstrapStateService } from '../../../states/tenant-bootstrap.state.service';
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
  readonly bootstrapState = inject(TenantBootstrapStateService);

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

  appVersion = environment.appVersion;
  buildDate = environment.buildDate;

  get brandName(): string {
    const tenant = localStorage.getItem('lastTenantSlug');
    if (tenant) {
      return tenant.charAt(0).toUpperCase() + tenant.slice(1);
    }
    return environment.brandName;
  }

  /**
   * Grupos de navegación dinámicos resueltos por el Backend en bootstrap.navigation.sidebarGroups
   * (Jerarquía de 3 niveles: Manifest -> Rubro -> Cliente + Rol/Permisos).
   */
  readonly visibleGroups = computed<ISidebarGroup[]>(() =>
    this.bootstrapState
      .sidebarGroups()
      .filter((group) => group.items.length > 0)
      .map((group) => ({
        id: group.groupKey,
        title: group.groupLabel,
        items: group.items.map((item) => ({
          id: item.key,
          label: item.label,
          icon: item.icon,
          route: item.route,
          highlight: item.key === 'pos',
        })),
      }))
  );

  onItemClick(): void {
    if (this.isMobile()) {
      this.sidebarService.closeMobile();
    }
  }
}
