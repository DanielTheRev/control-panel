import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
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
import { PageHeader } from "../../shared/components/page-header/page-header";
import { PageLayout } from "../../shared/components/page-layout/page-layout";
import { OrdersStateService } from '../../states/order.state.service';

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
  // Inyectar el servicio de estado
  private orderStateService = inject(OrdersStateService);
  #SidebarService = inject(SidebarService);

  // Exponer propiedades del servicio para el template
  /** Uses real API data when available, falls back to mock data for visual testing */
  readonly orders = this.orderStateService.orders;
  readonly pagination = this.orderStateService.pagination;
  readonly isLoading = this.orderStateService.isLoading;
  readonly error = this.orderStateService.error;
  readonly hasData = computed(() => this.orders().length > 0);

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
    { value: OrderStatus.PENDING_PAYMENT,             label: 'Pendientes',   dotColor: '#f59e0b', bgColor: '#fef3c7', textColor: '#92400e' },
    { value: OrderStatus.PROCESSING_SHIPPING, label: 'Procesando',   dotColor: '#3b82f6', bgColor: '#dbeafe', textColor: '#1e40af' },
    { value: OrderStatus.SHIPPED,             label: 'Enviados',     dotColor: '#8b5cf6', bgColor: '#ede9fe', textColor: '#4c1d95' },
    { value: OrderStatus.DELIVERED,           label: 'Entregados',   dotColor: '#22c55e', bgColor: '#dcfce7', textColor: '#14532d' },
    { value: OrderStatus.CANCELLED,           label: 'Cancelados',   dotColor: '#ef4444', bgColor: '#fee2e2', textColor: '#7f1d1d' },
  ];

  /** Mapa de etiquetas legibles para el estado de la orden */
  private readonly orderStatusLabels: Record<string, string> = {
    [OrderStatus.PENDING_PAYMENT]:             'Pendiente de pago',
    [OrderStatus.PROCESSING_SHIPPING]: 'Procesando envío',
    [OrderStatus.SHIPPED]:             'Pedido Enviado',
    [OrderStatus.DELIVERED]:           'Pedido Entregado',
    [OrderStatus.CANCELLED]:           'Pedido Cancelado',
  };

  /** Mapa de etiquetas legibles para el estado del pago */
  private readonly paymentStatusLabels: Record<string, string> = {
    [PaymentStatus.PENDING]:              'Pendiente',
    [PaymentStatus.APPROVED]:             'Aprobado',
    [PaymentStatus.REJECTED]:             'Rechazado',
    [PaymentStatus.CANCELLED]:            'Cancelado',
    [PaymentStatus.WAITING_CONFIRMATION]: 'En revisión',
  };

  constructor() {
    this.#SidebarService.navbarTitle.set({
      title: 'Pedidos'
    });
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
    const baseClasses = 'badge badge-sm border-0 font-medium';
    switch (status) {
      case OrderStatus.PENDING_PAYMENT:             return `${baseClasses} bg-amber-100  text-amber-800`;
      case OrderStatus.PROCESSING_SHIPPING: return `${baseClasses} bg-blue-100   text-blue-800`;
      case OrderStatus.SHIPPED:             return `${baseClasses} bg-purple-100 text-purple-800`;
      case OrderStatus.DELIVERED:           return `${baseClasses} bg-green-100  text-green-800`;
      case OrderStatus.CANCELLED:           return `${baseClasses} bg-red-100    text-red-800`;
      // Valores crudos del backend (por si el enum no matchea todavía)
      case 'PROCESSING_SHIPPING':           return `${baseClasses} bg-blue-100   text-blue-800`;
      case 'PENDING':                       return `${baseClasses} bg-amber-100  text-amber-800`;
      case 'PENDING_PAYMENT':               return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case 'SHIPPED':                       return `${baseClasses} bg-purple-100 text-purple-800`;
      case 'DELIVERED':                     return `${baseClasses} bg-green-100  text-green-800`;
      case 'CANCELLED':                     return `${baseClasses} bg-red-100    text-red-800`;
      default:                              return `${baseClasses} bg-base-200   text-base-content/60`;
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
      case OrderStatus.PENDING_PAYMENT:             return this.pendingCount();
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
    const baseClasses = 'badge badge-xs border-0';
    switch (status) {
      case PaymentStatus.PENDING:
      case 'PENDING':              return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case PaymentStatus.APPROVED:
      case 'APPROVED':             return `${baseClasses} bg-green-100  text-green-800`;
      case PaymentStatus.REJECTED:
      case 'REJECTED':             return `${baseClasses} bg-red-100    text-red-800`;
      case PaymentStatus.CANCELLED:
      case 'CANCELLED':            return `${baseClasses} bg-base-200   text-base-content/50`;
      case PaymentStatus.WAITING_CONFIRMATION:
      case 'waiting_confirmation': return `${baseClasses} bg-blue-100   text-blue-800`;
      default:                     return `${baseClasses} bg-base-200   text-base-content/50`;
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
      console.log('✅ Pago marcado como recibido');
    } catch (error) {
      console.error('❌ Error al marcar pago como recibido:', error);
      alert('Error al actualizar el pago. Por favor, intenta nuevamente.');
    }
  }

  /**
   * Marcar orden como entregada (punto de encuentro)
   */
  async markAsDeliveredPickup(orderID: string): Promise<void> {
    try {
      await this.orderStateService.updateOrder('updateShippingStatus', { orderID, status: OrderStatus.DELIVERED });
      console.log('✅ Orden marcada como entregada en punto de encuentro');
    } catch (error) {
      console.error('❌ Error al marcar como entregada:', error);
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
      console.log('✅ Orden marcada como enviada');
    } catch (error) {
      console.error('❌ Error al marcar como enviada:', error);
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
      console.log('✅ Orden marcada como entregada a domicilio');
    } catch (error) {
      console.error('❌ Error al marcar como entregada:', error);
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
      console.log('✅ Proceso de envío iniciado');
    } catch (error) {
      console.error('❌ Error al iniciar envío:', error);
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
      console.log('✅ Orden cancelada');
    } catch (error) {
      console.error('❌ Error al cancelar orden:', error);
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
