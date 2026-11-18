import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { IProductCrossSellFormConfig } from '../../../interfaces/tenant-bootstrap.interface';
import { NotificationsService } from '../../../services/notifications.service';
import { IProductFormBlock } from '../product-form-block.interface';

interface CrossSellVariantOption {
  sku: string;
  label: string;
  colorName: string | null;
}

interface CrossSellDraft {
  productId: string;
  name: string;
  subtitle: string;
  imageUrl: string | null;
  variantSku: string | null;
  color: string | null;
  variants: CrossSellVariantOption[];
}

@Component({
  selector: 'app-product-cross-sell-block',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-4">
      <!-- Header -->
      <div class="flex flex-wrap items-center justify-between gap-2 border-b border-base-200 pb-3">
        <div class="flex items-center gap-3">
          <span class="studio-index text-xs font-bold px-2 py-1 rounded-md bg-primary/10 text-primary">
            {{ blockIndex() }}
          </span>
          <div>
            <h2 class="font-bold text-base text-base-content">
              {{ title() || 'Cross-Sell Studio · Combinalo con' }}
            </h2>
            <p class="text-xs text-base-content/60">
              {{ subtitle() || 'Vinculá productos complementarios para sugerir looks o accesorios relacionados.' }}
            </p>
          </div>
        </div>

        <span class="badge badge-ghost badge-sm font-medium tabular-nums">
          {{ items().length }} / {{ maxItems() }}
        </span>
      </div>

      <!-- Buscador de productos del catálogo -->
      <div class="space-y-2">
        <label class="input input-bordered input-sm flex items-center gap-2 w-full">
          <mat-icon class="!text-[16px] !w-[16px] !h-[16px] text-base-content/50">search</mat-icon>
          <input
            type="text"
            class="grow text-xs"
            [placeholder]="searchPlaceholder() || 'Buscar producto por nombre, marca o SKU para vincular...'"
            [disabled]="items().length >= maxItems()"
            [ngModel]="searchQuery()"
            (ngModelChange)="onSearchChange($event)"
          />
          @if (isSearching()) {
            <span class="loading loading-spinner loading-xs text-primary"></span>
          } @else if (searchQuery()) {
            <button
              type="button"
              class="btn btn-ghost btn-xs btn-square"
              (click)="clearSearch()"
            >
              ×
            </button>
          }
        </label>

        @if (searchResults().length > 0) {
          <div class="bg-base-100 border border-base-300 rounded-xl shadow-md max-h-60 overflow-y-auto divide-y divide-base-200">
            @for (prod of searchResults(); track prod._id) {
              @let alreadyAdded = isProductAdded(prod._id);
              <button
                type="button"
                class="w-full px-3 py-2 text-left hover:bg-base-200/60 flex items-center justify-between gap-3 text-xs transition-colors"
                [disabled]="(alreadyAdded && !allowVariantSelection()) || items().length >= maxItems()"
                (click)="addProduct(prod)"
              >
                <div class="flex items-center gap-2.5 min-w-0">
                  @if (extractImageUrl(prod); as thumb) {
                    <img [src]="thumb" alt="" class="w-9 h-9 rounded-md object-cover border border-base-200 shrink-0" />
                  } @else {
                    <div class="w-9 h-9 rounded-md bg-base-200 flex items-center justify-center text-base-content/40 shrink-0">
                      <mat-icon class="!text-[16px] !w-[16px] !h-[16px]">inventory_2</mat-icon>
                    </div>
                  }
                  <div class="min-w-0">
                    <p class="font-semibold text-base-content truncate">
                      {{ extractProductName(prod) }}
                    </p>
                    <p class="text-[11px] text-base-content/55 truncate">
                      {{ extractProductSubtitle(prod) }}
                    </p>
                  </div>
                </div>

                @if (alreadyAdded && !allowVariantSelection()) {
                  <span class="badge badge-ghost badge-xs shrink-0">Agregado</span>
                } @else {
                  <span class="badge badge-primary badge-outline badge-xs shrink-0">+ Vincular</span>
                }
              </button>
            }
          </div>
        }
      </div>

      <!-- Lista de productos vinculados -->
      @if (items().length === 0) {
        <p class="text-xs text-base-content/50">
          Sin productos vinculados todavía. Buscá arriba para sugerir complementos en la ficha del producto.
        </p>
      } @else {
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          @for (item of items(); track item.productId + '_' + ($index)) {
            <div class="rounded-xl border border-base-300 bg-base-100 p-3 flex items-start gap-3 shadow-2xs">
              @if (item.imageUrl) {
                <img
                  [src]="item.imageUrl"
                  [alt]="item.name"
                  class="w-12 h-12 rounded-lg object-cover border border-base-200 shrink-0"
                />
              } @else {
                <div class="w-12 h-12 rounded-lg bg-base-200 flex items-center justify-center text-base-content/40 shrink-0">
                  <mat-icon class="!text-[20px] !w-[20px] !h-[20px]">inventory_2</mat-icon>
                </div>
              }

              <div class="flex-1 min-w-0 space-y-1.5">
                <div class="flex items-start justify-between gap-2">
                  <div class="min-w-0">
                    <p class="text-xs font-bold text-base-content truncate">{{ item.name }}</p>
                    @if (item.subtitle) {
                      <p class="text-[11px] text-base-content/55 truncate">{{ item.subtitle }}</p>
                    }
                  </div>
                  <button
                    type="button"
                    class="btn btn-ghost btn-xs btn-square text-error shrink-0"
                    title="Quitar producto vinculado"
                    (click)="removeItem($index)"
                  >
                    <mat-icon class="!text-[15px] !w-[15px] !h-[15px]">close</mat-icon>
                  </button>
                </div>

                @if (allowVariantSelection() && item.variants.length > 0) {
                  <select
                    class="select select-bordered select-xs w-full"
                    [ngModel]="item.variantSku || ''"
                    (ngModelChange)="onVariantChange($index, $event)"
                  >
                    <option value="">Cualquier variante / Producto general</option>
                    @for (v of item.variants; track v.sku) {
                      <option [value]="v.sku">{{ v.label }}</option>
                    }
                  </select>
                }
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class ProductCrossSellBlockComponent implements IProductFormBlock {
  private readonly http = inject(HttpClient);
  private readonly notifications = inject(NotificationsService);

  blockIndex = input.required<string>();
  title = input<string>('');
  subtitle = input<string>('');
  searchPlaceholder = input<string>('');
  crossSellConfig = input<IProductCrossSellFormConfig | undefined>(undefined);
  currentProductId = input<string | null>(null);

  readonly allowVariantSelection = computed(
    () => Boolean(this.crossSellConfig()?.allowVariantSelection)
  );
  readonly maxItems = computed(() => this.crossSellConfig()?.maxItems ?? 8);

  items = signal<CrossSellDraft[]>([]);
  searchQuery = signal('');
  searchResults = signal<any[]>([]);
  isSearching = signal(false);

  private searchDebounceTimer: any = null;

  onSearchChange(query: string): void {
    this.searchQuery.set(query);
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }

    const q = query.trim();
    if (q.length < 2) {
      this.searchResults.set([]);
      this.isSearching.set(false);
      return;
    }

    this.isSearching.set(true);
    this.searchDebounceTimer = setTimeout(() => {
      this.executeSearch(q);
    }, 280);
  }

  private async executeSearch(q: string): Promise<void> {
    try {
      const res: any = await firstValueFrom(
        this.http.get(`${environment.apiUrl}/products/admin/list`, {
          params: { q, page: 1, limit: 12 },
        })
      );
      const list: any[] = res?.data?.docs || res?.data || res?.docs || [];
      const selfId = this.currentProductId();
      this.searchResults.set(list.filter((p) => p?._id && p._id !== selfId));
    } catch {
      this.searchResults.set([]);
    } finally {
      this.isSearching.set(false);
    }
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.searchResults.set([]);
    this.isSearching.set(false);
  }

  isProductAdded(productId: string): boolean {
    return this.items().some((i) => i.productId === productId);
  }

  extractProductName(prod: any): string {
    return prod?.model || prod?.name || 'Producto';
  }

  extractProductSubtitle(prod: any): string {
    return [prod?.brand, prod?.category].filter(Boolean).join(' · ');
  }

  extractImageUrl(prod: any): string | null {
    const imgs = prod?.images;
    if (!Array.isArray(imgs) || imgs.length === 0) return null;
    const main = imgs.find((i: any) => i?.isMain) ?? imgs[0];
    return main?.url || null;
  }

  private extractVariants(prod: any): CrossSellVariantOption[] {
    if (!Array.isArray(prod?.variants)) return [];
    return prod.variants
      .filter((v: any) => Boolean(v?.sku))
      .map((v: any) => {
        const sku = String(v.sku).trim();
        const colorName = v.color?.name ? String(v.color.name).trim() : null;
        const label =
          (v.label && String(v.label).trim()) ||
          [colorName, v.size, v.volume].filter(Boolean).join(' · ') ||
          sku;
        return { sku, label, colorName };
      });
  }

  addProduct(prod: any): void {
    if (!prod?._id) return;
    if (this.items().length >= this.maxItems()) {
      this.notifications.warning(`Máximo ${this.maxItems()} productos vinculados.`);
      return;
    }
    if (!this.allowVariantSelection() && this.isProductAdded(prod._id)) {
      return;
    }

    const variants = this.extractVariants(prod);
    this.items.update((curr) => [
      ...curr,
      {
        productId: prod._id,
        name: this.extractProductName(prod),
        subtitle: this.extractProductSubtitle(prod),
        imageUrl: this.extractImageUrl(prod),
        variantSku: null,
        color: null,
        variants,
      },
    ]);
    this.clearSearch();
  }

  onVariantChange(index: number, sku: string): void {
    const cleanSku = sku.trim() || null;
    this.items.update((curr) =>
      curr.map((item, i) => {
        if (i !== index) return item;
        const matched = cleanSku ? item.variants.find((v) => v.sku === cleanSku) : null;
        return {
          ...item,
          variantSku: cleanSku,
          color: matched?.colorName ?? null,
        };
      })
    );
  }

  removeItem(index: number): void {
    this.items.update((curr) => curr.filter((_, i) => i !== index));
  }

  validate(): string[] {
    return [];
  }

  hydrate(product: any): void {
    const rawList = product?.combineWith;
    if (!Array.isArray(rawList)) return;

    const drafts: CrossSellDraft[] = [];
    const unresolvedIds: string[] = [];

    for (const entry of rawList) {
      if (!entry) continue;
      if (typeof entry === 'string') {
        unresolvedIds.push(entry);
        drafts.push({
          productId: entry,
          name: 'Cargando producto...',
          subtitle: '',
          imageUrl: null,
          variantSku: null,
          color: null,
          variants: [],
        });
        continue;
      }

      const prodObj = typeof entry.product === 'object' && entry.product ? entry.product : null;
      const productId = prodObj?._id || (typeof entry.product === 'string' ? entry.product : entry._id);
      if (!productId) continue;

      if (!prodObj) {
        unresolvedIds.push(productId);
      }

      drafts.push({
        productId,
        name: prodObj ? this.extractProductName(prodObj) : 'Cargando producto...',
        subtitle: prodObj ? this.extractProductSubtitle(prodObj) : '',
        imageUrl: prodObj ? this.extractImageUrl(prodObj) : null,
        variantSku: entry.variantSku ?? null,
        color: entry.color ?? null,
        variants: prodObj ? this.extractVariants(prodObj) : [],
      });
    }

    this.items.set(drafts);

    // Resolver en background cualquier ID que no vino populado
    for (const id of Array.from(new Set(unresolvedIds))) {
      this.resolveUnpopulatedProduct(id);
    }
  }

  private async resolveUnpopulatedProduct(id: string): Promise<void> {
    try {
      const res: any = await firstValueFrom(
        this.http.get(`${environment.apiUrl}/products/${encodeURIComponent(id)}`)
      );
      const prod = res?.data || res;
      if (!prod?._id) return;
      const variants = this.extractVariants(prod);
      this.items.update((curr) =>
        curr.map((item) =>
          item.productId === id
            ? {
                ...item,
                name: this.extractProductName(prod),
                subtitle: this.extractProductSubtitle(prod),
                imageUrl: this.extractImageUrl(prod),
                variants,
              }
            : item
        )
      );
    } catch {
      // Si el producto vinculado fue eliminado, mantenemos la referencia con nombre claro
      this.items.update((curr) =>
        curr.map((item) =>
          item.productId === id && item.name === 'Cargando producto...'
            ? { ...item, name: 'Producto no disponible' }
            : item
        )
      );
    }
  }

  appendToFormData(formData: FormData): void {
    const cfg = this.crossSellConfig();
    if (!cfg?.addonEnabled) return;

    const payload = this.items().map((item) => ({
      product: item.productId,
      variantSku: item.variantSku ?? null,
      color: item.color ?? null,
    }));
    formData.append('combineWith', JSON.stringify(payload));
  }
}
