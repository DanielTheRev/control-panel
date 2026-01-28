import { CurrencyPipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatIcon } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { environment } from '../../../environments/environment';
import { IProduct, IProductPrices } from '../../interfaces/product.interface';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { PageLayout } from '../../shared/components/page-layout/page-layout';
import { AddEditProduct } from './components/add-edit-product/add-edit-product';
import { ProductStoreService } from '../../states/product.state.service';

@Component({
  selector: 'app-product-list',
  imports: [
    PageLayout,
    PageHeader,
    MatIcon,
    MatChipsModule,
    MatTableModule,
    MatPaginatorModule,
    MatDividerModule,
    MatMenuModule,
    CurrencyPipe,
  ],
  templateUrl: './product-list.html',
  styleUrl: './product-list.scss',
})
export class ProductList {
  ProductState = inject(ProductStoreService);

  displayedColumns: string[] = [
    'image',
    'slug',
    'stock',
    'price_cash',
    'price_installments',
    'actions',
  ];
  private dialog = inject(MatDialog);

  getPricesFormatted(prices: IProductPrices) {
    const pricesFormatted = Object.entries(prices)
      .map(([key, value]) => {
        const labels: any = {
          efectivo_transferencia: 'Efectivo / transferencia',
          tarjeta_credito_debito: 'Tarjeta debito / credito',
        };

        return {
          label: labels[key] as string,
          value: value,
        };
      })
      .filter((e) => e.label !== undefined);
    return pricesFormatted;
  }

  createOrEditProduct() {
    const dialogRef = this.dialog.open(AddEditProduct, {
      // width: '720px',
      width: '100%',
      maxWidth: '500px',
    });

    dialogRef.afterClosed().subscribe({
      next: (value) => {
        console.log('Valor del modal después de cerrarlo');
        console.log(value);
      },
    });
  }
}
