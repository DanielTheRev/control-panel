import { Component, input } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'app-key-value-list',
  imports: [ReactiveFormsModule, MatIcon],
  templateUrl: './key-value-list.component.html'
})
export class KeyValueListComponent {
  formArray = input.required<FormArray>();
  keyPlaceholder = input<string>('Clave');
  valuePlaceholder = input<string>('Valor');
  entityName = input<string>('Item');

  private fb = new FormBuilder();

  asFormGroup(control: any): FormGroup {
    return control as FormGroup;
  }

  add() {
    this.formArray().push(this.fb.group({
      key: ['', Validators.required],
      value: ['', Validators.required]
    }));
  }

  remove(index: number) {
    this.formArray().removeAt(index);
  }
}
