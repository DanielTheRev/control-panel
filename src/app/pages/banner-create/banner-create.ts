import { NgClass } from '@angular/common';
import { Component, inject, input, OnInit, signal } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router, RouterLink } from '@angular/router';
import { SidebarService } from '../../services/sidebar.service';
import { PageHeader } from "../../shared/components/page-header/page-header";
import { PageLayout } from "../../shared/components/page-layout/page-layout";
import { SingleImageUpload } from '../../shared/components/single-image-upload/single-image-upload';
import { BannerStateService } from '../../states/banner.state.service';

@Component({
  selector: 'app-banner-create',
  standalone: true,
  imports: [
    NgClass,
    ReactiveFormsModule,
    MatCheckboxModule,
    MatIconModule,
    MatSnackBarModule,
    RouterLink,
    PageLayout,
    PageHeader,
    SingleImageUpload
  ],
  templateUrl: './banner-create.html',
  styleUrl: './banner-create.scss'
})
export class BannerCreate implements OnInit {
  #Fb = inject(FormBuilder);
  #bannerStateService = inject(BannerStateService);
  #Router = inject(Router);
  #SnackBar = inject(MatSnackBar);
  #SidebarService = inject(SidebarService)

  readonly bannerID = input.required<string>();

  bannerForm: FormGroup = this.#Fb.group({
    brandName: ['', Validators.required],
    title: ['', Validators.required],
    subtitle: ['', Validators.required],
    description: ['', Validators.required],
    image: ['', [Validators.required]], // Basic URL validation can be added
    textClass: ['text-white'],
    buttonClass: ['bg-white text-black'],
    icon: [''],
    order: [0],
    isActive: [true]
  });

  isEditMode = false;
  loading = signal(false);
  currentImagePreview: string | null = null;

  get imageControl(): FormControl {
    return this.bannerForm.get('image') as FormControl;
  }

  onImagePreviewChange(url: string | null) {
    this.currentImagePreview = url;
  }

  constructor() {
    this.#SidebarService.navbarTitle.set({
      title: 'Gestionar Banner'
    });
  }

  ngOnInit() {
    if (this.bannerID()) {
      this.isEditMode = true;
      this.loadBanner(this.bannerID());
    }
  }

  async loadBanner(id: string) {
    this.loading.set(true);
    try {
      const response = await this.#bannerStateService.getBannerById(id);
      this.bannerForm.patchValue(response);
    } catch (error) {
      console.error('Error loading banner', error);
      this.showSnackBar('Error loading banner details');
      this.#Router.navigate(['/home/banners']);
    } finally {
      this.loading.set(false);
    }
  }

  async onSubmit() {
    if (this.bannerForm.invalid) return;

    this.loading.set(true);
    const formValues = this.bannerForm.value;
    
    const formData = new FormData();
    Object.keys(formValues).forEach(key => {
      const value = formValues[key];
      if (value !== null && value !== undefined) {
        if (key === 'image' && value instanceof File) {
          formData.append(key, value, value.name);
        } else {
          formData.append(key, typeof value === 'boolean' ? String(value) : value);
        }
      }
    });

    try {
      if (this.isEditMode && this.bannerID()) {
        await this.#bannerStateService.updateBanner(this.bannerID(), formData as any);
        this.showSnackBar('Banner updated successfully');
      } else {
        await this.#bannerStateService.addBanner(formData as any);
        this.showSnackBar('Banner creado exitosamente');
      }
      this.#Router.navigate(['/home/banners']);
    } catch (error) {
      console.error('Error in banner operation', error);
      this.showSnackBar('Error al procesar el banner');
    } finally {
      this.loading.set(false);
    }
  }

  private showSnackBar(message: string) {
    this.#SnackBar.open(message, 'Close', { duration: 3000 });
  }


}
