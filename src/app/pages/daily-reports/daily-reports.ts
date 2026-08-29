import { Component, computed, inject } from '@angular/core';
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
  styleUrl: './daily-reports.scss',
})
export class DailyReportsComponent {
  public reportStore = inject(DailyReportsStoreService);
  readonly reportState = this.reportStore.state;

  expandedSales = new Set<string>();

  isToday = computed(() => {
    const selected = this.reportStore.selectedDate();
    const today = new Date().toISOString().split('T')[0];
    return selected === today;
  });

  toggleSaleExpanded(orderId: string): void {
    if (this.expandedSales.has(orderId)) {
      this.expandedSales.delete(orderId);
    } else {
      this.expandedSales.add(orderId);
    }
  }

  isSaleExpanded(orderId: string): boolean {
    return this.expandedSales.has(orderId);
  }

  getPaymentMethodLabel(key: string): string {
    const labels: Record<string, string> = {
      CASH: 'Efectivo',
      BANK_TRANSFER: 'Transferencia Bancaria',
      ALIAS_TRANSFER: 'Transferencia / Alias',
      CARD: 'Tarjeta',
      TICKET: 'Rapipago / Pago Fácil',
      mercadopago_gateway: 'Mercado Pago',
      Efectivo: 'Efectivo',
      Transferencia: 'Transferencia',
      Tarjeta: 'Tarjeta',
    };
    return labels[key] || key;
  }

  getSaleTypeIcon(saleType: 'LOCAL' | 'ONLINE'): string {
    return saleType === 'LOCAL' ? 'storefront' : 'public';
  }

  getSaleTypeLabel(saleType: 'LOCAL' | 'ONLINE'): string {
    return saleType === 'LOCAL' ? 'Mostrador' : 'Online';
  }

  getSlotHeight(slotRevenue: number, totalRevenue: number): number {
    if (!totalRevenue || !slotRevenue) return 8;
    return Math.max((slotRevenue / totalRevenue) * 100, 15);
  }

  printReport(): void {
    window.print();
  }
}
