import { Component, inject, signal } from '@angular/core';

// Importar las interfaces (asumiendo que están en archivos separados)
import {
  IOrder,
  OrderStatus,
  PaymentStatus,
} from '../../interfaces/order.interface';
import { PaymentType } from '../../interfaces/paymentInfo.interface';
import { ShippingType } from '../../interfaces/shipping.interface';
import { OrdersStateService } from '../../states/order.state.service';

@Component({
  selector: 'app-client-orders',
  imports: [],
  templateUrl: './client-orders.html',
  styleUrl: './client-orders.scss',
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
  toggleOrderExpansion(orderNumber: string): void {
    this.expandedOrders.update((expanded) => {
      const newSet = new Set(expanded);
      if (newSet.has(orderNumber)) {
        newSet.delete(orderNumber);
      } else {
        newSet.add(orderNumber);
      }
      return newSet;
    });
  }

  /**
   * Verificar si una orden está expandida
   */
  isOrderExpanded(orderNumber: string): boolean {
    return this.expandedOrders().has(orderNumber);
  }

  /**
   * Marcar pago como recibido
   */
  async markPaymentReceived(order: IOrder): Promise<void> {
    try {
      await this.orderStateService.updateOrder(order.orderNumber, order);
      console.log('✅ Pago marcado como recibido');
    } catch (error) {
      console.error('❌ Error al marcar pago como recibido:', error);
      alert('Error al actualizar el pago. Por favor, intenta nuevamente.');
    }
  }

  /**
   * Marcar orden como entregada (punto de encuentro)
   */
  async markAsDeliveredPickup(order: IOrder): Promise<void> {
    try {
      const updatedOrder: IOrder = {
        ...order,
        status: OrderStatus.DELIVERED,
        paymentInfo: {
          ...order.paymentInfo,
          status: PaymentStatus.APPROVED,
          paymentDate: order.paymentInfo.paymentDate || new Date(),
        },
        updatedAt: new Date(),
      };

      await this.orderStateService.updateOrder(order.orderNumber, updatedOrder);
      console.log('✅ Orden marcada como entregada en punto de encuentro');
    } catch (error) {
      console.error('❌ Error al marcar como entregada:', error);
      alert('Error al actualizar la orden. Por favor, intenta nuevamente.');
    }
  }

  /**
   * Marcar orden como enviada
   */
  async markAsShipped(order: IOrder): Promise<void> {
    try {
      const updatedOrder: IOrder = {
        ...order,
        status: OrderStatus.SHIPPED,
        updatedAt: new Date(),
      };

      await this.orderStateService.updateOrder(order.orderNumber, updatedOrder);
      console.log('✅ Orden marcada como enviada');
    } catch (error) {
      console.error('❌ Error al marcar como enviada:', error);
      alert('Error al actualizar la orden. Por favor, intenta nuevamente.');
    }
  }

  /**
   * Marcar orden como entregada (envío a domicilio)
   */
  async markAsDelivered(order: IOrder): Promise<void> {
    try {
      const updatedOrder: IOrder = {
        ...order,
        status: OrderStatus.DELIVERED,
        updatedAt: new Date(),
      };

      await this.orderStateService.updateOrder(order.orderNumber, updatedOrder);
      console.log('✅ Orden marcada como entregada a domicilio');
    } catch (error) {
      console.error('❌ Error al marcar como entregada:', error);
      alert('Error al actualizar la orden. Por favor, intenta nuevamente.');
    }
  }

  /**
   * Iniciar proceso de envío
   */
  async startShipping(order: IOrder): Promise<void> {
    try {
      const updatedOrder: IOrder = {
        ...order,
        status: OrderStatus.PROCESSING_SHIPPING,
        updatedAt: new Date(),
      };

      await this.orderStateService.updateOrder(order.orderNumber, updatedOrder);
      console.log('✅ Proceso de envío iniciado');
    } catch (error) {
      console.error('❌ Error al iniciar envío:', error);
      alert('Error al actualizar la orden. Por favor, intenta nuevamente.');
    }
  }

  /**
   * Cancelar orden
   */
  async cancelOrder(order: IOrder): Promise<void> {
    if (!confirm('¿Estás seguro de que deseas cancelar esta orden?')) {
      return;
    }

    try {
      const updatedOrder: IOrder = {
        ...order,
        status: OrderStatus.CANCELLED,
        paymentInfo: {
          ...order.paymentInfo,
          status: PaymentStatus.CANCELLED,
        },
        updatedAt: new Date(),
      };

      await this.orderStateService.updateOrder(order.orderNumber, updatedOrder);
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
  canCancelOrder(order: IOrder): boolean {
    return (
      order.status === OrderStatus.PENDING ||
      order.status === OrderStatus.PROCESSING_SHIPPING
    );
  }

  /**
   * Verificar si se puede marcar pago como recibido
   */
  canMarkPaymentReceived(order: IOrder): boolean {
    return order.paymentInfo.status === PaymentStatus.PENDING;
  }

  /**
   * Verificar si se puede iniciar envío
   */
  canStartShipping(order: IOrder): boolean {
    return (
      order.status === OrderStatus.PENDING &&
      order.paymentInfo.status === PaymentStatus.APPROVED &&
      order.shippingInfo.type === ShippingType.HOME_DELIVERY
    );
  }

  /**
   * Verificar si se puede marcar como enviado
   */
  canMarkAsShipped(order: IOrder): boolean {
    return order.status === OrderStatus.PROCESSING_SHIPPING;
  }

  /**
   * Verificar si se puede marcar como entregado
   */
  canMarkAsDelivered(order: IOrder): boolean {
    return (
      order.status === OrderStatus.SHIPPED ||
      (order.status === OrderStatus.PENDING &&
        order.shippingInfo.type === ShippingType.PICKUP &&
        order.paymentInfo.status === PaymentStatus.APPROVED)
    );
  }

  /**
   * Verificar si se puede reordenar
   */
  canReorder(order: IOrder): boolean {
    return order.status === OrderStatus.DELIVERED;
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
  formatPrice(price: number): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  }

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
  reorder(order: IOrder): void {
    console.log('🔄 Reordenando:', order.orderNumber);
    // Implementar lógica de reorden aquí
  }

  /**
   * Ver detalles de la orden
   */
  viewOrderDetails(order: IOrder): void {
    this.toggleOrderExpansion(order.orderNumber);
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
