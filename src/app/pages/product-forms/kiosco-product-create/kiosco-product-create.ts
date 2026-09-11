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
import { HotToastService } from '@ngxpert/hot-toast';
import {
  IProduct,
  ProductType,
} from '../../../interfaces/product.interface';
import { SidebarService } from '../../../services/sidebar.service';
import { DebugService } from '../../../services/debug.service';
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
  private dialog = inject(MatDialog);
  private toast = inject(HotToastService);
  private debug = inject(DebugService);

  @ViewChild('barcodeInput') barcodeInputRef!: ElementRef<HTMLInputElement>;

  productID = input<string | null>(null);
  isEditMode = computed(() => !!this.productID());
  originalProduct = signal<IProduct | null>(null);
  isLoading = signal<boolean>(false);
  isSearchingBarcode = signal<boolean>(false);

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
   * Búsqueda en OpenFoodFacts
   */
  async searchBarcodeData() {
    const rawBarcode = this.kioscoForm.get('barcode')?.value?.trim();
    if (!rawBarcode || rawBarcode.length < 8) {
      this.toast.info('Ingresá al menos 8 dígitos para buscar en la base de datos.');
      return;
    }

    this.isSearchingBarcode.set(true);
    try {
      const url = `https://world.openfoodfacts.org/api/v2/product/${rawBarcode}.json`;
      const res = await fetch(url).then((r) => r.json());

      if (res.status === 1 && res.product) {
        const p = res.product;
        const name = p.product_name_es || p.product_name || '';
        const brand = (p.brands || '').split(',')[0]?.trim() || '';

        const patch: any = {};
        if (name && !this.kioscoForm.get('model')?.value) patch.model = name;
        if (brand && (!this.kioscoForm.get('brand')?.value || this.kioscoForm.get('brand')?.value === 'Genérico')) {
          patch.brand = brand;
        }

        if (Object.keys(patch).length > 0) {
          this.kioscoForm.patchValue(patch);
          this.toast.success(`Encontrado: ${name || brand}`, { icon: '✨' });
        }
      } else {
        this.toast.info('No se encontraron datos en línea. Podés escribir el nombre manualmente.');
      }
    } catch {
      this.toast.error('No se pudo consultar la base externa.');
    } finally {
      this.isSearchingBarcode.set(false);
    }
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
