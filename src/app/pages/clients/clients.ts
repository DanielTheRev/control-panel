import { CommonModule, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import { IClient } from '../../interfaces/client.interface';
import { SidebarService } from '../../services/sidebar.service';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { PageLayout } from '../../shared/components/page-layout/page-layout';
import { ClientsStateService } from '../../states/clients.state.service';
import { AccountMovementService } from '../../services/account-movement.service';
import { NotificationsService } from '../../services/notifications.service';
import {
  AccountMovementType,
  AccountPaymentMethod,
  IAccountMovement,
  IDebtorItem,
} from '../../interfaces/account-movement.interface';

@Component({
  selector: 'app-clients',
  standalone: true,
  imports: [
    CommonModule,
    PageLayout,
    PageHeader,
    DatePipe,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
  ],
  templateUrl: './clients.html',
  styleUrl: './clients.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientsComponent implements OnInit {
  private clientsState = inject(ClientsStateService);
  private accountMovementService = inject(AccountMovementService);
  private notifications = inject(NotificationsService);
  #sidebarService = inject(SidebarService);

  // Tab activo: 'all' = Todos los clientes, 'debtors' = Cuentas Corrientes & Fiados
  activeTab = signal<'all' | 'debtors'>('all');

  // Estado consolidado de clientes
  readonly state = this.clientsState.state;
  readonly clients = computed(() => this.state().data);
  readonly pagination = computed(() => this.state().pagination);
  readonly isLoading = computed(() => this.state().isLoading);
  readonly hasData = computed(() => this.state().hasData);
  readonly hasError = computed(() => this.state().hasError);

  // Filtros de clientes generales
  readonly page = this.clientsState.page;
  readonly search = this.clientsState.search;

  // Estado de Cuentas Corrientes / Fiados
  readonly debtorsData = signal<{
    totalDebt: number;
    debtorCount: number;
    debtors: IDebtorItem[];
  }>({
    totalDebt: 0,
    debtorCount: 0,
    debtors: [],
  });
  readonly isLoadingDebtors = signal<boolean>(false);
  readonly debtorsSearch = signal<string>('');

  // Modales y acciones de Cuenta Corriente
  readonly selectedDebtorForPayment = signal<IDebtorItem | null>(null);
  readonly paymentAmount = signal<number>(0);
  readonly paymentMethod = signal<AccountPaymentMethod>('CASH');
  readonly paymentNotes = signal<string>('');
  readonly isSubmittingPayment = signal<boolean>(false);

  readonly selectedDebtorForHistory = signal<IDebtorItem | null>(null);
  readonly clientAccountDetails = signal<any | null>(null);
  readonly isLoadingHistory = signal<boolean>(false);

  readonly selectedDebtorForLimit = signal<IDebtorItem | null>(null);
  readonly creditLimitInput = signal<number>(0);
  readonly isCreditAllowedInput = signal<boolean>(true);
  readonly isSubmittingLimit = signal<boolean>(false);

  protected readonly Math = Math;

  constructor() {
    this.#sidebarService.navbarTitle.set({
      title: 'Clientes & Cuentas Corrientes',
    });
  }

  ngOnInit(): void {
    this.loadDebtors();
  }

  /** Cambiar de pestaña */
  setTab(tab: 'all' | 'debtors'): void {
    this.activeTab.set(tab);
    if (tab === 'debtors') {
      this.loadDebtors(this.debtorsSearch());
    }
  }

  /** Cargar resumen de clientes deudores */
  loadDebtors(search?: string): void {
    this.isLoadingDebtors.set(true);
    this.accountMovementService.getDebtors(search).subscribe({
      next: (res) => {
        this.debtorsData.set(res.data);
        this.isLoadingDebtors.set(false);
      },
      error: () => {
        this.notifications.error('Error al cargar cuentas corrientes');
        this.isLoadingDebtors.set(false);
      },
    });
  }

  /** Búsqueda en deudores */
  private debtorsTimeout: any;
  updateDebtorsSearch(term: string): void {
    this.debtorsSearch.set(term);
    clearTimeout(this.debtorsTimeout);
    this.debtorsTimeout = setTimeout(() => {
      this.loadDebtors(term);
    }, 400);
  }

  clearDebtorsSearch(): void {
    this.debtorsSearch.set('');
    this.loadDebtors('');
  }

  /** Modal: Abrir cobro / abono */
  openPaymentModal(debtor: IDebtorItem): void {
    this.selectedDebtorForPayment.set(debtor);
    this.paymentAmount.set(debtor.balance);
    this.paymentMethod.set('CASH');
    this.paymentNotes.set('');
  }

  closePaymentModal(): void {
    this.selectedDebtorForPayment.set(null);
  }

  setFullPayment(): void {
    const debtor = this.selectedDebtorForPayment();
    if (debtor) {
      this.paymentAmount.set(debtor.balance);
    }
  }

  submitPayment(): void {
    const debtor = this.selectedDebtorForPayment();
    const amount = Number(this.paymentAmount());
    if (!debtor || amount <= 0) {
      this.notifications.error('Ingresá un monto válido para abonar');
      return;
    }

    this.isSubmittingPayment.set(true);
    this.accountMovementService
      .recordPayment(debtor._id, {
        amount,
        paymentMethod: this.paymentMethod(),
        notes: this.paymentNotes().trim() || undefined,
      })
      .subscribe({
        next: () => {
          this.notifications.success(
            `¡Cobro de $${amount.toLocaleString('es-AR')} registrado exitosamente!`
          );
          this.isSubmittingPayment.set(false);
          this.closePaymentModal();
          this.loadDebtors(this.debtorsSearch());
          this.refreshData();
        },
        error: (err) => {
          this.notifications.error(
            err.error?.message || 'Error al registrar el cobro'
          );
          this.isSubmittingPayment.set(false);
        },
      });
  }

  /** Modal: Libreta / Historial de Movimientos */
  openHistoryModal(debtor: IDebtorItem): void {
    this.selectedDebtorForHistory.set(debtor);
    this.isLoadingHistory.set(true);
    this.accountMovementService.getClientAccount(debtor._id, 1, 50).subscribe({
      next: (res) => {
        this.clientAccountDetails.set(res.data);
        this.isLoadingHistory.set(false);
      },
      error: () => {
        this.notifications.error('Error al cargar historial de movimientos');
        this.isLoadingHistory.set(false);
      },
    });
  }

  closeHistoryModal(): void {
    this.selectedDebtorForHistory.set(null);
    this.clientAccountDetails.set(null);
  }

  /** Modal: Configurar Límite de Crédito */
  openCreditLimitModal(debtor: IDebtorItem): void {
    this.selectedDebtorForLimit.set(debtor);
    this.creditLimitInput.set(debtor.creditLimit || 0);
    this.isCreditAllowedInput.set(debtor.isCreditAllowed ?? true);
  }

  closeCreditLimitModal(): void {
    this.selectedDebtorForLimit.set(null);
  }

  submitCreditLimit(): void {
    const debtor = this.selectedDebtorForLimit();
    if (!debtor) return;

    this.isSubmittingLimit.set(true);
    this.accountMovementService
      .updateCreditConfig(debtor._id, {
        creditLimit: Number(this.creditLimitInput()) || 0,
        isCreditAllowed: this.isCreditAllowedInput(),
      })
      .subscribe({
        next: () => {
          this.notifications.success('Configuración de crédito actualizada');
          this.isSubmittingLimit.set(false);
          this.closeCreditLimitModal();
          this.loadDebtors(this.debtorsSearch());
        },
        error: (err) => {
          this.notifications.error(
            err.error?.message || 'Error al actualizar configuración'
          );
          this.isSubmittingLimit.set(false);
        },
      });
  }

  /** Enviar recordatorio por WhatsApp */
  sendWhatsAppReminder(debtor: IDebtorItem): void {
    this.accountMovementService.getWhatsAppReminder(debtor._id).subscribe({
      next: (res) => {
        if (res.data?.waLink) {
          window.open(res.data.waLink, '_blank');
        }
      },
      error: (err) => {
        this.notifications.error(
          err.error?.message || 'El cliente no tiene un teléfono celular válido'
        );
      },
    });
  }

  /** Actualizar búsqueda de clientes generales */
  private searchTimeout: any;
  updateSearch(term: string): void {
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.clientsState.setSearch(term);
    }, 400);
  }

  changePage(page: number): void {
    this.clientsState.setPage(page);
  }

  refreshData(): void {
    this.clientsState.refresh();
  }

  clearSearch(): void {
    this.clientsState.setSearch('');
  }

  getPageNumbers(): number[] {
    return this.clientsState.getPageNumbers();
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map((w) => w.charAt(0))
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  trackByClient(index: number, client: IClient): string {
    return client._id;
  }
}
