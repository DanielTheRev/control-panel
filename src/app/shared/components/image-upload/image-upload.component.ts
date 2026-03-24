import { Component, input, output } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatIcon } from '@angular/material/icon';
import { CdkDragDrop, CdkDropList, CdkDrag, CdkDragPlaceholder } from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-image-upload',
  imports: [ReactiveFormsModule, MatIcon, CdkDropList, CdkDrag, CdkDragPlaceholder],
  templateUrl: './image-upload.component.html'
})
export class ImageUploadComponent {
  imagesControls = input.required<FormArray>();
  originalImages = input.required<any[]>(); // To check for existing images when deleting

  imageDeleted = output<string>();

  private fb = new FormBuilder();

  drop(event: CdkDragDrop<any[]>) {
    const from = event.previousIndex;
    const to = event.currentIndex;

    if (from === to) return;

    const formArray = this.imagesControls();
    const control = formArray.at(from);
    formArray.removeAt(from);
    formArray.insert(to, control);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length <= 0) return;
    const file = input.files[0];
    this.addFile(file);
    input.value = '';
  }

  onPasteImg(event: ClipboardEvent) {
    const { clipboardData } = event;
    if (!clipboardData) return;
    const files = clipboardData.files;
    if (!files || files.length <= 0) return;
    const file = files[0];
    this.addFile(file);
  }

  private addFile(file: File) {
    if (!file || !file.type.startsWith('image')) {
      alert('La imagen que quieres subir no es válida.');
      return;
    }
    const blobURL = window.URL.createObjectURL(file);
    const imageGroup = this.fb.group({
      link: [blobURL],
      file: [file],
    });

    this.imagesControls().push(imageGroup);
  }

  removeImage(index: number) {
    const control = this.imagesControls().at(index);
    const blobURL = control.value.link;
    const isBlob = blobURL.startsWith('blob:');

    if (isBlob) {
      window.URL.revokeObjectURL(blobURL);
    } else {
      // It's an existing image from DB
      const img = this.originalImages().find((img: any) => img.url === blobURL);
      if (img) {
        this.imageDeleted.emit(img.public_id);
      }
    }
    this.imagesControls().removeAt(index);
  }
}
