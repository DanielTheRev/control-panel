import {
  AfterViewInit,
  Component,
  effect,
  ElementRef,
  inject,
  ViewChild,
} from '@angular/core';
import { CommonModule, DecimalPipe, PercentPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { PageLayout } from '../../shared/components/page-layout/page-layout';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { SalesStateService } from '../../states/sales.state.service';
import { SalesRange } from '../../interfaces/sales.interface';

// Dynamic import de Chart.js para evitar errores si aún no está instalado
let ChartLib: any;

@Component({
  selector: 'app-sales',
  standalone: true,
  imports: [CommonModule, FormsModule, PageLayout, PageHeader, MatIconModule, DecimalPipe, PercentPipe],
  templateUrl: './sales.html',
  styleUrl: './sales.scss',
})
export class SalesComponent implements AfterViewInit {
  public salesStore = inject(SalesStateService);
  readonly state = this.salesStore.state;

  @ViewChild('revenueChart') revenueChartRef!: ElementRef<HTMLCanvasElement>;
  private chart: any = null;
  private chartReady = false;

  readonly ranges: { value: SalesRange; label: string }[] = [
    { value: 'day', label: 'Hoy' },
    { value: 'week', label: 'Semana' },
    { value: 'month', label: 'Mes' },
    { value: 'year', label: 'Año' },
  ];

  expandedSales = new Set<string>();

  constructor() {
    // Cargar Chart.js de forma dinámica
    import('chart.js').then(({ Chart, registerables }) => {
      Chart.register(...registerables);
      ChartLib = Chart;
      this.chartReady = true;

      // Si ya hay stats esperando, renderizar ahora
      const stats = this.state().stats;
      if (stats && this.revenueChartRef) {
        this.renderChart(stats.dailyBreakdown ?? [], stats.currency);
      }
    }).catch(() => {
      console.warn('chart.js no instalado. Ejecutá: pnpm add chart.js en el directorio control-panel');
    });

    // Efecto reactivo: cuando cambian stats, re-renderizar
    effect(() => {
      const stats = this.state().stats;
      if (stats && this.revenueChartRef && this.chartReady) {
        this.renderChart(stats.dailyBreakdown ?? [], stats.currency);
      }
    });
  }

  ngAfterViewInit(): void {
    const stats = this.state().stats;
    if (stats && this.chartReady) {
      this.renderChart(stats.dailyBreakdown ?? [], stats.currency);
    }
  }

  setRange(range: SalesRange): void {
    this.salesStore.setRange(range);
  }

  setDate(date: string): void {
    this.salesStore.setDate(date);
  }

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

  getCurrencySymbol(currency: 'USD' | 'ARS'): string {
    return currency === 'USD' ? 'U$D' : '$';
  }

  getRangeLabel(range: SalesRange): string {
    return this.ranges.find(r => r.value === range)?.label ?? range;
  }

  getMaxRevenue(breakdown: { revenue: number }[]): number {
    return Math.max(...breakdown.map(d => d.revenue), 1);
  }

  getMethodPercentage(amount: number, total: number): number {
    return total > 0 ? (amount / total) * 100 : 0;
  }

  getSaleTypeIcon(saleType: 'LOCAL' | 'ONLINE'): string {
    return saleType === 'LOCAL' ? 'storefront' : 'public';
  }

  getSaleTypeLabel(saleType: 'LOCAL' | 'ONLINE'): string {
    return saleType === 'LOCAL' ? 'Mostrador' : 'Online';
  }

  private renderChart(
    breakdown: { date: string; revenue: number; earnings: number; count: number }[],
    currency: 'USD' | 'ARS'
  ): void {
    if (!this.revenueChartRef?.nativeElement || !ChartLib) return;

    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }

    if (breakdown.length === 0) return;

    const symbol = this.getCurrencySymbol(currency);
    const ctx = this.revenueChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    const labels = breakdown.map(d => {
      const date = new Date(d.date + 'T12:00:00');
      return date.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
    });

    this.chart = new ChartLib(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Ingresos',
            data: breakdown.map(d => d.revenue),
            backgroundColor: 'rgba(139, 92, 246, 0.7)',
            borderColor: 'rgba(139, 92, 246, 1)',
            borderWidth: 1,
            borderRadius: 4,
          },
          {
            label: 'Ganancia',
            data: breakdown.map(d => d.earnings),
            backgroundColor: 'rgba(52, 211, 153, 0.7)',
            borderColor: 'rgba(52, 211, 153, 1)',
            borderWidth: 1,
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: { color: 'rgba(156,163,175,0.8)', font: { size: 11 } },
          },
          tooltip: {
            callbacks: {
              label: (item: any) => ` ${symbol}${(item.parsed?.y ?? 0).toLocaleString('es-AR')}`,
            },
          },
        },
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: { color: 'rgba(156,163,175,0.7)', font: { size: 10 } },
          },
          y: {
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: {
              color: 'rgba(156,163,175,0.7)',
              font: { size: 10 },
              callback: (value: number | string) => `${symbol}${Number(value).toLocaleString('es-AR')}`,
            },
          },
        },
      },
    });
  }
}
