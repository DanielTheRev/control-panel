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

}
