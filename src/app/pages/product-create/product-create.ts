import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router, RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged, filter, switchMap } from 'rxjs';
import { IProduct, IProductPrices } from '../../interfaces/product.interface';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { PageLayout } from '../../shared/components/page-layout/page-layout';
import { PricePreview } from '../../shared/components/price-preview/price-preview';
import { RichTextModule } from '../../shared/modules/rich-text.module';
import { ProductStoreService } from '../../states/product.state.service';
import { TagInputComponent } from '../../shared/components/tag-input/tag-input.component';
import { KeyValueListComponent } from '../../shared/components/key-value-list/key-value-list.component';
import { ImageUploadComponent } from '../../shared/components/image-upload/image-upload.component';
import { ProductFormUtils } from '../../utils/product-form.utils';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'app-product-create',
  imports: [
    ReactiveFormsModule,
    PageLayout,
    PageHeader,
    RichTextModule,
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
  #snackBar = inject(MatSnackBar);
  #productState = inject(ProductStoreService);
  #router = inject(Router);

  productID = input.required<string>();
  isEditMode = computed(() => this.productID() !== null);
  calculatedPrices = signal<IProductPrices | null>(null);

  originalProduct = signal<IProduct | null>(null);

  // Computed for passing strictly typed array to image upload component if needed, 
  // but for now we just pass the originalProduct().images array directly if it exists.
  originalImages = computed(() => this.originalProduct()?.images || []);

  productForm: FormGroup = this.#fb.group({
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
    colors: this.#fb.array<string>([]),
    storage: this.#fb.array<string>([]),
    features: this.#fb.array<string>([]),

    specifications: this.#fb.array<FormGroup>([]),
  });

  // Getters for FormArrays
  get imagesControls() { return this.productForm.get('images') as FormArray; }
  get colorsControls() { return this.productForm.get('colors') as FormArray; }
  get storageControls() { return this.productForm.get('storage') as FormArray; }
  get featuresControls() { return this.productForm.get('features') as FormArray; }
  get specificationsControls() { return this.productForm.get('specifications') as FormArray; }

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

      this.productForm.patchValue({
        model: product.model,
        brand: product.brand,
        category: product.category,
        price: product.prices.costPrice,
        shortDescription: product.shortDescription,
        largeDescription: product.largeDescription,
      });

      this.calculatedPrices.set(product.prices);

      // Patch Arrays using helper
      this.#patchArray(this.colorsControls, product.colors);
      this.#patchArray(this.storageControls, product.storage);
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
      this.#snackBar.open('Error al cargar el producto', 'Cerrar', { duration: 3000 });
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

  async saveProduct() {
    if (this.productForm.invalid) {
      this.productForm.markAllAsTouched();
      return;
    }
    const productData = this.productForm.value;
    const formData = new FormData();

    if (this.isEditMode() && this.originalProduct()) {
      const changes = ProductFormUtils.hasChanges(productData, this.originalProduct(), this.#deletedImages);

      if (!changes.hasChanges) {
        return this.#snackBar.open('No hay cambios para actualizar', 'Cerrar', { duration: 3000 });
      }

      try {
        await this.#productState.updateProduct(this.productID(), changes.formData);
        return this.#showSuccess('Producto actualizado correctamente');
      } catch (error) {
        console.error('Error updating product', error);
        return this.#snackBar.open('Error al actualizar el producto', 'Cerrar', { duration: 3000 });
      }
    } else {
      // Create Mode
      try {
        this.#buildCreateFormData(formData, productData);

        await this.#productState.createProduct(formData);
        this.#revokeBlobUrls();
        return this.#showSuccess('Producto creado correctamente');
      } catch (error) {
        console.error('Error creating product', error);
        return this.#snackBar.open('Error al crear el producto', 'Cerrar', { duration: 3000 });
      }
    }
  }

  #buildCreateFormData(formData: FormData, data: any) {
    formData.append('model', data.model);
    formData.append('brand', data.brand);
    formData.append('category', data.category);
    formData.append('price', data.price);
    formData.append('shortDescription', data.shortDescription);
    formData.append('largeDescription', data.largeDescription);

    formData.append('colors', JSON.stringify(data.colors));
    formData.append('storage', JSON.stringify(data.storage));
    formData.append('features', JSON.stringify(data.features));
    formData.append('specifications', JSON.stringify(data.specifications));

    data.images.forEach((img: any) => {
      if (img.file) formData.append('images', img.file);
    });
  }

  #showSuccess(message: string) {
    this.#snackBar.open(message, 'Cerrar', { duration: 3000 });
    this.#router.navigate(['/products']);
  }

  #revokeBlobUrls() {
    this.imagesControls.value.forEach((img: any) => {
      if (img.link && img.link.startsWith('blob:')) {
        window.URL.revokeObjectURL(img.link);
      }
    });
  }
}
