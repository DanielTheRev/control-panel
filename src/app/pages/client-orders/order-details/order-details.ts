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

  /** Comisión de la pasarela de pago (MercadoPago/Tarjeta) enviada por el backend */
  paymentGatewayFee = computed(() => {
    return this.order()?.finance?.paymentGatewayFee || 0;
  });

  /** Ganancia Neta Real calculada deduciendo todos los egresos reales */
  grossProfit = computed(() => {
    const o = this.order();
    if (!o) return 0;
    
    // Si el backend ya guardó earnings en la orden, lo usamos prioritariamente si es consistente,
    // de lo contrario calculamos el valor neto exacto: Total Abonado - Proveedor - Adicionales - Comisión MP - Envío
    const calculatedNet = this.orderTotal() - this.baseProviderCost() - this.totalAdditionalCosts() - this.paymentGatewayFee() - this.shippingCost();
    return Math.max(0, calculatedNet);
  });

  /** Margen de Rentabilidad Real sobre el Total Abonado por el cliente */
  margin = computed(() => {
    const total = this.orderTotal();
    if (total <= 0) return 0;
    return (this.grossProfit() / total) * 100;
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

  // ─── Contact & Utility Helpers ───

  copied = signal<boolean>(false);

  copyText(text: string) {
    navigator.clipboard.writeText(text);
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 2000);
  }

  getWhatsAppUrl(): string {
    const o = this.order();
    if (!o) return '';
    const phone = o.shippingInfo?.shippingAddress?.phone || '';
    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone) return '';
    const clientName = o.user?.name || o.buyerData?.firstName || 'cliente';
    const text = encodeURIComponent(
      `¡Hola ${clientName}! Te contactamos de VURA por tu pedido #${o.orderNumber}. Queríamos informarte sobre el estado de tu compra.`
    );
    const formattedPhone = cleanPhone.startsWith('54') ? cleanPhone : `549${cleanPhone.replace(/^0+/, '')}`;
    return `https://wa.me/${formattedPhone}?text=${text}`;
  }

  getEmailUrl(): string {
    const o = this.order();
    if (!o) return '';
    const email = o.user?.email || o.buyerData?.email || '';
    const subject = encodeURIComponent(`Tu pedido #${o.orderNumber} en VURA`);
    return `mailto:${email}?subject=${subject}`;
  }

  /** Current Step index (0: Pendiente, 1: Pago Aprobado, 2: En Preparación, 3: En Camino, 4: Entregado) */
  orderStep = computed<number>(() => {
    const s = this.order()?.status;
    const ps = this.order()?.paymentInfo?.status;
    if (s === OrderStatus.DELIVERED) return 4;
    if (s === OrderStatus.SHIPPED) return 3;
    if (s === OrderStatus.PROCESSING_SHIPPING) return 2;
    if (ps === PaymentStatus.APPROVED) return 1;
    return 0;
  });

  getOrderStatusBadgeClass(status?: string): string {
    const base = 'badge badge-sm font-bold gap-1 shadow-2xs';
    switch (status) {
      case OrderStatus.PENDING_PAYMENT:
      case 'PENDING':
        return `${base} bg-amber-500/15 text-amber-600 border border-amber-500/30`;
      case OrderStatus.PROCESSING_SHIPPING:
        return `${base} bg-info/15 text-info border border-info/30`;
      case OrderStatus.SHIPPED:
        return `${base} bg-purple-500/15 text-purple-600 border border-purple-500/30`;
      case OrderStatus.DELIVERED:
        return `${base} bg-success/15 text-success border border-success/30`;
      case OrderStatus.CANCELLED:
      case 'PAYMENT_FAILED':
      case 'REJECTED':
        return `${base} bg-error/15 text-error border border-error/30`;
      default:
        return `${base} bg-base-200 text-base-content/60 border-base-300`;
    }
  }

  getOrderStatusIcon(status?: string): string {
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

  getOrderStatusLabel(status?: string): string {
    if (!status) return '';
    const map: Record<string, string> = {
      [OrderStatus.PENDING_PAYMENT]: 'Pendiente de Pago',
      [OrderStatus.PROCESSING_SHIPPING]: 'En Preparación / Embalaje',
      [OrderStatus.SHIPPED]: 'Enviado / En Camino',
      [OrderStatus.DELIVERED]: 'Entregado al Cliente',
      [OrderStatus.CANCELLED]: 'Pedido Cancelado',
      'PAYMENT_FAILED': 'Pago Rechazado',
      'PENDING': 'Pendiente',
      'APPROVED': 'Aprobado',
      'REJECTED': 'Rechazado',
    };
    return map[status] || status;
  }

  getPaymentStatusBadgeClass(status?: string): string {
    const base = 'badge badge-xs font-bold';
    switch (status) {
      case PaymentStatus.PENDING:
      case 'PENDING':
        return `${base} bg-amber-500/15 text-amber-600 border border-amber-500/30`;
      case PaymentStatus.APPROVED:
      case 'APPROVED':
        return `${base} bg-success/15 text-success border border-success/30`;
      case PaymentStatus.REJECTED:
      case 'REJECTED':
      case 'PAYMENT_FAILED':
        return `${base} bg-error/15 text-error border border-error/30`;
      case PaymentStatus.CANCELLED:
      case 'CANCELLED':
        return `${base} bg-base-200 text-base-content/50 border border-base-300`;
      case PaymentStatus.WAITING_CONFIRMATION:
      case 'waiting_confirmation':
        return `${base} bg-info/15 text-info border border-info/30`;
      default:
        return `${base} bg-base-200 text-base-content/50 border border-base-300`;
    }
  }

  getPaymentStatusLabel(status?: string): string {
    if (!status) return '';
    const map: Record<string, string> = {
      [PaymentStatus.PENDING]: 'Pendiente',
      [PaymentStatus.APPROVED]: 'Aprobado',
      [PaymentStatus.REJECTED]: 'Rechazado',
      [PaymentStatus.CANCELLED]: 'Cancelado',
      [PaymentStatus.WAITING_CONFIRMATION]: 'En Revisión',
      'PAYMENT_FAILED': 'Rechazado',
    };
    return map[status] || status;
  }

  // ─── Navigation ───

  goBack() {
    this.location.back();
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
