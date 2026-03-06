import { CommonModule } from '@angular/common';
import { Component, inject, input, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
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
export class HeroCreateComponent implements OnInit {
  #fb = inject(FormBuilder);
  #heroStateService = inject(HeroStateService);
  #snackBar = inject(MatSnackBar);
  #router = inject(Router);
  #SidebarService = inject(SidebarService)

  readonly slideID = input.required<string>();

  constructor() {
    this.#SidebarService.navbarTitle.set({
      title: 'Gestionar Slide'
    });
  }

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

  isEditMode = signal(false);

  get imageDesktopValue() { return this.heroForm.get('imageDesktop')?.value; }
  get imageMobileValue() { return this.heroForm.get('imageMobile')?.value; }


  ngOnInit(): void {
    const id = this.slideID();
    if (id) {
      this.isEditMode.set(true);
      this.loadSlide(id);
    }
  }

  async loadSlide(id: string) {
    try {
      const slide = await this.#heroStateService.getSlideById(id);
      if (slide) {
        this.heroForm.patchValue(slide);
      }
    } catch (error) {
      this.showMessage('Error al cargar slide');
    }
  }

  async saveSlide() {
    if (this.heroForm.invalid) return;

    const request = this.isEditMode()
      ? this.#heroStateService.updateSlide(this.slideID(), this.heroForm.value)
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
