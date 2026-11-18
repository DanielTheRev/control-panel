import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { IProductImage, ProductStatus } from '../../interfaces/product.interface';
import { BusinessProfileService } from '../../services/business-profile.service';
import {
  MasterCatalogProduct,
  MasterCatalogService,
} from '../../services/master-catalog.service';
import { NotificationsService } from '../../services/notifications.service';
import { SidebarService } from '../../services/sidebar.service';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { PageLayout } from '../../shared/components/page-layout/page-layout';
import { ProductStoreService } from '../../states/product.state.service';
import { ProviderStateService } from '../../states/provider.state.service';
import { StoreConfigStateService } from '../../states/store.config.state.service';
import { TenantBootstrapStateService } from '../../states/tenant-bootstrap.state.service';
import { ProductCatalogVisibilityBlockComponent } from './blocks/catalog-visibility-block.component';
import { ProductCrossSellBlockComponent } from './blocks/cross-sell-block.component';
import { ProductDescriptionsBlockComponent } from './blocks/descriptions-block.component';
import { ProductDetailsBuilderBlockComponent } from './blocks/details-builder-block.component';
import { ProductPricingBlockComponent } from './blocks/pricing-block.component';
import { ProductSeoBlockComponent } from './blocks/seo-block.component';
import { ProductSizeGuideBlockComponent } from './blocks/size-guide-block.component';
import { ProductSpecsMediaBlockComponent } from './blocks/specs-media-block.component';
import { ProductVariantsBlockComponent, VariantDraft } from './blocks/variants-block.component';
import { ProductWeightBlockComponent } from './blocks/weight-block.component';
import { IProductFormBlock } from './product-form-block.interface';

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    RouterLink,
    PageLayout,
    PageHeader,
    ProductPricingBlockComponent,
    ProductWeightBlockComponent,
    ProductVariantsBlockComponent,
    ProductSizeGuideBlockComponent,
    ProductDescriptionsBlockComponent,
    ProductDetailsBuilderBlockComponent,
    ProductCrossSellBlockComponent,
    ProductCatalogVisibilityBlockComponent,
    ProductSpecsMediaBlockComponent,
    ProductSeoBlockComponent,
  ],
  templateUrl: './product-form.html',
  styleUrl: './product-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductFormComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly productState = inject(ProductStoreService);
  private readonly providerState = inject(ProviderStateService);
  private readonly masterCatalogService = inject(MasterCatalogService);
  private readonly notifications = inject(NotificationsService);
  private readonly sidebarService = inject(SidebarService);
  readonly profile = inject(BusinessProfileService);
  readonly bootstrapState = inject(TenantBootstrapStateService);
  private readonly storeConfigState = inject(StoreConfigStateService);

  // Modular Slot Block References
  readonly pricingBlock = viewChild(ProductPricingBlockComponent);
  readonly weightBlock = viewChild(ProductWeightBlockComponent);
  readonly variantsBlock = viewChild(ProductVariantsBlockComponent);
  readonly sizeGuideBlock = viewChild(ProductSizeGuideBlockComponent);
  readonly descriptionsBlock = viewChild(ProductDescriptionsBlockComponent);
  readonly detailsBlock = viewChild(ProductDetailsBuilderBlockComponent);
  readonly crossSellBlock = viewChild(ProductCrossSellBlockComponent);
  readonly catalogBlock = viewChild(ProductCatalogVisibilityBlockComponent);
  readonly specsMediaBlock = viewChild(ProductSpecsMediaBlockComponent);
  readonly seoBlock = viewChild(ProductSeoBlockComponent);

  readonly productID = toSignal(
    this.route.paramMap.pipe(map((p) => p.get('productID'))),
    { initialValue: null }
  );

  readonly isEditMode = computed(() => Boolean(this.productID()));
  readonly cfg = this.profile.productFormConfig;
  readonly providers = computed(() => this.providerState.ProviderState().data || []);

  // Loading & error states (Error-First)
  isLoadingProduct = signal(false);
  loadProductError = signal<string | null>(null);
  isSubmitting = signal(false);
  submitAttempted = signal(false);
  backendError = signal<string | null>(null);
  private readonly loadedProduct = signal<any>(null);
  private readonly hydratedBlocks = new WeakSet<object>();

  // Core Identity & Stock (Shared Orchestrator State)
  name = signal('');
  brand = signal('');
  category = signal('');
  providerId = signal('');
  barcode = signal('');
  netStock = signal<number>(0);
  lowStockThreshold = signal<number>(5);
  status = signal<ProductStatus>('draft');
  isAddingCategory = signal(false);
  isAddingBrand = signal(false);

  readonly availableCategories = computed<string[]>(() => {
    const base = this.storeConfigState.StoreConfig().config?.categories ?? [];
    const current = this.category().trim();
    if (current && !base.includes(current)) {
      return [current, ...base];
    }
    return base;
  });

  readonly availableBrands = computed<string[]>(() => {
    const base = this.storeConfigState.StoreConfig().config?.brands ?? [];
    const current = this.brand().trim();
    if (current && !base.includes(current)) {
      return [current, ...base];
    }
    return base;
  });

  // MasterCatalog Lookup (solo si forms.product.showMasterCatalogLookup === true)
  masterSearchQuery = signal('');
  masterSearchResults = signal<MasterCatalogProduct[]>([]);
  isSearchingMaster = signal(false);
  isLookingUpBarcode = signal(false);
  masterImageUrl = signal<string | null>(null);

  // Live Inspector Snapshots fed by child slot blocks
  pricingSnapshot = signal<{
    providerCost: number | null;
    price: number | null;
    discount: number;
    netMarginPercent?: number | null;
    netProfit?: number | null;
  }>({ providerCost: null, price: null, discount: 0, netMarginPercent: null, netProfit: null });
  variantsSnapshot = signal<VariantDraft[]>([]);
  mediaSnapshot = signal<{ totalCount: number; primaryUrl: string | null }>({
    totalCount: 0,
    primaryUrl: null,
  });
  galleryImagesSnapshot = signal<IProductImage[]>([]);

  onToggleImageForSkus(event: { imageKey: string; skus: string[] }): void {
    this.specsMediaBlock()?.toggleSkusOnImage(event.imageKey, event.skus);
  }

  readonly effectiveStock = computed(() => {
    const vars = this.variantsSnapshot();
    if (vars.length > 0) {
      return vars.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
    }
    return Number(this.netStock()) || 0;
  });

  readonly finalSalePrice = computed(() => {
    const snap = this.pricingSnapshot();
    const base = Number(snap.price) || 0;
    const disc = Math.min(100, Math.max(0, Number(snap.discount) || 0));
    return disc > 0 ? Math.round(base * (1 - disc / 100)) : base;
  });

  readonly marginPercent = computed(() => {
    const snap = this.pricingSnapshot();
    if (typeof snap.netMarginPercent === 'number') {
      return snap.netMarginPercent;
    }
    const cost = Number(snap.providerCost) || 0;
    const sale = this.finalSalePrice();
    if (cost <= 0 || sale <= 0) return null;
    return Math.round(((sale - cost) / cost) * 1000) / 10;
  });

  readonly profitAmount = computed(() => {
    const snap = this.pricingSnapshot();
    if (typeof snap.netProfit === 'number') {
      return snap.netProfit;
    }
    const cost = Number(snap.providerCost) || 0;
    const sale = this.finalSalePrice();
    if (cost <= 0 || sale <= 0) return null;
    return sale - cost;
  });

  readonly primaryPreviewImage = computed(
    () => this.mediaSnapshot().primaryUrl || this.masterImageUrl()
  );

  // Addon-First Labels (sin acoplamiento por rubro)
  readonly weightTitle = computed(() =>
    this.profile.getAddonLabel('weighable', 'weightTitle', this.cfg()?.labels?.weightTitle || 'Venta Fraccionada')
  );
  readonly variantsTitle = computed(() =>
    this.profile.getAddonLabel('variants', 'variantsTitle') ||
    this.profile.getAddonLabel('variant_studio', 'variantsTitle', this.cfg()?.labels?.variantsTitle || 'Variantes')
  );
  readonly variantsSubtitle = computed(() =>
    this.profile.getAddonLabel('variants', 'variantsSubtitle') ||
    this.profile.getAddonLabel('variant_studio', 'variantsSubtitle', '')
  );
  readonly sizeGuideTitle = computed(() =>
    this.profile.getAddonLabel('size_guide', 'sizeGuideTitle', 'Guía de Talles & Medidas')
  );
  readonly sizeGuideSubtitle = computed(() =>
    this.profile.getAddonLabel('size_guide', 'sizeGuideSubtitle', '')
  );
  readonly sizeGuideToleranceLabel = computed(() =>
    this.profile.getAddonLabel('size_guide', 'toleranceLabel', '')
  );
  readonly sizeGuideAddRowLabel = computed(() =>
    this.profile.getAddonLabel('size_guide', 'addRowLabel', '')
  );
  readonly sizeGuideTemplatesLabel = computed(() =>
    this.profile.getAddonLabel('size_guide', 'templatesLabel', '')
  );
  readonly galleryTitle = computed(() =>
    this.profile.getAddonLabel('media_studio', 'galleryTitle') ||
    this.profile.getAddonLabel('product_gallery', 'galleryTitle', 'Galería Multimedia')
  );
  readonly gallerySubtitle = computed(() =>
    this.profile.getAddonLabel('media_studio', 'gallerySubtitle') ||
    this.profile.getAddonLabel('product_gallery', 'gallerySubtitle', '')
  );
  readonly specsTitle = computed(() =>
    this.profile.getAddonLabel('tech_specs', 'specsTitle', this.cfg()?.labels?.specsTitle || 'Especificaciones')
  );
  readonly bundleTitle = computed(() =>
    this.profile.getAddonLabel('product_bundles', 'bundleTitle', this.cfg()?.labels?.bundleTitle || this.cfg()?.bundleLabel || 'Combos')
  );
  readonly descriptionsTitle = computed(() =>
    this.profile.getAddonLabel('product_descriptions', 'title') ||
    this.profile.getAddonLabel('description_builder', 'title', 'Description Builder')
  );
  readonly descriptionsSubtitle = computed(() =>
    this.profile.getAddonLabel('product_descriptions', 'subtitle') ||
    this.profile.getAddonLabel('description_builder', 'subtitle', '')
  );
  readonly descriptionsSubtitleFieldLabel = computed(() =>
    this.profile.getAddonLabel('product_descriptions', 'subtitleFieldLabel') ||
    this.profile.getAddonLabel('description_builder', 'subtitleFieldLabel', '')
  );
  readonly descriptionsShortLabel = computed(() =>
    this.profile.getAddonLabel('product_descriptions', 'shortDescriptionLabel') ||
    this.profile.getAddonLabel('description_builder', 'shortDescriptionLabel', '')
  );
  readonly descriptionsLargeLabel = computed(() =>
    this.profile.getAddonLabel('product_descriptions', 'largeDescriptionLabel') ||
    this.profile.getAddonLabel('description_builder', 'largeDescriptionLabel', '')
  );
  readonly detailsTitle = computed(() =>
    this.profile.getAddonLabel('details_builder', 'title', 'Detalles y Especificaciones')
  );
  readonly detailsSubtitle = computed(() =>
    this.profile.getAddonLabel('details_builder', 'subtitle', '')
  );
  readonly detailsSpecsTitle = computed(() =>
    this.profile.getAddonLabel('details_builder', 'specsTitle', '')
  );
  readonly detailsCareLabel = computed(() =>
    this.profile.getAddonLabel('details_builder', 'careInstructionsLabel', '')
  );
  readonly detailsTagsLabel = computed(() =>
    this.profile.getAddonLabel('details_builder', 'tagsLabel', '')
  );
  readonly detailsFeaturesLabel = computed(() =>
    this.profile.getAddonLabel('details_builder', 'featuresLabel', '')
  );
  readonly webCatalogTitle = computed(() =>
    this.profile.getAddonLabel('web_catalog', 'catalogVisibilityTitle', 'Catálogo Web & Visibilidad')
  );
  readonly webCatalogSubtitle = computed(() =>
    this.profile.getAddonLabel('web_catalog', 'catalogVisibilitySubtitle', '')
  );
  readonly webCatalogStatusLabel = computed(() =>
    this.profile.getAddonLabel('web_catalog', 'statusLabel', '')
  );
  readonly webCatalogFeaturedLabel = computed(() =>
    this.profile.getAddonLabel('web_catalog', 'featuredLabel', '')
  );
  readonly seoTitle = computed(() =>
    this.profile.getAddonLabel('product_seo', 'seoTitle', 'SEO & Metadatos')
  );
  readonly seoSubtitle = computed(() =>
    this.profile.getAddonLabel('product_seo', 'seoSubtitle', '')
  );
  readonly seoMetaTitleLabel = computed(() =>
    this.profile.getAddonLabel('product_seo', 'metaTitleLabel', '')
  );
  readonly seoMetaDescriptionLabel = computed(() =>
    this.profile.getAddonLabel('product_seo', 'metaDescriptionLabel', '')
  );
  readonly seoSlugLabel = computed(() =>
    this.profile.getAddonLabel('product_seo', 'slugLabel', '')
  );
  readonly seoMetaImageLabel = computed(() =>
    this.profile.getAddonLabel('product_seo', 'metaImageLabel', '')
  );
  readonly seoShortDescriptionPreview = computed(
    () => this.descriptionsBlock()?.shortDescription() || ''
  );
  readonly storeDisplayName = computed(
    () => this.bootstrapState.data()?.store?.name || ''
  );
  readonly tenantSlug = computed(
    () => this.bootstrapState.data()?.tenant?.slug || ''
  );
  readonly storeCustomDomain = computed(() => {
    const store = this.bootstrapState.data()?.store;
    return store?.customDomain || store?.publicUrl || '';
  });
  readonly crossSellTitle = computed(() =>
    this.profile.getAddonLabel('cross_sell_studio', 'crossSellTitle', 'Combinalo con')
  );
  readonly crossSellSubtitle = computed(() =>
    this.profile.getAddonLabel('cross_sell_studio', 'crossSellSubtitle', '')
  );
  readonly crossSellSearchPlaceholder = computed(() =>
    this.profile.getAddonLabel('cross_sell_studio', 'searchPlaceholder', '')
  );

  readonly isWeighableActive = computed(() => Boolean(this.weightBlock()?.isSoldByWeight()));

  readonly variantTagOptions = computed(() => {
    const colorMap = new Map<string, { sku: string; skus: string[]; label: string; colorHex: string }>();
    const uncolored: { sku: string; skus: string[]; label: string }[] = [];

    for (const v of this.variantsSnapshot()) {
      const sku = v.sku.trim();
      if (!sku) continue;
      const colorName = v.colorName.trim();
      if (colorName) {
        const key = colorName.toLowerCase();
        const existing = colorMap.get(key);
        if (existing) {
          existing.skus.push(sku);
        } else {
          colorMap.set(key, {
            sku,
            skus: [sku],
            label: colorName,
            colorHex: v.colorHex || '#111827',
          });
        }
      } else {
        uncolored.push({
          sku,
          skus: [sku],
          label: v.label.trim() || [v.size, v.volume].filter(Boolean).join(' · ') || sku,
        });
      }
    }

    return [...colorMap.values(), ...uncolored];
  });

  readonly visibleBlocks = computed<
    { id: string; indexLabel: string; navLabel: string }[]
  >(() => {
    const formCfg = this.cfg();
    if (!formCfg) return [];

    const raw: { id: string; navLabel: string }[] = [
      { id: 'block-general', navLabel: 'General' },
    ];
    if (formCfg.showWeightScalePrice) {
      raw.push({
        id: 'block-weight',
        navLabel: this.weightTitle(),
      });
    }
    if (formCfg.showVariantsGrid) {
      raw.push({
        id: 'block-variants',
        navLabel: this.variantsTitle(),
      });
    }
    if (formCfg.sizeGuideConfig?.addonEnabled) {
      raw.push({
        id: 'block-size-guide',
        navLabel: this.sizeGuideTitle(),
      });
    }
    raw.push({ id: 'block-stock', navLabel: 'Stock' });
    if (formCfg.descriptionConfig?.addonEnabled) {
      raw.push({
        id: 'block-descriptions',
        navLabel: this.descriptionsTitle(),
      });
    }
    if (formCfg.galleryConfig?.addonEnabled) {
      raw.push({
        id: 'block-media',
        navLabel: this.galleryTitle(),
      });
    }
    if (formCfg.detailsConfig?.addonEnabled) {
      raw.push({
        id: 'block-details',
        navLabel: this.detailsTitle(),
      });
    }
    if (formCfg.crossSellConfig?.addonEnabled) {
      raw.push({
        id: 'block-cross-sell',
        navLabel: this.crossSellTitle(),
      });
    }
    if (formCfg.webCatalogConfig?.addonEnabled) {
      raw.push({
        id: 'block-catalog',
        navLabel: this.webCatalogTitle(),
      });
    }
    if (formCfg.seoConfig?.addonEnabled) {
      raw.push({ id: 'block-seo', navLabel: this.seoTitle() });
    }

    return raw.map((item, idx) => ({
      ...item,
      indexLabel: String(idx + 1).padStart(2, '0'),
    }));
  });

  blockNumber(blockId: string): string {
    return this.visibleBlocks().find((b) => b.id === blockId)?.indexLabel || '';
  }

  private getMountedBlocks(): IProductFormBlock[] {
    const blocks: (IProductFormBlock | undefined)[] = [
      this.pricingBlock(),
      this.weightBlock(),
      this.variantsBlock(),
      this.sizeGuideBlock(),
      this.descriptionsBlock(),
      this.specsMediaBlock(),
      this.detailsBlock(),
      this.crossSellBlock(),
      this.catalogBlock(),
      this.seoBlock(),
    ];
    return blocks.filter((b): b is IProductFormBlock => Boolean(b));
  }

  readonly validationErrors = computed<string[]>(() => {
    const errors: string[] = [];

    if (!this.name().trim()) {
      errors.push('El nombre / modelo del producto es obligatorio.');
    }
    if (!this.category().trim()) {
      errors.push('La categoría es obligatoria.');
    }

    for (const block of this.getMountedBlocks()) {
      errors.push(...block.validate());
    }

    return errors;
  });

  readonly isFormValid = computed(() => this.validationErrors().length === 0);

  constructor() {
    effect(() => {
      const product = this.loadedProduct();
      if (!product) return;

      for (const block of this.getMountedBlocks()) {
        if (!this.hydratedBlocks.has(block)) {
          block.hydrate(product);
          this.hydratedBlocks.add(block);
        }
      }
    });
  }

  ngOnInit(): void {
    const id = this.productID();
    this.sidebarService.navbarTitle.set({
      title: id ? 'Editar Producto' : 'Nuevo Producto',
    });

    if (id) {
      this.loadProduct(id);
    }
  }

  async loadProduct(id: string): Promise<void> {
    this.isLoadingProduct.set(true);
    this.loadProductError.set(null);

    try {
      const product: any = await this.productState.getProduct(id);
      if (!product) {
        this.loadProductError.set('El producto solicitado no existe o fue eliminado.');
        return;
      }

      this.name.set(product.name || product.model || '');
      this.brand.set(product.brand || '');
      this.category.set(product.category || '');
      this.providerId.set(
        typeof product.provider === 'object' ? product.provider?._id || '' : product.provider || ''
      );
      this.barcode.set(product.barcode || '');
      this.netStock.set(Number(product.netStock) || 0);
      this.lowStockThreshold.set(Number(product.lowStockThreshold) || 5);
      this.status.set((product.status as ProductStatus) || 'published');

      this.loadedProduct.set(product);
    } catch (err: any) {
      this.loadProductError.set(
        err?.error?.message || err?.message || 'No se pudo cargar el producto para edición.'
      );
    } finally {
      this.isLoadingProduct.set(false);
    }
  }

  retryBootstrap(): void {
    this.bootstrapState.refresh();
  }

  // MasterCatalog (estrictamente bloqueado si showMasterCatalogLookup !== true)
  onBarcodeEnter(event: Event): void {
    if (!this.cfg()?.showMasterCatalogLookup) return;
    event.preventDefault();
    this.lookupMasterBarcode();
  }

  lookupMasterBarcode(): void {
    if (!this.cfg()?.showMasterCatalogLookup) return;
    const code = this.barcode().trim();
    if (!code) {
      this.notifications.warning('Ingresá o escaneá un código de barras primero.');
      return;
    }

    this.isLookingUpBarcode.set(true);
    this.masterCatalogService.lookupBarcode(code).subscribe({
      next: (res) => {
        this.isLookingUpBarcode.set(false);
        if (res.found && res.product) {
          this.applyMasterProduct(res.product);
          this.notifications.success(`Producto encontrado en Catálogo Maestro: ${res.product.name}`);
        } else {
          this.notifications.warning('Código no encontrado en Catálogo Maestro.');
        }
      },
      error: (err) => {
        this.isLookingUpBarcode.set(false);
        this.notifications.error(
          err?.error?.message || 'Error al consultar Catálogo Maestro por código de barras.'
        );
      },
    });
  }

  searchMasterCatalog(query: string): void {
    this.masterSearchQuery.set(query);
    if (!this.cfg()?.showMasterCatalogLookup) return;

    const clean = query.trim();
    if (clean.length < 2) {
      this.masterSearchResults.set([]);
      return;
    }

    this.isSearchingMaster.set(true);
    this.masterCatalogService.search(clean, 10).subscribe({
      next: (res) => {
        this.masterSearchResults.set(res.data || []);
        this.isSearchingMaster.set(false);
      },
      error: (err) => {
        this.isSearchingMaster.set(false);
        this.notifications.error(err?.error?.message || 'Error al buscar en Catálogo Maestro.');
      },
    });
  }

  applyMasterProduct(item: MasterCatalogProduct): void {
    if (item.name) this.name.set(item.name);
    if (item.brand) this.brand.set(item.brand);
    if (item.category) this.category.set(item.category);
    if (item.barcode) this.barcode.set(item.barcode);
    if (item.description) {
      this.descriptionsBlock()?.applyFromMasterCatalog(item.description);
    }
    if (item.suggestedPrice && item.suggestedPrice > 0) {
      this.pricingBlock()?.applySuggestedPrice(item.suggestedPrice);
    }
    if (item.imageUrl) {
      this.masterImageUrl.set(item.imageUrl);
    }
    if (item.isSoldByWeight !== undefined) {
      this.weightBlock()?.applyFromMasterCatalog(Boolean(item.isSoldByWeight), item.unit);
    }

    this.masterSearchResults.set([]);
    this.masterSearchQuery.set('');
  }

  clearMasterImage(): void {
    this.masterImageUrl.set(null);
  }

  scrollToSection(sectionId: string): void {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  async submitForm(): Promise<void> {
    this.submitAttempted.set(true);
    this.backendError.set(null);

    const formCfg = this.cfg();
    if (!formCfg) {
      this.backendError.set(
        'Falta la configuración de formulario (forms.product) desde /api/tenant/bootstrap.'
      );
      return;
    }

    if (!this.isFormValid()) {
      this.notifications.warning('Revisá los campos obligatorios marcados antes de guardar.');
      this.scrollToSection('block-general');
      return;
    }

    const formData = new FormData();
    const trimmedName = this.name().trim();

    formData.append('name', trimmedName);
    formData.append('model', trimmedName);
    if (this.brand().trim()) formData.append('brand', this.brand().trim());
    formData.append('category', this.category().trim());
    if (formCfg.showSupplierSelector && this.providerId()) {
      formData.append('provider', this.providerId());
    }
    if (this.barcode().trim()) formData.append('barcode', this.barcode().trim());
    formData.append('netStock', String(this.effectiveStock()));
    formData.append('lowStockThreshold', String(Number(this.lowStockThreshold()) || 0));
    formData.append('status', this.status());

    for (const block of this.getMountedBlocks()) {
      block.appendToFormData(formData);
    }

    if (this.mediaSnapshot().totalCount === 0 && this.masterImageUrl()) {
      formData.append('masterImageUrl', this.masterImageUrl()!);
    }

    this.isSubmitting.set(true);
    try {
      const showGallery = Boolean(formCfg.galleryConfig?.addonEnabled);
      if (showGallery && this.specsMediaBlock()) {
        await this.specsMediaBlock()!.uploadPendingMediaStudioCrops();
      }
      const payload = this.buildSubmitPayload(formData, showGallery);
      const id = this.productID();
      if (id) {
        await this.productState.updateProduct(id, payload);
      } else {
        await this.productState.createProduct(payload);
      }
      this.router.navigate(['/home/products']);
    } catch (err: any) {
      const detail =
        err?.error?.errors?.[0]?.message ||
        err?.error?.message ||
        err?.message ||
        'Error inesperado al guardar el producto.';
      this.backendError.set(detail);
      this.notifications.error(detail);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  private buildSubmitPayload(
    formData: FormData,
    showGallery: boolean
  ): FormData | Record<string, any> {
    let hasFiles = false;
    formData.forEach((value) => {
      if (value instanceof File) hasFiles = true;
    });

    const specsMedia = this.specsMediaBlock();
    const persistedImages = showGallery && specsMedia ? specsMedia.getPersistedImagesPayload() : [];

    // Si hay archivos binarios (ej: seoImage o galería estándar sin Media Studio), usar FormData
    if (hasFiles) {
      return formData;
    }

    // Sin archivos binarios pendientes: enviar JSON limpio para que images[] (Media Studio) y variants[] lleguen tipados
    const jsonFields = new Set([
      'variants',
      'specifications',
      'careInstructions',
      'features',
      'channelPricing',
      'additionalCosts',
      'paymentRestrictions',
      'seo',
      'sizeGuide',
      'tags',
      'combineWith',
      'deletedImages',
    ]);
    const numericFields = new Set([
      'netStock',
      'lowStockThreshold',
      'providerCost',
      'customProfitMargin',
      'price',
      'discountPercentage',
    ]);
    const booleanFields = new Set([
      'isSoldByWeight',
      'isFeatured',
      'isNew',
      'useCustomProfit',
      'showInWebCatalog',
    ]);

    const payload: Record<string, any> = {};
    formData.forEach((value, key) => {
      if (typeof value !== 'string') return;
      if (jsonFields.has(key)) {
        try {
          payload[key] = JSON.parse(value);
        } catch {
          payload[key] = value;
        }
      } else if (numericFields.has(key)) {
        const n = Number(value);
        payload[key] = Number.isNaN(n) ? value : n;
      } else if (booleanFields.has(key)) {
        payload[key] = value === 'true';
      } else {
        payload[key] = value;
      }
    });

    if (showGallery) {
      payload['images'] = persistedImages;
    }

    return payload;
  }
}
