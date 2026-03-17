import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { ProductService } from '../../services/product.service';
import { OrdersService } from '../../services/orders.service';
import { CashRegisterStoreService } from '../../states/cash-register.state.service';
import { AuthService } from '../../services/auth.service';
import { PageLayout } from '../../shared/components/page-layout/page-layout';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { MatIconModule } from '@angular/material/icon';
import { NotificationsService } from '../../services/notifications.service';

@Component({
  selector: 'app-pos',
  standalone: true,
  imports: [CommonModule, FormsModule, PageLayout, PageHeader, MatIconModule, DecimalPipe],
  templateUrl: './pos.html',
  styleUrl: './pos.scss'
})
export class PosComponent implements OnInit {
  private productService = inject(ProductService);
  private ordersService = inject(OrdersService);
  private authService = inject(AuthService);
  private notifications = inject(NotificationsService);
  public cashStore = inject(CashRegisterStoreService);

  // Search
  searchQuery = signal('');
  products = signal<any[]>([]);
  loadingProducts = signal(false);
  private searchSubject = new Subject<string>();

  // Cart
  cart = signal<any[]>([]);
  total = computed(() => this.cart().reduce((sum, item) => sum + (item.price * item.quantity), 0));

  // Modals
  showVariantModal = signal(false);
  selectedProduct = signal<any>(null);

  showPaymentModal = signal(false);
  paymentMethods = [
    { id: 'Efectivo', name: 'Efectivo' },
    { id: 'Transferencia', name: 'Transferencia' },
    { id: 'Tarjeta', name: 'Tarjeta' },
    { id: 'mercadopago_gateway', name: 'Mercado Pago' }
  ];
  
  splitPayments = signal<{ method: string, amount: number }[]>([]);
  currentPaymentMethod = signal('Efectivo');
  paymentAmount = signal(0);
  notes = signal('');

  // Status
  isProcessing = signal(false);

  ngOnInit() {
    this.setupSearch();
  }

  setupSearch() {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(query => {
      this.performSearch(query);
    });
  }

  onSearchInput() {
    this.searchSubject.next(this.searchQuery());
  }

  async performSearch(query: string) {
    if (!query || query.length < 2) {
      this.products.set([]);
      return;
    }
    this.loadingProducts.set(true);
    this.productService.searchProducts(query).subscribe({
      next: (res) => {
        this.products.set(res);
        this.loadingProducts.set(false);
      },
      error: () => this.loadingProducts.set(false)
    });
  }

  addToCart(product: any) {
    if (product.variants && product.variants.length > 0) {
      this.selectedProduct.set(product);
      this.showVariantModal.set(true);
    } else {
      this.addVariantToCart(product, null);
    }
  }

  addVariantToCart(product: any, variant: any) {
    const cartItemId = variant ? `${product._id}-${variant._id}` : product._id;
    const currentCart = this.cart();
    const existingIndex = currentCart.findIndex(item => item.cartItemId === cartItemId);

    if (existingIndex > -1) {
      const updatedCart = [...currentCart];
      updatedCart[existingIndex].quantity += 1;
      this.cart.set(updatedCart);
    } else {
      this.cart.set([...currentCart, {
        cartItemId,
        product,
        variant,
        quantity: 1,
        price: variant ? variant.price : product.price
      }]);
    }
    this.showVariantModal.set(false);
    this.selectedProduct.set(null);
  }

  updateQuantity(index: number, delta: number) {
    const currentCart = [...this.cart()];
    currentCart[index].quantity += delta;
    if (currentCart[index].quantity <= 0) {
      currentCart.splice(index, 1);
    }
    this.cart.set(currentCart);
  }

  openCheckout() {
    if (this.cart().length === 0) return;
    this.splitPayments.set([]);
    this.paymentAmount.set(this.total());
    this.showPaymentModal.set(true);
  }

  addPayment() {
    const amount = this.paymentAmount();
    if (amount <= 0) return;
    this.splitPayments.update(prev => [...prev, {
      method: this.currentPaymentMethod(),
      amount: amount
    }]);
    this.paymentAmount.set(this.getRemainingAmount());
  }

  removePayment(index: number) {
    this.splitPayments.update(prev => {
      const updated = [...prev];
      updated.splice(index, 1);
      return updated;
    });
    this.paymentAmount.set(this.getRemainingAmount());
  }

  getPaidAmount() {
    return this.splitPayments().reduce((sum, p) => sum + p.amount, 0);
  }

  getRemainingAmount() {
    return Math.max(0, this.total() - this.getPaidAmount());
  }

  async processSale() {
    if (this.getRemainingAmount() > 0) {
      this.notifications.error('El monto pagado debe cubrir el total.');
      return;
    }

    this.isProcessing.set(true);
    
    const saleData = {
      items: this.cart().map(item => ({
        product: item.product._id,
        variant: item.variant?._id,
        quantity: item.quantity,
        unitPrice: item.price
      })),
      splitPayments: this.splitPayments(),
      notes: this.notes()
    };

    try {
      await this.ordersService.registerLocalSale(saleData);
      this.notifications.success('Venta realizada con éxito.');
      this.cart.set([]);
      this.showPaymentModal.set(false);
      this.notes.set('');
    } catch (err: any) {
      this.notifications.error(err.error?.message || 'Error al procesar la venta.');
    } finally {
      this.isProcessing.set(false);
    }
  }
}
