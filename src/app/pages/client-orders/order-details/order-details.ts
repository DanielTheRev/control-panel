import { CommonModule, CurrencyPipe, DatePipe, DecimalPipe, Location } from '@angular/common';
import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { IOrder, IOrderItem, OrderStatus, PaymentStatus } from '../../../interfaces/order.interface';
import { PageHeader } from "../../../shared/components/page-header/page-header";
import { PageLayout } from "../../../shared/components/page-layout/page-layout";
import { OrdersStateService } from '../../../states/order.state.service';
import { OrdersService } from '../../../services/orders.service';
import { PaymentType } from '../../../interfaces/paymentInfo.interface';
import { ShippingType } from '../../../interfaces/shipping.interface';

@Component({
  selector: 'app-order-details',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    CurrencyPipe,
    DatePipe,
    DecimalPipe,
    PageLayout,
    PageHeader,
    RouterLink
  ],
  templateUrl: './order-details.html',
  styleUrl: './order-details.css'
})
export class OrderDetails implements OnInit {
  private route = inject(ActivatedRoute);
  private orderState = inject(OrdersStateService);
  private ordersService = inject(OrdersService);
  private location = inject(Location);
  public paymentType = PaymentType;
  public paymentStatus = PaymentStatus;
  public OrderStatus = OrderStatus;
  public ShippingType = ShippingType;

  id = input.required<string>();

  order = signal<IOrder | null>(null);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);
  updating = signal<boolean>(false);

  ngOnInit(): void {
    this.loading.set(true);
    this.orderState.getOrderById(this.id())
      .then(order => {
        this.order.set(order);
        console.log(order);
      }).catch(() => {
        this.error.set('Error al cargar la orden');
      })
      .finally(() => {
        this.loading.set(false);
      });
  }

  items = computed(() => this.order()?.items || []);

  // ─── Financials ───

  /** Ingresos reales = precio de venta × cantidad, según método de pago */
  productsSubtotal = computed(() => {
    const items = this.items();
    const isCard = this.order()?.paymentInfo.method === PaymentType.CARD;
    return items.reduce((acc, item) => {
      const prices = item.productSnapshot?.prices;
      if (!prices) return acc;
      const unitPrice = isCard
        ? (prices.tarjeta_credito_debito ?? 0)
        : (prices.efectivo_transferencia ?? 0);
      return acc + unitPrice * item.quantity;
    }, 0);
  });

  /** Costo real de los productos en ARS */
  totalCost = computed(() => {
    return this.items().reduce((acc, item) => {
      const unitCost = item.productSnapshot?.prices?.costPrice?.inARS ?? 0;
      return acc + unitCost * item.quantity;
    }, 0);
  });

  shippingCost = computed(() => this.order()?.shippingCost || 0);

  /** Ganancia bruta = ingresos + envío - costo */
  grossProfit = computed(() => this.productsSubtotal() + this.shippingCost() - this.totalCost());

  margin = computed(() => {
    const revenue = this.productsSubtotal() + this.shippingCost();
    if (revenue === 0) return 0;
    return (this.grossProfit() / revenue) * 100;
  });

  // ─── Per-item helpers ───

  getItemPrice(item: any): number {
    const prices = item.productSnapshot?.prices;
    if (!prices) return 0;
    return this.order()?.paymentInfo?.method === PaymentType.CARD
      ? (prices.tarjeta_credito_debito ?? 0)
      : (prices.efectivo_transferencia ?? 0);
  }

  getItemEarnings(item: IOrderItem): number {
    const currentOrder = this.order();
    if (!item) return 0;
    if (!currentOrder) return 0;
    const earnings = item.productSnapshot?.prices?.earnings;
    if (!earnings) return 0;
    const paymentMethod = currentOrder.paymentInfo;
    const installments = currentOrder.paymentInfo.mercadopagoData.transactions.payments[0].payment_method.installments;
    let unitPrice = 0;
    switch (paymentMethod.method) {
      case PaymentType.CARD:
        if (installments !== undefined && installments === 1) {
          unitPrice = item.productSnapshot.prices.earnings.cash_transfer;
        } else if (installments !== undefined && installments === 3) {
          unitPrice = item.productSnapshot.prices.earnings.card_3_installments;
        } else if (installments !== undefined && installments === 6) {
          unitPrice = item.productSnapshot.prices.earnings.card_6_installments;
        } else {
          unitPrice = item.productSnapshot.prices.earnings.card_6_installments;
        }
        break;
      case PaymentType.TICKET:
        unitPrice = item.productSnapshot?.prices.earnings.cash_transfer;
        break;
      case PaymentType.CASH:
        unitPrice = item.productSnapshot?.prices.earnings.cash_transfer;
        break;
      case PaymentType.BANK_TRANSFER:
        unitPrice = item.productSnapshot?.prices.earnings.cash_transfer;
        break;
      case PaymentType.ALIAS_TRANSFER:
        unitPrice = item.productSnapshot?.prices.earnings.cash_transfer;
        break;
      default:
        unitPrice = item.productSnapshot?.prices.earnings.cash_transfer;
        break;
    }
    return unitPrice * item.quantity;
  }

  // ─── Navigation ───

  goBack() {
    this.location.back();
  }

  getOrderStatusBadgeClass(status: OrderStatus): string {
    const base = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
    switch (status) {
      case OrderStatus.PENDING_PAYMENT: return `${base} bg-yellow-100 text-yellow-800`;
      case OrderStatus.PROCESSING_SHIPPING: return `${base} bg-blue-100 text-blue-800`;
      case OrderStatus.SHIPPED: return `${base} bg-indigo-100 text-indigo-800`;
      case OrderStatus.DELIVERED: return `${base} bg-green-100 text-green-800`;
      case OrderStatus.CANCELLED: return `${base} bg-red-100 text-red-800`;
      default: return `${base} bg-gray-100 text-gray-800`;
    }
  }

  async printTicket() {
    const currentOrder = this.order();
    if (currentOrder) {
      await this.ordersService.downloadTicket(currentOrder._id);
    }
  }

  // ─── Order Actions ───

  async markPaymentReceived(): Promise<void> {
    const o = this.order();
    if (!o) return;
    this.updating.set(true);
    try {
      await this.orderState.updateOrder('updatePayment', { orderID: o._id, status: PaymentStatus.APPROVED });
      this.order.set({ ...o, paymentInfo: { ...o.paymentInfo, status: PaymentStatus.APPROVED } });
    } catch {
      alert('Error al actualizar el pago.');
    } finally {
      this.updating.set(false);
    }
  }

  async startShipping(): Promise<void> {
    const o = this.order();
    if (!o) return;
    this.updating.set(true);
    try {
      await this.orderState.updateOrder('updateShippingStatus', { orderID: o._id, status: OrderStatus.PROCESSING_SHIPPING });
      this.order.set({ ...o, status: OrderStatus.PROCESSING_SHIPPING });
    } catch {
      alert('Error al iniciar el envío.');
    } finally {
      this.updating.set(false);
    }
  }

  async markAsShipped(): Promise<void> {
    const o = this.order();
    if (!o) return;
    this.updating.set(true);
    try {
      await this.orderState.updateOrder('updateShippingStatus', { orderID: o._id, status: OrderStatus.SHIPPED });
      this.order.set({ ...o, status: OrderStatus.SHIPPED });
    } catch {
      alert('Error al marcar como enviado.');
    } finally {
      this.updating.set(false);
    }
  }

  async markAsDelivered(): Promise<void> {
    const o = this.order();
    if (!o) return;
    this.updating.set(true);
    try {
      await this.orderState.updateOrder('updateShippingStatus', { orderID: o._id, status: OrderStatus.DELIVERED });
      this.order.set({ ...o, status: OrderStatus.DELIVERED });
    } catch {
      alert('Error al marcar como entregado.');
    } finally {
      this.updating.set(false);
    }
  }

  async cancelOrder(): Promise<void> {
    const o = this.order();
    if (!o || !confirm('¿Estás seguro de que deseas cancelar esta orden?')) return;
    this.updating.set(true);
    try {
      await this.orderState.updateOrder('updateShippingStatus', { orderID: o._id, status: OrderStatus.CANCELLED });
      this.order.set({ ...o, status: OrderStatus.CANCELLED });
    } catch {
      alert('Error al cancelar la orden.');
    } finally {
      this.updating.set(false);
    }
  }

  // ─── Predicates ───

  canMarkPaymentReceived(): boolean {
    const o = this.order();
    return !!o && o.paymentInfo.status !== PaymentStatus.APPROVED;
  }

  canStartShipping(): boolean {
    const o = this.order();
    return !!o &&
      o.status === OrderStatus.PENDING_PAYMENT &&
      o.paymentInfo.status === PaymentStatus.APPROVED &&
      o.shippingInfo.type === ShippingType.HOME_DELIVERY;
  }

  canMarkAsShipped(): boolean {
    const o = this.order();
    return !!o && (o.status === OrderStatus.PROCESSING_SHIPPING || o.status === OrderStatus.PENDING_PAYMENT);
  }

  canMarkAsDelivered(): boolean {
    const o = this.order();
    if (!o) return false;
    return o.status === OrderStatus.SHIPPED ||
      (o.status === OrderStatus.PENDING_PAYMENT &&
        o.shippingInfo.type === ShippingType.PICKUP &&
        o.paymentInfo.status === PaymentStatus.APPROVED);
  }

  canCancelOrder(): boolean {
    const o = this.order();
    return !!o && (o.status === OrderStatus.PENDING_PAYMENT || o.status === OrderStatus.PROCESSING_SHIPPING);
  }

  isDelivered(): boolean {
    return this.order()?.status === OrderStatus.DELIVERED;
  }

  isCancelled(): boolean {
    return this.order()?.status === OrderStatus.CANCELLED;
  }
}
