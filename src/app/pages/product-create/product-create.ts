import { CommonModule } from '@angular/common';
import { Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIcon } from '@angular/material/icon';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { Router, RouterLink } from '@angular/router';
import { QuillModule } from 'ngx-quill';
import { combineLatest, debounceTime, distinctUntilChanged, filter, map, switchMap } from 'rxjs';
import { IProduct, IProductPrices, isClothingVariant, isTechVariant, ProductType } from '../../interfaces/product.interface';
import { SidebarService } from '../../services/sidebar.service';
import { ClothingFormValue, ClothingProductForm } from '../../shared/components/clothing-product-form/clothing-product-form';
import { ImageUploadComponent } from '../../shared/components/image-upload/image-upload.component';
import { KeyValueListComponent } from '../../shared/components/key-value-list/key-value-list.component';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { PageLayout } from '../../shared/components/page-layout/page-layout';
import { PricePreview } from '../../shared/components/price-preview/price-preview';
import { TagInputComponent } from '../../shared/components/tag-input/tag-input.component';
import { TechFormValue, TechProductForm } from '../../shared/components/tech-product-form/tech-product-form';
import { ProductStoreService } from '../../states/product.state.service';
import { StoreConfigStateService } from '../../states/store.config.state.service';
import { ProductFormUtils } from '../../utils/product-form.utils';
import { SingleImageUpload } from '../../shared/components/single-image-upload/single-image-upload';
import { MatDialog } from '@angular/material/dialog';
import { AddBrandCategory } from '../../share/components/add-brand-category/add-brand-category';
import { ProviderStateService } from '../../states/provider.state.service';
import { ProviderCreate } from '../provider-create/provider-create';

@Component({
  selector: 'app-product-create',
  imports: [
    ReactiveFormsModule,
    CommonModule,
    PageLayout,
    PageHeader,
    QuillModule,
    MatSnackBarModule,
    PricePreview,
    TagInputComponent,
    KeyValueListComponent,
    ImageUploadComponent,
    MatIcon,
    RouterLink,
    TechProductForm,
    ClothingProductForm,
    SingleImageUpload
  ],
  templateUrl: './product-create.html',
  styleUrl: './product-create.css',
})
export class ProductCreate {
  #SidebarService = inject(SidebarService)
  #fb = inject(FormBuilder);
  #productState = inject(ProductStoreService);
  #router = inject(Router);
  #CommerceConfigState = inject(StoreConfigStateService);
  #dialog = inject(MatDialog);
  #ProviderState = inject(ProviderStateService)

  #storeConfig = this.#CommerceConfigState.StoreConfig;
  isFormReady = signal<boolean>(false);
  #deletedImages = signal<string[]>([]);
  seoImagePreview = signal<string | null>(null);

  brands = computed(() => {
    if (this.#CommerceConfigState.StoreConfig().hasError) return [];
    if (this.#CommerceConfigState.StoreConfig().isLoading) return [];
    if (this.#CommerceConfigState.StoreConfig().hasError) return []
    return this.#CommerceConfigState.StoreConfig().config.brands;
  })
  categories = computed(() => {
    if (this.#CommerceConfigState.StoreConfig().hasError) return [];
    if (this.#CommerceConfigState.StoreConfig().isLoading) return [];
    if (this.#CommerceConfigState.StoreConfig().hasError) return []
    return this.#CommerceConfigState.StoreConfig().config.categories;
  })

  providers = this.#ProviderState.ProviderState;

  productForm: FormGroup = this.#fb.group({
    productType: ['', Validators.required],
    provider: ['', Validators.required],
    model: ['', Validators.required],
    brand: ['', Validators.required],
    category: ['', Validators.required],
    price: [0, [Validators.required, Validators.min(1)]],
    useCustomProfit1Pay: [false],
    useCustomProfitInstallments: [false],
    customProfitMargin1Pay: [{ value: 10, disabled: true }],
    customProfitMarginInstallments: [{ value: 10, disabled: true }],
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
    // Variants
    variants: this.#fb.array<FormGroup>([]),
    seo: this.#fb.group({
      metaTitle: [''],
      metaDescription: [''],
      metaImage: [null as string | File | null]
    }),
  });
  readonly #formStatus = toSignal(this.productForm.statusChanges, { initialValue: 'INVALID' });
  readonly #formTrigger = toSignal(this.productForm.valueChanges);
  readonly #formValueWatcher = toSignal(
    this.productForm.valueChanges,
    { initialValue: this.productForm.getRawValue() }
  );

  readonly formCategory = toSignal<string>(
    this.productForm.get('category')!.valueChanges,
    { initialValue: this.productForm.get('category')?.value || '' }
  );


  #getFullProductData() {
    const currentFormValue = this.productForm.getRawValue();
    let typeSpecific = this.#typeSpecificValues();

    // Si no tocaron el form hijo, usamos los valores iniciales
    if (!typeSpecific) {
      typeSpecific = this.selectedType() === ProductType.TECH
        ? this.techInitialValue()
        : this.clothingInitialValue();
    }

    return {
      ...currentFormValue,
      variants: this.#parseVariants(),
      ...(typeSpecific || {}) // Esparcimos la ram, gender, etc.
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
      typeSpecific = this.selectedType() === ProductType.TECH
        ? this.techInitialValue()
        : this.clothingInitialValue();
    }

    if (this.isEditMode() && this.#originalProduct()) {
      const fullProductData = this.#getFullProductData();
      const changes = ProductFormUtils.hasChanges(
        fullProductData,
        this.#originalProduct(),
        deleted
      );
      return changes.hasChanges;
    }

    return this.productForm.dirty || deleted.length > 0;
  });

  // Route inputs
  productID = input.required<string>();
  /** Provided when creating (from type-selector route), e.g. 'TechProduct' | 'ClothingProduct' */
  typeParam = input<string>('');

  isEditMode = computed(() => this.productID() !== null);
  calculatedPrices = signal<IProductPrices | null>(null);

  #originalProduct = signal<IProduct | null>(null);
  originalImages = computed(() => this.#originalProduct()?.images || []);
  isLoading = signal<boolean>(false);
  selectedType = linkedSignal(toSignal(this.productForm.get('productType')!.valueChanges));

  isUsingGlobalMargin = signal<boolean>(false);
  tabs = signal([
    { label: 'Información Principal', active: true },
    { label: 'Especificaciones principales', active: false },
    { label: 'Descripciones', active: false },
    { label: 'Imágenes', active: false },
    { label: 'Etiquetas(tags)', active: false },
    { label: 'Especificaciones técnicas', active: false },
    { label: 'Variantes', active: false },
    { label: 'SEO & Social', active: false },
  ])

  tabSelected = computed(() => this.tabs().find(tab => tab.active)!.label)

  setActiveTab(label: string) {
    this.tabs.update(tabs => tabs.map(tab => ({
      ...tab,
      active: tab.label === label
    })))
  }

  /** Values from the active child form (tech or clothing) */
  #typeSpecificValues = signal<TechFormValue | ClothingFormValue | null>(null);

  /** Pre-load value passed down to child form in edit mode */
  techInitialValue = signal<TechFormValue | null>(null);
  clothingInitialValue = signal<ClothingFormValue | null>(null);

  ProductType = ProductType;

  // Getters for FormArrays
  get imagesControls() { return this.productForm.get('images') as FormArray; }
  get featuresControls() { return this.productForm.get('features') as FormArray; }
  get specificationsControls() { return this.productForm.get('specifications') as FormArray; }
  get variantsControls() { return this.productForm.get('variants') as FormArray; }
  get seoImageControl() { return this.productForm.get('seo.metaImage') as FormControl<string | File | null>; }

  get invalidControls(): string[] {
    const translations: Record<string, string> = {
      productType: 'Tipo',
      model: 'Modelo',
      brand: 'Marca',
      category: 'Categoría',
      price: 'Precio',
      shortDescription: 'Desc. Corta',
      largeDescription: 'Desc. Larga',
      images: 'Imágenes',
      features: 'Características',
      specifications: 'Especificaciones',
      variants: 'Variantes',
      provider: 'Proveedor / Vendedor',
    };

    const invalid: string[] = [];
    const controls = this.productForm.controls;
    for (const name in controls) {
      if (controls[name].invalid) {
        invalid.push(translations[name] || name);
      }
    }
    return invalid;
  }

  constructor() {
    // Listen to price and margin changes for calculating visual prices via the backend
    this.productForm.valueChanges.pipe(
      takeUntilDestroyed(),
      debounceTime(800),
      map(val => ({ costPrice: val.price, customProfitMargin1Pay: val.customProfitMargin1Pay || '', customProfitMarginInstallments: val.customProfitMarginInstallments || '' })),
      distinctUntilChanged((prev, curr) => prev.costPrice === curr.costPrice && prev.customProfitMargin1Pay === curr.customProfitMargin1Pay && prev.customProfitMarginInstallments === curr.customProfitMarginInstallments),
      filter(val => val.costPrice > 0),
      switchMap(val => this.#productState.calculatePrices(val))
    ).subscribe({
      next: (prices) => {
        this.calculatedPrices.set(prices);
      },
      error: (err) => console.error('Error calculating prices', err)
    });

    // Toggle customProfitMargin enabled/disabled based on useCustomProfit checkbox
    this.productForm.get('useCustomProfit1Pay')?.valueChanges.pipe(
      takeUntilDestroyed()
    ).subscribe((useCustom: boolean) => {
      if (useCustom) {
        this.productForm.get('customProfitMargin1Pay')?.enable();
        this.isUsingGlobalMargin.set(false);
      } else {
        this.productForm.get('customProfitMargin1Pay')?.disable();
        this.isUsingGlobalMargin.set(true);
      }
    });

    this.productForm.get('useCustomProfitInstallments')?.valueChanges.pipe(
      takeUntilDestroyed()
    ).subscribe((useCustom: boolean) => {
      if (useCustom) {
        this.productForm.get('customProfitMarginInstallments')?.enable();
        this.isUsingGlobalMargin.set(false);
      } else {
        this.productForm.get('customProfitMarginInstallments')?.disable();
        this.isUsingGlobalMargin.set(true);
      }
    });

    this.#SidebarService.navbarTitle.set({
      title: 'Gestionar producto'
    })

    combineLatest([
      toObservable(this.productID),
      toObservable(this.#storeConfig)
    ]).pipe(
      takeUntilDestroyed(), // Se limpia solo al destruir el componente
      // Filtramos: Solo pasamos si la config no está cargando y tiene data
      filter(([id, config]) => !config.isLoading && config.hasData),
      // Evitamos llamadas innecesarias si el ID y el Profit no cambiaron
      distinctUntilChanged((prev, curr) => prev[0] === curr[0] && prev[1].config.profit === curr[1].config.profit)
    ).subscribe(async ([id, config]) => {
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
      customProfitMargin: profit
    });
    this.productForm.get('customProfitMargin')?.disable();
    this.isFormReady.set(true);
  }

  async #loadProduct(id: string, defaultProfit: number) {
    try {
      const product = await this.#productState.getProduct(id);
      console.log(product);
      const hasCustomMargin1Pay =
        product.prices.profitMargin1Pay !== undefined &&
        product.prices.profitMargin1Pay !== null;
      const hasCustomMarginInstallments =
        product.prices.profitMarginInstallments !== undefined &&
        product.prices.profitMarginInstallments !== null;

      // ⚠️ Clonamos ANTES de mutar, así originalProduct refleja el estado real de la DB
      this.#originalProduct.set(structuredClone(product));

      if (!hasCustomMargin1Pay && !hasCustomMarginInstallments) {
        product.prices.profitMargin1Pay = defaultProfit;
        product.prices.profitMarginInstallments = defaultProfit;
        this.isUsingGlobalMargin.set(true);
      }

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

      const useCustom1Pay = hasCustomMargin1Pay;
      const useCustomInstallments = hasCustomMarginInstallments;
      this.productForm.patchValue({
        productType: type,
        provider: product.provider ? product.provider._id : '',
        model: product.model,
        brand: product.brand,
        category: product.category,
        price: product.prices.costPrice.inUSD,
        useCustomProfit1Pay: useCustom1Pay,
        useCustomProfitInstallments: useCustomInstallments,
        customProfitMargin1Pay: useCustom1Pay ? product.prices.profitMargin1Pay : '',
        customProfitMarginInstallments: useCustomInstallments ? product.prices.profitMarginInstallments : '',
        isActive: product.isActive !== false,
        isFeatured: !!product.isFeatured,
        shortDescription: product.shortDescription,
        largeDescription: product.largeDescription,
        seo: {
          ...product.seo,
          metaImage: product.seo && product.seo.metaImage ? product.seo.metaImage.url : ''
        }
      });

      this.seoImagePreview.set(product.seo && product.seo.metaImage ? product.seo.metaImage.url : '')

      // Enable/disable margin field based on whether the product had a custom margin
      if (useCustom1Pay) {
        this.productForm.get('customProfitMargin1Pay')?.enable();
      } else {
        this.productForm.get('customProfitMargin1Pay')?.disable();
      }

      if (useCustomInstallments) {
        this.productForm.get('customProfitMarginInstallments')?.enable();
      } else {
        this.productForm.get('customProfitMarginInstallments')?.disable();
      }

      this.calculatedPrices.set(product.prices);

      // Patch Arrays
      this.#patchArray(this.featuresControls, product.features);

      // Patch Specifications
      if (product.specifications && Array.isArray(product.specifications)) {
        this.specificationsControls.clear();
        product.specifications.forEach((s: any) => {
          this.specificationsControls.push(this.#fb.group({
            key: [s.key, Validators.required],
            value: [s.value, Validators.required]
          }));
        });
      }

      // Patch Variants
      if (product.variants && Array.isArray(product.variants)) {
        this.variantsControls.clear();


        product.variants.forEach(v => {
          let imgIdx = null;
          if (v.imageReference?.url) {
            imgIdx = product.images.findIndex((img: any) => (img.url || img) === v.imageReference.url);
          }

          // CASO TECH: Usamos la función guardiana
          if (product.productType === ProductType.TECH && isTechVariant(v)) {
            this.variantsControls.push(this.#fb.group({
              sku: [v.sku, Validators.required],
              // ¡TS ya no se queja porque sabe que 'v' es ITechVariant!
              attributesJson: [v.attributes.map(a => `${a.key}:${a.value}`).join(', ')],
              colorName: [v.color?.name || ''],
              colorHex: [v.color?.hex || ''],
              stock: [v.stock, [Validators.required, Validators.min(0)]],
              isActive: [v.isActive],
              imageIndex: [imgIdx !== -1 ? imgIdx : 0]
            }));
          }

          // CASO ROPA: Usamos la otra función guardiana
          else if (product.productType === ProductType.CLOTHING && isClothingVariant(v)) {
            this.variantsControls.push(this.#fb.group({
              sku: [v.sku, Validators.required],
              // ¡TS te va a autocompletar 'v.size' acá!
              size: [v.size, Validators.required],
              colorName: [v.color?.name || ''],
              colorHex: [v.color?.hex || ''],
              stock: [v.stock, [Validators.required, Validators.min(0)]],
              isActive: [v.isActive],
              imageIndex: [imgIdx !== -1 ? imgIdx : 0]
            }));
          }

        });
      }

      // Patch images
      if (product.images && Array.isArray(product.images)) {
        this.imagesControls.clear();
        product.images.forEach((img: any) => {
          this.imagesControls.push(this.#fb.group({
            link: [img.url || img],
            file: [null]
          }));
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
      data.forEach(item => formArray.push(this.#fb.control(item)));
    }
  }

  /** Called by child forms when their values change */
  onTypeSpecificFormChange(value: TechFormValue | ClothingFormValue) {
    this.#typeSpecificValues.set(value);
  }

  addBulkSpecifications(value: string) {
    if (!value.trim()) return;
    const pairs = value.split(',');
    pairs.forEach(pair => {
      const indexOfColon = pair.indexOf(':');
      if (indexOfColon !== -1) {
        const key = pair.substring(0, indexOfColon).trim();
        const val = pair.substring(indexOfColon + 1).trim();
        if (key && val) {
          // Al pushear al FormArray, se dispara el valueChanges del form, 
          // lo que actualiza formChanges() y recalcula hasChanges automáticamente.
          this.specificationsControls.push(this.#fb.group({
            key: [key, Validators.required],
            value: [val, Validators.required]
          }));
        }
      }
    });
  }

  onImageDeleted(publicId: string) {
    this.#deletedImages.update(imgs => [...imgs, publicId]);
  }

  /** Recibe la URL de preview desde SingleImageUpload y actualiza el signal local */
  onSeoImagePreviewChange(url: string | null) {
    this.seoImagePreview.set(url);
  }

  #LastSKU = linkedSignal<string | undefined,
    {
      productType: string,
      identifier: string,
      size: number,
      colorSuffix: string,
      colorName: string,
      colorHex: string
    }>({
      source: this.formCategory,
      computation: (categoryStr, previous) => {
        // 1. Calculamos el prefijo en base a la categoría seleccionada (ej: "Smartphone" -> "SMA")
        const newPrefix = (categoryStr || 'PROD').slice(0, 3).toUpperCase();

        // 2. Si ya teníamos un estado previo (el usuario ya había estado agregando talles),
        // conservamos sus números, pero le "inyectamos" el nuevo prefijo.
        if (previous?.value) {
          return { ...previous.value, productType: newPrefix };
        }

        // 3. Si es la primera vez (no hay 'previous'), inicializamos desde cero.
        return {
          productType: newPrefix,
          identifier: '00',
          size: 38, // Tu talle base
          colorSuffix: 'BLK',
          colorName: 'Negro',
          colorHex: '#000000'
        };
      }
    });


  addVariant() {
    const currentVariants = this.variantsControls.value;

    // 1. Sincronizamos con la última variante cargada en el form
    if (currentVariants && currentVariants.length > 0) {
      const lastVariant = currentVariants[currentVariants.length - 1];
      const parts = (lastVariant.sku || '').split('-');

      this.#LastSKU.update(v => ({
        ...v!,
        identifier: (parseInt(parts[1]) || 0).toString().padStart(3, '0'),
        size: parseInt(parts[2]) || v!.size,
        colorSuffix: lastVariant.colorSuffix || parts[3] || v!.colorSuffix,
        colorName: lastVariant.colorName || v!.colorName,
        colorHex: lastVariant.colorHex || v!.colorHex
      }));
    }

    // 2. Incrementamos el talle para la NUEVA variante
    this.#LastSKU.update(v => ({
      ...v!,
      size: v!.size + 1
    }));

    // 3. Armamos el string del SKU
    const last = this.#LastSKU()!;
    let sku = `${last.productType}-${last.identifier}-${last.size}`;
    if (last.colorSuffix) {
      sku += `-${last.colorSuffix.toUpperCase()}`;
    }

    // 4. Pusheamos la nueva variante al FormArray DEPENDIENDO DEL TIPO
    if (this.selectedType() === ProductType.TECH) {
      this.variantsControls.push(this.#fb.group({
        sku: [sku, Validators.required],
        attributesJson: [`Talle: ${last.size}`], // En Tech seguimos usando attributes
        colorName: [last.colorName || 'Blanco'],
        colorHex: [last.colorHex || '#ffffff'],
        stock: [8, [Validators.required, Validators.min(1)]],
        isActive: [true],
        imageIndex: [0],
      }));
    } else {
      // ES CLOTHING (ROPA)
      this.variantsControls.push(this.#fb.group({
        sku: [sku, Validators.required],
        size: [last.size.toString(), Validators.required], // <--- AHORA SÍ LE PASAMOS SIZE
        colorName: [last.colorName || 'Blanco'],
        colorHex: [last.colorHex || '#ffffff'],
        stock: [8, [Validators.required, Validators.min(1)]],
        isActive: [true],
        imageIndex: [0],
      }));
    }
  }

  removeVariant(index: number) {
    this.variantsControls.removeAt(index);
  }

  #parseVariants(): any[] {
    const currentType = this.selectedType(); // Le preguntamos al form qué tipo es

    return this.variantsControls.value.map((v: any) => {
      // 1. Armamos la base compartida
      const variant: any = {
        sku: v.sku,
        stock: Number(v.stock),
        reservedStock: 0,
        isActive: v.isActive !== false,
        images: [],
        imageIndex: v.imageIndex
      };

      // 2. Le inyectamos lo específico
      if (currentType === ProductType.TECH) {
        variant.attributes = v.attributesJson
          ? v.attributesJson.split(',').map((a: string) => {
            const [key, value] = a.trim().split(':');
            return { key: key?.trim() || '', value: value?.trim() || '' };
          }).filter((a: any) => a.key && a.value)
          : [];
      } else if (currentType === ProductType.CLOTHING) {
        variant.size = String(v.size).trim(); // ¡Mandamos el talle obligatorio!
      }

      // 3. El color
      if (v.colorName) {
        variant.color = { name: v.colorName, hex: v.colorHex || '#000000' };
      }

      return variant;
    });
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
      data: { type, actuallyData: type === 'brand' ? this.brands() : this.categories() }
    });

    dialogRef.afterClosed().subscribe((result: string) => {
      if (result) {
        if (type === 'brand') {
          this.#CommerceConfigState.saveConfig({ brands: [...this.brands(), result] });
        } else {
          this.#CommerceConfigState.saveConfig({ categories: [...this.categories(), result] });
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
    if (this.productForm.invalid) {
      this.productForm.markAllAsTouched();
      return;
    }

    // 👇 Obtenemos el objeto COMPLETO, con form hijo y todo
    const fullProductData = this.#getFullProductData();
    const formData = new FormData();

    if (this.isEditMode() && this.#originalProduct()) {
      // Le pasamos el fullProductData ya armadito
      const changes = ProductFormUtils.hasChanges(
        fullProductData,
        this.#originalProduct(),
        this.#deletedImages()
      );

      if (!changes.hasChanges) return;

      this.isLoading.set(true);
      try {
        console.log('=== DATOS QUE SE VAN AL BACKEND (PATCH) ===');
        changes.formData.forEach((value, key) => console.log(`${key}:`, value));

        await this.#productState.updateProduct(this.productID(), changes.formData);
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
    if (data.customProfitMargin1Pay !== null && data.customProfitMargin1Pay !== '') {
      formData.append('customProfitMargin1Pay', data.customProfitMargin1Pay.toString());
    }
    if (data.customProfitMarginInstallments !== null && data.customProfitMarginInstallments !== '') {
      formData.append('customProfitMarginInstallments', data.customProfitMarginInstallments.toString());
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
        if (techVals.storage?.length) formData.append('storage', JSON.stringify(techVals.storage));
        if (techVals.ram) formData.append('ram', techVals.ram);
        if (techVals.processor) formData.append('processor', techVals.processor);
        if (techVals.screenSize) formData.append('screenSize', techVals.screenSize);
        if (techVals.os) formData.append('os', techVals.os);
      }

      if (data.productType === ProductType.CLOTHING) {
        const clothingVals = this.#typeSpecificValues() as ClothingFormValue;
        if (clothingVals.gender) formData.append('gender', clothingVals.gender);
        if (clothingVals.fit) formData.append('fit', clothingVals.fit);
        if (clothingVals.material) formData.append('material', clothingVals.material);
        if (clothingVals.sizeType) formData.append('sizeType', clothingVals.sizeType);
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
      if (typeof seoImageValue === 'string' && seoImageValue.startsWith('http')) {
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
