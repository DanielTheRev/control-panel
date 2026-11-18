import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { IProductSeoFormConfig } from '../../../interfaces/tenant-bootstrap.interface';
import { NotificationsService } from '../../../services/notifications.service';
import { IProductFormBlock } from '../product-form-block.interface';

const MAX_SEO_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
const OG_TARGET_WIDTH = 1200;
const OG_TARGET_HEIGHT = 630;
const OG_ASPECT = OG_TARGET_WIDTH / OG_TARGET_HEIGHT; // 1.9047...

@Component({
  selector: 'app-product-seo-block',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-5">
      <!-- Header -->
      <div class="flex flex-wrap items-start justify-between gap-2 border-b border-base-200 pb-3">
        <div class="flex items-center gap-3">
          <span class="studio-index text-xs font-bold px-2 py-1 rounded-md bg-primary/10 text-primary">
            {{ blockIndex() }}
          </span>
          <div>
            <h2 class="font-bold text-base text-base-content">
              {{ title() || 'SEO & Metadatos' }}
            </h2>
            <p class="text-xs text-base-content/60">
              {{ subtitle() || 'Optimizá cómo se ve tu producto en Google, WhatsApp y redes sociales.' }}
            </p>
          </div>
        </div>

        @if (seoConfig()?.enableJsonLd) {
          <span class="badge badge-primary badge-outline badge-sm h-auto py-1 px-2 gap-1.5 font-medium rounded-md whitespace-normal text-left leading-tight max-w-full">
            <mat-icon class="!text-[13px] !w-[13px] !h-[13px] shrink-0">verified</mat-icon>
            <span>Rich Snippets Google (JSON-LD) activo automáticamente en tu tienda</span>
          </span>
        }
      </div>

      <!-- URL Amigable (Slug) -->
      @if (seoConfig()?.showSlugEditor) {
        <div class="space-y-1.5">
          <label class="text-xs font-semibold text-base-content block">
            {{ slugLabel() || 'URL Amigable (Slug)' }}
          </label>
          <div class="join w-full max-w-2xl">
            <span class="join-item px-3 flex items-center bg-base-200/80 border border-base-300 text-xs text-base-content/65 whitespace-nowrap">
              {{ storeHost() }}/producto/
            </span>
            <input
              type="text"
              class="input input-bordered input-sm join-item flex-1 text-xs"
              [placeholder]="suggestedSlug() || 'nombre-del-producto'"
              [ngModel]="slug()"
              (ngModelChange)="slug.set($event)"
            />
          </div>
        </div>
      }

      <!-- Meta Título + Meta Descripción + Google SERP Preview -->
      @if (seoConfig()?.showSeoFields) {
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div class="lg:col-span-7 space-y-3.5">
            <div class="space-y-1">
              <div class="flex items-center justify-between gap-2">
                <label class="text-xs font-semibold text-base-content">
                  {{ metaTitleLabel() || 'Meta Título (SEO)' }}
                </label>
                <span
                  class="text-xs font-medium tabular-nums"
                  [class.text-warning]="metaTitleLength() > 60"
                  [class.font-semibold]="metaTitleLength() > 60"
                  [class.text-base-content/55]="metaTitleLength() <= 60"
                >
                  {{ metaTitleLength() }} / 60
                </span>
              </div>
              <input
                type="text"
                class="input input-bordered input-sm w-full"
                [placeholder]="productName() || 'Ej: Body Calia de Tricot | Tu Tienda'"
                [ngModel]="metaTitle()"
                (ngModelChange)="metaTitle.set($event)"
              />
            </div>

            <div class="space-y-1">
              <div class="flex items-center justify-between gap-2">
                <label class="text-xs font-semibold text-base-content">
                  {{ metaDescriptionLabel() || 'Meta Descripción (SEO)' }}
                </label>
                <span
                  class="text-xs font-medium tabular-nums"
                  [class.text-warning]="metaDescriptionLength() > 160"
                  [class.font-semibold]="metaDescriptionLength() > 160"
                  [class.text-base-content/55]="metaDescriptionLength() <= 160"
                >
                  {{ metaDescriptionLength() }} / 160
                </span>
              </div>
              <textarea
                rows="3"
                class="textarea textarea-bordered textarea-sm w-full leading-relaxed"
                [placeholder]="shortDescription() || 'Describí los beneficios clave, materiales y envío para atraer clics en Google...'"
                [ngModel]="metaDescription()"
                (ngModelChange)="metaDescription.set($event)"
              ></textarea>
            </div>
          </div>

          <!-- Vista previa Google SERP -->
          <div class="lg:col-span-5">
            <span class="text-[11px] font-semibold uppercase tracking-wide text-base-content/55 block mb-1.5">
              Vista previa en Google
            </span>
            <div class="rounded-lg border border-base-300 bg-white text-slate-900 p-3.5 space-y-1 shadow-2xs">
              <div class="flex items-center gap-1.5 text-[11px] text-slate-600 truncate">
                <span class="w-4 h-4 rounded-full bg-slate-200 flex items-center justify-center text-[9px] font-bold text-slate-700 shrink-0">
                  {{ (storeName() || 'T').charAt(0).toUpperCase() }}
                </span>
                <span class="truncate">{{ storeHost() }} › producto › {{ previewSlug() }}</span>
              </div>
              <p class="text-[15px] font-medium text-[#1a0dab] leading-snug line-clamp-1">
                {{ previewMetaTitle() }}
              </p>
              <p class="text-xs text-slate-600 leading-relaxed line-clamp-2">
                {{ previewMetaDescription() }}
              </p>
            </div>
          </div>
        </div>
      }

      <!-- Imagen Open Graph (1200x630) + Vista previa WhatsApp / Redes -->
      @if (seoConfig()?.showMetaImage) {
        <div class="pt-4 border-t border-base-200 space-y-3">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div>
              <label class="text-xs font-semibold text-base-content block">
                {{ metaImageLabel() || 'Imagen para WhatsApp & Redes (1200×630)' }}
              </label>
              <span class="text-[11px] text-base-content/55">
                Relación 1.91:1 · Máx. 5 MB ·
                @if (enableCropper()) {
                  Recorte interactivo habilitado antes de subir.
                } @else {
                  El servidor recorta y optimiza automáticamente a 1200×630 JPEG.
                }
              </span>
            </div>

            <div class="flex items-center gap-2">
              @if (seoImagePreview()) {
                <button
                  type="button"
                  class="btn btn-ghost btn-xs text-error"
                  (click)="clearSeoImage()"
                >
                  Quitar imagen
                </button>
              }
              @if (enableCropper() && effectiveOgImageUrl(); as ogToCrop) {
                <button
                  type="button"
                  class="btn btn-outline btn-primary btn-xs rounded-md gap-1.5"
                  [disabled]="isLoadingRemoteCrop()"
                  (click)="openOgCropperFromUrl(ogToCrop)"
                >
                  @if (isLoadingRemoteCrop()) {
                    <span class="loading loading-spinner loading-xs"></span>
                  } @else {
                    <mat-icon class="!text-[15px] !w-[15px] !h-[15px]">crop</mat-icon>
                  }
                  <span>Encuadrar 1200×630</span>
                </button>
              }
              <label class="btn btn-outline btn-xs rounded-md gap-1.5 cursor-pointer">
                <mat-icon class="!text-[15px] !w-[15px] !h-[15px]">image</mat-icon>
                <span>{{ seoImagePreview() ? 'Cambiar imagen OG' : 'Subir imagen OG' }}</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  class="hidden"
                  (change)="onSeoImageSelected($event)"
                />
              </label>
            </div>
          </div>

          <!-- Preview estilo WhatsApp / OpenGraph -->
          <div class="max-w-md rounded-lg border border-base-300 bg-base-200/35 overflow-hidden">
            <div class="relative aspect-[1.91/1] bg-base-200 flex items-center justify-center overflow-hidden">
              @if (effectiveOgImageUrl(); as ogUrl) {
                <img
                  [src]="ogUrl"
                  alt="Vista previa Open Graph"
                  class="w-full h-full object-cover"
                />
                @if (!seoImagePreview()) {
                  <span class="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/70 text-white text-[10px] font-medium">
                    Fallback: foto principal (subí una OG 1200×630 dedicada)
                  </span>
                }
              } @else {
                <div class="text-center p-4 text-base-content/45 space-y-1">
                  <mat-icon class="!text-[28px] !w-[28px] !h-[28px]">share</mat-icon>
                  <p class="text-[11px]">Vista previa de tarjeta WhatsApp / Redes (1200×630)</p>
                </div>
              }
            </div>
            <div class="p-3 bg-base-100 border-t border-base-200 space-y-0.5">
              <p class="text-[10px] uppercase tracking-wide text-base-content/50 font-semibold truncate">
                {{ storeHost() }}
              </p>
              <p class="text-xs font-bold text-base-content line-clamp-1">
                {{ previewMetaTitle() }}
              </p>
              <p class="text-[11px] text-base-content/65 line-clamp-2">
                {{ previewMetaDescription() }}
              </p>
            </div>
          </div>
        </div>
      }
    </div>

    <!-- Modal Recortador OG 1.91:1 (1200x630) cuando enableCropper === true -->
    @if (cropSourceUrl(); as srcUrl) {
      <div class="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
        <div class="bg-base-100 rounded-xl border border-base-300 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col">
          <div class="flex items-center justify-between px-4 py-3 border-b border-base-200">
            <div class="flex items-center gap-2.5">
              <span class="w-8 h-8 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                <mat-icon class="!text-[18px] !w-[18px] !h-[18px]">crop</mat-icon>
              </span>
              <div>
                <h3 class="font-bold text-sm text-base-content">Encuadre Open Graph (1200×630)</h3>
                <p class="text-[11px] text-base-content/60">
                  Arrastrá la imagen y ajustá el zoom para definir cómo se verá al compartir por WhatsApp.
                </p>
              </div>
            </div>
            <button
              type="button"
              class="btn btn-ghost btn-sm btn-square rounded-md flex items-center justify-center"
              (click)="cancelOgCrop()"
            >
              <mat-icon class="!text-[18px] !w-[18px] !h-[18px] leading-none">close</mat-icon>
            </button>
          </div>

          <div class="p-4 space-y-3.5">
            <!-- Modo de encuadre + alerta si es foto vertical/angosta -->
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div class="join">
                <button
                  type="button"
                  class="btn btn-xs join-item"
                  [class.btn-primary]="cropFitMode() === 'cover'"
                  [class.btn-outline]="cropFitMode() !== 'cover'"
                  (click)="setCropFitMode('cover')"
                >
                  Llenar marco (sin bordes)
                </button>
                <button
                  type="button"
                  class="btn btn-xs join-item"
                  [class.btn-primary]="cropFitMode() === 'contain'"
                  [class.btn-outline]="cropFitMode() !== 'contain'"
                  (click)="setCropFitMode('contain')"
                >
                  Prenda completa (fondo blanco)
                </button>
              </div>
              <span class="text-[11px] text-base-content/60 font-mono">
                Original: {{ cropImgWidth() }}×{{ cropImgHeight() }} px
              </span>
            </div>

            @if (isNarrowVerticalSource()) {
              <div class="flex items-start gap-2 px-3 py-2 rounded-lg bg-warning/10 border border-warning/30 text-xs text-base-content/85">
                <mat-icon class="!text-[16px] !w-[16px] !h-[16px] text-warning shrink-0 mt-0.5">info</mat-icon>
                <span>
                  Esta foto es vertical ({{ cropImgWidth() }}×{{ cropImgHeight() }}). En formato ancho (1.91:1) al llenar el marco se recorta arriba/abajo; si querés que salga entera en WhatsApp, elegí <strong>Prenda completa (fondo blanco)</strong>.
                </span>
              </div>
            }

            <div
              #ogCropViewport
              class="relative w-full aspect-[1.91/1] rounded-lg overflow-hidden border border-primary/50 select-none cursor-grab active:cursor-grabbing"
              [class.bg-neutral]="cropFitMode() === 'cover'"
              [class.bg-white]="cropFitMode() === 'contain'"
              (mousedown)="startPan($event)"
              (mousemove)="movePan($event)"
              (mouseup)="endPan()"
              (mouseleave)="endPan()"
            >
              <img
                [src]="srcUrl"
                alt="Recorte OG"
                draggable="false"
                class="absolute top-1/2 left-1/2 max-w-none pointer-events-none"
                [style.width.%]="cropPreviewStyle().widthPct"
                [style.height.%]="cropPreviewStyle().heightPct"
                [style.transform]="'translate(calc(-50% + ' + panXPct() + '%), calc(-50% + ' + panYPct() + '%))'"
              />
              <span class="absolute top-2 left-2 px-2 py-0.5 rounded bg-primary text-primary-content text-[10px] font-bold">
                1.91:1 · 1200×630
              </span>
            </div>

            <div class="flex flex-wrap items-center justify-between gap-3">
              <div class="flex items-center gap-2 flex-1 min-w-[200px]">
                <span class="text-xs font-semibold text-base-content/70">Zoom</span>
                <input
                  type="range"
                  min="1"
                  max="2.5"
                  step="0.05"
                  class="range range-primary range-xs flex-1"
                  [ngModel]="zoom()"
                  (ngModelChange)="zoom.set(+$event)"
                />
                <span class="text-xs font-mono w-11 text-right">{{ Math.round(zoom() * 100) }}%</span>
              </div>
              <button type="button" class="btn btn-ghost btn-xs rounded-md" (click)="resetCropTransform()">
                Centrar
              </button>
            </div>
          </div>

          <div class="flex items-center justify-end gap-2 px-4 py-3 border-t border-base-200 bg-base-200/30">
            <button type="button" class="btn btn-ghost btn-sm rounded-md" (click)="cancelOgCrop()">
              Cancelar
            </button>
            <button
              type="button"
              class="btn btn-primary btn-sm rounded-md gap-1"
              [disabled]="isApplyingCrop()"
              (click)="applyOgCrop()"
            >
              <mat-icon class="!text-[16px] !w-[16px] !h-[16px]">check</mat-icon>
              Aplicar recorte (1200×630)
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ProductSeoBlockComponent implements IProductFormBlock {
  private readonly notifications = inject(NotificationsService);
  protected readonly Math = Math;

  blockIndex = input.required<string>();
  seoConfig = input<IProductSeoFormConfig | undefined>(undefined);
  title = input<string>('');
  subtitle = input<string>('');
  metaTitleLabel = input<string>('');
  metaDescriptionLabel = input<string>('');
  slugLabel = input<string>('');
  metaImageLabel = input<string>('');

  // Contexto vivo del producto/tienda para placeholders y previews
  productName = input<string>('');
  shortDescription = input<string>('');
  fallbackImageUrl = input<string | null>(null);
  storeName = input<string>('');
  storeSlug = input<string>('');
  storeDomain = input<string>('');
  enableCropper = input<boolean>(false);

  metaTitle = signal('');
  metaDescription = signal('');
  slug = signal('');
  seoImageFile = signal<File | null>(null);
  seoImagePreview = signal<string | null>(null);
  private existingMetaImage = signal<{ url: string; public_id?: string } | null>(null);
  private metaImageRemoved = signal(false);

  // Estado del recortador 1.91:1
  cropSourceUrl = signal<string | null>(null);
  private cropSourceImg: HTMLImageElement | null = null;
  cropImgWidth = signal<number>(0);
  cropImgHeight = signal<number>(0);
  cropFitMode = signal<'cover' | 'contain'>('cover');
  zoom = signal<number>(1);
  panXPct = signal<number>(0);
  panYPct = signal<number>(0);
  isApplyingCrop = signal<boolean>(false);
  isLoadingRemoteCrop = signal<boolean>(false);
  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private dragOriginXPct = 0;
  private dragOriginYPct = 0;

  readonly isNarrowVerticalSource = computed(() => {
    const w = this.cropImgWidth();
    const h = this.cropImgHeight();
    return w > 0 && h > 0 && w / h < 1.1;
  });

  readonly cropPreviewStyle = computed(() => {
    const w = this.cropImgWidth();
    const h = this.cropImgHeight();
    const z = this.zoom();
    if (w <= 0 || h <= 0) return { widthPct: 100 * z, heightPct: 100 * z };

    const imgAspect = w / h;
    const mode = this.cropFitMode();
    // Base percentages relative to the 1.91:1 viewport
    let baseW = 100;
    let baseH = 100;
    if (mode === 'cover') {
      if (imgAspect > OG_ASPECT) {
        baseH = 100;
        baseW = (imgAspect / OG_ASPECT) * 100;
      } else {
        baseW = 100;
        baseH = (OG_ASPECT / imgAspect) * 100;
      }
    } else {
      if (imgAspect > OG_ASPECT) {
        baseW = 100;
        baseH = (OG_ASPECT / imgAspect) * 100;
      } else {
        baseH = 100;
        baseW = (imgAspect / OG_ASPECT) * 100;
      }
    }
    return {
      widthPct: baseW * z,
      heightPct: baseH * z,
    };
  });

  readonly metaTitleLength = computed(() => this.metaTitle().trim().length);
  readonly metaDescriptionLength = computed(() => this.metaDescription().trim().length);

  readonly suggestedSlug = computed(() =>
    this.productName()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  );

  readonly previewSlug = computed(
    () => this.slug().trim() || this.suggestedSlug() || 'nombre-del-producto'
  );

  readonly storeHost = computed(() => {
    const custom = this.storeDomain()
      .trim()
      .replace(/^https?:\/\//i, '')
      .replace(/\/+$/, '');
    if (custom) return custom;
    const slug = this.storeSlug().trim();
    return slug ? `${slug}.vexx.com.ar` : 'tutienda.vexx.com.ar';
  });

  readonly previewMetaTitle = computed(() => {
    const mt = this.metaTitle().trim();
    if (mt) return mt;
    const pName = this.productName().trim();
    const sName = this.storeName().trim();
    if (pName && sName) return `${pName} | ${sName}`;
    return pName || 'Título de tu producto en Google';
  });

  readonly previewMetaDescription = computed(
    () =>
      this.metaDescription().trim() ||
      this.shortDescription().trim() ||
      'Comprá online con envío rápido y cuotas. Descubrí detalles, talles y disponibilidad.'
  );

  readonly effectiveOgImageUrl = computed(() => {
    if (this.seoImagePreview()) return this.seoImagePreview();
    if (this.metaImageRemoved()) return null;
    return this.fallbackImageUrl();
  });

  onSeoImageSelected(event: Event): void {
    const inputEl = event.target as HTMLInputElement;
    const file = inputEl.files?.[0];
    inputEl.value = '';
    if (!file) return;

    const allowed = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp']);
    if (!allowed.has(file.type)) {
      this.notifications.error('Formato no válido. Subí una imagen PNG, JPG o WEBP.');
      return;
    }
    if (file.size > MAX_SEO_IMAGE_BYTES) {
      this.notifications.error('La imagen SEO no puede superar los 5 MB.');
      return;
    }

    if (this.enableCropper()) {
      this.openOgCropper(file);
      return;
    }

    this.setDirectSeoImage(file);
  }

  private setDirectSeoImage(file: File): void {
    const prev = this.seoImagePreview();
    if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev);
    this.seoImageFile.set(file);
    this.seoImagePreview.set(URL.createObjectURL(file));
    this.metaImageRemoved.set(false);
  }

  private openOgCropper(file: File | Blob): void {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      this.cropSourceImg = img;
      this.cropImgWidth.set(img.naturalWidth || 0);
      this.cropImgHeight.set(img.naturalHeight || 0);
      this.cropFitMode.set('cover');
      this.resetCropTransform();
      this.cropSourceUrl.set(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      this.notifications.error('No se pudo leer la imagen seleccionada.');
    };
    img.src = url;
  }

  setCropFitMode(mode: 'cover' | 'contain'): void {
    this.cropFitMode.set(mode);
    this.resetCropTransform();
  }

  async openOgCropperFromUrl(imageUrl: string): Promise<void> {
    if (!imageUrl || this.isLoadingRemoteCrop()) return;
    if (imageUrl.startsWith('blob:') && this.seoImageFile()) {
      this.openOgCropper(this.seoImageFile()!);
      return;
    }

    this.isLoadingRemoteCrop.set(true);
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`No se pudo descargar la imagen (${response.status})`);
      }
      const blob = await response.blob();
      this.openOgCropper(blob);
    } catch (err: any) {
      this.notifications.error(
        err?.message || 'No se pudo cargar la imagen para recortar. Probá subirla desde tu dispositivo.'
      );
    } finally {
      this.isLoadingRemoteCrop.set(false);
    }
  }

  resetCropTransform(): void {
    this.zoom.set(1);
    this.panXPct.set(0);
    this.panYPct.set(0);
  }

  startPan(event: MouseEvent): void {
    this.isDragging = true;
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;
    this.dragOriginXPct = this.panXPct();
    this.dragOriginYPct = this.panYPct();
  }

  movePan(event: MouseEvent): void {
    if (!this.isDragging) return;
    const container = event.currentTarget as HTMLElement | null;
    const rect = container?.getBoundingClientRect();
    const w = rect?.width || 600;
    const h = rect?.height || 314;
    const deltaXPct = ((event.clientX - this.dragStartX) / w) * 100;
    const deltaYPct = ((event.clientY - this.dragStartY) / h) * 100;
    this.panXPct.set(this.dragOriginXPct + deltaXPct);
    this.panYPct.set(this.dragOriginYPct + deltaYPct);
  }

  endPan(): void {
    this.isDragging = false;
  }

  cancelOgCrop(): void {
    const url = this.cropSourceUrl();
    if (url && url.startsWith('blob:')) URL.revokeObjectURL(url);
    this.cropSourceUrl.set(null);
    this.cropSourceImg = null;
    this.cropImgWidth.set(0);
    this.cropImgHeight.set(0);
  }

  async applyOgCrop(): Promise<void> {
    const img = this.cropSourceImg;
    if (!img || this.isApplyingCrop()) return;

    this.isApplyingCrop.set(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = OG_TARGET_WIDTH;
      canvas.height = OG_TARGET_HEIGHT;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas no disponible');

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, OG_TARGET_WIDTH, OG_TARGET_HEIGHT);

      const style = this.cropPreviewStyle();
      const drawW = (style.widthPct / 100) * OG_TARGET_WIDTH;
      const drawH = (style.heightPct / 100) * OG_TARGET_HEIGHT;
      const offsetX = (this.panXPct() / 100) * OG_TARGET_WIDTH;
      const offsetY = (this.panYPct() / 100) * OG_TARGET_HEIGHT;
      const dx = (OG_TARGET_WIDTH - drawW) / 2 + offsetX;
      const dy = (OG_TARGET_HEIGHT - drawH) / 2 + offsetY;

      ctx.drawImage(img, dx, dy, drawW, drawH);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', 0.9)
      );
      if (!blob) throw new Error('Error al generar la imagen recortada');

      const croppedFile = new File([blob], 'seo-og-1200x630.jpg', { type: 'image/jpeg' });
      this.setDirectSeoImage(croppedFile);
      this.cancelOgCrop();
    } catch (err: any) {
      this.notifications.error(err?.message || 'No se pudo aplicar el recorte.');
    } finally {
      this.isApplyingCrop.set(false);
    }
  }

  clearSeoImage(): void {
    const prev = this.seoImagePreview();
    if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev);
    this.seoImageFile.set(null);
    this.seoImagePreview.set(null);
    this.existingMetaImage.set(null);
    this.metaImageRemoved.set(true);
  }

  validate(): string[] {
    return [];
  }

  hydrate(product: any): void {
    this.metaTitle.set(product.seo?.metaTitle || '');
    this.metaDescription.set(product.seo?.metaDescription || '');
    this.slug.set(product.slug || product.seo?.slug || '');
    if (product.seo?.metaImage?.url) {
      this.existingMetaImage.set(product.seo.metaImage);
      this.seoImagePreview.set(product.seo.metaImage.url);
      this.metaImageRemoved.set(false);
    }
  }

  appendToFormData(formData: FormData): void {
    const cfg = this.seoConfig();
    if (!cfg?.addonEnabled) return;

    if (cfg.showSlugEditor && this.slug().trim()) {
      formData.append('slug', this.slug().trim());
    }

    if (cfg.showSeoFields || cfg.showMetaImage) {
      const seoPayload: Record<string, any> = {};
      if (this.metaTitle().trim()) seoPayload['metaTitle'] = this.metaTitle().trim();
      if (this.metaDescription().trim()) seoPayload['metaDescription'] = this.metaDescription().trim();

      const existing = this.existingMetaImage();
      if (existing && !this.seoImageFile() && !this.metaImageRemoved()) {
        seoPayload['metaImage'] = existing;
      }

      if (Object.keys(seoPayload).length > 0) {
        formData.append('seo', JSON.stringify(seoPayload));
      }
    }

    if (cfg.showMetaImage && this.seoImageFile()) {
      formData.append('seoImage', this.seoImageFile()!);
    }
  }
}
