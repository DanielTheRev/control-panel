import { CommonModule } from '@angular/common';
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
  IProductFinance,
  IProductPrices,
  ProductType,
} from '../../../interfaces/product.interface';
import { IFinanceCost } from '../../../interfaces/finance.interface';
import { SidebarService } from '../../../services/sidebar.service';
import { DebugService } from '../../../services/debug.service';
import { ProductStoreService } from '../../../states/product.state.service';
import { StoreConfigStateService } from '../../../states/store.config.state.service';
import { ProviderStateService } from '../../../states/provider.state.service';
import { ProductFormUtils } from '../../../utils/product-form.utils';
import { PageLayout } from '../../../shared/components/page-layout/page-layout';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { ImageUploadComponent } from '../../../shared/components/image-upload/image-upload.component';
import { TagInputComponent } from '../../../shared/components/tag-input/tag-input.component';
import { KeyValueListComponent } from '../../../shared/components/key-value-list/key-value-list.component';
import { AddBrandCategory } from '../../../share/components/add-brand-category/add-brand-category';
import { ProviderCreate } from '../../provider-create/provider-create';

@Component({
  selector: 'app-tech-product-create',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    PageLayout,
    PageHeader,
    QuillModule,
    MatSnackBarModule,
    TagInputComponent,
    KeyValueListComponent,
    ImageUploadComponent,
    MatIcon,
    RouterLink,
  ],
  templateUrl: './tech-product-create.html',
  styleUrl: './tech-product-create.css',
})
export class TechProductCreate implements OnInit {
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

  // Navigation steps
  currentStep = signal<number>(0);
  readonly sections = [
    { id: 'info', title: '1. Identificación & Specs', icon: 'devices', desc: 'Modelo, marca y hardware' },
    { id: 'pricing', title: '2. Precios & Finanzas', icon: 'payments', desc: 'Costo, margen y cuotas' },
    { id: 'variants', title: '3. Versiones & Colores', icon: 'memory', desc: 'Almacenamiento, color y stock' },
    { id: 'details', title: '4. Multimedia & SEO', icon: 'photo_library', desc: 'Fotos, ficha y buscadores' },
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

  techForm: FormGroup = this.fb.group({
    productType: [ProductType.TECH],
    provider: ['', Validators.required],
    linkProductProvider: [''],
    model: ['', Validators.required],
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

    // Specs específicos de Tecnología
    processor: [''],
    ram: [''],
    screenSize: [''],
    os: [''],
    storage: this.fb.array<string>([]),
    connectivity: this.fb.array<string>([]),

    // Multimedia & Ficha
    images: this.fb.array<{ link: string; file: File | null }>([], [Validators.minLength(1)]),
    features: this.fb.array<string>([]),
    specifications: this.fb.array<FormGroup>([]),

    // Versiones / Variantes (Agrupadas por Versión/Capacidad y Color)
    colorGroups: this.fb.array<FormGroup>([]),

    seo: this.fb.group({
      metaTitle: [''],
      metaDescription: [''],
      metaImage: [null as string | File | null],
    }),
  });

  private formValueWatcher = toSignal(this.techForm.valueChanges, {
    initialValue: this.techForm.getRawValue(),
  });

  transferDiscountPercent = computed(() => {
    this.formValueWatcher();
    return this.techForm.get('discountPercentageTransfer')?.value ?? 0;
  });

  transferPrice = computed(() => {
    const lp = this.calculatedListPrice();
    if (!lp) return 0;
    const discount = this.transferDiscountPercent();
    const rawTransfer = lp.listPrice * (1 - discount / 100);
    return Math.round(rawTransfer);
  });

  // Getters para FormArrays
  get imagesControls() { return this.techForm.get('images') as FormArray; }
  get storageControls() { return this.techForm.get('storage') as FormArray; }
  get connectivityControls() { return this.techForm.get('connectivity') as FormArray; }
  get featuresControls() { return this.techForm.get('features') as FormArray; }
  get specificationsControls() { return this.techForm.get('specifications') as FormArray; }
  get colorGroupsControls() { return this.techForm.get('colorGroups') as FormArray; }
  get additionalCostsControls() { return this.techForm.get('additionalCosts') as FormArray; }
  get seoImageControl() { return this.techForm.get('seo.metaImage') as FormControl<string | File | null>; }
  originalImages = computed(() => this.originalProduct()?.images || []);

  constructor() {
    // Escucha de cambios de precio para cálculo de lista
    this.techForm.valueChanges
      .pipe(
        takeUntilDestroyed(),
        debounceTime(600),
        map(() => {
          const raw = this.techForm.getRawValue();
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
        distinctUntilChanged(
          (prev, curr) => JSON.stringify(prev) === JSON.stringify(curr),
        ),
        filter((val) => val.providerCost > 0 && val.customProfitMargin > 0),
        switchMap((val) => {
          this.isCalculatingListPrice.set(true);
          return this.productState.calculateListPrice(val).pipe(
            map((result) => ({ result, error: false as const })),
            catchError((err) => {
              this.isCalculatingListPrice.set(false);
              this.debug.error('Error calculando precio de lista tech', err);
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

    // Toggle de margen personalizado
    this.techForm.get('useCustomProfit')?.valueChanges.pipe(takeUntilDestroyed()).subscribe((useCustom) => {
      if (useCustom) {
        this.techForm.get('customProfitMargin')?.enable();
        this.techForm.get('pricingMethodChoice')?.enable();
        this.isUsingGlobalMargin.set(false);
      } else {
        this.techForm.get('customProfitMargin')?.disable();
        this.techForm.get('pricingMethodChoice')?.disable();
        this.isUsingGlobalMargin.set(true);
      }
    });

    this.sidebarService.navbarTitle.set({ title: 'Producto de Tecnología' });

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
    this.techForm.patchValue({
      productType: ProductType.TECH,
      useCustomProfit: false,
      customProfitMargin: defaultProfit,
      pricingMethodChoice: null,
    });
    this.techForm.get('customProfitMargin')?.disable();
    this.techForm.get('pricingMethodChoice')?.disable();

    // Agregar un primer grupo de variante tecnológica por defecto
    if (this.colorGroupsControls.length === 0) {
      this.addColorGroup();
    }
    this.isFormReady.set(true);
  }

  private async loadProduct(id: string) {
    try {
      this.isLoading.set(true);
      const product = await this.productState.getProduct(id);
      this.originalProduct.set(structuredClone(product));

      this.techForm.patchValue({
        productType: ProductType.TECH,
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
        processor: product.processor || '',
        ram: product.ram || '',
        screenSize: product.screenSize || '',
        os: product.os || '',
      });

      // Storage tags
      this.storageControls.clear();
      (product.storage || []).forEach((s: string) => this.storageControls.push(new FormControl(s)));

      // Connectivity tags
      this.connectivityControls.clear();
      (product.connectivity || []).forEach((c: string) => this.connectivityControls.push(new FormControl(c)));

      // Specs
      this.specificationsControls.clear();
      (product.specifications || []).forEach((s) => {
        this.specificationsControls.push(this.fb.group({ key: [s.key], value: [s.value] }));
      });

      // Features
      this.featuresControls.clear();
      (product.features || []).forEach((f) => this.featuresControls.push(new FormControl(f)));

      // Reconstruir variantes agrupadas
      this.rebuildColorGroupsFromVariants(product.variants || []);

      this.isFormReady.set(true);
    } catch (err) {
      this.debug.error('Error cargando producto de tecnología', err);
    } finally {
      this.isLoading.set(false);
    }
  }

  // Grupos de variantes tecnológicas (Color + Versión/Capacidad)
  addColorGroup(colorName: string = 'Versión Estándar', colorHex: string = '#3B82F6') {
    const group = this.fb.group({
      colorName: [colorName, Validators.required],
      colorHex: [colorHex],
      imageIndex: [null],
      variants: this.fb.array<FormGroup>([]),
    });
    const variantsArray = group.get('variants') as FormArray;
    variantsArray.push(this.createTechVariantRow());
    this.colorGroupsControls.push(group);
  }

  removeColorGroup(index: number) {
    this.colorGroupsControls.removeAt(index);
  }

  createTechVariantRow(version: string = '', stock: number = 10, sku: string = '', barcode: string = '') {
    return this.fb.group({
      version: [version], // ej: "128GB", "256GB"
      stock: [stock, [Validators.required, Validators.min(0)]],
      sku: [sku],
      barcode: [barcode],
      isActive: [true],
    });
  }

  addVariantToGroup(groupIndex: number) {
    const group = this.colorGroupsControls.at(groupIndex);
    const variantsArray = group.get('variants') as FormArray;
    variantsArray.push(this.createTechVariantRow());
  }

  removeVariantFromGroup(groupIndex: number, variantIndex: number) {
    const group = this.colorGroupsControls.at(groupIndex);
    const variantsArray = group.get('variants') as FormArray;
    if (variantsArray.length > 1) {
      variantsArray.removeAt(variantIndex);
    }
  }

  private rebuildColorGroupsFromVariants(variants: any[]) {
    this.colorGroupsControls.clear();
    const groupMap = new Map<string, any>();

    variants.forEach((v) => {
      const colorKey = v.color?.name || 'Estándar';
      if (!groupMap.has(colorKey)) {
        groupMap.set(colorKey, {
          colorName: colorKey,
          colorHex: v.color?.hex || '#3B82F6',
          imageIndex: v.imageIndex ?? null,
          variants: [],
        });
      }
      const versionAttr = v.attributes?.find((a: any) => a.key?.toLowerCase() === 'versión' || a.key?.toLowerCase() === 'capacidad');
      groupMap.get(colorKey).variants.push({
        version: versionAttr ? versionAttr.value : (v.sku || ''),
        stock: v.stock || 0,
        sku: v.sku || '',
        barcode: v.barcode || '',
        isActive: v.isActive !== false,
      });
    });

    groupMap.forEach((g) => {
      const groupForm = this.fb.group({
        colorName: [g.colorName, Validators.required],
        colorHex: [g.colorHex],
        imageIndex: [g.imageIndex],
        variants: this.fb.array(
          g.variants.map((v: any) => this.createTechVariantRow(v.version, v.stock, v.sku, v.barcode)),
        ),
      });
      this.colorGroupsControls.push(groupForm);
    });

    if (this.colorGroupsControls.length === 0) {
      this.addColorGroup();
    }
  }

  private parseVariants(): any[] {
    const rawGroups = this.colorGroupsControls.getRawValue();
    const result: any[] = [];
    const model = this.techForm.get('model')?.value || 'TECH';
    const cleanModel = model.replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase();

    rawGroups.forEach((group: any, gIdx: number) => {
      (group.variants || []).forEach((v: any, vIdx: number) => {
        const sku = v.sku || `${cleanModel}-${group.colorName.substring(0, 2).toUpperCase()}${v.version ? '-' + v.version : ''}-${Date.now().toString().slice(-4)}${gIdx}${vIdx}`;
        result.push({
          sku,
          stock: Number(v.stock || 0),
          barcode: v.barcode || '',
          isActive: v.isActive !== false,
          color: {
            name: group.colorName,
            hex: group.colorHex || '#3B82F6',
          },
          attributes: [
            ...(v.version ? [{ key: 'Capacidad/Versión', value: v.version }] : []),
          ],
          imageReference: { url: '', public_id: '' },
          imageIndex: group.imageIndex ?? null,
        });
      });
    });

    return result;
  }

  // Costos adicionales
  addAdditionalCost() {
    this.additionalCostsControls.push(
      this.fb.group({
        concept: ['', Validators.required],
        value: [0, [Validators.required, Validators.min(0)]],
        type: ['fixed', Validators.required],
      }),
    );
  }

  removeAdditionalCost(index: number) {
    this.additionalCostsControls.removeAt(index);
  }

  // Diálogos de marca y categoría
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

  // Guardado
  async saveProduct() {
    if (this.techForm.invalid) {
      this.techForm.markAllAsTouched();
      return;
    }

    const raw = this.techForm.getRawValue();
    const formData = new FormData();

    formData.append('productType', ProductType.TECH);
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

    // Tech specific specs
    if (raw.processor) formData.append('processor', raw.processor);
    if (raw.ram) formData.append('ram', raw.ram);
    if (raw.screenSize) formData.append('screenSize', raw.screenSize);
    if (raw.os) formData.append('os', raw.os);
    if (raw.storage?.length) formData.append('storage', JSON.stringify(raw.storage));
    if (raw.connectivity?.length) formData.append('connectivity', JSON.stringify(raw.connectivity));

    // Pricing & Margins
    if (raw.useCustomProfit && raw.customProfitMargin !== null) {
      formData.append('customProfitMargin', String(raw.customProfitMargin));
      formData.append('customPricingMethod', raw.pricingMethodChoice || '');
    }
    if (raw.discountPercentageTransfer !== undefined && raw.discountPercentageTransfer !== null) {
      formData.append('discountPercentageTransfer', String(raw.discountPercentageTransfer));
    }
    if (raw.additionalCosts?.length) {
      formData.append('additionalCosts', JSON.stringify(raw.additionalCosts));
    }

    formData.append('features', JSON.stringify(raw.features || []));
    formData.append('specifications', JSON.stringify(raw.specifications || []));
    formData.append('variants', JSON.stringify(this.parseVariants()));

    // Images
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
      this.debug.error('Error guardando producto de tecnología', err);
    } finally {
      this.isLoading.set(false);
    }
  }

  activeSection = signal<string>('info');

  hasChanges = computed(() => {
    this.formValueWatcher();
    if (!this.isFormReady()) return false;
    return this.techForm.dirty || this.deletedImages().length > 0;
  });

  invalidControls = computed(() => {
    this.formValueWatcher();
    const invalid: string[] = [];
    const controls = this.techForm.controls;
    const labels: Record<string, string> = {
      model: 'Modelo',
      brand: 'Marca',
      category: 'Categoría',
      provider: 'Proveedor',
      price: 'Precio Costo',
      shortDescription: 'Descripción Corta',
      largeDescription: 'Descripción Larga',
    };
    for (const name in controls) {
      if (controls[name].invalid) {
        invalid.push(labels[name] || name);
      }
    }
    return invalid;
  });

  isSectionInvalid(sectionId: string): boolean {
    const c = this.techForm.controls;
    if (sectionId === 'info') {
      return !!(c['model']?.invalid || c['brand']?.invalid || c['category']?.invalid || c['provider']?.invalid);
    }
    if (sectionId === 'pricing') {
      return !!(c['price']?.invalid || c['discountPercentageTransfer']?.invalid || (c['useCustomProfit']?.value && c['customProfitMargin']?.invalid));
    }
    if (sectionId === 'variants') {
      return !!c['colorGroups']?.invalid;
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

  getColorGroupControl(gIdx: number, field: string): FormControl {
    const group = this.colorGroupsControls.at(gIdx) as FormGroup;
    if (field === 'hex') return (group.get('colorHex') || new FormControl('#3B82F6')) as FormControl;
    if (field === 'colorName') return (group.get('colorName') || new FormControl('')) as FormControl;

    const variants = group.get('variants') as FormArray;
    if (variants && variants.length > 0) {
      const v = variants.at(0) as FormGroup;
      if (field === 'versionName') return (v.get('version') || new FormControl('')) as FormControl;
      if (v.get(field)) return v.get(field) as FormControl;
    }
    return (group.get(field) || new FormControl('')) as FormControl;
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
