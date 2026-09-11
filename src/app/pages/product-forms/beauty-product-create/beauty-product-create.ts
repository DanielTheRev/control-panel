import { CommonModule, DecimalPipe } from '@angular/common';
import {
  Component,
  computed,
  inject,
  input,
  OnInit,
  signal,
} from '@angular/core';
import {
  takeUntilDestroyed,
  toObservable,
  toSignal,
} from '@angular/core/rxjs-interop';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatIcon } from '@angular/material/icon';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { Router, RouterLink } from '@angular/router';
import { QuillModule } from 'ngx-quill';
import {
  combineLatest,
  catchError,
  debounceTime,
  distinctUntilChanged,
  EMPTY,
  filter,
  map,
  switchMap,
} from 'rxjs';
import {
  IProduct,
  ProductType,
} from '../../../interfaces/product.interface';
import { IFinanceCost } from '../../../interfaces/finance.interface';
import { SidebarService } from '../../../services/sidebar.service';
import { DebugService } from '../../../services/debug.service';
import { ProductStoreService } from '../../../states/product.state.service';
import { StoreConfigStateService } from '../../../states/store.config.state.service';
import { ProviderStateService } from '../../../states/provider.state.service';
import { PageLayout } from '../../../shared/components/page-layout/page-layout';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { ImageUploadComponent } from '../../../shared/components/image-upload/image-upload.component';
import { AddBrandCategory } from '../../../share/components/add-brand-category/add-brand-category';
import { ProviderCreate } from '../../provider-create/provider-create';

@Component({
  selector: 'app-beauty-product-create',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    PageLayout,
    PageHeader,
    QuillModule,
    MatSnackBarModule,
    ImageUploadComponent,
    MatIcon,
    RouterLink,
    DecimalPipe,
  ],
  templateUrl: './beauty-product-create.html',
  styleUrl: './beauty-product-create.css',
})
export class BeautyProductCreate implements OnInit {
  private sidebarService = inject(SidebarService);
  private fb = inject(FormBuilder);
  private productState = inject(ProductStoreService);
  private router = inject(Router);
  private commerceConfigState = inject(StoreConfigStateService);
  private dialog = inject(MatDialog);
  private providerState = inject(ProviderStateService);
  private debug = inject(DebugService);

  readonly storeConfig = this.commerceConfigState.StoreConfig;
  readonly providers = this.providerState.ProviderState;

  productID = input<string | null>(null);
  isEditMode = computed(() => !!this.productID());
  originalProduct = signal<IProduct | null>(null);
  isLoading = signal<boolean>(false);
  isFormReady = signal<boolean>(false);
  isCalculatingListPrice = signal<boolean>(false);
  isUsingGlobalMargin = signal<boolean>(true);
  calculatedListPrice = signal<IFinanceCost | null>(null);
  private deletedImages = signal<string[]>([]);

  // Stepper tabs
  currentStep = signal<number>(0);
  readonly sections = [
    { id: 'info', title: '1. Fragancia & Ficha', icon: 'spa', desc: 'Familia, notas y concentración' },
    { id: 'pricing', title: '2. Precios & Finanzas', icon: 'payments', desc: 'Costo, margen y cuotas' },
    { id: 'variants', title: '3. Presentaciones & Stock', icon: 'inventory_2', desc: 'Volúmenes (ml) y stock' },
    { id: 'details', title: '4. Multimedia & Descripción', icon: 'photo_library', desc: 'Fotos, copy y aplicación' },
  ];

  readonly concentrationOptions = [
    'Parfum (Extracto)',
    'Eau de Parfum (EDP)',
    'Eau de Toilette (EDT)',
    'Eau de Cologne (EDC)',
    'Body Splash / Bruma',
    'Serum Concentrado',
    'Crema / Tratamiento',
  ];

  readonly fragranceFamilies = [
    'Amaderada',
    'Cítrica',
    'Floral',
    'Oriental / Especiada',
    'Aromática / Fougère',
    'Gourmand / Dulce',
    'Acuática / Marina',
    'Cuero',
    'Frutal',
  ];

  readonly genderOptions = ['Unisex', 'Hombre', 'Mujer'];

  readonly applicationAreas = [
    'Cuello y Muñecas (Puntos de pulso)',
    'Rostro y Cuello',
    'Cuerpo Completo',
    'Cabello',
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

  globalPricingMethod = computed(() => {
    const cfg = this.storeConfig();
    if (cfg.hasError || cfg.isLoading) return 'markup';
    return cfg.config.pricingStrategy?.method || 'markup';
  });

  beautyForm: FormGroup = this.fb.group({
    productType: [ProductType.BEAUTY],
    provider: ['', Validators.required],
    linkProductProvider: [''],
    model: ['', Validators.required], // Nombre del perfume / producto
    brand: ['', Validators.required],
    category: ['', Validators.required],
    subtitle: [''],
    price: [0, [Validators.required, Validators.min(1)]],
    additionalCosts: this.fb.array<FormGroup>([]),
    discountPercentageTransfer: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
    useCustomProfit: [false],
    pricingMethodChoice: [{ value: null, disabled: true }],
    customProfitMargin: [{ value: 0, disabled: true }, [Validators.required, Validators.min(0)]],
    status: ['published'],
    isFeatured: [false],
    shortDescription: [''],
    largeDescription: [''],

    // Specs de Belleza & Perfumería
    concentration: ['Eau de Parfum (EDP)', Validators.required],
    fragranceFamily: ['Amaderada'],
    gender: ['Unisex'],
    volume: ['100ml'],
    applicationArea: ['Cuello y Muñecas (Puntos de pulso)'],

    // Notas Olfativas (Pirámide)
    scentNotes: this.fb.group({
      top: [''],
      heart: [''],
      base: [''],
    }),

    images: this.fb.array<{ link: string; file: File | null }>([], [Validators.minLength(1)]),
    features: this.fb.array<string>([]),

    // Presentaciones (30ml, 50ml, 100ml, etc.)
    presentations: this.fb.array<FormGroup>([]),

    seo: this.fb.group({
      metaTitle: [''],
      metaDescription: [''],
      metaImage: [null as string | File | null],
    }),
  });

  private formValueWatcher = toSignal(this.beautyForm.valueChanges, {
    initialValue: this.beautyForm.getRawValue(),
  });

  transferDiscountPercent = computed(() => {
    this.formValueWatcher();
    return this.beautyForm.get('discountPercentageTransfer')?.value ?? 0;
  });

  transferPrice = computed(() => {
    const lp = this.calculatedListPrice();
    if (!lp) return 0;
    const discount = this.transferDiscountPercent();
    return Math.round(lp.listPrice * (1 - discount / 100));
  });

  get imagesControls() { return this.beautyForm.get('images') as FormArray; }
  get featuresControls() { return this.beautyForm.get('features') as FormArray; }
  get presentationsControls() { return this.beautyForm.get('presentations') as FormArray; }
  get additionalCostsControls() { return this.beautyForm.get('additionalCosts') as FormArray; }
  originalImages = computed(() => this.originalProduct()?.images || []);

  constructor() {
    this.sidebarService.navbarTitle.set({ title: 'Perfumería & Belleza' });

    // Cálculo dinámico de precio de lista
    this.beautyForm.valueChanges
      .pipe(
        takeUntilDestroyed(),
        debounceTime(600),
        map(() => {
          const raw = this.beautyForm.getRawValue();
          const effectiveMethod = raw.pricingMethodChoice === null || !raw.useCustomProfit
            ? this.globalPricingMethod()
            : raw.pricingMethodChoice;
          const effectiveMargin = raw.useCustomProfit
            ? raw.customProfitMargin
            : (this.storeConfig()?.config?.profit ?? 0);
          return {
            providerCost: raw.price,
            additionalCosts: raw.additionalCosts ?? [],
            useCustomProfit: raw.useCustomProfit,
            customProfitMargin: effectiveMargin,
            pricingMethodChoice: effectiveMethod,
            calculate: true,
          };
        }),
        distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)),
        filter((val) => val.providerCost > 0 && val.customProfitMargin > 0),
        switchMap((val) => {
          this.isCalculatingListPrice.set(true);
          return this.productState.calculateListPrice(val).pipe(
            map((result) => ({ result, error: false as const })),
            catchError((err) => {
              this.isCalculatingListPrice.set(false);
              this.debug.error('Error calculando lista belleza', err);
              return EMPTY;
            }),
          );
        }),
      )
      .subscribe({
        next: ({ result }) => {
          this.calculatedListPrice.set(result);
          this.isCalculatingListPrice.set(false);
        },
      });

    this.beautyForm.get('useCustomProfit')?.valueChanges.pipe(takeUntilDestroyed()).subscribe((useCustom) => {
      if (useCustom) {
        this.beautyForm.get('customProfitMargin')?.enable();
        this.beautyForm.get('pricingMethodChoice')?.enable();
        this.isUsingGlobalMargin.set(false);
      } else {
        this.beautyForm.get('customProfitMargin')?.disable();
        this.beautyForm.get('pricingMethodChoice')?.disable();
        this.isUsingGlobalMargin.set(true);
      }
    });

    combineLatest([toObservable(this.productID), toObservable(this.storeConfig)])
      .pipe(
        takeUntilDestroyed(),
        filter(([_, config]) => !config.isLoading && config.hasData),
        distinctUntilChanged((prev, curr) => prev[0] === curr[0] && prev[1].config.profit === curr[1].config.profit),
      )
      .subscribe(async ([id, config]) => {
        const profit = config.config.profit;
        if (id) {
          await this.loadProduct(id);
        } else {
          this.initCreateMode(profit);
        }
      });
  }

  ngOnInit(): void {}

  private initCreateMode(defaultProfit: number) {
    this.isUsingGlobalMargin.set(true);
    this.beautyForm.patchValue({
      productType: ProductType.BEAUTY,
      useCustomProfit: false,
      customProfitMargin: defaultProfit,
      pricingMethodChoice: null,
    });
    this.beautyForm.get('customProfitMargin')?.disable();
    this.beautyForm.get('pricingMethodChoice')?.disable();

    if (this.presentationsControls.length === 0) {
      this.addPresentation('100ml', 10);
    }
    this.isFormReady.set(true);
  }

  private async loadProduct(id: string) {
    try {
      this.isLoading.set(true);
      const product = await this.productState.getProduct(id);
      this.originalProduct.set(structuredClone(product));

      this.beautyForm.patchValue({
        productType: ProductType.BEAUTY,
        provider: product.provider?._id || product.provider || '',
        linkProductProvider: product.linkProductProvider || '',
        model: product.model || '',
        brand: product.brand || '',
        category: product.category || '',
        subtitle: product.subtitle || '',
        price: product.price?.card_ticket1PayPrice || product.price?.listPrice || 0,
        discountPercentageTransfer: product.price?.discountPercentageTransfer || 0,
        status: product.status || 'published',
        isFeatured: product.isFeatured || false,
        shortDescription: product.shortDescription || '',
        largeDescription: product.largeDescription || '',
        concentration: product.concentration || 'Eau de Parfum (EDP)',
        fragranceFamily: product.fragranceFamily || 'Amaderada',
        gender: typeof product.gender === 'string' ? product.gender : 'Unisex',
        volume: product.volume || '100ml',
        applicationArea: product.applicationArea || 'Cuello y Muñecas (Puntos de pulso)',
        scentNotes: product.scentNotes || { top: '', heart: '', base: '' },
      });

      this.presentationsControls.clear();
      (product.variants || []).forEach((v: any) => {
        const sizeOrVolume = (v as any).volume || (v as any).size || '100ml';
        this.addPresentation(sizeOrVolume, v.stock || 0, v.sku, v.barcode);
      });

      if (this.presentationsControls.length === 0) {
        this.addPresentation('100ml', 10);
      }

      this.isFormReady.set(true);
    } catch (err) {
      this.debug.error('Error cargando producto de belleza', err);
    } finally {
      this.isLoading.set(false);
    }
  }

  addPresentation(
    volume: string = '100ml',
    stock: number = 10,
    sku: string = '',
    barcode: string = '',
    name: string = 'Vaporizador',
    price: number | null = null,
  ) {
    this.presentationsControls.push(
      this.fb.group({
        volume: [volume, Validators.required],
        name: [name],
        stock: [stock, [Validators.required, Validators.min(0)]],
        sku: [sku],
        barcode: [barcode],
        price: [price],
        isActive: [true],
      }),
    );
  }

  removePresentation(index: number) {
    if (this.presentationsControls.length > 1) {
      this.presentationsControls.removeAt(index);
    }
  }

  private parseVariants(): any[] {
    const raw = this.presentationsControls.getRawValue();
    const model = this.beautyForm.get('model')?.value || 'BEAUTY';
    const clean = model.replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase();

    return raw.map((p: any, idx: number) => {
      const sku = p.sku || `${clean}-${p.volume.replace(/[^a-zA-Z0-9]/g, '')}-${Date.now().toString().slice(-4)}${idx}`;
      return {
        sku,
        stock: Number(p.stock || 0),
        barcode: p.barcode || '',
        volume: p.volume,
        isActive: p.isActive !== false,
        imageReference: { url: '', public_id: '' },
      };
    });
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
        } else {
          this.commerceConfigState.saveConfig({ categories: [...this.categories(), result] });
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

  onImageDeleted(publicId: string) {
    this.deletedImages.update((prev) => [...prev, publicId]);
  }

  async saveProduct() {
    if (this.beautyForm.invalid) {
      this.beautyForm.markAllAsTouched();
      return;
    }

    const raw = this.beautyForm.getRawValue();
    const formData = new FormData();

    formData.append('productType', ProductType.BEAUTY);
    formData.append('model', raw.model);
    formData.append('brand', raw.brand);
    formData.append('category', raw.category);
    if (raw.subtitle) formData.append('subtitle', raw.subtitle);
    if (raw.provider) formData.append('provider', raw.provider);
    if (raw.linkProductProvider) formData.append('linkProductProvider', raw.linkProductProvider);
    formData.append('price', String(raw.price));
    formData.append('status', String(raw.status || 'published'));
    formData.append('isFeatured', String(raw.isFeatured || false));
    if (raw.shortDescription) formData.append('shortDescription', raw.shortDescription);
    if (raw.largeDescription) formData.append('largeDescription', raw.largeDescription);

    // Beauty specifics
    formData.append('concentration', raw.concentration);
    if (raw.fragranceFamily) formData.append('fragranceFamily', raw.fragranceFamily);
    if (raw.gender) formData.append('gender', raw.gender);
    if (raw.volume) formData.append('volume', raw.volume);
    if (raw.applicationArea) formData.append('applicationArea', raw.applicationArea);
    if (raw.scentNotes) formData.append('scentNotes', JSON.stringify(raw.scentNotes));

    // Pricing & Margins
    if (raw.useCustomProfit && raw.customProfitMargin !== null) {
      formData.append('customProfitMargin', String(raw.customProfitMargin));
      formData.append('customPricingMethod', raw.pricingMethodChoice || '');
    }
    if (raw.discountPercentageTransfer !== undefined && raw.discountPercentageTransfer !== null) {
      formData.append('discountPercentageTransfer', String(raw.discountPercentageTransfer));
    }

    formData.append('features', JSON.stringify(raw.features || []));
    formData.append('specifications', JSON.stringify([]));
    formData.append('variants', JSON.stringify(this.parseVariants()));

    (raw.images || []).forEach((img: any) => {
      if (img.file) formData.append('images', img.file);
    });

    this.isLoading.set(true);
    try {
      if (this.isEditMode() && this.productID()) {
        await this.productState.updateProduct(this.productID()!, formData);
        this.router.navigate(['/home/products', this.productID()]);
      } else {
        const id = await this.productState.createProduct(formData);
        this.router.navigate(['/home/products', id]);
      }
    } catch (err) {
      this.debug.error('Error guardando producto de belleza', err);
    } finally {
      this.isLoading.set(false);
    }
  }

  activeSection = signal<string>('info');

  hasChanges = computed(() => {
    this.formValueWatcher();
    if (!this.isFormReady()) return false;
    return this.beautyForm.dirty || this.deletedImages().length > 0;
  });

  invalidControls = computed(() => {
    this.formValueWatcher();
    const invalid: string[] = [];
    const controls = this.beautyForm.controls;
    const labels: Record<string, string> = {
      model: 'Nombre de la Fragancia',
      brand: 'Marca',
      category: 'Categoría',
      provider: 'Proveedor',
      concentration: 'Concentración',
      price: 'Precio Costo',
      shortDescription: 'Descripción Corta',
      largeDescription: 'Historia/Descripción',
    };
    for (const name in controls) {
      if (controls[name].invalid) {
        invalid.push(labels[name] || name);
      }
    }
    return invalid;
  });

  isSectionInvalid(sectionId: string): boolean {
    const c = this.beautyForm.controls;
    if (sectionId === 'info') {
      return !!(c['model']?.invalid || c['brand']?.invalid || c['category']?.invalid || c['provider']?.invalid || c['concentration']?.invalid);
    }
    if (sectionId === 'pricing') {
      return !!(c['price']?.invalid || c['discountPercentageTransfer']?.invalid || (c['useCustomProfit']?.value && c['customProfitMargin']?.invalid));
    }
    if (sectionId === 'variants') {
      return !!c['presentations']?.invalid;
    }
    if (sectionId === 'details') {
      return !!(c['shortDescription']?.invalid || c['largeDescription']?.invalid);
    }
    return false;
  }

  scrollToSection(id: string) {
    this.activeSection.set(id);
    const index = this.sections.findIndex((s) => s.id === id);
    if (index !== -1) {
      this.currentStep.set(index);
    }
    const element = document.getElementById('section-' + id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  getPresentationControl(pIdx: number, field: string): FormControl {
    const group = this.presentationsControls.at(pIdx) as FormGroup;
    if (!group) return new FormControl('');
    const ctrl = group.get(field);
    if (!ctrl) {
      const fallback = new FormControl('');
      group.addControl(field, fallback);
      return fallback;
    }
    return ctrl as FormControl;
  }

  getCostControl(idx: number, field: string): FormControl {
    const group = this.additionalCostsControls.at(idx) as FormGroup;
    if (!group) return new FormControl('');
    const ctrl = group.get(field);
    if (!ctrl) {
      const fallback = new FormControl('');
      group.addControl(field, fallback);
      return fallback;
    }
    return ctrl as FormControl;
  }

  addAdditionalCost() {
    this.additionalCostsControls.push(
      this.fb.group({
        concept: ['', Validators.required],
        amount: [0, [Validators.required, Validators.min(0)]],
      }),
    );
  }

  removeAdditionalCost(index: number) {
    this.additionalCostsControls.removeAt(index);
  }

  openAddBrandDialog() {
    this.addBrandCategory('brand');
  }

  openAddCategoryDialog() {
    this.addBrandCategory('category');
  }

  openAddProviderDialog() {
    this.addProvider();
  }

  setStep(idx: number) {
    if (idx >= 0 && idx < this.sections.length) {
      this.currentStep.set(idx);
      this.scrollToSection(this.sections[idx].id);
    }
  }
}
