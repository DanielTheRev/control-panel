import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatMenuModule } from '@angular/material/menu';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { PageLayout } from '../../shared/components/page-layout/page-layout';
import { MatChipsModule } from '@angular/material/chips';
import { CurrencyPipe } from '@angular/common';

@Component({
  selector: 'app-shipping-options',
  standalone: true,
  imports: [
    PageLayout,
    PageHeader,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatMenuModule,
    MatChipsModule,
    CurrencyPipe
  ],
  templateUrl: './shipping-options.html',
})
export class ShippingOptions {
  displayedColumns: string[] = ['name', 'cost', 'type', 'actions'];
  
  // Mock data
  dataSource = [
    { name: 'Retiro en Local', cost: 0, type: 'Retiro' },
    { name: 'Envío Moto (CABA)', cost: 3500, type: 'Domicilio' },
    { name: 'Correo Argentino', cost: 6800, type: 'Domicilio' },
  ];
}
