import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { IProductDescriptionFormConfig } from '../../../interfaces/tenant-bootstrap.interface';
import { IProductFormBlock } from '../product-form-block.interface';

@Component({
  selector: 'app-product-descriptions-block',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-4">
      <!-- Header -->
      <div class="flex items-center gap-3 border-b border-base-200 pb-3">
        <span class="studio-index text-xs font-bold px-2 py-1 rounded-md bg-primary/10 text-primary">
          {{ blockIndex() }}
        </span>
        <div>
          <h2 class="font-bold text-base text-base-content">{{ title() }}</h2>
          <p class="text-xs text-base-content/60">
            {{ subtitleLabel() || 'Subtítulo, extracto y storytelling enriquecido para tus plantillas' }}
          </p>
        </div>
      </div>

      @if (showSubtitle()) {
        <div class="form-control">
          <label class="label py-1">
            <span class="label-text text-xs font-semibold">
              {{ subtitleFieldLabel() || 'Subtítulo / Bajada' }}
            </span>
            <span class="label-text-alt text-[11px] tabular-nums text-base-content/50">
              {{ subtitle().length }}/200
            </span>
          </label>
          <input
            type="text"
            maxlength="200"
            class="input input-bordered w-full text-sm"
            placeholder="Ej: Voile de algodón con bordado floral, alforzas y volados"
            [ngModel]="subtitle()"
            (ngModelChange)="subtitle.set($event)"
          />
        </div>
      }

      @if (showShortDescription()) {
        <div class="form-control">
          <label class="label py-1">
            <span class="label-text text-xs font-semibold">
              {{ shortDescriptionLabel() || 'Descripción Corta (Extracto)' }}
            </span>
          </label>
          <textarea
            rows="3"
            class="textarea textarea-bordered w-full text-sm leading-relaxed"
            placeholder="Resumen breve para tarjetas del catálogo y POS..."
            [ngModel]="shortDescription()"
            (ngModelChange)="shortDescription.set($event)"
          ></textarea>
        </div>
      }

      @if (showRichDescription()) {
        <div class="form-control">
          <label class="label py-1">
            <span class="label-text text-xs font-semibold">
              {{ largeDescriptionLabel() || 'Descripción Detallada (Storytelling)' }}
            </span>
          </label>

          <div class="rounded-xl border border-base-300 bg-base-100 overflow-hidden focus-within:border-primary transition-colors">
            <!-- Toolbar Rich Text -->
            <div class="flex flex-wrap items-center gap-1 px-2.5 py-1.5 border-b border-base-200 bg-base-200/40">
              <button
                type="button"
                class="btn btn-ghost btn-xs btn-square font-bold"
                title="Negrita"
                (mousedown)="$event.preventDefault()"
                (click)="execFormat('bold')"
              >
                B
              </button>
              <button
                type="button"
                class="btn btn-ghost btn-xs btn-square italic font-serif"
                title="Cursiva"
                (mousedown)="$event.preventDefault()"
                (click)="execFormat('italic')"
              >
                I
              </button>
              <button
                type="button"
                class="btn btn-ghost btn-xs btn-square underline"
                title="Subrayado"
                (mousedown)="$event.preventDefault()"
                (click)="execFormat('underline')"
              >
                U
              </button>

              <div class="w-px h-4 bg-base-300 mx-1"></div>

              <button
                type="button"
                class="btn btn-ghost btn-xs btn-square"
                title="Lista numerada"
                (mousedown)="$event.preventDefault()"
                (click)="execFormat('insertOrderedList')"
              >
                <mat-icon class="!text-[16px] !w-[16px] !h-[16px]">format_list_numbered</mat-icon>
              </button>
              <button
                type="button"
                class="btn btn-ghost btn-xs btn-square"
                title="Lista con viñetas"
                (mousedown)="$event.preventDefault()"
                (click)="execFormat('insertUnorderedList')"
              >
                <mat-icon class="!text-[16px] !w-[16px] !h-[16px]">format_list_bulleted</mat-icon>
              </button>

              <div class="w-px h-4 bg-base-300 mx-1"></div>

              <button
                type="button"
                class="btn btn-ghost btn-xs btn-square"
                title="Limpiar formato"
                (mousedown)="$event.preventDefault()"
                (click)="execFormat('removeFormat')"
              >
                <mat-icon class="!text-[16px] !w-[16px] !h-[16px]">format_clear</mat-icon>
              </button>
            </div>

            <!-- Editor Contenteditable -->
            <div
              #richEditor
              contenteditable="true"
              class="min-h-[140px] max-h-[360px] overflow-y-auto px-3.5 py-3 text-sm leading-relaxed outline-none prose prose-sm max-w-none"
              (input)="onRichInput()"
            ></div>
          </div>
          <span class="text-[11px] text-base-content/50 mt-1">
            Soporta negritas, cursivas y listas. El HTML se sanitiza automáticamente en el servidor.
          </span>
        </div>
      }
    </div>
  `,
})
export class ProductDescriptionsBlockComponent implements IProductFormBlock {
  blockIndex = input.required<string>();
  title = input.required<string>();
  subtitleLabel = input<string>('');
  subtitleFieldLabel = input<string>('');
  shortDescriptionLabel = input<string>('');
  largeDescriptionLabel = input<string>('');
  descriptionConfig = input<IProductDescriptionFormConfig | undefined>(undefined);

  readonly richEditor = viewChild<ElementRef<HTMLDivElement>>('richEditor');

  subtitle = signal<string>('');
  shortDescription = signal<string>('');
  largeDescription = signal<string>('');

  readonly showSubtitle = computed(() => Boolean(this.descriptionConfig()?.showSubtitle));
  readonly showShortDescription = computed(
    () => Boolean(this.descriptionConfig()?.showShortDescription)
  );
  readonly showRichDescription = computed(
    () => Boolean(this.descriptionConfig()?.showRichDescription)
  );

  execFormat(command: string): void {
    const editorEl = this.richEditor()?.nativeElement;
    if (!editorEl) return;
    editorEl.focus();
    document.execCommand(command, false);
    this.onRichInput();
  }

  onRichInput(): void {
    const editorEl = this.richEditor()?.nativeElement;
    if (!editorEl) return;
    const html = editorEl.innerHTML.trim();
    const isEffectivelyEmpty = html === '<br>' || html === '<p><br></p>';
    this.largeDescription.set(isEffectivelyEmpty ? '' : html);
  }

  applyFromMasterCatalog(shortDesc?: string): void {
    if (shortDesc && !this.shortDescription().trim()) {
      this.shortDescription.set(shortDesc);
    }
  }

  validate(): string[] {
    if (this.showSubtitle() && this.subtitle().trim().length > 200) {
      return ['El subtítulo no puede superar los 200 caracteres.'];
    }
    return [];
  }

  hydrate(product: any): void {
    this.subtitle.set(product.subtitle || '');
    this.shortDescription.set(product.shortDescription || '');
    const html = product.largeDescription || '';
    this.largeDescription.set(html);

    queueMicrotask(() => {
      const editorEl = this.richEditor()?.nativeElement;
      if (editorEl) {
        editorEl.innerHTML = html;
      }
    });
  }

  appendToFormData(formData: FormData): void {
    if (this.showSubtitle() && this.subtitle().trim()) {
      formData.append('subtitle', this.subtitle().trim());
    }
    if (this.showShortDescription() && this.shortDescription().trim()) {
      formData.append('shortDescription', this.shortDescription().trim());
    }
    if (this.showRichDescription() && this.largeDescription().trim()) {
      formData.append('largeDescription', this.largeDescription().trim());
    }
  }
}
