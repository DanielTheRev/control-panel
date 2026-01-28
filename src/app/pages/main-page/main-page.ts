import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { SidebarService } from '../../services/sidebar.service';
import { Navbar } from '../../shared/components/navbar/navbar';

@Component({
  selector: 'app-main-page',
  imports: [
    MatSidenavModule,
    MatToolbarModule,
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
export class MainPage {
  sidebarService = inject(SidebarService);
}
