import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { PageLayout } from '../../shared/components/page-layout/page-layout';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { HeroService } from '../../services/hero.service';
import { HeroStateService } from '../../states/hero.state.service';

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
    MatSnackBarModule
  ],
  templateUrl: './hero-create.html'
})
export class HeroCreateComponent {
  #fb = inject(FormBuilder);
  #heroService = inject(HeroService);
  #heroStateService = inject(HeroStateService);
  #snackBar = inject(MatSnackBar);
  #router = inject(Router);
  #route = inject(ActivatedRoute);

  heroForm: FormGroup = this.#fb.group({
    title: ['', Validators.required],
    imageDesktop: ['', Validators.required],
    imageMobile: ['', Validators.required],
    link: ['/', Validators.required],
    altText: ['Oferta', Validators.required],
    buttonText: ['Ver Oferta', Validators.required],
    buttonStyle: ['btn btn-primary', Validators.required],
    order: [0, Validators.required],
    isActive: [true]
  });

  slideId = signal<string | null>(null);
  isEditMode = signal(false);

  get imageDesktopValue() { return this.heroForm.get('imageDesktop')?.value; }
  get imageMobileValue() { return this.heroForm.get('imageMobile')?.value; }

  constructor() {
    this.#route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.slideId.set(id);
        this.isEditMode.set(true);
        this.loadSlide(id);
      }
    });
  }

  loadSlide(id: string) {
    this.#heroService.getById(id).subscribe(slide => {
      if (slide) {
        this.heroForm.patchValue(slide);
      }
    });
  }

  async saveSlide() {
    if (this.heroForm.invalid) return;

    const request = this.isEditMode()
      ? this.#heroStateService.updateSlide(this.slideId()!, this.heroForm.value)
      : this.#heroStateService.addSlide(this.heroForm.value);
    const message = this.isEditMode() ? 'Slide actualizado correctamente' : 'Slide guardado correctamente';

    try {
      await request;
      this.showMessage(message);
      this.#router.navigate(['/home/hero']);
    } catch (error) {
      this.showMessage('Error al guardar slide');
    }
  }

  showMessage(msg: string) {
    this.#snackBar.open(msg, 'Cerrar', { duration: 3000 });
  }


}
