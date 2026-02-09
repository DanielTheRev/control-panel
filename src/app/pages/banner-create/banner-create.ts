import { NgClass } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { IBanner } from '../../interfaces/banner.interface';
import { BannerService } from '../../services/banner.service';
import { PageHeader } from "../../shared/components/page-header/page-header";
import { PageLayout } from "../../shared/components/page-layout/page-layout";
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
    PageHeader
  ],
  templateUrl: './banner-create.html',
  styleUrl: './banner-create.scss'
})
export class BannerCreate implements OnInit {
  private fb = inject(FormBuilder);
  private bannerService = inject(BannerService);
  #bannerStateService = inject(BannerStateService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private snackBar = inject(MatSnackBar);

  bannerForm: FormGroup;
  isEditMode = false;
  bannerId: string | null = null;
  loading = false;

  constructor() {
    this.bannerForm = this.fb.group({
      brandName: ['', Validators.required],
      title: ['', Validators.required],
      subtitle: ['', Validators.required],
      description: ['', Validators.required],
      image: ['', [Validators.required]], // Basic URL validation can be added
      textClass: ['text-white'],
      buttonClass: ['bg-white text-black'],
      icon: ['Smartphone'],
      order: [0],
      isActive: [true]
    });
  }

  get imagePreview() {
    return this.bannerForm.get('image')?.value;
  }

  ngOnInit() {
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.isEditMode = true;
        this.bannerId = params['id'];
        this.loadBanner(this.bannerId!);
      }
    });
  }

  loadBanner(id: string) {
    this.loading = true;
    this.bannerService.getBannerById(id).subscribe({
      next: (response) => {
        this.bannerForm.patchValue(response);
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading banner', error);
        this.showSnackBar('Error loading banner details');
        this.loading = false;
        this.router.navigate(['/home/banners']);
      }
    });
  }

  async onSubmit() {
    if (this.bannerForm.invalid) return;

    this.loading = true;
    const bannerData: IBanner = this.bannerForm.value;

    if (this.isEditMode && this.bannerId) {
      try {

        await this.#bannerStateService.updateBanner(this.bannerId, bannerData);
        this.showSnackBar('Banner updated successfully');
        this.router.navigate(['/home/banners']);
        this.loading = false;
      } catch (error) {
        console.error('Error updating banner', error);
        this.showSnackBar('Error al actualizar el banner');
        this.loading = false;
      }
    } else {
      try {
        await this.#bannerStateService.addBanner(bannerData)
        this.showSnackBar('Banner creado exitosamente');
        this.router.navigate(['/home/banners']);
        this.loading = false;
      } catch (error) {
        console.error('Error creating banner', error);
        this.showSnackBar('Error al crear el banner');
        this.loading = false;
      }
    }
  }

  private showSnackBar(message: string) {
    this.snackBar.open(message, 'Close', { duration: 3000 });
  }


}
