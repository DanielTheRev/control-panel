import { CurrencyPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatIcon } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { IProduct, IProductPrices } from '../../interfaces/product.interface';
import { ProductService } from '../../services/product.service';
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
    MatSnackBarModule,
    MatTooltipModule
  ],
  templateUrl: './product-list.html',
  styleUrl: './product-list.scss',
})
export class ProductList {
  ProductState = inject(ProductStoreService);
  #productService = inject(ProductService);
  #snackBar = inject(MatSnackBar);

  displayedColumns: string[] = [
    'image',
    'category',
    'rating',
    'variants',
    'stock',
    'price_cash',
    'price_installments',
    'financials',
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

  getColorValue(color: string): string {
    const colorMap: { [key: string]: string } = {
      'negro': 'black',
      'blanco': 'white',
      'rojo': 'red',
      'azul': 'blue',
      'verde': 'green',
      'amarillo': 'yellow',
      'gris': 'gray',
      'plateado': 'silver',
      'dorado': 'gold',
      'naranja': 'orange',
      'rosa': 'pink',
      'violeta': 'violet',
      'marron': 'brown',
      'celeste': 'skyblue',
      'space gray': '#4b4b4b',
      'midnight': '#191970',
      'starlight': '#f8f9ec'
    };
    return colorMap[color.toLowerCase()] || color;
  }


  deleteProduct(product: IProduct) {
    if (confirm(`¿Estás seguro de que deseas eliminar el producto ${product.model}?`)) {
      this.#productService.deleteProduct(product._id).subscribe({
        next: () => {
          this.#snackBar.open('Producto eliminado correctamente', 'Cerrar', {
            duration: 3000,
          });
          window.location.reload(); 
        },
        error: () => {
          this.#snackBar.open('Error al eliminar el producto', 'Cerrar', {
            duration: 3000,
          });
        }
      });
    }
  }

  copyLink(product: IProduct) {
    // Assuming a standard public URL structure
    const url = `${'https://electromix.com.ar'}/product/${product.slug}`; 
    navigator.clipboard.writeText(url).then(() => {
        this.#snackBar.open('Enlace copiado al portapapeles', 'Cerrar', {
            duration: 2000,
        });
    });
  }
}
