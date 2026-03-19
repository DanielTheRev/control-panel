import { NgClass } from '@angular/common';
import { Component, computed, effect, input, signal } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatIcon } from "@angular/material/icon";

@Component({
  selector: 'app-single-image-upload',
  imports: [MatIcon, NgClass],
  templateUrl: './single-image-upload.html',
  styleUrl: './single-image-upload.css',
})
export class SingleImageUpload {
  // Inputs desde el padre
  title = input.required<string>();
  ratioBadge = input.required<string>();

  // ¡El control reactivo que pidió el rey!
  control = input.required<FormControl>();

  // Estado interno para la UI
  previewUrl = signal<string | null>(null);
  isFileMode = signal<boolean>(false);
  isUrlMode = signal<boolean>(false);

  aspectClass = computed(() => {
    const badge = this.ratioBadge();
    if (badge.includes('4:5')) return 'aspect-[4/5]';
    if (badge.includes('1:1') || badge.includes('SQUARE')) return 'aspect-square';
    return 'aspect-video'; // 16:9 por defecto
  });

  ngOnInit() {
    // 1. Revisamos si ya vino con un valor inicial síncrono
    this.#CheckInitialValue(this.control().value);

    // 2. Nos suscribimos a los cambios futuros (Acá es donde entra la magia del Edit Mode)
    this.control().valueChanges.subscribe(val => {
      this.#CheckInitialValue(val);
    });
  }

  // 1. Manejo del input de texto (URL)
  onUrlChange(event: Event) {
    const url = (event.target as HTMLInputElement).value;
    if (url.trim() !== '') {
      this.isUrlMode.set(true);
      this.previewUrl.set(url);

      // Actualizamos el formControl del padre directamente
      this.control().setValue(url);
    } else {
      this.clearAll();
    }
  }

  // 2. Manejo del input type file
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length <= 0) return;
    this.processFile(input.files[0]);
    input.value = ''; // Reseteamos el input del DOM
  }

  // 3. Manejo del Copy & Paste
  onPasteImg(event: ClipboardEvent) {
    if (this.isUrlMode()) return; // Si está escribiendo un link, no interceptamos
    const { clipboardData } = event;
    if (!clipboardData) return;
    const files = clipboardData.files;
    if (!files || files.length <= 0) return;
    this.processFile(files[0]);
  }

  private processFile(file: File) {
    if (!file || !file.type.startsWith('image')) {
      alert('Por favor, subí una imagen válida.');
      return;
    }
    const blobURL = window.URL.createObjectURL(file);

    this.isFileMode.set(true);
    this.previewUrl.set(blobURL);

    // Le mandamos el archivo físico al formControl del padre
    this.control().setValue(file);
  }

  #CheckInitialValue(val: any) {
    if (typeof val === 'string' && val.startsWith('http')) {
      this.previewUrl.set(val);
      this.isUrlMode.set(true);
      this.isFileMode.set(false);
    }
  }

  // 4. Limpiar todo
  clearAll() {
    if (this.isFileMode() && this.previewUrl()?.startsWith('blob:')) {
      window.URL.revokeObjectURL(this.previewUrl()!); // Limpiamos memoria
    }
    this.previewUrl.set(null);
    this.isFileMode.set(false);
    this.isUrlMode.set(false);

    // Vaciamos el formControl del padre (vuelve a ser inválido si era required)
    this.control().setValue(null);
  }
}
