import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  inject,
  input,
  OnChanges,
  OnInit,
  Output,
  signal,
  SimpleChanges,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatIcon } from '@angular/material/icon';
import { HotToastService } from '@ngxpert/hot-toast';

export interface GeneralFormValue {
  barcode?: string;
  stock?: number;
  unit?: string;
  isSoldByWeight?: boolean;
}

export interface AutoFillProductData {
  model?: string;
  brand?: string;
  category?: string;
}

@Component({
  selector: 'app-general-product-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIcon],
  templateUrl: './general-product-form.html',
})
export class GeneralProductForm implements OnInit, OnChanges {
  value = input<Partial<GeneralFormValue> | null>(null);

  @Output() formChange = new EventEmitter<GeneralFormValue>();
  @Output() autoFill = new EventEmitter<AutoFillProductData>();

  private fb = inject(FormBuilder);
  private toast = inject(HotToastService);

  isSearchingBarcode = signal(false);

  generalForm: FormGroup = this.fb.group({
    barcode: [''],
    stock: [0, [Validators.min(0)]],
    unit: ['un'],
    isSoldByWeight: [false],
  });

  readonly unitOptions = [
    { value: 'un', label: 'Unidad (un)' },
    { value: 'kg', label: 'Kilogramo (kg)' },
    { value: 'gr', label: 'Gramo (gr)' },
    { value: 'lt', label: 'Litro (lt)' },
    { value: 'ml', label: 'Mililitro (ml)' },
    { value: 'pack', label: 'Pack / Paquete' },
    { value: 'caja', label: 'Caja' },
  ];

  constructor() {
    this.generalForm.valueChanges.subscribe(() => {
      this.formChange.emit(this.generalForm.value as GeneralFormValue);
    });

    // Si se activa venta al peso, predeterminar la unidad a 'kg' si es 'un'
    this.generalForm.get('isSoldByWeight')?.valueChanges.subscribe((isWeight) => {
      if (isWeight && this.generalForm.get('unit')?.value === 'un') {
        this.generalForm.patchValue({ unit: 'kg' }, { emitEvent: false });
      }
    });
  }

  ngOnInit(): void {
    this.#applyInitialValue();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value'] && this.generalForm) {
      this.#applyInitialValue();
    }
  }

  #applyInitialValue(): void {
    const val = this.value();
    if (!val) return;

    this.generalForm.patchValue(
      {
        barcode: val.barcode ?? '',
        stock: val.stock ?? 0,
        unit: val.unit ?? 'un',
        isSoldByWeight: val.isSoldByWeight ?? false,
      },
      { emitEvent: false },
    );
  }

  /**
   * Consulta OpenFoodFacts para autocompletar nombre y marca con el código de barras
   */
  async searchBarcodeData(): Promise<void> {
    const rawBarcode = this.generalForm.get('barcode')?.value?.trim();
    if (!rawBarcode || rawBarcode.length < 8) {
      this.toast.info('Ingresá al menos 8 dígitos para buscar información del producto.');
      return;
    }

    this.isSearchingBarcode.set(true);
    try {
      const url = `https://world.openfoodfacts.org/api/v2/product/${rawBarcode}.json`;
      const res = await fetch(url).then((r) => r.json());

      if (res.status === 1 && res.product) {
        const p = res.product;
        const name = p.product_name_es || p.product_name || '';
        const brand = (p.brands || '').split(',')[0]?.trim() || '';

        this.toast.success(`Encontrado: ${name || 'Producto identificado'}`, {
          icon: '✨',
        });

        this.autoFill.emit({
          model: name,
          brand: brand,
        });
      } else {
        this.toast.info('No se encontraron datos en OpenFoodFacts. Podés cargarlo manualmente.');
      }
    } catch {
      this.toast.error('Error consultando la base de datos externa de códigos.');
    } finally {
      this.isSearchingBarcode.set(false);
    }
  }

  onBarcodeKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.searchBarcodeData();
    }
  }
}
