import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

// Importar las interfaces (asumiendo que están en archivos separados)
import { CurrencyPipe } from '@angular/common';
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

@Component({
  selector: 'app-client-orders',
  imports: [PageLayout, PageHeader, CurrencyPipe],
  templateUrl: './client-orders.html',
  styleUrl: './client-orders.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientOrders {
  // Inyectar el servicio de estado
  private orderStateService = inject(OrdersStateService);



  // Signal para órdenes expandidas
  expandedOrders = signal<Set<string>>(new Set());

  // Exponer propiedades del servicio para el template
  readonly orders = this.orderStateService.orders;
  readonly pagination = this.orderStateService.pagination;
  readonly isLoading = this.orderStateService.isLoading;
  readonly error = this.orderStateService.error;
  readonly hasData = this.orderStateService.hasData;

  // Estadísticas
  readonly pendingCount = this.orderStateService.pendingCount;
  readonly processingCount = this.orderStateService.processingCount;
  readonly shippedCount = this.orderStateService.shippedCount;
  readonly deliveredCount = this.orderStateService.deliveredCount;
  readonly cancelledCount = this.orderStateService.cancelledCount;
  readonly totalRevenue = this.orderStateService.totalRevenue;
  readonly pendingPayments = this.orderStateService.pendingPayments;

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
  readonly PaymentType = PaymentType;
  readonly ShippingType = ShippingType;

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
   * Toggle expansión de orden
   */
  toggleOrderExpansion(orderID: string): void {
    this.expandedOrders.update((set) => {
      const newSet = new Set(set);
      if (newSet.has(orderID)) {
        newSet.delete(orderID);
      } else {
        newSet.add(orderID);
      }
      return newSet;
    });
  }

  /**
   * Verificar si una orden está expandida
   */
  isOrderExpanded(orderID: string): boolean {
    return this.expandedOrders().has(orderID);
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

  /**
   * Obtener clases CSS para el badge de estado de orden
   */
  getOrderStatusBadgeClass(status: OrderStatus): string {
    const baseClasses =
      'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium';

    switch (status) {
      case OrderStatus.PENDING:
        return `${baseClasses} bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300`;
      case OrderStatus.PROCESSING_SHIPPING:
        return `${baseClasses} bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300`;
      case OrderStatus.SHIPPED:
        return `${baseClasses} bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300`;
      case OrderStatus.DELIVERED:
        return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300`;
      case OrderStatus.CANCELLED:
        return `${baseClasses} bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300`;
    }
  }

  /**
   * Obtener clases CSS para el badge de estado de pago
   */
  getPaymentStatusBadgeClass(status: PaymentStatus): string {
    const baseClasses =
      'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium';

    switch (status) {
      case PaymentStatus.PENDING:
        return `${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300`;
      case PaymentStatus.APPROVED:
        return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300`;
      case PaymentStatus.REJECTED:
        return `${baseClasses} bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300`;
      case PaymentStatus.CANCELLED:
        return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300`;
    }
  }

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

  /**
   * Verificar si se puede reordenar
   */
  canReorder(status: OrderStatus): boolean {
    return status === OrderStatus.DELIVERED;
  }

  /**
   * Formatear fecha
   */
  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  /**
   * Formatear precio en pesos argentinos
   */
  // formatPrice(price: number): string {
  //   return new Intl.NumberFormat('es-AR', {
  //     style: 'currency',
  //     currency: 'ARS',
  //     minimumFractionDigits: 0,
  //     maximumFractionDigits: 0,
  //   }).format(price);
  // }

  /**
   * Calcular total de ítems
   */
  calculateItemsTotal(items: any[]): number {
    return items.reduce((total, item) => total + item.price * item.quantity, 0);
  }

  /**
   * Obtener array de páginas para la paginación
   */
  getPageNumbers(): number[] {
    return this.orderStateService.getPageNumbers();
  }

  /**
   * Obtener texto descriptivo del tipo de envío
   */
  getShippingTypeText(shippingType: ShippingType): string {
    switch (shippingType) {
      case ShippingType.PICKUP:
        return 'Punto de encuentro';
      case ShippingType.HOME_DELIVERY:
        return 'Envío a domicilio';
      default:
        return 'No especificado';
    }
  }

  /**
   * Obtener texto del método de pago
   */
  getPaymentMethodText(paymentType: PaymentType): string {
    return paymentType;
  }

  /**
   * Manejar reorden
   */
  reorder(orderId: string): void {
    console.log('🔄 Reordenando:', orderId);
    // Implementar lógica de reorden aquí
  }

  /**
   * Ver detalles de la orden
   */
  viewOrderDetails(orderId: string): void {
    this.toggleOrderExpansion(orderId);
  }

  /**
   * TrackBy function para optimizar el rendimiento de la lista
   */
  trackByOrderNumber(index: number, order: IOrder): string {
    return order.orderNumber;
  }

  /**
   * TrackBy function para ítems
   */
  trackByItemIndex(index: number, item: any): number {
    return index;
  }

  /**
   * Resetear filtros
   */
  resetFilters(): void {
    this.orderStateService.resetFilters();
  }

  /**
   * Obtener información de paginación para mostrar
   */
  getPaginationInfo(): string {
    const pagination = this.pagination();
    const start = (pagination.currentPage - 1) * pagination.itemsPerPage + 1;
    const end = Math.min(
      pagination.currentPage * pagination.itemsPerPage,
      pagination.totalItems
    );
    return `Mostrando ${start} a ${end} de ${pagination.totalItems} resultados`;
  }
}
