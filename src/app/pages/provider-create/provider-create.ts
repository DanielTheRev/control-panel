import { Component, computed, inject, input, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PageLayout } from "../../shared/components/page-layout/page-layout";
import { PageHeader } from "../../shared/components/page-header/page-header";
import { MatIcon } from '@angular/material/icon';
import { Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { ProviderStateService } from '../../states/provider.state.service';
import { NotificationsService } from '../../services/notifications.service';

@Component({
  selector: 'app-provider-create',
  imports: [PageLayout, PageHeader, MatIcon, RouterLink, ReactiveFormsModule],
  templateUrl: './provider-create.html',
  styleUrl: './provider-create.css',
})
export class ProviderCreate {
  #FormBuilder = inject(FormBuilder);
  #Router = inject(Router);
  #ProviderStateService = inject(ProviderStateService);
  #NotificationsService = inject(NotificationsService)

  providerID = input<string | null>(null);

  providerForm!: FormGroup;
  isLoading = signal(false);
  isEditMode = computed(() => !!this.providerID());



  ngOnInit(): void {
    this.providerForm = this.#FormBuilder.group({
      name: ['', Validators.required],
      cuit: ['', Validators.required],
      contactEmail: ['', Validators.required],
      phone: ['', Validators.required],
      address: this.#FormBuilder.group({
        street: ['Sin datos', Validators.required],
        number: ['Sin datos', Validators.required],
        city: ['Sin datos', Validators.required],
        province: ['Sin datos', Validators.required],
        zipCode: ['Sin datos', Validators.required]
      }),
      active: [true]
    });
  }

  async onSubmit(): Promise<void> {
    if (!this.providerForm.valid) {
      return this.#NotificationsService.error('Por favor, complete todos los campos requeridos');
    }

    this.isLoading.set(true);
    try {
      await this.#ProviderStateService.createProvider(this.providerForm.value);
      this.#NotificationsService.success('Proveedor creado exitosamente');
      this.#Router.navigate(['/home/providers']);
    } catch (error: any) {
      this.#NotificationsService.error(error.error.message);
    } finally {
      this.isLoading.set(false);
    }
  }

}
