import { HttpClient } from '@angular/common/http';
import { Component, computed, ElementRef, inject, OnInit, signal, viewChild } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { ProductService } from '../../services/product.service';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { PageLayout } from '../../shared/components/page-layout/page-layout';
import { RichTextModule } from '../../shared/modules/rich-text.module';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ProductStoreService } from '../../states/product.state.service';
import { debounceTime, distinctUntilChanged, filter, switchMap } from 'rxjs';
import { PricePreview } from '../../shared/components/price-preview/price-preview';
import { IProductPrices } from '../../interfaces/product.interface';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-product-create',
  imports: [
    ReactiveFormsModule,
    MatIcon,
    RouterLink,
    PageLayout,
    PageHeader,
    RichTextModule,
    MatSnackBarModule,
    PricePreview
  ],
  templateUrl: './product-create.html',
  styleUrl: './product-create.css',
})
export class ProductCreate implements OnInit {
  #fb = inject(FormBuilder);
  #router = inject(Router);
  #route = inject(ActivatedRoute);
  #http = inject(HttpClient);
  #productService = inject(ProductService);
  #deletedImages: string[] = [];
  #snackBar = inject(MatSnackBar);
  #productState = inject(ProductStoreService);


  productId = signal<string | null>(null);
  isEditMode = computed(() => this.productId() !== null);
  calculatedPrices = signal<IProductPrices | null>(null); // Signal for price preview

  private originalProduct: any = null;

  // Specific inputs signals for "Add on Enter" logic
  colorsInput = viewChild<ElementRef<HTMLInputElement>>('colorInput');
  storageInput = viewChild<ElementRef<HTMLInputElement>>('storageInput');
  featuresInput = viewChild<ElementRef<HTMLInputElement>>('featuresInput');

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
  get imagesControls() {
    return this.productForm.get('images') as FormArray;
  }

  get colorsControls() {
    return this.productForm.get('colors') as FormArray;
  }

  get storageControls() {
    return this.productForm.get('storage') as FormArray;
  }

  get featuresControls() {
    return this.productForm.get('features') as FormArray;
  }

  get specificationsControls() {
    return this.productForm.get('specifications') as FormArray;
  }

  constructor() {
    // Listen to price changes
    this.productForm.get('price')?.valueChanges.pipe(
      takeUntilDestroyed(),
      debounceTime(800),
      distinctUntilChanged(),
      filter(value => value > 0),
      switchMap(value => this.#productService.calculatePrices(Number(value)))
    ).subscribe({
      next: (prices) => {
        this.calculatedPrices.set(prices);
      },
      error: (err) => console.error('Error calculating prices', err)
    });
  }

  ngOnInit() {
    this.#route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.productId.set(id);
        this.loadProduct(id);
      }
    });
  }

  loadProduct(id: string) {
    this.#http.get<any>(`${environment.apiUrl}/products/complete/${id}`).subscribe({
      next: (product) => {
        this.originalProduct = structuredClone(product);
        // Patch simple fields
        this.productForm.patchValue({
          model: product.model,
          brand: product.brand,
          category: product.category,
          price: product.prices.costPrice,
          shortDescription: product.shortDescription,
          largeDescription: product.largeDescription,
        });

        this.calculatedPrices.set(product.prices);

        // Patch Arrays
        if (product.colors && Array.isArray(product.colors)) {
          product.colors.forEach((c: string) => this.colorsControls.push(this.#fb.control(c)));
        }
        if (product.storage && Array.isArray(product.storage)) {
          product.storage.forEach((s: string) => this.storageControls.push(this.#fb.control(s)));
        }
        if (product.features && Array.isArray(product.features)) {
          product.features.forEach((f: string) => this.featuresControls.push(this.#fb.control(f)));
        }
        if (product.specifications && Array.isArray(product.specifications)) {
          product.specifications.forEach((s: any) => {
            this.specificationsControls.push(this.#fb.group({
              key: [s.key, Validators.required],
              value: [s.value, Validators.required]
            }));
          });
        }

        // Patch images
        if (product.images && Array.isArray(product.images)) {
          product.images.forEach((img: any) => {
            this.imagesControls.push(this.#fb.group({
              link: [img.url || img],
              file: [null]
            }));
          });
        }
      },
      error: (err) => {
        console.error('Error loading product', err);
      }
    });
  }

  /* --- Image Handling --- */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length <= 0) return;
    const file = input.files[0];
    if (!file || !file.type.startsWith('image')) {
      alert('La imagen que quieres subir no es válida.');
      return;
    }
    const blobURL = window.URL.createObjectURL(file);
    const imageGroup = this.#fb.group({
      link: [blobURL],
      file: [file],
    });

    this.imagesControls.push(imageGroup);
    input.value = '';
  }

  onPasteImg(event: ClipboardEvent) {
    const { clipboardData } = event;
    if (!clipboardData) return;
    const files = clipboardData.files;
    if (!files || files.length <= 0) return;
    const file = files[0];
    if (!file.name.startsWith('image')) {
      return;
    } // Silent return for non-image paste

    const blobURL = window.URL.createObjectURL(file);
    const imageGroup = this.#fb.group({
      link: [blobURL],
      file: [file],
    });

    this.imagesControls.push(imageGroup);
  }

  removeImage(index: number) {
    const blobURL = this.imagesControls.at(index).value.link;
    const isBlob = blobURL.startsWith('blob:');
    if (isBlob) {
      window.URL.revokeObjectURL(blobURL);
    }
    if (!isBlob) {
      const img = this.originalProduct().images.find((img: any) => img.url === blobURL);
      if (img) {
        this.#deletedImages.push(img.public_id);
      }
    }
    this.imagesControls.removeAt(index);
  }

  /* --- Colors Handling --- */
  addColor() {
    const input = this.colorsInput()?.nativeElement;
    if (!input) return;
    const value = input.value.trim();
    if (!value) return;

    this.colorsControls.push(this.#fb.control(value));
    input.value = '';
    input.focus();
  }

  removeColor(index: number) {
    this.colorsControls.removeAt(index);
  }

  /* --- Storage Handling --- */
  addStorage() {
    const input = this.storageInput()?.nativeElement;
    if (!input) return;
    const value = input.value.trim();
    if (!value) return;

    this.storageControls.push(this.#fb.control(value));
    input.value = '';
    input.focus();
  }

  removeStorage(index: number) {
    this.storageControls.removeAt(index);
  }

  /* --- Features Handling --- */
  addFeature() {
    const input = this.featuresInput()?.nativeElement;
    if (!input) return;
    const value = input.value.trim();
    if (!value) return;

    this.featuresControls.push(this.#fb.control(value));
    input.value = '';
    input.focus();
  }

  removeFeature(index: number) {
    this.featuresControls.removeAt(index);
  }

  /* --- Specification Handling --- */
  addSpecification() {
    this.specificationsControls.push(this.#fb.group({
      key: ['', Validators.required],
      value: ['', Validators.required]
    }));
  }

  removeSpecification(index: number) {
    this.specificationsControls.removeAt(index);
  }

  saveProduct() {
    if (this.productForm.invalid) {
      this.productForm.markAllAsTouched();
      return;
    }
    const productData = this.productForm.value;
    const formData = new FormData();

    if (this.isEditMode() && this.originalProduct) {
      // --- EDIT MODE (Differential Update) ---
      let hasChanges = false;

      if (productData.price !== this.originalProduct.prices.costPrice) {
        formData.append('price', productData.price);
        console.log('no es igual, hay cambios en:', 'price');
        hasChanges = true;
      }

      // 1. Compare Simple Fields
      const simpleFields = ['model', 'brand', 'category', 'shortDescription', 'largeDescription'];
      simpleFields.forEach(field => {
        if (productData[field] !== this.originalProduct[field]) {
          formData.append(field, productData[field]);
          console.log('no es igual, hay cambios en:', field);
          hasChanges = true;
        }
      });

      // 2. Compare Arrays (Colors, Storage, Features)
      const arrayFields = ['colors', 'storage', 'features'];
      arrayFields.forEach(field => {
        if (JSON.stringify(productData[field]) !== JSON.stringify(this.originalProduct[field])) {
          formData.append(field, JSON.stringify(productData[field]));
          console.log('no es igual, hay cambios en:', field);
          hasChanges = true;
        }
      });

      // 3. Compare Specifications (Array of Objects)
      const originalSpecs = (this.originalProduct.specifications || []).map((s: any) => ({ key: s.key, value: s.value }));
      if (JSON.stringify(productData.specifications) !== JSON.stringify(originalSpecs)) {
        formData.append('specifications', JSON.stringify(productData.specifications));
        console.log('no es igual, hay cambios en:', 'specifications');
        hasChanges = true;
      }

      // 4. Handle Images
      // Only append NEW images (files)
      const newFiles = productData.images.filter((img: any) => img.file !== null);
      if (newFiles.length > 0) {
        console.log('no es igual, hay cambios en:', 'images');
        hasChanges = true;
        newFiles.forEach((img: any) => {
          formData.append('images', img.file);
        });
      }

      if (this.#deletedImages.length > 0) {
        console.log('no es igual, hay cambios en:', 'deletedImages');
        hasChanges = true
        formData.append('deletedImages', JSON.stringify(this.#deletedImages));
      }

      if (!hasChanges) {
        console.log('No changes detected.');
        return;
      }
      console.log(hasChanges);
      console.log('Updating product with changes:', formData);

      if (this.productId() === null) return;
      this.#productService.updateProduct(this.productId() as string, formData).subscribe({
        next: (productUpdated) => {
          console.log(productUpdated);
          this.#productState.updateProduct(productUpdated);
          this.#snackBar.open('Producto actualizado correctamente', 'Cerrar', {
            duration: 3000,
          });
          this.#router.navigate(['/products']);
        },
        error: (err) => console.error('Error updating product', err)
      });

    } else {
      // --- CREATE MODE ---
      // Append simple fields
      formData.append('model', productData.model);
      formData.append('brand', productData.brand);
      formData.append('category', productData.category);
      formData.append('price', productData.price.toString());
      formData.append('shortDescription', productData.shortDescription);
      formData.append('largeDescription', productData.largeDescription);

      // Append arrays as JSON strings
      formData.append('colors', JSON.stringify(productData.colors));
      formData.append('storage', JSON.stringify(productData.storage));
      formData.append('features', JSON.stringify(productData.features));
      formData.append('specifications', JSON.stringify(productData.specifications));

      // Append files
      for (const img of productData.images) {
        if (img.file) {
          formData.append('images', img.file);
        }
      }

      console.log(productData);

      console.log('Creating product:', formData);
      // this.#productService.create(formData).subscribe({
      //   next: () => {
      //     this.productForm.controls['images'].value.forEach((img: any) => {
      //       if (img.link && img.link.startsWith('blob:')) {
      //         window.URL.revokeObjectURL(img.link);
      //       }
      //     });
      //     this.#router.navigate(['/products']);
      //   },
      //   error: (err) => {
      //     console.error('Error creating product', err);
      //   }
      // });
    }
  }
}
