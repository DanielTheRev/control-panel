import { Component, inject } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DailyReportsStoreService } from '../../states/daily-reports.state.service';
import { PageLayout } from '../../shared/components/page-layout/page-layout';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-daily-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, PageLayout, PageHeader, MatIconModule, DecimalPipe],
  templateUrl: './daily-reports.html',
  styleUrl: './daily-reports.scss'
})
export class DailyReportsComponent {
  public reportStore = inject(DailyReportsStoreService);

  readonly reportState = this.reportStore.state;

  getPaymentMethodLabel(key: string): string {
    const labels: Record<string, string> = {
      'mercadopago_gateway': 'Mercado Pago / Tarjeta',
      'Efectivo': 'Efectivo',
      'Transferencia': 'Transferencia'
    };
    return labels[key] || key;
  }
}
