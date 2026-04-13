import { Component, computed, inject } from '@angular/core';
import { PageLayout } from "../../shared/components/page-layout/page-layout";
import { PageHeader } from "../../shared/components/page-header/page-header";
import { MatIcon } from "@angular/material/icon";
import { ProviderStateService } from '../../states/provider.state.service';
import { RouterLink } from '@angular/router';
import { SidebarService } from '../../services/sidebar.service';

@Component({
  selector: 'app-provider-list',
  imports: [PageLayout, PageHeader, MatIcon, RouterLink],
  templateUrl: './provider-list.html',
  styleUrl: './provider-list.css',
})
export class ProviderList {
  #ProviderStateService = inject(ProviderStateService);
  #SidebarService = inject(SidebarService);

  readonly ProviderState = this.#ProviderStateService.ProviderState;

  constructor() {
    this.#SidebarService.navbarTitle.set({
      title: 'Gestionar proveedores'
    })
  }


  reload() {
    this.#ProviderStateService.reload();
  }

}
