import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ProductStatus } from '../../../interfaces/product.interface';
import { IProductWebCatalogFormConfig } from '../../../interfaces/tenant-bootstrap.interface';
import { IProductFormBlock } from '../product-form-block.interface';

@Component({
  selector: 'app-product-catalog-visibility-block',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-4">
      <div class="flex items-center gap-3 border-b border-base-200 pb-3">
        <span class="studio-index text-xs font-bold px-2 py-1 rounded-md bg-primary/10 text-primary">
          {{ blockIndex() }}
        </span>
        <div>
          <h2 class="font-bold text-base text-base-content">
            {{ title() || 'Catálogo Web & Visibilidad' }}
          </h2>
          <p class="text-xs text-base-content/60">
            {{ subtitle() || 'Estado de publicación y destacados en tienda online' }}
          </p>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        @if (webCatalogConfig()?.showStatusSelector) {
          <div class="form-control">
            <label class="label py-1">
              <span class="label-text text-xs font-semibold">
                {{ statusLabel() || 'Estado de publicación' }}
              </span>
            </label>
            <select
              class="select select-bordered select-sm w-full font-semibold"
              [ngModel]="status()"
              (ngModelChange)="statusChange.emit($event)"
            >
              <option value="published">Publicado (Visible en tienda)</option>
              <option value="draft">Borrador (Oculto)</option>
              <option value="paused">Pausado</option>
            </select>
          </div>
        }

        @if (webCatalogConfig()?.showFeaturedToggle) {
          <label class="flex items-center justify-between p-3 rounded-xl bg-base-200/40 border border-base-200 cursor-pointer self-end">
            <div>
              <span class="text-xs font-semibold block">
                {{ featuredLabel() || 'Destacar en Novedades / Portada' }}
              </span>
              <span class="text-[11px] text-base-content/60">
                Prioridad en la portada del catálogo
              </span>
            </div>
            <input
              type="checkbox"
              class="toggle toggle-primary toggle-sm"
              [ngModel]="isFeatured()"
              (ngModelChange)="isFeatured.set($event)"
            />
          </label>
        }
      </div>
    </div>
  `,
})
export class ProductCatalogVisibilityBlockComponent implements IProductFormBlock {
  blockIndex = input.required<string>();
  webCatalogConfig = input<IProductWebCatalogFormConfig | undefined>(undefined);
  title = input<string>('');
  subtitle = input<string>('');
  statusLabel = input<string>('');
  featuredLabel = input<string>('');
  status = input<ProductStatus>('draft');
  statusChange = output<ProductStatus>();

  isFeatured = signal(false);

  validate(): string[] {
    return [];
  }

  hydrate(product: any): void {
    this.isFeatured.set(Boolean(product.isFeatured));
  }

  appendToFormData(formData: FormData): void {
    const cfg = this.webCatalogConfig();
    if (!cfg?.addonEnabled) return;

    if (cfg.showFeaturedToggle) {
      formData.append('isFeatured', String(this.isFeatured()));
    }
  }
}
