import { CurrencyPipe, NgClass } from '@angular/common';
import { Component, inject, input, OnInit, signal } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { DomSanitizer } from '@angular/platform-browser';
import { Router, RouterLink } from '@angular/router';
import { IClothingVariant, IProduct, ITechVariant, ProductType } from '../../interfaces/product.interface';
import { SidebarService } from '../../services/sidebar.service';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { PageLayout } from '../../shared/components/page-layout/page-layout';
import { ProductStoreService } from '../../states/product.state.service';
import { getStoreUrl } from '../../utils/tenant.utils';

@Component({
  selector: 'app-product-detail',
  imports: [
    PageLayout,
    PageHeader,
    MatIcon,
    CurrencyPipe,
    NgClass,
    RouterLink,
    MatSnackBarModule,
  ],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.scss',
})
export class ProductDetail implements OnInit {
  productID = input.required<string>();

  #productState = inject(ProductStoreService);
  #router = inject(Router);
  #snackBar = inject(MatSnackBar);
  #sanitizer = inject(DomSanitizer);
  #SidebarService = inject(SidebarService)

  product = signal<IProduct | null>(null);
  isLoading = signal(true);
  hasError = signal(false);
  isUsingGlobalMargin = signal<boolean>(false);
  ProductType = ProductType;

  constructor() {
    this.#SidebarService.navbarTitle.set({
      title: 'Gestionar producto'
    })
  }

  async ngOnInit() {
    try {
      const product = await this.#productState.getProduct(this.productID());
      // Usa margen global si NO tiene ni los campos nuevos ni el legacy
      const has1Pay = product.prices.profitMargin1Pay !== undefined && product.prices.profitMargin1Pay !== null;
      const hasInstallments = product.prices.profitMarginInstallments !== undefined && product.prices.profitMarginInstallments !== null;
      this.isUsingGlobalMargin.set(!has1Pay && !hasInstallments);
      this.product.set(product);
    } catch {
      this.hasError.set(true);
    } finally {
      this.isLoading.set(false);
    }
  }

  asTech(v: any): ITechVariant {
    return v as ITechVariant;
  }

  asClothing(v: any): IClothingVariant {
    return v as IClothingVariant;
  }

  /** Margen efectivo para 1 pago (campo nuevo → legacy fallback → 0) */
  getMargin1Pay(): number {
    const p = this.product();
    if (!p) return 0;
    return p.prices.profitMargin1Pay ?? 0;
  }

  /** Margen efectivo para cuotas (campo nuevo → legacy fallback → 0) */
  getMarginInstallments(): number {
    const p = this.product();
    if (!p) return 0;
    return p.prices.profitMarginInstallments ?? 0;
  }

  getTotalStock(): number {
    const p = this.product();
    if (!p) return 0;
    if (p.totalStock !== undefined) return p.totalStock;
    return p.variants?.filter(v => v.isActive).reduce((sum, v) => sum + v.stock, 0) || 0;
  }

  getDescription() {
    const p = this.product();
    if (!p) return '';
    return this.#sanitizer.bypassSecurityTrustHtml(
      p.largeDescription || p.shortDescription || 'Sin descripción disponible.'
    );
  }

  getProductTypeLabel(): string {
    const p = this.product();
    if (!p) return '';
    return p.productType === ProductType.TECH ? '📱 Tech' : '👕 Ropa';
  }

  getProductTypeClass(): string {
    const p = this.product();
    if (!p) return '';
    return p.productType === ProductType.TECH
      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
      : 'bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300';
  }

  copyLink() {
    const p = this.product();
    if (!p) return;
    const url = `${getStoreUrl()}/products/${p.slug}`;
    navigator.clipboard.writeText(url).then(() => {
      this.#snackBar.open('Enlace copiado al portapapeles', 'Cerrar', { duration: 2000 });
    });
  }

  async deleteProduct() {
    const p = this.product();
    if (!p) return;
    if (confirm(`¿Estás seguro de que deseas eliminar ${p.brand} ${p.model}?`)) {
      try {
        await this.#productState.deleteProduct(p._id);
        this.#snackBar.open('Producto eliminado correctamente', 'Cerrar', { duration: 3000 });
        this.#router.navigate(['/home/products']);
      } catch {
        this.#snackBar.open('Error al eliminar el producto', 'Cerrar', { duration: 3000 });
      }
    }
  }

  goBack() {
    this.#router.navigate(['/home/products']);
  }
}
