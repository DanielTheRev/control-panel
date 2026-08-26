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
  FormsModule,
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
import { DebugService } from '../../services/debug.service';
import {
  ClothingFormValue,
  ClothingProductForm,
} from '../../shared/components/clothing-product-form/clothing-product-form';
import {
  BeautyFormValue,
  BeautyProductForm,
} from '../../shared/components/beauty-product-form/beauty-product-form';
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
    FormsModule,
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
    BeautyProductForm,
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
  #debug = inject(DebugService);

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
    linkProductProvider: [''],
    model: ['', Validators.required],
    subtitle: [''],
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
      if (this.selectedType() === ProductType.TECH) {
        typeSpecific = this.techInitialValue();
      } else if (this.selectedType() === ProductType.CLOTHING) {
        typeSpecific = this.clothingInitialValue();
      } else if (this.selectedType() === ProductType.BEAUTY) {
        typeSpecific = this.beautyInitialValue();
      } else {
        typeSpecific = {};
      }
    }

    const sizeGuide = this.sizeGuideState();
    const sizeGuideData = sizeGuide.enabled && this.selectedType() === ProductType.CLOTHING
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
      ...(typeSpecific || {}), // Esparcimos los campos específicos
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
      if (this.selectedType() === ProductType.TECH) {
        typeSpecific = this.techInitialValue();
      } else if (this.selectedType() === ProductType.CLOTHING) {
        typeSpecific = this.clothingInitialValue();
      } else if (this.selectedType() === ProductType.BEAUTY) {
        typeSpecific = this.beautyInitialValue();
      } else {
        typeSpecific = {};
      }
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

  roundCharmPrice(price: number): number {
    if (!price || price <= 0) return 0;
    const rounded100 = Math.round(price / 100) * 100;
    const remainder = rounded100 % 1000;

    if (remainder >= 700) {
      return Math.floor(rounded100 / 1000) * 1000 + 900;
    }
    if (remainder >= 300 && remainder <= 600) {
      return Math.floor(rounded100 / 1000) * 1000 + 500;
    }
    if (remainder < 300 && rounded100 >= 1000) {
      return Math.floor(rounded100 / 1000) * 1000;
    }
    return rounded100;
  }

  /** The transfer/cash price after applying the discount to the list price */
  transferPrice = computed(() => {
    const lp = this.calculatedListPrice();
    if (!lp) return 0;
    const discount = this.transferDiscountPercent();
    const rawTransfer = lp.listPrice * (1 - discount / 100);
    return this.roundCharmPrice(rawTransfer);
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

  /** Net profit in hand when paid via transfer */
  transferProfit = computed(() => {
    const lp = this.calculatedListPrice();
    if (!lp || !lp.breakdown || lp.breakdown.length < 2) return 0;
    const totalCost = (lp.breakdown[0]?.value || 0) + (lp.breakdown[1]?.value || 0);
    return Math.max(0, this.transferPrice() - totalCost);
  });

  /** Interactive simulated coupon percentage (default 10%) */
  simulatedCouponPercent = signal<number>(10);

  /** Maximum coupon % discount that List Price (installments) can support before losing money */
  maxCouponPercentList = computed(() => {
    const lp = this.calculatedListPrice();
    if (!lp || !lp.breakdown || lp.breakdown.length < 4) return 0;
    const totalCost = (lp.breakdown[0]?.value || 0) + (lp.breakdown[1]?.value || 0);
    const pasarelaRate = (lp.breakdown[3]?.percentage || 0) / 100;
    const netPerSale = lp.listPrice * (1 - pasarelaRate);
    if (netPerSale <= 0) return 0;
    const profitInstallments = Math.max(0, netPerSale - totalCost);
    return Math.floor((profitInstallments / netPerSale) * 100);
  });

  /** Maximum coupon % discount that Transfer Price can support before losing money */
  maxCouponPercentTransfer = computed(() => {
    const lp = this.calculatedListPrice();
    if (!lp || !lp.breakdown || lp.breakdown.length < 2) return 0;
    const totalCost = (lp.breakdown[0]?.value || 0) + (lp.breakdown[1]?.value || 0);
    const tPrice = this.transferPrice();
    if (tPrice <= 0) return 0;
    const profitTransfer = Math.max(0, tPrice - totalCost);
    return Math.floor((profitTransfer / tPrice) * 100);
  });

  /** Simulated net profit in hand when a customer buys with the simulated coupon using cards/installments */
  simulatedProfitList = computed(() => {
    const lp = this.calculatedListPrice();
    if (!lp || !lp.breakdown || lp.breakdown.length < 4) return 0;
    const coupon = this.simulatedCouponPercent();
    const totalCost = (lp.breakdown[0]?.value || 0) + (lp.breakdown[1]?.value || 0);
    const pasarelaRate = (lp.breakdown[3]?.percentage || 0) / 100;
    const discountedPrice = lp.listPrice * (1 - coupon / 100);
    const netReceived = discountedPrice * (1 - pasarelaRate);
    return Math.round(netReceived - totalCost);
  });

  /** Simulated net profit in hand when a customer buys with the simulated coupon using transfer */
  simulatedProfitTransfer = computed(() => {
    const lp = this.calculatedListPrice();
    if (!lp || !lp.breakdown || lp.breakdown.length < 2) return 0;
    const coupon = this.simulatedCouponPercent();
    const totalCost = (lp.breakdown[0]?.value || 0) + (lp.breakdown[1]?.value || 0);
    const tPrice = this.transferPrice();
    const discountedTransfer = tPrice * (1 - coupon / 100);
    return Math.round(discountedTransfer - totalCost);
  });

  /** How much profit is sacrificed in installments due to the simulated coupon */
  profitCededList = computed(() => {
    const lp = this.calculatedListPrice();
    if (!lp) return 0;
    const baseProfit = (lp.maxInstallments ?? 6) >= 6 ? lp.profits.six_installments : lp.profits.three_installments;
    return Math.max(0, baseProfit - this.simulatedProfitList());
  });

  /** How much profit is sacrificed in transfer due to the simulated coupon */
  profitCededTransfer = computed(() => {
    const baseProfit = this.transferProfit();
    return Math.max(0, baseProfit - this.simulatedProfitTransfer());
  });

  /** Toggle for detailed educational coupon breakdown */
  showCouponBreakdown = signal<boolean>(true);

  originalProduct = signal<IProduct | null>(null);
  originalImages = computed(() => this.originalProduct()?.images || []);
  isLoading = signal<boolean>(false);
  selectedType = linkedSignal(
    toSignal(this.productForm.get('productType')!.valueChanges),
  );

  modelPlaceholder = computed(() => {
    const type = this.selectedType();
    if (type === ProductType.TECH) return 'Ej. iPhone 15 Pro / Galaxy S24 / Smart TV 55"';
    if (type === ProductType.CLOTHING) return 'Ej. Remera Lino Roma / Pantalón Sastrero Florencia';
    if (type === ProductType.BEAUTY) return 'Ej. Dior Sauvage EDP / Acqua di Gio Parfum / Serum Vitamina C';
    return 'Ej. Termo Stanley 1.3L / Auriculares In-Ear / Mate Imperial';
  });

  subtitlePlaceholder = computed(() => {
    const type = this.selectedType();
    if (type === ProductType.TECH) return 'Ej. 256GB Titanium / 4K UHD 120Hz / 16GB RAM';
    if (type === ProductType.CLOTHING) return 'Ej. 100% Lino Importado / Fit Oversize / Algodón Peinado';
    if (type === ProductType.BEAUTY) return 'Ej. 100ml Eau de Parfum / Notas Amaderadas y Cítricas';
    return 'Ej. Acero Inoxidable Doble Capa / Edición Limitada';
  });

  isUsingGlobalMargin = signal<boolean>(false);

  // Stepper & Section Navigation
  currentStep = signal<number>(0);
  activeSection = signal<string>('info');

  sections = computed(() => {
    const type = this.selectedType();
    let variantTitle = '3. Variantes & Stock';
    let variantDesc = 'Modelos, colores y stock';
    let variantShort = '3. Variantes';

    if (type === ProductType.CLOTHING) {
      variantTitle = '3. Talles & Stock';
      variantDesc = 'Talles e inventario';
      variantShort = '3. Talles';
    } else if (type === ProductType.BEAUTY) {
      variantTitle = '3. Presentaciones & Stock';
      variantDesc = 'Tamaños, tonos y stock';
      variantShort = '3. Presentaciones';
    }

    return [
      { id: 'info', title: '1. Info & Fotos', shortTitle: '1. Info', icon: 'photo_library', desc: 'Datos básicos y multimedia' },
      { id: 'pricing', title: '2. Precios & Finanzas', shortTitle: '2. Precios', icon: 'payments', desc: 'Costo, margen y cuotas' },
      {
        id: 'variants',
        title: variantTitle,
        shortTitle: variantShort,
        icon: 'inventory_2',
        desc: variantDesc,
      },
      { id: 'details', title: '4. Ficha & SEO', shortTitle: '4. Ficha', icon: 'tune', desc: 'Specs, copy y Google' },
    ];
  });

  isSectionInvalid(sectionId: string): boolean {
    const c = this.productForm.controls;
    if (sectionId === 'info') {
      return !!(c['model']?.invalid || c['brand']?.invalid || c['category']?.invalid || c['provider']?.invalid || c['images']?.invalid);
    }
    if (sectionId === 'pricing') {
      return !!(c['price']?.invalid || c['discountPercentageTransfer']?.invalid || (c['useCustomProfit']?.value && c['customProfitMargin']?.invalid));
    }
    if (sectionId === 'variants') {
      return !!c['colorGroups']?.invalid;
    }
    if (sectionId === 'details') {
      return !!(c['shortDescription']?.invalid || c['largeDescription']?.invalid || !this.isSizeGuideValid());
    }
    return false;
  }

  setStep(index: number) {
    const total = this.sections().length;
    if (index >= 0 && index < total) {
      this.currentStep.set(index);
      this.activeSection.set(this.sections()[index].id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  nextStep() {
    if (this.currentStep() < this.sections().length - 1) {
      this.setStep(this.currentStep() + 1);
    }
  }

  prevStep() {
    if (this.currentStep() > 0) {
      this.setStep(this.currentStep() - 1);
    }
  }

  scrollToSection(id: string) {
    this.activeSection.set(id);
    const index = this.sections().findIndex((s) => s.id === id);
    if (index !== -1) {
      this.currentStep.set(index);
    }
    const element = document.getElementById('section-' + id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

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

  // ============ SMART SIZE GUIDE PARSER & PRESETS ============
  sizeGuideRawText = signal<string>('');
  sizeGuideParserError = signal<string | null>(null);
  showQuickPaste = signal<boolean>(true);

  toggleQuickPaste() {
    this.showQuickPaste.update((v) => !v);
  }

  tokenizeLine(line: string): string[] {
    if (line.includes('|')) {
      return line
        .split('|')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
    }
    if (line.includes('\t')) {
      return line.split('\t').map((s) => s.trim());
    }
    if (line.includes(';')) {
      return line.split(';').map((s) => s.trim());
    }
    return line.split(',').map((s) => s.trim());
  }

  tokenizeValues(rest: string): string[] {
    if (rest.includes('\t')) return rest.split('\t').map((s) => s.trim());
    if (rest.includes('|'))
      return rest
        .split('|')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
    if (rest.includes(';')) return rest.split(';').map((s) => s.trim());
    return rest.split(',').map((s) => s.trim());
  }

  parseAndApplySizeGuide(rawText?: string) {
    const text = (rawText !== undefined ? rawText : this.sizeGuideRawText()).trim();
    if (!text) {
      this.sizeGuideParserError.set('Por favor ingresa texto para procesar.');
      return;
    }

    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length < 2) {
      this.sizeGuideParserError.set(
        'El texto debe tener al menos 2 líneas (encabezados y al menos un talle).'
      );
      return;
    }

    let tolerance = this.sizeGuideState().tolerance || '';
    const cleanDataLines: string[] = [];

    for (const line of lines) {
      if (/^(\*|nota:|tolerancia:)/i.test(line)) {
        tolerance = line.replace(/^(\*|nota:|tolerancia:)\s*/i, '').trim();
      } else if (!/^[-|_|\s|=]+$/.test(line)) {
        cleanDataLines.push(line);
      }
    }

    if (cleanDataLines.length < 2) {
      this.sizeGuideParserError.set('No se encontraron suficientes filas válidas.');
      return;
    }

    // Encabezados (Línea 0)
    const headerLine = cleanDataLines[0];
    const headerTokens = this.tokenizeLine(headerLine);

    if (headerTokens.length < 2) {
      this.sizeGuideParserError.set(
        'La primera línea debe tener al menos dos columnas (ej: Talle, Pecho, Largo).'
      );
      return;
    }

    const headers = headerTokens.map((h, i) => (i === 0 && !h ? 'Talle' : h));
    const expectedCols = headers.length - 1;
    const rows: Array<{ size: string; values: string[] }> = [];

    // Filas de talles
    for (let i = 1; i < cleanDataLines.length; i++) {
      const line = cleanDataLines[i];
      let size = '';
      let values: string[] = [];

      if (line.includes(':')) {
        const colonParts = line.split(':');
        size = colonParts[0].trim();
        const rest = colonParts.slice(1).join(':').trim();
        values = this.tokenizeValues(rest);
      } else {
        const tokens = this.tokenizeLine(line);
        if (tokens.length > 0) {
          size = tokens[0];
          values = tokens.slice(1);
        }
      }

      if (size) {
        while (values.length < expectedCols) {
          values.push('');
        }
        if (values.length > expectedCols) {
          values = values.slice(0, expectedCols);
        }
        rows.push({ size, values });
      }
    }

    if (rows.length === 0) {
      this.sizeGuideParserError.set('No se pudieron extraer filas de talles.');
      return;
    }

    this.sizeGuideState.set({
      enabled: true,
      headers,
      rows,
      tolerance,
    });

    this.sizeGuideParserError.set(null);
  }

  loadSizeGuidePreset(type: 'remera' | 'pantalon' | 'calzado') {
    let sample = '';
    if (type === 'remera') {
      sample = `Talle, Ancho de Pecho (cm), Largo Total (cm), Hombro (cm)
S: 50, 68, 44
M: 52, 70, 46
L: 54, 72, 48
XL: 56, 74, 50
XXL: 58, 76, 52
* Las medidas pueden variar +/- 1.5 cm debido al proceso de confección.`;
    } else if (type === 'pantalon') {
      sample = `Talle, Cintura (cm), Cadera (cm), Largo (cm), Tiro (cm)
38: 38, 48, 100, 28
40: 40, 50, 102, 29
42: 42, 52, 104, 30
44: 44, 54, 106, 31
46: 46, 56, 108, 32
* Medidas tomadas en plano sobre la prenda sin estirar.`;
    } else if (type === 'calzado') {
      sample = `Talle AR, US, EUR, Plantilla (cm)
39: 7, 40, 25.5
40: 7.5, 41, 26.0
41: 8.5, 42, 27.0
42: 9, 43, 27.5
43: 10, 44, 28.5
44: 10.5, 45, 29.0
* Te recomendamos medir la plantilla de tu calzado habitual.`;
    }

    this.sizeGuideRawText.set(sample);
    this.parseAndApplySizeGuide(sample);
  }

  setActiveTab(label: string) {
    this.tabs.update((tabs) =>
      tabs.map((tab) => ({
        ...tab,
        active: tab.label === label,
      })),
    );
  }

  /** Values from the active child form (tech, clothing or beauty) */
  #typeSpecificValues = signal<TechFormValue | ClothingFormValue | BeautyFormValue | null>(null);

  /** Pre-load value passed down to child form in edit mode */
  techInitialValue = signal<TechFormValue | null>(null);
  clothingInitialValue = signal<ClothingFormValue | null>(null);
  beautyInitialValue = signal<BeautyFormValue | null>(null);

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
              this.#debug.error('Error calculating list price', err);
              return EMPTY; // Keep the stream alive for future emissions
            }),
          );
        }),
      )
      .subscribe({
        next: ({ result }) => {
          this.calculatedListPrice.set(result);
          this.isCalculatingListPrice.set(false);
          this.#debug.log('✅ Precio de lista calculado:', result);
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
      this.#debug.log(product);
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
      } else if (type === ProductType.BEAUTY) {
        this.beautyInitialValue.set({
          volume: product.volume || '',
          concentration: product.concentration || '',
          fragranceFamily: product.fragranceFamily || '',
          gender: typeof product.gender === 'string' ? product.gender : 'Unisex',
          applicationArea: product.applicationArea || '',
          scentNotes: product.scentNotes,
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
        linkProductProvider: product.linkProductProvider || '',
        model: product.model,
        subtitle: product.subtitle || '',
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
          let imgIdx = 0;
          if (firstV.imageIndex !== undefined && firstV.imageIndex !== null && Number(firstV.imageIndex) >= 0) {
            imgIdx = Number(firstV.imageIndex);
          } else if (firstV.imageReference?.url && product.images) {
            const found = product.images.findIndex(
              (img: any) => (img.url || img) === firstV.imageReference.url,
            );
            if (found !== -1) imgIdx = found;
          }

          const colorGroup = this.#fb.group({
            colorName: [colorName],
            colorHex: [firstV.color?.hex || '#000000'],
            imageIndex: [imgIdx],
            variants: this.#fb.array([]),
          });

          const variantsArray = colorGroup.get('variants') as FormArray;

          variants.forEach((v) => {
            if (product.productType === ProductType.TECH && isTechVariant(v)) {
              const attrStr =
                v.attributes && Array.isArray(v.attributes) && v.attributes.length > 0
                  ? v.attributes.map((a) => `${a.key}:${a.value}`).join(', ')
                  : 'Versión: Estándar';

              variantsArray.push(
                this.#fb.group({
                  _id: [v._id || ''],
                  sku: [v.sku || ''],
                  attributesJson: [attrStr, [Validators.required]],
                  stock: [v.stock, [Validators.required]],
                  isActive: [v.isActive],
                }),
              );
            } else if (
              product.productType === ProductType.CLOTHING &&
              isClothingVariant(v)
            ) {
              variantsArray.push(
                this.#fb.group({
                  _id: [v._id || ''],
                  sku: [v.sku || ''],
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
      this.#debug.error('Error cargando producto', error);
    }
  }

  #patchArray(formArray: FormArray, data: any[]) {
    formArray.clear();
    if (data && Array.isArray(data)) {
      data.forEach((item) => formArray.push(this.#fb.control(item)));
    }
  }

  /** Called by child forms when their values change */
  onTypeSpecificFormChange(value: TechFormValue | ClothingFormValue | BeautyFormValue) {
    this.#typeSpecificValues.set(value);
  }

  bulkSpecsInput = signal<string>('');
  showBulkSpecs = signal<boolean>(false);

  toggleBulkSpecs() {
    this.showBulkSpecs.update((v) => !v);
  }

  addBulkSpecifications(value?: string) {
    const text = (value !== undefined ? value : this.bulkSpecsInput()).trim();
    if (!text) return;
    const pairs = text.split(/[,;\n\r]+/);
    pairs.forEach((pair) => {
      const indexOfColon = pair.indexOf(':');
      if (indexOfColon !== -1) {
        const key = pair.substring(0, indexOfColon).trim();
        const val = pair.substring(indexOfColon + 1).trim();
        if (key && val) {
          this.specificationsControls.push(
            this.#fb.group({
              key: [key, Validators.required],
              value: [val, Validators.required],
            }),
          );
        }
      }
    });
    this.bulkSpecsInput.set('');
    this.showBulkSpecs.set(false);
  }

  // Bulk Features Tags
  bulkTagsInput = signal<string>('');
  showBulkTags = signal<boolean>(false);

  toggleBulkTags() {
    this.showBulkTags.update((v) => !v);
  }

  addBulkTags(value?: string) {
    const text = (value !== undefined ? value : this.bulkTagsInput()).trim();
    if (!text) return;

    const tags = text.split(/[,;\n\r]+/).map((t) => t.trim()).filter((t) => t.length > 0);
    tags.forEach((tag) => {
      this.featuresControls.push(new FormControl(tag));
    });
    this.bulkTagsInput.set('');
    this.showBulkTags.set(false);
  }

  addQuickTag(tag: string) {
    const existing = (this.featuresControls.value || []) as string[];
    if (!existing.includes(tag)) {
      this.featuresControls.push(new FormControl(tag));
    }
  }

  quickTagSuggestions = computed(() => {
    if (this.selectedType() === ProductType.TECH) {
      return [
        '5G',
        'Pantalla OLED',
        'Carga Rápida',
        'Garantía Oficial',
        'Dual SIM',
        'Liberado',
        'Batería Larga Duración',
        'Cámara Pro',
      ];
    }
    return [
      '100% Algodón',
      'Calce Regular',
      'Fit Oversize',
      'Tela Premium',
      'Industria Argentina',
      'Suave al Tacto',
      'No Achica',
      'Lavar con Agua Fría',
    ];
  });

  presetSpecText = computed(() => {
    if (this.selectedType() === ProductType.TECH) {
      return 'Pantalla: 6.7" OLED, Procesador: Octa-Core, Batería: 5000 mAh, Conector: USB-C, Garantía: 12 meses';
    }
    return 'Material: 100% Algodón, Calce: Regular, Origen: Argentina, Cuidados: Lavar con agua fría';
  });

  presetSpecLabel = computed(() => {
    return this.selectedType() === ProductType.TECH ? '+ Preset Celular/Tech' : '+ Preset Remera';
  });

  onImageDeleted(publicId: string) {
    this.#deletedImages.update((imgs) => [...imgs, publicId]);
    // Clamp color group imageIndex values since the images array shrank
    this.#clampColorGroupImageIndices();
  }

  /** Safely get the image link for a color group's selected image */
  getColorGroupImageLink(group: any): string {
    const images = this.imagesControls.value;
    if (!images || images.length === 0) return '';
    let idx = Number(group.get('imageIndex')?.value ?? 0);
    if (isNaN(idx) || idx < 0) idx = 0;
    if (idx >= images.length) {
      idx = images.length - 1;
    }
    return images[idx]?.link || '';
  }

  /** Cycle to next uploaded image when clicking on the color's thumbnail */
  cycleColorGroupImage(group: any) {
    const total = this.imagesControls.length;
    if (total <= 1) return;
    let current = Number(group.get('imageIndex')?.value ?? 0);
    if (isNaN(current)) current = 0;
    const next = (current + 1) % total;
    group.get('imageIndex')?.setValue(next);
    group.markAsDirty();
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
    const type = this.selectedType();

    if (type === ProductType.TECH) {
      variantsArray.push(
        this.#fb.group({
          attributesJson: ['Versión: Estándar', [Validators.required]],
          stock: [8, [Validators.required, Validators.min(1)]],
          isActive: [true],
        }),
      );
    } else if (type === ProductType.BEAUTY) {
      variantsArray.push(
        this.#fb.group({
          size: ['100ml', Validators.required],
          stock: [8, [Validators.required, Validators.min(1)]],
          isActive: [true],
        }),
      );
    } else if (type === ProductType.GENERAL) {
      variantsArray.push(
        this.#fb.group({
          size: ['Estándar', Validators.required],
          stock: [8, [Validators.required, Validators.min(1)]],
          isActive: [true],
        }),
      );
    } else {
      // CLOTHING
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
              ? Number(group.imageIndex) || 0
              : 0,
        };

        if (v._id) variant._id = v._id;
        if (v.sku) variant.sku = v.sku;

        if (currentType === ProductType.TECH) {
          let parsedAttrs: { key: string; value: string }[] = [];
          const rawAttr = typeof v.attributesJson === 'string' ? v.attributesJson.trim() : '';

          if (rawAttr) {
            parsedAttrs = rawAttr
              .split(/[,;]+/)
              .map((a: string) => {
                const str = a.trim();
                const colonIdx = str.indexOf(':');
                if (colonIdx !== -1) {
                  const k = str.substring(0, colonIdx).trim();
                  const val = str.substring(colonIdx + 1).trim();
                  return { key: k || 'Versión', value: val || str };
                } else if (str.length > 0) {
                  return { key: 'Versión', value: str };
                }
                return { key: '', value: '' };
              })
              .filter((a: any) => a.key && a.value);
          }

          // Fallback garantizado: si quedó vacío, le asignamos al menos 1 atributo para satisfacer Zod
          if (parsedAttrs.length === 0) {
            parsedAttrs = [{ key: 'Versión', value: group.colorName?.trim() || 'Estándar' }];
          }

          variant.attributes = parsedAttrs;
        } else if (currentType === ProductType.CLOTHING) {
          variant.size = String(v.size || 'Único').trim();
        } else if (currentType === ProductType.BEAUTY) {
          variant.volume = String(v.volume || v.size || '100ml').trim();
          variant.size = String(v.size || v.volume || '100ml').trim();
        } else {
          // GENERAL
          variant.size = String(v.size || 'Estándar').trim();
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
        this.#debug.log('=== DATOS QUE SE VAN AL BACKEND (PATCH) ===');
        changes.formData.forEach((value, key) => this.#debug.log(`${key}:`, value));
        this.#debug.log(this.calculatedListPrice());
        await this.#productState.updateProduct(
          this.productID(),
          changes.formData,
        );
        this.#router.navigate(['/home/products', this.productID()]);
      } catch (error) {
        this.#debug.error('Error updating product', error);
      } finally {
        this.isLoading.set(false);
      }
    } else {
      // Create Mode
      this.isLoading.set(true);
      try {
        this.#debug.log(this.productForm.value);
        // Le pasamos el fullProductData a tu armador de POST
        this.#buildCreateFormData(formData, fullProductData);

        this.#debug.log('=== DATOS QUE SE VAN AL BACKEND (POST) ===');
        formData.forEach((value, key) => this.#debug.log(`${key}:`, value));

        const id = await this.#productState.createProduct(formData);
        this.#revokeBlobUrls();
        this.#router.navigate(['/home/products', id]);
      } catch (error) {
        this.#debug.error('Error creating product', error);
      } finally {
        this.isLoading.set(false);
      }
    }
  }

  #buildCreateFormData(formData: FormData, data: any) {
    formData.append('productType', data.productType);
    formData.append('provider', data.provider);
    if (data.linkProductProvider !== undefined && data.linkProductProvider !== null) {
      formData.append('linkProductProvider', data.linkProductProvider);
    }
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
