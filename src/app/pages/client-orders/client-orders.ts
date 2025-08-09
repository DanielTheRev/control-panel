import { Component, computed, inject, signal } from '@angular/core';

// Importar las interfaces (asumiendo que están en archivos separados)
import { httpResource, HttpResourceRef } from '@angular/common/http';
import {
  IOrder,
  IOrderItem,
  OrdersApiResponse,
  OrderStatus,
  PaymentStatus,
} from '../../interfaces/order.interface';
import { PaymentType } from '../../interfaces/paymentInfo.interface';
import { ShippingType } from '../../interfaces/shipping.interface';
import { OrdersService } from '../../services/orders.service';

interface SearchParams {
  page: number;
  limit: number;
}

@Component({
  selector: 'app-client-orders',
  imports: [],
  templateUrl: './client-orders.html',
  styleUrl: './client-orders.scss',
})
export class ClientOrders {
  private orderService = inject(OrdersService);
  private orderState: HttpResourceRef<OrdersApiResponse | undefined>;

  // Signals para filtros y paginación
  selectedStatus = signal<string>('all');
  selectedDateRange = signal<string>('this_week');
  currentPage = signal<number>(1);
  expandedOrders = signal<Set<string>>(new Set());
  requestParams = computed(() => {
    const params: SearchParams = {
      page: this.currentPage(),
      limit: 12, // Puedes ajustar este valor según tus necesidades
    };

    // Agregar parámetros de búsqueda
    // const searchQuery = this.buildSearchQuery();
    // if (searchQuery) {
    //   params.q = searchQuery;
    // }

    return params;
  });

  constructor() {
    this.orderState = httpResource(
      () => ({
        url: 'http://localhost:3000/api/orders',
        method: 'GET',
        params: {
          page: this.requestParams().page,
          limit: 10,
        },
      }),
      {
        parse: (res: any) => {
          console.log(res);
          return res;
        },
      }
    );
  }

  // Computed signals
  orders = computed(() => this.orderState.value()?.data || []);
  pagination = computed(
    () =>
      this.orderState.value()?.pagination || {
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
        itemsPerPage: 10,
      }
  );
  isLoading = computed(() => this.orderState.isLoading());
  error = computed(() => this.orderState.error());

  // Enums para usar en el template
  readonly OrderStatus = OrderStatus;
  readonly PaymentStatus = PaymentStatus;
  readonly PaymentType = PaymentType;
  readonly ShippingType = ShippingType;

  // Opciones para los filtros
  readonly statusOptions = [
    { value: 'all', label: 'Todas las órdenes' },
    { value: OrderStatus.PENDING, label: 'Pendientes' },
    { value: OrderStatus.PROCESSING_SHIPPING, label: 'En proceso' },
    { value: OrderStatus.SHIPPED, label: 'Enviadas' },
    { value: OrderStatus.DELIVERED, label: 'Entregadas' },
    { value: OrderStatus.CANCELLED, label: 'Canceladas' },
  ];

  readonly dateRangeOptions = [
    { value: 'this_week', label: 'Esta semana' },
    { value: 'this_month', label: 'Este mes' },
    { value: 'last_3_months', label: 'Últimos 3 meses' },
    { value: 'last_6_months', label: 'Últimos 6 meses' },
    { value: 'this_year', label: 'Este año' },
  ];

  /**
   * Actualizar filtro de estado
   */
  updateStatusFilter(status: string): void {
    this.selectedStatus.set(status);
    this.currentPage.set(1); // Reset a la primera página
  }

  /**
   * Actualizar filtro de fecha
   */
  updateDateFilter(dateRange: string): void {
    this.selectedDateRange.set(dateRange);
    this.currentPage.set(1); // Reset a la primera página
  }

  /**
   * Cambiar página
   */
  changePage(page: number): void {
    this.currentPage.set(page);
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
  async markPaymentReceived(orderID: string) {
    try {
      const { message, order } = await this.orderService.updatePaymentState(
        orderID
      );
      console.log(message);
      this.orderState.update((oldSate) => {
        if (!oldSate) return oldSate;
        const newState = oldSate.data.map((_order) => {
          if (_order._id === order._id) return order;
          return _order;
        });
        return {
          ...oldSate,
          data: newState,
        };
      });
    } catch (error) {
      alert(error);
    }
    // const updatedOrder: IOrder = {
    //   ...order,
    //   paymentInfo: {
    //     ...order.paymentInfo,
    //     status: PaymentStatus.APPROVED,
    //     paymentDate: new Date(),
    //   },
    //   updatedAt: new Date(),
    // };

    // this.updateOrderOnServer(updatedOrder);
  }

  /**
   * Marcar orden como entregada (punto de encuentro)
   */
  markAsDeliveredPickup(order: IOrder): void {
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

    // this.updateOrderOnServer(updatedOrder);
  }

  /**
   * Marcar orden como enviada
   */
  markAsShipped(order: IOrder): void {
    const updatedOrder: IOrder = {
      ...order,
      status: OrderStatus.SHIPPED,
      updatedAt: new Date(),
    };

    // this.updateOrderOnServer(updatedOrder);
  }

  /**
   * Marcar orden como entregada (envío a domicilio)
   */
  markAsDelivered(order: IOrder): void {
    const updatedOrder: IOrder = {
      ...order,
      status: OrderStatus.DELIVERED,
      updatedAt: new Date(),
    };

    // this.updateOrderOnServer(updatedOrder);
  }

  /**
   * Iniciar proceso de envío
   */
  startShipping(order: IOrder): void {
    const updatedOrder: IOrder = {
      ...order,
      status: OrderStatus.PROCESSING_SHIPPING,
      updatedAt: new Date(),
    };

    // this.updateOrderOnServer(updatedOrder);
  }

  /**
   * Cancelar orden
   */
  cancelOrder(order: IOrder): void {
    if (confirm('¿Estás seguro de que deseas cancelar esta orden?')) {
      const updatedOrder: IOrder = {
        ...order,
        status: OrderStatus.CANCELLED,
        paymentInfo: {
          ...order.paymentInfo,
          status: PaymentStatus.CANCELLED,
        },
        updatedAt: new Date(),
      };

      // this.updateOrderOnServer(updatedOrder);
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
  calculateItemsTotal(items: IOrderItem[]): number {
    return items.reduce((total, item) => total + item.price * item.quantity, 0);
  }

  /**
   * Obtener array de páginas para la paginación
   */
  getPageNumbers(): number[] {
    const totalPages = this.pagination().totalPages;
    const currentPage = this.pagination().currentPage;
    const pages: number[] = [];

    // Mostrar máximo 5 páginas
    const maxPages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPages / 2));
    let endPage = Math.min(totalPages, startPage + maxPages - 1);

    // Ajustar si estamos cerca del final
    if (endPage - startPage + 1 < maxPages) {
      startPage = Math.max(1, endPage - maxPages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
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
    console.log('Reordenando:', order.orderNumber);
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
  trackByItemIndex(index: number, item: IOrderItem): number {
    return index;
  }

  /**
   * Recargar datos
   */
  refreshData(): void {
    // this.ordersResource.reload();
  }
}
