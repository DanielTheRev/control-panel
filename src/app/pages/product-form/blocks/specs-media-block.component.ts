import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { firstValueFrom } from 'rxjs';
import { IProductImage } from '../../../interfaces/product.interface';
import { IProductGalleryFormConfig } from '../../../interfaces/tenant-bootstrap.interface';
import {
  MediaStudioCropRequest,
  MediaStudioService,
} from '../../../services/media-studio.service';
import { NotificationsService } from '../../../services/notifications.service';
import { IProductFormBlock } from '../product-form-block.interface';
import { MediaStudioCropperModalComponent } from './media-studio-cropper-modal.component';

export interface SpecDraft {
  key: string;
  value: string;
}

export interface NewImageDraft {
  file: File;
  previewUrl: string;
}

export interface VariantTagOption {
  sku: string;
  skus?: string[];
  label: string;
  colorHex?: string;
}

@Component({
  selector: 'app-product-specs-media-block',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MediaStudioCropperModalComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-5">
      <div class="flex items-center justify-between border-b border-base-200 pb-3">
        <div class="flex items-center gap-3">
          <span class="studio-index text-xs font-bold px-2 py-1 rounded-md bg-primary/10 text-primary">
            {{ blockIndex() }}
          </span>
          <div>
            <h2 class="font-bold text-base text-base-content">{{ title() }}</h2>
            <p class="text-xs text-base-content/60">
              {{ subtitle() || 'Especificaciones clave-valor y galería de imágenes' }}
            </p>
          </div>
        </div>
        @if (galleryConfig()?.addonEnabled) {
          <span class="badge badge-primary badge-outline badge-sm h-auto py-1 font-semibold whitespace-nowrap shrink-0">
            Media Studio · WebP
          </span>
        }
      </div>

      @if (showGallery()) {
        <div class="space-y-3.5">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <span class="text-xs font-semibold text-base-content/80">
                Galería ({{ totalImageCount() }} / {{ effectiveMaxImages() }})
              </span>
              @if (cropperEnabled()) {
                <span class="badge badge-ghost badge-xs text-[11px] font-mono">
                  {{ allowedRatios().join(' · ') }}
                </span>
              }
            </div>
            <span class="text-[11px] text-base-content/50">
              La foto #1 o marcada con ★ será la portada principal
            </span>
          </div>

          <!-- Dropzone (Click, Drag & Drop, Paste) -->
          @if (totalImageCount() < effectiveMaxImages()) {
            <label
              tabindex="0"
              class="flex flex-col items-center justify-center gap-1.5 border-2 border-dashed rounded-xl px-4 py-6 text-center cursor-pointer transition-colors outline-none focus:border-primary"
              [class.border-primary]="isDragOver()"
              [class.bg-primary/5]="isDragOver()"
              [class.border-base-300]="!isDragOver()"
              [class.hover:border-primary/60]="!isDragOver()"
              [class.hover:bg-base-200/40]="!isDragOver()"
              (dragover)="onDragOver($event)"
              (dragleave)="onDragLeave($event)"
              (drop)="onDrop($event)"
              (paste)="onPaste($event)"
            >
              <span class="w-9 h-9 rounded-full bg-base-content text-base-100 flex items-center justify-center shadow-xs">
                <mat-icon class="!text-[18px] !w-[18px] !h-[18px]">cloud_upload</mat-icon>
              </span>
              <p class="text-xs text-base-content/80">
                <span class="font-semibold">Click para subir</span>, arrastrá o pegá la imagen
              </p>
              <p class="text-[11px] text-base-content/50">
                PNG, JPG, WEBP o GIF · Máx. {{ effectiveMaxImages() }} fotos
                @if (cropperEnabled()) {
                  · Recorte interactivo
                }
              </p>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                multiple
                class="hidden"
                (change)="onFilesSelected($event)"
              />
            </label>
          }

          @if (totalImageCount() > 0) {
            <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              @for (img of persistedImages(); track img.id || img.public_id || $index; let imgIdx = $index) {
                <div
                  class="rounded-xl border bg-base-100 overflow-hidden flex flex-col shadow-2xs transition-all"
                  [class.border-primary]="img.isMain"
                  [class.ring-1]="img.isMain"
                  [class.ring-primary/30]="img.isMain"
                  [class.border-base-200]="!img.isMain"
                >
                  <div
                    class="relative group aspect-square bg-base-200/40 overflow-hidden cursor-zoom-in"
                    title="Clic para ampliar foto"
                    (click)="openLightbox(imgIdx)"
                  >
                    <img [src]="img.url" alt="Foto producto" class="w-full h-full object-contain transition-transform duration-200 group-hover:scale-[1.02]" />

                    <!-- Top-left index & main badge -->
                    <div class="absolute top-2 left-2 flex items-center gap-1">
                      <span
                        class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold shadow-xs"
                        [class.bg-primary]="img.isMain"
                        [class.text-primary-content]="img.isMain"
                        [class.bg-neutral/80]="!img.isMain"
                        [class.text-white]="!img.isMain"
                      >
                        {{ imgIdx + 1 }}
                        @if (img.isMain) {
                          <mat-icon class="!text-[11px] !w-[11px] !h-[11px]">star</mat-icon>
                        }
                      </span>
                    </div>

                    <!-- Top-right actions -->
                    <div
                      class="absolute top-2 right-2 flex items-center gap-1 opacity-95 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                      (click)="$event.stopPropagation()"
                    >
                      @if (imgIdx > 0) {
                        <button
                          type="button"
                          class="btn btn-circle btn-xs bg-base-100/95 hover:bg-base-200 border-0 shadow"
                          title="Mover a la izquierda"
                          (click)="movePersistedImage(imgIdx, -1)"
                        >
                          <mat-icon class="!text-[14px] !w-[14px] !h-[14px]">chevron_left</mat-icon>
                        </button>
                      }
                      @if (imgIdx < persistedImages().length - 1) {
                        <button
                          type="button"
                          class="btn btn-circle btn-xs bg-base-100/95 hover:bg-base-200 border-0 shadow"
                          title="Mover a la derecha"
                          (click)="movePersistedImage(imgIdx, 1)"
                        >
                          <mat-icon class="!text-[14px] !w-[14px] !h-[14px]">chevron_right</mat-icon>
                        </button>
                      }
                      @if (!img.isMain) {
                        <button
                          type="button"
                          class="btn btn-circle btn-xs bg-base-100/95 hover:bg-primary hover:text-primary-content border-0 shadow"
                          title="Marcar como foto principal"
                          (click)="setMainImage(imgIdx)"
                        >
                          <mat-icon class="!text-[14px] !w-[14px] !h-[14px]">star_outline</mat-icon>
                        </button>
                      }
                      <button
                        type="button"
                        class="btn btn-circle btn-xs btn-error shadow"
                        title="Eliminar foto"
                        (click)="removePersistedImage(imgIdx)"
                      >
                        <mat-icon class="!text-[14px] !w-[14px] !h-[14px]">close</mat-icon>
                      </button>
                    </div>

                    <!-- Bottom-left metadata pill (385 KB · WEBP) -->
                    <div class="absolute bottom-2 left-2 flex flex-wrap items-center gap-1 max-w-[calc(100%-1rem)]">
                      @if (formatImageMeta(img); as metaLabel) {
                        <span class="px-2 py-0.5 rounded-md bg-emerald-700/90 text-white text-[10px] font-bold tracking-wide font-mono shadow-xs">
                          {{ metaLabel }}
                        </span>
                      }
                      @if (img.crops && img.crops.length > 0) {
                        <span class="px-1.5 py-0.5 rounded-md bg-neutral/80 text-white text-[10px] font-mono">
                          {{ formatCropsLabel(img) }}
                        </span>
                      }
                    </div>
                  </div>

                  <!-- Variant Tagging (variantSkus[]) -->
                  @if (variantTaggingEnabled() && variantOptions().length > 0) {
                    @let linked = linkedOptions(img);
                    @let available = unlinkedOptions(img);
                    <div class="p-2 border-t border-base-200 bg-base-200/30 space-y-1.5">
                      <span class="text-[10px] font-semibold uppercase tracking-wide text-base-content/60 block">
                        {{ hasColorGroupedOptions() ? 'Vincular a color' : 'Vincular a variantes' }}
                      </span>

                      @if (linked.length > 0) {
                        <div class="flex flex-wrap gap-1">
                          @for (opt of linked; track opt.label + '_' + opt.sku) {
                            <span class="badge badge-primary badge-xs h-5 gap-1 px-2 font-medium">
                              @if (opt.colorHex) {
                                <span
                                  class="w-2 h-2 rounded-full border border-white/40 shrink-0"
                                  [style.background-color]="opt.colorHex"
                                ></span>
                              }
                              <span class="truncate max-w-[95px]">{{ opt.label }}</span>
                              <button
                                type="button"
                                class="hover:text-error ml-0.5 font-bold leading-none"
                                title="Desvincular"
                                (click)="toggleVariantOption(imgIdx, opt)"
                              >
                                ×
                              </button>
                            </span>
                          }
                        </div>
                      }

                      @if (available.length > 0) {
                        <select
                          class="select select-bordered select-xs w-full"
                          [ngModel]="''"
                          (ngModelChange)="linkOptionFromSelect(imgIdx, $event)"
                        >
                          <option value="">
                            {{
                              linked.length > 0
                                ? (hasColorGroupedOptions() ? '+ Vincular otro color...' : '+ Vincular otra variante...')
                                : (hasColorGroupedOptions() ? 'Seleccionar color...' : 'Seleccionar variante...')
                            }}
                          </option>
                          @for (opt of available; track opt.label + '_' + opt.sku) {
                            <option [value]="opt.sku">{{ opt.label }}</option>
                          }
                        </select>
                      }
                    </div>
                  }
                </div>
              }

              <!-- Standard fallback new images (when cropper is disabled) -->
              @for (img of newImages(); track img.previewUrl) {
                <div
                  class="relative group aspect-square rounded-xl overflow-hidden border border-primary/40 bg-base-200/40 cursor-zoom-in"
                  title="Clic para ampliar foto"
                  (click)="openLightbox(persistedImages().length + $index)"
                >
                  <img [src]="img.previewUrl" alt="Nueva foto" class="w-full h-full object-contain" />
                  <span class="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-neutral/80 text-white text-[11px] font-bold">
                    {{ persistedImages().length + $index + 1 }}
                  </span>
                  <span class="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-emerald-700/90 text-white text-[10px] font-bold font-mono">
                    {{ formatBytes(img.file.size) }} · PENDIENTE
                  </span>
                  <button
                    type="button"
                    class="btn btn-circle btn-xs btn-error absolute top-2 right-2 shadow"
                    (click)="removeNewImage($index); $event.stopPropagation()"
                  >
                    <mat-icon class="!text-[14px] !w-[14px] !h-[14px]">close</mat-icon>
                  </button>
                </div>
              }
            </div>
          }
        </div>
      }
    </div>

    <!-- Media Studio Cropper Modal -->
    @if (activeCropDraft(); as cropItem) {
      <app-media-studio-cropper-modal
        [previewUrl]="cropItem.previewUrl"
        [allowedAspectRatios]="allowedRatios()"
        [defaultQuality]="galleryConfig()?.defaultQuality ?? 82"
        [isUploading]="isUploadingCrop()"
        (confirmed)="onCropConfirmed($event)"
        (cancelled)="onCropCancelled()"
      />
    }

    <!-- Lightbox / Vista ampliada de foto -->
    @if (lightboxItem(); as lb) {
      <div
        class="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4"
        (click)="closeLightbox()"
      >
        <div
          class="relative max-w-4xl w-full bg-base-100 rounded-xl border border-base-300 shadow-2xl overflow-hidden flex flex-col"
          (click)="$event.stopPropagation()"
        >
          <div class="flex items-center justify-between px-4 py-2.5 bg-base-100 border-b border-base-200">
            <div class="flex items-center gap-2">
              <span class="badge badge-primary badge-sm font-bold rounded-md">
                Foto {{ lb.index + 1 }} de {{ totalImageCount() }}
              </span>
              @if (lb.meta) {
                <span class="text-xs font-mono text-base-content/70">{{ lb.meta }}</span>
              }
            </div>
            <button
              type="button"
              class="btn btn-ghost btn-xs btn-square rounded-md"
              title="Cerrar"
              (click)="closeLightbox()"
            >
              <mat-icon class="!text-[18px] !w-[18px] !h-[18px]">close</mat-icon>
            </button>
          </div>

          <div class="relative bg-base-200/50 flex items-center justify-center p-4 min-h-[320px] max-h-[78vh]">
            <img
              [src]="lb.url"
              alt="Vista ampliada"
              class="max-h-[72vh] max-w-full object-contain rounded-md"
            />

            @if (totalImageCount() > 1) {
              <button
                type="button"
                class="btn btn-sm btn-square rounded-lg bg-base-100/95 hover:bg-primary hover:text-primary-content hover:border-primary border border-base-300 shadow absolute left-3 top-1/2 -translate-y-1/2"
                title="Foto anterior"
                (click)="stepLightbox(-1)"
              >
                <mat-icon>chevron_left</mat-icon>
              </button>
              <button
                type="button"
                class="btn btn-sm btn-square rounded-lg bg-base-100/95 hover:bg-primary hover:text-primary-content hover:border-primary border border-base-300 shadow absolute right-3 top-1/2 -translate-y-1/2"
                title="Foto siguiente"
                (click)="stepLightbox(1)"
              >
                <mat-icon>chevron_right</mat-icon>
              </button>
            }
          </div>
        </div>
      </div>
    }
  `,
})
export class ProductSpecsMediaBlockComponent implements IProductFormBlock {
  private readonly notifications = inject(NotificationsService);
  private readonly mediaStudio = inject(MediaStudioService);

  blockIndex = input.required<string>();
  title = input.required<string>();
  subtitle = input<string>('');
  showGallery = input<boolean>(false);
  maxImagesAllowed = input<number>(10);
  galleryConfig = input<IProductGalleryFormConfig | undefined>(undefined);
  variantOptions = input<VariantTagOption[]>([]);

  mediaStateChange = output<{
    totalCount: number;
    primaryUrl: string | null;
  }>();
  imagesListChange = output<IProductImage[]>();

  persistedImages = signal<IProductImage[]>([]);
  deletedImageIds = signal<string[]>([]);
  newImages = signal<NewImageDraft[]>([]);

  // Cola para Media Studio Cropper (diferido hasta guardar el producto)
  private cropQueue = signal<NewImageDraft[]>([]);
  private pendingCrops = new Map<
    string,
    { file: File; crops: MediaStudioCropRequest[]; quality: number; previewUrl: string }
  >();
  isUploadingCrop = signal<boolean>(false);
  isDragOver = signal<boolean>(false);
  lightboxIndex = signal<number | null>(null);

  readonly lightboxItem = computed<{ index: number; url: string; meta: string | null } | null>(() => {
    const idx = this.lightboxIndex();
    if (idx === null) return null;
    const persisted = this.persistedImages();
    if (idx < persisted.length) {
      const img = persisted[idx];
      return { index: idx, url: img.url, meta: this.formatImageMeta(img) };
    }
    const newIdx = idx - persisted.length;
    const added = this.newImages();
    if (newIdx >= 0 && newIdx < added.length) {
      const draft = added[newIdx];
      return { index: idx, url: draft.previewUrl, meta: `${this.formatBytes(draft.file.size)} · PENDIENTE` };
    }
    return null;
  });

  readonly activeCropDraft = computed<NewImageDraft | null>(() => {
    const queue = this.cropQueue();
    return queue.length > 0 ? queue[0] : null;
  });

  readonly effectiveMaxImages = computed(
    () => this.galleryConfig()?.maxImages ?? this.maxImagesAllowed()
  );

  readonly cropperEnabled = computed(
    () => Boolean(this.galleryConfig()?.enableCropper)
  );

  readonly allowedRatios = computed<string[]>(() => {
    const ratios = this.galleryConfig()?.allowedAspectRatios;
    return ratios && ratios.length > 0 ? ratios : ['original', '1:1', '9:16', '16:9'];
  });

  readonly variantTaggingEnabled = computed(
    () => Boolean(this.galleryConfig()?.enableVariantTagging)
  );

  readonly hasColorGroupedOptions = computed(
    () => this.variantOptions().some((opt) => Boolean(opt.colorHex))
  );

  readonly totalImageCount = computed(
    () => this.persistedImages().length + this.newImages().length
  );

  private emitMedia(): void {
    const persisted = this.persistedImages();
    const mainImg = persisted.find((img) => img.isMain) ?? persisted[0];
    const added = this.newImages();
    const primaryUrl = mainImg?.url ?? (added.length > 0 ? added[0].previewUrl : null);

    this.mediaStateChange.emit({
      totalCount: this.totalImageCount(),
      primaryUrl,
    });
    this.imagesListChange.emit(persisted);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.processIncomingFiles(Array.from(files));
    }
  }

  onPaste(event: ClipboardEvent): void {
    const items = event.clipboardData?.items;
    if (!items || items.length === 0) return;

    const imageFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) imageFiles.push(file);
      }
    }
    if (imageFiles.length > 0) {
      event.preventDefault();
      this.processIncomingFiles(imageFiles);
    }
  }

  onFilesSelected(event: Event): void {
    const inputEl = event.target as HTMLInputElement;
    const files = inputEl.files;
    if (!files || files.length === 0) return;

    this.processIncomingFiles(Array.from(files));
    inputEl.value = '';
  }

  private processIncomingFiles(rawFiles: File[]): void {
    const allowedMimes = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']);
    const validImages = rawFiles.filter((file) => allowedMimes.has(file.type.toLowerCase()));
    const rejectedCount = rawFiles.length - validImages.length;

    if (rejectedCount > 0) {
      this.notifications.warning(
        rejectedCount === 1
          ? 'Archivo rechazado: solo se permiten imágenes (PNG, JPG, WEBP o GIF).'
          : `Se rechazaron ${rejectedCount} archivos: solo se permiten imágenes (PNG, JPG, WEBP o GIF).`
      );
    }

    if (validImages.length === 0) return;

    const maxAllowed = this.effectiveMaxImages();
    const remaining = maxAllowed - (this.totalImageCount() + this.cropQueue().length);

    if (remaining <= 0) {
      this.notifications.warning(`Ya alcanzaste el límite de ${maxAllowed} imágenes.`);
      return;
    }

    const accepted = validImages.slice(0, remaining);
    if (accepted.length < validImages.length) {
      this.notifications.warning(
        `Solo se agregaron ${accepted.length} imágenes para respetar el máximo de ${maxAllowed}.`
      );
    }

    const drafts: NewImageDraft[] = accepted.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    if (this.cropperEnabled()) {
      this.cropQueue.update((q) => [...q, ...drafts]);
    } else {
      this.newImages.update((curr) => [...curr, ...drafts]);
      this.emitMedia();
    }
  }

  onCropConfirmed(event: { crops: MediaStudioCropRequest[]; quality: number }): void {
    const current = this.activeCropDraft();
    if (!current) return;

    this.cropQueue.update((q) => q.slice(1));

    const draftId = `local_ms_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.pendingCrops.set(draftId, {
      file: current.file,
      crops: event.crops,
      quality: event.quality,
      previewUrl: current.previewUrl,
    });

    const isFirst = this.persistedImages().length === 0;
    const draftRecord: IProductImage = {
      id: draftId,
      url: current.previewUrl,
      public_id: '',
      bytes: current.file.size,
      format: 'PENDIENTE',
      crops: event.crops.map((c) => ({
        aspectRatio: c.aspectRatio,
        url: current.previewUrl,
        public_id: '',
      })),
      variantSkus: [],
      isMain: isFirst,
    };

    this.persistedImages.update((curr) => [...curr, draftRecord]);
    this.emitMedia();
  }

  async uploadPendingMediaStudioCrops(): Promise<void> {
    const currentImages = this.persistedImages();
    const pendingEntries = currentImages.filter((img) => img.id && this.pendingCrops.has(img.id));
    if (pendingEntries.length === 0) return;

    for (const draft of pendingEntries) {
      const draftId = draft.id!;
      const pending = this.pendingCrops.get(draftId);
      if (!pending) continue;

      const uploaded = await firstValueFrom(
        this.mediaStudio.upload(pending.file, pending.crops, { quality: pending.quality })
      );

      this.persistedImages.update((imgs) =>
        imgs.map((item) => {
          if (item.id !== draftId) return item;
          return {
            ...uploaded,
            isMain: item.isMain,
            variantSkus: item.variantSkus ?? [],
          };
        })
      );

      URL.revokeObjectURL(pending.previewUrl);
      this.pendingCrops.delete(draftId);
    }

    this.emitMedia();
  }

  onCropCancelled(): void {
    const current = this.activeCropDraft();
    if (current) {
      URL.revokeObjectURL(current.previewUrl);
    }
    this.cropQueue.update((q) => q.slice(1));
  }

  setMainImage(index: number): void {
    this.persistedImages.update((imgs) =>
      imgs.map((img, i) => ({ ...img, isMain: i === index }))
    );
    this.emitMedia();
  }

  private getOptionSkus(opt: VariantTagOption): string[] {
    return opt.skus && opt.skus.length > 0 ? opt.skus : [opt.sku];
  }

  toggleVariantOption(imageIndex: number, opt: VariantTagOption): void {
    const cleanSkus = this.getOptionSkus(opt).map((s) => s.trim()).filter(Boolean);
    if (cleanSkus.length === 0) return;
    const skuSet = new Set(cleanSkus);

    this.persistedImages.update((imgs) =>
      imgs.map((img, i) => {
        if (i !== imageIndex) return img;
        const current = img.variantSkus ?? [];
        const allLinked = cleanSkus.every((s) => current.includes(s));
        return {
          ...img,
          variantSkus: allLinked
            ? current.filter((s) => !skuSet.has(s))
            : Array.from(new Set([...current, ...cleanSkus])),
        };
      })
    );
    this.imagesListChange.emit(this.persistedImages());
  }

  toggleSkusOnImage(imageKey: string, skus: string[]): void {
    const cleanSkus = skus.map((s) => s.trim()).filter(Boolean);
    if (cleanSkus.length === 0) return;

    this.persistedImages.update((imgs) =>
      imgs.map((img) => {
        const key = img.id || img.public_id || img.url;
        if (key !== imageKey) return img;
        const current = img.variantSkus ?? [];
        const allLinked = cleanSkus.every((s) => current.includes(s));
        const nextSkus = allLinked
          ? current.filter((s) => !cleanSkus.includes(s))
          : Array.from(new Set([...current, ...cleanSkus]));
        return { ...img, variantSkus: nextSkus };
      })
    );
    this.imagesListChange.emit(this.persistedImages());
  }

  isVariantOptionLinked(img: IProductImage, opt: VariantTagOption): boolean {
    if (!Array.isArray(img.variantSkus) || img.variantSkus.length === 0) return false;
    return this.getOptionSkus(opt).some((sku) => img.variantSkus!.includes(sku));
  }

  linkedOptions(img: IProductImage): VariantTagOption[] {
    return this.variantOptions().filter((opt) => this.isVariantOptionLinked(img, opt));
  }

  unlinkedOptions(img: IProductImage): VariantTagOption[] {
    return this.variantOptions().filter((opt) => !this.isVariantOptionLinked(img, opt));
  }

  linkOptionFromSelect(imageIndex: number, selectedSku: string): void {
    const clean = (selectedSku || '').trim();
    if (!clean) return;
    const opt = this.variantOptions().find((o) => o.sku === clean);
    if (!opt) return;
    this.toggleVariantOption(imageIndex, opt);
  }

  openLightbox(index: number): void {
    this.lightboxIndex.set(index);
  }

  closeLightbox(): void {
    this.lightboxIndex.set(null);
  }

  stepLightbox(delta: number): void {
    const total = this.totalImageCount();
    const curr = this.lightboxIndex();
    if (curr === null || total <= 1) return;
    this.lightboxIndex.set((curr + delta + total) % total);
  }

  formatCropsLabel(img: IProductImage): string {
    if (!img.crops || img.crops.length === 0) return '';
    return img.crops.map((c) => c.aspectRatio).join('·');
  }

  formatBytes(bytes?: number): string {
    if (!bytes || bytes <= 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    const kb = Math.round(bytes / 1024);
    if (kb < 1024) return `${kb} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  formatImageMeta(img: IProductImage): string {
    const parts: string[] = [];
    const size = this.formatBytes(img.bytes);
    if (size) parts.push(size);
    if (img.format) parts.push(img.format.toUpperCase());
    return parts.join(' · ');
  }

  movePersistedImage(index: number, delta: -1 | 1): void {
    const targetIndex = index + delta;
    const list = this.persistedImages();
    if (targetIndex < 0 || targetIndex >= list.length) return;

    const next = [...list];
    const [moved] = next.splice(index, 1);
    next.splice(targetIndex, 0, moved);
    this.persistedImages.set(next);
    this.emitMedia();
  }

  removePersistedImage(index: number): void {
    const target = this.persistedImages()[index];
    if (!target) return;
    if (target.id && this.pendingCrops.has(target.id)) {
      const pending = this.pendingCrops.get(target.id)!;
      URL.revokeObjectURL(pending.previewUrl);
      this.pendingCrops.delete(target.id);
    } else if (target.public_id) {
      this.deletedImageIds.update((ids) => [...ids, target.public_id]);
    }
    this.persistedImages.update((imgs) => {
      const next = imgs.filter((_, i) => i !== index);
      if (next.length > 0 && !next.some((img) => img.isMain)) {
        next[0] = { ...next[0], isMain: true };
      }
      return next;
    });
    this.emitMedia();
  }

  removeNewImage(index: number): void {
    const target = this.newImages()[index];
    if (target) {
      URL.revokeObjectURL(target.previewUrl);
    }
    this.newImages.update((imgs) => imgs.filter((_, i) => i !== index));
    this.emitMedia();
  }

  hasPendingRawFiles(): boolean {
    return this.newImages().length > 0;
  }

  getPersistedImagesPayload(): IProductImage[] {
    return this.persistedImages();
  }

  validate(): string[] {
    if (this.showGallery() && this.totalImageCount() > this.effectiveMaxImages()) {
      return [`Superaste el máximo permitido de ${this.effectiveMaxImages()} imágenes.`];
    }
    return [];
  }

  hydrate(product: any): void {
    this.persistedImages.set(
      (product.images || []).map((img: any, idx: number) => ({
        ...(img.id ? { id: img.id } : {}),
        url: img.url,
        public_id: img.public_id,
        ...(img.storageProvider ? { storageProvider: img.storageProvider } : {}),
        ...(img.storageKey ? { storageKey: img.storageKey } : {}),
        ...(img.width ? { width: img.width } : {}),
        ...(img.height ? { height: img.height } : {}),
        ...(img.bytes ? { bytes: img.bytes } : {}),
        ...(img.format ? { format: img.format } : {}),
        ...(img.aspectRatio ? { aspectRatio: img.aspectRatio } : {}),
        ...(Array.isArray(img.crops) ? { crops: img.crops } : {}),
        variantSkus: Array.isArray(img.variantSkus) ? img.variantSkus : [],
        isMain: img.isMain ?? idx === 0,
      }))
    );
    this.emitMedia();
  }

  appendToFormData(formData: FormData): void {
    if (this.showGallery()) {
      for (const img of this.newImages()) {
        formData.append('images', img.file);
      }
      if (this.deletedImageIds().length > 0) {
        formData.append('deletedImages', JSON.stringify(this.deletedImageIds()));
      }
    }
  }
}
