import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import {
  BundlePricingType,
  IProductBundle,
  IProductBundleItem,
} from '../../interfaces/product-bundle.interface';
import { IProduct } from '../../interfaces/product.interface';
import { BusinessProfileService } from '../../services/business-profile.service';
import { NotificationsService } from '../../services/notifications.service';
import { ProductBundleService } from '../../services/product-bundle.service';
import { ProductService } from '../../services/product.service';
import { SidebarService } from '../../services/sidebar.service';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { PageLayout } from '../../shared/components/page-layout/page-layout';

interface BundleItemDraft {
  productId: string;
  productName: string;
  unitPrice: number;
  unitCost: number;
  variantSku: string;
  quantity: number;
  variants: { sku?: string; color?: string; size?: string; price?: number }[];
}

@Component({
  selector: 'app-product-bundles',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, PageLayout, PageHeader],
  templateUrl: './product-bundles.html',
})
export class ProductBundlesComponent implements OnInit {
  private readonly bundleService = inject(ProductBundleService);
  private readonly productService = inject(ProductService);
  private readonly notifications = inject(NotificationsService);
  private readonly sidebarService = inject(SidebarService);
  readonly profile = inject(BusinessProfileService);

  readonly bundleLabel = this.profile.bundleLabel;

  bundles = signal<IProductBundle[]>([]);
  isLoading = signal(true);
  isSaving = signal(false);
  searchTerm = signal('');

  // Modal state
  isModalOpen = signal(false);
  editingId = signal<string | null>(null);
  formName = signal('');
  formSlug = signal('');
  formDescription = signal('');
  formCategory = signal('');
  formPricingType = signal<BundlePricingType>('sum_inherited');
  formBundlePrice = signal<number>(0);
  formDiscountPercentage = signal<number>(0);
  formIsActive = signal<boolean>(true);
  formItems = signal<BundleItemDraft[]>([]);

  // Product picker search
  productQuery = signal('');
  productResults = signal<IProduct[]>([]);
  isSearchingProducts = signal(false);

  readonly filteredBundles = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    if (!term) return this.bundles();
    return this.bundles().filter(
      (b) =>
        b.name.toLowerCase().includes(term) ||
        b.slug.toLowerCase().includes(term) ||
        (b.category || '').toLowerCase().includes(term)
    );
  });

  readonly activeCount = computed(() => this.bundles().filter((b) => b.isActive).length);

  readonly sumItemsPrice = computed(() =>
    this.formItems().reduce((acc, item) => acc + item.unitPrice * item.quantity, 0)
  );

  readonly sumItemsCost = computed(() =>
    this.formItems().reduce((acc, item) => acc + item.unitCost * item.quantity, 0)
  );

  readonly finalPreviewPrice = computed(() => {
    if (this.formPricingType() === 'custom') {
      return this.formBundlePrice();
    }
    const discount = Math.min(100, Math.max(0, this.formDiscountPercentage() || 0));
    return Math.round(this.sumItemsPrice() * (1 - discount / 100));
  });

  ngOnInit(): void {
    this.sidebarService.navbarTitle.set({
      title: this.bundleLabel(),
    });
    this.loadBundles();
    this.searchProducts('');
  }

  loadBundles(): void {
    this.isLoading.set(true);
    this.bundleService.getAll().subscribe({
      next: (res) => {
        this.bundles.set(res.data || []);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.notifications.error(err?.error?.message || 'Error al cargar conjuntos de productos');
        this.isLoading.set(false);
      },
    });
  }

  openCreateModal(): void {
    this.editingId.set(null);
    this.formName.set('');
    this.formSlug.set('');
    this.formDescription.set('');
    this.formCategory.set('');
    this.formPricingType.set('sum_inherited');
    this.formBundlePrice.set(0);
    this.formDiscountPercentage.set(0);
    this.formIsActive.set(true);
    this.formItems.set([]);
    this.productQuery.set('');
    this.isModalOpen.set(true);
  }

  openEditModal(bundle: IProductBundle): void {
    this.editingId.set(bundle._id || null);
    this.formName.set(bundle.name);
    this.formSlug.set(bundle.slug);
    this.formDescription.set(bundle.description || '');
    this.formCategory.set(bundle.category || '');
    this.formPricingType.set(bundle.pricingType);
    this.formBundlePrice.set(bundle.bundlePrice || 0);
    this.formDiscountPercentage.set(bundle.discountPercentage || 0);
    this.formIsActive.set(bundle.isActive !== false);

    const mappedItems: BundleItemDraft[] = (bundle.items || []).map((item) => {
      const populated = typeof item.product === 'object' && item.product !== null ? item.product : null;
      const productId = populated?._id || (typeof item.product === 'string' ? item.product : '');
      const productName = populated?.name || `Producto (${productId.slice(-6)})`;
      const unitPrice = populated?.price || 0;
      const unitCost = populated?.costPrice || 0;
      return {
        productId,
        productName,
        unitPrice,
        unitCost,
        variantSku: item.variantSku || '',
        quantity: item.quantity || 1,
        variants: populated?.variants || [],
      };
    });

    this.formItems.set(mappedItems);
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
  }

  onNameChange(value: string): void {
    this.formName.set(value);
    if (!this.editingId()) {
      this.formSlug.set(this.slugify(value));
    }
  }

  searchProducts(query: string): void {
    this.productQuery.set(query);
    this.isSearchingProducts.set(true);
    this.productService.searchAdminProducts(query, 20).subscribe({
      next: (products) => {
        this.productResults.set(products);
        this.isSearchingProducts.set(false);
      },
      error: () => {
        this.isSearchingProducts.set(false);
      },
    });
  }

  addProductToBundle(product: IProduct): void {
    if (!product._id) return;
    const existing = this.formItems().find(
      (i) => i.productId === product._id && !i.variantSku
    );
    if (existing) {
      this.updateItemQuantity(this.formItems().indexOf(existing), existing.quantity + 1);
      return;
    }

    const draft: BundleItemDraft = {
      productId: product._id,
      productName: product.model || (product as any).name || 'Producto',
      unitPrice: this.getProductPrice(product),
      unitCost: (product as any).costs?.totalCost || (product as any).costPrice || 0,
      variantSku: '',
      quantity: 1,
      variants: (product.variants || []).map((v: any) => ({
        sku: v.sku,
        color: v.color?.name || v.color,
        size: v.size,
        price: v.price,
      })),
    };

    this.formItems.update((items) => [...items, draft]);
  }

  updateItemQuantity(index: number, quantity: number): void {
    const qty = Math.max(1, Number(quantity) || 1);
    this.formItems.update((items) =>
      items.map((item, i) => (i === index ? { ...item, quantity: qty } : item))
    );
  }

  updateItemVariant(index: number, sku: string): void {
    this.formItems.update((items) =>
      items.map((item, i) => (i === index ? { ...item, variantSku: sku } : item))
    );
  }

  removeItem(index: number): void {
    this.formItems.update((items) => items.filter((_, i) => i !== index));
  }

  saveBundle(): void {
    const name = this.formName().trim();
    const slug = (this.formSlug().trim() || this.slugify(name)).trim();
    const items = this.formItems();

    if (!name) {
      this.notifications.warning('Ingresá un nombre para el conjunto');
      return;
    }

    if (items.length < 2) {
      this.notifications.warning('Un conjunto debe incluir al menos 2 productos');
      return;
    }

    const payloadItems: IProductBundleItem[] = items.map((i) => ({
      product: i.productId,
      ...(i.variantSku ? { variantSku: i.variantSku } : {}),
      quantity: i.quantity,
    }));

    const payload: Partial<IProductBundle> = {
      name,
      slug,
      description: this.formDescription().trim() || undefined,
      category: this.formCategory().trim() || undefined,
      items: payloadItems,
      pricingType: this.formPricingType(),
      bundlePrice: this.formPricingType() === 'custom' ? Number(this.formBundlePrice()) || 0 : undefined,
      discountPercentage:
        this.formPricingType() === 'sum_inherited'
          ? Math.min(100, Math.max(0, Number(this.formDiscountPercentage()) || 0))
          : 0,
      isActive: this.formIsActive(),
    };

    this.isSaving.set(true);
    const id = this.editingId();
    const request$ = id ? this.bundleService.update(id, payload) : this.bundleService.create(payload);

    request$.subscribe({
      next: () => {
        this.notifications.success(id ? 'Conjunto actualizado' : 'Conjunto creado');
        this.isSaving.set(false);
        this.closeModal();
        this.loadBundles();
      },
      error: (err) => {
        this.notifications.error(err?.error?.message || 'No se pudo guardar el conjunto');
        this.isSaving.set(false);
      },
    });
  }

  toggleActive(bundle: IProductBundle): void {
    if (!bundle._id) return;
    this.bundleService.update(bundle._id, { isActive: !bundle.isActive }).subscribe({
      next: () => {
        this.notifications.success(
          !bundle.isActive ? 'Conjunto activado' : 'Conjunto desactivado'
        );
        this.loadBundles();
      },
      error: (err) => {
        this.notifications.error(err?.error?.message || 'Error al actualizar estado');
      },
    });
  }

  deleteBundle(bundle: IProductBundle): void {
    if (!bundle._id) return;
    if (!confirm(`¿Eliminar "${bundle.name}"? Esta acción no se puede deshacer.`)) return;

    this.bundleService.delete(bundle._id).subscribe({
      next: () => {
        this.notifications.success('Conjunto eliminado');
        this.loadBundles();
      },
      error: (err) => {
        this.notifications.error(err?.error?.message || 'Error al eliminar el conjunto');
      },
    });
  }

  getProductPrice(product: IProduct): number {
    const p = product.price as any;
    if (typeof p === 'number') return p;
    return p?.cashTransferPrice || p?.listPrice || p?.card_ticket1PayPrice || 0;
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
