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
import { TagInputComponent } from '../tag-input/tag-input.component';

export interface TechFormValue {
  ram: string;
  processor: string;
  screenSize: string;
  os: string;
  storage: string[];
}

@Component({
  selector: 'app-tech-product-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TagInputComponent],
  templateUrl: './tech-product-form.html',
})
export class TechProductForm implements OnInit, OnChanges {
  /** Pre-load values when editing an existing product */
  value = input<Partial<TechFormValue> | null>(null);

  @Output() formChange = new EventEmitter<TechFormValue>();

  techForm: FormGroup;

  constructor(private fb: FormBuilder) {
    this.techForm = this.fb.group({
      ram: [''],
      processor: [''],
      screenSize: [''],
      os: [''],
      storage: this.fb.array<string>([]),
    });

    this.techForm.valueChanges.subscribe(() => {
      this.formChange.emit(this.techForm.value as TechFormValue);
    });
  }

  ngOnInit(): void {
    this.#applyInitialValue();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value'] && this.techForm) {
      this.#applyInitialValue();
    }
  }

  get storageControls() {
    return this.techForm.get('storage') as import('@angular/forms').FormArray;
  }

  #applyInitialValue() {
    const v = this.value();
    if (!v) return;

    this.techForm.patchValue({
      ram: v.ram || '',
      processor: v.processor || '',
      screenSize: v.screenSize || '',
      os: v.os || '',
    });

    if (v.storage?.length) {
      this.storageControls.clear();
      v.storage.forEach((s) =>
        this.storageControls.push(this.fb.control(s))
      );
    }
  }

  getValue(): TechFormValue {
    return this.techForm.value as TechFormValue;
  }
}
