import {
  Component,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatChipsModule } from '@angular/material/chips';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { toSignal } from '@angular/core/rxjs-interop';
import { IProductCreateDTO } from '../../../../interfaces/product.interface';

@Component({
  selector: 'app-add-edit-product',
  imports: [
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    ReactiveFormsModule,
    MatChipsModule,
    MatDialogModule,
  ],
  templateUrl: './add-edit-product.html',
  styleUrl: './add-edit-product.scss',
})
export class AddEditProduct {
  /* dialog things */
  // dialog data
  productSelected = inject(MAT_DIALOG_DATA);
  // dialog reference
  private dialogRef = inject(MatDialogRef<AddEditProduct>);
  private fb = inject(FormBuilder);

  /* html input  */
  private inputFeatures =
    viewChild.required<ElementRef<HTMLInputElement>>('inputFeature');
  productForm: FormGroup = this.fb.group({
    model: ['', Validators.required],
    brand: ['Apple', Validators.required],
    category: ['Smartphones', Validators.required],
    price: [0, [Validators.required, Validators.min(1)]],
    shortDescription: ['', Validators.required],
    largeDescription: ['', Validators.required],
    images: this.fb.array<{ link: string; file: File }>(
      [],
      [Validators.required, Validators.minLength(1)],
    ),
    features: this.fb.array<string>(
      [],
      [Validators.required, Validators.minLength(1)],
    ),
  });

  featuresList = toSignal(this.featuresControls.valueChanges, {
    initialValue: [],
  });

  /* Manage product images */
  get imagesControls() {
    return this.productForm.get('images') as FormArray;
  }
  /* get image from input file */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length <= 0) return;
    const file = input.files[0];
    if (!file || !file.type.startsWith('image')) {
      alert('la imagen que quieres subir no es valida o no es una imagen');
      console.log(file);
      return;
    }
    const blobURL = window.URL.createObjectURL(file);
    const imageGroup = this.fb.group({
      link: [blobURL],
      file: [file],
    });

    this.imagesControls.push(imageGroup);
    input.value = '';
  }
  /* get image from clipboard */
  onPasteImg(event: ClipboardEvent) {
    const { clipboardData } = event;
    if (!clipboardData) return;
    const files = clipboardData.files;
    if (!files || files.length <= 0) return;
    const file = files[0];
    if (!file.name.startsWith('image')) {
      alert('la imagen que quieres pegar no es valida o no es una imagen');
      console.log(file);
      return;
    }
    const blobURL = window.URL.createObjectURL(file);
    const imageGroup = this.fb.group({
      link: [blobURL],
      file: [file],
    });

    this.imagesControls.push(imageGroup);
  }

  removeImage(index: number) {
    const blobURL = this.imagesControls.at(index).value.link;
    window.URL.revokeObjectURL(blobURL);
    this.imagesControls.removeAt(index);
  }
  /* end Manage product images  */

  /* Manage product features */
  get featuresControls() {
    return this.productForm.get('features') as FormArray;
  }

  addFeature() {
    const inputElement = this.inputFeatures().nativeElement;
    const value = inputElement.value.trim();
    if (value === '') return;
    // add value as form control to features form array
    this.featuresControls.push(this.fb.control(value));

    // clean input value and activate focus
    inputElement.value = '';
    inputElement.focus();
  }

  removeFeature(index: number) {
    this.featuresControls.removeAt(index);
  }
  /* end Manage product features */

  saveProduct() {
    if (this.productForm.invalid) return;
    const productData: IProductCreateDTO = this.productForm.value;
    this.dialogRef.close({ data: productData });
  }
}
