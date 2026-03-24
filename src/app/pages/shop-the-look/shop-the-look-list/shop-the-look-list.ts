import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink, RouterModule } from '@angular/router';
import { SidebarService } from '../../../services/sidebar.service';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { PageLayout } from '../../../shared/components/page-layout/page-layout';
import { ShopTheLookStateService } from '../../../states/shop-the-look.state.service';

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

  campaigns = this.#shopTheLookState.campaigns;

  constructor() {
    this.#sidebarService.navbarTitle.set({
      title: 'Shop The Look'
    });
  }

  ngOnInit() {
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
