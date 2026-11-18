import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { IProductWeighableFormConfig } from '../../../interfaces/tenant-bootstrap.interface';
import { IProductFormBlock } from '../product-form-block.interface';

@Component({
  selector: 'app-product-weight-block',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-4">
      <div class="flex items-center justify-between border-b border-base-200 pb-3">
        <div class="flex items-center gap-3">
          <span class="studio-index text-xs font-bold px-2 py-1 rounded-md bg-primary/10 text-primary">
            {{ blockIndex() }}
          </span>
          <div>
            <h2 class="font-bold text-base text-base-content">{{ title() }}</h2>
            <p class="text-xs text-base-content/60">Configuración de precio por kilo, gramo o medida</p>
          </div>
        </div>
        <input
          type="checkbox"
          class="toggle toggle-primary"
          [ngModel]="isSoldByWeight()"
          (ngModelChange)="onToggleWeight($event)"
        />
      </div>

      @if (isSoldByWeight()) {
        @if (effectiveAllowedUnits().length === 0) {
          <div class="alert alert-error text-xs">
            <mat-icon>error</mat-icon>
            <span>
              El backend habilitó Balanza pero no informó <code>weighableConfig.allowedUnits</code>.
            </span>
          </div>
        } @else {
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
            <div class="form-control">
              <label class="label py-1">
                <span class="label-text text-xs font-semibold">Unidad de medida *</span>
                @if (weighableConfig()?.pluBarcodePrefix; as pluPrefix) {
                  <span class="label-text-alt text-[11px] font-mono text-base-content/50">
                    PLU: {{ pluPrefix }}
                  </span>
                }
              </label>
              <select
                class="select select-bordered w-full"
                [class.select-error]="submitAttempted() && !unit()"
                [ngModel]="unit()"
                (ngModelChange)="unit.set($event)"
              >
                <option value="">Seleccioná unidad...</option>
                @for (u of effectiveAllowedUnits(); track u) {
                  <option [value]="u">{{ u }}</option>
                }
              </select>
            </div>

            <div class="bg-base-200/60 rounded-xl p-3 text-xs flex items-center justify-between">
              <span class="text-base-content/70">Precio fraccionado:</span>
              <span class="font-bold text-sm text-primary tabular-nums">
                \${{ finalSalePrice() | number:'1.0-0' }} / {{ unit() || '?' }}
              </span>
            </div>
          </div>
        }
      } @else {
        <p class="text-xs text-base-content/60">
          Activá el interruptor si este producto se pesa en balanza o se vende fraccionado.
        </p>
      }
    </div>
  `,
})
export class ProductWeightBlockComponent implements IProductFormBlock {
  blockIndex = input.required<string>();
  title = input.required<string>();
  allowedUnits = input<readonly string[] | undefined>(undefined);
  weighableConfig = input<IProductWeighableFormConfig | undefined>(undefined);
  finalSalePrice = input<number>(0);
  submitAttempted = input<boolean>(false);

  isSoldByWeight = signal(false);
  unit = signal('');

  readonly effectiveAllowedUnits = computed<readonly string[]>(
    () => this.weighableConfig()?.allowedUnits ?? this.allowedUnits() ?? []
  );

  onToggleWeight(enabled: boolean): void {
    this.isSoldByWeight.set(enabled);
    if (enabled && !this.unit()) {
      const def = this.weighableConfig()?.defaultUnit;
      const allowed = this.effectiveAllowedUnits();
      if (def && allowed.includes(def)) {
        this.unit.set(def);
      }
    }
  }

  applyFromMasterCatalog(soldByWeight: boolean, unit?: string): void {
    this.isSoldByWeight.set(soldByWeight);
    const allowed = this.effectiveAllowedUnits();
    if (unit && allowed.includes(unit)) {
      this.unit.set(unit);
    } else if (soldByWeight && !this.unit()) {
      const def = this.weighableConfig()?.defaultUnit;
      if (def && allowed.includes(def)) {
        this.unit.set(def);
      }
    }
  }

  validate(): string[] {
    if (!this.isSoldByWeight()) return [];
    const allowed = this.effectiveAllowedUnits();
    if (allowed.length === 0) {
      return [
        'Configuración inválida: showWeightScalePrice está activo pero allowedUnits está vacío.',
      ];
    }
    if (!this.unit() || !allowed.includes(this.unit())) {
      return ['Seleccioná una unidad de medida válida para venta por peso.'];
    }
    return [];
  }

  hydrate(product: any): void {
    this.isSoldByWeight.set(Boolean(product.isSoldByWeight));
    this.unit.set(product.unit || '');
  }

  appendToFormData(formData: FormData): void {
    formData.append('isSoldByWeight', String(this.isSoldByWeight()));
    if (this.isSoldByWeight() && this.unit()) {
      formData.append('unit', this.unit());
    }
  }
}
