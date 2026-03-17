import { Component, inject, signal } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CashRegisterStoreService } from '../../states/cash-register.state.service';
import { AuthService } from '../../services/auth.service';
import { PageLayout } from '../../shared/components/page-layout/page-layout';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { MatIconModule } from '@angular/material/icon';
import { NotificationsService } from '../../services/notifications.service';

@Component({
  selector: 'app-cash-register',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe, DatePipe, PageLayout, PageHeader, MatIconModule],
  templateUrl: './cash-register.html',
  styleUrl: './cash-register.scss'
})
export class CashRegisterComponent {
  public cashStore = inject(CashRegisterStoreService);
  public auth = inject(AuthService);
  private notifications = inject(NotificationsService);

  // Form states
  initialBalance = signal(0);
  actualCloseBalance = signal(0);
  closeNotes = signal('');

  async openSession() {
    try {
      await this.cashStore.openSession(this.initialBalance());
    } catch (err) {}
  }

  async closeSession() {
    if (!confirm('¿Estás seguro de que querés cerrar la caja?')) return;
    try {
      await this.cashStore.closeSession(this.actualCloseBalance(), this.closeNotes());
    } catch (err) {}
  }
}
