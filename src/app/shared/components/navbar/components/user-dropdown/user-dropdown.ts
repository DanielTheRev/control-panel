import { Component, inject } from '@angular/core';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatBadgeModule } from '@angular/material/badge';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService } from '../../../../../services/auth.service';

@Component({
  selector: 'app-user-dropdown',
  imports: [
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

  get user() {
    return this.authService.user();
  }

  logout() {
    this.authService.logout().subscribe();
  }
}
