import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';
import { SidebarService } from '../../services/sidebar.service';
import { BusinessProfileService } from '../../services/business-profile.service';
import { Navbar } from '../../shared/components/navbar/navbar';

@Component({
  selector: 'app-main-page',
  standalone: true,
  imports: [
    CommonModule,
    Navbar,
    RouterLink,
    RouterLinkActive,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    RouterOutlet,
  ],
  templateUrl: './main-page.html',
  styleUrl: './main-page.scss',
})
export class MainPage implements OnInit {
  sidebarService = inject(SidebarService);
  authService = inject(AuthService);
  profile = inject(BusinessProfileService);
  private router = inject(Router);

  appVersion = environment.appVersion || 'v1.4.2';
  buildDate = environment.buildDate || '28/08/2026';

  ngOnInit() {
    const currentUrl = this.router.url.split('?')[0].replace(/\/+$/, '');
    if (currentUrl === '/home') {
      this.router.navigateByUrl(this.profile.defaultLandingRoute());
    }
  }

  get brandName(): string {
    const tenant = localStorage.getItem('lastTenantSlug');
    if (tenant) {
      return tenant.charAt(0).toUpperCase() + tenant.slice(1);
    }
    return environment.brandName;
  }
}
