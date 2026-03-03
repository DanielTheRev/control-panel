import { animate, state, style, transition, trigger } from '@angular/animations';
import { CurrencyPipe, NgClass, SlicePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatIcon } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { IProduct, IProductPrices, ProductType } from '../../interfaces/product.interface';
import { ProductService } from '../../services/product.service';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { PageLayout } from '../../shared/components/page-layout/page-layout';
import { ProductStoreService } from '../../states/product.state.service';
import { DomSanitizer } from '@angular/platform-browser';

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
    NgClass,
    RouterLink,
    MatSnackBarModule,
    MatTooltipModule,
    SlicePipe
  ],
  templateUrl: './product-list.html',
  styleUrl: './product-list.scss',
  animations: [
    trigger('detailExpand', [
      state('collapsed,void', style({ height: '0px', minHeight: '0' })),
      state('expanded', style({ height: '*' })),
      transition('expanded <=> collapsed', animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')),
    ]),
  ],
})
export class ProductList {
  ProductState = inject(ProductStoreService);
  #productState = inject(ProductStoreService);
  #snackBar = inject(MatSnackBar);
  #domSanitizer = inject(DomSanitizer);

  activeFilter = signal<string>('all');

  displayedColumns: string[] = [
    'image',
    'type',
    'category',
    'brand',
    'stock',
    'price_cash',
    'price_installments',
  ];
  columnsToDisplayWithExpand = ['expand', ...this.displayedColumns];
  expandedElement: IProduct | null = null;

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

  getProductTypeLabel(type: string): string {
    return type === ProductType.TECH ? '📱 Tech' : '👕 Ropa';
  }

  getProductTypeClass(type: string): string {
    return type === ProductType.TECH
      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
      : 'bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300';
  }

  getTotalStock(product: IProduct): number {
    if (product.totalStock !== undefined) return product.totalStock;
    return product.variants
      ?.filter(v => v.isActive)
      .reduce((sum, v) => sum + v.stock, 0) || 0;
  }

  setFilter(filter: string) {
    this.activeFilter.set(filter);
  }

  async deleteProduct(product: IProduct) {
    if (confirm(`¿Estás seguro de que deseas eliminar el producto ${product.model}?`)) {
      try {
        await this.#productState.deleteProduct(product._id);
        this.#snackBar.open('Producto eliminado correctamente', 'Cerrar', {
          duration: 3000,
        });
      } catch (error) {
        this.#snackBar.open('Error al eliminar el producto', 'Cerrar', {
          duration: 3000,
        });
      }
    }
  }

  copyLink(product: IProduct) {
    const url = `${'https://electromix.com.ar'}/products/${product.slug}`;
    navigator.clipboard.writeText(url).then(() => {
      this.#snackBar.open('Enlace copiado al portapapeles', 'Cerrar', {
        duration: 2000,
      });
    });
  }

  getDescriptionSanitized(description: string) {
    return this.#domSanitizer.bypassSecurityTrustHtml(description);
  }
}
