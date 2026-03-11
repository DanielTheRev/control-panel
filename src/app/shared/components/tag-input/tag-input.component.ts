import { Component, ElementRef, input, viewChild } from '@angular/core';
import { FormArray, FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'app-tag-input',
  imports: [ReactiveFormsModule, MatIcon],
  templateUrl: './tag-input.component.html',
})
export class TagInputComponent {
  formArray = input.required<FormArray>();
  placeholder = input<string>('Agregar item...');

  tagInput = viewChild<ElementRef<HTMLInputElement>>('tagInput');

  add() {
    const input = this.tagInput()?.nativeElement;
    if (!input) return;
    const value = input.value.trim();
    if (!value) return;

    // Split by comma and filter out empty values
    const tags = value.split(',').map(tag => tag.trim()).filter(tag => tag !== '');

    if (tags.length > 0) {
      tags.forEach(tag => {
        this.formArray().push(new FormControl(tag));
      });
      input.value = '';
      input.focus();
    }
  }

  remove(index: number) {
    this.formArray().removeAt(index);
  }
}
