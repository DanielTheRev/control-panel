import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatBadgeModule } from '@angular/material/badge';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService } from '../../../../../services/auth.service';
import { StoreConfigStateService } from '../../../../../states/store.config.state.service';
import { BusinessProfileService } from '../../../../../services/business-profile.service';
import { getTenantSlug, getStoreUrl } from '../../../../../utils/tenant.utils';
import { environment } from '../../../../../../environments/environment';

@Component({
  selector: 'app-user-dropdown',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatMenuModule,
    MatButtonModule,
    MatBadgeModule,
    MatIconModule,
    MatDividerModule,
  ],
  templateUrl: './user-dropdown.html',
  styleUrl: './user-dropdown.scss',
})
export class UserDropdown {
  private authService = inject(AuthService);
  readonly configState = inject(StoreConfigStateService);
  readonly businessProfile = inject(BusinessProfileService);

  readonly appVersion = environment.appVersion || 'v2.7.0';

  get user() {
    return this.authService.user();
  }

  readonly isAdmin = computed(() => {
    return this.user?.role === 'admin';
  });

  readonly storeName = computed(() => {
    return this.configState.StoreConfig().config?.name || 'Mi Comercio';
  });

  readonly tenantSlug = computed(() => {
    return getTenantSlug();
  });

  readonly shortBusinessBadge = computed(() => {
    const t = this.businessProfile.businessType();
    if (t === 'kiosk_grocery') return 'Kiosco & Almacén';
    if (t === 'fashion') return 'Indumentaria';
    if (t === 'gastronomy') return 'Gastronomía';
    if (t === 'tech_electronics') return 'Tecnología';
    if (t === 'butcher') return 'Carnicería';
    if (t === 'bakery') return 'Panadería';
    return 'Comercio';
  });

  readonly storeUrl = computed(() => {
    return getStoreUrl();
  });

  openStorefront(): void {
    const url = this.storeUrl();
    if (url) {
      window.open(url, '_blank');
    }
  }

  logout(): void {
    this.authService.logout().subscribe();
  }
}
