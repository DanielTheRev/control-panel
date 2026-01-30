import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatMenuModule } from '@angular/material/menu';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { PageLayout } from '../../shared/components/page-layout/page-layout';
import { MatChipsModule } from '@angular/material/chips';

@Component({
  selector: 'app-payment-methods',
  standalone: true,
  imports: [
    PageLayout,
    PageHeader,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatMenuModule,
    MatChipsModule
  ],
  templateUrl: './payment-methods.html',
})
export class PaymentMethods {
  displayedColumns: string[] = ['name', 'status', 'actions'];
  
  // Mock data
  dataSource = [
    { name: 'Efectivo', status: 'Activo' },
    { name: 'Transferencia Bancaria', status: 'Activo' },
    { name: 'Tarjeta de Crédito', status: 'Activo' },
  ];
}
