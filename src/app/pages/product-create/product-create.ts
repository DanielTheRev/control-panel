import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  inject,
  input,
  linkedSignal,
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
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatIcon } from '@angular/material/icon';
import { MatSnackBarModule } from '@angular/material/snack-bar';
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
  of,
} from 'rxjs';
import {
  IProduct,
  IProductFinance,
  IProductPrices,
  isClothingVariant,
  isTechVariant,
  ProductType,
} from '../../interfaces/product.interface';
import { SidebarService } from '../../services/sidebar.service';
import {
  ClothingFormValue,
  ClothingProductForm,
} from '../../shared/components/clothing-product-form/clothing-product-form';
import { ImageUploadComponent } from '../../shared/components/image-upload/image-upload.component';
import { KeyValueListComponent } from '../../shared/components/key-value-list/key-value-list.component';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { PageLayout } from '../../shared/components/page-layout/page-layout';
// import { PricePreview } from '../../shared/components/price-preview/price-preview';
import { TagInputComponent } from '../../shared/components/tag-input/tag-input.component';
import {
  TechFormValue,
  TechProductForm,
} from '../../shared/components/tech-product-form/tech-product-form';
import { ProductStoreService } from '../../states/product.state.service';
import { StoreConfigStateService } from '../../states/store.config.state.service';
import { ProductFormUtils } from '../../utils/product-form.utils';
import { SingleImageUpload } from '../../shared/components/single-image-upload/single-image-upload';
import { MatDialog } from '@angular/material/dialog';
import { AddBrandCategory } from '../../share/components/add-brand-category/add-brand-category';
import { ProviderStateService } from '../../states/provider.state.service';
import { ProviderCreate } from '../provider-create/provider-create';
import { IFinanceCost } from '../../interfaces/finance.interface';

interface SizeGuideState {
  enabled: boolean;
  headers: string[];
  rows: { size: string; values: string[] }[];
  tolerance: string;
}

@Component({
  selector: 'app-product-create',
  imports: [
    ReactiveFormsModule,
    CommonModule,
    PageLayout,
    PageHeader,
    QuillModule,
    MatSnackBarModule,
    // PricePreview,
    TagInputComponent,
    KeyValueListComponent,
    ImageUploadComponent,
    MatIcon,
    RouterLink,
    TechProductForm,
    ClothingProductForm,
    SingleImageUpload,
  ],
  templateUrl: './product-create.html',
  styleUrl: './product-create.css',
})
export class ProductCreate {
  #SidebarService = inject(SidebarService);
  #fb = inject(FormBuilder);
  #productState = inject(ProductStoreService);
  #router = inject(Router);
  #CommerceConfigState = inject(StoreConfigStateService);
  #dialog = inject(MatDialog);
  #ProviderState = inject(ProviderStateService);

  #storeConfig = this.#CommerceConfigState.StoreConfig;
  isFormReady = signal<boolean>(false);
  #deletedImages = signal<string[]>([]);
  seoImagePreview = signal<string | null>(null);

  brands = computed(() => {
    if (this.#CommerceConfigState.StoreConfig().hasError) return [];
    if (this.#CommerceConfigState.StoreConfig().isLoading) return [];
    if (this.#CommerceConfigState.StoreConfig().hasError) return [];
    return this.#CommerceConfigState.StoreConfig().config.brands;
  });
  categories = computed(() => {
    if (this.#CommerceConfigState.StoreConfig().hasError) return [];
    if (this.#CommerceConfigState.StoreConfig().isLoading) return [];
    if (this.#CommerceConfigState.StoreConfig().hasError) return [];
    return this.#CommerceConfigState.StoreConfig().config.categories;
  });

  costCurrency = computed(() => {
    if (
      this.#CommerceConfigState.StoreConfig().hasError ||
      this.#CommerceConfigState.StoreConfig().isLoading
    )
      return 'USD';
    return this.#CommerceConfigState.StoreConfig().config.costCurrency || 'USD';
  });

  globalPricingMethod = computed(() => {
    if (
      this.#CommerceConfigState.StoreConfig().hasError ||
      this.#CommerceConfigState.StoreConfig().isLoading
    )
      return 'markup';
    return (
      this.#CommerceConfigState.StoreConfig().config.pricingStrategy?.method ||
      'markup'
    );
  });

  isAbsorbedPaymentsEnabled = computed(() => {
    if (
      this.#CommerceConfigState.StoreConfig().hasError ||
      this.#CommerceConfigState.StoreConfig().isLoading
    )
      return false;
    return (
      this.#CommerceConfigState.StoreConfig().config.pricingStrategy
        ?.absorbInstallments || false
    );
  });

  providers = this.#ProviderState.ProviderState;

  productForm: FormGroup = this.#fb.group({
    productType: ['', Validators.required],
    provider: ['', Validators.required],
    model: ['', Validators.required],
    brand: ['', Validators.required],
    category: ['', Validators.required],
    price: [0, [Validators.required, Validators.min(1)]],
    additionalCosts: this.#fb.array<FormGroup>([]),
    discountPercentageTransfer: [
      0,
      [Validators.required, Validators.min(0), Validators.max(100)],
    ],
    useCustomProfit: [false],
    pricingMethodChoice: [{ value: null, disabled: true }],
    customProfitMargin: [
      { value: 0, disabled: true },
      [Validators.required, Validators.min(0)],
    ],
    isActive: [true],
    isFeatured: [false],
    shortDescription: ['', Validators.required],
    largeDescription: ['', Validators.required],
    images: this.#fb.array<{ link: string; file: File | null }>(
      [],
      [Validators.required, Validators.minLength(1)],
    ),
    features: this.#fb.array<string>([]),
    specifications: this.#fb.array<FormGroup>([]),
    // Color Groups
    colorGroups: this.#fb.array<FormGroup>([]),
    seo: this.#fb.group({
      metaTitle: [''],
      metaDescription: [''],
      metaImage: [null as string | File | null],
    }),
  });
  readonly #formStatus = toSignal(this.productForm.statusChanges, {
    initialValue: 'INVALID',
  });
  readonly #formTrigger = toSignal(this.productForm.valueChanges);
  readonly #formValueWatcher = toSignal(this.productForm.valueChanges, {
    initialValue: this.productForm.getRawValue(),
  });

  readonly formCategory = toSignal<string>(
    this.productForm.get('category')!.valueChanges,
    { initialValue: this.productForm.get('category')?.value || '' },
  );

  #getFullProductData() {
    const currentFormValue = this.productForm.getRawValue();
    let typeSpecific = this.#typeSpecificValues();

    // Si no tocaron el form hijo, usamos los valores iniciales
    if (!typeSpecific) {
      typeSpecific =
        this.selectedType() === ProductType.TECH
          ? this.techInitialValue()
          : this.clothingInitialValue();
    }

    const sizeGuide = this.sizeGuideState();
    const sizeGuideData = sizeGuide.enabled
      ? {
          headers: sizeGuide.headers,
          rows: sizeGuide.rows,
          tolerance: sizeGuide.tolerance,
        }
      : null;

    return {
      ...currentFormValue,
      variants: this.#parseVariants(),
      sizeGuide: sizeGuideData,
      ...(typeSpecific || {}), // Esparcimos la ram, gender, etc.
    };
  }

  hasChanges = computed(() => {
    this.#formStatus();
    this.#formTrigger();
    this.#formValueWatcher();
    if (!this.isFormReady()) return false;

    // ✅ Leemos la verdad absoluta y síncrona del form:
    const currentFormValue = this.productForm.getRawValue();

    const deleted = this.#deletedImages();
    let typeSpecific = this.#typeSpecificValues();
    if (!typeSpecific) {
      typeSpecific =
        this.selectedType() === ProductType.TECH
          ? this.techInitialValue()
          : this.clothingInitialValue();
    }

    if (this.isEditMode() && this.originalProduct()) {
      const fullProductData = this.#getFullProductData();
      const changes = ProductFormUtils.hasChanges(
        fullProductData,
        this.originalProduct(),
        deleted,
      );
      return changes.hasChanges;
    }

    return this.productForm.dirty || deleted.length > 0;
  });

  // Route inputs
  productID = input.required<string>();
  /** Provided when creating (from type-selector route), e.g. 'TechProduct' | 'ClothingProduct' */
  typeParam = input<string>('');
  /** Expose Math to template for Math.ceil() etc. */
  protected readonly Math = Math;

  isEditMode = computed(() => this.productID() !== null);
  calculatedPrices = signal<{
    price: IProductPrices;
    finance: IProductFinance;
  } | null>(null);
  calculatedListPrice = signal<IFinanceCost | null>(null);
  isCalculatingListPrice = signal<boolean>(false);

  /** Reads the current discount percentage from the form (reactive via formValueWatcher) */
  transferDiscountPercent = computed(() => {
    this.#formValueWatcher(); // trigger reactivity on form changes
    return this.productForm.get('discountPercentageTransfer')?.value ?? 0;
  });

  /** The transfer/cash price after applying the discount to the list price */
  transferPrice = computed(() => {
    const lp = this.calculatedListPrice();
    if (!lp) return 0;
    const discount = this.transferDiscountPercent();
    return Math.round(lp.listPrice * (1 - discount / 100));
  });

  /** How much of the discount is "free" — funded by savings from not using the payment gateway */
  discountFromPasarela = computed(() => {
    const lp = this.calculatedListPrice();
    if (!lp) return 0;
    const discount = this.transferDiscountPercent();
    return Math.min(discount, lp.maxSafeDiscount);
  });

  /** How much of the discount eats into the seller's profit margin */
  discountFromMargin = computed(() => {
    const lp = this.calculatedListPrice();
    if (!lp) return 0;
    const discount = this.transferDiscountPercent();
    return Math.max(0, discount - lp.maxSafeDiscount);
  });

  /** Remaining margin % available for promotions (first purchase, registration, etc.) */
  remainingMarginForPromos = computed(() => {
    const lp = this.calculatedListPrice();
    if (!lp) return 0;
    const discount = this.transferDiscountPercent();
    return Math.max(0, lp.maxSafeDiscount - discount);
  });

  originalProduct = signal<IProduct | null>(null);
  originalImages = computed(() => this.originalProduct()?.images || []);
  isLoading = signal<boolean>(false);
  selectedType = linkedSignal(
    toSignal(this.productForm.get('productType')!.valueChanges),
  );

  isUsingGlobalMargin = signal<boolean>(false);
  tabs = signal([
    { label: 'Información Principal', active: true },
    { label: 'Precios', active: false },
    { label: 'Especificaciones principales', active: false },
    { label: 'Descripciones', active: false },
    { label: 'Imágenes', active: false },
    { label: 'Etiquetas(tags)', active: false },
    { label: 'Especificaciones técnicas', active: false },
    { label: 'Variantes', active: false },
    { label: 'SEO & Social', active: false },
    { label: 'Guía de Talles', active: false },
  ]);

  tabSelected = computed(() => this.tabs().find((tab) => tab.active)!.label);

  sizeGuideState = signal<SizeGuideState>({
    enabled: false,
    headers: ['Talle', 'Ancho (cm)', 'Largo (cm)'],
    rows: [{ size: 'S', values: ['48', '65'] }],
    tolerance: '',
  });

  isSizeGuideValid = computed(() => {
    const state = this.sizeGuideState();
    if (!state.enabled) return true;
    if (state.headers.length < 2) return false;
    if (state.headers.some((h) => !h.trim())) return false;
    if (state.rows.length < 1) return false;
    for (const row of state.rows) {
      if (!row.size.trim()) return false;
      if (row.values.length !== state.headers.length - 1) return false;
      if (row.values.some((v) => !v.trim())) return false;
    }
    return true;
  });

  toggleSizeGuide(e: Event) {
    const enabled = (e.target as HTMLInputElement).checked;
    this.sizeGuideState.update((s) => ({ ...s, enabled }));
  }

  addSizeGuideColumn() {
    this.sizeGuideState.update((s) => ({
      ...s,
      headers: [...s.headers, 'Nueva Medida'],
      rows: s.rows.map((r) => ({ ...r, values: [...r.values, ''] })),
    }));
  }

  removeSizeGuideColumn(index: number) {
    this.sizeGuideState.update((s) => {
      if (s.headers.length <= 2) return s; // Minimum 2 columns
      return {
        ...s,
        headers: s.headers.filter((_, i) => i !== index),
        rows: s.rows.map((r) => ({
          ...r,
          values: r.values.filter((_, i) => i !== index - 1),
        })),
      };
    });
  }

  addSizeGuideRow() {
    this.sizeGuideState.update((s) => ({
      ...s,
      rows: [
        ...s.rows,
        { size: '', values: new Array(s.headers.length - 1).fill('') },
      ],
    }));
  }

  removeSizeGuideRow(index: number) {
    this.sizeGuideState.update((s) => ({
      ...s,
      rows: s.rows.filter((_, i) => i !== index),
    }));
  }

  updateSizeGuideHeader(index: number, e: Event) {
    const value = (e.target as HTMLInputElement).value;
    this.sizeGuideState.update((s) => {
      const newHeaders = [...s.headers];
      newHeaders[index] = value;
      return { ...s, headers: newHeaders };
    });
  }

  updateSizeGuideRowSize(rowIndex: number, e: Event) {
    const value = (e.target as HTMLInputElement).value;
    this.sizeGuideState.update((s) => {
      const newRows = [...s.rows];
      newRows[rowIndex] = { ...newRows[rowIndex], size: value };
      return { ...s, rows: newRows };
    });
  }

  updateSizeGuideRowValue(rowIndex: number, colIndex: number, e: Event) {
    const value = (e.target as HTMLInputElement).value;
    this.sizeGuideState.update((s) => {
      const newRows = [...s.rows];
      const newValues = [...newRows[rowIndex].values];
      newValues[colIndex] = value;
      newRows[rowIndex] = { ...newRows[rowIndex], values: newValues };
      return { ...s, rows: newRows };
    });
  }

  updateSizeGuideTolerance(e: Event) {
    const value = (e.target as HTMLTextAreaElement).value;
    this.sizeGuideState.update((s) => ({ ...s, tolerance: value }));
  }

  setActiveTab(label: string) {
    this.tabs.update((tabs) =>
      tabs.map((tab) => ({
        ...tab,
        active: tab.label === label,
      })),
    );
  }

  /** Values from the active child form (tech or clothing) */
  #typeSpecificValues = signal<TechFormValue | ClothingFormValue | null>(null);

  /** Pre-load value passed down to child form in edit mode */
  techInitialValue = signal<TechFormValue | null>(null);
  clothingInitialValue = signal<ClothingFormValue | null>(null);

  ProductType = ProductType;

  // Getters for FormArrays
  get imagesControls() {
    return this.productForm.get('images') as FormArray;
  }
  get featuresControls() {
    return this.productForm.get('features') as FormArray;
  }
  get specificationsControls() {
    return this.productForm.get('specifications') as FormArray;
  }
  get colorGroupsControls() {
    return this.productForm.get('colorGroups') as FormArray;
  }
  get seoImageControl() {
    return this.productForm.get('seo.metaImage') as FormControl<
      string | File | null
    >;
  }
  get additionalCostsControls() {
    return this.productForm.get('additionalCosts') as FormArray;
  }

  addAdditionalCost(
    concept: string = '',
    value: number = 0,
    type: 'fixed' | 'percent_over_provider' = 'fixed',
  ) {
    this.additionalCostsControls.push(
      this.#fb.group({
        concept: [concept, Validators.required],
        value: [value, [Validators.required, Validators.min(0)]],
        type: [type, Validators.required],
      }),
    );
  }

  removeAdditionalCost(index: number) {
    this.additionalCostsControls.removeAt(index);
  }

  get invalidControls(): string[] {
    const translations: Record<string, string> = {
      productType: 'Tipo',
      model: 'Modelo',
      brand: 'Marca',
      category: 'Categoría',
      price: 'Precio de costo',
      shortDescription: 'Desc. Corta',
      largeDescription: 'Desc. Larga',
      images: 'Imágenes',
      features: 'Características',
      specifications: 'Especificaciones',
      colorGroups: 'Variantes',
      provider: 'Proveedor / Vendedor',
      discountPercentageTransfer: 'Descuento Transf.',
      additionalCosts: 'Costos Adicionales',
      customProfitMargin: 'Margen Personalizado',
    };

    const invalid: string[] = [];
    const controls = this.productForm.controls;
    for (const name in controls) {
      if (controls[name].invalid) {
        invalid.push(translations[name] || name);
      }
    }
    if (!this.isSizeGuideValid()) {
      invalid.push('Guía de Talles');
    }
    return invalid;
  }

  constructor() {
    // Listen to price and margin changes for calculating visual prices via the backend
    // We use getRawValue() to include disabled controls (customProfitMargin, pricingMethodChoice)
    this.productForm.valueChanges
      .pipe(
        takeUntilDestroyed(),
        debounceTime(800),
        map(() => {
          const raw = this.productForm.getRawValue();
          // Resolve the effective pricing method: null => actual global method
          const effectiveMethod: 'markup' | 'margin' =
            raw.pricingMethodChoice === null || !raw.useCustomProfit
              ? this.globalPricingMethod()
              : raw.pricingMethodChoice;
          // Resolve the effective profit margin: use global when not customized
          const effectiveMargin: number = raw.useCustomProfit
            ? raw.customProfitMargin
            : (this.#storeConfig()?.config?.profit ?? 0);
          return {
            providerCost: raw.price,
            additionalCosts: raw.additionalCosts ?? [],
            useCustomProfit: raw.useCustomProfit,
            customProfitMargin: effectiveMargin,
            pricingMethodChoice: effectiveMethod,
            calculate: true,
          };
        }),
        distinctUntilChanged(
          (prev, curr) =>
            prev.providerCost === curr.providerCost &&
            JSON.stringify(prev.additionalCosts) ===
              JSON.stringify(curr.additionalCosts) &&
            prev.useCustomProfit === curr.useCustomProfit &&
            prev.customProfitMargin === curr.customProfitMargin &&
            prev.pricingMethodChoice === curr.pricingMethodChoice,
        ),
        // Filtro de integridad: solo dispara si los datos esenciales están completos
        filter((val) => {
          return (
            val.providerCost !== undefined &&
            val.providerCost !== null &&
            val.providerCost > 0 &&
            val.customProfitMargin !== undefined &&
            val.customProfitMargin !== null &&
            val.customProfitMargin > 0 &&
            (val.pricingMethodChoice === 'margin' ||
              val.pricingMethodChoice === 'markup')
          );
        }),
        switchMap((val) => {
          this.isCalculatingListPrice.set(true);
          return this.#productState.calculateListPrice(val).pipe(
            map((result) => ({ result, error: false as const })),
            catchError((err) => {
              this.isCalculatingListPrice.set(false);
              console.error('Error calculating list price', err);
              return EMPTY; // Keep the stream alive for future emissions
            }),
          );
        }),
      )
      .subscribe({
        next: ({ result }) => {
          this.calculatedListPrice.set(result);
          this.isCalculatingListPrice.set(false);
          console.log('✅ Precio de lista calculado:', result);
        },
      });

    // Toggle customProfitMargin and pricingMethodChoice enabled/disabled based on useCustomProfit checkbox
    this.productForm
      .get('useCustomProfit')
      ?.valueChanges.pipe(takeUntilDestroyed())
      .subscribe((useCustom: boolean) => {
        if (useCustom) {
          this.productForm.get('customProfitMargin')?.enable();
          this.productForm.get('pricingMethodChoice')?.enable();
          this.isUsingGlobalMargin.set(false);
        } else {
          this.productForm.get('customProfitMargin')?.disable();
          this.productForm.get('pricingMethodChoice')?.disable();
          this.isUsingGlobalMargin.set(true);
        }
      });

    this.#SidebarService.navbarTitle.set({
      title: 'Gestionar producto',
    });

    combineLatest([
      toObservable(this.productID),
      toObservable(this.#storeConfig),
    ])
      .pipe(
        takeUntilDestroyed(), // Se limpia solo al destruir el componente
        // Filtramos: Solo pasamos si la config no está cargando y tiene data
        filter(([id, config]) => !config.isLoading && config.hasData),
        // Evitamos llamadas innecesarias si el ID y el Profit no cambiaron
        distinctUntilChanged(
          (prev, curr) =>
            prev[0] === curr[0] &&
            prev[1].config.profit === curr[1].config.profit,
        ),
      )
      .subscribe(async ([id, config]) => {
        const profit = config.config.profit;

        if (id) {
          // MODO EDICIÓN
          await this.#loadProduct(id, profit);
        } else {
          // MODO CREACIÓN
          this.#initCreateMode(profit);
        }
      });
  }

  #initCreateMode(profit: number) {
    const type = this.typeParam();
    if (type) {
      this.selectedType.set(type);
      this.productForm.patchValue({ productType: type });
    }

    this.isUsingGlobalMargin.set(true);
    this.productForm.patchValue({
      useCustomProfit: false,
      customProfitMargin: profit,
      pricingMethodChoice: null,
    });
    this.productForm.get('customProfitMargin')?.disable();
    this.productForm.get('pricingMethodChoice')?.disable();
    this.isFormReady.set(true);
  }

  async #loadProduct(id: string, defaultProfit: number) {
    try {
      const product = await this.#productState.getProduct(id);
      console.log(product);
      const hasCustomMargin =
        product.finance?.pricingStrategy?.targetProfit !== undefined &&
        product.finance?.pricingStrategy?.targetProfit !== null;

      // ⚠️ Clonamos ANTES de mutar, así originalProduct refleja el estado real de la DB
      this.originalProduct.set(structuredClone(product));

      const type = product.productType;
      this.selectedType.set(type);

      // Patch child form values for edit mode
      if (type === ProductType.TECH) {
        this.techInitialValue.set({
          ram: product.ram || '',
          processor: product.processor || '',
          screenSize: product.screenSize || '',
          os: product.os || '',
          storage: product.storage || [],
        });
      } else if (type === ProductType.CLOTHING) {
        this.clothingInitialValue.set({
          gender: product.gender || '',
          fit: product.fit || '',
          material: product.material || '',
          sizeType: product.sizeType || '',
          season: product.season || '',
        });
      }

      if (product.sizeGuide) {
        this.sizeGuideState.set({
          enabled: true,
          headers: product.sizeGuide.headers || ['Talle', 'Medida'],
          rows: product.sizeGuide.rows || [{ size: '', values: [''] }],
          tolerance: product.sizeGuide.tolerance || '',
        });
      } else {
        this.sizeGuideState.set({
          enabled: false,
          headers: ['Talle', 'Ancho (cm)', 'Largo (cm)'],
          rows: [{ size: 'S', values: ['48', '65'] }],
          tolerance: '',
        });
      }

      const pricingMethodChoiceVal = product.finance?.pricingStrategy?.method || null;

      this.productForm.patchValue({
        productType: type,
        provider: product.provider ? product.provider._id : '',
        model: product.model,
        brand: product.brand,
        category: product.category,
        price: Math.ceil(
          this.costCurrency() === 'ARS'
            ? (product.finance?.providerCost?.inARS ?? 0)
            : (product.finance?.providerCost?.inUSD ?? 0),
        ),
        discountPercentageTransfer:
          product.price?.discountPercentageTransfer ?? 0,
        useCustomProfit: hasCustomMargin,
        customProfitMargin: hasCustomMargin
          ? product.finance?.pricingStrategy?.targetProfit
          : defaultProfit,
        pricingMethodChoice: pricingMethodChoiceVal,
        isActive: product.isActive !== false,
        isFeatured: !!product.isFeatured,
        shortDescription: product.shortDescription,
        largeDescription: product.largeDescription,
        seo: {
          ...product.seo,
          metaImage:
            product.seo && product.seo.metaImage
              ? product.seo.metaImage.url
              : '',
        },
      });

      this.seoImagePreview.set(
        product.seo && product.seo.metaImage ? product.seo.metaImage.url : '',
      );

      // Patch additionalCosts FormArray
      const additionalCostsArray = this.productForm.get(
        'additionalCosts',
      ) as FormArray;
      additionalCostsArray.clear();
      if (
        product.finance?.additionalCosts &&
        Array.isArray(product.finance.additionalCosts)
      ) {
        product.finance.additionalCosts.forEach((cost: any) => {
          additionalCostsArray.push(
            this.#fb.group({
              concept: [cost.concept, Validators.required],
              value: [cost.value, [Validators.required, Validators.min(0)]],
              type: [cost.type, Validators.required],
            }),
          );
        });
      }

      // Enable/disable margin field based on whether the product had a custom margin
      if (hasCustomMargin) {
        this.productForm.get('customProfitMargin')?.enable();
        this.productForm.get('pricingMethodChoice')?.enable();
        this.isUsingGlobalMargin.set(false);
      } else {
        this.productForm.get('customProfitMargin')?.disable();
        this.productForm.get('pricingMethodChoice')?.disable();
        this.isUsingGlobalMargin.set(true);
      }

      if (product.price) {
        this.calculatedPrices.set({
          price: product.price,
          finance: product.finance || ({} as any),
        });
      }

      // Patch Arrays
      this.#patchArray(this.featuresControls, product.features);

      // Patch Specifications
      if (product.specifications && Array.isArray(product.specifications)) {
        this.specificationsControls.clear();
        product.specifications.forEach((s: any) => {
          this.specificationsControls.push(
            this.#fb.group({
              key: [s.key, Validators.required],
              value: [s.value, Validators.required],
            }),
          );
        });
      }

      // Patch Variants (Color Groups)
      if (product.variants && Array.isArray(product.variants)) {
        this.colorGroupsControls.clear();

        // Agrupamos por color
        const groupedVariants = new Map<string, any[]>();
        product.variants.forEach((v) => {
          const key = v.color?.name || '';
          if (!groupedVariants.has(key)) groupedVariants.set(key, []);
          groupedVariants.get(key)!.push(v);
        });

        groupedVariants.forEach((variants, colorName) => {
          const firstV = variants[0];
          let imgIdx = null;
          if (firstV.imageReference?.url) {
            imgIdx = product.images.findIndex(
              (img: any) => (img.url || img) === firstV.imageReference.url,
            );
          }

          const colorGroup = this.#fb.group({
            colorName: [colorName],
            colorHex: [firstV.color?.hex || '#000000'],
            imageIndex: [imgIdx !== -1 ? imgIdx : 0],
            variants: this.#fb.array([]),
          });

          const variantsArray = colorGroup.get('variants') as FormArray;

          variants.forEach((v) => {
            if (product.productType === ProductType.TECH && isTechVariant(v)) {
              variantsArray.push(
                this.#fb.group({
                  attributesJson: [
                    v.attributes.map((a) => `${a.key}:${a.value}`).join(', '),
                  ],
                  stock: [v.stock, [Validators.required, Validators.min(0)]],
                  isActive: [v.isActive],
                }),
              );
            } else if (
              product.productType === ProductType.CLOTHING &&
              isClothingVariant(v)
            ) {
              variantsArray.push(
                this.#fb.group({
                  size: [v.size, Validators.required],
                  stock: [v.stock, [Validators.required, Validators.min(0)]],
                  isActive: [v.isActive],
                }),
              );
            }
          });

          this.colorGroupsControls.push(colorGroup);
        });
      }

      // Patch images
      if (product.images && Array.isArray(product.images)) {
        this.imagesControls.clear();
        product.images.forEach((img: any) => {
          this.imagesControls.push(
            this.#fb.group({
              link: [img.url || img],
              file: [null],
            }),
          );
        });
      }

      this.isFormReady.set(true);
    } catch (error) {
      console.log(error);
    }
  }

  #patchArray(formArray: FormArray, data: any[]) {
    formArray.clear();
    if (data && Array.isArray(data)) {
      data.forEach((item) => formArray.push(this.#fb.control(item)));
    }
  }

  /** Called by child forms when their values change */
  onTypeSpecificFormChange(value: TechFormValue | ClothingFormValue) {
    this.#typeSpecificValues.set(value);
  }

  addBulkSpecifications(value: string) {
    if (!value.trim()) return;
    const pairs = value.split(',');
    pairs.forEach((pair) => {
      const indexOfColon = pair.indexOf(':');
      if (indexOfColon !== -1) {
        const key = pair.substring(0, indexOfColon).trim();
        const val = pair.substring(indexOfColon + 1).trim();
        if (key && val) {
          // Al pushear al FormArray, se dispara el valueChanges del form,
          // lo que actualiza formChanges() y recalcula hasChanges automáticamente.
          this.specificationsControls.push(
            this.#fb.group({
              key: [key, Validators.required],
              value: [val, Validators.required],
            }),
          );
        }
      }
    });
  }

  onImageDeleted(publicId: string) {
    this.#deletedImages.update((imgs) => [...imgs, publicId]);
    // Clamp color group imageIndex values since the images array shrank
    this.#clampColorGroupImageIndices();
  }

  /** Safely get the image link for a color group's selected image */
  getColorGroupImageLink(group: any): string {
    const images = this.imagesControls.value;
    if (!images || images.length === 0) return '';
    let idx = group.get('imageIndex')?.value ?? 0;
    if (idx >= images.length) {
      idx = images.length - 1;
    }
    if (idx < 0) idx = 0;
    return images[idx]?.link || '';
  }

  /** Clamp all color group imageIndex values to valid range after images change */
  #clampColorGroupImageIndices() {
    const maxIndex = this.imagesControls.length - 1;
    this.colorGroupsControls.controls.forEach((group: any) => {
      const imageIndexCtrl = group.get('imageIndex');
      if (imageIndexCtrl && imageIndexCtrl.value > maxIndex) {
        imageIndexCtrl.setValue(Math.max(0, maxIndex));
      }
    });
  }

  /** Called when any image (blob or existing) is added or removed from the images FormArray */
  onImagesChanged() {
    this.#clampColorGroupImageIndices();
  }

  /** Recibe la URL de preview desde SingleImageUpload y actualiza el signal local */
  onSeoImagePreviewChange(url: string | null) {
    this.seoImagePreview.set(url);
  }

  addColorGroup() {
    this.colorGroupsControls.push(
      this.#fb.group({
        colorName: [''],
        colorHex: ['#000000'],
        imageIndex: [0],
        variants: this.#fb.array([]),
      }),
    );
  }

  removeColorGroup(index: number) {
    this.colorGroupsControls.removeAt(index);
  }

  addVariantToGroup(groupIndex: number) {
    const group = this.colorGroupsControls.at(groupIndex) as FormGroup;
    const variantsArray = group.get('variants') as FormArray;

    if (this.selectedType() === ProductType.TECH) {
      variantsArray.push(
        this.#fb.group({
          attributesJson: [''],
          stock: [8, [Validators.required, Validators.min(1)]],
          isActive: [true],
        }),
      );
    } else {
      variantsArray.push(
        this.#fb.group({
          size: ['', Validators.required],
          stock: [8, [Validators.required, Validators.min(1)]],
          isActive: [true],
        }),
      );
    }
  }

  removeVariantFromGroup(groupIndex: number, variantIndex: number) {
    const group = this.colorGroupsControls.at(groupIndex) as FormGroup;
    const variantsArray = group.get('variants') as FormArray;
    variantsArray.removeAt(variantIndex);
  }

  getGroupVariants(groupIndex: number): FormArray {
    const group = this.colorGroupsControls.at(groupIndex) as FormGroup;
    return group.get('variants') as FormArray;
  }

  #parseVariants(): any[] {
    const currentType = this.selectedType();
    const flatVariants: any[] = [];

    this.colorGroupsControls.value.forEach((group: any) => {
      (group.variants || []).forEach((v: any) => {
        const variant: any = {
          stock: Number(v.stock),
          reservedStock: 0,
          isActive: v.isActive !== false,
          images: [],
          imageIndex:
            group.imageIndex !== null && group.imageIndex !== undefined
              ? group.imageIndex
              : 0,
        };

        if (currentType === ProductType.TECH) {
          variant.attributes = v.attributesJson
            ? v.attributesJson
                .split(',')
                .map((a: string) => {
                  const [key, value] = a.trim().split(':');
                  return { key: key?.trim() || '', value: value?.trim() || '' };
                })
                .filter((a: any) => a.key && a.value)
            : [];
        } else if (currentType === ProductType.CLOTHING) {
          variant.size = String(v.size).trim();
        }

        if (group.colorName) {
          variant.color = {
            name: group.colorName,
            hex: group.colorHex || '#000000',
          };
        }

        flatVariants.push(variant);
      });
    });

    return flatVariants;
  }

  #getEffectiveMargin(formValue: any): number | undefined {
    if (formValue.useCustomProfit1Pay) {
      return formValue.customProfit1Pay;
    }
    if (formValue.useCustomProfitInstallments) {
      return formValue.customProfitInstallments;
    }
    return undefined;
  }

  /* Add new brand or category */
  addBrandCategory(type: 'brand' | 'category') {
    const dialogRef = this.#dialog.open(AddBrandCategory, {
      width: '400px',
      data: {
        type,
        actuallyData: type === 'brand' ? this.brands() : this.categories(),
      },
    });

    dialogRef.afterClosed().subscribe((result: string) => {
      if (result) {
        if (type === 'brand') {
          this.#CommerceConfigState.saveConfig({
            brands: [...this.brands(), result],
          });
        } else {
          this.#CommerceConfigState.saveConfig({
            categories: [...this.categories(), result],
          });
        }
      }
    });
  }

  addProvider() {
    const dialogRef = this.#dialog.open(ProviderCreate, {
      minWidth: '60dvw',
      minHeight: '60dvh',
    });
  }

  async saveProduct() {
    if (this.productForm.invalid || !this.isSizeGuideValid()) {
      this.productForm.markAllAsTouched();
      return;
    }

    // 👇 Obtenemos el objeto COMPLETO, con form hijo y todo
    const fullProductData = this.#getFullProductData();
    const formData = new FormData();

    if (this.isEditMode() && this.originalProduct()) {
      // Le pasamos el fullProductData ya armado
      const changes = ProductFormUtils.hasChanges(
        fullProductData,
        this.originalProduct(),
        this.#deletedImages(),
      );

      if (!changes.hasChanges) return;

      this.isLoading.set(true);
      try {
        console.log('=== DATOS QUE SE VAN AL BACKEND (PATCH) ===');
        changes.formData.forEach((value, key) => console.log(`${key}:`, value));
        console.log(this.calculatedListPrice());
        await this.#productState.updateProduct(
          this.productID(),
          changes.formData,
        );
        this.#router.navigate(['/home/products', this.productID()]);
      } catch (error) {
        console.error('Error updating product', error);
      } finally {
        this.isLoading.set(false);
      }
    } else {
      // Create Mode
      this.isLoading.set(true);
      try {
        console.log(this.productForm.value);
        // Le pasamos el fullProductData a tu armador de POST
        this.#buildCreateFormData(formData, fullProductData);

        console.log('=== DATOS QUE SE VAN AL BACKEND (POST) ===');
        formData.forEach((value, key) => console.log(`${key}:`, value));

        const id = await this.#productState.createProduct(formData);
        this.#revokeBlobUrls();
        this.#router.navigate(['/home/products', id]);
      } catch (error) {
        console.error('Error creating product', error);
      } finally {
        this.isLoading.set(false);
      }
    }
  }

  #buildCreateFormData(formData: FormData, data: any) {
    formData.append('productType', data.productType);
    formData.append('provider', data.provider);
    formData.append('model', data.model);
    formData.append('brand', data.brand);
    formData.append('category', data.category);
    formData.append('price', data.price);

    // Only send customProfitMargin if the user opted in
    if (
      data.useCustomProfit &&
      data.customProfitMargin !== null &&
      data.customProfitMargin !== ''
    ) {
      formData.append('customProfitMargin', data.customProfitMargin.toString());
    }
    if (data.useCustomProfit && data.pricingMethodChoice !== null) {
      formData.append('customPricingMethod', data.pricingMethodChoice);
    } else if (data.useCustomProfit && data.pricingMethodChoice === null) {
      formData.append('customPricingMethod', '');
    }
    if (
      data.discountPercentageTransfer !== undefined &&
      data.discountPercentageTransfer !== null
    ) {
      formData.append(
        'discountPercentageTransfer',
        data.discountPercentageTransfer.toString(),
      );
    }
    if (data.additionalCosts) {
      formData.append('additionalCosts', JSON.stringify(data.additionalCosts));
    }

    formData.append('isActive', String(data.isActive));
    formData.append('isFeatured', String(data.isFeatured));

    formData.append('shortDescription', data.shortDescription);
    formData.append('largeDescription', data.largeDescription);

    formData.append('features', JSON.stringify(data.features));
    formData.append('specifications', JSON.stringify(data.specifications));
    formData.append('variants', JSON.stringify(this.#parseVariants()));

    // Append type-specific fields from child form
    if (this.#typeSpecificValues()) {
      if (data.productType === ProductType.TECH) {
        const techVals = this.#typeSpecificValues() as TechFormValue;
        if (techVals.storage?.length)
          formData.append('storage', JSON.stringify(techVals.storage));
        if (techVals.ram) formData.append('ram', techVals.ram);
        if (techVals.processor)
          formData.append('processor', techVals.processor);
        if (techVals.screenSize)
          formData.append('screenSize', techVals.screenSize);
        if (techVals.os) formData.append('os', techVals.os);
      }

      if (data.productType === ProductType.CLOTHING) {
        const clothingVals = this.#typeSpecificValues() as ClothingFormValue;
        if (clothingVals.gender) formData.append('gender', clothingVals.gender);
        if (clothingVals.fit) formData.append('fit', clothingVals.fit);
        if (clothingVals.material)
          formData.append('material', clothingVals.material);
        if (clothingVals.sizeType)
          formData.append('sizeType', clothingVals.sizeType);
        if (clothingVals.season) formData.append('season', clothingVals.season);
      }
    }

    data.images.forEach((img: any) => {
      if (img.file) formData.append('images', img.file);
    });
    if (data.seo) {
      const seoImageValue = this.seoImageControl.value;

      // Armamos el objeto tal cual lo espera el backend
      const seoData: any = {
        metaTitle: data.seo.metaTitle || '',
        metaDescription: data.seo.metaDescription || '',
      };
      // Si la imagen actual es una URL (ej: modo edición), la incluimos en el JSON
      if (
        typeof seoImageValue === 'string' &&
        seoImageValue.startsWith('http')
      ) {
        seoData.metaImage = { url: seoImageValue, public_id: '' };
      }
      // Enviamos el objeto SEO como un único string JSON
      formData.append('seo', JSON.stringify(seoData));
      // Si el valor es un archivo nuevo, lo mandamos en el campo 'seoImage' que definimos en Multer
      if (seoImageValue instanceof File) {
        formData.append('seoImage', seoImageValue);
      }
    }
  }

  #revokeBlobUrls() {
    this.imagesControls.value.forEach((img: any) => {
      if (img.link && img.link.startsWith('blob:')) {
        window.URL.revokeObjectURL(img.link);
      }
    });
  }
}
