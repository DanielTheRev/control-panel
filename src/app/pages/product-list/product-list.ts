import { CurrencyPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatIcon } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';
import { IProductPrices } from '../../interfaces/product.interface';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { PageLayout } from '../../shared/components/page-layout/page-layout';
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
    RouterLink,
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
}
