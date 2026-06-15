import { CurrencyPipe, DecimalPipe, NgClass } from '@angular/common';
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
    DecimalPipe,
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
      console.log(product);
      // Usa margen global si NO tiene el campo nuevo de margen
      const hasMargin = product.finance?.pricingStrategy?.targetProfit !== undefined && product.finance?.pricingStrategy?.targetProfit !== null;
      this.isUsingGlobalMargin.set(!hasMargin);
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

  /** Margen efectivo para 1 pago */
  getMargin1Pay(): number {
    const p = this.product();
    if (!p) return 0;
    const val = p.finance?.pricingStrategy?.targetProfit ?? 0;
    return val > 0 && val <= 1 ? val * 100 : val;
  }

  /** Margen efectivo para cuotas */
  getMarginInstallments(): number {
    const p = this.product();
    if (!p) return 0;
    const val = p.finance?.pricingStrategy?.targetProfit ?? 0;
    return val > 0 && val <= 1 ? val * 100 : val;
  }

  getTotalStock(): number {
    const p = this.product();
    if (!p) return 0;
    if (p.totalStock !== undefined) return p.totalStock;
    return p.variants?.filter(v => v.isActive).reduce((sum, v) => sum + v.stock, 0) || 0;
  }

  /** Suma todos los costos adicionales resueltos en ARS */
  getTotalAdditionalCostsARS(): number {
    const p = this.product();
    if (!p?.finance?.additionalCosts) return 0;
    const providerCost = p.finance.providerCost?.inARS || 0;
    return p.finance.additionalCosts.reduce((sum: number, cost: any) => {
      if (cost.type === 'fixed') return sum + (cost.value || 0);
      if (cost.type === 'percent_over_provider') return sum + (providerCost * (cost.value || 0) / 100);
      return sum;
    }, 0);
  }

  /** Retorna los segmentos para la barra de composición del precio de lista (6 cuotas) */
  getBreakdownSegments(): { label: string; value: number; percentage: number }[] {
    const p = this.product();
    if (!p?.finance || !p?.price) return [];

    const providerCost = p.finance.providerCost?.inARS || 0;
    const additionalCosts = this.getTotalAdditionalCostsARS();
    const listPrice = p.price.listPrice || 1;

    // La ganancia neta correspondiente a 6 cuotas (el Precio de Lista)
    const profit = p.finance.calculatedProfits?.card6Installments || 0;

    // La comisión de MercadoPago calculada de forma residual para garantizar cuadre perfecto
    const mpCommission = Math.max(0, listPrice - providerCost - additionalCosts - profit);

    const total = listPrice;
    if (total <= 0) return [];

    const segments: { label: string; value: number; percentage: number }[] = [];

    if (providerCost > 0) {
      segments.push({ label: 'Costo Proveedor', value: providerCost, percentage: Math.round((providerCost / total) * 100) });
    }
    if (additionalCosts > 0) {
      segments.push({ label: 'Costos Adicionales', value: additionalCosts, percentage: Math.round((additionalCosts / total) * 100) });
    }
    if (profit > 0) {
      segments.push({ label: 'Mi Ganancia', value: profit, percentage: Math.round((profit / total) * 100) });
    }
    if (mpCommission > 0) {
      segments.push({ label: 'Comisión MercadoPago', value: mpCommission, percentage: Math.round((mpCommission / total) * 100) });
    }

    // Ajustar para que sume exactamente 100%
    const sumPerc = segments.reduce((s, seg) => s + seg.percentage, 0);
    if (segments.length > 0 && sumPerc !== 100) {
      segments[segments.length - 1].percentage += (100 - sumPerc);
    }

    return segments;
  }

  /** Monto de comisión MP para un canal específico */
  getMPCommissionAmount(channel: 'base' | 'cft3' | 'cft6'): number {
    const p = this.product();
    if (!p?.finance?.mpCommissionSnapshot || !p?.price) return 0;
    if (channel === 'base') {
      const price = p.price.card_ticket1PayPrice || 0;
      return price * (p.finance.mpCommissionSnapshot.base / 100);
    }
    const listPrice = p.price.listPrice || 0;
    if (channel === 'cft3') return listPrice * (p.finance.mpCommissionSnapshot.cft3Cuotas / 100);
    if (channel === 'cft6') return listPrice * (p.finance.mpCommissionSnapshot.cft6Cuotas / 100);
    return 0;
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
