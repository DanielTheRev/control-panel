import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PageLayout } from "../../shared/components/page-layout/page-layout";
import { PageHeader } from "../../shared/components/page-header/page-header";
import { MatIcon } from '@angular/material/icon';
import { Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { ProviderStateService } from '../../states/provider.state.service';
import { ProviderService } from '../../services/provider.service';
import { NotificationsService } from '../../services/notifications.service';
import { SidebarService } from '../../services/sidebar.service';

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
  #ProviderService = inject(ProviderService);
  #NotificationsService = inject(NotificationsService);
  #SidebarService = inject(SidebarService);

  providerID = input<string | null>(null);

  isLoading = signal(false);
  isEditMode = computed(() => !!this.providerID());

  providerForm: FormGroup = this.#FormBuilder.group({
    name: ['', Validators.required],
    cuit: ['', Validators.required],
    contactEmail: ['', [Validators.required, Validators.email]],
    phone: ['', Validators.required],
    address: this.#FormBuilder.group({
      street: ['Sin datos', Validators.required],
      number: ['Sin datos', Validators.required],
      city: ['Sin datos', Validators.required],
      province: ['Sin datos', Validators.required],
      zipCode: ['Sin datos', Validators.required]
    }),
    paymentData: this.#FormBuilder.group({
      cvu: ['Sin datos'],
      alias: ['Sin datos', Validators.required],
      bank: ['Sin datos'],
      accountNumber: ['Sin datos'],
      accountType: ['Sin datos'],
      accountHolder: ['Sin datos', Validators.required]
    }),
    active: [true]
  });

  constructor() {
    effect(async () => {
      const id = this.providerID();
      if (!id) {
        this.#SidebarService.navbarTitle.set({ title: 'Crear proveedor' });
        return;
      }

      this.#SidebarService.navbarTitle.set({ title: 'Editar proveedor' });
      this.isLoading.set(true);

      try {
        // 1. Intentar buscar en el estado local en memoria
        const inMemory = this.#ProviderStateService.ProviderState().data?.find(p => p._id === id);
        if (inMemory) {
          this.patchFormData(inMemory);
          this.isLoading.set(false);
          return;
        }

        // 2. Si no está en memoria (ej: entrada directa por URL o F5), consultar la API
        const res: any = await this.#ProviderService.getProvider(id);
        const providerData = res?.provider || res;
        if (providerData) {
          this.patchFormData(providerData);
        }
      } catch (err: any) {
        this.#NotificationsService.error('Error al cargar la información del proveedor');
      } finally {
        this.isLoading.set(false);
      }
    });
  }

  private patchFormData(provider: any): void {
    this.providerForm.patchValue({
      name: provider.name || '',
      cuit: provider.cuit || '',
      contactEmail: provider.contactEmail || provider.email || '',
      phone: provider.phone || '',
      address: {
        street: provider.address?.street || 'Sin datos',
        number: provider.address?.number || 'Sin datos',
        city: provider.address?.city || 'Sin datos',
        province: provider.address?.province || 'Sin datos',
        zipCode: provider.address?.zipCode || 'Sin datos',
      },
      paymentData: {
        cvu: provider.paymentData?.cvu || 'Sin datos',
        alias: provider.paymentData?.alias || 'Sin datos',
        bank: provider.paymentData?.bank || 'Sin datos',
        accountNumber: provider.paymentData?.accountNumber || 'Sin datos',
        accountType: provider.paymentData?.accountType || 'Sin datos',
        accountHolder: provider.paymentData?.accountHolder || 'Sin datos',
      },
      active: provider.active ?? true
    });
  }

  getGoogleMapsUrl(): string {
    const addr = this.providerForm.get('address')?.value;
    if (!addr?.street || addr.street === 'Sin datos') return '#';
    const parts = [
      addr.street,
      addr.number && addr.number !== 'Sin datos' ? addr.number : '',
      addr.city && addr.city !== 'Sin datos' ? addr.city : '',
      addr.province && addr.province !== 'Sin datos' ? addr.province : '',
      'Argentina'
    ].filter(Boolean);
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(parts.join(', '))}`;
  }

  async onSubmit(): Promise<void> {
    if (!this.providerForm.valid) {
      return this.#NotificationsService.error('Por favor, complete todos los campos requeridos');
    }

    this.isLoading.set(true);
    try {
      if (this.isEditMode() && this.providerID()) {
        await this.#ProviderStateService.updateProvider(this.providerID()!, this.providerForm.value);
        this.#NotificationsService.success('Proveedor actualizado exitosamente');
      } else {
        await this.#ProviderStateService.createProvider(this.providerForm.value);
        this.#NotificationsService.success('Proveedor creado exitosamente');
      }
      this.#Router.navigate(['/home/providers']);
    } catch (error: any) {
      const message = error?.error?.messageToSendClient || error?.error?.message || error?.message || 'Error al guardar el proveedor';
      this.#NotificationsService.error(message);
    } finally {
      this.isLoading.set(false);
    }
  }
}
