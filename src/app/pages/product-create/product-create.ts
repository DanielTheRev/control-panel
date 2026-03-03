import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIcon } from '@angular/material/icon';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { Router, RouterLink } from '@angular/router';
import { QuillModule } from 'ngx-quill';
import { debounceTime, distinctUntilChanged, filter, switchMap } from 'rxjs';
import { IProduct, IProductCategories, IProductPrices, ProductType } from '../../interfaces/product.interface';
import { ImageUploadComponent } from '../../shared/components/image-upload/image-upload.component';
import { KeyValueListComponent } from '../../shared/components/key-value-list/key-value-list.component';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { PageLayout } from '../../shared/components/page-layout/page-layout';
import { PricePreview } from '../../shared/components/price-preview/price-preview';
import { TagInputComponent } from '../../shared/components/tag-input/tag-input.component';
import { ProductStoreService } from '../../states/product.state.service';
import { ProductFormUtils } from '../../utils/product-form.utils';

@Component({
  selector: 'app-product-create',
  imports: [
    ReactiveFormsModule,
    PageLayout,
    PageHeader,
    QuillModule,
    MatSnackBarModule,
    PricePreview,
    TagInputComponent,
    KeyValueListComponent,
    ImageUploadComponent,
    MatIcon,
    RouterLink
  ],
  templateUrl: './product-create.html',
  styleUrl: './product-create.css',
})
export class ProductCreate implements OnInit {
  #fb = inject(FormBuilder);
  #deletedImages: string[] = [];
  #productState = inject(ProductStoreService);
  #router = inject(Router);

  productID = input.required<string>();
  isEditMode = computed(() => this.productID() !== null);
  calculatedPrices = signal<IProductPrices | null>(null);

  originalProduct = signal<IProduct | null>(null);
  originalImages = computed(() => this.originalProduct()?.images || []);
  hasChanges = signal<boolean>(false);
  isLoading = signal<boolean>(false);
  selectedType = signal<string>('tech');

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
  clothingBrands = ['Nike', 'Adidas', 'Puma', 'Under Armour', 'New Balance', 'Levi\'s', 'Wrangler', 'Champion', 'The North Face', 'Topper'];

  productForm: FormGroup = this.#fb.group({
    productType: ['tech', Validators.required],
    model: ['', Validators.required],
    brand: ['Apple', Validators.required],
    category: ['Smartphones', Validators.required],
    price: [0, [Validators.required, Validators.min(1)]],
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
    // Tech fields
    storage: this.#fb.array<string>([]),
    ram: [''],
    processor: [''],
    screenSize: [''],
    os: [''],
    // Clothing fields
    gender: ['Hombre'],
    fit: ['Regular'],
    material: [''],
    sizeType: ['Ropa'],
  });

  // Getters for FormArrays
  get imagesControls() { return this.productForm.get('images') as FormArray; }
  get featuresControls() { return this.productForm.get('features') as FormArray; }
  get specificationsControls() { return this.productForm.get('specifications') as FormArray; }
  get variantsControls() { return this.productForm.get('variants') as FormArray; }
  get storageControls() { return this.productForm.get('storage') as FormArray; }

  constructor() {
    // Listen to price changes
    this.productForm.get('price')?.valueChanges.pipe(
      takeUntilDestroyed(),
      debounceTime(800),
      distinctUntilChanged(),
      filter(value => value > 0),
      switchMap(value => this.#productState.calculatePrices(Number(value)))
    ).subscribe({
      next: (prices) => {
        this.calculatedPrices.set(prices);
      },
      error: (err) => console.error('Error calculating prices', err)
    });

    // Listen to productType changes
    this.productForm.get('productType')?.valueChanges.pipe(
      takeUntilDestroyed()
    ).subscribe(type => {
      this.selectedType.set(type);
      // Reset brand and category defaults when type changes
      if (type === 'tech') {
        this.productForm.patchValue({ brand: 'Apple', category: 'Smartphones' });
      } else {
        this.productForm.patchValue({ brand: 'Nike', category: IProductCategories.Remeras });
      }
    });
  }

  ngOnInit() {
    const id = this.productID();
    if (id) {
      this.#loadProduct(id);
    }
  }

  async #loadProduct(id: string) {
    try {
      const product = await this.#productState.getProduct(id);
      this.originalProduct.set(structuredClone(product));

      const type = product.productType === ProductType.TECH ? 'tech' : 'clothing';
      this.selectedType.set(type);

      this.productForm.patchValue({
        productType: type,
        model: product.model,
        brand: product.brand,
        category: product.category,
        price: product.prices.costPrice.inUSD,
        shortDescription: product.shortDescription,
        largeDescription: product.largeDescription,
        // Tech
        ram: product.ram || '',
        processor: product.processor || '',
        screenSize: product.screenSize || '',
        os: product.os || '',
        // Clothing
        gender: product.gender || 'Hombre',
        fit: product.fit || 'Regular',
        material: product.material || '',
        sizeType: product.sizeType || 'Ropa',
      });

      this.calculatedPrices.set(product.prices);

      // Patch Arrays
      this.#patchArray(this.featuresControls, product.features);
      this.#patchArray(this.storageControls, product.storage || []);

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

  onImageDeleted(publicId: string) {
    this.#deletedImages.push(publicId);
  }

  addVariant() {
    this.variantsControls.push(this.#fb.group({
      sku: ['', Validators.required],
      attributesJson: [''],
      colorName: [''],
      colorHex: [''],
      stock: [0, [Validators.required, Validators.min(0)]],
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

  async saveProduct() {
    if (this.productForm.invalid) {
      this.productForm.markAllAsTouched();
      return;
    }
    const productData = this.productForm.value;
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
      this.hasChanges.set(true);
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
    formData.append('shortDescription', data.shortDescription);
    formData.append('largeDescription', data.largeDescription);

    formData.append('features', JSON.stringify(data.features));
    formData.append('specifications', JSON.stringify(data.specifications));
    formData.append('variants', JSON.stringify(this.#parseVariants()));

    // Tech fields
    if (data.productType === 'tech') {
      if (data.storage?.length) formData.append('storage', JSON.stringify(data.storage));
      if (data.ram) formData.append('ram', data.ram);
      if (data.processor) formData.append('processor', data.processor);
      if (data.screenSize) formData.append('screenSize', data.screenSize);
      if (data.os) formData.append('os', data.os);
    }

    // Clothing fields
    if (data.productType === 'clothing') {
      if (data.gender) formData.append('gender', data.gender);
      if (data.fit) formData.append('fit', data.fit);
      if (data.material) formData.append('material', data.material);
      if (data.sizeType) formData.append('sizeType', data.sizeType);
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
