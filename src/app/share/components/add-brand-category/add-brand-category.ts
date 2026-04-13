import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from "@angular/material/dialog";
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-add-brand-category',
  imports: [MatDialogModule, ReactiveFormsModule],
  templateUrl: './add-brand-category.html',
  styleUrl: './add-brand-category.css',
})
export class AddBrandCategory {
  #dialogRef = inject(MatDialogRef<AddBrandCategory>);
  #formBuilder = inject(FormBuilder)
  data: { type: 'brand' | 'category', actuallyData: string[] } = inject(MAT_DIALOG_DATA);

  form = this.#formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(3), Validators.pattern(/^[a-zA-Z0-9 ]+$/)]]
  })

  save() {
    if (this.form.invalid) {
      this.form.markAsTouched();
      return;
    }
    const value = this.form.value;
    const check = Boolean(this.data.actuallyData.find(x => x.toLowerCase() === value.name?.toLowerCase()));
    if (check) {
      this.form.controls.name.setErrors({ alreadyExists: true });
      return;
    }
    this.#dialogRef.close(this.form.value.name);
  }
}
