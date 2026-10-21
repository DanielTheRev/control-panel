import { DecimalPipe, NgClass } from '@angular/common';
import { Component, ElementRef, inject, input, OnInit, signal, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterModule } from '@angular/router';
import { IProduct } from '../../../interfaces/product.interface';
import { IShopTheLook, IShopTheLookHotspot, IShopTheLookImage } from '../../../interfaces/shop-the-look.interface';
import { NotificationsService } from '../../../services/notifications.service';
import { ProductService } from '../../../services/product.service';
import { SidebarService } from '../../../services/sidebar.service';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { PageLayout } from '../../../shared/components/page-layout/page-layout';
import { ProductSearchDialogComponent } from '../../../shared/components/product-search-dialog/product-search-dialog';
import { ShopTheLookStateService } from '../../../states/shop-the-look.state.service';
import { getStoreUrl } from '../../../utils/tenant.utils';

interface ILookDraft {
  internalId: string;
  dbId?: string;
  nameControl: FormControl;
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
    NgClass,
    DecimalPipe
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
    slug: [''],
    isActive: [true],
    rankingScore: [100, [Validators.min(0)]],
    order: [0]
  });

  isEditMode = signal(false);
  loading = signal(false);
  originalCampaign = signal<IShopTheLook | null>(null);

  // Looks State
  looks = signal<ILookDraft[]>([]);
  activeTabIndex = signal<number>(0);
  activeHotspotIndex = signal<number | null>(null);

  showImagePicker = signal(false);
  imageInputUrl = signal('');

  @ViewChild('imageContainer') imageContainer!: ElementRef<HTMLDivElement>;

  #dialog = inject(MatDialog);

  constructor() {
    this.#sidebarService.navbarTitle.set({ title: 'Gestionar Outfits' });
  }

  ngOnInit() {
    const id = this.lookID();
    if (id) {
      this.isEditMode.set(true);
      this.loadCampaign(id);
    } else {
      this.addLook();
    }

    this.form.get('title')?.valueChanges.subscribe(val => {
      const slugCtrl = this.form.get('slug');
      if (!slugCtrl?.dirty) {
        const autoSlug = (val || '')
          .toLowerCase()
          .trim()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');
        slugCtrl?.setValue(autoSlug, { emitEvent: false });
      }
    });
  }

  generateInternalId() { return Math.random().toString(36).substring(2, 9); }

  addLook(initialData?: {
    _id?: string;
    name?: string;
    mainImage?: IShopTheLookImage;
    hotspots?: IShopTheLookHotspot[];
    isActive?: boolean;
  }) {
    const nameControl = new FormControl(initialData?.name || '');
    const control = new FormControl(initialData?.mainImage?.url || '', Validators.required);
    const internalId = this.generateInternalId();

    const newDraft: ILookDraft = {
      internalId,
      dbId: initialData?._id,
      nameControl,
      imageControl: control,
      previewImage: initialData?.mainImage?.url || null,
      hotspots: initialData?.hotspots ? structuredClone(initialData.hotspots) : [],
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

  async copyCampaignLink() {
    const slug = this.form.value.slug?.trim() || this.originalCampaign()?.slug || this.lookID();
    if (!slug) {
      this.#notificationService.warning('Primero define un título o slug para la campaña.');
      return;
    }
    const url = `${getStoreUrl()}/shop-the-look/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      this.#notificationService.success('¡Enlace de la campaña copiado al portapapeles!');
    } catch {
      this.#notificationService.error('No se pudo copiar al portapapeles.');
    }
  }

  async copyLookLink(index: number) {
    const slug = this.form.value.slug?.trim() || this.originalCampaign()?.slug || this.lookID();
    if (!slug) {
      this.#notificationService.warning('Primero define un título o slug para la campaña.');
      return;
    }
    const draft = this.looks()[index];
    if (!draft) return;

    const nameVal = draft.nameControl.value?.trim();
    const lookSlug = nameVal
      ? nameVal
          .toLowerCase()
          .trim()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
      : (draft.dbId || String(index + 1));

    const url = `${getStoreUrl()}/shop-the-look/${slug}?look=${lookSlug}`;

    try {
      await navigator.clipboard.writeText(url);
      const lookName = draft.nameControl.value?.trim() || `Look ${index + 1}`;
      this.#notificationService.success(`¡Enlace de "${lookName}" copiado!`);
    } catch {
      this.#notificationService.error('No se pudo copiar al portapapeles.');
    }
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
          title: campaign.name || campaign.title || '',
          subtitle: campaign.occasion || campaign.subtitle || '',
          slug: campaign.slug || '',
          isActive: campaign.isActive !== undefined ? campaign.isActive : true,
        rankingScore: campaign.rankingScore !== undefined ? campaign.rankingScore : 100,
        order: campaign.order !== undefined ? campaign.order : 0
      });

        // Cargar galería y productos del outfit autónomo
        const gallery = campaign.gallery || [];
        const products = campaign.products || [];
        this.addLook({
          name: campaign.name || campaign.title,
          mainImage: gallery[0] || { url: '', public_id: '' },
          hotspots: products.map((p: any) => ({
            _id: p._id,
            product: p.product,
            position: p.position || { x: 50, y: 50 },
            selectedColor: p.selectedColor,
            selectedSku: p.selectedSku,
            variantImage: p.variantImage,
            isActive: p.isActive !== false
          }))
        });
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
      _id: Math.random().toString(36).substring(2, 9),
      position: { x: parseFloat(x.toFixed(2)), y: parseFloat(y.toFixed(2)) },
      product: null as any,
      isActive: true
    };

    this.looks.update(drafts => {
      const updated = [...drafts];
      const current = { ...updated[this.activeTabIndex()] };
      current.hotspots = [...current.hotspots, newHotspot];
      updated[this.activeTabIndex()] = current;
      return updated;
    });

    this.activeHotspotIndex.set(this.activeLook.hotspots.length - 1);
  }

  addEmptyHotspot() {
    const newHotspot: IShopTheLookHotspot = {
      _id: Math.random().toString(36).substring(2, 9),
      position: { x: 50, y: 50 },
      product: null as any,
      isActive: true
    };
    this.looks.update(drafts => {
      const updated = [...drafts];
      const current = { ...updated[this.activeTabIndex()] };
      current.hotspots = [...current.hotspots, newHotspot];
      updated[this.activeTabIndex()] = current;
      return updated;
    });
    this.activeHotspotIndex.set(this.activeLook ? this.activeLook.hotspots.length - 1 : 0);
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    const look = this.activeLook;
    if (!look) return;

    look.imageControl.setValue(file);
    const blobUrl = URL.createObjectURL(file);
    this.looks.update(drafts => {
      const idx = this.activeTabIndex();
      if (!drafts[idx]) return drafts;
      const updated = [...drafts];
      updated[idx] = { ...updated[idx], previewImage: blobUrl };
      return updated;
    });
    this.showImagePicker.set(false);
  }

  onUrlSubmit(url: string) {
    if (!url || !url.trim()) return;
    const cleanUrl = url.trim();
    const look = this.activeLook;
    if (!look) return;

    look.imageControl.setValue(cleanUrl);
    this.looks.update(drafts => {
      const idx = this.activeTabIndex();
      if (!drafts[idx]) return drafts;
      const updated = [...drafts];
      updated[idx] = { ...updated[idx], previewImage: cleanUrl };
      return updated;
    });
    this.imageInputUrl.set('');
    this.showImagePicker.set(false);
  }

  onMainImageError(event: Event) {
    const target = event.target as HTMLImageElement;
    if (target.dataset['hasError'] === 'true') return;
    target.dataset['hasError'] = 'true';
    target.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22600%22%20height%3D%22800%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20600%20800%22%20preserveAspectRatio%3D%22none%22%3E%3Cdefs%3E%3Cstyle%20type%3D%22text%2Fcss%22%3E%23holder_1%20text%20%7B%20fill%3A%23999%3Bfont-weight%3Anormal%3Bfont-family%3Asans-serif%3Bfont-size%3A24pt%20%7D%20%3C%2Fstyle%3E%3C%2Fdefs%3E%3Cg%20id%3D%22holder_1%22%3E%3Crect%20width%3D%22600%22%20height%3D%22800%22%20fill%3D%22%23f3f4f6%22%3E%3C%2Frect%3E%3Cg%3E%3Ctext%20x%3D%22160%22%20y%3D%22410%22%3EImagen%20no%20disponible%3C%2Ftext%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E';
  }

  asProduct(product: any): IProduct | null {
    if (product && typeof product === 'object' && ('model' in product || 'images' in product || '_id' in product)) {
      return product as IProduct;
    }
    return null;
  }

  getProductImageUrl(product: any, variantImage?: { url?: string }): string {
    if (variantImage?.url) return variantImage.url;
    const prod = this.asProduct(product);
    if (!prod || !prod.images || prod.images.length === 0) return '';
    const first: any = prod.images[0];
    if (typeof first === 'string') return first;
    return first?.url || '';
  }

  selectHotspot(index: number) { this.activeHotspotIndex.set(index); }

  removeHotspot(index: number) {
    this.looks.update(drafts => {
      const updated = [...drafts];
      const current = { ...updated[this.activeTabIndex()] };
      current.hotspots = current.hotspots.filter((_, i) => i !== index);
      updated[this.activeTabIndex()] = current;
      return updated;
    });
    if (this.activeHotspotIndex() === index) this.activeHotspotIndex.set(null);
  }

  openProductSearch(index: number) {
    const dialogRef = this.#dialog.open(ProductSearchDialogComponent, {
      width: '600px',
      maxWidth: '95vw',
      panelClass: 'bg-transparent'
    });

    dialogRef.afterClosed().subscribe((product: IProduct) => {
      if (product) {
        this.assignProductToHotspot(product, index);
      }
    });
  }

  getProductColors(product: any): Array<{ name: string; hex?: string; image?: string; public_id?: string; sku?: string }> {
    const prod = this.asProduct(product);
    if (!prod || !prod.variants || !Array.isArray(prod.variants)) return [];

    // Extract valid images from product.images
    const prodImages = (prod.images || []).map((img: any) => ({
      url: (typeof img === 'string' ? img : img?.url || '').trim(),
      public_id: (typeof img === 'string' ? '' : img?.public_id || '').trim()
    })).filter(i => Boolean(i.url));

    const defaultImg = prodImages[0] || { url: '', public_id: '' };

    const colorsMap = new Map<string, { name: string; hex?: string; image?: string; public_id?: string; sku?: string }>();
    
    // Check how many unique color names exist
    const uniqueColorNames = new Set(
      prod.variants.map((v: any) => v.color?.name?.trim()).filter(Boolean)
    );
    const isSingleColor = uniqueColorNames.size <= 1;

    prod.variants.forEach((v: any) => {
      const colorName = v.color?.name?.trim();
      if (colorName && !colorsMap.has(colorName)) {
        let variantImgUrl = v.imageReference?.url?.trim() || '';
        let variantPubId = v.imageReference?.public_id?.trim() || '';

        // If variant's image is not in active product images list, it's stale/orphaned
        const isUrlInProdImages = prodImages.some(pi => pi.url === variantImgUrl);

        if (!variantImgUrl || !isUrlInProdImages) {
          // If variant has imageIndex pointing to product.images, use it
          if (v.imageIndex !== undefined && v.imageIndex !== null && prodImages[v.imageIndex]) {
            variantImgUrl = prodImages[v.imageIndex].url;
            variantPubId = prodImages[v.imageIndex].public_id;
          } else if (isSingleColor || prodImages.length > 0) {
            // If the product has only 1 color or general fallback, use primary product image
            variantImgUrl = defaultImg.url;
            variantPubId = defaultImg.public_id;
          }
        }

        colorsMap.set(colorName, {
          name: colorName,
          hex: v.color?.hex,
          image: variantImgUrl,
          public_id: variantPubId,
          sku: v.sku
        });
      }
    });
    return Array.from(colorsMap.values());
  }

  selectHotspotColor(hotspotIndex: number, color: { name: string; hex?: string; image?: string; public_id?: string; sku?: string }) {
    this.looks.update(drafts => {
      const activeIdx = this.activeTabIndex();
      if (!drafts[activeIdx] || !drafts[activeIdx].hotspots[hotspotIndex]) return drafts;

      const updated = [...drafts];
      const current = { ...updated[activeIdx] };
      const updatedHotspots = [...current.hotspots];
      const targetHotspot = updatedHotspots[hotspotIndex];

      const prod = this.asProduct(targetHotspot.product);
      const fallbackImg = prod?.images?.[0]?.url || (typeof prod?.images?.[0] === 'string' ? prod.images[0] : '');
      const fallbackPubId = prod?.images?.[0]?.public_id || '';

      const finalImgUrl = (color.image?.trim() || fallbackImg || '').trim();
      const finalPubId = (color.public_id?.trim() || fallbackPubId || '').trim();

      updatedHotspots[hotspotIndex] = {
        ...targetHotspot,
        selectedColor: { name: color.name, hex: color.hex },
        selectedSku: color.sku,
        variantImage: finalImgUrl ? { url: finalImgUrl, public_id: finalPubId } : undefined
      };
      current.hotspots = updatedHotspots;
      updated[activeIdx] = current;
      return updated;
    });
  }

  assignProductToHotspot(product: IProduct, index: number) {
    const availableColors = this.getProductColors(product);
    const defaultColor = availableColors[0];

    const fallbackImg = product.images?.[0]?.url || (typeof product.images?.[0] === 'string' ? product.images[0] : '');
    const fallbackPubId = product.images?.[0]?.public_id || '';
    const finalImgUrl = (defaultColor?.image?.trim() || fallbackImg || '').trim();
    const finalPubId = (defaultColor?.public_id?.trim() || fallbackPubId || '').trim();

    this.looks.update(drafts => {
      const activeIdx = this.activeTabIndex();
      if (!drafts[activeIdx] || !drafts[activeIdx].hotspots[index]) return drafts;

      const updated = [...drafts];
      const current = { ...updated[activeIdx] };
      const updatedHotspots = [...current.hotspots];
      updatedHotspots[index] = {
        ...updatedHotspots[index],
        product,
        selectedColor: defaultColor ? { name: defaultColor.name, hex: defaultColor.hex } : undefined,
        selectedSku: defaultColor?.sku,
        variantImage: finalImgUrl ? { url: finalImgUrl, public_id: finalPubId } : undefined
      };
      current.hotspots = updatedHotspots;
      updated[activeIdx] = current;
      return updated;
    });
  }

  onHotspotImageError(event: Event, hotspot: IShopTheLookHotspot) {
    const target = event.target as HTMLImageElement;
    const prod = this.asProduct(hotspot.product);
    const fallback = prod?.images?.[0]?.url || (typeof prod?.images?.[0] === 'string' ? prod.images[0] : '');
    if (fallback && target.src !== fallback) {
      target.src = fallback;
    }
  }

  toggleActiveLookStatus() {
    this.looks.update(drafts => {
      const updated = [...drafts];
      const current = { ...updated[this.activeTabIndex()] };
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
    const activeDraft = currentLooks[0];

    // Validaciones del Outfit
    if (!activeDraft || (!activeDraft.imageControl.value && !activeDraft.previewImage)) {
      this.#notificationService.warning('Asegúrate de haber subido una fotografía editorial para el Outfit.');
      return;
    }

    const draftsMissingProducts = activeDraft.hotspots.some(h => !h.product);
    if (draftsMissingProducts) {
      this.#notificationService.warning('Hay pines sin producto asignado. Por favor complétalos o elimínalos.');
      return;
    }

    this.loading.set(true);

    try {
      const formData = new FormData();
      formData.append('title', this.form.value.title);
      formData.append('name', this.form.value.title);
      if (this.form.value.subtitle) {
        formData.append('subtitle', this.form.value.subtitle);
        formData.append('occasion', this.form.value.subtitle);
      }
      if (this.form.value.slug) formData.append('slug', this.form.value.slug.trim().toLowerCase());
      formData.append('isActive', this.form.value.isActive);
      if (this.form.value.rankingScore !== undefined && this.form.value.rankingScore !== null) {
        formData.append('rankingScore', String(this.form.value.rankingScore));
      }
      if (this.form.value.order !== undefined && this.form.value.order !== null) {
        formData.append('order', String(this.form.value.order));
      }

      // Guardar prendas / productos del outfit
      const productsData = (activeDraft.hotspots || [])
        .filter(h => h && h.product)
        .map(h => {
          const prod = this.asProduct(h.product);
          const mapped: any = {
            product: prod?._id || (h.product as any)?._id || (typeof h.product === 'string' ? h.product : ''),
            position: h.position || { x: 50, y: 50 },
            selectedColor: h.selectedColor,
            selectedSku: h.selectedSku,
            variantImage: h.variantImage,
            isActive: h.isActive !== false
          };
          if (h._id && String(h._id).length === 24) {
            mapped._id = h._id;
          }
          return mapped;
        });
      formData.append('products', JSON.stringify(productsData));

      // Guardar galería / fotografía editorial
      const controlVal = activeDraft.imageControl.value;
      if (typeof controlVal === 'string' && controlVal.trim() !== '') {
        const galleryItem = activeDraft.originalImage || { url: controlVal.trim(), public_id: '' };
        formData.append('gallery', JSON.stringify([galleryItem]));
      } else if (controlVal instanceof File) {
        formData.append('gallery_0', controlVal);
      } else if (activeDraft.previewImage && typeof activeDraft.previewImage === 'string') {
        const galleryItem = activeDraft.originalImage || { url: activeDraft.previewImage.trim(), public_id: '' };
        formData.append('gallery', JSON.stringify([galleryItem]));
      }

      if (this.isEditMode()) {
        await this.#shopTheLookState.updateCampaign(this.lookID()!, formData);
      } else {
        await this.#shopTheLookState.createCampaign(formData);
      }

      this.#router.navigate(['/home/shop-the-look']);
    } catch (error) {
      // Error handled
    } finally {
      this.loading.set(false);
    }
  }
}
