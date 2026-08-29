import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { RouterLink } from '@angular/router';

import {
  IOrder,
  OrderStatus,
  PaymentStatus,
} from '../../interfaces/order.interface';
import { ShippingType } from '../../interfaces/shipping.interface';
import { SidebarService } from '../../services/sidebar.service';
import { DebugService } from '../../services/debug.service';
import { PageHeader } from "../../shared/components/page-header/page-header";
import { PageLayout } from "../../shared/components/page-layout/page-layout";
import { OrdersStateService } from '../../states/order.state.service';

import { OrdersService } from '../../services/orders.service';
import { NotificationsService } from '../../services/notifications.service';

@Component({
  selector: 'app-client-orders',
  standalone: true,
  imports: [
    CommonModule,
    PageLayout,
    PageHeader,
    CurrencyPipe,
    DatePipe,
    RouterLink,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
  ],
  templateUrl: './client-orders.html',
  styleUrl: './client-orders.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientOrders {
  // Inyectar servicios
  private orderStateService = inject(OrdersStateService);
  private ordersService = inject(OrdersService);
  private notifications = inject(NotificationsService);
  #SidebarService = inject(SidebarService);
  #debug = inject(DebugService);

  // Search & Filtering
  searchQuery = signal<string>('');
  copiedOrderId = signal<string | null>(null);

  // Transfer Auditing Modal
  auditingReceiptOrder = signal<IOrder | null>(null);
  isApprovingTransfer = signal<boolean>(false);

  // Exponer propiedades del servicio para el template
  readonly orders = this.orderStateService.orders;
  readonly pagination = this.orderStateService.pagination;
  readonly isLoading = this.orderStateService.isLoading;
  readonly error = this.orderStateService.error;
  readonly hasData = computed(() => this.orders().length > 0);

  // Filtered orders in memory if searching
  readonly displayedOrders = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.orders();
    return this.orders().filter((o) => {
      const orderNum = (o.orderNumber || '').toLowerCase();
      const clientName = `${o.user?.name || o.buyerData?.firstName || ''} ${o.buyerData?.lastName || ''}`.toLowerCase();
      const email = (o.user?.email || o.buyerData?.email || '').toLowerCase();
      const street = (o.shippingInfo?.shippingAddress?.street || '').toLowerCase();
      return orderNum.includes(q) || clientName.includes(q) || email.includes(q) || street.includes(q);
    });
  });

  // KPIs
  readonly totalRevenue = computed(() => {
    return this.orders().reduce((acc, o) => acc + (o.total || o.finance?.total || o.paymentInfo?.amount || 0), 0);
  });

  readonly totalProfit = computed(() => {
    return this.orders().reduce((acc, o) => acc + (o.finance?.earnings || 0), 0);
  });

  readonly readyToShipCount = computed(() => {
    return this.orders().filter(
      (o) =>
        (o.paymentInfo?.status === PaymentStatus.APPROVED || o.status === OrderStatus.PROCESSING_SHIPPING) &&
        o.status !== OrderStatus.SHIPPED &&
        o.status !== OrderStatus.DELIVERED &&
        o.status !== OrderStatus.CANCELLED,
    ).length;
  });

  // Estadísticas (por si se quieren mostrar arriba)
  readonly pendingCount = this.orderStateService.pendingCount;
  readonly processingCount = this.orderStateService.processingCount;
  readonly shippedCount = this.orderStateService.shippedCount;
  readonly deliveredCount = this.orderStateService.deliveredCount;
  readonly cancelledCount = this.orderStateService.cancelledCount;

  // Filtros
  readonly status = this.orderStateService.status;
  readonly dateRange = this.orderStateService.dateRange;
  readonly page = this.orderStateService.page;

  // Opciones para filtros
  readonly statusOptions = this.orderStateService.getStatusOptions();
  readonly dateRangeOptions = this.orderStateService.getDateRangeOptions();

  // Enums para usar en el template
  readonly OrderStatus = OrderStatus;
  readonly PaymentStatus = PaymentStatus;
  readonly ShippingType = ShippingType;

  protected readonly Math = Math;

  /** Opciones para los badges de filtro rápido en el sub-menu */
  readonly statusFilterOptions = [
    { value: OrderStatus.PENDING_PAYMENT,     label: 'Pendientes',   icon: 'hourglass_top',  dotColor: '#f59e0b' },
    { value: OrderStatus.PROCESSING_SHIPPING, label: 'En Prep.',     icon: 'inventory_2',    dotColor: '#3b82f6' },
    { value: OrderStatus.SHIPPED,             label: 'Enviados',     icon: 'local_shipping', dotColor: '#8b5cf6' },
    { value: OrderStatus.DELIVERED,           label: 'Entregados',   icon: 'check_circle',   dotColor: '#22c55e' },
    { value: OrderStatus.CANCELLED,           label: 'Cancelados',   icon: 'cancel',         dotColor: '#ef4444' },
  ];

  /** Mapa de etiquetas legibles para el estado de la orden */
  private readonly orderStatusLabels: Record<string, string> = {
    [OrderStatus.PENDING_PAYMENT]:     'Pendiente de pago',
    [OrderStatus.PROCESSING_SHIPPING]: 'En preparación',
    [OrderStatus.SHIPPED]:             'Enviado / En camino',
    [OrderStatus.DELIVERED]:           'Entregado',
    [OrderStatus.CANCELLED]:           'Cancelado',
    'PAYMENT_FAILED':                  'Pago rechazado',
    'PENDING':                         'Pendiente',
    'APPROVED':                        'Aprobado',
    'REJECTED':                        'Rechazado',
  };

  /** Mapa de etiquetas legibles para el estado del pago */
  private readonly paymentStatusLabels: Record<string, string> = {
    [PaymentStatus.PENDING]:              'Pendiente',
    [PaymentStatus.APPROVED]:             'Aprobado',
    [PaymentStatus.REJECTED]:             'Rechazado',
    [PaymentStatus.CANCELLED]:            'Cancelado',
    [PaymentStatus.WAITING_CONFIRMATION]: 'En revisión',
    'PAYMENT_FAILED':                     'Rechazado',
  };

  constructor() {
    this.#SidebarService.navbarTitle.set({
      title: 'Pedidos',
    });
  }

  getOrderTotal(order: IOrder): number {
    return order.total || order.finance?.total || order.paymentInfo?.amount || 0;
  }

  copyOrderNumber(orderNumber: string, event?: Event): void {
    if (event) event.stopPropagation();
    navigator.clipboard.writeText(orderNumber);
    this.copiedOrderId.set(orderNumber);
    setTimeout(() => {
      this.copiedOrderId.set(null);
    }, 2000);
  }

  openAuditReceipt(order: IOrder, event?: Event): void {
    if (event) event.stopPropagation();
    this.auditingReceiptOrder.set(order);
  }

  async confirmApproveTransfer(): Promise<void> {
    const order = this.auditingReceiptOrder();
    if (!order?._id) return;

    this.isApprovingTransfer.set(true);
    try {
      await this.ordersService.approveTransfer(order._id);
      this.notifications.success(`Transferencia de orden #${order.orderNumber} aprobada con éxito.`);
      this.auditingReceiptOrder.set(null);
      this.orderStateService.refresh();
    } catch (err: any) {
      this.notifications.error(err.error?.message || 'Error al aprobar la transferencia.');
    } finally {
      this.isApprovingTransfer.set(false);
    }
  }

  /**
   * Actualizar filtro de estado
   */
  updateStatusFilter(status: string): void {
    this.orderStateService.setStatus(status);
  }

  /**
   * Actualizar filtro de fecha
   */
  updateDateFilter(dateRange: string): void {
    this.orderStateService.setDateRange(dateRange);
  }

  /**
   * Cambiar página
   */
  changePage(page: number): void {
    this.orderStateService.setPage(page);
  }

  /**
   * Refrescar datos
   */
  refreshData(): void {
    this.orderStateService.refresh();
  }

  /**
   * Obtener clases CSS para el badge de estado de orden
   */
  getOrderStatusBadgeClass(status: string): string {
    const baseClasses = 'badge badge-sm gap-1 font-bold shadow-2xs';
    switch (status) {
      case OrderStatus.PENDING_PAYMENT:
      case 'PENDING':
      case 'PENDING_PAYMENT':
        return `${baseClasses} bg-amber-500/15 text-amber-600 border border-amber-500/30`;
      case OrderStatus.PROCESSING_SHIPPING:
      case 'PROCESSING_SHIPPING':
        return `${baseClasses} bg-info/15 text-info border border-info/30`;
      case OrderStatus.SHIPPED:
      case 'SHIPPED':
        return `${baseClasses} bg-purple-500/15 text-purple-600 border border-purple-500/30`;
      case OrderStatus.DELIVERED:
      case 'DELIVERED':
        return `${baseClasses} bg-success/15 text-success border border-success/30`;
      case OrderStatus.CANCELLED:
      case 'CANCELLED':
      case 'PAYMENT_FAILED':
      case 'REJECTED':
        return `${baseClasses} bg-error/15 text-error border border-error/30`;
      default:
        return `${baseClasses} bg-base-200 text-base-content/60 border-base-300`;
    }
  }

  getOrderStatusIcon(status: string): string {
    switch (status) {
      case OrderStatus.PENDING_PAYMENT:
      case 'PENDING':
        return 'hourglass_top';
      case OrderStatus.PROCESSING_SHIPPING:
        return 'inventory_2';
      case OrderStatus.SHIPPED:
        return 'local_shipping';
      case OrderStatus.DELIVERED:
        return 'check_circle';
      case OrderStatus.CANCELLED:
      case 'PAYMENT_FAILED':
      case 'REJECTED':
        return 'cancel';
      default:
        return 'help_outline';
    }
  }

  /** Devuelve la etiqueta legible del estado de la orden */
  getOrderStatusLabel(status: string): string {
    return this.orderStatusLabels[status] ?? status;
  }

  /** Devuelve la etiqueta legible del estado del pago */
  getPaymentStatusLabel(status: string): string {
    return this.paymentStatusLabels[status] ?? status;
  }

  /** Cuenta de ordenes por estado para los badges del sub-menu */
  getStatusCount(statusValue: string): number {
    switch (statusValue) {
      case OrderStatus.PENDING_PAYMENT:     return this.pendingCount();
      case OrderStatus.PROCESSING_SHIPPING: return this.processingCount();
      case OrderStatus.SHIPPED:             return this.shippedCount();
      case OrderStatus.DELIVERED:           return this.deliveredCount();
      case OrderStatus.CANCELLED:           return this.cancelledCount();
      default: return 0;
    }
  }

  /** Páginas a mostrar en el paginador (ventana de 5 páginas) */
  getPageNumbers(): number[] {
    return this.orderStateService.getPageNumbers();
  }

  /**
   * Obtener clases CSS para el badge de estado de pago
   */
  getPaymentStatusBadgeClass(status: string): string {
    const baseClasses = 'badge badge-xs font-bold';
    switch (status) {
      case PaymentStatus.PENDING:
      case 'PENDING':
        return `${baseClasses} bg-amber-500/15 text-amber-600 border border-amber-500/30`;
      case PaymentStatus.APPROVED:
      case 'APPROVED':
        return `${baseClasses} bg-success/15 text-success border border-success/30`;
      case PaymentStatus.REJECTED:
      case 'REJECTED':
      case 'PAYMENT_FAILED':
        return `${baseClasses} bg-error/15 text-error border border-error/30`;
      case PaymentStatus.CANCELLED:
      case 'CANCELLED':
        return `${baseClasses} bg-base-200 text-base-content/50 border border-base-300`;
      case PaymentStatus.WAITING_CONFIRMATION:
      case 'waiting_confirmation':
        return `${baseClasses} bg-info/15 text-info border border-info/30`;
      default:
        return `${baseClasses} bg-base-200 text-base-content/50 border border-base-300`;
    }
  }

  /**
   * Obtener texto descriptivo del tipo de envío
   */
  getShippingTypeText(shippingType: ShippingType): string {
    switch (shippingType) {
      case ShippingType.PICKUP: return 'Retiro';
      case ShippingType.HOME_DELIVERY: return 'Envío';
      default: return 'N/A';
    }
  }

  /**
   * Resetear filtros
   */
  resetFilters(): void {
    this.orderStateService.resetFilters();
  }

  /**
   * TrackBy function para optimizar el rendimiento de la lista
   */
  trackByOrderNumber(index: number, order: IOrder): string {
    return order.orderNumber;
  }
  /**
   * Marcar pago como recibido
   */
  async markPaymentReceived(orderID: string): Promise<void> {
    try {
      await this.orderStateService.updateOrder('updatePayment', { orderID, status: PaymentStatus.APPROVED });
      this.#debug.log('✅ Pago marcado como recibido');
    } catch (error) {
      this.#debug.error('❌ Error al marcar pago como recibido:', error);
      alert('Error al actualizar el pago. Por favor, intenta nuevamente.');
    }
  }

  /**
   * Marcar orden como entregada (punto de encuentro)
   */
  async markAsDeliveredPickup(orderID: string): Promise<void> {
    try {
      await this.orderStateService.updateOrder('updateShippingStatus', { orderID, status: OrderStatus.DELIVERED });
      this.#debug.log('✅ Orden marcada como entregada en punto de encuentro');
    } catch (error) {
      this.#debug.error('❌ Error al marcar como entregada:', error);
      alert('Error al actualizar la orden. Por favor, intenta nuevamente.');
    }
  }

  /**
   * Marcar orden como enviada
   */
  async markAsShipped(orderID: string): Promise<void> {
    try {
      await this.orderStateService.updateOrder(
        'updateShippingStatus',
        { orderID, status: OrderStatus.SHIPPED }
      );
      this.#debug.log('✅ Orden marcada como enviada');
    } catch (error) {
      this.#debug.error('❌ Error al marcar como enviada:', error);
      alert('Error al actualizar la orden. Por favor, intenta nuevamente.');
    }
  }

  /**
   * Marcar orden como entregada (envío a domicilio)
   */
  async markAsDelivered(orderID: string): Promise<void> {
    try {
      await this.orderStateService.updateOrder(
        'updateShippingStatus',
        { orderID, status: OrderStatus.DELIVERED }
      );
      this.#debug.log('✅ Orden marcada como entregada a domicilio');
    } catch (error) {
      this.#debug.error('❌ Error al marcar como entregada:', error);
      alert('Error al actualizar la orden. Por favor, intenta nuevamente.');
    }
  }

  /**
   * Iniciar proceso de envío
   */
  async startShipping(orderID: string): Promise<void> {
    try {
      await this.orderStateService.updateOrder(
        'updateShippingStatus',
        { orderID, status: OrderStatus.PROCESSING_SHIPPING }
      );
      this.#debug.log('✅ Proceso de envío iniciado');
    } catch (error) {
      this.#debug.error('❌ Error al iniciar envío:', error);
      alert('Error al actualizar la orden. Por favor, intenta nuevamente.');
    }
  }

  /**
   * Cancelar orden
   */
  async cancelOrder(orderID: string): Promise<void> {
    if (!confirm('¿Estás seguro de que deseas cancelar esta orden?')) {
      return;
    }
    try {
      await this.orderStateService.updateOrder(
        'updateShippingStatus',
        { orderID, status: OrderStatus.CANCELLED }
      );
      this.#debug.log('✅ Orden cancelada');
    } catch (error) {
      this.#debug.error('❌ Error al cancelar orden:', error);
      alert('Error al cancelar la orden. Por favor, intenta nuevamente.');
    }
  }

  // --- Predicates ---

  /**
   * Verificar si se puede cancelar la orden
   */
  canCancelOrder(status: OrderStatus): boolean {
    return (
      status === OrderStatus.PENDING_PAYMENT ||
      status === OrderStatus.PROCESSING_SHIPPING
    );
  }

  /**
   * Verificar si se puede marcar pago como recibido
   */
  canMarkPaymentReceived(status: PaymentStatus): boolean {
    return status !== PaymentStatus.APPROVED;
  }

  /**
   * Verificar si se puede iniciar envío
   */
  canStartShipping(status: OrderStatus, paymentInfo: PaymentStatus, shippingInfo: ShippingType): boolean {
    return (
      status === OrderStatus.PENDING_PAYMENT &&
      paymentInfo === PaymentStatus.APPROVED &&
      shippingInfo === ShippingType.HOME_DELIVERY
    );
  }

  /**
   * Verificar si se puede marcar como enviado
   */
  canMarkAsShipped(status: OrderStatus): boolean {
    return (
      status === OrderStatus.PROCESSING_SHIPPING ||
      status === OrderStatus.PENDING_PAYMENT
    );
  }

  /**
   * Verificar si se puede marcar como entregado
   */
  canMarkAsDelivered(status: OrderStatus, shippingType: ShippingType, paymentStatus: PaymentStatus): boolean {
    return (
      status === OrderStatus.SHIPPED ||
      (status === OrderStatus.PENDING_PAYMENT &&
        shippingType === ShippingType.PICKUP &&
        paymentStatus === PaymentStatus.APPROVED)
    );
  }
}
