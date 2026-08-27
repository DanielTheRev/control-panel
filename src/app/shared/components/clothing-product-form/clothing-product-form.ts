import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  inject
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
} from '@angular/forms';
import { StoreConfigStateService } from '../../../states/store.config.state.service';
import { MatDialog } from '@angular/material/dialog';
import { AddBrandCategory } from '../../../share/components/add-brand-category/add-brand-category';
import { MatIcon } from '@angular/material/icon';

export interface ClothingFormValue {
  gender: string;
  fit: string;
  material: string;
  sizeType: string;
  season: string;
}

@Component({
  selector: 'app-clothing-product-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIcon],
  templateUrl: './clothing-product-form.html',
})
export class ClothingProductForm implements OnInit, OnChanges {
  /** Pre-load values when editing an existing product */
  value = input<Partial<ClothingFormValue> | null>(null);

  @Output() formChange = new EventEmitter<ClothingFormValue>();

  clothingForm: FormGroup;
  configState = inject(StoreConfigStateService);
  #dialog = inject(MatDialog);

  readonly genderOptions: string[] = ['Hombre', 'Mujer', 'Unisex', 'Niños'];

  // Opciones dinámicas que vienen de la configuración de negocio
  get fitOptions(): string[] {
    const config = this.configState.StoreConfig().config;
    const rawList = (config?.clothingFits || []).map((f) => f?.trim()).filter(Boolean);
    const currentVal = this.clothingForm?.get('fit')?.value?.trim();
    if (currentVal && !rawList.includes(currentVal)) {
      rawList.push(currentVal);
    }
    return Array.from(new Set(rawList));
  }
  readonly sizeTypeOptions: { label: string; value: string }[] = [
    { value: 'Ropa', label: 'Ropa (S, M, L, XL)' },
    { value: 'Calzado', label: 'Calzado (38-44)' },
    { value: 'Numérico', label: 'Numérico' },
    { value: 'Talle Único', label: 'Talle Único' },
  ];

  constructor(private fb: FormBuilder) {
    this.clothingForm = this.fb.group({
      gender: [''],
      fit: [''],
      material: [''],
      sizeType: [''],
      season: ['']
    });

    this.clothingForm.valueChanges.subscribe(() => {
      this.formChange.emit(this.clothingForm.value as ClothingFormValue);
    });
  }

  ngOnInit(): void {
    this.#applyInitialValue();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value'] && this.clothingForm) {
      this.#applyInitialValue();
    }
  }

  #applyInitialValue() {
    const v = this.value();
    if (!v) return;
    this.clothingForm.patchValue({
      gender: v.gender ? String(v.gender).trim() : '',
      fit: v.fit ? String(v.fit).trim() : '',
      material: v.material ? String(v.material).trim() : '',
      sizeType: v.sizeType ? String(v.sizeType).trim() : '',
      season: v.season ? String(v.season).trim() : '',
    });
  }

  getValue(): ClothingFormValue {
    return this.clothingForm.value as ClothingFormValue;
  }

  addFit() {
    const dialogRef = this.#dialog.open(AddBrandCategory, {
      width: '400px',
      data: { type: 'fit', actuallyData: this.fitOptions }
    });

    dialogRef.afterClosed().subscribe((result: string) => {
      if (result) {
        const trimmed = result.trim();
        if (trimmed) {
          const currentList = this.fitOptions;
          if (!currentList.includes(trimmed)) {
            this.configState.saveConfig({ clothingFits: [...currentList, trimmed] });
          }
          // Automatically select the newly created fit
          this.clothingForm.patchValue({ fit: trimmed });
        }
      }
    });
  }
}
