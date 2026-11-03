import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { SidebarService } from '../../services/sidebar.service';
import { BusinessProfileService } from '../../services/business-profile.service';
import { Navbar } from '../../shared/components/navbar/navbar';
import { SidebarComponent } from '../../shared/components/sidebar/sidebar';

@Component({
  selector: 'app-main-page',
  standalone: true,
  imports: [
    CommonModule,
    Navbar,
    SidebarComponent,
    RouterOutlet,
  ],
  templateUrl: './main-page.html',
  styleUrl: './main-page.scss',
})
export class MainPage implements OnInit {
  sidebarService = inject(SidebarService);
  profile = inject(BusinessProfileService);
  private router = inject(Router);

  ngOnInit() {
    const currentUrl = this.router.url.split('?')[0].replace(/\/+$/, '');
    if (currentUrl === '/home') {
      this.router.navigateByUrl(this.profile.defaultLandingRoute());
    }
  }
}
