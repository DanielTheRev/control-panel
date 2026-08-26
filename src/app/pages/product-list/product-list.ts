import { CurrencyPipe, NgClass } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
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
import { SidebarService } from '../../services/sidebar.service';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { StoreConfigStateService } from '../../states/store.config.state.service';
import { ProviderStateService } from '../../states/provider.state.service';

@Component({
  selector: 'app-product-list',
  imports: [
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
  #StoreConfigState = inject(StoreConfigStateService)
  ProviderState = inject(ProviderStateService).ProviderState;
  #SidebarService = inject(SidebarService)
  #snackBar = inject(MatSnackBar);
  #router = inject(Router);

  activeFilter = signal<string>('all');
  viewMode = signal<'grid' | 'list'>('grid');
  showStatsSidebar = signal<boolean>(false);
  showFiltersDrawer = signal<boolean>(false);
  showMobileFilters = signal<boolean>(false);
  dataSource = new MatTableDataSource<IProduct>([]);
  private searchSubject = new Subject<string>();

  activeFiltersCount = computed(() => {
    let count = 0;
    if (this.ProductState.currentProviderFilter()) count++;
    if (this.ProductState.currentStatusFilter()) count++;
    if (this.ProductState.currentHasSeoImageFilter() !== undefined) count++;
    if (this.ProductState.currentHasSizeGuideFilter() !== undefined) count++;
    if (this.ProductState.currentHasLinkProviderFilter() !== undefined) count++;
    return count;
  });

  simulateUnits = signal<number>(1);

  onSimulateUnitsChange(event: Event) {
    const val = (event.target as HTMLSelectElement).value;
    this.simulateUnits.set(Number(val));
  }

  // Selection state
  selectedProducts = signal<string[]>([]);

  displayedColumns: string[] = [
    'select',
    'product',
    'provider',
    'stock',
    'price_cost',
    'price_sale',
    'actions',
  ];

  Categories = computed(() => {
    if (this.#StoreConfigState.StoreConfig().hasError) return []
    if (this.#StoreConfigState.StoreConfig().isLoading) return []
    return this.#StoreConfigState.StoreConfig().config.categories || []
  });

  constructor() {
    this.#SidebarService.navbarTitle.set({ title: 'Productos' });

    this.searchSubject.pipe(
      debounceTime(400),
      distinctUntilChanged()
    ).subscribe(query => {
      this.ProductState.setSearchQuery(query);
    });
  }

  onSearch(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchSubject.next(value);
  }

  onCategoryChange(event: Event) {
    const category = (event.target as HTMLSelectElement).value;
    this.ProductState.setCategoryFilter(category);
  }

  onProviderChange(event: Event) {
    const provider = (event.target as HTMLSelectElement).value;
    this.ProductState.setProviderFilter(provider);
  }

  onStatusChange(event: Event) {
    const status = (event.target as HTMLSelectElement).value;
    this.ProductState.setStatusFilter(status);
  }

  clearSearch() {
    this.ProductState.setSearchQuery('');
  }

  clearCategory() {
    this.ProductState.setCategoryFilter('');
  }

  clearProvider() {
    this.ProductState.setProviderFilter('');
  }

  clearStatus() {
    this.ProductState.setStatusFilter('');
  }

  toggleNoSeoFilter() {
    const current = this.ProductState.currentNoSeoOnlyFilter();
    this.ProductState.setNoSeoOnlyFilter(!current);
  }

  toggleNoSeoImageFilter(hasImage?: boolean) {
    const current = this.ProductState.currentHasSeoImageFilter();
    if (hasImage === undefined) {
      this.ProductState.setHasSeoImageFilter(current === false ? undefined : false);
    } else {
      this.ProductState.setHasSeoImageFilter(current === hasImage ? undefined : hasImage);
    }
  }

  toggleHasSizeGuideFilter(hasGuide?: boolean) {
    const current = this.ProductState.currentHasSizeGuideFilter();
    if (hasGuide === undefined) {
      this.ProductState.setHasSizeGuideFilter(current === false ? undefined : false);
    } else {
      this.ProductState.setHasSizeGuideFilter(current === hasGuide ? undefined : hasGuide);
    }
  }

  clearAllFilters() {
    this.ProductState.setSearchQuery('');
    this.ProductState.setCategoryFilter('');
    this.ProductState.setProviderFilter('');
    this.ProductState.setStatusFilter('');
    this.ProductState.setNoSeoOnlyFilter(false);
    this.ProductState.setHasSeoImageFilter(undefined);
    this.ProductState.setHasSizeGuideFilter(undefined);
  }

  onPageChange(event: PageEvent | { pageIndex: number; pageSize: number; length: number; previousPageIndex?: number }) {
    this.ProductState.changePage(event.pageIndex + 1, event.pageSize);
  }

  onPageSizeChange(newSize: number | string) {
    const size = Number(newSize);
    this.ProductState.changePage(1, size);
  }

  getProductTypeLabel(type: string): string {
    return type === ProductType.TECH ? 'Tecnología' : 'Indumentaria';
  }

  getProductTypeClass(type: string): string {
    return type === ProductType.TECH
      ? 'badge badge-primary'
      : 'badge badge-success';
  }

  getTotalStock(product: IProduct): number {
    if (product.totalStock !== undefined) return product.totalStock;
    return product.variants
      ?.filter(v => v.isActive)
      .reduce((sum, v) => sum + v.stock, 0) || 0;
  }

  getCategoryCount(category: string): number {
    return this.ProductState.products().data.filter(p => p.category === category).length;
  }

  getProviderName(id: string): string {
    const provider = this.ProviderState().data.find(p => p._id === id);
    return provider ? provider.name : 'Unknown';
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

  // Row Selection Logic
  toggleSelection(productId: string, event: Event) {
    event.stopPropagation();
    const currentSelected = this.selectedProducts();
    if (currentSelected.includes(productId)) {
      this.selectedProducts.set(currentSelected.filter(id => id !== productId));
    } else {
      this.selectedProducts.set([...currentSelected, productId]);
    }
  }

  isAllSelected(): boolean {
    const data = this.ProductState.products().data;
    if (!data || data.length === 0) return false;
    return data.every(p => this.selectedProducts().includes(p._id));
  }

  toggleAll(event: Event) {
    event.stopPropagation();
    const data = this.ProductState.products().data;
    if (!data || data.length === 0) return;

    if (this.isAllSelected()) {
      // Deselect all from current page
      const currentPageIds = data.map(p => p._id);
      this.selectedProducts.set(
        this.selectedProducts().filter(id => !currentPageIds.includes(id))
      );
    } else {
      // Select all from current page that aren't already selected
      const currentSelected = this.selectedProducts();
      const newIds = data
        .map(p => p._id)
        .filter(id => !currentSelected.includes(id));
      this.selectedProducts.set([...currentSelected, ...newIds]);
    }
  }

  clearSelection() {
    this.selectedProducts.set([]);
  }

  async deleteSelected() {
    const selectedCount = this.selectedProducts().length;
    if (selectedCount === 0) return;

    if (confirm(`¿Estás seguro de que deseas eliminar los ${selectedCount} productos seleccionados?`)) {
      try {
        // En la vida real harías una llamada a un endpoint bulk-delete.
        // Simulamos llamando uno por uno o podés pedirle a Cortix un endpoint.
        for (const id of this.selectedProducts()) {
          await this.ProductState.deleteProduct(id);
        }

        this.#snackBar.open(`${selectedCount} productos eliminados correctamente`, 'Cerrar', {
          duration: 3000,
        });
        this.clearSelection();
      } catch (error) {
        this.#snackBar.open('Error al eliminar algunos productos', 'Cerrar', {
          duration: 3000,
        });
      }
    }
  }

  async deactivateSelected() {
    const selectedCount = this.selectedProducts().length;
    if (selectedCount === 0) return;

    if (confirm(`¿Estás seguro de que deseas desactivar los ${selectedCount} productos seleccionados?`)) {
      try {
        await this.ProductState.bulkUpdateStatus(this.selectedProducts(), false);
        this.clearSelection();
      } catch (error) {
        // Toast is handled in service
      }
    }
  }

  async activateSelected() {
    const selectedCount = this.selectedProducts().length;
    if (selectedCount === 0) return;

    if (confirm(`¿Estás seguro de que deseas activar los ${selectedCount} productos seleccionados?`)) {
      try {
        await this.ProductState.bulkUpdateStatus(this.selectedProducts(), true);
        this.clearSelection();
      } catch (error) {
        // Toast is handled in service
      }
    }
  }

  async toggleProductStatus(product: IProduct) {
    try {
      const newStatus = !product.isActive;
      await this.ProductState.bulkUpdateStatus([product._id], newStatus);
      this.#snackBar.open(
        `Producto ${newStatus ? 'activado' : 'desactivado'} correctamente`,
        'Cerrar',
        { duration: 2000 }
      );
    } catch (error) {
      this.#snackBar.open('Error al cambiar el estado del producto', 'Cerrar', {
        duration: 3000,
      });
    }
  }

  isCopyingForAi = signal<boolean>(false);

  async copyForAi() {
    const products = this.ProductState.products().data;
    if (!products || products.length === 0) {
      this.#snackBar.open('No hay productos en la lista para exportar.', 'Cerrar', { duration: 3000 });
      return;
    }

    this.isCopyingForAi.set(true);

    try {
      const activeFilters: string[] = [];
      if (this.ProductState.currentSearchQuery()) activeFilters.push(`Búsqueda: "${this.ProductState.currentSearchQuery()}"`);
      if (this.ProductState.currentCategoryFilter()) activeFilters.push(`Categoría: "${this.ProductState.currentCategoryFilter()}"`);
      if (this.ProductState.currentProviderFilter()) activeFilters.push(`Proveedor: "${this.getProviderName(this.ProductState.currentProviderFilter())}"`);
      if (this.ProductState.currentStatusFilter()) activeFilters.push(`Estado: ${this.ProductState.currentStatusFilter() === 'true' ? 'Activos' : 'Inactivos'}`);
      if (this.ProductState.currentHasSeoImageFilter() !== undefined) activeFilters.push(`Imagen SEO: ${this.ProductState.currentHasSeoImageFilter() ? 'Con Foto' : 'Sin Foto'}`);
      if (this.ProductState.currentHasSizeGuideFilter() !== undefined) activeFilters.push(`Guía Talles: ${this.ProductState.currentHasSizeGuideFilter() ? 'Con Guía' : 'Sin Guía'}`);
      if (this.ProductState.currentHasLinkProviderFilter() !== undefined) activeFilters.push(`Link Proveedor: ${this.ProductState.currentHasLinkProviderFilter() ? 'Con Link' : 'Sin Link'}`);

      let content = `# REPORTE DE PRODUCTOS PARA ANÁLISIS DE IA (LLM CONTEXT)\n`;
      content += `• Fecha y Hora: ${new Date().toLocaleString('es-AR')}\n`;
      content += `• Cantidad de productos en esta vista: ${products.length} (Total en catálogo: ${this.ProductState.products().itemsCount})\n`;
      content += `• Filtros aplicados: ${activeFilters.length > 0 ? activeFilters.join(' | ') : 'Ninguno (Catálogo completo)'}\n\n`;
      content += `======================================================================\n\n`;

      products.forEach((p, idx) => {
        const stock = this.getTotalStock(p);
        content += `### [${idx + 1}] ${p.model}\n`;
        content += `- ID: ${p._id}\n`;
        content += `- Marca: ${p.brand || 'N/A'}\n`;
        content += `- Categoría: ${p.category}\n`;
        if (p.subtitle) content += `- Subtítulo / Descripción corta: ${p.subtitle}\n`;
        content += `- Estado: ${p.isActive ? 'ACTIVO (Visible en tienda)' : 'INACTIVO (Pausado)'}\n`;
        content += `- Destacado: ${p.isFeatured ? 'SÍ' : 'NO'}\n`;
        content += `- Proveedor: ${p.provider ? p.provider.name : 'N/A'}\n`;
        if (p.linkProductProvider) content += `- Enlace Directo Proveedor: ${p.linkProductProvider}\n`;
        
        content += `- Precios y Desglose Financiero:\n`;
        content += `  * Precio Venta Efectivo / Transferencia: $${p.price?.cashTransferPrice?.toLocaleString('es-AR') || 0}\n`;
        content += `  * Precio Venta Lista (Tarjetas / Cuotas): $${p.price?.listPrice?.toLocaleString('es-AR') || 0}\n`;
        
        if (p.finance?.providerCost?.inARS) {
          content += `  * Costo Proveedor: $${p.finance.providerCost.inARS.toLocaleString('es-AR')} ARS`;
          if (p.finance.providerCost.inUSD) {
            content += ` (USD ${p.finance.providerCost.inUSD} @ $${p.finance.exchangeRateSnapshot || 0}/USD)`;
          }
          content += `\n`;
        }

        // Costos adicionales (packaging, flete, etc.)
        if (p.finance?.additionalCosts && p.finance.additionalCosts.length > 0) {
          content += `  * Costos Adicionales / Operativos:\n`;
          p.finance.additionalCosts.forEach((c) => {
            const valStr = c.type === 'percent_over_provider' ? `${c.value}% s/proveedor` : `$${c.value.toLocaleString('es-AR')}`;
            content += `    - ${c.concept}: ${valStr}\n`;
          });
        }

        // Comisiones pasarela (Mercado Pago)
        if (p.finance?.mpCommissionSnapshot) {
          content += `  * Comisiones Pasarela de Pago (Mercado Pago):\n`;
          content += `    - Comisión Base: ${p.finance.mpCommissionSnapshot.base}%\n`;
          if (p.finance.mpCommissionSnapshot.cft3Cuotas) content += `    - CFT 3 Cuotas: ${p.finance.mpCommissionSnapshot.cft3Cuotas}%\n`;
          if (p.finance.mpCommissionSnapshot.cft6Cuotas) content += `    - CFT 6 Cuotas: ${p.finance.mpCommissionSnapshot.cft6Cuotas}%\n`;
        }

        // Ganancias Netas en mano del vendedor
        if (p.finance?.calculatedProfits) {
          content += `  * Ganancia Neta Estimada (Bolsillo del Vendedor):\n`;
          content += `    - Por Transferencia / Efectivo: +$${p.finance.calculatedProfits.transfer?.toLocaleString('es-AR') || 0} netos\n`;
          content += `    - Con Tarjeta 1 Pago: +$${p.finance.calculatedProfits.card_ticket1Pay?.toLocaleString('es-AR') || 0} netos\n`;
          if (p.finance.calculatedProfits.card3Installments) {
            content += `    - En 3 Cuotas: +$${p.finance.calculatedProfits.card3Installments?.toLocaleString('es-AR') || 0} netos\n`;
          }
          if (p.finance.calculatedProfits.card6Installments) {
            content += `    - En 6 Cuotas: +$${p.finance.calculatedProfits.card6Installments?.toLocaleString('es-AR') || 0} netos\n`;
          }
        }

        if (p.finance?.pricingStrategy) {
          content += `  * Estrategia de Precio: ${p.finance.pricingStrategy.method === 'margin' ? 'Margen sobre venta' : 'Markup sobre costo'} (${p.finance.pricingStrategy.targetProfit}% objetivo)\n`;
        }
        
        content += `- Stock Total: ${stock} unidades\n`;
        
        // Stock por talle/color si existe
        if (p.variants && p.variants.length > 0) {
          const varSummary = p.variants.map((v: any) => `${v.size || v.sku || 'Variante'}${v.color ? ' (' + v.color.name + ')' : ''}: ${v.stock} uds`).join(' | ');
          content += `  * Variantes: ${varSummary}\n`;
        }

        // SEO
        content += `- SEO:\n`;
        content += `  * Meta Título: ${p.seo?.metaTitle || 'Sin configurar'}\n`;
        content += `  * Meta Descripción: ${p.seo?.metaDescription || 'Sin configurar'}\n`;
        content += `  * Imagen SEO: ${p.seo?.metaImage ? p.seo.metaImage : 'Sin imagen dedicada'}\n`;

        // Imágenes
        if (p.images && p.images.length > 0) {
          content += `- Galería de Imágenes (${p.images.length}):\n`;
          p.images.forEach((img, imgIdx) => {
            content += `  [Foto ${imgIdx + 1}] ${img.url}\n`;
          });
        }

        // Recomendaciones
        if (p.recommendationsMode) {
          content += `- Modo de Recomendación: ${p.recommendationsMode}\n`;
        }

        content += `\n----------------------------------------------------------------------\n\n`;
      });

      await navigator.clipboard.writeText(content);
      this.#snackBar.open(`✨ ¡Listado de ${products.length} productos copiado para la IA!`, 'Genial', { duration: 4000 });
    } catch (err) {
      this.#snackBar.open('Error al copiar al portapapeles.', 'Cerrar', { duration: 3000 });
    } finally {
      this.isCopyingForAi.set(false);
    }
  }

  formatPriceAge(date?: string | Date): { text: string; fullDate: string; isOld: boolean; isVeryOld: boolean } {
    if (!date) return { text: 'Sin fecha', fullDate: '', isOld: false, isVeryOld: false };
    const d = new Date(date);
    if (isNaN(d.getTime())) return { text: 'Sin fecha', fullDate: '', isOld: false, isVeryOld: false };

    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    const pad = (n: number) => n.toString().padStart(2, '0');
    const fullDate = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}hs`;

    let text = '';
    if (diffMinutes < 1) text = 'Recién';
    else if (diffMinutes < 60) text = `Hace ${diffMinutes}m`;
    else if (diffHours < 24 && d.getDate() === now.getDate()) text = `Hoy ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    else if (diffDays === 1 || (diffHours < 48 && d.getDate() === now.getDate() - 1)) text = 'Ayer';
    else if (diffDays < 7) text = `Hace ${diffDays}d`;
    else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      text = `Hace ${weeks} sem.`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      text = `Hace ${months} mes${months > 1 ? 'es' : ''}`;
    } else {
      const years = Math.floor(diffDays / 365);
      text = `Hace +${years}a`;
    }

    return {
      text,
      fullDate,
      isOld: diffDays >= 15,
      isVeryOld: diffDays >= 30
    };
  }
}
