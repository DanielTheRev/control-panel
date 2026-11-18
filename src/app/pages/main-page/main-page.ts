import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { BusinessProfileService } from '../../services/business-profile.service';
import { SidebarService } from '../../services/sidebar.service';
import { Navbar } from '../../shared/components/navbar/navbar';
import { SidebarComponent } from '../../shared/components/sidebar/sidebar';
import { TenantBootstrapStateService } from '../../states/tenant-bootstrap.state.service';

@Component({
  selector: 'app-main-page',
  standalone: true,
  imports: [CommonModule, Navbar, SidebarComponent, RouterOutlet],
  templateUrl: './main-page.html',
  styleUrl: './main-page.scss',
})
export class MainPage {
  readonly sidebarService = inject(SidebarService);
  readonly profile = inject(BusinessProfileService);
  readonly bootstrapState = inject(TenantBootstrapStateService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly bootstrapErrorMessage = computed<string>(() => {
    const err: any = this.bootstrapState.state().hasError;
    if (!err) return '';
    return (
      err?.error?.message ||
      err?.message ||
      'No se pudo obtener la configuración del comercio desde /api/tenant/bootstrap.'
    );
  });

  constructor() {
    effect(() => {
      const state = this.bootstrapState.state();
      if (!state.isLoading && state.hasData && !state.hasError) {
        const currentUrl = this.router.url.split('?')[0].replace(/\/+$/, '');
        if (currentUrl === '/home') {
          this.router.navigateByUrl(this.profile.defaultLandingRoute());
        }
      }
    });
  }

  retryBootstrap(): void {
    this.bootstrapState.refresh();
  }

  logout(): void {
    this.authService.logout();
  }
}
