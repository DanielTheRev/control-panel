import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ISizeGuide } from '../../../interfaces/product.interface';
import {
  IProductSizeGuideFormConfig,
  ISizeGuideTemplate,
} from '../../../interfaces/tenant-bootstrap.interface';
import { NotificationsService } from '../../../services/notifications.service';
import { SizeGuideService } from '../../../services/size-guide.service';
import { IProductFormBlock } from '../product-form-block.interface';

@Component({
  selector: 'app-product-size-guide-block',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
              {{ title() || 'Guía de Talles & Medidas' }}
            </h2>
            <p class="text-xs text-base-content/60">
              {{ subtitle() || 'Cargá las medidas por talle o dimensión para evitar devoluciones.' }}
            </p>
          </div>
        </div>

        <div class="flex items-center gap-1.5">
          @if (allowCustomColumns()) {
            <button type="button" class="btn btn-outline btn-xs" (click)="addSizeGuideColumn()">
              + Columna
            </button>
          }
          <button type="button" class="btn btn-outline btn-xs" (click)="addSizeGuideRow()">
            {{ addRowLabel() || '+ Talle' }}
          </button>
        </div>
      </div>

      <!-- Barra de Modelos / Plantillas rápidas (Badges 1 clic + Guardar como modelo) -->
      @if (templates().length > 0 || canSaveAsTemplate()) {
        <div class="space-y-2">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="flex flex-wrap items-center gap-1.5">
              @if (templates().length > 0) {
                <span class="text-[11px] font-semibold text-base-content/60 mr-1">
                  {{ templatesLabel() || 'Modelos rápidos:' }}
                </span>
                @for (tpl of templates(); track tpl.id) {
                  <div class="inline-flex items-center rounded-md border border-base-300 bg-base-100 hover:border-primary/60 transition-colors overflow-hidden">
                    <button
                      type="button"
                      class="px-2.5 py-1 text-xs font-medium text-base-content hover:text-primary flex items-center gap-1 cursor-pointer"
                      [title]="'Aplicar modelo ' + tpl.name"
                      (click)="applyTemplate(tpl)"
                    >
                      @if (tpl.isDefault) {
                        <span class="text-primary text-[11px]" title="Modelo por defecto">★</span>
                      }
                      <span>{{ tpl.name }}</span>
                    </button>
                    <button
                      type="button"
                      class="px-1.5 py-1 text-[11px] text-base-content/40 hover:text-error border-l border-base-200 cursor-pointer"
                      title="Eliminar modelo"
                      [disabled]="deletingTemplateId() === tpl.id"
                      (click)="deleteTemplate(tpl)"
                    >
                      ×
                    </button>
                  </div>
                }
              }
            </div>

            @if (canSaveAsTemplate()) {
              <button
                type="button"
                class="btn btn-ghost btn-xs text-primary font-semibold"
                (click)="toggleSaveTemplateForm()"
              >
                {{ showSaveTemplateForm() ? 'Cancelar' : '+ Guardar como modelo' }}
              </button>
            }
          </div>

          @if (showSaveTemplateForm()) {
            <div class="p-3 rounded-lg bg-base-200/50 border border-base-300 flex flex-wrap items-center gap-2.5">
              <input
                type="text"
                class="input input-bordered input-xs flex-1 min-w-[180px]"
                placeholder="Nombre del modelo (ej: Remeras Mujer, Muebles...)"
                [ngModel]="templateNameInput()"
                (ngModelChange)="templateNameInput.set($event)"
                (keydown.enter)="onSaveTemplateEnter($event)"
              />
              <label class="flex items-center gap-1.5 cursor-pointer text-xs text-base-content/80">
                <input
                  type="checkbox"
                  class="checkbox checkbox-primary checkbox-xs"
                  [ngModel]="templateIsDefaultInput()"
                  (ngModelChange)="templateIsDefaultInput.set($event)"
                />
                <span>Usar por defecto</span>
              </label>
              <button
                type="button"
                class="btn btn-primary btn-xs"
                [disabled]="!templateNameInput().trim() || isSavingTemplate()"
                (click)="saveCurrentAsTemplate()"
              >
                @if (isSavingTemplate()) {
                  <span class="loading loading-spinner loading-xs"></span>
                } @else {
                  Guardar modelo
                }
              </button>
            </div>
          }
        </div>
      }

      <!-- Tabla matricial 2D -->
      <div class="bg-base-200/40 border border-base-200 rounded-xl p-3 space-y-3">
        @if (sizeGuideRows().length === 0) {
          <p class="text-xs text-base-content/55">
            Sin tabla cargada. Tocá un modelo rápido arriba o agregá filas para mostrar la guía de medidas en tu tienda.
          </p>
        } @else {
          <div class="overflow-x-auto">
            <table class="table table-xs">
              <thead>
                <tr>
                  <th>
                    @if (allowCustomColumns()) {
                      <input
                        type="text"
                        class="input input-bordered input-xs w-24 font-semibold"
                        placeholder="Talle"
                        [ngModel]="sizeGuidePrimaryHeader()"
                        (ngModelChange)="sizeGuidePrimaryHeader.set($event)"
                      />
                    } @else {
                      <span class="text-xs font-semibold text-base-content/80">
                        {{ sizeGuidePrimaryHeader() }}
                      </span>
                    }
                  </th>
                  @for (h of sizeGuideHeaders(); track $index) {
                    <th>
                      <div class="flex items-center gap-1">
                        @if (allowCustomColumns()) {
                          <input
                            type="text"
                            class="input input-bordered input-xs w-28"
                            [ngModel]="h"
                            (ngModelChange)="updateSizeGuideHeader($index, $event)"
                          />
                          <button
                            type="button"
                            class="btn btn-ghost btn-xs btn-square text-error"
                            title="Eliminar columna"
                            (click)="removeSizeGuideColumn($index)"
                          >
                            ×
                          </button>
                        } @else {
                          <span class="text-xs font-semibold text-base-content/80">{{ h }}</span>
                        }
                      </div>
                    </th>
                  }
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (row of sizeGuideRows(); track $index; let rIdx = $index) {
                  <tr>
                    <td>
                      <input
                        type="text"
                        class="input input-bordered input-xs w-16 font-semibold"
                        placeholder="S/M/L"
                        [ngModel]="row.size"
                        (ngModelChange)="updateSizeGuideRowSize(rIdx, $event)"
                      />
                    </td>
                    @for (val of row.values; track $index; let cIdx = $index) {
                      <td>
                        <input
                          type="text"
                          class="input input-bordered input-xs w-28"
                          placeholder="cm"
                          [ngModel]="val"
                          (ngModelChange)="updateSizeGuideCell(rIdx, cIdx, $event)"
                        />
                      </td>
                    }
                    <td>
                      <button
                        type="button"
                        class="btn btn-ghost btn-xs btn-square text-error"
                        title="Eliminar fila"
                        (click)="removeSizeGuideRow(rIdx)"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }

        @if (showToleranceField()) {
          <div class="form-control pt-2 border-t border-base-200/80">
            <label class="label py-1">
              <span class="label-text text-[11px] font-semibold uppercase tracking-wide text-base-content/70">
                {{ toleranceLabel() || 'Nota de tolerancia / confección (visible para el comprador)' }}
              </span>
            </label>
            <input
              type="text"
              class="input input-bordered input-sm w-full"
              placeholder="Ej: Medidas aproximadas en centímetros tomadas sobre una superficie plana; no corresponden al contorno corporal."
              [ngModel]="sizeGuideTolerance()"
              (ngModelChange)="sizeGuideTolerance.set($event)"
            />
          </div>
        }
      </div>
    </div>
  `,
})
export class ProductSizeGuideBlockComponent implements IProductFormBlock {
  private readonly sizeGuideService = inject(SizeGuideService);
  private readonly notifications = inject(NotificationsService);

  blockIndex = input.required<string>();
  title = input<string>('Guía de Talles & Medidas');
  subtitle = input<string>('');
  toleranceLabel = input<string>('');
  addRowLabel = input<string>('');
  templatesLabel = input<string>('');
  sizeGuideConfig = input<IProductSizeGuideFormConfig | undefined>(undefined);

  readonly allowCustomColumns = computed(
    () => Boolean(this.sizeGuideConfig()?.allowCustomColumns)
  );
  readonly showToleranceField = computed(
    () => Boolean(this.sizeGuideConfig()?.showToleranceField)
  );

  private localTemplatesOverride = signal<ISizeGuideTemplate[] | null>(null);
  readonly templates = computed<ISizeGuideTemplate[]>(
    () => this.localTemplatesOverride() ?? this.sizeGuideConfig()?.templates ?? []
  );

  sizeGuidePrimaryHeader = signal<string>('Talle');
  sizeGuideHeaders = signal<string[]>(['Ancho (cm)', 'Largo (cm)']);
  sizeGuideRows = signal<{ size: string; values: string[] }[]>([]);
  sizeGuideTolerance = signal('');

  showSaveTemplateForm = signal(false);
  templateNameInput = signal('');
  templateIsDefaultInput = signal(false);
  isSavingTemplate = signal(false);
  deletingTemplateId = signal<string | null>(null);

  private hasHydratedProduct = false;
  private hasAppliedDefaultTemplate = false;

  readonly canSaveAsTemplate = computed(() => {
    const validRows = this.sizeGuideRows().some((r) => r.size.trim().length > 0);
    return validRows && this.sizeGuideHeaders().length > 0;
  });

  constructor() {
    effect(() => {
      const tpls = this.templates();
      if (this.hasHydratedProduct || this.hasAppliedDefaultTemplate) return;
      if (this.sizeGuideRows().length > 0) return;

      const defaultTpl = tpls.find((t) => t.isDefault);
      if (defaultTpl) {
        this.hasAppliedDefaultTemplate = true;
        this.applyTemplate(defaultTpl);
      }
    });
  }

  applyTemplate(tpl: ISizeGuideTemplate): void {
    const rawHeaders = Array.isArray(tpl.headers) && tpl.headers.length > 0 ? tpl.headers : ['Talle', 'Medida'];
    const primary = rawHeaders[0]?.trim() || 'Talle';
    const measurementHeaders = rawHeaders.slice(1);
    const rows = (Array.isArray(tpl.defaultRows) ? tpl.defaultRows : []).map((rowLabel) => ({
      size: rowLabel,
      values: Array.from({ length: measurementHeaders.length }, () => ''),
    }));

    this.sizeGuidePrimaryHeader.set(primary);
    this.sizeGuideHeaders.set(measurementHeaders);
    this.sizeGuideRows.set(rows);
    if (tpl.tolerance !== undefined) {
      this.sizeGuideTolerance.set(tpl.tolerance || '');
    }
  }

  toggleSaveTemplateForm(): void {
    this.showSaveTemplateForm.update((v) => !v);
    if (this.showSaveTemplateForm()) {
      this.templateNameInput.set('');
      this.templateIsDefaultInput.set(false);
    }
  }

  onSaveTemplateEnter(event: Event): void {
    event.preventDefault();
    this.saveCurrentAsTemplate();
  }

  async saveCurrentAsTemplate(): Promise<void> {
    const name = this.templateNameInput().trim();
    if (!name || this.isSavingTemplate()) return;

    const primaryHeader = this.sizeGuidePrimaryHeader().trim() || 'Talle';
    const headers = [primaryHeader, ...this.sizeGuideHeaders().map((h) => h.trim()).filter(Boolean)];
    const defaultRows = this.sizeGuideRows()
      .map((r) => r.size.trim())
      .filter(Boolean);

    if (headers.length < 2 || defaultRows.length === 0) {
      this.notifications.error('Cargá al menos una columna de medida y una fila antes de guardar el modelo.');
      return;
    }

    this.isSavingTemplate.set(true);
    try {
      const updated = await this.sizeGuideService.saveTemplate({
        name,
        headers,
        defaultRows,
        ...(this.sizeGuideTolerance().trim()
          ? { tolerance: this.sizeGuideTolerance().trim() }
          : {}),
        isDefault: this.templateIsDefaultInput(),
      });
      this.localTemplatesOverride.set(updated);
      this.showSaveTemplateForm.set(false);
      this.notifications.success(`Modelo "${name}" guardado para reutilizar en futuros productos.`);
    } catch (err: any) {
      this.notifications.error(
        err?.error?.message || err?.message || 'No se pudo guardar el modelo de guía de medidas.'
      );
    } finally {
      this.isSavingTemplate.set(false);
    }
  }

  async deleteTemplate(tpl: ISizeGuideTemplate): Promise<void> {
    if (this.deletingTemplateId()) return;
    this.deletingTemplateId.set(tpl.id);
    try {
      const updated = await this.sizeGuideService.deleteTemplate(tpl.id);
      this.localTemplatesOverride.set(updated);
      this.notifications.success(`Modelo "${tpl.name}" eliminado.`);
    } catch (err: any) {
      this.notifications.error(
        err?.error?.message || err?.message || 'No se pudo eliminar el modelo.'
      );
    } finally {
      this.deletingTemplateId.set(null);
    }
  }

  addSizeGuideColumn(): void {
    this.sizeGuideHeaders.update((h) => [...h, `Medida ${h.length + 1}`]);
    this.sizeGuideRows.update((rows) =>
      rows.map((r) => ({ ...r, values: [...r.values, ''] }))
    );
  }

  removeSizeGuideColumn(colIdx: number): void {
    this.sizeGuideHeaders.update((h) => h.filter((_, i) => i !== colIdx));
    this.sizeGuideRows.update((rows) =>
      rows.map((r) => ({ ...r, values: r.values.filter((_, i) => i !== colIdx) }))
    );
  }

  updateSizeGuideHeader(colIdx: number, val: string): void {
    this.sizeGuideHeaders.update((h) => h.map((item, i) => (i === colIdx ? val : item)));
  }

  addSizeGuideRow(): void {
    const cols = this.sizeGuideHeaders().length;
    this.sizeGuideRows.update((rows) => [
      ...rows,
      { size: '', values: Array.from({ length: cols }, () => '') },
    ]);
  }

  removeSizeGuideRow(rowIdx: number): void {
    this.sizeGuideRows.update((rows) => rows.filter((_, i) => i !== rowIdx));
  }

  updateSizeGuideRowSize(rowIdx: number, size: string): void {
    this.sizeGuideRows.update((rows) =>
      rows.map((r, i) => (i === rowIdx ? { ...r, size } : r))
    );
  }

  updateSizeGuideCell(rowIdx: number, colIdx: number, value: string): void {
    this.sizeGuideRows.update((rows) =>
      rows.map((r, i) =>
        i === rowIdx
          ? { ...r, values: r.values.map((v, j) => (j === colIdx ? value : v)) }
          : r
      )
    );
  }

  validate(): string[] {
    return [];
  }

  hydrate(product: any): void {
    this.hasHydratedProduct = true;
    const sg: ISizeGuide | undefined = product.sizeGuide;
    if (sg && Array.isArray(sg.headers) && Array.isArray(sg.rows)) {
      const maxValuesLen = sg.rows.reduce(
        (max, r) => Math.max(max, Array.isArray(r.values) ? r.values.length : 0),
        0
      );
      const hasPrimaryColHeader =
        sg.headers.length === maxValuesLen + 1 ||
        (sg.headers.length > 0 && sg.headers[0].trim().toLowerCase() === 'talle');

      const primaryHeader = hasPrimaryColHeader ? sg.headers[0].trim() || 'Talle' : 'Talle';
      const measurementHeaders = hasPrimaryColHeader ? sg.headers.slice(1) : sg.headers;

      this.sizeGuidePrimaryHeader.set(primaryHeader);
      this.sizeGuideHeaders.set(measurementHeaders);
      this.sizeGuideRows.set(
        sg.rows.map((r) => {
          const vals = Array.isArray(r.values) ? [...r.values] : [];
          while (vals.length < measurementHeaders.length) vals.push('');
          return {
            size: r.size || '',
            values: vals.slice(0, measurementHeaders.length),
          };
        })
      );
      this.sizeGuideTolerance.set(sg.tolerance || '');
    }
  }

  appendToFormData(formData: FormData): void {
    const cfg = this.sizeGuideConfig();
    if (!cfg?.addonEnabled) return;

    const validRows = this.sizeGuideRows().filter((r) => r.size.trim());
    if (validRows.length > 0 && this.sizeGuideHeaders().length > 0) {
      const primaryHeader = this.sizeGuidePrimaryHeader().trim() || 'Talle';
      formData.append(
        'sizeGuide',
        JSON.stringify({
          headers: [primaryHeader, ...this.sizeGuideHeaders()],
          rows: validRows,
          ...(this.showToleranceField() && this.sizeGuideTolerance().trim()
            ? { tolerance: this.sizeGuideTolerance().trim() }
            : {}),
        })
      );
    }
  }
}
