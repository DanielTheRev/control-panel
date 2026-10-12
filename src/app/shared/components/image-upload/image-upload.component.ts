import { Component, input, output, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatIcon } from '@angular/material/icon';
import { CdkDragDrop, CdkDropList, CdkDrag, CdkDragPlaceholder } from '@angular/cdk/drag-drop';

export interface ImageSizeInfo {
  bytes: number;
  formatted: string;
  badgeClass: string;
  format?: string;
}

@Component({
  selector: 'app-image-upload',
  imports: [ReactiveFormsModule, MatIcon, CdkDropList, CdkDrag, CdkDragPlaceholder, NgClass],
  templateUrl: './image-upload.component.html'
})
export class ImageUploadComponent {
  imagesControls = input.required<FormArray>();
  originalImages = input.required<any[]>(); // To check for existing images when deleting

  imageDeleted = output<string>();
  imagesChanged = output<void>();

  private fb = new FormBuilder();

  // Caché reactiva para pesos de imágenes remotas (Cloudinary)
  remoteSizes = signal<Map<string, { bytes: number; format?: string }>>(new Map());
  private fetchingUrls = new Set<string>();

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
    const ext = file.name.split('.').pop()?.toUpperCase() || file.type.split('/')[1]?.toUpperCase() || 'IMG';
    const imageGroup = this.fb.group({
      link: [blobURL],
      file: [file],
      size: [file.size],
      format: [ext],
    });

    this.imagesControls().push(imageGroup);
    this.imagesChanged.emit();
  }

  getImageSize(index: number): ImageSizeInfo | null {
    const ctrl = this.imagesControls()?.at(index);
    if (!ctrl) return null;
    const val = ctrl.value;

    let bytes = 0;
    let format = val?.format || '';

    if (val?.file && typeof val.file.size === 'number') {
      bytes = val.file.size;
      if (!format) {
        format = val.file.name?.split('.').pop()?.toUpperCase() || 'IMG';
      }
    } else if (typeof val?.size === 'number' && val.size > 0) {
      bytes = val.size;
    } else if (typeof val?.link === 'string' && val.link.startsWith('http')) {
      const link = val.link;
      const cached = this.remoteSizes().get(link);
      if (cached) {
        bytes = cached.bytes;
        if (!format) format = cached.format || '';
      } else if (!this.fetchingUrls.has(link)) {
        this.fetchingUrls.add(link);
        fetch(link, { method: 'HEAD' })
          .then((res) => {
            const len = res.headers.get('content-length');
            const type = res.headers.get('content-type') || '';
            const detectedFormat =
              type.split('/')[1]?.toUpperCase() ||
              link.split('.').pop()?.split('?')[0]?.toUpperCase() ||
              'IMG';
            if (len) {
              const b = parseInt(len, 10);
              if (!isNaN(b) && b > 0) {
                this.remoteSizes.update(
                  (m) => new Map(m).set(link, { bytes: b, format: detectedFormat })
                );
              }
            }
          })
          .catch(() => {});
      }
    }

    if (!bytes || bytes <= 0) return null;

    let formatted = '';
    if (bytes < 1024) formatted = `${bytes} B`;
    else if (bytes < 1024 * 1024) formatted = `${(bytes / 1024).toFixed(0)} KB`;
    else formatted = `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

    // Clases estéticas según rango:
    // <= 500 KB: Verde esmeralda (liviana / optimizada)
    // 500 KB - 1000 KB (1 MB): Azul suave (buen equilibrio calidad/peso)
    // 1 MB - 2 MB: Ámbar (pesadita pero aceptable)
    // > 2 MB: Rojo suave (pesada / original)
    let badgeClass = 'bg-emerald-950/85 text-emerald-300 border-emerald-500/40';
    if (bytes > 2000 * 1024) {
      badgeClass = 'bg-rose-950/90 text-rose-300 border-rose-500/50';
    } else if (bytes > 1000 * 1024) {
      badgeClass = 'bg-amber-950/90 text-amber-300 border-amber-500/50';
    } else if (bytes > 500 * 1024) {
      badgeClass = 'bg-sky-950/85 text-sky-200 border-sky-400/40';
    }

    return {
      bytes,
      formatted,
      badgeClass,
      format,
    };
  }

  removeImage(index: number) {
    const control = this.imagesControls().at(index);
    const blobURL = control?.value?.link;
    const isBlob = typeof blobURL === 'string' && blobURL.startsWith('blob:');

    if (isBlob) {
      window.URL.revokeObjectURL(blobURL);
    } else if (blobURL) {
      // It's an existing image from DB
      const origs = this.originalImages() || [];
      const img = origs.find((img: any) =>
        (img?.url && img.url === blobURL) ||
        (img?.secure_url && img.secure_url === blobURL) ||
        img === blobURL
      );
      if (img?.public_id && typeof img.public_id === 'string' && img.public_id.trim().length > 0) {
        this.imageDeleted.emit(img.public_id.trim());
      }
    }
    this.imagesControls().removeAt(index);
    this.imagesChanged.emit();
  }
}
