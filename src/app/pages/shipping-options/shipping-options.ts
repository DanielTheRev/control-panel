import { animate, state as animationState, style, transition, trigger } from '@angular/animations';
import { CurrencyPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { PageLayout } from '../../shared/components/page-layout/page-layout';
import { ShippingOptionsStateService } from '../../states/shipping-options.state.service';
import { IShippingOption } from '../../interfaces/shipping.interface';
import { SidebarService } from '../../services/sidebar.service';

@Component({
  selector: 'app-shipping-options',
  standalone: true,
  imports: [
    PageLayout,
    PageHeader,
    MatIconModule,
    MatTableModule,
    MatMenuModule,
    CurrencyPipe,
    RouterLink
  ],
  templateUrl: './shipping-options.html',
  styleUrl: './shipping-options.css',
  animations: [
    trigger('detailExpand', [
      animationState('collapsed', style({height: '0px', minHeight: '0'})),
      animationState('expanded', style({height: '*'})),
      transition('expanded <=> collapsed', animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')),
    ]),
  ],
})
export class ShippingOptions {
  #shippingOptionsStateService = inject(ShippingOptionsStateService);
  displayedColumns: string[] = ['name', 'cost', 'type', 'isActive', 'isDefaultForCash', 'actions'];
  readonly state = this.#shippingOptionsStateService.state;
  readonly #SidebarService = inject(SidebarService);

  expandedElement = signal<IShippingOption | null>(null);

  constructor() {
    this.#SidebarService.navbarTitle.set({
      title: 'Métodos de envío'
    });
  }

  toggleRow(element: IShippingOption) {
    // Only expand if it has pickup points
    if (element.type === 'Punto de encuentro' && element.pickupPoints && element.pickupPoints.length > 0) {
        this.expandedElement.update(current => current === element ? null : element);
    }
  }
}
