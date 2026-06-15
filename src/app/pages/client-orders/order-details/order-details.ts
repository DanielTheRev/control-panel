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

  shippingCost = computed(() => this.order()?.shippingInfo?.cost || 0);

  /** Total cobrado (incluye envío si lo pagó el cliente) */
  orderTotal = computed(() => this.order()?.finance?.total || this.order()?.total || 0);

  /** Costo base de los proveedores (Costo de Ventas) */
  baseProviderCost = computed(() => {
    return this.order()?.finance?.baseCost || 0;
  });

  /** Desglose de gastos adicionales desde los items */
  additionalCostsBreakdown = computed(() => {
    const o = this.order();
    if (!o) return [];
    const breakdownMap = new Map<string, number>();

    for (const item of o.items) {
      const additionalCosts = item.productSnapshot?.finance?.additionalCosts;
      if (!additionalCosts || !Array.isArray(additionalCosts)) continue;

      const providerCost = item.productSnapshot?.finance?.providerCost?.inARS || 0;

      for (const cost of additionalCosts) {
        let costValue = 0;
        if (cost.type === 'percent_over_provider') {
          costValue = providerCost * (cost.value / 100);
        } else if (cost.type === 'fixed') {
          costValue = cost.value;
        }
        
        costValue = costValue * item.quantity;
        const current = breakdownMap.get(cost.concept) || 0;
        breakdownMap.set(cost.concept, current + costValue);
      }
    }

    return Array.from(breakdownMap.entries()).map(([concept, value]) => ({ concept, value }));
  });

  totalAdditionalCosts = computed(() => {
    return this.additionalCostsBreakdown().reduce((sum, cost) => sum + cost.value, 0);
  });

  /** Ganancia Neta Final (dictada por el backend) */
  grossProfit = computed(() => this.order()?.finance?.earnings || 0);

  /** Comisiones de Pago deducidas matemáticamente si el backend no las envía */
  paymentGatewayFee = computed(() => {
    const o = this.order();
    if (!o || !o.finance) return 0;
    
    if (o.finance.paymentGatewayFee !== undefined) {
      return o.finance.paymentGatewayFee;
    }

    const fee = this.orderTotal() - this.baseProviderCost() - this.totalAdditionalCosts() - this.shippingCost() - this.grossProfit();
    return fee > 0 ? fee : 0;
  });

  /** Margen sobre el ingreso de los productos (descontando el envío para calcular la rentabilidad real) */
  margin = computed(() => {
    const isFreeShipping = this.order()?.shippingInfo?.freeShippingApplied;
    // Si el cliente pagó el envío, lo restamos del total abonado para saber cuánto ingreso es puramente de producto.
    // Si el vendedor pagó el envío, el total abonado ya es puramente de producto.
    const productRevenue = isFreeShipping ? this.orderTotal() : Math.max(0, this.orderTotal() - this.shippingCost());
    
    if (productRevenue <= 0) return 0;
    return (this.grossProfit() / productRevenue) * 100;
  });

  // ─── Per-item helpers ───

  getItemPrice(item: IOrderItem): number {
    if (!item) return 0;
    return item.price;
  }

  getItemAdditionalCosts(item: IOrderItem): number {
    const additionalCosts = item.productSnapshot?.finance?.additionalCosts;
    if (!additionalCosts || !Array.isArray(additionalCosts)) return 0;
    
    const providerCost = item.productSnapshot?.finance?.providerCost?.inARS || 0;
    let total = 0;
    
    for (const cost of additionalCosts) {
      if (cost.type === 'percent_over_provider') {
        total += providerCost * (cost.value / 100);
      } else if (cost.type === 'fixed') {
        total += cost.value;
      }
    }
    return total;
  }

  getItemEarnings(item: IOrderItem): number {
    if (!item) return 0;
    const orderPaymentType = this.order()?.paymentInfo.method;
    if (orderPaymentType === PaymentType.CARD) {
      return item.productSnapshot.finance?.calculatedProfits.card3Installments || 0;
    }
    if(orderPaymentType === PaymentType.BANK_TRANSFER || orderPaymentType === PaymentType.ALIAS_TRANSFER) {
      return item.productSnapshot.finance?.calculatedProfits.transfer || 0;
    }
    if(orderPaymentType === PaymentType.TICKET){
      return item.productSnapshot.finance?.calculatedProfits.card_ticket1Pay || 0;
    }
    return item.productSnapshot.finance?.calculatedProfits.card6Installments || 0;
    // return item.productSnapshot.finance?.calculatedProfits;
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
