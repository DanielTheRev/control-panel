import { CommonModule } from '@angular/common';
import { Component, inject, input, OnInit, signal } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterModule } from '@angular/router';
import { debounceTime, distinctUntilChanged, Subject, switchMap } from 'rxjs';
import { IBanner, BannerLinkType, BannerProductSource } from '../../interfaces/banner.interface';
import { NotificationsService } from '../../services/notifications.service';
import { ProductService } from '../../services/product.service';
import { SidebarService } from '../../services/sidebar.service';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { PageLayout } from '../../shared/components/page-layout/page-layout';
import { SingleImageUpload } from '../../shared/components/single-image-upload/single-image-upload';
import { BannerStateService } from '../../states/banner.state.service';
import { StoreConfigStateService } from '../../states/store.config.state.service';

@Component({
  selector: 'app-banner-create',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatIconModule,
    PageLayout,
    PageHeader,
    SingleImageUpload
  ],
  templateUrl: './banner-create.html',
  styleUrl: './banner-create.scss'
})
export class BannerCreate implements OnInit {
  #fb = inject(FormBuilder);
  #bannerStateService = inject(BannerStateService);
  #configState = inject(StoreConfigStateService);
  #productService = inject(ProductService);
  #notificationService = inject(NotificationsService);
  #router = inject(Router);
  #sidebarService = inject(SidebarService);

  readonly bannerID = input<string>();

  isEditMode = signal(false);
  loading = signal(false);
  isSaving = signal(false);

  // Previews
  previewDesktop = signal<string | null>(null);
  previewMobile = signal<string | null>(null);

  // Search for manual products
  productSearchQuery = new Subject<string>();
  productSuggestions = signal<any[]>([]);
  selectedManualProducts = signal<any[]>([]);
  isSearchingProducts = signal(false);

  // Selected single product for link
  selectedLinkProduct = signal<any | null>(null);

  // Config data
  storeConfig = this.#configState.StoreConfig;

  bannerForm: FormGroup = this.#fb.group({
    name: ['', [Validators.required]],
    image: ['', [Validators.required]],
    imageMobile: [''],

    // Redirección al hacer clic
    linkType: ['none' as BannerLinkType],
    linkValue: [''],

    // Vitrina de productos
    showProducts: [false],
    productSource: ['recent' as BannerProductSource],
    productSourceValue: [''],
    manualProductIds: [[]],
    productsCount: [4],

    // Estado y orden
    isActive: [true],
    order: [0],

    // Legacy fields
    brandName: [''],
    title: [''],
    subtitle: [''],
    description: ['']
  });

  get imageControl(): FormControl {
    return this.bannerForm.get('image') as FormControl;
  }

  get imageMobileControl(): FormControl {
    return this.bannerForm.get('imageMobile') as FormControl;
  }

  get linkType(): BannerLinkType {
    return this.bannerForm.get('linkType')?.value || 'none';
  }

  get showProducts(): boolean {
    return this.bannerForm.get('showProducts')?.value || false;
  }

  get productSource(): BannerProductSource {
    return this.bannerForm.get('productSource')?.value || 'recent';
  }

  constructor() {
    this.#sidebarService.navbarTitle.set({
      title: 'Gestionar Banner'
    });
  }

  ngOnInit() {
    const id = this.bannerID();
    if (id) {
      this.isEditMode.set(true);
      this.loadBanner(id);
    }

    // Set up product search
    this.productSearchQuery.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((query) => {
        if (!query.trim() || query.length < 2) {
          this.isSearchingProducts.set(false);
          return [];
        }
        this.isSearchingProducts.set(true);
        return this.#productService.getSuggestions(query);
      })
    ).subscribe({
      next: (products) => {
        this.productSuggestions.set(products || []);
        this.isSearchingProducts.set(false);
      },
      error: () => {
        this.isSearchingProducts.set(false);
      }
    });

    // Update previews when images change
    this.imageControl.valueChanges.subscribe(val => {
      this.updatePreview(val, this.previewDesktop);
    });
    this.imageMobileControl.valueChanges.subscribe(val => {
      this.updatePreview(val, this.previewMobile);
    });
  }

  private updatePreview(val: any, signalTarget: any) {
    if (!val) {
      signalTarget.set(null);
    } else if (typeof val === 'string') {
      signalTarget.set(val);
    } else if (val instanceof File) {
      const url = URL.createObjectURL(val);
      signalTarget.set(url);
    }
  }

  async loadBanner(id: string) {
    this.loading.set(true);
    try {
      const banner = await this.#bannerStateService.getBannerById(id);
      this.bannerForm.patchValue({
        name: banner.name || banner.title || banner.brandName || '',
        image: banner.image,
        imageMobile: banner.imageMobile || '',
        linkType: banner.linkType || (banner.brandName ? 'brand' : 'none'),
        linkValue: banner.linkValue || banner.brandName || '',
        showProducts: banner.showProducts || false,
        productSource: banner.productSource || (banner.brandName ? 'brand' : 'recent'),
        productSourceValue: banner.productSourceValue || banner.brandName || '',
        manualProductIds: banner.manualProductIds || [],
        productsCount: banner.productsCount || 4,
        isActive: banner.isActive !== undefined ? banner.isActive : true,
        order: banner.order || 0,
        brandName: banner.brandName || '',
        title: banner.title || '',
        subtitle: banner.subtitle || '',
        description: banner.description || ''
      });

      if (banner.image) this.previewDesktop.set(banner.image);
      if (banner.imageMobile) this.previewMobile.set(banner.imageMobile);

      // If manual products exist, load their details
      if (banner.manualProductIds && banner.manualProductIds.length > 0) {
        this.bannerForm.get('manualProductIds')?.setValue(banner.manualProductIds);
      }
    } catch (error) {
      this.#notificationService.error('Error al cargar datos del banner');
      this.#router.navigate(['/home/banners']);
    } finally {
      this.loading.set(false);
    }
  }

  onSearchProduct(event: Event) {
    const target = event.target as HTMLInputElement;
    this.productSearchQuery.next(target.value);
  }

  addManualProduct(product: any) {
    const current = this.selectedManualProducts();
    if (!current.some(p => p._id === product._id)) {
      const updated = [...current, product];
      this.selectedManualProducts.set(updated);
      this.bannerForm.patchValue({
        manualProductIds: updated.map(p => p._id)
      });
      this.bannerForm.markAsDirty();
    }
    this.productSuggestions.set([]);
  }

  removeManualProduct(productId: string) {
    const updated = this.selectedManualProducts().filter(p => p._id !== productId);
    this.selectedManualProducts.set(updated);
    this.bannerForm.patchValue({
      manualProductIds: updated.map(p => p._id)
    });
    this.bannerForm.markAsDirty();
  }

  selectLinkProduct(product: any) {
    this.selectedLinkProduct.set(product);
    this.bannerForm.patchValue({
      linkValue: product._id
    });
    this.productSuggestions.set([]);
    this.bannerForm.markAsDirty();
  }

  clearLinkProduct() {
    this.selectedLinkProduct.set(null);
    this.bannerForm.patchValue({
      linkValue: ''
    });
  }

  async onSubmit() {
    if (this.bannerForm.invalid) return;

    this.isSaving.set(true);
    const formValues = this.bannerForm.value;

    const formData = new FormData();
    formData.append('name', formValues.name || 'Banner');
    formData.append('linkType', formValues.linkType || 'none');
    formData.append('linkValue', formValues.linkValue || '');
    formData.append('showProducts', String(formValues.showProducts || false));
    formData.append('productSource', formValues.productSource || 'recent');
    formData.append('productSourceValue', formValues.productSourceValue || '');
    formData.append('productsCount', String(formValues.productsCount || 4));
    formData.append('isActive', String(formValues.isActive !== false));
    formData.append('order', String(formValues.order || 0));

    if (formValues.manualProductIds && formValues.manualProductIds.length > 0) {
      formData.append('manualProductIds', JSON.stringify(formValues.manualProductIds));
    }

    // Handle desktop image
    if (formValues.image instanceof File) {
      formData.append('imageFile', formValues.image);
    } else if (typeof formValues.image === 'string') {
      formData.append('image', formValues.image);
    }

    // Handle mobile image
    if (formValues.imageMobile instanceof File) {
      formData.append('imageMobileFile', formValues.imageMobile);
    } else if (typeof formValues.imageMobile === 'string') {
      formData.append('imageMobile', formValues.imageMobile);
    }

    try {
      const id = this.bannerID();
      if (this.isEditMode() && id) {
        await this.#bannerStateService.updateBanner(id, formData);
        this.#notificationService.success('¡Banner actualizado correctamente!');
      } else {
        await this.#bannerStateService.addBanner(formData);
        this.#notificationService.success('¡Banner creado con éxito!');
      }
      this.#router.navigate(['/home/banners']);
    } catch (error) {
      this.#notificationService.error('Error al guardar el banner');
    } finally {
      this.isSaving.set(false);
    }
  }
}
