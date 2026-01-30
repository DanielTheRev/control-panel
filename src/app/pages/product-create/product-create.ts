import { Component, ElementRef, inject, OnInit, computed, signal, viewChild } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { IProductCreateDTO } from '../../interfaces/product.interface';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { PageLayout } from '../../shared/components/page-layout/page-layout';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'app-product-create',
  imports: [
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    ReactiveFormsModule,
    MatChipsModule,
    MatIcon,
    RouterLink,
    PageLayout,
    PageHeader
  ],
  templateUrl: './product-create.html',
  styleUrl: './product-create.css'
})
export class ProductCreate implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);

  productId = signal<string | null>(null);
  isEditMode = computed(() => !!this.productId());
  
  /* html input  */
  private inputFeatures =
    viewChild.required<ElementRef<HTMLInputElement>>('inputFeature');

  productForm: FormGroup = this.fb.group({
    model: ['', Validators.required],
    brand: ['Apple', Validators.required],
    category: ['Smartphones', Validators.required],
    price: [0, [Validators.required, Validators.min(1)]],
    shortDescription: ['', Validators.required],
    largeDescription: ['', Validators.required],
    images: this.fb.array<{ link: string; file: File | null }>(
      [],
      [Validators.required, Validators.minLength(1)],
    ),
    features: this.fb.array<string>(
      [],
      [Validators.required, Validators.minLength(1)],
    ),
  });

  get featuresControls() {
    return this.productForm.get('features') as FormArray;
  }

  featuresList = toSignal(this.featuresControls.valueChanges, {
    initialValue: [],
  });

  get imagesControls() {
    return this.productForm.get('images') as FormArray;
  }

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.productId.set(id);
        this.loadProduct(id);
      }
    });
  }

  loadProduct(id: string) {
    this.http.get<any>(`${environment.apiUrl}/products/${id}`).subscribe({
        next: (product) => {
            // Patch simple fields
            this.productForm.patchValue({
                model: product.model,
                brand: product.brand,
                category: product.category,
                price: product.price, // Validation might need adjustment depending on API structure (e.g. nested prices)
                shortDescription: product.shortDescription,
                largeDescription: product.largeDescription,
            });

            // Patch features
            if (product.features && Array.isArray(product.features)) {
                product.features.forEach((feature: string) => {
                    this.featuresControls.push(this.fb.control(feature));
                });
            }

            // Patch images
            // Assuming product.images is array of objects with url 
            if (product.images && Array.isArray(product.images)) {
                product.images.forEach((img: any) => {
                    this.imagesControls.push(this.fb.group({
                        link: [img.url || img], // Handle if it's string or object
                        file: [null]
                    }));
                });
            }
        },
        error: (err) => {
            console.error('Error loading product', err);
            // Handle error (e.g. redirect or show message)
        }
    });
  }

  /* get image from input file */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length <= 0) return;
    const file = input.files[0];
    if (!file || !file.type.startsWith('image')) {
      alert('la imagen que quieres subir no es valida o no es una imagen');
      console.log(file);
      return;
    }
    const blobURL = window.URL.createObjectURL(file);
    const imageGroup = this.fb.group({
      link: [blobURL],
      file: [file],
    });

    this.imagesControls.push(imageGroup);
    input.value = '';
  }

  /* get image from clipboard */
  onPasteImg(event: ClipboardEvent) {
    const { clipboardData } = event;
    if (!clipboardData) return;
    const files = clipboardData.files;
    if (!files || files.length <= 0) return;
    const file = files[0];
    if (!file.name.startsWith('image')) {
      alert('la imagen que quieres pegar no es valida o no es una imagen');
      console.log(file);
      return;
    }
    const blobURL = window.URL.createObjectURL(file);
    const imageGroup = this.fb.group({
      link: [blobURL],
      file: [file],
    });

    this.imagesControls.push(imageGroup);
  }

  removeImage(index: number) {
    const blobURL = this.imagesControls.at(index).value.link;
    // Only revoke if it looks like a blob url to avoid revoking remote urls
    if (blobURL.startsWith('blob:')) {
        window.URL.revokeObjectURL(blobURL);
    }
    this.imagesControls.removeAt(index);
  }

  addFeature() {
    const inputElement = this.inputFeatures().nativeElement;
    const value = inputElement.value.trim();
    if (value === '') return;
    // add value as form control to features form array
    this.featuresControls.push(this.fb.control(value));

    // clean input value and activate focus
    inputElement.value = '';
    inputElement.focus();
  }

  removeFeature(index: number) {
    this.featuresControls.removeAt(index);
  }

  saveProduct() {
    if (this.productForm.invalid) return;
    const productData = this.productForm.value;
    
    // Logic to save (POST or PUT)
    // Note: Implementation depends on backend. 
    // If backend handles JSON with file uploads separately, or FormData.
    // For now, I will perform a simple JSON request or FormData loop.
    
    // Example using console log for now as backend specifics are unknown
    console.log('Saving product:', productData);

    // Placeholder for actual HTTP call
    /* 
    const method = this.isEditMode() ? 'put' : 'post';
    const url = this.isEditMode() 
        ? `${environment.apiUrl}/products/${this.productId()}`
        : `${environment.apiUrl}/products`;

    this.http.request(method, url, { body: productData }).subscribe({
        next: () => this.router.navigate(['/product-list']),
        error: (err) => console.error(err)
    });
    */
    
    // For the purpose of "Routing Strategy" request, I will log and navigate back
    // alerting the user about the missing backend implementation for save.
    
    alert('Funcionalidad de guardado pendiente de integración con backend (FormData vs JSON). Datos en consola.');
    this.router.navigate(['/product-list']);
  }
}
