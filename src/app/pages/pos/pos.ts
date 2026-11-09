import { Component, inject, OnInit, signal, computed, DestroyRef, HostListener } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { ProductService } from '../../services/product.service';
import { OrdersService } from '../../services/orders.service';
import { CashRegisterStoreService } from '../../states/cash-register.state.service';
import { StoreConfigStateService } from '../../states/store.config.state.service';
import { WebSocketService } from '../../services/websocket.service';
import { SoundService } from '../../services/sound.service';
import { PageLayout } from '../../shared/components/page-layout/page-layout';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { MatIconModule } from '@angular/material/icon';
import { NotificationsService } from '../../services/notifications.service';
import { BusinessProfileService } from '../../services/business-profile.service';
import { ProductStoreService } from '../../states/product.state.service';
import { MasterCatalogService, MasterCatalogProduct } from '../../services/master-catalog.service';
import { ClientsService } from '../../services/clients.service';
import { IClient } from '../../interfaces/client.interface';
import { PointService, IPointDevice } from '../../services/point.service';
import { SidebarService } from '../../services/sidebar.service';
import { environment } from '../../../environments/environment';
import { getTenantSlug } from '../../utils/tenant.utils';

export interface CartItem {
  cartItemId: string;
  product: any;
  variant: any | null;
  quantity: number;
  price: number;
  isSoldByWeight?: boolean;
  unit?: string;
  weightGrams?: number;
  totalMoneyAmount?: number;
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
  public wsService = inject(WebSocketService);
  private soundService = inject(SoundService);
  private http = inject(HttpClient);
  private destroyRef = inject(DestroyRef);
  public cashStore = inject(CashRegisterStoreService);
  public storeConfigStore = inject(StoreConfigStateService);
  public profile = inject(BusinessProfileService);
  private productState = inject(ProductStoreService);
  private masterCatalogService = inject(MasterCatalogService);
  private clientsService = inject(ClientsService);
  private pointService = inject(PointService);
  private sidebarService = inject(SidebarService);

  // Vista del catálogo en POS (Tarjetas vs Lista compacta)
  catalogViewMode = signal<'grid' | 'list'>(
    (() => {
      try {
        return (localStorage.getItem('admin_pos_view_mode') as 'grid' | 'list') === 'list' ? 'list' : 'grid';
      } catch {
        return 'grid';
      }
    })()
  );

  setCatalogViewMode(mode: 'grid' | 'list'): void {
    this.catalogViewMode.set(mode);
    try {
      localStorage.setItem('admin_pos_view_mode', mode);
    } catch {}
  }

  // Textos adaptativos según el rubro del comercio (Indumentaria vs Kiosco / Almacén / Carnicería / Panadería / Tech / Gastronomía)
  posSubtitle = computed(() => {
    const type = this.profile.businessType();
    switch (type) {
      case 'fashion':
        return 'Mostrador de indumentaria y calzado · Talles, colores y cobro multicanal';
      case 'kiosk_grocery':
        return 'Mostrador rápido de kiosco y almacén · Lector de barras, balanza y libreta';
      case 'butcher':
        return 'Mostrador de carnicería y granja · Venta por peso, cortes y cobro rápido';
      case 'bakery':
        return 'Mostrador de panadería y confitería · Venta por peso, unidades y caja rápida';
      case 'tech_electronics':
        return 'Terminal de tecnología y accesorios · Búsqueda por modelo, SKU y cobro';
      case 'gastronomy':
        return 'Comanda rápida de mostrador y cobro multicanal';
      default:
        return 'Terminal de mostrador y cobro multicanal';
    }
  });

  searchPlaceholder = computed(() => {
    const type = this.profile.businessType();
    switch (type) {
      case 'fashion':
        return 'Buscar prenda o calzado por modelo, marca, categoría, talle o SKU...';
      case 'kiosk_grocery':
        return 'Buscar artículo por nombre, marca o escanear código de barras...';
      case 'butcher':
        return 'Buscar corte o producto por nombre, categoría o código...';
      case 'bakery':
        return 'Buscar producto por nombre, categoría o código de barras...';
      case 'tech_electronics':
        return 'Buscar equipo o accesorio por modelo, marca, SKU o código...';
      case 'gastronomy':
        return 'Buscar plato, bebida o combo por nombre o categoría...';
      default:
        return 'Buscar producto por nombre, categoría, SKU o código...';
    }
  });

  emptyTicketMessage = computed(() => {
    const type = this.profile.businessType();
    if (type === 'fashion') {
      return 'Seleccioná prendas del catálogo o escaneá una etiqueta para armar el ticket.';
    }
    if (type === 'tech_electronics') {
      return 'Seleccioná equipos o accesorios del catálogo o escaneá el código.';
    }
    if (type === 'gastronomy') {
      return 'Seleccioná platos, bebidas o combos del catálogo para armar el pedido.';
    }
    return 'Seleccioná productos del catálogo o escaneá un código de barras para empezar.';
  });

  // Integración Mercado Pago Point (Terminales / Posnet Físico y Sandbox)
  pointDevices = signal<IPointDevice[]>([]);
  selectedPointDevice = signal<IPointDevice | null>(null);
  isLoadingPointDevices = signal<boolean>(false);
  isDispatchingPointOrder = signal<boolean>(false);
  pointOrderStatus = signal<'idle' | 'at_terminal' | 'processed' | 'failed' | 'cancelled'>('idle');
  activePointOrderId = signal<string | null>(null);
  pointPaymentDetails = signal<{
    paymentId?: string;
    status?: string;
    paymentMethodId?: string;
    paymentTypeId?: string;
    cardLastFourDigits?: string;
  } | null>(null);
  pointErrorMessage = signal<string | null>(null);
  pointMode = signal<'point' | 'manual'>('point');
  printTicketOnPoint = signal<boolean>(true);
  private pointPollInterval: any = null;

  // Catálogo Global en Mostrador POS
  showGlobalProductModal = signal<boolean>(false);
  globalProductFound = signal<MasterCatalogProduct | null>(null);
  globalProductPrice = signal<number>(0);
  isSavingGlobalProduct = signal<boolean>(false);

  // Terminal & Scanner Remoto
  terminalId = signal<string>('CAJA-01');
  showPairingModal = signal<boolean>(false);
  pairingLoading = signal<boolean>(false);
  pairingData = signal<any>(null);
  pairingQrImageUrl = computed(() => {
    const data = this.pairingData()?.qrPayload || '';
    if (!data) return '';
    return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=8&data=${encodeURIComponent(data)}`;
  });

  // Barcode scanner buffer & state
  private barcodeBuffer = '';
  private lastKeyStrokeTime = 0;

  // Mobile navigation tab
  activeTab = signal<'catalog' | 'cart'>('catalog');

  // Customer & Ticket
  customerName = signal<string>('Consumidor Final');
  currentTicketNumber = signal<string>('ORD-' + Math.floor(1000 + Math.random() * 9000));

  // Cliente & Fiado / Cuenta Corriente (Libreta de Kiosco)
  selectedClient = signal<IClient | null>(null);
  clientSearchQuery = signal<string>('');
  clientSearchResults = signal<IClient[]>([]);
  isSearchingClients = signal<boolean>(false);
  showClientSearchModal = signal<boolean>(false);

  // Alta Rápida de Cliente en Mostrador
  showCreateClientForm = signal<boolean>(false);
  newClientName = signal<string>('');
  newClientLastName = signal<string>('');
  newClientPhone = signal<string>('');
  newClientDni = signal<string>('');
  newClientCreditLimit = signal<number>(10000);
  isCreatingClient = signal<boolean>(false);

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
      if (!q) return matchCat && matchBrand;

      const matchModel = p.model?.toLowerCase().includes(q);
      const matchBrandQ = p.brand?.toLowerCase().includes(q);
      const matchCategoryQ = p.category?.toLowerCase().includes(q);
      const matchSlug = p.slug?.toLowerCase().includes(q);
      const matchBarcode = p.barcode?.toLowerCase().includes(q);
      const matchVariant = p.variants?.some(
        (v: any) =>
          v.sku?.toLowerCase().includes(q) ||
          v.barcode?.toLowerCase().includes(q) ||
          v.size?.toLowerCase() === q ||
          v.color?.name?.toLowerCase().includes(q)
      );

      return matchCat && matchBrand && (matchModel || matchBrandQ || matchCategoryQ || matchSlug || matchBarcode || matchVariant);
    });
  });

  // Pricing mode ('cash' vs 'card')
  selectedPaymentType = signal<'cash' | 'card'>('cash');

  // Cart & Discounts
  cart = signal<CartItem[]>([]);
  discountCoupon = signal<number>(0);
  subtotal = computed(() =>
    this.cart().reduce((sum, item) => {
      if (item.totalMoneyAmount !== undefined) {
        return sum + item.totalMoneyAmount;
      }
      return sum + Math.round(item.price * item.quantity);
    }, 0)
  );
  total = computed(() => Math.max(0, this.subtotal() - this.discountCoupon()));
  totalItems = computed(() =>
    this.cart().reduce((sum, item) => sum + (item.isSoldByWeight ? 1 : item.quantity), 0)
  );

  // Weight & Fractional Sale Modal (Venta por Balanza / Peso / Fraccionado)
  showWeightModal = signal<boolean>(false);
  weightProduct = signal<any>(null);
  weightInputMode = signal<'money' | 'weight'>('money');
  weightMoneyAmount = signal<number>(1000);
  weightGramsAmount = signal<number>(250);

  weightProductPrice = computed(() => {
    const p = this.weightProduct();
    return p ? this.getProductPrice(p) : 0;
  });

  computedGramsFromMoney = computed(() => {
    const price = this.weightProductPrice();
    const money = this.weightMoneyAmount();
    if (price <= 0 || money <= 0) return 0;
    return Math.round((money / price) * 1000);
  });

  computedMoneyFromGrams = computed(() => {
    const price = this.weightProductPrice();
    const grams = this.weightGramsAmount();
    if (price <= 0 || grams <= 0) return 0;
    return Math.round((grams / 1000) * price);
  });

  // Variant Modal
  showVariantModal = signal(false);
  selectedProduct = signal<any>(null);

  // Payment Modal
  showPaymentModal = signal(false);
  selectedMethod = signal<'EFECTIVO' | 'QR' | 'TRANSFERENCIA' | 'TARJETA' | 'SPLIT' | 'FIADO'>('EFECTIVO');
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
      '';
  });

  // Transfer Mode Policy
  transferPolicy = computed(() => {
    const config = this.storeConfigStore.StoreConfig().config;
    return config?.posConfig?.transferValidationMode || 'fast_receipt';
  });

  ngOnInit(): void {
    this.sidebarService.navbarTitle.set({ title: 'Mostrador (POS)' });
    this.setupSearch();
    this.loadInitialCatalog();
    this.setupBarcodeScanner();

    this.destroyRef.onDestroy(() => {
      this.stopPointPolling();
    });
  }

  setupBarcodeScanner(): void {
    this.wsService.joinPosTerminal(this.terminalId());

    this.wsService
      .onBarcodeScanned()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ barcode }) => {
        if (barcode) {
          this.soundService.playScannerBeep();
          this.notifications.info(`📷 Escaneado desde móvil: ${barcode}`);
          this.handleScannedBarcode(barcode.trim());
        }
      });
  }

  openPairingModal(): void {
    this.showPairingModal.set(true);
    this.pairingLoading.set(true);

    this.http
      .get<any>(`${environment.apiUrl}/pos/pairing?terminalId=${this.terminalId()}`)
      .subscribe({
        next: (res) => {
          this.pairingData.set(res.data);
          this.pairingLoading.set(false);
        },
        error: () => {
          const serverUrl = environment.apiUrl.replace(/\/api$/, '');
          const currentTenant = getTenantSlug() || 'POS';
          const fallbackData = {
            tenantSlug: currentTenant,
            terminalId: this.terminalId(),
            pairingCode: `${currentTenant.toUpperCase()}-${this.terminalId()}`,
            serverUrl,
            qrPayload: JSON.stringify({
              type: 'VEXX_POS_TERMINAL',
              version: '1.0',
              action: 'pos_pair',
              tenant: currentTenant,
              tenantSlug: currentTenant,
              terminal: this.terminalId(),
              terminalId: this.terminalId(),
              serverUrl,
              timestamp: Date.now(),
            }),
          };
          this.pairingData.set(fallbackData);
          this.pairingLoading.set(false);
        },
      });
  }

  closePairingModal(): void {
    this.showPairingModal.set(false);
  }

  // Métodos de Gestión de Clientes en POS
  openClientSearchModal(): void {
    this.showClientSearchModal.set(true);
    this.showCreateClientForm.set(false);
    this.searchClients(this.clientSearchQuery());
  }

  closeClientSearchModal(): void {
    this.showClientSearchModal.set(false);
    this.showCreateClientForm.set(false);
  }

  searchClients(query: string = ''): void {
    this.isSearchingClients.set(true);
    this.clientsService.getClients({ page: 1, limit: 15, q: query.trim() || undefined }).subscribe({
      next: (res) => {
        this.clientSearchResults.set(res.data || []);
        this.isSearchingClients.set(false);
      },
      error: (err) => {
        this.clientSearchResults.set([]);
        this.isSearchingClients.set(false);
        this.notifications.error(err.error?.message || 'Error al buscar clientes en la libreta');
      },
    });
  }

  onClientSearchInput(): void {
    this.searchClients(this.clientSearchQuery());
  }

  selectClient(client: IClient): void {
    this.selectedClient.set(client);
    const fullName = `${client.name} ${client.lastName || ''}`.trim();
    this.customerName.set(fullName);
    this.closeClientSearchModal();
    this.notifications.success(`Cliente seleccionado: ${fullName}`);
  }

  clearSelectedClient(): void {
    this.selectedClient.set(null);
    this.customerName.set('Consumidor Final');
    if (this.selectedMethod() === 'FIADO') {
      this.selectedMethod.set('EFECTIVO');
    }
  }

  toggleCreateClientForm(): void {
    this.showCreateClientForm.update((v) => !v);
  }

  saveQuickClient(): void {
    const name = this.newClientName().trim();
    if (!name) {
      this.notifications.warning('Por favor ingresá el nombre del cliente.');
      return;
    }

    this.isCreatingClient.set(true);
    this.clientsService
      .createClient({
        name,
        lastName: this.newClientLastName().trim() || undefined,
        phone: this.newClientPhone().trim() || undefined,
        dni: this.newClientDni().trim() || undefined,
        creditLimit: Number(this.newClientCreditLimit()) || 0,
      })
      .subscribe({
        next: (res) => {
          this.isCreatingClient.set(false);
          this.selectClient(res.data);
          this.notifications.success(`Cliente "${name}" registrado correctamente.`);
          this.newClientName.set('');
          this.newClientLastName.set('');
          this.newClientPhone.set('');
          this.newClientDni.set('');
          this.newClientCreditLimit.set(10000);
          this.showCreateClientForm.set(false);
        },
        error: (err) => {
          this.isCreatingClient.set(false);
          this.notifications.error(err.error?.message || 'Error al registrar cliente');
        },
      });
  }

  @HostListener('window:keydown', ['$event'])
  onGlobalKeydown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement;
    const isInputElement =
      target &&
      (target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable);

    const currentTime = Date.now();
    const timeDiff = currentTime - this.lastKeyStrokeTime;
    this.lastKeyStrokeTime = currentTime;

    if (event.key === 'Enter') {
      if (this.barcodeBuffer.length >= 6) {
        event.preventDefault();
        const scannedCode = this.barcodeBuffer.trim();
        this.barcodeBuffer = '';
        this.handleScannedBarcode(scannedCode);
      } else {
        this.barcodeBuffer = '';
      }
      return;
    }

    if (timeDiff > 80 && !isInputElement) {
      this.barcodeBuffer = '';
    }

    if (event.key.length === 1) {
      if (!isInputElement || timeDiff < 50) {
        this.barcodeBuffer += event.key;
      }
    }
  }

  handleScannedBarcode(barcode: string): void {
    if (!barcode) return;

    const localProduct = this.products().find((p) => {
      if (p.barcode === barcode) return true;
      return p.variants?.some((v: any) => v.barcode === barcode);
    });

    if (localProduct) {
      this.soundService.playScannerBeep();
      const matchedVariant = localProduct.variants?.find(
        (v: any) => v.barcode === barcode,
      );
      this.addVariantToCart(
        localProduct,
        matchedVariant || localProduct.variants?.[0] || null,
      );
      return;
    }

    this.productService.getProductByBarcode(barcode).subscribe({
      next: ({ product, matchedVariant }) => {
        if (product) {
          this.soundService.playScannerBeep();
          this.addVariantToCart(product, matchedVariant || null);
        } else {
          this.checkGlobalCatalogForBarcode(barcode);
        }
      },
      error: () => {
        this.checkGlobalCatalogForBarcode(barcode);
      },
    });
  }

  checkGlobalCatalogForBarcode(barcode: string): void {
    this.masterCatalogService.lookupBarcode(barcode).subscribe({
      next: (res) => {
        if (res && res.found && res.product) {
          this.globalProductFound.set(res.product);
          this.globalProductPrice.set(res.product.suggestedPrice || 1000);
          this.showGlobalProductModal.set(true);
        } else {
          this.notifications.error(`No se encontró ningún producto con código ${barcode}`);
        }
      },
      error: () => {
        this.notifications.error(`No se encontró ningún producto con código ${barcode}`);
      },
    });
  }

  async confirmAddGlobalProductToCart(): Promise<void> {
    const gp = this.globalProductFound();
    const price = Number(this.globalProductPrice() || 0);
    if (!gp || price <= 0) return;

    this.isSavingGlobalProduct.set(true);
    try {
      const formData = new FormData();
      formData.append('productType', 'general');
      formData.append('model', gp.name);
      formData.append('category', gp.category || 'Almacén');
      formData.append('brand', gp.brand || 'Genérico');
      formData.append('price', String(Math.round(price * 0.7)));
      formData.append('status', 'published');
      formData.append('barcode', gp.barcode);
      formData.append('isSoldByWeight', String(!!gp.isSoldByWeight));
      formData.append('unit', gp.unit || 'un');

      const cleanModel = gp.name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase();
      const variants = [
        {
          sku: `${cleanModel}-${Date.now().toString().slice(-4)}`,
          stock: 100,
          barcode: gp.barcode,
          isActive: true,
          imageReference: { url: gp.imageUrl || '', public_id: '' },
        },
      ];
      formData.append('variants', JSON.stringify(variants));

      const createdId = await this.productState.createProduct(formData);
      const newProduct = await this.productState.getProduct(createdId);

      if (newProduct) {
        this.products.update((list) => [newProduct, ...list]);
        this.soundService.playScannerBeep();

        if (newProduct.isSoldByWeight) {
          this.openWeightModal(newProduct);
        } else {
          this.addVariantToCart(newProduct, newProduct.variants?.[0] || null);
        }

        this.notifications.success(`✨ ¡${gp.name} sumado a la venta y guardado en tu catálogo!`);
      }
      this.closeGlobalProductModal();
    } catch (err) {
      this.notifications.error('Error al guardar el producto en el mostrador');
    } finally {
      this.isSavingGlobalProduct.set(false);
    }
  }

  closeGlobalProductModal(): void {
    this.showGlobalProductModal.set(false);
    this.globalProductFound.set(null);
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

  getProductFallbackIcon(product?: any): string {
    if (product?.isSoldByWeight) return 'scale';
    const type = this.profile.businessType();
    if (type === 'fashion') return 'checkroom';
    if (type === 'tech_electronics') return 'devices';
    if (type === 'gastronomy') return 'restaurant';
    if (type === 'bakery') return 'bakery_dining';
    return 'inventory_2';
  }

  getProductColors(product: any): { name: string; hex: string }[] {
    if (!product?.variants || !Array.isArray(product.variants)) return [];
    const seen = new Set<string>();
    const colors: { name: string; hex: string }[] = [];
    for (const v of product.variants) {
      if (v?.color?.name && !seen.has(v.color.name)) {
        seen.add(v.color.name);
        colors.push({ name: v.color.name, hex: v.color.hex || '#18181b' });
      }
    }
    return colors;
  }

  getProductSizesPreview(product: any): string[] {
    if (!product?.variants || !Array.isArray(product.variants)) return [];
    const seen = new Set<string>();
    const sizes: string[] = [];
    for (const v of product.variants) {
      if ((v.stock || 0) > 0 && v.size && v.size !== 'Único' && !seen.has(v.size)) {
        seen.add(v.size);
        sizes.push(v.size);
      }
    }
    return sizes;
  }

  getVariantDisplayLabel(variant: any): string {
    if (!variant) return '';
    if (this.profile.isFashion()) {
      const sizePart = variant.size ? `Talle ${variant.size}` : 'Talle Único';
      const colorPart = variant.color?.name ? ` · ${variant.color.name}` : '';
      return `${sizePart}${colorPart}`;
    }
    const parts: string[] = [];
    if (variant.size && variant.size !== 'Único') parts.push(variant.size);
    if (variant.color?.name) parts.push(variant.color.name);
    if (parts.length === 0 && variant.sku) parts.push(`SKU: ${variant.sku}`);
    return parts.join(' · ') || 'Estándar';
  }

  onSearchEnter(): void {
    const q = this.searchQuery().trim();
    if (!q) return;
    // Si coincide exactamente con un código de barras o SKU, o es un código numérico >= 6 dígitos
    const exactMatch = this.products().find(
      (p) =>
        p.barcode?.toLowerCase() === q.toLowerCase() ||
        p.variants?.some((v: any) => v.barcode?.toLowerCase() === q.toLowerCase() || v.sku?.toLowerCase() === q.toLowerCase())
    );
    if (exactMatch) {
      const matchedVariant = exactMatch.variants?.find(
        (v: any) => v.barcode?.toLowerCase() === q.toLowerCase() || v.sku?.toLowerCase() === q.toLowerCase()
      );
      this.soundService.playScannerBeep();
      if (exactMatch.isSoldByWeight) {
        this.openWeightModal(exactMatch);
      } else if (matchedVariant) {
        this.addVariantToCart(exactMatch, matchedVariant);
      } else {
        this.onProductCardClick(exactMatch);
      }
      this.searchQuery.set('');
      this.onSearchInput();
      return;
    }

    if (/^\d{6,14}$/.test(q)) {
      this.handleScannedBarcode(q);
      this.searchQuery.set('');
      this.onSearchInput();
    }
  }

  onProductCardClick(product: any): void {
    if (product.isSoldByWeight) {
      this.openWeightModal(product);
      return;
    }

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

  openWeightModal(product: any, initialMoney?: number, initialGrams?: number): void {
    this.weightProduct.set(product);
    const price = this.getProductPrice(product);
    if (initialMoney && initialMoney > 0) {
      this.weightInputMode.set('money');
      this.weightMoneyAmount.set(initialMoney);
      this.weightGramsAmount.set(price > 0 ? Math.round((initialMoney / price) * 1000) : 250);
    } else if (initialGrams && initialGrams > 0) {
      this.weightInputMode.set('weight');
      this.weightGramsAmount.set(initialGrams);
      this.weightMoneyAmount.set(price > 0 ? Math.round((initialGrams / 1000) * price) : 1000);
    } else {
      this.weightInputMode.set('money');
      this.weightMoneyAmount.set(1000);
      this.weightGramsAmount.set(price > 0 ? Math.round((1000 / price) * 1000) : 250);
    }
    this.showWeightModal.set(true);
  }

  closeWeightModal(): void {
    this.showWeightModal.set(false);
    this.weightProduct.set(null);
  }

  setWeightInputMode(mode: 'money' | 'weight'): void {
    this.weightInputMode.set(mode);
  }

  setQuickWeightMoney(amount: number): void {
    this.weightMoneyAmount.set(amount);
  }

  addQuickWeightMoney(delta: number): void {
    this.weightMoneyAmount.update((curr) => Math.max(0, curr + delta));
  }

  setQuickWeightGrams(grams: number): void {
    this.weightGramsAmount.set(grams);
  }

  addQuickWeightGrams(delta: number): void {
    this.weightGramsAmount.update((curr) => Math.max(0, curr + delta));
  }

  weightKeypadPress(key: string): void {
    const isMoney = this.weightInputMode() === 'money';
    const currentVal = isMoney ? this.weightMoneyAmount().toString() : this.weightGramsAmount().toString();

    if (key === 'C') {
      if (isMoney) this.weightMoneyAmount.set(0);
      else this.weightGramsAmount.set(0);
      return;
    }
    if (key === '⌫') {
      const sliced = currentVal.length <= 1 ? 0 : Number(currentVal.slice(0, -1));
      if (isMoney) this.weightMoneyAmount.set(sliced);
      else this.weightGramsAmount.set(sliced);
      return;
    }
    const newVal = currentVal === '0' ? key : currentVal + key;
    if (newVal.length <= 7) {
      const num = Number(newVal) || 0;
      if (isMoney) this.weightMoneyAmount.set(num);
      else this.weightGramsAmount.set(num);
    }
  }

  confirmWeightItem(): void {
    const product = this.weightProduct();
    if (!product) return;

    const price = this.getProductPrice(product);
    let qtyKg = 0;
    let finalGrams = 0;
    let finalMoney = 0;

    if (this.weightInputMode() === 'money') {
      finalMoney = this.weightMoneyAmount();
      if (finalMoney <= 0) {
        this.notifications.warning('Por favor ingresá un monto mayor a $0');
        return;
      }
      finalGrams = price > 0 ? Math.round((finalMoney / price) * 1000) : 0;
      qtyKg = Number((finalGrams / 1000).toFixed(4));
    } else {
      finalGrams = this.weightGramsAmount();
      if (finalGrams <= 0) {
        this.notifications.warning('Por favor ingresá un gramaje mayor a 0g');
        return;
      }
      qtyKg = Number((finalGrams / 1000).toFixed(4));
      finalMoney = Math.round((finalGrams / 1000) * price);
    }

    const cartItemId = `${product._id}-weight-${Date.now()}`;
    const newItem: CartItem = {
      cartItemId,
      product,
      variant: product.variants?.[0] || null,
      quantity: qtyKg,
      price,
      isSoldByWeight: true,
      unit: product.unit || 'kg',
      weightGrams: finalGrams,
      totalMoneyAmount: finalMoney,
    };

    this.cart.update((curr) => [...curr, newItem]);
    this.soundService.playScannerBeep();
    this.notifications.success(`Agregado: ${finalGrams}g de "${product.model}" por $${finalMoney.toLocaleString('es-AR')}`);
    this.closeWeightModal();
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
    const item = currentCart[index];
    if (!item) return;

    if (item.isSoldByWeight) {
      if (delta === -item.quantity || delta < -10) {
        currentCart.splice(index, 1);
        this.cart.set(currentCart);
        return;
      }
      this.openWeightModal(item.product, item.totalMoneyAmount, item.weightGrams);
      currentCart.splice(index, 1);
      this.cart.set(currentCart);
      return;
    }

    const newQty = item.quantity + delta;
    if (newQty <= 0) {
      currentCart.splice(index, 1);
    } else {
      currentCart[index] = { ...item, quantity: newQty };
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

  selectMethod(method: 'EFECTIVO' | 'QR' | 'TRANSFERENCIA' | 'TARJETA' | 'SPLIT' | 'FIADO'): void {
    this.selectedMethod.set(method);
    if (method === 'EFECTIVO') {
      this.cashReceived.set(this.total());
    } else if (method === 'QR') {
      this.generateQR();
    } else if (method === 'TARJETA') {
      this.loadPointDevices();
    } else if (method === 'SPLIT') {
      this.splitPayments.set([]);
      this.splitAmount.set(this.total());
    } else if (method === 'FIADO') {
      if (!this.selectedClient()) {
        this.openClientSearchModal();
      }
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

  // ── INTEGRACIÓN MERCADO PAGO POINT ──────────────────────

  loadPointDevices(): void {
    if (this.pointDevices().length > 0) return;
    this.isLoadingPointDevices.set(true);
    this.pointErrorMessage.set(null);

    this.pointService.getDevices().subscribe({
      next: (res) => {
        this.isLoadingPointDevices.set(false);
        if (res.success && res.data && res.data.length > 0) {
          this.pointDevices.set(res.data);
          this.selectedPointDevice.set(res.data[0]);
          this.pointMode.set('point');
        } else {
          this.pointDevices.set([]);
          this.selectedPointDevice.set(null);
          this.pointMode.set('manual');
        }
      },
      error: (err) => {
        this.isLoadingPointDevices.set(false);
        this.pointMode.set('manual');
        this.pointErrorMessage.set(err.error?.message || 'No se pudieron consultar terminales Point');
      }
    });
  }

  selectPointDevice(device: IPointDevice): void {
    this.selectedPointDevice.set(device);
  }

  setPointMode(mode: 'point' | 'manual'): void {
    this.pointMode.set(mode);
    if (mode === 'point' && this.pointDevices().length === 0) {
      this.loadPointDevices();
    }
  }

  sendPointCharge(): void {
    const device = this.selectedPointDevice();
    if (!device) {
      this.notifications.warning('Seleccioná una terminal Point');
      return;
    }

    this.isDispatchingPointOrder.set(true);
    this.pointOrderStatus.set('at_terminal');
    this.pointErrorMessage.set(null);

    this.pointService.createOrder({
      deviceId: device.id,
      amount: this.total(),
      orderNumber: this.currentTicketNumber(),
      description: `Cobro Vexx #${this.currentTicketNumber()}`,
      printOnTerminal: this.printTicketOnPoint()
    }).subscribe({
      next: (res) => {
        this.isDispatchingPointOrder.set(false);
        if (res.success && res.data) {
          this.activePointOrderId.set(res.data.orderId);
          this.startPointPolling(res.data.orderId);
        }
      },
      error: (err) => {
        this.isDispatchingPointOrder.set(false);
        this.pointOrderStatus.set('failed');
        const msg = err.error?.message || 'Error al conectar con la terminal Point';
        this.pointErrorMessage.set(msg);
        this.notifications.error(msg);
      }
    });
  }

  startPointPolling(orderId: string): void {
    this.stopPointPolling();
    this.pointPollInterval = setInterval(() => {
      this.pointService.getOrderStatus(orderId).subscribe({
        next: (res) => {
          if (res.success && res.data) {
            const status = res.data.status;
            if (status === 'processed') {
              this.stopPointPolling();
              this.pointOrderStatus.set('processed');
              this.pointPaymentDetails.set(res.data.paymentDetails || null);
              this.soundService.playScannerBeep();
              this.notifications.success('¡Pago Aprobado en la terminal Point!');
              setTimeout(() => {
                this.processSale();
              }, 1200);
            } else if (status === 'failed') {
              this.stopPointPolling();
              this.pointOrderStatus.set('failed');
              this.pointErrorMessage.set('El pago fue rechazado por la tarjeta en la terminal.');
              this.notifications.error('Pago rechazado en la terminal');
            } else if (status === 'cancelled') {
              this.stopPointPolling();
              this.pointOrderStatus.set('cancelled');
              this.pointErrorMessage.set('La operación fue cancelada en la terminal.');
            }
          }
        },
        error: () => {}
      });
    }, 2000);
  }

  stopPointPolling(): void {
    if (this.pointPollInterval) {
      clearInterval(this.pointPollInterval);
      this.pointPollInterval = null;
    }
  }

  cancelPointCharge(): void {
    const orderId = this.activePointOrderId();
    this.stopPointPolling();
    if (orderId) {
      this.pointService.cancelOrder(orderId).subscribe({
        next: () => {
          this.resetPointState();
          this.notifications.info('Cobro cancelado en la terminal.');
        },
        error: () => {
          this.resetPointState();
        }
      });
    } else {
      this.resetPointState();
    }
  }

  resetPointState(): void {
    this.stopPointPolling();
    this.pointOrderStatus.set('idle');
    this.activePointOrderId.set(null);
    this.isDispatchingPointOrder.set(false);
    this.pointPaymentDetails.set(null);
    this.pointErrorMessage.set(null);
  }

  closePaymentModal(): void {
    if (this.pointOrderStatus() === 'at_terminal') {
      this.cancelPointCharge();
    }
    this.resetPointState();
    this.showPaymentModal.set(false);
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
    } else if (method === 'FIADO') {
      const client = this.selectedClient();
      if (!client) {
        this.notifications.warning('Para fiar o anotar en libreta, seleccioná un cliente registrado.');
        this.openClientSearchModal();
        return;
      }
      const account = client.currentAccount;
      if (account && account.isCreditAllowed === false) {
        this.notifications.error(`El cliente ${client.name} tiene el crédito / fiado SUSPENDIDO.`);
        return;
      }
      const currentBalance = account?.balance || 0;
      const creditLimit = account?.creditLimit || 0;
      if (creditLimit > 0 && (currentBalance + this.total()) > creditLimit) {
        const available = Math.max(0, creditLimit - currentBalance);
        this.notifications.error(`La compra supera el límite de crédito del cliente. Disponible: $${available.toLocaleString('es-AR')}`);
        return;
      }
      finalSplitPayments = [{ method: 'CURRENT_ACCOUNT', amount: this.total() }];
    } else if (method === 'SPLIT') {
      if (this.getRemainingSplitAmount() > 0) {
        this.notifications.error('El total de los pagos divididos no cubre el total de la orden.');
        return;
      }
      finalSplitPayments = this.splitPayments();
    }

    this.isProcessing.set(true);

    const saleData: { items: any[]; splitPayments: any[]; notes?: string; userId?: string } = {
      items: this.cart().map((item) => ({
        _id: item.product._id,
        sku: item.variant?.sku || '',
        quantity: item.quantity,
      })),
      splitPayments: finalSplitPayments,
      notes: this.notes(),
    };

    if (this.selectedClient()?._id) {
      saleData.userId = this.selectedClient()!._id;
    }

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
    const storeName = this.storeConfigStore.StoreConfig().config?.name || 'nuestra tienda';
    const msg = `¡Hola! Gracias por tu compra en ${storeName}. Tu comprobante es #${order.orderNumber} por un total de $${order.total?.toLocaleString('es-AR')}.`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  }

  startNewSale(): void {
    this.showSuccessModal.set(false);
    this.lastCompletedOrder.set(null);
    this.activeTab.set('catalog');
    this.searchQuery.set('');
    this.clearSelectedClient();
    this.loadInitialCatalog();
  }
}
