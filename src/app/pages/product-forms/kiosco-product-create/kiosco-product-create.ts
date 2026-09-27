import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  ElementRef,
  inject,
  input,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import {
  takeUntilDestroyed,
  toObservable,
} from '@angular/core/rxjs-interop';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatIcon } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { HotToastService } from '@ngxpert/hot-toast';
import {
  IProduct,
  ProductType,
} from '../../../interfaces/product.interface';
import { SidebarService } from '../../../services/sidebar.service';
import { DebugService } from '../../../services/debug.service';
import { MasterCatalogService, MasterCatalogProduct } from '../../../services/master-catalog.service';
import { ProductStoreService } from '../../../states/product.state.service';
import { StoreConfigStateService } from '../../../states/store.config.state.service';
import { ProviderStateService } from '../../../states/provider.state.service';
import { PageLayout } from '../../../shared/components/page-layout/page-layout';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { AddBrandCategory } from '../../../share/components/add-brand-category/add-brand-category';
import { ProviderCreate } from '../../provider-create/provider-create';

@Component({
  selector: 'app-kiosco-product-create',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    PageLayout,
    PageHeader,
    MatIcon,
    RouterLink,
  ],
  templateUrl: './kiosco-product-create.html',
})
export class KioscoProductCreate implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private sidebarService = inject(SidebarService);
  private productState = inject(ProductStoreService);
  private commerceConfigState = inject(StoreConfigStateService);
  private providerState = inject(ProviderStateService);
  private masterCatalogService = inject(MasterCatalogService);
  private dialog = inject(MatDialog);
  private toast = inject(HotToastService);
  private debug = inject(DebugService);

  @ViewChild('barcodeInput') barcodeInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('costPriceInput') costPriceInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('salePriceInput') salePriceInputRef!: ElementRef<HTMLInputElement>;

  productID = input<string | null>(null);
  isEditMode = computed(() => !!this.productID());
  originalProduct = signal<IProduct | null>(null);
  isLoading = signal<boolean>(false);
  isSearchingBarcode = signal<boolean>(false);

  // Catálogo Global Maestro
  globalMatchProduct = signal<MasterCatalogProduct | null>(null);
  showCatalogSearchModal = signal<boolean>(false);
  catalogSearchResults = signal<MasterCatalogProduct[]>([]);
  catalogSearchQuery = signal<string>('');
  isSearchingCatalog = signal<boolean>(false);

  // Previsualización de foto opcional
  selectedImageFile = signal<File | null>(null);
  imagePreviewUrl = signal<string | null>(null);

  readonly storeConfig = this.commerceConfigState.StoreConfig;
  readonly providers = this.providerState.ProviderState;

  readonly unitOptions = [
    { value: 'un', label: 'Unidad (un)' },
    { value: 'kg', label: 'Kilogramo (kg)' },
    { value: 'gr', label: 'Gramo (gr)' },
    { value: 'lt', label: 'Litro (lt)' },
    { value: 'ml', label: 'Mililitro (ml)' },
    { value: 'pack', label: 'Pack / Paquete' },
    { value: 'caja', label: 'Caja' },
  ];

  brands = computed(() => {
    const cfg = this.storeConfig();
    if (cfg.hasError || cfg.isLoading) return [];
    return cfg.config.brands || [];
  });

  categories = computed(() => {
    const cfg = this.storeConfig();
    if (cfg.hasError || cfg.isLoading) return [];
    return cfg.config.categories || [];
  });

  kioscoForm: FormGroup = this.fb.group({
    productType: [ProductType.GENERAL],
    barcode: [''],
    model: ['', Validators.required], // Nombre del producto
    category: ['', Validators.required],
    brand: ['Genérico'],
    provider: [''],
    costPrice: [0, [Validators.required, Validators.min(0)]],
    profitMargin: [40, [Validators.min(0)]], // Margen sugerido por defecto 40%
    salePrice: [0, [Validators.required, Validators.min(1)]],
    stock: [10, [Validators.required, Validators.min(0)]],
    unit: ['un', Validators.required],
    isSoldByWeight: [false],
    shortDescription: [''],
    sku: [''],
    status: ['published'],
  });

  constructor() {
    this.sidebarService.navbarTitle.set({ title: 'Kiosco / Carga Rápida' });

    // Cálculo dinámico entre Costo, Margen y Precio de Venta
    this.kioscoForm.get('costPrice')?.valueChanges.pipe(takeUntilDestroyed()).subscribe((cost) => {
      this.recalculateSalePriceFromCostAndMargin(cost, this.kioscoForm.get('profitMargin')?.value);
    });

    this.kioscoForm.get('profitMargin')?.valueChanges.pipe(takeUntilDestroyed()).subscribe((margin) => {
      this.recalculateSalePriceFromCostAndMargin(this.kioscoForm.get('costPrice')?.value, margin);
    });

    // Si se activa venta al peso, sugerir kg
    this.kioscoForm.get('isSoldByWeight')?.valueChanges.pipe(takeUntilDestroyed()).subscribe((isWeight) => {
      if (isWeight && this.kioscoForm.get('unit')?.value === 'un') {
        this.kioscoForm.patchValue({ unit: 'kg' }, { emitEvent: false });
      }
    });

    toObservable(this.productID)
      .pipe(takeUntilDestroyed())
      .subscribe(async (id) => {
        if (id) {
          await this.loadProduct(id);
        }
      });
  }

  ngOnInit(): void {
    setTimeout(() => {
      this.focusBarcode();
    }, 200);
  }

  focusBarcode() {
    this.barcodeInputRef?.nativeElement?.focus();
  }

  private recalculateSalePriceFromCostAndMargin(cost: number, margin: number) {
    if (cost && cost > 0 && margin >= 0) {
      const calculatedSale = Math.round(cost * (1 + margin / 100));
      this.kioscoForm.patchValue({ salePrice: calculatedSale }, { emitEvent: false });
    }
  }

  onSalePriceManualChange(sale: number) {
    const cost = Number(this.kioscoForm.get('costPrice')?.value || 0);
    if (cost > 0 && sale > 0) {
      const margin = Math.round(((sale - cost) / cost) * 100);
      this.kioscoForm.patchValue({ profitMargin: margin }, { emitEvent: false });
    }
  }

  private async loadProduct(id: string) {
    try {
      this.isLoading.set(true);
      const product = await this.productState.getProduct(id);
      this.originalProduct.set(structuredClone(product));

      const firstVariant = product.variants?.[0];
      const sale = product.price?.card_ticket1PayPrice || product.price?.listPrice || 0;
      const cost = product.finance?.providerCost?.inARS || sale * 0.7;
      const margin = cost > 0 ? Math.round(((sale - cost) / cost) * 100) : 40;

      this.kioscoForm.patchValue({
        productType: ProductType.GENERAL,
        barcode: (product as any).barcode || firstVariant?.barcode || '',
        model: product.model || '',
        category: product.category || '',
        brand: product.brand || 'Genérico',
        provider: product.provider?._id || product.provider || '',
        costPrice: Math.round(cost),
        profitMargin: margin,
        salePrice: Math.round(sale),
        stock: firstVariant?.stock ?? product.totalStock ?? 0,
        unit: (product as any).unit || 'un',
        isSoldByWeight: (product as any).isSoldByWeight ?? false,
        shortDescription: product.shortDescription || '',
        sku: firstVariant?.sku || '',
        status: product.status || 'published',
      });

      if (product.images?.[0]?.url) {
        this.imagePreviewUrl.set(product.images[0].url);
      }
    } catch (err) {
      this.debug.error('Error cargando producto kiosco', err);
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Búsqueda inteligente en el Catálogo Global Maestro de NexoCommerce
   */
  async searchBarcodeData() {
    const rawBarcode = this.kioscoForm.get('barcode')?.value?.trim();
    if (!rawBarcode || rawBarcode.length < 6) {
      this.toast.info('Ingresá al menos 6 dígitos para buscar en el catálogo.');
      return;
    }

    this.isSearchingBarcode.set(true);
    try {
      const res = await firstValueFrom(this.masterCatalogService.lookupBarcode(rawBarcode));

      if (res && res.found && res.product) {
        const p = res.product;
        this.applyCatalogProductToForm(p);

        const sourceLabel = res.source === 'database' ? 'Catálogo Central' : 'Red Externa';
        this.toast.success(`✨ ¡Encontrado en ${sourceLabel}! ${p.name}`, { duration: 4000 });
      } else {
        this.globalMatchProduct.set(null);
        this.toast.info('No encontrado en el catálogo global. Podés escribir los datos manualmente.');
      }
    } catch {
      this.toast.error('Error al consultar el catálogo.');
    } finally {
      this.isSearchingBarcode.set(false);
    }
  }

  applyCatalogProductToForm(p: MasterCatalogProduct) {
    this.globalMatchProduct.set(p);

    const patch: any = {
      model: p.name,
      barcode: p.barcode,
    };

    if (p.brand) patch.brand = p.brand;
    if (p.category) patch.category = p.category;
    if (p.unit) patch.unit = p.unit;
    if (p.isSoldByWeight !== undefined) patch.isSoldByWeight = p.isSoldByWeight;

    // Si tiene precio sugerido y no hay costo definido
    if (p.suggestedPrice && p.suggestedPrice > 0) {
      const currentCost = this.kioscoForm.get('costPrice')?.value;
      if (!currentCost || currentCost === 0) {
        patch.costPrice = Math.round(p.suggestedPrice * 0.7);
        patch.salePrice = p.suggestedPrice;
      }
    }

    if (p.imageUrl && !this.selectedImageFile()) {
      this.imagePreviewUrl.set(p.imageUrl);
    }

    this.kioscoForm.patchValue(patch);

    // Auto-foco al precio de costo para que la carga sea instantánea
    setTimeout(() => {
      this.costPriceInputRef?.nativeElement?.focus();
    }, 150);
  }

  // Métodos del Modal de Búsqueda por Nombre en Catálogo Global
  openCatalogSearchModal() {
    this.showCatalogSearchModal.set(true);
    const currentName = this.kioscoForm.get('model')?.value?.trim() || '';
    if (currentName) {
      this.catalogSearchQuery.set(currentName);
      this.searchInMasterCatalog(currentName);
    } else {
      this.searchInMasterCatalog('');
    }
  }

  closeCatalogSearchModal() {
    this.showCatalogSearchModal.set(false);
  }

  async searchInMasterCatalog(query: string) {
    this.isSearchingCatalog.set(true);
    try {
      const res = await firstValueFrom(this.masterCatalogService.search(query, 25));
      this.catalogSearchResults.set(res.data || []);
    } catch {
      this.toast.error('Error buscando en catálogo global');
    } finally {
      this.isSearchingCatalog.set(false);
    }
  }

  selectCatalogProduct(p: MasterCatalogProduct) {
    this.applyCatalogProductToForm(p);
    this.closeCatalogSearchModal();
    this.toast.success(`✨ Seleccionado: ${p.name}`);
  }

  onBarcodeKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.searchBarcodeData();
    }
  }

  onImageSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.selectedImageFile.set(file);
      const reader = new FileReader();
      reader.onload = () => this.imagePreviewUrl.set(reader.result as string);
      reader.readAsDataURL(file);
    }
  }

  removeSelectedImage() {
    this.selectedImageFile.set(null);
    this.imagePreviewUrl.set(null);
  }

  addBrandCategory(type: 'brand' | 'category') {
    const dialogRef = this.dialog.open(AddBrandCategory, {
      width: '400px',
      data: {
        type,
        actuallyData: type === 'brand' ? this.brands() : this.categories(),
      },
    });

    dialogRef.afterClosed().subscribe((result: string) => {
      if (result) {
        if (type === 'brand') {
          this.commerceConfigState.saveConfig({ brands: [...this.brands(), result] });
          this.kioscoForm.patchValue({ brand: result });
        } else {
          this.commerceConfigState.saveConfig({ categories: [...this.categories(), result] });
          this.kioscoForm.patchValue({ category: result });
        }
      }
    });
  }

  addProvider() {
    this.dialog.open(ProviderCreate, {
      minWidth: '60dvw',
      minHeight: '60dvh',
    });
  }

  // Guardado
  async saveProduct(andCreateNext: boolean = false) {
    if (this.kioscoForm.invalid) {
      this.kioscoForm.markAllAsTouched();
      return;
    }

    const raw = this.kioscoForm.getRawValue();
    const formData = new FormData();

    formData.append('productType', ProductType.GENERAL);
    formData.append('model', raw.model);
    formData.append('category', raw.category);
    formData.append('brand', raw.brand || 'Genérico');
    if (raw.provider) formData.append('provider', raw.provider);
    formData.append('price', String(raw.costPrice > 0 ? raw.costPrice : raw.salePrice));
    formData.append('status', String(raw.status || 'published'));
    formData.append('isFeatured', 'false');
    formData.append('shortDescription', raw.shortDescription || '');
    formData.append('largeDescription', '');

    // Kiosco specific fields
    if (raw.barcode) formData.append('barcode', raw.barcode.trim());
    formData.append('isSoldByWeight', String(raw.isSoldByWeight ?? false));
    formData.append('unit', raw.unit || 'un');

    // Variantes de kiosco (1 variante por defecto con el código de barras y stock)
    const cleanModel = raw.model.replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase();
    const sku = raw.sku || `${cleanModel}-${Date.now().toString().slice(-4)}`;
    const variants = [
      {
        sku,
        stock: Number(raw.stock || 0),
        barcode: raw.barcode ? raw.barcode.trim() : '',
        isActive: true,
        imageReference: { url: '', public_id: '' },
      },
    ];
    formData.append('variants', JSON.stringify(variants));

    // Foto opcional
    if (this.selectedImageFile()) {
      formData.append('images', this.selectedImageFile()!);
    }

    this.isLoading.set(true);
    try {
      if (this.isEditMode() && this.productID()) {
        await this.productState.updateProduct(this.productID()!, formData);
        this.toast.success('Producto actualizado correctamente');
        this.router.navigate(['/home/products', this.productID()]);
      } else {
        const id = await this.productState.createProduct(formData);
        this.toast.success('Producto guardado correctamente');

        if (andCreateNext) {
          // Preservar categoría para el siguiente
          const lastCat = raw.category;
          this.kioscoForm.reset({
            productType: ProductType.GENERAL,
            barcode: '',
            model: '',
            category: lastCat,
            brand: 'Genérico',
            provider: '',
            costPrice: 0,
            profitMargin: 40,
            salePrice: 0,
            stock: 10,
            unit: 'un',
            isSoldByWeight: false,
            shortDescription: '',
            sku: '',
            status: 'published',
          });
          this.removeSelectedImage();
          this.globalMatchProduct.set(null);
          setTimeout(() => this.focusBarcode(), 100);
        } else {
          this.router.navigate(['/home/products', id]);
        }
      }
    } catch (err) {
      this.debug.error('Error guardando producto kiosco', err);
    } finally {
      this.isLoading.set(false);
    }
  }
}
