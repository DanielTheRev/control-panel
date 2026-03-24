import { CommonModule, NgClass } from '@angular/common';
import { Component, ElementRef, inject, input, OnInit, signal, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterModule } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import { IShopTheLookHotspot, IShopTheLook, ILookItem, IShopTheLookImage } from '../../../interfaces/shop-the-look.interface';
import { NotificationsService } from '../../../services/notifications.service';
import { ProductService } from '../../../services/product.service';
import { SidebarService } from '../../../services/sidebar.service';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { PageLayout } from '../../../shared/components/page-layout/page-layout';
import { SingleImageUpload } from '../../../shared/components/single-image-upload/single-image-upload';
import { ShopTheLookStateService } from '../../../states/shop-the-look.state.service';
import { IProduct } from '../../../interfaces/product.interface';

interface ILookDraft {
  internalId: string;
  dbId?: string;
  imageControl: FormControl;
  previewImage: string | null;
  hotspots: IShopTheLookHotspot[];
  isActive: boolean;
  originalImage?: IShopTheLookImage;
}

@Component({
  selector: 'app-shop-the-look-create',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterModule,
    MatIconModule,
    PageLayout,
    PageHeader,
    SingleImageUpload,
    NgClass
  ],
  templateUrl: './shop-the-look-create.html',
  styles: [`
    .hotspot-pin { transform: translate(-50%, -50%); transition: all 0.2s ease; }
    .hotspot-pin.active { z-index: 10; transform: translate(-50%, -50%) scale(1.2); }
  `]
})
export class ShopTheLookCreateComponent implements OnInit {
  #fb = inject(FormBuilder);
  #shopTheLookState = inject(ShopTheLookStateService);
  #notificationService = inject(NotificationsService);
  #router = inject(Router);
  #sidebarService = inject(SidebarService);
  #productService = inject(ProductService);

  readonly lookID = input<string>();

  // Base Campaign Form
  form: FormGroup = this.#fb.group({
    title: ['', Validators.required],
    subtitle: [''],
    isActive: [true]
  });

  isEditMode = signal(false);
  loading = signal(false);
  originalCampaign = signal<IShopTheLook | null>(null);

  // Looks State
  looks = signal<ILookDraft[]>([]);
  activeTabIndex = signal<number>(0);
  activeHotspotIndex = signal<number | null>(null);

  @ViewChild('imageContainer') imageContainer!: ElementRef<HTMLDivElement>;

  // Product Search
  searchQuery = new Subject<string>();
  suggestions = signal<IProduct[]>([]);
  isSearching = signal(false);

  constructor() {
    this.#sidebarService.navbarTitle.set({ title: 'Gestionar Shop The Look' });
  }

  ngOnInit() {
    this.setupSearch();
    const id = this.lookID();
    if (id) {
      this.isEditMode.set(true);
      this.loadCampaign(id);
    } else {
      // Comenzamos con 0 looks por decisión de negocio
    }
  }

  setupSearch() {
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
      error: () => this.isSearching.set(false)
    });
  }

  generateInternalId() { return Math.random().toString(36).substring(2, 9); }

  addLook(initialData?: Partial<ILookItem>) {
    const control = new FormControl(initialData?.mainImage?.url || '', Validators.required);
    const internalId = this.generateInternalId();

    const newDraft: ILookDraft = {
      internalId,
      dbId: initialData?._id,
      imageControl: control,
      previewImage: initialData?.mainImage?.url || null,
      hotspots: initialData?.hotspots || [],
      isActive: initialData?.isActive ?? true,
      originalImage: initialData?.mainImage
    };

    control.valueChanges.subscribe(val => {
      if (!val) return;
      this.looks.update(drafts => {
        const index = drafts.findIndex(d => d.internalId === internalId);
        if (index === -1) return drafts;
        const updated = [...drafts];

        let newPreview = null;
        if (val && typeof val === 'object') {
          newPreview = URL.createObjectURL(val);
        } else if (typeof val === 'string' && val.trim() !== '') {
          newPreview = val;
        }

        updated[index] = { ...updated[index], previewImage: newPreview };
        return updated;
      });
    });

    this.looks.update(drafts => [...drafts, newDraft]);
    this.activeTabIndex.set(this.looks().length - 1);
    this.activeHotspotIndex.set(null);
  }

  removeLook(index: number) {
    if (this.looks().length === 1) {
      this.#notificationService.warning('La campaña debe tener al menos un look.');
      return;
    }
    this.looks.update(drafts => drafts.filter((_, i) => i !== index));
    if (this.activeTabIndex() >= this.looks().length) {
      this.activeTabIndex.set(this.looks().length - 1);
    }
    this.activeHotspotIndex.set(null);
  }

  setActiveTab(index: number) {
    this.activeTabIndex.set(index);
    this.activeHotspotIndex.set(null);
  }

  get activeLook() { return this.looks()[this.activeTabIndex()]; }

  async loadCampaign(id: string) {
    try {
      this.loading.set(true);
      const campaign = await this.#shopTheLookState.getCampaignById(id);
      if (campaign) {
        this.originalCampaign.set(campaign);
        this.form.patchValue({
          title: campaign.title,
          subtitle: campaign.subtitle,
          isActive: campaign.isActive !== undefined ? campaign.isActive : true
        });

        // Load items mapped to drafts
        campaign.looks.forEach(look => this.addLook(look));
        this.activeTabIndex.set(0);
      }
    } catch (error) {
      this.#notificationService.error('Error al cargar la campaña');
      this.#router.navigate(['/home/shop-the-look']);
    } finally {
      this.loading.set(false);
    }
  }

  // Hotspot actions for active look
  onImageClick(event: MouseEvent) {
    if (!this.activeLook?.previewImage) return;

    const target = event.target as HTMLElement;
    if (target.closest('.hotspot-pin')) return;

    const bounds = this.imageContainer.nativeElement.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width) * 100;
    const y = ((event.clientY - bounds.top) / bounds.height) * 100;

    const newHotspot: IShopTheLookHotspot = {
      position: { x: parseFloat(x.toFixed(2)), y: parseFloat(y.toFixed(2)) },
      product: null as any,
      isActive: true
    };

    this.looks.update(drafts => {
      const updated = [...drafts];
      const current = updated[this.activeTabIndex()];
      current.hotspots = [...current.hotspots, newHotspot];
      updated[this.activeTabIndex()] = current;
      return updated;
    });

    this.activeHotspotIndex.set(this.activeLook.hotspots.length - 1);
  }

  selectHotspot(index: number) { this.activeHotspotIndex.set(index); }

  removeHotspot(index: number) {
    this.looks.update(drafts => {
      const updated = [...drafts];
      const current = updated[this.activeTabIndex()];
      current.hotspots = current.hotspots.filter((_, i) => i !== index);
      updated[this.activeTabIndex()] = current;
      return updated;
    });
    if (this.activeHotspotIndex() === index) this.activeHotspotIndex.set(null);
  }

  onSearchChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchQuery.next(input.value);
  }

  assignProductToHotspot(product: IProduct, index: number) {
    this.looks.update(drafts => {
      const updated = [...drafts];
      const current = updated[this.activeTabIndex()];
      const updatedHotspots = [...current.hotspots];
      updatedHotspots[index] = { ...updatedHotspots[index], product };
      current.hotspots = updatedHotspots;
      updated[this.activeTabIndex()] = current;
      return updated;
    });
    this.suggestions.set([]);
  }

  toggleActiveLookStatus() {
    this.looks.update(drafts => {
      const updated = [...drafts];
      const current = updated[this.activeTabIndex()];
      current.isActive = !current.isActive;
      updated[this.activeTabIndex()] = current;
      return updated;
    });
  }

  async save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const currentLooks = this.looks();

    // Validations
    const invalidDrafts = currentLooks.filter(d => d.imageControl.invalid);
    if (invalidDrafts.length > 0) {
      this.#notificationService.warning('Asegúrate de haber subido una imagen obligatoria para todos los Looks creados.');
      return;
    }

    const draftsMissingProducts = currentLooks.some(d => d.hotspots.some(h => !h.product));
    if (draftsMissingProducts) {
      this.#notificationService.warning('Hay pines sin producto asignado. Por favor complétalos o elimínelos en los Looks correspondientes.');
      return;
    }

    this.loading.set(true);

    try {
      const formData = new FormData();
      formData.append('title', this.form.value.title);
      if (this.form.value.subtitle) formData.append('subtitle', this.form.value.subtitle);
      formData.append('isActive', this.form.value.isActive);

      // JSON Array construction
      const finalLooksData = currentLooks.map((draft, index) => {
        const hData = draft.hotspots.map(h => ({
          ...h,
          product: h.product._id || (h.product as any)
        }));

        const lookPayload: any = {
          isActive: draft.isActive,
          hotspots: hData
        };

        if (draft.dbId) lookPayload._id = draft.dbId;

        const controlValue = draft.imageControl.value;
        if (typeof controlValue === 'string' && controlValue.trim() !== '' && draft.originalImage && controlValue === draft.originalImage.url) {
          // Preserving original cloud image
          lookPayload.mainImage = draft.originalImage;
        }

        return lookPayload;
      });

      formData.append('looks', JSON.stringify(finalLooksData));

      // Append Files
      currentLooks.forEach((draft, index) => {
        const controlValue = draft.imageControl.value;
        if (controlValue instanceof File) {
          formData.append(`image_${index}`, controlValue);
        }
      });

      if (this.isEditMode()) {
        await this.#shopTheLookState.updateCampaign(this.lookID()!, formData);
      } else {
        await this.#shopTheLookState.createCampaign(formData);
      }

      this.#router.navigate(['/home/shop-the-look']);
    } catch (error) {
      console.error(error);
    } finally {
      this.loading.set(false);
    }
  }
}
