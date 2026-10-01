import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink, RouterModule } from '@angular/router';
import { SidebarService } from '../../../services/sidebar.service';
import { NotificationsService } from '../../../services/notifications.service';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { PageLayout } from '../../../shared/components/page-layout/page-layout';
import { ShopTheLookStateService } from '../../../states/shop-the-look.state.service';
import { getStoreUrl } from '../../../utils/tenant.utils';
import { IShopTheLook } from '../../../interfaces/shop-the-look.interface';

@Component({
  selector: 'app-shop-the-look-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    RouterLink,
    MatIconModule,
    PageLayout,
    PageHeader
  ],
  templateUrl: './shop-the-look-list.html',
})
export class ShopTheLookListComponent implements OnInit {
  #sidebarService = inject(SidebarService);
  #shopTheLookState = inject(ShopTheLookStateService);
  #notificationService = inject(NotificationsService);

  campaigns = this.#shopTheLookState.campaigns;

  constructor() {
    this.#sidebarService.navbarTitle.set({
      title: 'Shop The Look'
    });
  }

  ngOnInit() {
  }

  async copyLink(campaign: IShopTheLook) {
    const slug = campaign.slug || campaign._id;
    const url = `${getStoreUrl()}/shop-the-look/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      this.#notificationService.success(`Enlace de "${campaign.title}" copiado`);
    } catch {
      this.#notificationService.error('No se pudo copiar al portapapeles');
    }
  }

  async deleteCampaign(id: string) {
    if (confirm('¿Estás seguro de eliminar esta campaña de Shop The Look?')) {
      try {
        await this.#shopTheLookState.deleteCampaign(id);
      } catch (error) {
        // El error ya es manejado en el Service via HotToastService
      }
    }
  }
}
