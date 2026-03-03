import { CommonModule, CurrencyPipe, DatePipe, DecimalPipe, Location } from '@angular/common';
import { Component, computed, inject, Input, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { ActivatedRoute } from '@angular/router';
import { IOrder, OrderStatus } from '../../../interfaces/order.interface';
import { PageHeader } from "../../../shared/components/page-header/page-header";
import { PageLayout } from "../../../shared/components/page-layout/page-layout";
import { OrdersStateService } from '../../../states/order.state.service';
import { PaymentType } from '../../../interfaces/paymentInfo.interface';

@Component({
  selector: 'app-order-details',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    CurrencyPipe,
    DatePipe,
    DecimalPipe,
    PageLayout,
    PageHeader
  ],
  templateUrl: './order-details.html',
  styleUrl: './order-details.css'
})
export class OrderDetails implements OnInit {
  private route = inject(ActivatedRoute);
  private orderState = inject(OrdersStateService);
  private location = inject(Location);
  public paymentType = PaymentType;

  // Input id from router (withUnboundInputConfig: false in strict mode, but we use route params usually)
  // Angular 16+ can bind route params to inputs if enabled, effectively "input.required" logic if configured.
  // But standard way is route.snapshot or paramMap.
  // User asked "input.required(id)". This implies "withComponentInputBinding".
  @Input({ required: true }) id!: string;

  order = signal<IOrder | undefined>(undefined);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);

  // Computed properties for UI
  items = computed(() => this.order()?.items || []);

  // Financials
  subtotal = computed(() => this.order()?.total || 0);

  productsSubtotal = computed(() => {
    const items = this.items();
    if (this.order()?.paymentInfo.method === PaymentType.CASH) {
      return items.reduce((acc, item) => acc + (item.product.prices.earnings?.cash_transfer || 0 * item.quantity), 0);
    }
    return items.reduce((acc, item) => acc + (item.product.prices.earnings?.card_6_installments || 0 * item.quantity), 0);
  });

  shippingCost = computed(() => this.order()?.shippingCost || 0);

  totalRevenue = computed(() => this.order()?.total || 0);

  totalCost = computed(() => {
    const items = this.items();
    return items.reduce((acc, item) => {
      const unitCost = item.product.prices.costPrice.inARS ?? 0;
      return acc + (unitCost * item.quantity);
    }, 0);
  });

  grossProfit = computed(() => {
    const revenue = this.productsSubtotal();
    const cost = this.totalCost();
    return revenue - cost;
  });

  margin = computed(() => {
    const revenue = this.productsSubtotal();
    if (revenue === 0) return 0;
    return (this.grossProfit() / revenue) * 100;
  });

  displayedColumns: string[] = ['image', 'product', 'variant', 'quantity', 'price', 'cost', 'profit', 'total'];

  async ngOnInit() {
    if (this.id) {
      this.loading.set(true);
      const order = await this.orderState.getOrderById(this.id);
      console.log(order);
      if (order) {
        this.order.set(order);
      } else {
        this.error.set('Orden no encontrada');
      }
      this.loading.set(false);
    }
  }

  goBack() {
    this.location.back();
  }

  getOrderStatusBadgeClass(status: OrderStatus): string {
    const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
    switch (status) {
      case OrderStatus.PENDING: return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case OrderStatus.PROCESSING_SHIPPING: return `${baseClasses} bg-blue-100 text-blue-800`;
      case OrderStatus.SHIPPED: return `${baseClasses} bg-indigo-100 text-indigo-800`;
      case OrderStatus.DELIVERED: return `${baseClasses} bg-green-100 text-green-800`;
      case OrderStatus.CANCELLED: return `${baseClasses} bg-red-100 text-red-800`;
      default: return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  }
}
