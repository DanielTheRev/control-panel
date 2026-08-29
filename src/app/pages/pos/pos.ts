import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { ProductService } from '../../services/product.service';
import { OrdersService } from '../../services/orders.service';
import { CashRegisterStoreService } from '../../states/cash-register.state.service';
import { StoreConfigStateService } from '../../states/store.config.state.service';
import { PageLayout } from '../../shared/components/page-layout/page-layout';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { MatIconModule } from '@angular/material/icon';
import { NotificationsService } from '../../services/notifications.service';

export interface CartItem {
  cartItemId: string;
  product: any;
  variant: any | null;
  quantity: number;
  price: number;
  notes?: string;
}

@Component({
  selector: 'app-pos',
  standalone: true,
  imports: [CommonModule, FormsModule, PageLayout, PageHeader, MatIconModule, DecimalPipe],
  templateUrl: './pos.html',
  styleUrl: './pos.scss',
})
export class PosComponent implements OnInit {
  private productService = inject(ProductService);
  private ordersService = inject(OrdersService);
  private notifications = inject(NotificationsService);
  public cashStore = inject(CashRegisterStoreService);
  public storeConfigStore = inject(StoreConfigStateService);

  // Mobile navigation tab
  activeTab = signal<'catalog' | 'cart'>('catalog');

  // Customer & Ticket
  customerName = signal<string>('Consumidor Final');
  currentTicketNumber = signal<string>('ORD-' + Math.floor(1000 + Math.random() * 9000));

  // Search & Filters
  searchQuery = signal('');
  selectedCategory = signal<string>('all');
  selectedBrand = signal<string>('all');
  products = signal<any[]>([]);
  loadingProducts = signal(false);
  private searchSubject = new Subject<string>();

  // Categories & Brands computed
  categories = computed(() => {
    const cats = new Set<string>();
    this.products().forEach((p) => {
      if (p.category) cats.add(p.category);
    });
    return Array.from(cats);
  });

  brands = computed(() => {
    const b = new Set<string>();
    this.products().forEach((p) => {
      if (p.brand) b.add(p.brand);
    });
    return Array.from(b);
  });

  filteredProducts = computed(() => {
    const cat = this.selectedCategory();
    const brand = this.selectedBrand();
    const q = this.searchQuery().toLowerCase().trim();
    return this.products().filter((p) => {
      const matchCat = cat === 'all' || p.category?.toLowerCase() === cat.toLowerCase();
      const matchBrand = brand === 'all' || p.brand?.toLowerCase() === brand.toLowerCase();
      const matchQ = !q || p.model?.toLowerCase().includes(q) || p.brand?.toLowerCase().includes(q) || p.slug?.toLowerCase().includes(q);
      return matchCat && matchBrand && matchQ;
    });
  });

  // Pricing mode ('cash' vs 'card')
  selectedPaymentType = signal<'cash' | 'card'>('cash');

  // Cart & Discounts
  cart = signal<CartItem[]>([]);
  discountCoupon = signal<number>(0);
  subtotal = computed(() => this.cart().reduce((sum, item) => sum + item.price * item.quantity, 0));
  total = computed(() => Math.max(0, this.subtotal() - this.discountCoupon()));
  totalItems = computed(() => this.cart().reduce((sum, item) => sum + item.quantity, 0));

  // Variant Modal
  showVariantModal = signal(false);
  selectedProduct = signal<any>(null);

  // Payment Modal
  showPaymentModal = signal(false);
  selectedMethod = signal<'EFECTIVO' | 'QR' | 'TRANSFERENCIA' | 'TARJETA' | 'SPLIT'>('EFECTIVO');
  isProcessing = signal(false);
  autoPrintAfterSale = signal<boolean>(false);
  notes = signal('');

  // Cash Payment Calculator & Tactile Keypad
  cashReceived = signal<number>(0);
  cashChange = computed(() => Math.max(0, this.cashReceived() - this.total()));

  // Transfer Payment
  transferReceiptFile = signal<File | null>(null);
  transferReceiptPreview = signal<string | null>(null);

  // Dynamic QR
  qrImageUrl = signal<string>('');

  // Split Payments
  splitPayments = signal<{ method: string; amount: number }[]>([]);
  splitAmount = signal<number>(0);
  splitMethod = signal<string>('Efectivo');

  // Success Modal & Post-Sale
  showSuccessModal = signal(false);
  lastCompletedOrder = signal<any>(null);

  // Store Alias
  storeAlias = computed(() => {
    const config = this.storeConfigStore.StoreConfig().config;
    return config?.paymentGateways?.transfer?.alias ||
      config?.contact?.email ||
      'vura.oficial.mp';
  });

  // Transfer Mode Policy
  transferPolicy = computed(() => {
    const config = this.storeConfigStore.StoreConfig().config;
    return config?.posConfig?.transferValidationMode || 'fast_receipt';
  });

  ngOnInit(): void {
    this.setupSearch();
    this.loadInitialCatalog();
  }

  setupSearch(): void {
    this.searchSubject
      .pipe(debounceTime(250), distinctUntilChanged())
      .subscribe((query) => {
        this.performSearch(query);
      });
  }

  onSearchInput(): void {
    this.searchSubject.next(this.searchQuery());
  }

  loadInitialCatalog(): void {
    this.loadingProducts.set(true);
    this.productService.searchProducts('', 200).subscribe({
      next: (res) => {
        this.products.set(res.data || []);
        this.loadingProducts.set(false);
      },
      error: () => this.loadingProducts.set(false),
    });
  }

  performSearch(query: string): void {
    this.loadingProducts.set(true);
    this.productService.searchProducts(query, 200).subscribe({
      next: (res) => {
        this.products.set(res.data || []);
        this.loadingProducts.set(false);
      },
      error: () => this.loadingProducts.set(false),
    });
  }

  setPaymentType(type: 'cash' | 'card'): void {
    this.selectedPaymentType.set(type);
    const currentCart = this.cart();
    if (currentCart.length > 0) {
      this.cart.set(
        currentCart.map((item) => ({
          ...item,
          price: this.getProductPrice(item.product, type),
        }))
      );
    }
  }

  getProductPrice(product: any, paymentType?: string): number {
    const type = paymentType || this.selectedPaymentType();
    const price = product?.price;
    if (type === 'card') {
      return price?.listPrice || price?.card_ticket1PayPrice || 0;
    }
    return price?.cashTransferPrice || price?.card_ticket1PayPrice || price?.listPrice || 0;
  }

  getProductMainImage(product: any): string {
    return product?.mainImage ||
      product?.images?.[0]?.url ||
      product?.variants?.[0]?.imageReference?.url ||
      '';
  }

  getCategoryIcon(category: string): string {
    const cat = (category || '').toLowerCase();
    if (cat.includes('remera') || cat.includes('top')) return 'checkroom';
    if (cat.includes('pantalon') || cat.includes('jean') || cat.includes('short')) return 'styler';
    if (cat.includes('abrigo') || cat.includes('sweater') || cat.includes('campera') || cat.includes('buzo')) return 'dry_cleaning';
    if (cat.includes('camisa') || cat.includes('polo')) return 'apparel';
    if (cat.includes('calzado') || cat.includes('zapatilla')) return 'steps';
    if (cat.includes('accesorio')) return 'watch';
    return 'category';
  }

  getProductStock(product: any): number {
    if (!product?.variants || product.variants.length === 0) return product?.stock || 0;
    return product.variants.reduce((acc: number, v: any) => acc + (v.stock || 0), 0);
  }

  onProductCardClick(product: any): void {
    if (product.variants && product.variants.length > 1) {
      this.selectedProduct.set(product);
      this.showVariantModal.set(true);
    } else if (product.variants && product.variants.length === 1) {
      this.addVariantToCart(product, product.variants[0]);
    } else {
      this.addVariantToCart(product, null);
    }
  }

  onPlusButtonClick(product: any, event: MouseEvent): void {
    event.stopPropagation();
    this.onProductCardClick(product);
  }

  addVariantToCart(product: any, variant: any | null): void {
    const cartItemId = variant ? `${product._id}-${variant._id || variant.sku}` : product._id;
    const currentCart = this.cart();
    const existingIndex = currentCart.findIndex((item) => item.cartItemId === cartItemId);

    if (existingIndex > -1) {
      const updatedCart = [...currentCart];
      updatedCart[existingIndex] = {
        ...updatedCart[existingIndex],
        quantity: updatedCart[existingIndex].quantity + 1,
      };
      this.cart.set(updatedCart);
    } else {
      this.cart.set([
        ...currentCart,
        {
          cartItemId,
          product,
          variant,
          quantity: 1,
          price: this.getProductPrice(product),
        },
      ]);
    }

    this.showVariantModal.set(false);
    this.selectedProduct.set(null);
    this.notifications.success(`"${product.model}" agregado al ticket`);
  }

  updateQuantity(index: number, delta: number): void {
    const currentCart = [...this.cart()];
    const newQty = currentCart[index].quantity + delta;
    if (newQty <= 0) {
      currentCart.splice(index, 1);
    } else {
      currentCart[index] = { ...currentCart[index], quantity: newQty };
    }
    this.cart.set(currentCart);
  }

  clearCart(): void {
    if (this.cart().length === 0) return;
    this.cart.set([]);
    this.notifications.info('Ticket vaciado');
  }

  openCheckout(autoPrint: boolean = false): void {
    if (this.cart().length === 0) return;
    this.autoPrintAfterSale.set(autoPrint);
    this.selectedMethod.set('EFECTIVO');
    this.cashReceived.set(this.total());
    this.transferReceiptFile.set(null);
    this.transferReceiptPreview.set(null);
    this.splitPayments.set([]);
    this.splitAmount.set(this.total());
    this.generateQR();
    this.showPaymentModal.set(true);
  }

  keypadPress(key: string): void {
    const current = this.cashReceived().toString();
    if (key === 'C') {
      this.cashReceived.set(0);
      return;
    }
    if (key === '⌫' || key === 'x') {
      if (current.length <= 1) {
        this.cashReceived.set(0);
      } else {
        this.cashReceived.set(Number(current.slice(0, -1)) || 0);
      }
      return;
    }
    if (key === '.') {
      return;
    }
    if (this.cashReceived() === 0) {
      this.cashReceived.set(Number(key));
    } else {
      const nextStr = current + key;
      if (nextStr.length <= 9) {
        this.cashReceived.set(Number(nextStr));
      }
    }
  }

  selectMethod(method: 'EFECTIVO' | 'QR' | 'TRANSFERENCIA' | 'TARJETA' | 'SPLIT'): void {
    this.selectedMethod.set(method);
    if (method === 'EFECTIVO') {
      this.cashReceived.set(this.total());
    } else if (method === 'QR') {
      this.generateQR();
    } else if (method === 'SPLIT') {
      this.splitPayments.set([]);
      this.splitAmount.set(this.total());
    }
  }

  setQuickCash(amount: number): void {
    this.cashReceived.set(amount);
  }

  addQuickCash(increment: number): void {
    this.cashReceived.update((prev) => prev + increment);
  }

  generateQR(): void {
    const total = this.total();
    const qrData = `https://mpago.la/pos/${this.storeAlias()}?amount=${total}`;
    this.qrImageUrl.set(`https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(qrData)}`);
  }

  copyAlias(): void {
    navigator.clipboard.writeText(this.storeAlias());
    this.notifications.success('¡Alias copiado al portapapeles!');
  }

  onReceiptFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.transferReceiptFile.set(file);

      const reader = new FileReader();
      reader.onload = (e) => {
        this.transferReceiptPreview.set(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  removeReceipt(): void {
    this.transferReceiptFile.set(null);
    this.transferReceiptPreview.set(null);
  }

  addSplitPayment(): void {
    const amount = this.splitAmount();
    if (amount <= 0) return;
    this.splitPayments.update((prev) => [
      ...prev,
      { method: this.splitMethod(), amount },
    ]);
    this.splitAmount.set(this.getRemainingSplitAmount());
  }

  removeSplitPayment(index: number): void {
    this.splitPayments.update((prev) => {
      const updated = [...prev];
      updated.splice(index, 1);
      return updated;
    });
    this.splitAmount.set(this.getRemainingSplitAmount());
  }

  getPaidSplitAmount(): number {
    return this.splitPayments().reduce((sum, p) => sum + p.amount, 0);
  }

  getRemainingSplitAmount(): number {
    return Math.max(0, this.total() - this.getPaidSplitAmount());
  }

  async processSale(): Promise<void> {
    const method = this.selectedMethod();
    let finalSplitPayments: { method: string; amount: number }[] = [];

    if (method === 'EFECTIVO') {
      if (this.cashReceived() < this.total()) {
        this.notifications.error('El efectivo recibido es menor al total.');
        return;
      }
      finalSplitPayments = [{ method: 'Efectivo', amount: this.total() }];
    } else if (method === 'QR') {
      finalSplitPayments = [{ method: 'mercadopago_gateway', amount: this.total() }];
    } else if (method === 'TRANSFERENCIA') {
      finalSplitPayments = [{ method: 'Transferencia', amount: this.total() }];
    } else if (method === 'TARJETA') {
      finalSplitPayments = [{ method: 'Tarjeta', amount: this.total() }];
    } else if (method === 'SPLIT') {
      if (this.getRemainingSplitAmount() > 0) {
        this.notifications.error('El total de los pagos divididos no cubre el total de la orden.');
        return;
      }
      finalSplitPayments = this.splitPayments();
    }

    this.isProcessing.set(true);

    const saleData = {
      items: this.cart().map((item) => ({
        _id: item.product._id,
        sku: item.variant?.sku || '',
        quantity: item.quantity,
      })),
      splitPayments: finalSplitPayments,
      notes: this.notes(),
    };

    try {
      const res = await this.ordersService.registerLocalSale(saleData);
      const createdOrder = res.order;

      // Si hay archivo de comprobante adjunto, subirlo
      const receiptFile = this.transferReceiptFile();
      if (receiptFile && createdOrder?._id) {
        try {
          await this.ordersService.uploadReceipt(createdOrder._id, receiptFile);
        } catch {
          console.warn('Comprobante no pudo subirse');
        }
      }

      this.lastCompletedOrder.set(createdOrder);
      this.cart.set([]);
      this.showPaymentModal.set(false);
      this.showSuccessModal.set(true);
      if (this.autoPrintAfterSale()) {
        this.printTicket();
      }
      this.notifications.success('¡Venta registrada con éxito!');
    } catch (err: any) {
      this.notifications.error(err.error?.message || 'Error al procesar la venta en mostrador.');
    } finally {
      this.isProcessing.set(false);
    }
  }

  printTicket(): void {
    const order = this.lastCompletedOrder();
    if (order?._id) {
      this.ordersService.downloadTicket(order._id);
    }
  }

  shareWhatsApp(): void {
    const order = this.lastCompletedOrder();
    if (!order) return;
    const msg = `¡Hola! Gracias por tu compra en Vura. Tu comprobante es #${order.orderNumber} por un total de $${order.total?.toLocaleString('es-AR')}.`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  }

  startNewSale(): void {
    this.showSuccessModal.set(false);
    this.lastCompletedOrder.set(null);
    this.activeTab.set('catalog');
    this.searchQuery.set('');
    this.loadInitialCatalog();
  }
}
