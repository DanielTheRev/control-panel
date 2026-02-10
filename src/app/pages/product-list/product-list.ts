import { animate, state, style, transition, trigger } from '@angular/animations';
import { CurrencyPipe, SlicePipe } from '@angular/common';
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

  displayedColumns: string[] = [
    'image',
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
    // Assuming a standard public URL structure
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
