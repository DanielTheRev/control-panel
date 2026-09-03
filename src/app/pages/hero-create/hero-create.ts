import { CommonModule } from '@angular/common';
import { Component, inject, input, OnInit, signal } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router, RouterModule } from '@angular/router';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { PageLayout } from '../../shared/components/page-layout/page-layout';
import { HeroStateService } from '../../states/hero.state.service';
import { SidebarService } from '../../services/sidebar.service';
import { ProductService } from '../../services/product.service';
import { Subject, debounceTime, distinctUntilChanged, switchMap, finalize } from 'rxjs';
import { SingleImageUpload } from "../../shared/components/single-image-upload/single-image-upload";
import { IHeroSlide } from '../../interfaces/HeroSlide.interface';
import { NotificationsService } from '../../services/notifications.service';

@Component({
  selector: 'app-hero-create',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatSelectModule,
    MatSlideToggleModule,
    PageLayout,
    PageHeader,
    MatSnackBarModule,
    SingleImageUpload
  ],
  templateUrl: './hero-create.html'
})
export class HeroCreateComponent implements OnInit {
  #fb = inject(FormBuilder);
  #heroStateService = inject(HeroStateService);
  #NotificationService = inject(NotificationsService);
  #router = inject(Router);
  #SidebarService = inject(SidebarService);
  #OriginalSlide = signal<IHeroSlide | null>(null);

  readonly slideID = input<string | undefined>(undefined);

  selectedSlideType = signal<'visual' | 'editorial' | 'split'>('visual');
  isSaving = signal(false);
  isEditMode = signal(false);

  previewDesktop = signal<string | null>(null);
  previewDesktop2 = signal<string | null>(null);
  previewMobile = signal<string | null>(null);

  constructor() {
    this.#SidebarService.navbarTitle.set({
      title: 'Gestionar Slide'
    });
  }

  heroForm: FormGroup = this.#fb.group({
    slideType: ['visual'],
    title: [''],
    sub_title: [''],
    description: [''],
    ctaText: [''],
    ctaLink: ['/products', Validators.required],
    imageDesktop1: ['', Validators.required],
    imageDesktop2: [''],
    imageMobile1: ['', Validators.required],
    imageMobile2: [''],
    isActive: [true]
  });

  get imageDesktop1Value() { return this.heroForm.get('imageDesktop1') as FormControl; }
  get imageDesktop2Value() { return this.heroForm.get('imageDesktop2') as FormControl; }
  get imageMobile1Value() { return this.heroForm.get('imageMobile1') as FormControl; }
  get imageMobile2Value() { return this.heroForm.get('imageMobile2') as FormControl; }

  ngOnInit(): void {
    const id = this.slideID();
    if (id) {
      this.isEditMode.set(true);
      this.loadSlide(id);
    }

    this.imageDesktop1Value.valueChanges.subscribe(val => this.updatePreview(val, this.previewDesktop));
    this.imageDesktop2Value.valueChanges.subscribe(val => this.updatePreview(val, this.previewDesktop2));
    this.imageMobile1Value.valueChanges.subscribe(val => this.updatePreview(val, this.previewMobile));
  }

  setSlideType(type: 'visual' | 'editorial' | 'split') {
    this.selectedSlideType.set(type);
    this.heroForm.patchValue({ slideType: type });

    const titleCtrl = this.heroForm.get('title');
    const imageDesktop2Ctrl = this.heroForm.get('imageDesktop2');

    if (type === 'editorial') {
      titleCtrl?.setValidators([Validators.required]);
    } else {
      titleCtrl?.clearValidators();
    }
    titleCtrl?.updateValueAndValidity();

    if (type === 'split') {
      imageDesktop2Ctrl?.setValidators([Validators.required]);
    } else {
      imageDesktop2Ctrl?.clearValidators();
    }
    imageDesktop2Ctrl?.updateValueAndValidity();
  }

  updatePreview(val: any, targetSignal: import('@angular/core').WritableSignal<string | null>) {
    if (val && typeof val === 'object' && val instanceof File) {
      targetSignal.set(URL.createObjectURL(val));
    } else if (typeof val === 'string' && val.trim() !== '') {
      targetSignal.set(val);
    } else {
      targetSignal.set(null);
    }
  }

  formatTitle(title: string): string {
    if (!title) return '';
    const parts = title.split('\n');
    if (parts.length > 1) {
      return `${parts[0]}<br><span class="text-gray-400 italic font-light">${parts.slice(1).join('<br>')}</span>`;
    }
    return title;
  }

  async loadSlide(id: string) {
    try {
      const slide = await this.#heroStateService.getSlideById(id);
      if (slide) {
        this.#OriginalSlide.set(slide);
        const inferredType: 'visual' | 'editorial' | 'split' = slide.slideType || (slide.imageDesktop2?.url ? 'split' : (slide.title && slide.sub_title ? 'editorial' : 'visual'));
        this.selectedSlideType.set(inferredType);

        this.heroForm.reset({
          slideType: inferredType,
          title: slide.title || '',
          sub_title: slide.sub_title || '',
          description: slide.description || '',
          ctaText: slide.ctaText || '',
          ctaLink: slide.ctaLink || '/products',
          imageDesktop1: slide.imageDesktop1?.url || '',
          imageDesktop2: slide.imageDesktop2?.url || '',
          imageMobile1: slide.imageMobile1?.url || '',
          imageMobile2: slide.imageMobile2?.url || '',
          isActive: slide.isActive ?? true
        });

        this.setSlideType(inferredType);
      }
    } catch (error) {
      this.#NotificationService.error('Error al cargar slide');
    }
  }

  async saveSlide() {
    if (this.heroForm.invalid || this.isSaving()) return;
    this.isSaving.set(true);

    const OriginalSlide = this.#OriginalSlide();
    const isEditMode = this.isEditMode();
    const formVal = this.heroForm.value;

    const formData = new FormData();

    formData.append('slideType', formVal.slideType || this.selectedSlideType());
    formData.append('title', formVal.title || (this.selectedSlideType() === 'visual' ? 'Banner Visual' : ''));
    formData.append('sub_title', formVal.sub_title || '');
    formData.append('description', formVal.description || '');
    formData.append('ctaText', formVal.ctaText || '');
    formData.append('ctaLink', formVal.ctaLink || '/products');
    formData.append('isActive', formVal.isActive ? 'true' : 'false');
    formData.append('featuredProducts', '[]');

    const appendImage = (field: string, formValue: any, originalUrl?: string) => {
      if (!formValue) return;
      if (isEditMode) {
        if (OriginalSlide && formValue !== originalUrl) {
          formData.append(field, formValue);
        }
      } else {
        formData.append(field, formValue);
      }
    };

    appendImage('imageDesktop1', this.imageDesktop1Value.value, OriginalSlide?.imageDesktop1?.url);
    if (this.selectedSlideType() === 'split') {
      appendImage('imageDesktop2', this.imageDesktop2Value.value, OriginalSlide?.imageDesktop2?.url);
    }
    appendImage('imageMobile1', this.imageMobile1Value.value, OriginalSlide?.imageMobile1?.url);

    const slideId = this.slideID();
    const request = isEditMode && slideId
      ? this.#heroStateService.updateSlide(slideId, formData)
      : this.#heroStateService.addSlide(formData);

    const message = isEditMode ? 'Slide actualizado correctamente' : 'Slide guardado correctamente';
    try {
      await request;
      this.#NotificationService.success(message);
      this.#router.navigate(['/home/hero']);
    } catch (error) {
      this.#NotificationService.error('Error al guardar slide');
    } finally {
      this.isSaving.set(false);
    }
  }
}
