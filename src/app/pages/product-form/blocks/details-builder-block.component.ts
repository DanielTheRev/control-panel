import { CommonModule } from '@angular/common';
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
import {
  IProductDetailsFormConfig,
  IProductSpecFieldSchema,
} from '../../../interfaces/tenant-bootstrap.interface';
import { DetailsBuilderService } from '../../../services/details-builder.service';
import { NotificationsService } from '../../../services/notifications.service';
import { IProductFormBlock } from '../product-form-block.interface';

export interface SpecRowDraft {
  key: string;
  value: string;
  isFeatured: boolean;
}

@Component({
  selector: 'app-product-details-builder-block',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-5">
      <!-- Header -->
      <div class="flex items-center gap-3 border-b border-base-200 pb-3">
        <span class="studio-index text-xs font-bold px-2 py-1 rounded-md bg-primary/10 text-primary">
          {{ blockIndex() }}
        </span>
        <div>
          <h2 class="font-bold text-base text-base-content">{{ title() }}</h2>
          <p class="text-xs text-base-content/60">
            {{ subtitle() || 'Ficha técnica, cuidados y etiquetas de búsqueda' }}
          </p>
        </div>
      </div>

      <!-- ZONA A: CAMPOS ESTRUCTURADOS (detailsConfig.specFields) -->
      @if (specFields().length > 0) {
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-base-200/35 border border-base-200">
          @for (field of specFields(); track field.key) {
            <div class="form-control">
              <label class="label py-1 justify-between">
                <span class="label-text text-xs font-semibold">
                  {{ field.key }}
                  @if (field.required) {
                    <span class="text-error">*</span>
                  }
                </span>
                @if (field.allowFeatured) {
                  <button
                    type="button"
                    class="btn btn-ghost btn-xs btn-square h-5 min-h-0 w-5"
                    [class.text-warning]="specFieldFeatured()[field.key]"
                    [class.text-base-content/30]="!specFieldFeatured()[field.key]"
                    [title]="specFieldFeatured()[field.key] ? 'Destacado en ficha (quitar)' : 'Destacar en ficha'"
                    (click)="toggleSpecFieldFeatured(field.key)"
                  >
                    <mat-icon class="!text-[15px] !w-[15px] !h-[15px]">
                      {{ specFieldFeatured()[field.key] ? 'star' : 'star_border' }}
                    </mat-icon>
                  </button>
                }
              </label>

              @if (field.inputType === 'select') {
                <div class="space-y-1.5">
                  <div class="flex items-center gap-1.5">
                    <select
                      class="select select-bordered select-sm flex-1"
                      [ngModel]="specFieldValues()[field.key] || ''"
                      (ngModelChange)="setSpecFieldValue(field.key, $event)"
                    >
                      <option value="">{{ field.placeholder || 'Seleccionar...' }}</option>
                      @for (opt of getSelectOptions(field); track opt) {
                        <option [value]="opt">{{ opt }}</option>
                      }
                    </select>
                    @if (field.allowMerchantAddOption) {
                      <button
                        type="button"
                        class="btn btn-outline btn-sm shrink-0"
                        title="Agregar nueva opción"
                        (click)="openAddOptionFor(field.key)"
                      >
                        + Agregar
                      </button>
                    }
                  </div>

                  @if (field.allowMerchantAddOption && addingOptionForKey() === field.key) {
                    <div class="flex items-center gap-1.5">
                      <input
                        type="text"
                        class="input input-bordered input-sm flex-1"
                        placeholder="Nueva opción..."
                        [ngModel]="newOptionInput()"
                        (ngModelChange)="newOptionInput.set($event)"
                        (keydown.enter)="confirmAddCustomOption($event, field.key)"
                      />
                      <button
                        type="button"
                        class="btn btn-primary btn-sm"
                        [disabled]="!newOptionInput().trim() || isSavingOption()"
                        (click)="applyCustomOption(field.key)"
                      >
                        @if (isSavingOption()) {
                          <span class="loading loading-spinner loading-xs"></span>
                        } @else {
                          Agregar
                        }
                      </button>
                      <button
                        type="button"
                        class="btn btn-ghost btn-sm"
                        (click)="addingOptionForKey.set(null)"
                      >
                        ×
                      </button>
                    </div>
                  }
                </div>
              } @else {
                <input
                  type="text"
                  class="input input-bordered input-sm w-full"
                  [placeholder]="field.placeholder || ''"
                  [ngModel]="specFieldValues()[field.key] || ''"
                  (ngModelChange)="setSpecFieldValue(field.key, $event)"
                />
              }
            </div>
          }
        </div>
      }

      <!-- ZONA B: ESPECIFICACIONES CLAVE-VALOR (CON ESTRELLA isFeatured) -->
      @if (detailsConfig()?.showSpecifications) {
        <div class="space-y-3">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span class="text-xs font-bold text-base-content/85 block">
                {{ specsTitle() || 'Especificaciones (Clave - Valor)' }}
              </span>
              <span class="text-[11px] text-base-content/55">
                Marcá con ★ los atributos clave para destacarlos en la ficha del producto.
              </span>
            </div>

            <div class="flex items-center gap-2">
              @if (detailsConfig()?.allowBulkPaste) {
                <button
                  type="button"
                  class="btn btn-ghost btn-xs border border-base-300 gap-1"
                  (click)="showBulkPaste.set(!showBulkPaste())"
                >
                  <mat-icon class="!text-[14px] !w-[14px] !h-[14px]">content_paste</mat-icon>
                  Pegar en Lote
                </button>
              }
              <button type="button" class="btn btn-outline btn-xs gap-1" (click)="addSpecification()">
                <mat-icon class="!text-[15px] !w-[15px] !h-[15px]">add</mat-icon>
                Agregar fila
              </button>
            </div>
          </div>

          @if (availableSuggestedSpecKeys().length > 0) {
            <div class="flex flex-wrap items-center gap-1.5">
              <span class="text-[11px] text-base-content/55 mr-1">Sugeridos:</span>
              @for (key of availableSuggestedSpecKeys(); track key) {
                <button
                  type="button"
                  class="badge badge-sm badge-outline hover:badge-primary cursor-pointer gap-1 font-medium"
                  (click)="addSuggestedSpecKey(key)"
                >
                  <span>+ {{ key }}</span>
                </button>
              }
            </div>
          }

          @if (detailsConfig()?.allowBulkPaste && showBulkPaste()) {
            <div class="p-3 rounded-xl bg-base-200/50 border border-base-300 space-y-2">
              <label class="text-[11px] font-semibold text-base-content/75 block">
                Pegá una especificación por línea (ej: <code class="font-mono">Tela: Tricot</code> o separado por tabulación)
              </label>
              <textarea
                rows="4"
                class="textarea textarea-bordered textarea-xs w-full font-mono text-xs"
                placeholder="Diseño: Body corsetero&#10;Tela: Tricot&#10;Composición: 85% poliéster y 15% spandex"
                [ngModel]="bulkPasteText()"
                (ngModelChange)="bulkPasteText.set($event)"
              ></textarea>
              <div class="flex justify-end gap-2">
                <button type="button" class="btn btn-ghost btn-xs" (click)="showBulkPaste.set(false)">
                  Cancelar
                </button>
                <button type="button" class="btn btn-primary btn-xs" (click)="applyBulkPaste()">
                  Importar filas
                </button>
              </div>
            </div>
          }

          @if (specifications().length === 0) {
            <p class="text-xs text-base-content/50">
              Sin especificaciones cargadas. Agregá filas o tocá una clave sugerida.
            </p>
          } @else {
            <div class="space-y-2">
              @for (spec of specifications(); track $index) {
                <div class="grid grid-cols-12 gap-2 items-center">
                  <button
                    type="button"
                    class="btn btn-ghost btn-xs btn-square col-span-1"
                    [class.text-warning]="spec.isFeatured"
                    [class.text-base-content/30]="!spec.isFeatured"
                    [title]="spec.isFeatured ? 'Destacado en ficha (quitar)' : 'Destacar en ficha'"
                    (click)="updateSpecification($index, { isFeatured: !spec.isFeatured })"
                  >
                    <mat-icon class="!text-[18px] !w-[18px] !h-[18px]">
                      {{ spec.isFeatured ? 'star' : 'star_border' }}
                    </mat-icon>
                  </button>

                  <input
                    type="text"
                    class="input input-bordered input-xs col-span-4"
                    placeholder="Atributo (ej: Material)"
                    [ngModel]="spec.key"
                    (ngModelChange)="updateSpecification($index, { key: $event })"
                  />

                  <input
                    type="text"
                    class="input input-bordered input-xs col-span-6"
                    placeholder="Valor (ej: Algodón 100%)"
                    [ngModel]="spec.value"
                    (ngModelChange)="updateSpecification($index, { value: $event })"
                  />

                  <button
                    type="button"
                    class="btn btn-ghost btn-xs btn-square text-error col-span-1 justify-self-end"
                    (click)="removeSpecification($index)"
                  >
                    <mat-icon class="!text-[16px] !w-[16px] !h-[16px]">close</mat-icon>
                  </button>
                </div>
              }
            </div>
          }
        </div>
      }

      <!-- 2. CUIDADOS Y MANTENIMIENTO -->
      @if (detailsConfig()?.showCareInstructions) {
        <div class="pt-4 border-t border-base-200 space-y-2.5">
          <label class="text-xs font-bold text-base-content/85 block">
            {{ careInstructionsLabel() || 'Cuidados y Mantenimiento' }}
          </label>

          @if (availableSuggestedCareChips().length > 0) {
            <div class="flex flex-wrap items-center gap-1.5">
              <span class="text-[11px] text-base-content/55 mr-1">Sugeridos:</span>
              @for (chip of availableSuggestedCareChips(); track chip) {
                <button
                  type="button"
                  class="badge badge-sm badge-outline hover:badge-primary cursor-pointer font-medium"
                  (click)="addCareInstruction(chip)"
                >
                  + {{ chip }}
                </button>
              }
            </div>
          }

          <div class="flex gap-2">
            <input
              type="text"
              class="input input-bordered input-xs flex-1"
              placeholder="Ej: Lavar a mano con agua fría..."
              [ngModel]="careInput()"
              (ngModelChange)="careInput.set($event)"
              (keydown.enter)="onAddCareEnter($event)"
            />
            <button
              type="button"
              class="btn btn-outline btn-xs"
              [disabled]="!careInput().trim()"
              (click)="addCareFromInput()"
            >
              Agregar
            </button>
          </div>

          @if (careInstructions().length > 0) {
            <div class="flex flex-wrap gap-1.5">
              @for (item of careInstructions(); track item) {
                <span class="badge badge-sm bg-base-200 border-base-300 gap-1.5 py-2.5 font-medium">
                  {{ item }}
                  <button
                    type="button"
                    class="text-base-content/50 hover:text-error"
                    (click)="removeCareInstruction(item)"
                  >
                    ✕
                  </button>
                </span>
              }
            </div>
          }
        </div>
      }

      <!-- 3. ETIQUETAS DE BÚSQUEDA (TAGS) -->
      @if (detailsConfig()?.showTags) {
        <div class="pt-4 border-t border-base-200 space-y-2.5">
          <label class="text-xs font-bold text-base-content/85 block">
            {{ tagsLabel() || 'Etiquetas / Tags de búsqueda' }}
          </label>

          <div class="flex gap-2">
            <input
              type="text"
              class="input input-bordered input-xs flex-1"
              placeholder="Escribí una etiqueta y presioná Enter (ej: verano, oferta)"
              [ngModel]="tagInput()"
              (ngModelChange)="tagInput.set($event)"
              (keydown.enter)="onAddTagEnter($event)"
            />
            <button
              type="button"
              class="btn btn-outline btn-xs"
              [disabled]="!tagInput().trim()"
              (click)="addTagFromInput()"
            >
              Agregar
            </button>
          </div>

          @if (tags().length > 0) {
            <div class="flex flex-wrap gap-1.5">
              @for (tag of tags(); track tag) {
                <span class="badge badge-sm badge-primary badge-outline gap-1.5 py-2.5 font-medium">
                  #{{ tag }}
                  <button
                    type="button"
                    class="hover:text-error"
                    (click)="removeTag(tag)"
                  >
                    ✕
                  </button>
                </span>
              }
            </div>
          }
        </div>
      }

      <!-- 4. CARACTERÍSTICAS DESTACADAS EXTRA (FEATURES) -->
      @if (detailsConfig()?.showFeatures) {
        <div class="pt-4 border-t border-base-200 space-y-2.5">
          <label class="text-xs font-bold text-base-content/85 block">
            {{ featuresLabel() || 'Características extra' }}
          </label>

          <div class="flex gap-2">
            <input
              type="text"
              class="input input-bordered input-xs flex-1"
              placeholder="Ej: Costura reforzada, Garantía 12 meses..."
              [ngModel]="featureInput()"
              (ngModelChange)="featureInput.set($event)"
              (keydown.enter)="onAddFeatureEnter($event)"
            />
            <button
              type="button"
              class="btn btn-outline btn-xs"
              [disabled]="!featureInput().trim()"
              (click)="addFeatureFromInput()"
            >
              Agregar
            </button>
          </div>

          @if (features().length > 0) {
            <div class="flex flex-wrap gap-1.5">
              @for (feat of features(); track feat) {
                <span class="badge badge-sm bg-base-200 border-base-300 gap-1.5 py-2.5 font-medium">
                  {{ feat }}
                  <button
                    type="button"
                    class="text-base-content/50 hover:text-error"
                    (click)="removeFeature(feat)"
                  >
                    ✕
                  </button>
                </span>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class ProductDetailsBuilderBlockComponent implements IProductFormBlock {
  private readonly detailsBuilderService = inject(DetailsBuilderService);
  private readonly notifications = inject(NotificationsService);

  blockIndex = input.required<string>();
  title = input<string>('Detalles y Especificaciones');
  subtitle = input<string>('');
  specsTitle = input<string>('');
  careInstructionsLabel = input<string>('');
  tagsLabel = input<string>('');
  featuresLabel = input<string>('');
  detailsConfig = input<IProductDetailsFormConfig | undefined>(undefined);

  specifications = signal<SpecRowDraft[]>([]);
  specFieldValues = signal<Record<string, string>>({});
  specFieldFeatured = signal<Record<string, boolean>>({});
  customOptionsByKey = signal<Record<string, string[]>>({});
  addingOptionForKey = signal<string | null>(null);
  newOptionInput = signal('');
  isSavingOption = signal(false);

  careInstructions = signal<string[]>([]);
  tags = signal<string[]>([]);
  features = signal<string[]>([]);

  showBulkPaste = signal(false);
  bulkPasteText = signal('');
  careInput = signal('');
  tagInput = signal('');
  featureInput = signal('');

  readonly specFields = computed<IProductSpecFieldSchema[]>(
    () => this.detailsConfig()?.specFields ?? []
  );

  readonly availableSuggestedSpecKeys = computed(() => {
    const suggested = this.detailsConfig()?.suggestedSpecKeys ?? [];
    const existing = new Set([
      ...this.specifications().map((s) => s.key.trim().toLowerCase()),
      ...this.specFields().map((f) => f.key.trim().toLowerCase()),
    ]);
    return suggested.filter((k) => k && !existing.has(k.trim().toLowerCase()));
  });

  readonly availableSuggestedCareChips = computed(() => {
    const suggested = this.detailsConfig()?.suggestedCareChips ?? [];
    const existing = new Set(this.careInstructions().map((c) => c.trim().toLowerCase()));
    return suggested.filter((c) => c && !existing.has(c.trim().toLowerCase()));
  });

  addSpecification(initialKey = ''): void {
    this.specifications.update((list) => [
      ...list,
      { key: initialKey, value: '', isFeatured: false },
    ]);
  }

  addSuggestedSpecKey(key: string): void {
    this.addSpecification(key);
  }

  updateSpecification(index: number, patch: Partial<SpecRowDraft>): void {
    this.specifications.update((list) =>
      list.map((row, idx) => (idx === index ? { ...row, ...patch } : row))
    );
  }

  removeSpecification(index: number): void {
    this.specifications.update((list) => list.filter((_, idx) => idx !== index));
  }

  applyBulkPaste(): void {
    const raw = this.bulkPasteText().trim();
    if (!raw) return;

    const parsed: SpecRowDraft[] = [];
    for (const line of raw.split(/\r?\n/)) {
      const clean = line.trim();
      if (!clean) continue;
      const tabIdx = clean.indexOf('\t');
      const colonIdx = clean.indexOf(':');
      const sepIdx = tabIdx !== -1 ? tabIdx : colonIdx;
      if (sepIdx > 0) {
        const key = clean.slice(0, sepIdx).trim();
        const value = clean.slice(sepIdx + 1).trim();
        if (key && value) {
          parsed.push({ key, value, isFeatured: false });
        }
      }
    }

    if (parsed.length > 0) {
      this.specifications.update((list) => [...list, ...parsed]);
      this.bulkPasteText.set('');
      this.showBulkPaste.set(false);
    }
  }

  onAddCareEnter(event: Event): void {
    event.preventDefault();
    this.addCareFromInput();
  }

  addCareFromInput(): void {
    const val = this.careInput().trim();
    if (!val) return;
    this.addCareInstruction(val);
    this.careInput.set('');
  }

  addCareInstruction(val: string): void {
    const clean = val.trim();
    if (!clean) return;
    this.careInstructions.update((list) =>
      list.some((c) => c.toLowerCase() === clean.toLowerCase()) ? list : [...list, clean]
    );
  }

  removeCareInstruction(val: string): void {
    this.careInstructions.update((list) => list.filter((c) => c !== val));
  }

  onAddTagEnter(event: Event): void {
    event.preventDefault();
    this.addTagFromInput();
  }

  addTagFromInput(): void {
    const parts = this.tagInput()
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    if (parts.length === 0) return;
    this.tags.update((list) => {
      const next = [...list];
      for (const p of parts) {
        if (!next.some((t) => t.toLowerCase() === p.toLowerCase())) {
          next.push(p);
        }
      }
      return next;
    });
    this.tagInput.set('');
  }

  removeTag(tag: string): void {
    this.tags.update((list) => list.filter((t) => t !== tag));
  }

  onAddFeatureEnter(event: Event): void {
    event.preventDefault();
    this.addFeatureFromInput();
  }

  addFeatureFromInput(): void {
    const val = this.featureInput().trim();
    if (!val) return;
    this.features.update((list) =>
      list.some((f) => f.toLowerCase() === val.toLowerCase()) ? list : [...list, val]
    );
    this.featureInput.set('');
  }

  removeFeature(feat: string): void {
    this.features.update((list) => list.filter((f) => f !== feat));
  }

  setSpecFieldValue(key: string, value: string): void {
    this.specFieldValues.update((prev) => ({ ...prev, [key]: value }));
  }

  toggleSpecFieldFeatured(key: string): void {
    this.specFieldFeatured.update((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  getSelectOptions(field: IProductSpecFieldSchema): string[] {
    const base = field.options ?? [];
    const custom = this.customOptionsByKey()[field.key] ?? [];
    const currentVal = (this.specFieldValues()[field.key] || '').trim();
    const seen = new Set<string>();
    const result: string[] = [];

    for (const opt of [...base, ...custom, ...(currentVal ? [currentVal] : [])]) {
      const clean = opt.trim();
      if (!clean) continue;
      const lower = clean.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        result.push(clean);
      }
    }
    return result;
  }

  openAddOptionFor(key: string): void {
    this.addingOptionForKey.set(this.addingOptionForKey() === key ? null : key);
    this.newOptionInput.set('');
  }

  confirmAddCustomOption(event: Event, key: string): void {
    event.preventDefault();
    this.applyCustomOption(key);
  }

  async applyCustomOption(key: string): Promise<void> {
    const val = this.newOptionInput().trim();
    if (!val || this.isSavingOption()) return;

    this.isSavingOption.set(true);
    try {
      const result = await this.detailsBuilderService.addSpecOption(key, val);
      this.customOptionsByKey.update((prev) => ({
        ...prev,
        [key]: result.options,
      }));
      this.setSpecFieldValue(key, val);
      this.newOptionInput.set('');
      this.addingOptionForKey.set(null);
      this.notifications.success(`Opción "${val}" agregada a ${key}.`);
    } catch (err: any) {
      this.notifications.error(
        err?.error?.message || err?.message || `No se pudo guardar "${val}" en ${key}.`
      );
    } finally {
      this.isSavingOption.set(false);
    }
  }

  validate(): string[] {
    const cfg = this.detailsConfig();
    if (!cfg?.addonEnabled) return [];

    const errors: string[] = [];
    const values = this.specFieldValues();
    for (const field of this.specFields()) {
      if (field.required && !(values[field.key] || '').trim()) {
        errors.push(`El campo "${field.key}" es obligatorio.`);
      }
    }
    return errors;
  }

  hydrate(product: any): void {
    if (Array.isArray(product.specifications)) {
      const typedFieldByLower = new Map<string, string>();
      for (const f of this.specFields()) {
        typedFieldByLower.set(f.key.trim().toLowerCase(), f.key);
      }

      const nextValues: Record<string, string> = {};
      const nextFeatured: Record<string, boolean> = {};
      const freeRows: SpecRowDraft[] = [];

      for (const s of product.specifications) {
        const rawKey = String(s?.key || '').trim();
        const rawVal = String(s?.value || '');
        const isFeat = Boolean(s?.isFeatured);
        const matchedFieldKey = typedFieldByLower.get(rawKey.toLowerCase());

        if (matchedFieldKey) {
          nextValues[matchedFieldKey] = rawVal;
          if (isFeat) nextFeatured[matchedFieldKey] = true;
        } else {
          freeRows.push({
            key: rawKey,
            value: rawVal,
            isFeatured: isFeat,
          });
        }
      }

      this.specFieldValues.set(nextValues);
      this.specFieldFeatured.set(nextFeatured);
      this.specifications.set(freeRows);
    }
    if (Array.isArray(product.careInstructions)) {
      this.careInstructions.set(product.careInstructions.map((c: any) => String(c)).filter(Boolean));
    }
    if (Array.isArray(product.tags)) {
      this.tags.set(product.tags.map((t: any) => String(t)).filter(Boolean));
    }
    if (Array.isArray(product.features)) {
      this.features.set(product.features.map((f: any) => String(f)).filter(Boolean));
    }
  }

  appendToFormData(formData: FormData): void {
    const cfg = this.detailsConfig();
    if (!cfg?.addonEnabled) return;

    if (cfg.showSpecifications || this.specFields().length > 0) {
      const merged: { key: string; value: string; isFeatured?: boolean }[] = [];
      const seenKeys = new Set<string>();
      const values = this.specFieldValues();
      const featured = this.specFieldFeatured();

      for (const field of this.specFields()) {
        const val = (values[field.key] || '').trim();
        if (!val) continue;
        seenKeys.add(field.key.trim().toLowerCase());
        merged.push({
          key: field.key.trim(),
          value: val,
          ...(field.allowFeatured && featured[field.key] ? { isFeatured: true } : {}),
        });
      }

      if (cfg.showSpecifications) {
        for (const s of this.specifications()) {
          const key = s.key.trim();
          const val = s.value.trim();
          if (!key || !val) continue;
          const lower = key.toLowerCase();
          if (seenKeys.has(lower)) continue;
          seenKeys.add(lower);
          merged.push({
            key,
            value: val,
            ...(s.isFeatured ? { isFeatured: true } : {}),
          });
        }
      }

      formData.append('specifications', JSON.stringify(merged));
    }

    if (cfg.showCareInstructions) {
      formData.append('careInstructions', JSON.stringify(this.careInstructions()));
    }

    if (cfg.showTags) {
      formData.append('tags', JSON.stringify(this.tags()));
    }

    if (cfg.showFeatures) {
      formData.append('features', JSON.stringify(this.features()));
    }
  }
}
