import { httpResource } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';

// Importar las interfaces originales
import { environment } from '../../environments/environment';
import {
  IOrder,
  OrderFilters,
  OrdersApiResponse,
  OrderStatus,
  PaymentStatus,
} from '../interfaces/order.interface';
import { PaymentType } from '../interfaces/paymentInfo.interface';
import { ShippingType } from '../interfaces/shipping.interface';
import { OrdersService } from '../services/orders.service';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root',
})
export class OrdersStateService {
  private orderService = inject(OrdersService);
  private auth = inject(AuthService);
  // Signals para filtros
  private _status = signal<string>('all');
  private _userId = signal<string | undefined>(undefined);
  private _dateRange = signal<string>('');
  private _page = signal<number>(1);
  private _limit = signal<number>(10);

  // Signals públicos de solo lectura
  readonly status = this._status.asReadonly();
  readonly userId = this._userId.asReadonly();
  readonly dateRange = this._dateRange.asReadonly();
  readonly page = this._page.asReadonly();
  readonly limit = this._limit.asReadonly();

  // httpResource para obtener datos
  private state = httpResource<OrdersApiResponse>(() => {
    if (!this.auth.isAuthenticated()) return;
    const params = new URLSearchParams();
    params.set('page', this._page().toString());
    params.set('limit', this._limit().toString());

    if (this._status() !== 'all') {
      params.set('status', this._status());
    }

    if (this._userId()) {
      params.set('userId', this._userId()!);
    }

    if (this._dateRange() !== 'all') {
      params.set('dateRange', this._dateRange());
    }

    return {
      url: `${environment.apiUrl}/orders?${params.toString()}`,
      method: 'GET' as const,
    };
  });

  // método para agregar nueva orden
  addNewOrder(order: IOrder) {
    this.state.update((oldState) => {
      if (!oldState) return oldState;
      return {
        data: [order, ...oldState.data],
        pagination: oldState.pagination,
      };
    });
  }

  updateOrderState(order: Partial<IOrder>) {
    this.state.update((oldState) => {
      if (!oldState) return oldState;
      return {
        ...oldState,
        data: oldState.data.map((ordr) => {
          if (ordr._id === order._id) return { ...ordr, ...order };
          return ordr;
        }),
      };
    });
  }

  // Computed signals públicos
  readonly orders = computed(() => this.state.value()?.data || []);
  readonly pagination = computed(
    () =>
      this.state.value()?.pagination || {
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
        itemsPerPage: 10,
      },
  );
  readonly isLoading = computed(() => this.state.isLoading());
  readonly error = computed(() => this.state.error());
  readonly hasData = computed(() => this.orders().length > 0);

  // Computed signals para estadísticas
  readonly pendingCount = computed(
    () =>
      this.orders().filter((order) => order.status === OrderStatus.PENDING)
        .length,
  );

  readonly processingCount = computed(
    () =>
      this.orders().filter(
        (order) => order.status === OrderStatus.PROCESSING_SHIPPING,
      ).length,
  );

  readonly shippedCount = computed(
    () =>
      this.orders().filter((order) => order.status === OrderStatus.SHIPPED)
        .length,
  );

  readonly deliveredCount = computed(
    () =>
      this.orders().filter((order) => order.status === OrderStatus.DELIVERED)
        .length,
  );

  readonly cancelledCount = computed(
    () =>
      this.orders().filter((order) => order.status === OrderStatus.CANCELLED)
        .length,
  );

  readonly totalRevenue = computed(() =>
    this.orders()
      .filter((order) => order.status === OrderStatus.DELIVERED)
      .reduce((total, order) => total + order.total, 0),
  );

  readonly pendingPayments = computed(
    () =>
      this.orders().filter(
        (order) => order.paymentInfo.status === PaymentStatus.PENDING,
      ).length,
  );

  // Métodos para actualizar filtros
  setStatus(status: string): void {
    this._status.set(status);
    this._page.set(1); // Reset a la primera página
  }

  setUserId(userId: string | undefined): void {
    this._userId.set(userId);
    this._page.set(1);
  }

  setDateRange(dateRange: string): void {
    this._dateRange.set(dateRange);
    this._page.set(1);
  }

  setPage(page: number): void {
    this._page.set(page);
  }

  setLimit(limit: number): void {
    this._limit.set(limit);
    this._page.set(1);
  }

  // Método para refrescar datos
  refresh(): void {
    this.state.reload();
  }

  // Método para actualizar una orden específica
  async updateOrder(
    target: 'updatePayment' | 'updateShippingStatus',
    data: { orderID: string, status: PaymentStatus | OrderStatus },
  ): Promise<IOrder> {
    try {
      const { message, orderUpdated } =
        await this.orderService.updatePaymentState(data.orderID, target, data.status);
      console.log(orderUpdated);
      this.updateOrderState(orderUpdated);

      return orderUpdated;
    } catch (error) {
      console.error('Error al actualizar orden:', error);
      throw error;
    }
  }

  // Método para obtener una orden específica
  getOrderByNumber(orderNumber: string): IOrder | undefined {
    return this.orders().find((order) => order.orderNumber === orderNumber);
  }

  // Métodos de utilidad para filtros
  getStatusOptions() {
    return [
      { value: 'all', label: 'Todas las órdenes' },
      { value: OrderStatus.PENDING, label: 'Pendientes' },
      { value: OrderStatus.PROCESSING_SHIPPING, label: 'En proceso' },
      { value: OrderStatus.SHIPPED, label: 'Enviadas' },
      { value: OrderStatus.DELIVERED, label: 'Entregadas' },
      { value: OrderStatus.CANCELLED, label: 'Canceladas' },
    ];
  }

  getDateRangeOptions() {
    return [
      { value: 'all', label: 'Todas las fechas' },
      { value: 'today', label: 'Hoy' },
      { value: 'this_week', label: 'Esta semana' },
      { value: 'this_month', label: 'Este mes' },
      { value: 'last_3_months', label: 'Últimos 3 meses' },
      { value: 'last_6_months', label: 'Últimos 6 meses' },
      { value: 'this_year', label: 'Este año' },
    ];
  }

  // Método para resetear filtros
  resetFilters(): void {
    this._status.set('all');
    this._userId.set(undefined);
    this._dateRange.set('this_week');
    this._page.set(1);
    this._limit.set(10);
  }

  // Método para obtener el estado actual de los filtros
  getCurrentFilters(): OrderFilters {
    return {
      status: this._status() !== 'all' ? this._status() : undefined,
      userId: this._userId(),
      dateRange: this._dateRange() !== 'all' ? this._dateRange() : undefined,
      page: this._page(),
      limit: this._limit(),
    };
  }

  // Método para aplicar múltiples filtros a la vez
  applyFilters(filters: Partial<OrderFilters>): void {
    if (filters.status !== undefined) {
      this._status.set(filters.status);
    }
    if (filters.userId !== undefined) {
      this._userId.set(filters.userId);
    }
    if (filters.dateRange !== undefined) {
      this._dateRange.set(filters.dateRange);
    }
    if (filters.page !== undefined) {
      this._page.set(filters.page);
    }
    if (filters.limit !== undefined) {
      this._limit.set(filters.limit);
    }
  }

  // Método para obtener páginas para la paginación
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
}
