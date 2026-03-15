import { CommonModule } from '@angular/common';
import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIcon } from '@angular/material/icon';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { Router, RouterLink } from '@angular/router';
import { QuillModule } from 'ngx-quill';
import { debounceTime, distinctUntilChanged, filter, map, switchMap } from 'rxjs';
import { IProduct, IProductCategories, IProductPrices, ProductType } from '../../interfaces/product.interface';
import { SidebarService } from '../../services/sidebar.service';
import { ImageUploadComponent } from '../../shared/components/image-upload/image-upload.component';
import { KeyValueListComponent } from '../../shared/components/key-value-list/key-value-list.component';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { PageLayout } from '../../shared/components/page-layout/page-layout';
import { PricePreview } from '../../shared/components/price-preview/price-preview';
import { TagInputComponent } from '../../shared/components/tag-input/tag-input.component';
import { TechProductForm, TechFormValue } from '../../shared/components/tech-product-form/tech-product-form';
import { ClothingProductForm, ClothingFormValue } from '../../shared/components/clothing-product-form/clothing-product-form';
import { ProductStoreService } from '../../states/product.state.service';
import { ProductFormUtils } from '../../utils/product-form.utils';
import { StoreConfigStateService } from '../../states/store.config.state.service';

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
  ],
  templateUrl: './product-create.html',
  styleUrl: './product-create.css',
})
export class ProductCreate implements OnInit {
  #fb = inject(FormBuilder);
  #deletedImages: string[] = [];
  #productState = inject(ProductStoreService);
  #router = inject(Router);
  #SidebarService = inject(SidebarService)
  #CommerceConfigState = inject(StoreConfigStateService);

  #LastSKU = signal<{
    productType: string,
    identifier: number,
    size: number,
    colorSuffix?: string,
    colorName?: string,
    colorHex?: string
  } | undefined>(undefined)

  // Route inputs
  productID = input.required<string>();
  /** Provided when creating (from type-selector route), e.g. 'TechProduct' | 'ClothingProduct' */
  typeParam = input<string>('');

  isEditMode = computed(() => this.productID() !== null);
  calculatedPrices = signal<IProductPrices | null>(null);

  originalProduct = signal<IProduct | null>(null);
  originalImages = computed(() => this.originalProduct()?.images || []);
  hasChanges = signal<boolean>(false);
  isLoading = signal<boolean>(false);
  selectedType = signal<string>('');
  isUsingGlobalMargin = signal<boolean>(false);

  /** Values from the active child form (tech or clothing) */
  #typeSpecificValues: TechFormValue | ClothingFormValue | null = null;

  /** Pre-load value passed down to child form in edit mode */
  techInitialValue = signal<Partial<TechFormValue> | null>(null);
  clothingInitialValue = signal<Partial<ClothingFormValue> | null>(null);

  ProductType = ProductType;

  // Category options per type
  techCategories = [
    IProductCategories.Smartphones,
    IProductCategories.Electrodomesticos,
    IProductCategories.Pantallas,
    IProductCategories.PC,
    IProductCategories.Consolas,
  ];
  clothingCategories = [
    IProductCategories.Remeras,
    IProductCategories.Pantalones,
    IProductCategories.Buzos,
    IProductCategories.Camperas,
    IProductCategories.Zapatillas,
    IProductCategories.Shorts,
    IProductCategories.Accesorios,
  ];

  techBrands = ['Apple', 'Samsung', 'Poco', 'Xiaomi', 'Motorola', 'Sony', 'Microsoft', 'Nintendo', 'LG'];
  clothingBrands = ['Nike', 'Adidas', 'Puma', 'Under Armour', 'New Balance', 'Levi\'s', 'Wrangler', 'Champion', 'The North Face', 'Topper', 'Vans'];

  productForm: FormGroup = this.#fb.group({
    productType: ['', Validators.required],
    model: ['', Validators.required],
    brand: ['', Validators.required],
    category: ['', Validators.required],
    price: [0, [Validators.required, Validators.min(1)]],
    useCustomProfit: [false],
    customProfitMargin: [{ value: 10, disabled: true }],
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
  });

  // Getters for FormArrays
  get imagesControls() { return this.productForm.get('images') as FormArray; }
  get featuresControls() { return this.productForm.get('features') as FormArray; }
  get specificationsControls() { return this.productForm.get('specifications') as FormArray; }
  get variantsControls() { return this.productForm.get('variants') as FormArray; }

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
      map(val => ({ price: val.price, margin: this.#getEffectiveMargin(val) })),
      distinctUntilChanged((prev, curr) => prev.price === curr.price && prev.margin === curr.margin),
      filter(val => val.price > 0),
      switchMap(val => this.#productState.calculatePrices(Number(val.price), val.margin))
    ).subscribe({
      next: (prices) => {
        this.calculatedPrices.set(prices);
      },
      error: (err) => console.error('Error calculating prices', err)
    });

    // Reactively check for changes to enable/disable the save button
    this.productForm.valueChanges.pipe(
      takeUntilDestroyed(),
      debounceTime(300)
    ).subscribe(value => {
      if (this.isEditMode() && this.originalProduct()) {
        const changes = ProductFormUtils.hasChanges(
          { ...value, variants: this.#parseVariants() },
          this.originalProduct(),
          this.#deletedImages
        );
        this.hasChanges.set(changes.hasChanges);
      } else {
        this.hasChanges.set(this.productForm.dirty);
      }
    });

    // Listen to productType changes
    this.productForm.get('productType')?.valueChanges.pipe(
      takeUntilDestroyed()
    ).subscribe(type => {
      this.selectedType.set(type);
    });

    // Toggle customProfitMargin enabled/disabled based on useCustomProfit checkbox
    this.productForm.get('useCustomProfit')?.valueChanges.pipe(
      takeUntilDestroyed()
    ).subscribe((useCustom: boolean) => {
      if (useCustom) {
        this.productForm.get('customProfitMargin')?.enable();
        this.isUsingGlobalMargin.set(false);
      } else {
        this.productForm.get('customProfitMargin')?.disable();
        this.isUsingGlobalMargin.set(true);
      }
    });

    this.#SidebarService.navbarTitle.set({
      title: 'Gestionar producto'
    })
  }

  async ngOnInit() {
    const defaultProfit = this.#CommerceConfigState.StoreConfig().config.profit || 10;

    const id = this.productID();
    if (id) {
      await this.#loadProduct(id, defaultProfit);
    } else {
      // New product: read the type from the route param
      const type = this.typeParam();
      if (type) {
        this.selectedType.set(type);
        this.productForm.patchValue({ productType: type });
      }
      // Default: use global margin
      this.isUsingGlobalMargin.set(true);
      this.productForm.patchValue({ useCustomProfit: false, customProfitMargin: defaultProfit });
      this.productForm.get('customProfitMargin')?.disable();
    }
  }

  async #loadProduct(id: string, defaultProfit: number) {
    try {
      const product = await this.#productState.getProduct(id);

      const hasCustomMargin =
        product.customProfitMargin !== undefined &&
        product.customProfitMargin !== null;

      if (!hasCustomMargin) {
        product.customProfitMargin = defaultProfit;
        this.isUsingGlobalMargin.set(true);
      }

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
        });
      }

      const useCustom = hasCustomMargin;
      this.productForm.patchValue({
        productType: type,
        model: product.model,
        brand: product.brand,
        category: product.category,
        price: product.prices.costPrice.inUSD,
        useCustomProfit: useCustom,
        customProfitMargin: product.customProfitMargin,
        shortDescription: product.shortDescription,
        largeDescription: product.largeDescription,
      });

      // Enable/disable margin field based on whether the product had a custom margin
      if (useCustom) {
        this.productForm.get('customProfitMargin')?.enable();
      } else {
        this.productForm.get('customProfitMargin')?.disable();
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
          this.variantsControls.push(this.#fb.group({
            sku: [v.sku, Validators.required],
            attributesJson: [v.attributes.map(a => `${a.key}:${a.value}`).join(', ')],
            colorName: [v.color?.name || ''],
            colorHex: [v.color?.hex || ''],
            stock: [v.stock, [Validators.required, Validators.min(0)]],
            isActive: [v.isActive]
          }));
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
    this.#typeSpecificValues = value;
    // Mark as having changes if in edit mode
    if (this.isEditMode()) {
      this.hasChanges.set(true);
    } else {
      this.hasChanges.set(this.productForm.dirty);
    }
  }

  addBulkSpecifications(value: string) {
    if (!value.trim()) return;

    // Split by comma
    const pairs = value.split(',');

    pairs.forEach(pair => {
      // Split by first colon
      const indexOfColon = pair.indexOf(':');
      if (indexOfColon !== -1) {
        const key = pair.substring(0, indexOfColon).trim();
        const val = pair.substring(indexOfColon + 1).trim();

        if (key && val) {
          this.specificationsControls.push(this.#fb.group({
            key: [key, Validators.required],
            value: [val, Validators.required]
          }));
        }
      }
    });

    this.hasChanges.set(true);
  }

  onImageDeleted(publicId: string) {
    this.#deletedImages.push(publicId);
    if (this.isEditMode() && this.originalProduct()) {
      const changes = ProductFormUtils.hasChanges(
        { ...this.productForm.value, variants: this.#parseVariants() },
        this.originalProduct(),
        this.#deletedImages
      );
      this.hasChanges.set(changes.hasChanges);
    }
  }

  addVariant() {
    const currentVariants = this.variantsControls.value;

    // 1. Sync with the last variant in the form if any
    if (currentVariants && currentVariants.length > 0) {
      const lastVariant = currentVariants[currentVariants.length - 1];
      const parts = (lastVariant.sku || '').split('-');

      this.#LastSKU.set({
        productType: parts[0] || this.productForm.value.productType || 'PROD',
        identifier: parseInt(parts[1]) || 0,
        size: parseInt(parts[2]) || 0,
        colorSuffix: parts[3] || '',
        colorName: lastVariant.colorName || '',
        colorHex: lastVariant.colorHex || ''
      });
    }
    // 2. Otherwise use the signal's current state or initialize from defaults
    else if (!this.#LastSKU()) {
      const categoryPrefix = (this.productForm.value.category || 'prod').slice(0, 3).toLowerCase();
      this.#LastSKU.set({
        productType: categoryPrefix,
        identifier: 0,
        size: 34,
        colorSuffix: 'BLK',
        colorName: 'Blanco',
        colorHex: '#ffffff'
      });
    }

    // 3. Increment size and update the signal
    this.#LastSKU.update(v => ({
      ...v!,
      size: v!.size + 1
    }));

    const last = this.#LastSKU()!;
    let sku = `${last.productType.toUpperCase()}-${last.identifier}-${last.size}`;
    if (last.colorSuffix) {
      sku += `-${last.colorSuffix.toUpperCase()}`;
    }

    // 4. Push the new FormGroup with inherited values
    this.variantsControls.push(this.#fb.group({
      sku: [sku, Validators.required],
      attributesJson: [`Talle: ${last.size}`],
      colorName: [last.colorName || 'Blanco'],
      colorHex: [last.colorHex || '#ffffff'],
      stock: [8, [Validators.required, Validators.min(1)]],
      isActive: [true]
    }));
  }

  removeVariant(index: number) {
    this.variantsControls.removeAt(index);
  }

  #parseVariants(): any[] {
    return this.variantsControls.value.map((v: any) => {
      const attributes = v.attributesJson
        ? v.attributesJson.split(',').map((a: string) => {
          const [key, value] = a.trim().split(':');
          return { key: key?.trim() || '', value: value?.trim() || '' };
        }).filter((a: any) => a.key && a.value)
        : [];

      const variant: any = {
        sku: v.sku,
        attributes,
        stock: Number(v.stock),
        reservedStock: 0,
        isActive: v.isActive !== false,
        images: []
      };

      if (v.colorName) {
        variant.color = { name: v.colorName, hex: v.colorHex || '#000000' };
      }

      return variant;
    });
  }

  #getEffectiveMargin(formValue: any): number | undefined {
    if (formValue.useCustomProfit) {
      return formValue.customProfitMargin;
    }
    return undefined;
  }

  async saveProduct() {
    if (this.productForm.invalid) {
      this.productForm.markAllAsTouched();
      return;
    }
    const productData = this.productForm.getRawValue();
    const formData = new FormData();

    if (this.isEditMode() && this.originalProduct()) {
      const changes = ProductFormUtils.hasChanges(
        { ...productData, variants: this.#parseVariants() },
        this.originalProduct(),
        this.#deletedImages
      );

      if (!changes.hasChanges) {
        return
      }
      this.isLoading.set(true);
      try {
        await this.#productState.updateProduct(this.productID(), changes.formData);
        this.#router.navigate(['/products']);
      } catch (error) {
        console.error('Error updating product', error);
      } finally {
        this.isLoading.set(false);
      }
    } else {
      // Create Mode
      this.isLoading.set(true);
      try {
        this.#buildCreateFormData(formData, productData);
        await this.#productState.createProduct(formData);
        this.#revokeBlobUrls();
        this.#router.navigate(['/products']);
      } catch (error) {
        console.error('Error creating product', error);
      } finally {
        this.isLoading.set(false);
      }
    }
  }

  #buildCreateFormData(formData: FormData, data: any) {
    formData.append('productType', data.productType);
    formData.append('model', data.model);
    formData.append('brand', data.brand);
    formData.append('category', data.category);
    formData.append('price', data.price);

    // Only send customProfitMargin if the user opted in
    if (data.useCustomProfit && data.customProfitMargin !== null && data.customProfitMargin !== '') {
      formData.append('customProfitMargin', data.customProfitMargin.toString());
    } else {
      formData.append('customProfitMargin', '');
    }

    formData.append('shortDescription', data.shortDescription);
    formData.append('largeDescription', data.largeDescription);

    formData.append('features', JSON.stringify(data.features));
    formData.append('specifications', JSON.stringify(data.specifications));
    formData.append('variants', JSON.stringify(this.#parseVariants()));

    // Append type-specific fields from child form
    if (this.#typeSpecificValues) {
      if (data.productType === ProductType.TECH) {
        const techVals = this.#typeSpecificValues as TechFormValue;
        if (techVals.storage?.length) formData.append('storage', JSON.stringify(techVals.storage));
        if (techVals.ram) formData.append('ram', techVals.ram);
        if (techVals.processor) formData.append('processor', techVals.processor);
        if (techVals.screenSize) formData.append('screenSize', techVals.screenSize);
        if (techVals.os) formData.append('os', techVals.os);
      }

      if (data.productType === ProductType.CLOTHING) {
        const clothingVals = this.#typeSpecificValues as ClothingFormValue;
        if (clothingVals.gender) formData.append('gender', clothingVals.gender);
        if (clothingVals.fit) formData.append('fit', clothingVals.fit);
        if (clothingVals.material) formData.append('material', clothingVals.material);
        if (clothingVals.sizeType) formData.append('sizeType', clothingVals.sizeType);
      }
    }

    data.images.forEach((img: any) => {
      if (img.file) formData.append('images', img.file);
    });
  }

  #revokeBlobUrls() {
    this.imagesControls.value.forEach((img: any) => {
      if (img.link && img.link.startsWith('blob:')) {
        window.URL.revokeObjectURL(img.link);
      }
    });
  }
}
