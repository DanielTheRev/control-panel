import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import {
  IProductImage,
  IVariantAttribute,
} from '../../../interfaces/product.interface';
import { IProductVariantFormConfig } from '../../../interfaces/tenant-bootstrap.interface';
import { IProductFormBlock } from '../product-form-block.interface';

export interface VariantDraft {
  _id?: string;
  sku: string;
  label: string;
  size: string;
  volume: string;
  colorName: string;
  colorHex: string;
  attributes: IVariantAttribute[];
  stock: number;
  barcode: string;
  isActive: boolean;
  inheritPrice: boolean;
  providerCost: number | null;
  profitMargin: number | null;
  hasCalculatedPrices?: boolean;
}

interface ColorGroupView {
  key: string;
  colorName: string;
  colorHex: string;
  items: Array<{ variant: VariantDraft; index: number }>;
  skus: string[];
}

const FASHION_BULK_PRESETS: ReadonlyArray<{ label: string; sizes: string[] }> = [
  { label: '+ Remera (S - XXL)', sizes: ['S', 'M', 'L', 'XL', 'XXL'] },
  { label: '+ Pantalón (38 - 46)', sizes: ['38', '40', '42', '44', '46'] },
  { label: '+ Calzado (39 - 44)', sizes: ['39', '40', '41', '42', '43', '44'] },
  { label: '+ Único', sizes: ['Único'] },
];

const FASHION_SINGLE_SIZES: ReadonlyArray<string> = [
  'XS',
  'S',
  'M',
  'L',
  'XL',
  'XXL',
  '3XL',
  'Único',
];

@Component({
  selector: 'app-product-variants-block',
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
            <h2 class="font-bold text-base text-base-content">{{ title() }}</h2>
            <p class="text-xs text-base-content/60">
              {{ subtitle() || 'Configurá combinaciones, stock, códigos de barras y precios propios' }}
            </p>
          </div>
        </div>

        @if (isGroupedByColor()) {
          <button type="button" class="btn btn-primary btn-xs gap-1" (click)="addColorGroup()">
            <mat-icon class="!text-[16px] !w-[16px] !h-[16px]">add</mat-icon>
            Añadir Color
          </button>
        } @else {
          <button type="button" class="btn btn-primary btn-xs gap-1" (click)="addPresentationVariant()">
            <mat-icon class="!text-[16px] !w-[16px] !h-[16px]">add</mat-icon>
            Agregar Presentación
          </button>
        }
      </div>

      @if (variants().length === 0) {
        <div class="border border-dashed border-base-300 rounded-2xl p-6 text-center text-xs text-base-content/60 space-y-2">
          <p>
            Producto simple sin variantes.
            @if (isGroupedByColor()) {
              Tocá <strong>+ Añadir Color</strong> para cargar talles, capacidades o colores.
            } @else {
              Tocá <strong>+ Agregar Presentación</strong> si este producto viene en distintos tamaños, packs u orígenes.
            }
          </p>
        </div>
      } @else if (isGroupedByColor()) {
        <!-- MODO AGRUPADO POR COLOR (fashion / tech) -->
        <div class="space-y-4">
          @for (group of colorGroups(); track group.key; let gIdx = $index) {
            <div class="rounded-2xl border border-base-200 bg-base-100 p-4 shadow-2xs space-y-3">
              <!-- Cabecera del Grupo de Color -->
              <div class="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-base-200">
                <div class="flex flex-wrap items-center gap-3">
                  <span class="badge badge-neutral font-bold text-xs px-2.5 py-2">
                    #{{ gIdx + 1 }}
                  </span>

                  <div class="flex items-center gap-2">
                    <div>
                      <span class="text-[10px] font-semibold uppercase tracking-wide text-base-content/55 block mb-0.5">
                        Tono / Hex
                      </span>
                      <input
                        type="color"
                        class="w-9 h-8 rounded-lg border border-base-300 cursor-pointer bg-transparent p-0.5"
                        [ngModel]="group.colorHex"
                        (ngModelChange)="updateGroupColor(group, group.colorName, $event)"
                      />
                    </div>

                    <div>
                      <span class="text-[10px] font-semibold uppercase tracking-wide text-base-content/55 block mb-0.5">
                        Nombre del color
                      </span>
                      <input
                        type="text"
                        class="input input-bordered input-sm w-40 sm:w-48 font-medium"
                        placeholder="Ej: Crema, Negro, Titanio"
                        [ngModel]="group.colorName"
                        (ngModelChange)="updateGroupColor(group, $event, group.colorHex)"
                      />
                    </div>
                  </div>
                </div>

                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    class="btn btn-outline btn-primary btn-xs gap-1"
                    (click)="addVariantToGroup(group)"
                  >
                    <mat-icon class="!text-[15px] !w-[15px] !h-[15px]">add</mat-icon>
                    {{ variantMode() === 'fashion' ? 'Añadir Talle' : 'Añadir Capacidad' }}
                  </button>
                  <button
                    type="button"
                    class="btn btn-ghost btn-xs btn-square text-error"
                    title="Eliminar grupo de color"
                    (click)="removeColorGroup(group)"
                  >
                    <mat-icon class="!text-[17px] !w-[17px] !h-[17px]">delete_outline</mat-icon>
                  </button>
                </div>
              </div>

              <!-- Fotos asignadas al color -->
              @if (enableVariantTagging() && galleryImages().length > 0) {
                <div class="flex flex-wrap items-center gap-2.5 bg-base-200/35 rounded-xl px-3 py-2">
                  <span class="text-[11px] font-semibold text-base-content/65 uppercase tracking-wide">
                    Fotos del color:
                  </span>
                  @if (group.skus.length === 0) {
                    <span class="text-[11px] text-base-content/50">
                      Ingresá un SKU en las filas para vincular fotos desde acá (o vinculalas al editar).
                    </span>
                  } @else {
                    <div class="flex flex-wrap items-center gap-1.5">
                      @for (img of galleryImages(); track getImageKey(img)) {
                        @let linked = isGroupLinkedToImage(img, group.skus);
                        <button
                          type="button"
                          class="relative w-10 h-10 rounded-lg overflow-hidden border transition-all shrink-0"
                          [class.ring-2]="linked"
                          [class.ring-primary]="linked"
                          [class.border-primary]="linked"
                          [class.border-base-300]="!linked"
                          [class.opacity-60]="!linked"
                          [title]="linked ? 'Foto vinculada a este color (clic para quitar)' : 'Vincular foto a este color'"
                          (click)="onToggleImageForSkus(img, group.skus)"
                        >
                          <img [src]="img.url" alt="Foto variante" class="w-full h-full object-cover" />
                          @if (linked) {
                            <span class="absolute bottom-0.5 right-0.5 w-4 h-4 rounded-full bg-primary text-primary-content flex items-center justify-center shadow">
                              <mat-icon class="!text-[11px] !w-[11px] !h-[11px]">check</mat-icon>
                            </span>
                          }
                        </button>
                      }
                    </div>
                  }
                </div>
              }

              <!-- Presets Rápidos (solo cuando variantMode === 'fashion' y showSizeColumn) -->
              @if (variantMode() === 'fashion' && showSizeColumn()) {
                <div class="bg-base-200/45 border border-base-200 rounded-xl px-3 py-2.5 space-y-2">
                  <div class="flex flex-wrap items-center gap-1.5">
                    <span class="text-[11px] font-bold text-base-content/70 flex items-center gap-1 mr-1">
                      <mat-icon class="!text-[14px] !w-[14px] !h-[14px] text-warning">bolt</mat-icon>
                      PRESETS RÁPIDOS:
                    </span>
                    @for (preset of fashionBulkPresets; track preset.label) {
                      <button
                        type="button"
                        class="btn btn-xs h-7 min-h-0 btn-outline border-base-300 bg-base-100 hover:btn-primary font-semibold"
                        (click)="applySizePresetToGroup(group, preset.sizes)"
                      >
                        {{ preset.label }}
                      </button>
                    }
                  </div>
                  <div class="flex flex-wrap items-center gap-1">
                    <span class="text-[10px] font-semibold text-base-content/55 mr-1 uppercase">
                      Sumar 1:
                    </span>
                    @for (sz of fashionSingleSizes; track sz) {
                      <button
                        type="button"
                        class="btn btn-xs h-6 min-h-0 px-2 rounded-full bg-base-100 border border-base-300 hover:border-primary text-[11px] font-medium"
                        (click)="applySizePresetToGroup(group, [sz])"
                      >
                        + {{ sz }}
                      </button>
                    }
                  </div>
                </div>
              }

              <!-- Filas de Variantes dentro del grupo -->
              <div class="space-y-2">
                @for (entry of group.items; track entry.index) {
                  @let v = entry.variant;
                  @let vIdx = entry.index;
                  <div
                    class="rounded-xl border px-3 py-2.5 space-y-2 transition-colors"
                    [class.bg-base-200/35]="v.isActive"
                    [class.border-base-200]="v.isActive"
                    [class.bg-base-200/15]="!v.isActive"
                    [class.border-base-300/60]="!v.isActive"
                    [class.opacity-65]="!v.isActive"
                  >
                    <div class="flex flex-wrap items-center gap-2">
                      <!-- Talle (fashion o si está habilitado) -->
                      @if (showSizeColumn()) {
                        <input
                          type="text"
                          class="input input-bordered input-xs w-16 font-bold text-center bg-base-100"
                          placeholder="Talle"
                          [ngModel]="v.size"
                          (ngModelChange)="updateVariant(vIdx, { size: $event })"
                        />
                      }

                      <!-- Presentación (si está habilitada) -->
                      @if (showVolumeColumn()) {
                        <input
                          type="text"
                          class="input input-bordered input-xs w-32 bg-base-100"
                          placeholder="Presentación"
                          [ngModel]="v.volume"
                          (ngModelChange)="updateVariant(vIdx, { volume: $event })"
                        />
                      }

                      <!-- SKU -->
                      <div class="flex items-center gap-1 bg-base-100 border border-base-300 rounded-lg px-2 h-6">
                        <span class="text-[10px] font-semibold text-base-content/55">SKU:</span>
                        <input
                          type="text"
                          class="bg-transparent outline-none text-xs font-mono w-28 sm:w-36"
                          placeholder="Auto"
                          [ngModel]="v.sku"
                          (ngModelChange)="updateVariant(vIdx, { sku: $event })"
                        />
                      </div>

                      <!-- Stock -->
                      <div class="flex items-center gap-1 bg-base-100 border border-base-300 rounded-lg px-2 h-6">
                        <span class="text-[10px] font-semibold text-base-content/55">Stock:</span>
                        <input
                          type="number"
                          min="0"
                          [step]="isSoldByWeight() ? '0.001' : '1'"
                          class="bg-transparent outline-none text-xs font-semibold tabular-nums w-14 text-right"
                          [ngModel]="v.stock"
                          (ngModelChange)="updateVariant(vIdx, { stock: +$event || 0 })"
                        />
                      </div>

                      <!-- Barcode -->
                      <div class="flex items-center gap-1 bg-base-100 border border-base-300 rounded-lg px-2 h-6">
                        <span class="text-[10px] font-semibold text-base-content/55">EAN:</span>
                        <input
                          type="text"
                          class="bg-transparent outline-none text-xs font-mono w-24"
                          placeholder="Opcional"
                          [ngModel]="v.barcode"
                          (ngModelChange)="updateVariant(vIdx, { barcode: $event })"
                        />
                      </div>

                      <!-- Toggle precio propio (solo si allowPerVariantPrice) -->
                      @if (allowPerVariantPrice()) {
                        <button
                          type="button"
                          class="btn btn-xs h-6 min-h-0 px-2 rounded-full gap-1"
                          [class.btn-primary]="!v.inheritPrice"
                          [class.btn-ghost]="v.inheritPrice"
                          [class.border]="v.inheritPrice"
                          [class.border-base-300]="v.inheritPrice"
                          (click)="updateVariant(vIdx, { inheritPrice: !v.inheritPrice })"
                        >
                          <mat-icon class="!text-[12px] !w-[12px] !h-[12px]">attach_money</mat-icon>
                          {{ v.inheritPrice ? 'Hereda precio' : 'Precio propio' }}
                        </button>
                      }

                      <div class="ml-auto flex items-center gap-2">
                        <label class="flex items-center gap-1.5 cursor-pointer text-[11px] font-medium text-base-content/75">
                          <input
                            type="checkbox"
                            class="toggle toggle-xs toggle-success"
                            [ngModel]="v.isActive"
                            (ngModelChange)="updateVariant(vIdx, { isActive: $event })"
                          />
                          Activo
                        </label>
                        <button
                          type="button"
                          class="btn btn-ghost btn-xs btn-square text-error"
                          title="Quitar variante"
                          (click)="removeVariant(vIdx)"
                        >
                          <mat-icon class="!text-[15px] !w-[15px] !h-[15px]">close</mat-icon>
                        </button>
                      </div>
                    </div>

                    <!-- Atributos dinámicos (en Tech o cuando showAttributesColumn está activo) -->
                    @if (showAttributesColumn()) {
                      <div class="pt-1.5 border-t border-base-200/70 flex flex-wrap items-center gap-1.5">
                        @for (attr of v.attributes; track $index; let aIdx = $index) {
                          <div class="flex items-center gap-1 bg-base-100 border border-base-300 rounded-lg px-1.5 py-0.5">
                            <input
                              type="text"
                              class="bg-transparent outline-none text-[11px] font-semibold w-24"
                              placeholder="Ej: Almacenamiento"
                              [ngModel]="attr.key"
                              (ngModelChange)="updateVariantAttribute(vIdx, aIdx, { key: $event })"
                            />
                            <span class="text-base-content/40 text-xs">:</span>
                            <input
                              type="text"
                              class="bg-transparent outline-none text-[11px] w-20"
                              placeholder="Ej: 256 GB"
                              [ngModel]="attr.value"
                              (ngModelChange)="updateVariantAttribute(vIdx, aIdx, { value: $event })"
                            />
                            <button
                              type="button"
                              class="text-error hover:opacity-80 flex items-center"
                              (click)="removeVariantAttribute(vIdx, aIdx)"
                            >
                              <mat-icon class="!text-[13px] !w-[13px] !h-[13px]">close</mat-icon>
                            </button>
                          </div>
                        }
                        <button
                          type="button"
                          class="btn btn-ghost btn-xs h-6 min-h-0 px-2 text-[11px] text-primary"
                          (click)="addVariantAttribute(vIdx)"
                        >
                          + Atributo
                        </button>
                      </div>
                    }

                    <!-- Precio propio expandido -->
                    @if (allowPerVariantPrice() && !v.inheritPrice) {
                      <div class="pt-1.5 border-t border-base-200/70 flex flex-wrap items-center gap-3 text-xs">
                        <div class="flex items-center gap-1.5">
                          <span class="text-[11px] font-semibold text-base-content/70">Costo Proveedor ($)*:</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            class="input input-bordered input-xs w-28 tabular-nums bg-base-100"
                            placeholder="0.00"
                            [ngModel]="v.providerCost"
                            (ngModelChange)="
                              updateVariant(vIdx, {
                                providerCost: $event === '' || $event === null ? null : +$event
                              })
                            "
                          />
                        </div>

                        @if (allowPerVariantMargin()) {
                          <div class="flex items-center gap-1.5">
                            <span class="text-[11px] font-semibold text-base-content/70">Margen (% opc.):</span>
                            <input
                              type="number"
                              min="0"
                              step="0.1"
                              class="input input-bordered input-xs w-24 tabular-nums bg-base-100"
                              placeholder="Usa base"
                              [ngModel]="v.profitMargin"
                              (ngModelChange)="
                                updateVariant(vIdx, {
                                  profitMargin: $event === '' || $event === null ? null : +$event
                                })
                              "
                            />
                          </div>
                        }

                        <span class="badge badge-info badge-outline badge-xs">
                          {{ v.hasCalculatedPrices ? 'Precios calculados' : 'Calcula Price Builder al guardar' }}
                        </span>
                      </div>
                    }
                  </div>
                }
              </div>
            </div>
          }
        </div>
      } @else {
        <!-- MODO PRESENTACIÓN (lista plana: Kiosco, Bebidas, Verdulería, Bazar) -->
        <div class="space-y-3">
          @for (v of variants(); track $index; let vIdx = $index) {
            <div
              class="rounded-2xl border p-3.5 space-y-2.5 transition-colors"
              [class.bg-base-100]="v.isActive"
              [class.border-base-200]="v.isActive"
              [class.bg-base-200/20]="!v.isActive"
              [class.border-base-300/60]="!v.isActive"
              [class.opacity-65]="!v.isActive"
            >
              <div class="grid grid-cols-12 gap-2.5 items-end">
                <div class="col-span-12 sm:col-span-4">
                  <label class="text-[11px] font-semibold text-base-content/70 block mb-1">
                    Presentación / Volumen / Origen
                  </label>
                  <input
                    type="text"
                    class="input input-bordered input-sm w-full"
                    placeholder="Ej: 1 Litro, Pack x6, Ecuador"
                    [ngModel]="v.volume"
                    (ngModelChange)="updateVariant(vIdx, { volume: $event })"
                  />
                </div>

                <div class="col-span-6 sm:col-span-2">
                  <label class="text-[11px] font-semibold text-base-content/70 block mb-1">
                    Stock {{ isSoldByWeight() ? '(dec.)' : '' }}
                  </label>
                  <input
                    type="number"
                    min="0"
                    [step]="isSoldByWeight() ? '0.001' : '1'"
                    class="input input-bordered input-sm w-full tabular-nums"
                    [ngModel]="v.stock"
                    (ngModelChange)="updateVariant(vIdx, { stock: +$event || 0 })"
                  />
                </div>

                <div class="col-span-6 sm:col-span-2">
                  <label class="text-[11px] font-semibold text-base-content/70 block mb-1">
                    SKU (opc.)
                  </label>
                  <input
                    type="text"
                    class="input input-bordered input-sm w-full font-mono"
                    placeholder="Auto"
                    [ngModel]="v.sku"
                    (ngModelChange)="updateVariant(vIdx, { sku: $event })"
                  />
                </div>

                <div class="col-span-8 sm:col-span-3">
                  <label class="text-[11px] font-semibold text-base-content/70 block mb-1">
                    Código barras
                  </label>
                  <input
                    type="text"
                    class="input input-bordered input-sm w-full font-mono"
                    placeholder="779..."
                    [ngModel]="v.barcode"
                    (ngModelChange)="updateVariant(vIdx, { barcode: $event })"
                  />
                </div>

                <div class="col-span-4 sm:col-span-1 flex items-center justify-end gap-1 pb-1">
                  <input
                    type="checkbox"
                    class="toggle toggle-xs toggle-success"
                    title="Variante activa"
                    [ngModel]="v.isActive"
                    (ngModelChange)="updateVariant(vIdx, { isActive: $event })"
                  />
                  <button
                    type="button"
                    class="btn btn-ghost btn-xs btn-square text-error"
                    title="Quitar presentación"
                    (click)="removeVariant(vIdx)"
                  >
                    <mat-icon class="!text-[16px] !w-[16px] !h-[16px]">delete</mat-icon>
                  </button>
                </div>
              </div>

              <!-- Precio propio y foto asignada en modo presentación -->
              <div class="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-base-200/70">
                @if (allowPerVariantPrice()) {
                  <div class="flex flex-wrap items-center gap-2.5">
                    <label class="flex items-center gap-1.5 cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        class="checkbox checkbox-xs checkbox-primary"
                        [ngModel]="!v.inheritPrice"
                        (ngModelChange)="updateVariant(vIdx, { inheritPrice: !$event })"
                      />
                      <span class="font-medium text-base-content/80">Precio propio</span>
                    </label>

                    @if (!v.inheritPrice) {
                      <div class="flex items-center gap-1">
                        <span class="text-[11px] text-base-content/70">Costo ($)*:</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          class="input input-bordered input-xs w-24 tabular-nums"
                          placeholder="0.00"
                          [ngModel]="v.providerCost"
                          (ngModelChange)="
                            updateVariant(vIdx, {
                              providerCost: $event === '' || $event === null ? null : +$event
                            })
                          "
                        />
                      </div>
                      @if (allowPerVariantMargin()) {
                        <div class="flex items-center gap-1">
                          <span class="text-[11px] text-base-content/70">Margen (%):</span>
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            class="input input-bordered input-xs w-20 tabular-nums"
                            placeholder="Base"
                            [ngModel]="v.profitMargin"
                            (ngModelChange)="
                              updateVariant(vIdx, {
                                profitMargin: $event === '' || $event === null ? null : +$event
                              })
                            "
                          />
                        </div>
                      }
                    }
                  </div>
                }

                @if (enableVariantTagging() && galleryImages().length > 0 && v.sku.trim()) {
                  <div class="flex items-center gap-1.5">
                    <span class="text-[11px] text-base-content/60 font-medium">Fotos:</span>
                    @for (img of galleryImages(); track getImageKey(img)) {
                      @let linked = isGroupLinkedToImage(img, [v.sku.trim()]);
                      <button
                        type="button"
                        class="w-7 h-7 rounded-md overflow-hidden border transition-all"
                        [class.ring-2]="linked"
                        [class.ring-primary]="linked"
                        [class.border-primary]="linked"
                        [class.opacity-55]="!linked"
                        (click)="onToggleImageForSkus(img, [v.sku.trim()])"
                      >
                        <img [src]="img.url" alt="Foto" class="w-full h-full object-cover" />
                      </button>
                    }
                  </div>
                }
              </div>
            </div>
          }
        </div>
      }

      @if (showFits()) {
        <div class="pt-4 border-t border-base-200">
          <div class="form-control max-w-md">
            <label class="label py-1">
              <span class="label-text text-xs font-semibold">Corte / Calce (Fit)</span>
            </label>
            <input
              type="text"
              class="input input-bordered input-sm w-full"
              placeholder="Ej: Oversize, Slim Fit, Regular..."
              [ngModel]="fit()"
              (ngModelChange)="fit.set($event)"
            />
          </div>
        </div>
      }
    </div>
  `,
})
export class ProductVariantsBlockComponent implements IProductFormBlock {
  blockIndex = input.required<string>();
  title = input.required<string>();
  subtitle = input<string>('');
  variantConfig = input<IProductVariantFormConfig | undefined>(undefined);
  isSoldByWeight = input<boolean>(false);
  enableVariantTagging = input<boolean>(false);

  readonly showFits = computed(() => Boolean(this.variantConfig()?.showFits));
  galleryImages = input<IProductImage[]>([]);

  variantsChange = output<VariantDraft[]>();
  toggleImageForSkus = output<{ imageKey: string; skus: string[] }>();

  readonly fashionBulkPresets = FASHION_BULK_PRESETS;
  readonly fashionSingleSizes = FASHION_SINGLE_SIZES;

  variants = signal<VariantDraft[]>([]);
  fit = signal('');

  readonly variantMode = computed(
    () => this.variantConfig()?.variantMode ?? 'presentation'
  );

  readonly isGroupedByColor = computed(() => {
    const mode = this.variantMode();
    return mode === 'fashion' || mode === 'tech';
  });

  readonly showSizeColumn = computed(
    () => this.variantConfig()?.showSizeColumn ?? this.variantMode() === 'fashion'
  );
  readonly showVolumeColumn = computed(
    () => this.variantConfig()?.showVolumeColumn ?? this.variantMode() === 'presentation'
  );
  readonly showAttributesColumn = computed(
    () => this.variantConfig()?.showAttributesColumn ?? this.variantMode() === 'tech'
  );
  readonly allowPerVariantPrice = computed(
    () => Boolean(this.variantConfig()?.allowPerVariantPrice)
  );
  readonly allowPerVariantMargin = computed(
    () => Boolean(this.variantConfig()?.allowPerVariantMargin)
  );

  readonly colorGroups = computed<ColorGroupView[]>(() => {
    const groups: ColorGroupView[] = [];
    const byKey = new Map<string, ColorGroupView>();

    this.variants().forEach((variant, index) => {
      const colorName = variant.colorName.trim();
      const colorHex = variant.colorHex || '#111827';
      const key = `${colorName.toLowerCase()}__${colorHex.toLowerCase()}`;

      let group = byKey.get(key);
      if (!group) {
        group = {
          key,
          colorName: variant.colorName,
          colorHex,
          items: [],
          skus: [],
        };
        byKey.set(key, group);
        groups.push(group);
      }
      group.items.push({ variant, index });
      if (variant.sku.trim()) {
        group.skus.push(variant.sku.trim());
      }
    });

    return groups;
  });

  private emitVariants(): void {
    this.variantsChange.emit(this.variants());
  }

  private createEmptyVariant(overrides: Partial<VariantDraft> = {}): VariantDraft {
    return {
      sku: '',
      label: '',
      size: '',
      volume: '',
      colorName: '',
      colorHex: '#111827',
      attributes:
        this.variantMode() === 'tech'
          ? [{ key: 'Almacenamiento', value: '' }]
          : [],
      stock: 0,
      barcode: '',
      isActive: true,
      inheritPrice: true,
      providerCost: null,
      profitMargin: null,
      ...overrides,
    };
  }

  addColorGroup(): void {
    const groupNumber = this.colorGroups().length + 1;
    this.variants.update((list) => [
      ...list,
      this.createEmptyVariant({
        colorName: `Color ${groupNumber}`,
        colorHex: '#111827',
        size: this.variantMode() === 'fashion' ? 'M' : '',
      }),
    ]);
    this.emitVariants();
  }

  addVariantToGroup(group: ColorGroupView): void {
    this.variants.update((list) => [
      ...list,
      this.createEmptyVariant({
        colorName: group.colorName,
        colorHex: group.colorHex,
      }),
    ]);
    this.emitVariants();
  }

  updateGroupColor(group: ColorGroupView, newName: string, newHex: string): void {
    const indices = new Set(group.items.map((i) => i.index));
    this.variants.update((list) =>
      list.map((v, idx) =>
        indices.has(idx) ? { ...v, colorName: newName, colorHex: newHex } : v
      )
    );
    this.emitVariants();
  }

  removeColorGroup(group: ColorGroupView): void {
    const indices = new Set(group.items.map((i) => i.index));
    this.variants.update((list) => list.filter((_, idx) => !indices.has(idx)));
    this.emitVariants();
  }

  applySizePresetToGroup(group: ColorGroupView, sizes: string[]): void {
    const existingSizes = new Set(
      group.items.map((i) => i.variant.size.trim().toLowerCase()).filter(Boolean)
    );
    const toAdd = sizes.filter((s) => !existingSizes.has(s.toLowerCase()));
    if (toAdd.length === 0) return;

    this.variants.update((list) => [
      ...list,
      ...toAdd.map((sz) =>
        this.createEmptyVariant({
          colorName: group.colorName,
          colorHex: group.colorHex,
          size: sz,
        })
      ),
    ]);
    this.emitVariants();
  }

  addPresentationVariant(): void {
    this.variants.update((list) => [...list, this.createEmptyVariant()]);
    this.emitVariants();
  }

  updateVariant(index: number, patch: Partial<VariantDraft>): void {
    this.variants.update((list) =>
      list.map((item, i) => (i === index ? { ...item, ...patch } : item))
    );
    this.emitVariants();
  }

  removeVariant(index: number): void {
    this.variants.update((list) => list.filter((_, i) => i !== index));
    this.emitVariants();
  }

  addVariantAttribute(variantIndex: number): void {
    this.variants.update((list) =>
      list.map((v, i) =>
        i === variantIndex
          ? { ...v, attributes: [...v.attributes, { key: '', value: '' }] }
          : v
      )
    );
    this.emitVariants();
  }

  updateVariantAttribute(
    variantIndex: number,
    attrIndex: number,
    patch: Partial<IVariantAttribute>
  ): void {
    this.variants.update((list) =>
      list.map((v, i) =>
        i === variantIndex
          ? {
              ...v,
              attributes: v.attributes.map((a, j) =>
                j === attrIndex ? { ...a, ...patch } : a
              ),
            }
          : v
      )
    );
    this.emitVariants();
  }

  removeVariantAttribute(variantIndex: number, attrIndex: number): void {
    this.variants.update((list) =>
      list.map((v, i) =>
        i === variantIndex
          ? { ...v, attributes: v.attributes.filter((_, j) => j !== attrIndex) }
          : v
      )
    );
    this.emitVariants();
  }

  getImageKey(img: IProductImage): string {
    return img.id || img.public_id || img.url;
  }

  isGroupLinkedToImage(img: IProductImage, skus: string[]): boolean {
    if (skus.length === 0 || !Array.isArray(img.variantSkus)) return false;
    return skus.every((s) => img.variantSkus!.includes(s));
  }

  onToggleImageForSkus(img: IProductImage, skus: string[]): void {
    this.toggleImageForSkus.emit({
      imageKey: this.getImageKey(img),
      skus,
    });
  }

  validate(): string[] {
    const errors: string[] = [];
    const weighable = this.isSoldByWeight();

    this.variants().forEach((v, idx) => {
      const stockNum = Number(v.stock);
      if (stockNum < 0 || Number.isNaN(stockNum)) {
        errors.push(`Variante #${idx + 1}: el stock no puede ser negativo.`);
      } else if (!weighable && !Number.isInteger(stockNum)) {
        errors.push(`Variante #${idx + 1}: el stock debe ser entero (activá Venta Fraccionada para decimales).`);
      }

      if (!v.inheritPrice) {
        if (v.providerCost === null || Number(v.providerCost) < 0 || Number.isNaN(Number(v.providerCost))) {
          errors.push(`Variante #${idx + 1}: debés indicar el costo del proveedor para usar precio propio.`);
        }
        if (
          v.profitMargin !== null &&
          (Number(v.profitMargin) < 0 || Number.isNaN(Number(v.profitMargin)))
        ) {
          errors.push(`Variante #${idx + 1}: el margen personalizado no puede ser negativo.`);
        }
      }

      const halfFilledAttr = v.attributes.some(
        (a) => (a.key.trim() && !a.value.trim()) || (!a.key.trim() && a.value.trim())
      );
      if (halfFilledAttr) {
        errors.push(`Variante #${idx + 1}: completá tanto la clave como el valor en todos los atributos.`);
      }
    });

    return errors;
  }

  hydrate(product: any): void {
    const rawVariants: any[] = product.variants || [];
    this.variants.set(
      rawVariants.map((v: any) => ({
        _id: v._id,
        sku: v.sku || '',
        label: v.label || '',
        size: v.size || '',
        volume: v.volume || '',
        colorName: v.color?.name || '',
        colorHex: v.color?.hex || '#111827',
        attributes: Array.isArray(v.attributes)
          ? v.attributes.map((a: any) => ({ key: a.key || '', value: a.value || '' }))
          : [],
        stock: Number(v.stock) || 0,
        barcode: v.barcode || '',
        isActive: v.isActive !== false,
        inheritPrice: v.inheritPrice !== false,
        providerCost: typeof v.providerCost === 'number' ? v.providerCost : null,
        profitMargin: typeof v.profitMargin === 'number' ? v.profitMargin : null,
        hasCalculatedPrices: Boolean(v.prices && Object.keys(v.prices).length > 0),
      }))
    );
    this.fit.set(product.fit || '');
    this.emitVariants();
  }

  getCleanVariantsPayload(): any[] {
    return this.variants().map((v) => {
      const cleanAttrs = v.attributes
        .filter((a) => a.key.trim() && a.value.trim())
        .map((a) => ({ key: a.key.trim(), value: a.value.trim() }));

      return {
        ...(v._id ? { _id: v._id } : {}),
        ...(v.sku.trim() ? { sku: v.sku.trim() } : {}),
        ...(v.label.trim() ? { label: v.label.trim() } : {}),
        ...(v.size.trim() ? { size: v.size.trim() } : {}),
        ...(v.volume.trim() ? { volume: v.volume.trim() } : {}),
        ...(v.colorName.trim()
          ? { color: { name: v.colorName.trim(), hex: v.colorHex || '#111827' } }
          : {}),
        attributes: cleanAttrs,
        stock: Number(v.stock) || 0,
        ...(v.barcode.trim() ? { barcode: v.barcode.trim() } : {}),
        isActive: v.isActive,
        inheritPrice: v.inheritPrice,
        ...(!v.inheritPrice && v.providerCost !== null && !Number.isNaN(Number(v.providerCost))
          ? { providerCost: Number(v.providerCost) }
          : {}),
        ...(!v.inheritPrice && v.profitMargin !== null && !Number.isNaN(Number(v.profitMargin))
          ? { profitMargin: Number(v.profitMargin) }
          : {}),
      };
    });
  }

  appendToFormData(formData: FormData): void {
    formData.append('variants', JSON.stringify(this.getCleanVariantsPayload()));

    if (this.showFits() && this.fit().trim()) {
      formData.append('fit', this.fit().trim());
    }
  }
}
