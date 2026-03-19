import { CommonModule } from '@angular/common';
import { Component, inject, input, OnInit, signal } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router, RouterModule } from '@angular/router';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { PageLayout } from '../../shared/components/page-layout/page-layout';
import { HeroStateService } from '../../states/hero.state.service';
import { SidebarService } from '../../services/sidebar.service';
import { ProductService } from '../../services/product.service';
import { Subject, debounceTime, distinctUntilChanged, switchMap, finalize } from 'rxjs';
import { SingleImageUpload } from "../../shared/components/single-image-upload/single-image-upload";
import { IHeroSlide } from '../../interfaces/HeroSlide.interface';
import { NotificationsService } from '../../services/notifications.service';

@Component({
  selector: 'app-hero-create',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatSelectModule,
    MatSlideToggleModule,
    PageLayout,
    PageHeader,
    MatSnackBarModule,
    SingleImageUpload
  ],
  templateUrl: './hero-create.html'
})
export class HeroCreateComponent implements OnInit {
  #fb = inject(FormBuilder);
  #heroStateService = inject(HeroStateService);
  #NotificationService = inject(NotificationsService)
  #router = inject(Router);
  #SidebarService = inject(SidebarService);
  #productService = inject(ProductService);
  #OriginalSlide = signal<IHeroSlide | null>(null)

  readonly slideID = input.required<string>();

  searchQuery = new Subject<string>();
  suggestions = signal<any[]>([]);
  selectedProducts = signal<any[]>([]);
  isSearching = signal(false);

  constructor() {
    this.#SidebarService.navbarTitle.set({
      title: 'Gestionar Slide'
    });
  }

  heroForm: FormGroup = this.#fb.group({
    title: ['', Validators.required],
    sub_title: ['', Validators.required],
    description: ['', Validators.required],
    ctaText: ['', Validators.required],
    ctaLink: ['/', Validators.required],
    imageDesktop: ['', Validators.required],
    imageMobile: ['', Validators.required],
    featuredProducts: [[]],
    isActive: [false, Validators.required]
  });

  isEditMode = signal(false);

  get imageDesktopValue() { return this.heroForm.get('imageDesktop') as FormControl; }
  get imageMobileValue() { return this.heroForm.get('imageMobile') as FormControl; }


  ngOnInit(): void {
    const id = this.slideID();
    if (id) {
      this.isEditMode.set(true);
      this.loadSlide(id);
    }

    this.searchQuery.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(query => {
        if (!query || query.trim().length === 0) {
          this.suggestions.set([]);
          this.isSearching.set(false);
          return [];
        }
        this.isSearching.set(true);
        return this.#productService.getSuggestions(query);
      })
    ).subscribe({
      next: (results) => {
        this.suggestions.set(results);
        this.isSearching.set(false);
      },
      error: () => {
        this.isSearching.set(false);
      }
    });
  }

  async loadSlide(id: string) {
    try {
      const slide = await this.#heroStateService.getSlideById(id);
      if (slide) {
        this.#OriginalSlide.set(slide)
        this.heroForm.reset({
          ...slide,
          imageDesktop: slide.imageDesktop.url,
          imageMobile: slide.imageMobile.url,
          featuredProducts: slide.featuredProducts.map(p => p._id)
        });

        this.selectedProducts.set(slide.featuredProducts);
      }
    } catch (error) {
      this.#NotificationService.error('Error al cargar slide')
    }
  }

  async saveSlide() {
    if (this.heroForm.invalid) return;
    const OriginalSlide = this.#OriginalSlide();
    const isEditMode = this.isEditMode()

    const formData = new FormData();

    // 1. Agregamos los textos (los sacás de tu FormGroup o Signal)
    formData.append('title', this.heroForm.value.title);
    formData.append('sub_title', this.heroForm.value.sub_title);
    formData.append('description', this.heroForm.value.description);
    formData.append('ctaText', this.heroForm.value.ctaText);
    formData.append('ctaLink', this.heroForm.value.ctaLink);
    formData.append('isActive', this.heroForm.value.isActive);

    // Ojo con el array de productos (Shop The Look), a veces hay que mandarlo como JSON stringificado
    formData.append('featuredProducts', JSON.stringify(this.heroForm.value.featuredProducts));

    // 2. Agregamos los archivos con LOS MISMOS NOMBRES que pusimos en upload.fields()
    if (this.imageDesktopValue.value) {
      if (isEditMode) {
        if (OriginalSlide && this.imageDesktopValue.value !== OriginalSlide.imageDesktop.url) {
          formData.append('imageDesktop', this.imageDesktopValue.value);
        }
      } else {
        formData.append('imageDesktop', this.imageDesktopValue.value);
      }
    }
    if (this.imageMobileValue.value) {
      if (isEditMode) {
        if (OriginalSlide && this.imageMobileValue.value === OriginalSlide.imageDesktop.url) {
          formData.append('imageMobile', this.imageMobileValue.value);
        }
      } else {
        formData.append('imageMobile', this.imageMobileValue.value);
      }
    }
    const request = this.isEditMode()
      ? this.#heroStateService.updateSlide(this.slideID(), formData)
      : this.#heroStateService.addSlide(formData);
    const message = this.isEditMode() ? 'Slide actualizado correctamente' : 'Slide guardado correctamente';
    try {
      await request;
      this.#NotificationService.success(message);
      this.#router.navigate(['/home/hero']);
    } catch (error) {
      this.#NotificationService.error('Error al guardar slide');
    }
  }

  onSearchChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchQuery.next(input.value);
  }

  addProduct(product: any) {
    if (!this.selectedProducts().find(p => p._id === product._id)) {
      this.selectedProducts.update(s => [...s, product]);
      const current = this.heroForm.get('featuredProducts')?.value || [];
      this.heroForm.patchValue({ featuredProducts: [...current, product._id] });
    }
    this.suggestions.set([]);
  }

  removeProduct(id: string) {
    this.selectedProducts.update(s => s.filter(p => p._id !== id));
    const current = this.heroForm.get('featuredProducts')?.value || [];
    this.heroForm.patchValue({ featuredProducts: current.filter((pid: string) => pid !== id) });
  }

}
