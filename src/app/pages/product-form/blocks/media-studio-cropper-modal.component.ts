import { CommonModule, DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import {
  MediaStudioAspectRatio,
  MediaStudioCropRequest,
} from '../../../services/media-studio.service';

interface CropBox {
  xPct: number;
  yPct: number;
  wPct: number;
  hPct: number;
}

const ASPECT_NUMERICS: Record<Exclude<MediaStudioAspectRatio, 'original'>, number> = {
  '1:1': 1,
  '4:5': 4 / 5,
  '9:16': 9 / 16,
  '16:9': 16 / 9,
};

const ASPECT_LABELS: Record<MediaStudioAspectRatio, string> = {
  original: 'Original',
  '1:1': 'Cuadrada',
  '4:5': 'Vertical',
  '9:16': 'Alta / Story',
  '16:9': 'Ancha',
};

@Component({
  selector: 'app-media-studio-cropper-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-6">
      <div class="bg-base-100 rounded-xl shadow-2xl border border-base-300 w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]">
        <!-- Header -->
        <div class="flex items-center justify-between px-5 py-3.5 border-b border-base-200">
          <div class="flex items-center gap-2.5">
            <span class="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <mat-icon class="!text-[18px] !w-[18px] !h-[18px]">crop</mat-icon>
            </span>
            <div>
              <h3 class="font-bold text-sm text-base-content">Media Studio · Relaciones de Aspecto</h3>
              <p class="text-[11px] text-base-content/60">
                Encuadrá cada formato para tus ubicaciones. El servidor recorta y optimiza a WebP.
              </p>
            </div>
          </div>
          <button
            type="button"
            class="btn btn-ghost btn-sm btn-square rounded-md flex items-center justify-center"
            [disabled]="isUploading()"
            (click)="cancelled.emit()"
          >
            <mat-icon class="!text-[18px] !w-[18px] !h-[18px] leading-none">close</mat-icon>
          </button>
        </div>

        <!-- Body (Split-Pane estilo Meta) -->
        <div class="p-4 sm:p-5 overflow-y-auto grid grid-cols-1 md:grid-cols-12 gap-5">
          <!-- Left Pane: Live Aspect Ratio Thumbnails -->
          <div class="md:col-span-5 flex flex-col justify-between gap-4">
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <div>
                  <h4 class="text-xs font-bold text-base-content">Relaciones de aspecto</h4>
                  <p class="text-[11px] text-base-content/55">
                    Elegí qué formatos generar y tocá uno para re-encuadrar.
                  </p>
                </div>
                <span class="badge badge-primary badge-outline badge-sm font-semibold whitespace-nowrap shrink-0">
                  {{ enabledRatios().length }} incluido(s)
                </span>
              </div>

              <div class="grid grid-cols-2 gap-2.5">
                @for (ratio of availableRatios(); track ratio) {
                  @let box = getCropBox(ratio);
                  @let enabled = isRatioEnabled(ratio);
                  @let isActive = activeRatio() === ratio;
                  <div
                    class="rounded-lg border p-2 transition-all cursor-pointer bg-base-100 flex flex-col gap-2"
                    [class.border-primary]="isActive"
                    [class.ring-2]="isActive"
                    [class.ring-primary/25]="isActive"
                    [class.border-base-200]="!isActive"
                    [class.opacity-50]="!enabled && !isActive"
                    (click)="selectActiveRatio(ratio)"
                  >
                    <!-- Live Cropped Thumbnail Box -->
                    <div class="w-full h-24 rounded-lg bg-base-200/80 flex items-center justify-center overflow-hidden p-1">
                      <div
                        class="relative overflow-hidden rounded border border-black/10 bg-base-300 shadow-2xs"
                        [style.aspect-ratio]="cssAspectRatio(ratio)"
                        [style.height]="ratio === '16:9' ? 'auto' : '100%'"
                        [style.width]="ratio === '16:9' ? '100%' : 'auto'"
                        [style.max-width]="'100%'"
                        [style.max-height]="'100%'"
                      >
                        @if (imageLoaded()) {
                          <img
                            [src]="previewUrl()"
                            alt="Vista previa {{ ratio }}"
                            class="absolute max-w-none max-h-none pointer-events-none select-none"
                            [style.width.%]="(100 / box.wPct)"
                            [style.height.%]="(100 / box.hPct)"
                            [style.left.%]="-(box.xPct / box.wPct) * 100"
                            [style.top.%]="-(box.yPct / box.hPct) * 100"
                          />
                        }
                      </div>
                    </div>

                    <!-- Footer: Label + Include Toggle -->
                    <div class="flex items-center justify-between gap-1 px-0.5">
                      <div class="min-w-0">
                        <div class="text-[11px] font-bold text-base-content leading-tight truncate">
                          {{ getRatioLabel(ratio) }}
                        </div>
                        <div class="text-[10px] font-mono text-base-content/55">
                          {{ ratio }}
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        class="checkbox checkbox-xs checkbox-primary"
                        [checked]="enabled"
                        [disabled]="enabled && enabledRatios().length === 1"
                        title="Incluir este formato al subir"
                        (click)="$event.stopPropagation(); toggleRatioEnabled(ratio)"
                      />
                    </div>
                  </div>
                }
              </div>
            </div>

            <!-- Quality Slider -->
            <div class="bg-base-200/60 rounded-xl p-3 space-y-2 border border-base-200">
              <div class="flex items-center justify-between">
                <span class="text-xs font-semibold text-base-content/80">
                  Compresión WebP
                </span>
                <span class="badge badge-primary badge-xs font-mono">{{ quality() }}%</span>
              </div>
              <input
                type="range"
                min="40"
                max="100"
                step="1"
                class="range range-xs range-primary w-full"
                [ngModel]="quality()"
                (ngModelChange)="quality.set(+$event)"
              />
              <div class="flex justify-between text-[10px] text-base-content/50">
                <span>Más liviana (40%)</span>
                <span>Sin pérdida visual (100%)</span>
              </div>
            </div>
          </div>

          <!-- Right Pane: Interactive Cropper Canvas -->
          <div class="md:col-span-7 flex flex-col gap-2.5">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="badge badge-primary badge-sm font-mono font-bold">
                  {{ activeRatio() }}
                </span>
                <span class="text-xs font-semibold text-base-content/80">
                  {{ getRatioLabel(activeRatio()) }}
                </span>
                @if (imageLoaded()) {
                  <span class="text-[11px] text-base-content/50 font-mono">
                    ({{ naturalWidth() }}×{{ naturalHeight() }})
                  </span>
                }
              </div>

              <button
                type="button"
                class="btn btn-ghost btn-xs gap-1"
                (click)="resetActiveCrop()"
              >
                <mat-icon class="!text-[14px] !w-[14px] !h-[14px]">center_focus_strong</mat-icon>
                Centrar
              </button>
            </div>

            <div class="bg-neutral/95 rounded-xl p-4 flex items-center justify-center min-h-[300px] sm:min-h-[380px] select-none flex-1">
              <div
                class="relative inline-block max-w-full max-h-[52vh] overflow-hidden rounded-lg"
                (pointermove)="onPointerMove($event)"
                (pointerup)="onPointerUp()"
                (pointerleave)="onPointerUp()"
              >
                <img
                  [src]="previewUrl()"
                  alt="Vista previa recorte"
                  class="block max-w-full max-h-[52vh] w-auto h-auto pointer-events-none select-none"
                  (load)="onImageLoaded($event)"
                />

                @if (imageLoaded()) {
                  @let box = activeCropBox();
                  <!-- Crop Rectangle -->
                  @if (activeRatio() === 'original') {
                    <div class="absolute inset-0 border-2 border-primary/80 pointer-events-none">
                      <span class="badge badge-primary badge-xs absolute top-2 left-2 font-mono">
                        Original · Sin recorte (WebP)
                      </span>
                    </div>
                  } @else {
                    <div
                      class="absolute border-2 border-primary shadow-[0_0_0_9999px_rgba(0,0,0,0.58)] cursor-move touch-none"
                      [style.left.%]="box.xPct * 100"
                      [style.top.%]="box.yPct * 100"
                      [style.width.%]="box.wPct * 100"
                      [style.height.%]="box.hPct * 100"
                      (pointerdown)="startDrag($event, 'move')"
                    >
                      <!-- Rule of thirds grid -->
                      <div class="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
                        <div class="border-r border-b border-white/25"></div>
                        <div class="border-r border-b border-white/25"></div>
                        <div class="border-b border-white/25"></div>
                        <div class="border-r border-b border-white/25"></div>
                        <div class="border-r border-b border-white/25"></div>
                        <div class="border-b border-white/25"></div>
                        <div class="border-r border-white/25"></div>
                        <div class="border-r border-white/25"></div>
                        <div></div>
                      </div>

                      <span class="badge badge-primary badge-xs absolute top-1.5 left-1.5 font-mono">
                        {{ activeRatio() }}
                      </span>

                      <!-- Resize Handle (bottom-right) -->
                      <button
                        type="button"
                        aria-label="Redimensionar recorte"
                        class="absolute -bottom-2 -right-2 w-5 h-5 rounded-full bg-primary text-primary-content border-2 border-white shadow cursor-nwse-resize flex items-center justify-center touch-none"
                        (pointerdown)="startDrag($event, 'resize')"
                      >
                        <mat-icon class="!text-[11px] !w-[11px] !h-[11px]">open_in_full</mat-icon>
                      </button>
                    </div>
                  }
                }
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="flex items-center justify-between gap-2 px-5 py-3 border-t border-base-200 bg-base-100">
          <span class="text-[11px] text-base-content/60">
            Se generarán <strong>{{ enabledRatios().length }}</strong> versión(es) WebP:
            <span class="font-mono">{{ enabledRatios().join(', ') }}</span>
          </span>
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="btn btn-ghost btn-sm"
              [disabled]="isUploading()"
              (click)="cancelled.emit()"
            >
              Cancelar
            </button>
            <button
              type="button"
              class="btn btn-primary btn-sm gap-1.5"
              [disabled]="isUploading() || enabledRatios().length === 0 || !imageLoaded()"
              (click)="confirmUpload()"
            >
              @if (isUploading()) {
                <span class="loading loading-spinner loading-xs"></span>
                Optimizando WebP...
              } @else {
                <mat-icon class="!text-[16px] !w-[16px] !h-[16px]">check</mat-icon>
                Aplicar Recortes
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class MediaStudioCropperModalComponent implements OnInit, OnDestroy {
  private readonly hostEl = inject(ElementRef<HTMLElement>);
  private readonly documentRef = inject(DOCUMENT);

  previewUrl = input.required<string>();
  allowedAspectRatios = input<string[]>(['original', '1:1', '9:16', '16:9']);
  defaultQuality = input<number>(82);
  isUploading = input<boolean>(false);

  confirmed = output<{ crops: MediaStudioCropRequest[]; quality: number }>();
  cancelled = output<void>();

  readonly availableRatios = computed<MediaStudioAspectRatio[]>(() => {
    const valid: MediaStudioAspectRatio[] = ['original', '1:1', '4:5', '9:16', '16:9'];
    const filtered = this.allowedAspectRatios().filter((r): r is MediaStudioAspectRatio =>
      valid.includes(r as MediaStudioAspectRatio)
    );
    return filtered.length > 0 ? filtered : ['original', '1:1', '9:16', '16:9'];
  });

  activeRatio = signal<MediaStudioAspectRatio>('1:1');
  enabledRatios = signal<MediaStudioAspectRatio[]>([]);
  quality = signal<number>(82);

  naturalWidth = signal<number>(1000);
  naturalHeight = signal<number>(1000);
  imageLoaded = signal<boolean>(false);

  private cropMap = signal<Partial<Record<MediaStudioAspectRatio, CropBox>>>({});

  private dragMode: 'move' | 'resize' | null = null;
  private dragStartX = 0;
  private dragStartY = 0;
  private containerWidth = 1;
  private containerHeight = 1;
  private dragStartBox: CropBox = { xPct: 0, yPct: 0, wPct: 1, hPct: 1 };

  constructor() {
    effect(() => {
      const avail = this.availableRatios();
      const first = avail[0];
      const currentActive = untracked(() => this.activeRatio());
      if (!avail.includes(currentActive)) {
        this.activeRatio.set(first);
      }
      const prevEnabled = untracked(() => this.enabledRatios());
      const validEnabled = prevEnabled.filter((r) => avail.includes(r));
      if (validEnabled.length === 0) {
        this.enabledRatios.set([...avail]);
      } else if (validEnabled.length !== prevEnabled.length) {
        this.enabledRatios.set(validEnabled);
      }
    });
  }

  ngOnInit(): void {
    const dq = Math.min(100, Math.max(40, Math.round(this.defaultQuality() || 82)));
    this.quality.set(dq);
    this.documentRef.body.appendChild(this.hostEl.nativeElement);
  }

  ngOnDestroy(): void {
    const el = this.hostEl.nativeElement;
    if (el.parentNode === this.documentRef.body) {
      this.documentRef.body.removeChild(el);
    }
  }

  readonly activeCropBox = computed<CropBox>(() => {
    const ratio = this.activeRatio();
    return this.cropMap()[ratio] ?? this.computeDefaultBox(ratio);
  });

  getCropBox(ratio: MediaStudioAspectRatio): CropBox {
    return this.cropMap()[ratio] ?? this.computeDefaultBox(ratio);
  }

  getRatioLabel(ratio: MediaStudioAspectRatio): string {
    return ASPECT_LABELS[ratio] || ratio;
  }

  cssAspectRatio(ratio: MediaStudioAspectRatio): string {
    if (ratio === 'original') {
      return `${this.naturalWidth()} / ${this.naturalHeight()}`;
    }
    return ratio.replace(':', ' / ');
  }

  onImageLoaded(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (!img) return;
    this.naturalWidth.set(img.naturalWidth || 1000);
    this.naturalHeight.set(img.naturalHeight || 1000);
    this.imageLoaded.set(true);

    const nextMap: Partial<Record<MediaStudioAspectRatio, CropBox>> = {};
    for (const ratio of this.availableRatios()) {
      nextMap[ratio] = this.computeDefaultBox(ratio);
    }
    this.cropMap.set(nextMap);
  }

  selectActiveRatio(ratio: MediaStudioAspectRatio): void {
    this.activeRatio.set(ratio);
    if (!this.enabledRatios().includes(ratio)) {
      this.enabledRatios.update((list) => [...list, ratio]);
    }
  }

  isRatioEnabled(ratio: MediaStudioAspectRatio): boolean {
    return this.enabledRatios().includes(ratio);
  }

  toggleRatioEnabled(ratio: MediaStudioAspectRatio): void {
    const curr = this.enabledRatios();
    if (curr.includes(ratio)) {
      if (curr.length === 1) return; // mínimo 1 recorte
      const next = curr.filter((r) => r !== ratio);
      this.enabledRatios.set(next);
      if (this.activeRatio() === ratio) {
        this.activeRatio.set(next[0]);
      }
    } else {
      this.enabledRatios.set([...curr, ratio]);
      this.activeRatio.set(ratio);
    }
  }

  resetActiveCrop(): void {
    const ratio = this.activeRatio();
    this.cropMap.update((m) => ({ ...m, [ratio]: this.computeDefaultBox(ratio) }));
  }

  startDrag(event: PointerEvent, mode: 'move' | 'resize'): void {
    event.preventDefault();
    event.stopPropagation();

    const targetEl = event.currentTarget as HTMLElement;
    const container = targetEl.closest('.relative') as HTMLElement | null;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    this.containerWidth = Math.max(rect.width, 1);
    this.containerHeight = Math.max(rect.height, 1);
    this.dragMode = mode;
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;
    this.dragStartBox = { ...this.activeCropBox() };
  }

  onPointerMove(event: PointerEvent): void {
    if (!this.dragMode) return;

    const dxPct = (event.clientX - this.dragStartX) / this.containerWidth;
    const dyPct = (event.clientY - this.dragStartY) / this.containerHeight;
    const ratio = this.activeRatio();
    if (ratio === 'original') return;
    const start = this.dragStartBox;

    if (this.dragMode === 'move') {
      const xPct = Math.max(0, Math.min(1 - start.wPct, start.xPct + dxPct));
      const yPct = Math.max(0, Math.min(1 - start.hPct, start.yPct + dyPct));
      this.cropMap.update((m) => ({
        ...m,
        [ratio]: { ...start, xPct: round4(xPct), yPct: round4(yPct) },
      }));
      return;
    }

    // Resize manteniendo aspect ratio exacto en píxeles de la imagen natural
    const imgW = this.naturalWidth();
    const imgH = this.naturalHeight();
    const targetAspect = ASPECT_NUMERICS[ratio];
    const imgAspect = imgW / imgH;

    let newWPct = Math.max(0.05, Math.min(1 - start.xPct, start.wPct + dxPct));
    let newHPct = (newWPct * imgAspect) / targetAspect;

    if (start.yPct + newHPct > 1) {
      newHPct = 1 - start.yPct;
      newWPct = (newHPct * targetAspect) / imgAspect;
    }
    if (newHPct < 0.05) {
      newHPct = 0.05;
      newWPct = (newHPct * targetAspect) / imgAspect;
    }

    this.cropMap.update((m) => ({
      ...m,
      [ratio]: {
        xPct: round4(start.xPct),
        yPct: round4(start.yPct),
        wPct: round4(Math.min(1 - start.xPct, newWPct)),
        hPct: round4(Math.min(1 - start.yPct, newHPct)),
      },
    }));
  }

  onPointerUp(): void {
    this.dragMode = null;
  }

  confirmUpload(): void {
    const q = this.quality();
    const crops: MediaStudioCropRequest[] = this.enabledRatios().map((ratio) => {
      const box = this.cropMap()[ratio] ?? this.computeDefaultBox(ratio);
      return {
        aspectRatio: ratio,
        xPct: clamp01(box.xPct),
        yPct: clamp01(box.yPct),
        wPct: Math.max(0.05, Math.min(1, box.wPct)),
        hPct: Math.max(0.05, Math.min(1, box.hPct)),
        quality: q,
      };
    });

    this.confirmed.emit({ crops, quality: q });
  }

  private computeDefaultBox(ratio: MediaStudioAspectRatio): CropBox {
    if (ratio === 'original') {
      return { xPct: 0, yPct: 0, wPct: 1, hPct: 1 };
    }
    const imgW = this.naturalWidth();
    const imgH = this.naturalHeight();
    const imgAspect = imgW / imgH;
    const targetAspect = ASPECT_NUMERICS[ratio];

    let wPct: number;
    let hPct: number;

    if (imgAspect > targetAspect) {
      hPct = 0.9;
      wPct = (hPct * targetAspect) / imgAspect;
    } else {
      wPct = 0.9;
      hPct = (wPct * imgAspect) / targetAspect;
    }

    wPct = Math.min(1, Math.max(0.05, wPct));
    hPct = Math.min(1, Math.max(0.05, hPct));

    return {
      xPct: round4((1 - wPct) / 2),
      yPct: round4((1 - hPct) / 2),
      wPct: round4(wPct),
      hPct: round4(hPct),
    };
  }
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, round4(n)));
}
