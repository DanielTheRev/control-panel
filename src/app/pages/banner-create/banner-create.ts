import { NgClass } from '@angular/common';
import { Component, inject, input, OnInit } from '@angular/core';
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
import { SidebarService } from '../../services/sidebar.service';

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
    icon: ['Smartphone'],
    order: [0],
    isActive: [true]
  });

  isEditMode = false;
  loading = false;

  get imagePreview() {
    return this.bannerForm.get('image')?.value;
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
    this.loading = true;
    try {
      const response = await this.#bannerStateService.getBannerById(id);
      this.bannerForm.patchValue(response);
      this.loading = false;
    } catch (error) {
      console.error('Error loading banner', error);
      this.showSnackBar('Error loading banner details');
      this.loading = false;
      this.#Router.navigate(['/home/banners']);
    }
  }

  async onSubmit() {
    if (this.bannerForm.invalid) return;

    this.loading = true;
    const bannerData: IBanner = this.bannerForm.value;

    if (this.isEditMode && this.bannerID()) {
      try {

        await this.#bannerStateService.updateBanner(this.bannerID(), bannerData);
        this.showSnackBar('Banner updated successfully');
        this.#Router.navigate(['/home/banners']);
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
        this.#Router.navigate(['/home/banners']);
        this.loading = false;
      } catch (error) {
        console.error('Error creating banner', error);
        this.showSnackBar('Error al crear el banner');
        this.loading = false;
      }
    }
  }

  private showSnackBar(message: string) {
    this.#SnackBar.open(message, 'Close', { duration: 3000 });
  }


}
