import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CurrencyPipe, DatePipe, CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatChipsModule } from '@angular/material/chips';

import {
  IOrder,
  OrderStatus,
  PaymentStatus,
} from '../../interfaces/order.interface';
import { PaymentType } from '../../interfaces/paymentInfo.interface';
import { ShippingType } from '../../interfaces/shipping.interface';
import { PageHeader } from "../../shared/components/page-header/page-header";
import { PageLayout } from "../../shared/components/page-layout/page-layout";
import { OrdersStateService } from '../../states/order.state.service';
import { SidebarService } from '../../services/sidebar.service';

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
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatChipsModule
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
  readonly orders = this.orderStateService.orders;
  readonly pagination = this.orderStateService.pagination;
  readonly isLoading = this.orderStateService.isLoading;
  readonly error = this.orderStateService.error;
  readonly hasData = this.orderStateService.hasData;

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

  protected readonly Math = Math;

  constructor() {
    this.#SidebarService.navbarTitle.set({
      title: 'Pedidos'
    });
  }

  // Table Columns
  displayedColumns: string[] = ['orderNumber', 'user', 'date', 'total', 'status', 'payment', 'shipping', 'actions'];

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
  getOrderStatusBadgeClass(status: OrderStatus): string {
    const baseClasses = 'badge badge-sm border-0 font-medium';
    switch (status) {
      case OrderStatus.PENDING: return `${baseClasses} bg-amber-100 text-amber-800`;
      case OrderStatus.PROCESSING_SHIPPING: return `${baseClasses} bg-blue-100 text-blue-800`;
      case OrderStatus.SHIPPED: return `${baseClasses} bg-purple-100 text-purple-800`;
      case OrderStatus.DELIVERED: return `${baseClasses} bg-green-100 text-green-800`;
      case OrderStatus.CANCELLED: return `${baseClasses} bg-red-100 text-red-800`;
      default: return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  }

  /**
   * Obtener clases CSS para el badge de estado de pago
   */
  getPaymentStatusBadgeClass(status: PaymentStatus): string {
    const baseClasses = 'badge badge-xs border-0';
    switch (status) {
      case PaymentStatus.PENDING: return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case PaymentStatus.APPROVED: return `${baseClasses} bg-green-100 text-green-800`;
      case PaymentStatus.REJECTED: return `${baseClasses} bg-red-100 text-red-800`;
      case PaymentStatus.CANCELLED: return `${baseClasses} bg-gray-100 text-gray-800`;
      default: return `${baseClasses} bg-gray-100 text-gray-800`;
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
      status === OrderStatus.PENDING ||
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
      status === OrderStatus.PENDING &&
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
      status === OrderStatus.PENDING
    );
  }

  /**
   * Verificar si se puede marcar como entregado
   */
  canMarkAsDelivered(status: OrderStatus, shippingType: ShippingType, paymentStatus: PaymentStatus): boolean {
    return (
      status === OrderStatus.SHIPPED ||
      (status === OrderStatus.PENDING &&
        shippingType === ShippingType.PICKUP &&
        paymentStatus === PaymentStatus.APPROVED)
    );
  }
}
