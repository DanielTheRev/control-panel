import { Component, computed, inject } from '@angular/core';
import { PageLayout } from "../../shared/components/page-layout/page-layout";
import { PageHeader } from "../../shared/components/page-header/page-header";
import { MatIcon } from "@angular/material/icon";
import { ProviderStateService } from '../../states/provider.state.service';
import { RouterLink } from '@angular/router';
import { SidebarService } from '../../services/sidebar.service';

import { NotificationsService } from '../../services/notifications.service';
import { IProvider } from '../../interfaces/provider.interface';

@Component({
  selector: 'app-provider-list',
  imports: [PageLayout, PageHeader, MatIcon, RouterLink],
  templateUrl: './provider-list.html',
  styleUrl: './provider-list.css',
})
export class ProviderList {
  #ProviderStateService = inject(ProviderStateService);
  #SidebarService = inject(SidebarService);
  #NotificationService = inject(NotificationsService);

  readonly ProviderState = this.#ProviderStateService.ProviderState;

  constructor() {
    this.#SidebarService.navbarTitle.set({
      title: 'Gestionar proveedores'
    })
  }


  reload() {
    this.#ProviderStateService.reload();
  }

  async deleteProvider(provider: IProvider) {
    const confirmDelete = confirm(`¿Estás seguro de que deseas eliminar al proveedor "${provider.name}"?`);
    if (!confirmDelete) return;

    try {
      await this.#ProviderStateService.deleteProvider(provider._id);
      this.#NotificationService.success(`Proveedor "${provider.name}" eliminado con éxito.`);
    } catch (err: any) {
      const message = err?.error?.messageToSendClient || err?.error?.message || err?.message || 'Error al intentar eliminar el proveedor';
      this.#NotificationService.error(message);
    }
  }

  getGoogleMapsUrl(address: any): string {
    if (!address?.street || address.street === 'Sin datos') return '#';
    const parts = [
      address.street,
      address.number && address.number !== 'Sin datos' ? address.number : '',
      address.city && address.city !== 'Sin datos' ? address.city : '',
      address.province && address.province !== 'Sin datos' ? address.province : '',
      'Argentina'
    ].filter(Boolean);
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(parts.join(', '))}`;
  }

  copyAddress(address: any, event?: Event): void {
    if (event) event.stopPropagation();
    if (!address?.street) return;
    const text = `${address.street} ${address.number || ''}, ${address.city || ''}`.trim();
    navigator.clipboard.writeText(text);
    this.#NotificationService.success('Dirección copiada');
  }

}
