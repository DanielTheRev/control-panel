import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
} from '@angular/forms';

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
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './clothing-product-form.html',
})
export class ClothingProductForm implements OnInit, OnChanges {
  /** Pre-load values when editing an existing product */
  value = input<Partial<ClothingFormValue> | null>(null);

  @Output() formChange = new EventEmitter<ClothingFormValue>();

  clothingForm: FormGroup;

  readonly genderOptions: string[] = ['Hombre', 'Mujer', 'Unisex', 'Niños'];
  readonly fitOptions: string[] = ['Regular', 'Slim', 'Oversized', 'Relaxed', 'Boxy', 'Straight', 'Tapered', 'Baggy'];
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
      gender: v.gender || '',
      fit: v.fit || '',
      material: v.material || '',
      sizeType: v.sizeType || '',
      season: v.season || '',
    });
  }

  getValue(): ClothingFormValue {
    return this.clothingForm.value as ClothingFormValue;
  }
}
