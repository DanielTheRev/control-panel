import { CurrencyPipe, NgClass } from '@angular/common';
import { Component, effect, inject, signal } from '@angular/core';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatIcon } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router, RouterLink } from '@angular/router';
import { IProduct, ProductType } from '../../interfaces/product.interface';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { PageLayout } from '../../shared/components/page-layout/page-layout';
import { ProductStoreService } from '../../states/product.state.service';
import { getStoreUrl } from '../../utils/tenant.utils';

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
  ],
  templateUrl: './product-list.html',
  styleUrl: './product-list.scss',
})
export class ProductList {
  ProductState = inject(ProductStoreService);
  #snackBar = inject(MatSnackBar);
  #router = inject(Router);

  activeFilter = signal<string>('all');
  dataSource = new MatTableDataSource<IProduct>([]);

  displayedColumns: string[] = [
    'image',
    'type',
    'category',
    'brand',
    'stock',
    'price_cash',
    'price_installments',
  ];

  constructor() {
  }

  onPageChange(event: PageEvent) {
    this.ProductState.changePage(event.pageIndex + 1, event.pageSize);
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

  viewProduct(product: IProduct) {
    this.#router.navigate(['/home/products', product._id]);
  }

  async deleteProduct(product: IProduct) {
    if (confirm(`¿Estás seguro de que deseas eliminar el producto ${product.model}?`)) {
      try {
        await this.ProductState.deleteProduct(product._id);
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
    const url = `${getStoreUrl()}/products/${product.slug}`;
    navigator.clipboard.writeText(url).then(() => {
      this.#snackBar.open('Enlace copiado al portapapeles', 'Cerrar', {
        duration: 2000,
      });
    });
  }
}
