import { Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CashRegisterStoreService } from '../../states/cash-register.state.service';
import { DailyReportsStoreService } from '../../states/daily-reports.state.service';
import { AuthService } from '../../services/auth.service';
import { SidebarService } from '../../services/sidebar.service';
import { BusinessProfileService } from '../../services/business-profile.service';
import { PageLayout } from '../../shared/components/page-layout/page-layout';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { MatIconModule } from '@angular/material/icon';

export interface BillDenomination {
  value: number;
  label: string;
}

export interface ClosedSessionSummary {
  closedAt: Date;
  initialBalance: number;
  cashSales: number;
  expectedCloseBalance: number;
  actualCloseBalance: number;
  difference: number;
  notes?: string;
}

@Component({
  selector: 'app-cash-register',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DecimalPipe,
    DatePipe,
    NgClass,
    RouterLink,
    PageLayout,
    PageHeader,
    MatIconModule,
  ],
  templateUrl: './cash-register.html',
  styleUrl: './cash-register.scss',
})
export class CashRegisterComponent implements OnInit {
  public cashStore = inject(CashRegisterStoreService);
  public dailyStore = inject(DailyReportsStoreService);
  public auth = inject(AuthService);
  public profile = inject(BusinessProfileService);
  private sidebarService = inject(SidebarService);

  // Estados de Formulario de Apertura y Cierre
  initialBalance = signal<number>(0);
  actualCloseBalance = signal<number>(0);
  closeNotes = signal<string>('');
  isSubmitting = signal<boolean>(false);

  // Modos de conteo ('direct' = ingreso manual directo | 'bills' = calculadora de billetes argentinos)
  openCountMode = signal<'direct' | 'bills'>('direct');
  closeCountMode = signal<'direct' | 'bills'>('direct');

  // Modal de Confirmación de Cierre y Resumen Post-Cierre
  showCloseConfirmModal = signal<boolean>(false);
  lastClosedSummary = signal<ClosedSessionSummary | null>(null);

  // Denominaciones de billetes vigentes en Argentina
  readonly denominations: BillDenomination[] = [
    { value: 20000, label: '$20.000' },
    { value: 10000, label: '$10.000' },
    { value: 2000, label: '$2.000' },
    { value: 1000, label: '$1.000' },
    { value: 500, label: '$500' },
    { value: 200, label: '$200' },
    { value: 100, label: '$100' },
  ];

  // Cantidades de billetes para el arqueo
  billCounts = signal<Record<number, number>>({
    20000: 0,
    10000: 0,
    2000: 0,
    1000: 0,
    500: 0,
    200: 0,
    100: 0,
  });
  coinsAndChange = signal<number>(0);

  // Datos normalizados de la sesión activa (compatibles con openedAt y openDate, calculatedCloseBalance y expectedCloseBalance)
  sessionOpenedAt = computed(() => {
    const s = this.cashStore.session();
    if (!s) return null;
    return s.openedAt || s.openDate || s.createdAt || null;
  });

  operatorName = computed(() => {
    const s = this.cashStore.session();
    if (s?.openedBy?.name) return s.openedBy.name;
    const currentUser = this.auth.user();
    if (currentUser?.name) return currentUser.name;
    return 'Administrador';
  });

  operatorEmail = computed(() => {
    const s = this.cashStore.session();
    return s?.openedBy?.email || this.auth.user()?.email || '';
  });

  sessionDurationLabel = computed(() => {
    const rawDate = this.sessionOpenedAt();
    if (!rawDate) return 'Turno en curso';
    const opened = new Date(rawDate).getTime();
    if (isNaN(opened)) return 'Turno en curso';
    const diffMs = Math.max(0, Date.now() - opened);
    const totalMinutes = Math.floor(diffMs / 60000);
    if (totalMinutes < 1) return 'Recién abierta';
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    if (hours === 0) return `${mins} min activo`;
    return `${hours}h ${mins}m activo`;
  });

  // Métricas financieras del cajón físico vs medios digitales
  initialCash = computed(() => {
    const s = this.cashStore.session();
    return Number(s?.initialBalance || 0);
  });

  dailyStats = computed(() => this.dailyStore.state().stats);

  cashSalesFromStats = computed(() => {
    const rev = this.dailyStats()?.revenueByMethod || {};
    return Number(rev['CASH'] || 0) + Number(rev['Efectivo'] || 0);
  });

  expectedCloseCash = computed(() => {
    const s = this.cashStore.session();
    if (!s) return 0;
    const backendCalculated = s.calculatedCloseBalance ?? s.expectedCloseBalance;
    if (backendCalculated !== undefined && backendCalculated !== null && !isNaN(Number(backendCalculated))) {
      return Number(backendCalculated);
    }
    return this.initialCash() + this.cashSalesFromStats();
  });

  cashSalesInShift = computed(() => {
    return Math.max(0, this.expectedCloseCash() - this.initialCash());
  });

  // Desglose de medios digitales del día (No entran al cajón físico de efectivo)
  digitalMethodsBreakdown = computed(() => {
    const rev = this.dailyStats()?.revenueByMethod || {};
    const transfer =
      Number(rev['BANK_TRANSFER'] || 0) +
      Number(rev['ALIAS_TRANSFER'] || 0) +
      Number(rev['Transferencia'] || 0);
    const card = Number(rev['CARD'] || 0) + Number(rev['Tarjeta'] || 0);
    const mp = Number(rev['mercadopago_gateway'] || 0) + Number(rev['TICKET'] || 0);
    const creditAccount = Number(rev['CURRENT_ACCOUNT'] || 0);

    return [
      { key: 'transfer', label: 'Transferencias / Alias', icon: 'account_balance', amount: transfer },
      { key: 'card', label: 'Tarjetas / Terminal Point', icon: 'credit_card', amount: card },
      { key: 'mp', label: 'Mercado Pago / QR', icon: 'qr_code_2', amount: mp },
      { key: 'fiado', label: 'Cuenta Corriente / Fiado', icon: 'menu_book', amount: creditAccount },
    ];
  });

  totalDigitalSales = computed(() => {
    return this.digitalMethodsBreakdown().reduce((sum, item) => sum + item.amount, 0);
  });

  totalDayRevenue = computed(() => {
    const statsTotal = this.dailyStats()?.totalRevenue;
    if (statsTotal !== undefined) return Number(statsTotal);
    return this.cashSalesInShift() + this.totalDigitalSales();
  });

  recentSales = computed(() => {
    const list = this.dailyStats()?.salesWithDetails || [];
    return list.slice(0, 6);
  });

  // Estado del Arqueo en Vivo (Diferencia entre efectivo contado y efectivo esperado)
  auditDifference = computed(() => {
    return Number(this.actualCloseBalance() || 0) - this.expectedCloseCash();
  });

  auditStatus = computed<'exact' | 'surplus' | 'shortage'>(() => {
    const diff = this.auditDifference();
    if (diff === 0) return 'exact';
    return diff > 0 ? 'surplus' : 'shortage';
  });

  // Suma calculada por el contador de billetes
  billsCalculatedTotal = computed(() => {
    const counts = this.billCounts();
    let sum = Number(this.coinsAndChange() || 0);
    for (const d of this.denominations) {
      sum += d.value * (Number(counts[d.value]) || 0);
    }
    return sum;
  });

  constructor() {
    // Sincronizar automáticamente cuando el usuario usa el modo calculadora de billetes
    effect(() => {
      const totalFromBills = this.billsCalculatedTotal();
      if (this.closeCountMode() === 'bills' && this.cashStore.session()) {
        this.actualCloseBalance.set(totalFromBills);
      } else if (this.openCountMode() === 'bills' && !this.cashStore.session()) {
        this.initialBalance.set(totalFromBills);
      }
    });
  }

  ngOnInit(): void {
    this.sidebarService.navbarTitle.set({ title: 'Caja Registradora' });
    this.dailyStore.setToday();
    this.cashStore.refresh();
    this.dailyStore.refresh();
  }

  refreshAll(): void {
    this.cashStore.refresh();
    this.dailyStore.refresh();
  }

  setQuickInitialFund(amount: number): void {
    this.openCountMode.set('direct');
    this.initialBalance.set(amount);
  }

  matchExpectedBalance(): void {
    this.closeCountMode.set('direct');
    this.actualCloseBalance.set(this.expectedCloseCash());
  }

  updateBillCount(denomValue: number, rawQty: any): void {
    const qty = Math.max(0, Math.floor(Number(rawQty) || 0));
    this.billCounts.update((curr) => ({
      ...curr,
      [denomValue]: qty,
    }));
  }

  stepBillCount(denomValue: number, delta: number): void {
    this.billCounts.update((curr) => ({
      ...curr,
      [denomValue]: Math.max(0, (Number(curr[denomValue]) || 0) + delta),
    }));
  }

  resetBillCounter(): void {
    this.billCounts.set({
      20000: 0,
      10000: 0,
      2000: 0,
      1000: 0,
      500: 0,
      200: 0,
      100: 0,
    });
    this.coinsAndChange.set(0);
  }

  getPaymentMethodLabel(key: string): string {
    const labels: Record<string, string> = {
      CASH: 'Efectivo',
      Efectivo: 'Efectivo',
      BANK_TRANSFER: 'Transferencia',
      ALIAS_TRANSFER: 'Alias / Transf.',
      Transferencia: 'Transferencia',
      CARD: 'Tarjeta',
      Tarjeta: 'Tarjeta',
      TICKET: 'Pago Fácil / Rapipago',
      mercadopago_gateway: 'Mercado Pago',
      CURRENT_ACCOUNT: 'Fiado / Cta. Cte.',
    };
    return labels[key] || key;
  }

  async openSession(): Promise<void> {
    if (this.isSubmitting()) return;
    this.isSubmitting.set(true);
    try {
      const amount = Math.max(0, Number(this.initialBalance() || 0));
      await this.cashStore.openSession(amount);
      this.lastClosedSummary.set(null);
      this.resetBillCounter();
      this.dailyStore.refresh();
    } catch {
      // Notificación manejada por CashRegisterStoreService
    } finally {
      this.isSubmitting.set(false);
    }
  }

  requestCloseSession(): void {
    this.showCloseConfirmModal.set(true);
  }

  cancelCloseSession(): void {
    this.showCloseConfirmModal.set(false);
  }

  async confirmCloseSession(): Promise<void> {
    if (this.isSubmitting()) return;
    this.isSubmitting.set(true);

    const summarySnapshot: ClosedSessionSummary = {
      closedAt: new Date(),
      initialBalance: this.initialCash(),
      cashSales: this.cashSalesInShift(),
      expectedCloseBalance: this.expectedCloseCash(),
      actualCloseBalance: Number(this.actualCloseBalance() || 0),
      difference: this.auditDifference(),
      notes: this.closeNotes().trim() || undefined,
    };

    try {
      await this.cashStore.closeSession(
        Number(this.actualCloseBalance() || 0),
        this.closeNotes().trim() || undefined
      );
      this.showCloseConfirmModal.set(false);
      this.lastClosedSummary.set(summarySnapshot);
      this.actualCloseBalance.set(0);
      this.closeNotes.set('');
      this.resetBillCounter();
      this.dailyStore.refresh();
    } catch {
      // Notificación manejada por CashRegisterStoreService
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
