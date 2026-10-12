import { NgClass } from '@angular/common';
import { Component, computed, effect, input, output, signal } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatIcon } from "@angular/material/icon";

@Component({
  selector: 'app-single-image-upload',
  imports: [MatIcon, NgClass],
  templateUrl: './single-image-upload.html',
  styleUrl: './single-image-upload.css',
})
export class SingleImageUpload {
  title = input.required<string>();
  ratioBadge = input.required<string>();
  control = input.required<FormControl>();
  showPreview = input<boolean>(true);
  previewChange = output<string | null>();

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

  constructor() {
    effect(() => {
      const ctrl = this.control();
      if (ctrl && ctrl.value) {
        this.#CheckInitialValue(ctrl.value);
      }
    });
  }

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
      this.previewChange.emit(url);

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
    this.previewChange.emit(blobURL);

    const ext = file.name.split('.').pop()?.toUpperCase() || file.type.split('/')[1]?.toUpperCase() || 'IMG';
    this.computeSizeInfo(file.size, ext);

    // Le mandamos el archivo físico al formControl del padre
    this.control().setValue(file);
  }

  imageSizeInfo = signal<{ bytes: number; formatted: string; badgeClass: string; format?: string } | null>(null);

  private computeSizeInfo(bytes: number, format?: string) {
    if (!bytes || bytes <= 0) {
      this.imageSizeInfo.set(null);
      return;
    }
    let formatted = '';
    if (bytes < 1024) formatted = `${bytes} B`;
    else if (bytes < 1024 * 1024) formatted = `${(bytes / 1024).toFixed(0)} KB`;
    else formatted = `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

    let badgeClass = 'bg-emerald-950/85 text-emerald-300 border-emerald-500/40';
    if (bytes > 2000 * 1024) {
      badgeClass = 'bg-rose-950/90 text-rose-300 border-rose-500/50';
    } else if (bytes > 1000 * 1024) {
      badgeClass = 'bg-amber-950/90 text-amber-300 border-amber-500/50';
    } else if (bytes > 500 * 1024) {
      badgeClass = 'bg-sky-950/85 text-sky-200 border-sky-400/40';
    }

    this.imageSizeInfo.set({ bytes, formatted, badgeClass, format });
  }

  #CheckInitialValue(val: any) {
    if (typeof val === 'string' && val.trim() !== '') {
      this.previewUrl.set(val);
      this.isUrlMode.set(true);
      this.isFileMode.set(false);
      this.previewChange.emit(val);

      if (val.startsWith('http')) {
        fetch(val, { method: 'HEAD' })
          .then((res) => {
            const len = res.headers.get('content-length');
            const type = res.headers.get('content-type') || '';
            const detectedFormat =
              type.split('/')[1]?.toUpperCase() ||
              val.split('.').pop()?.split('?')[0]?.toUpperCase() ||
              'IMG';
            if (len) {
              const b = parseInt(len, 10);
              if (!isNaN(b) && b > 0) this.computeSizeInfo(b, detectedFormat);
            }
          })
          .catch(() => {});
      }
    } else if (val instanceof File) {
      const ext = val.name.split('.').pop()?.toUpperCase() || 'IMG';
      this.computeSizeInfo(val.size, ext);
    } else if (!val) {
      this.previewUrl.set(null);
      this.isUrlMode.set(false);
      this.isFileMode.set(false);
      this.imageSizeInfo.set(null);
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
    this.imageSizeInfo.set(null);
    this.previewChange.emit(null);

    // Vaciamos el formControl del padre (vuelve a ser inválido si era required)
    this.control().setValue(null);
  }
}
