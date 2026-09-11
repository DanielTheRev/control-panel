import { CurrencyPipe, DatePipe, NgClass } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatIcon } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router, RouterLink } from '@angular/router';
import { IProduct, ProductType, ProductStatus, IVariant } from '../../interfaces/product.interface';
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
    DatePipe,
    NgClass,
    RouterLink,
    MatSnackBarModule,
    MatTooltipModule,
    FormsModule,
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

  activeStatusTab = computed(() => this.ProductState.currentStatusFilter() || 'published');
  statusCounts = this.ProductState.statusCounts;
  activeFilter = signal<string>('all');
  viewMode = signal<'grid' | 'list'>('grid');
  showStatsSidebar = signal<boolean>(false);
  showFiltersSidebar = signal<boolean>(true);
  showFiltersDrawer = signal<boolean>(false);
  showMobileFilters = signal<boolean>(false);
  showKpiBar = signal<boolean>(false);
  quickOverviewProduct = signal<IProduct | null>(null);
  selectedOverviewImageIndex = signal<number>(0);
  dataSource = new MatTableDataSource<IProduct>([]);
  private searchSubject = new Subject<string>();

  activeFiltersCount = computed(() => {
    let count = 0;
    if (this.ProductState.currentCategoryFilter()) count++;
    if (this.ProductState.currentProviderFilter()) count++;
    if (this.ProductState.currentHasSeoImageFilter() !== undefined) count++;
    if (this.ProductState.currentHasSizeGuideFilter() !== undefined) count++;
    if (this.ProductState.currentHasLinkProviderFilter() !== undefined) count++;
    if (this.ProductState.currentIsFeaturedFilter() !== undefined) count++;
    if (this.ProductState.currentSortBy() && this.ProductState.currentSortBy() !== 'newest') count++;
    return count;
  });

  toggleFiltersSidebar() {
    this.showFiltersSidebar.update((v) => !v);
  }

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
    this.ProductState.setStatusFilter('published');
    this.ProductState.setNoSeoOnlyFilter(false);
    this.ProductState.setHasSeoImageFilter(undefined);
    this.ProductState.setHasSizeGuideFilter(undefined);
    this.ProductState.setHasLinkProviderFilter(undefined);
    this.ProductState.setIsFeaturedFilter(undefined);
    this.ProductState.setSortBy('newest');
  }

  getSortLabel(sortBy: string): string {
    switch (sortBy) {
      case 'price_asc': return 'Menor Precio';
      case 'price_desc': return 'Mayor Precio';
      case 'oldest': return 'Más Antiguos';
      case 'name_asc': return 'Nombre: A-Z';
      case 'name_desc': return 'Nombre: Z-A';
      default: return 'Más Nuevos';
    }
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

  getProductColors(product: IProduct): Array<{ name: string; hex: string }> {
    if (!product.variants || product.variants.length === 0) return [];

    const colorMap = new Map<string, { name: string; hex: string }>();

    for (const v of product.variants) {
      if (v.isActive === false) continue;

      // 1. Caso Indumentaria / General: variant.color
      if ((v as any).color && (v as any).color.name) {
        const name = String((v as any).color.name).trim();
        const hex = (v as any).color.hex || '#000000';
        if (name && !colorMap.has(name.toLowerCase())) {
          colorMap.set(name.toLowerCase(), { name, hex });
        }
      }
      // 2. Caso legacy: variant.colorName / variant.colorHex
      else if ((v as any).colorName) {
        const name = String((v as any).colorName).trim();
        const hex = (v as any).colorHex || '#000000';
        if (name && !colorMap.has(name.toLowerCase())) {
          colorMap.set(name.toLowerCase(), { name, hex });
        }
      }
      // 3. Caso Tecnología: variant.attributes con key 'Color'
      else if (Array.isArray((v as any).attributes)) {
        const colorAttr = (v as any).attributes.find(
          (a: any) => a.key && a.key.toLowerCase() === 'color'
        );
        if (colorAttr && colorAttr.value) {
          const name = String(colorAttr.value).trim();
          const hex = this.getApproximateColorHex(name);
          if (name && !colorMap.has(name.toLowerCase())) {
            colorMap.set(name.toLowerCase(), { name, hex });
          }
        }
      }
    }

    return Array.from(colorMap.values());
  }

  getApproximateColorHex(colorName: string): string {
    const c = colorName.toLowerCase().trim();
    if (c.includes('negro') || c.includes('black') || c.includes('space gray') || c.includes('titanio negro')) return '#0D0D0D';
    if (c.includes('blanco') || c.includes('white') || c.includes('polar')) return '#FFFFFF';
    if (c.includes('crudo') || c.includes('ivory') || c.includes('marfil') || c.includes('crema')) return '#F8F8F7';
    if (c.includes('arena') || c.includes('sand') || c.includes('beige')) return '#EFE9E1';
    if (c.includes('gris') || c.includes('gray') || c.includes('silver') || c.includes('plata')) return '#B0B0B0';
    if (c.includes('azul') || c.includes('blue') || c.includes('navy') || c.includes('marino')) return '#1A237E';
    if (c.includes('celeste') || c.includes('light blue') || c.includes('sky')) return '#81D4FA';
    if (c.includes('rojo') || c.includes('red')) return '#D32F2F';
    if (c.includes('rosa') || c.includes('pink') || c.includes('rose')) return '#F48FB1';
    if (c.includes('verde') || c.includes('green') || c.includes('olive') || c.includes('oliva')) return '#388E3C';
    if (c.includes('marron') || c.includes('brown') || c.includes('tostado') || c.includes('chocolate')) return '#5D4037';
    if (c.includes('bordeaux') || c.includes('vino') || c.includes('burgundy')) return '#4A148C';
    if (c.includes('oro') || c.includes('gold') || c.includes('dorado')) return '#FFD700';
    return '#66625E';
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

  editProduct(product: IProduct) {
    this.#router.navigate(['/home/products/edit', product._id]);
  }

  openQuickOverview(product: IProduct, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    this.selectedOverviewImageIndex.set(0);
    this.quickOverviewProduct.set(product);
  }

  closeQuickOverview() {
    this.quickOverviewProduct.set(null);
  }

  selectOverviewImage(index: number) {
    this.selectedOverviewImageIndex.set(index);
  }

  getVariantSize(v: IVariant): string {
    if ('size' in v && v.size) return v.size;
    return 'U';
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

  setStatusTab(status: string) {
    this.ProductState.setStatusFilter(status);
  }

  getStatusBadge(status: ProductStatus | string): { label: string; class: string; icon: string; bgClass: string; textClass: string } {
    switch (status) {
      case 'published':
        return {
          label: 'Publicado',
          class: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/90 dark:text-emerald-300 dark:border-emerald-700 font-bold',
          bgClass: 'bg-emerald-500',
          textClass: 'text-emerald-700 dark:text-emerald-400',
          icon: 'check_circle'
        };
      case 'draft':
        return {
          label: 'Borrador / IA',
          class: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/90 dark:text-amber-300 dark:border-amber-700 font-bold',
          bgClass: 'bg-amber-500',
          textClass: 'text-amber-700 dark:text-amber-400',
          icon: 'edit_note'
        };
      case 'paused':
        return {
          label: 'Pausado',
          class: 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950/90 dark:text-blue-300 dark:border-blue-700 font-bold',
          bgClass: 'bg-blue-500',
          textClass: 'text-blue-700 dark:text-blue-400',
          icon: 'pause_circle'
        };
      case 'archived':
        return {
          label: 'Archivado',
          class: 'bg-slate-200 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600 font-bold',
          bgClass: 'bg-slate-400',
          textClass: 'text-slate-700 dark:text-slate-400',
          icon: 'archive'
        };
      default:
        return {
          label: 'Borrador',
          class: 'bg-slate-200 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600 font-bold',
          bgClass: 'bg-slate-400',
          textClass: 'text-slate-700 dark:text-slate-400',
          icon: 'edit_note'
        };
    }
  }

  async setProductStatus(product: IProduct, status: ProductStatus) {
    try {
      await this.ProductState.updateProductStatus(product._id, status);
      const labels: Record<ProductStatus, string> = {
        published: 'publicado',
        draft: 'guardado como borrador',
        paused: 'pausado',
        archived: 'archivado',
      };
      this.#snackBar.open(
        `Producto ${labels[status] || status} correctamente`,
        'Cerrar',
        { duration: 2000 }
      );
    } catch (error) {
      this.#snackBar.open('Error al cambiar el estado del producto', 'Cerrar', {
        duration: 3000,
      });
    }
  }

  async publishSelected() {
    const selectedCount = this.selectedProducts().length;
    if (selectedCount === 0) return;

    if (confirm(`¿Publicar los ${selectedCount} productos seleccionados en la tienda?`)) {
      try {
        await this.ProductState.bulkUpdateStatus(this.selectedProducts(), 'published');
        this.clearSelection();
      } catch (error) {}
    }
  }

  async pauseSelected() {
    const selectedCount = this.selectedProducts().length;
    if (selectedCount === 0) return;

    if (confirm(`¿Pausar los ${selectedCount} productos seleccionados?`)) {
      try {
        await this.ProductState.bulkUpdateStatus(this.selectedProducts(), 'paused');
        this.clearSelection();
      } catch (error) {}
    }
  }

  async archiveSelected() {
    const selectedCount = this.selectedProducts().length;
    if (selectedCount === 0) return;

    if (confirm(`¿Archivar los ${selectedCount} productos seleccionados?`)) {
      try {
        await this.ProductState.bulkUpdateStatus(this.selectedProducts(), 'archived');
        this.clearSelection();
      } catch (error) {}
    }
  }

  async draftSelected() {
    const selectedCount = this.selectedProducts().length;
    if (selectedCount === 0) return;

    if (confirm(`¿Mover a Borrador los ${selectedCount} productos seleccionados?`)) {
      try {
        await this.ProductState.bulkUpdateStatus(this.selectedProducts(), 'draft');
        this.clearSelection();
      } catch (error) {}
    }
  }

  // Backwards compatibility alias
  async toggleProductStatus(product: IProduct) {
    const nextStatus: ProductStatus = product.status === 'published' ? 'paused' : 'published';
    await this.setProductStatus(product, nextStatus);
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
      const config = this.#StoreConfigState.StoreConfig().config;
      const activeFilters: string[] = [];
      if (this.ProductState.currentSearchQuery()) activeFilters.push(`Búsqueda: "${this.ProductState.currentSearchQuery()}"`);
      if (this.ProductState.currentCategoryFilter()) activeFilters.push(`Categoría: "${this.ProductState.currentCategoryFilter()}"`);
      if (this.ProductState.currentProviderFilter()) activeFilters.push(`Proveedor: "${this.getProviderName(this.ProductState.currentProviderFilter())}"`);
      if (this.ProductState.currentStatusFilter() && this.ProductState.currentStatusFilter() !== 'all') {
        activeFilters.push(`Estado: ${this.getStatusBadge(this.ProductState.currentStatusFilter() as ProductStatus).label}`);
      }
      if (this.ProductState.currentHasSeoImageFilter() !== undefined) activeFilters.push(`Imagen SEO: ${this.ProductState.currentHasSeoImageFilter() ? 'Con Foto' : 'Sin Foto'}`);
      if (this.ProductState.currentHasSizeGuideFilter() !== undefined) activeFilters.push(`Guía Talles: ${this.ProductState.currentHasSizeGuideFilter() ? 'Con Guía' : 'Sin Guía'}`);
      if (this.ProductState.currentHasLinkProviderFilter() !== undefined) activeFilters.push(`Link Proveedor: ${this.ProductState.currentHasLinkProviderFilter() ? 'Con Link' : 'Sin Link'}`);

      // Métricas acumuladas del lote
      let totalUnits = 0;
      let totalRetailValue = 0;
      let totalCostValue = 0;
      let totalTransferProfit = 0;
      let publishedCount = 0;

      products.forEach((p) => {
        const stock = this.getTotalStock(p);
        totalUnits += stock;
        if (p.status === 'published') publishedCount++;
        const retailPrice = p.price?.listPrice || p.price?.cashTransferPrice || 0;
        const costPrice = p.finance?.providerCost?.inARS || 0;
        totalRetailValue += retailPrice * stock;
        totalCostValue += costPrice * stock;
        const profit = p.finance?.calculatedProfits?.transfer || 0;
        totalTransferProfit += profit * stock;
      });

      const reportTimestamp = new Intl.DateTimeFormat('es-AR', {
        timeZone: 'America/Argentina/Buenos_Aires',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).format(new Date()).replace(',', '');

      let content = `# 🏢 REPORTE INTEGRAL DE E-COMMERCE Y CATÁLOGO DE PRODUCTOS (LLM CONTEXT)\n`;
      content += `• Fecha y Hora: ${reportTimestamp}\n`;
      content += `• Plataforma: NexoCommerce SaaS (Multi-Tenant E-Commerce Suite)\n\n`;

      // ==========================================
      // 1. CONTEXTO GLOBAL DEL NEGOCIO
      // ==========================================
      content += `======================================================================\n`;
      content += `## ⚙️ 1. CONTEXTO GLOBAL DEL NEGOCIO Y ESTRATEGIA FINANCIERA\n`;
      content += `======================================================================\n`;
      if (config) {
        content += `• Nombre del Comercio / Tienda: ${config.name || 'N/A'}\n`;
        content += `• Moneda de Costo Base: ${config.costCurrency || 'ARS'}\n`;
        content += `• Cotización Dólar de Referencia: Tipo "${config.dollarQuoteType || 'oficial'}"` + (config.customDollarRate ? ` ($${config.customDollarRate} ARS/USD)` : '') + `\n`;
        
        if (config.pricingStrategy) {
          const methodLabel = config.pricingStrategy.method === 'margin' ? 'Margen sobre Precio de Venta (Margin)' : 'Markup sobre Costo (Markup)';
          content += `• Estrategia de Margen Global de Tienda (Fallback): ${methodLabel} (${config.profit || 30}%)\n`;
          content += `  ⚠️ NOTA CRÍTICA DE PRICING PARA LA IA: El catálogo NO utiliza un margen plano general. Cada uno de los productos cuenta con su propio Margen de Rentabilidad Personalizado (Custom Profit Override) adaptado por prenda y categoría (entre 15% y 40%), el cual prevalece sobre la regla global.\n`;
          content += `  - Margen Base Tienda: ${config.profit1Pay || config.profit || 0}%\n`;
          
          const maxAbsorbed = config.pricingStrategy.maxInstallmentsToAbsorb || 3;
          const offersInstallments = config.pricingStrategy.absorbInstallments;
          content += `  - Oferta Actual de Cuotas en Tienda: ${offersInstallments ? `Actualmente ofrece hasta ${maxAbsorbed} Cuotas sin Interés al cliente final (CFT absorbido por el comercio).` : 'No ofrece cuotas sin interés'}\n`;
          content += `  - ⚠️ NOTA DE CUOTAS PARA LA IA: En la tienda online solo están activas hasta ${maxAbsorbed} cuotas sin interés al público. La simulación y cálculo de 6 cuotas incluida en cada producto de este reporte funciona como PROYECCIÓN FINANCIERA / ANÁLISIS DE RENTABILIDAD para evaluar su futura activación comercial.\n`;
          content += `  - Descuento por Transferencia Bancaria: ${config.pricingStrategy.transferDiscountPercentage || 0}%\n`;
          const isCashActive = Boolean((config.paymentGateways as any)?.cash?.active);
          if (isCashActive) {
            content += `  - Descuento por Pago en Efectivo: ${config.pricingStrategy.cashDiscountPercentage || 0}%\n`;
          } else {
            content += `  - Pago en Efectivo: INACTIVO (La tienda opera exclusivamente con pagos digitales / online)\n`;
          }
          content += `  - Modalidad 1 Pago con Tarjeta / Débito: ${config.pricingStrategy.card1PayDiscount ? 'MODO 1 PAGO REBAJADO (Débito y 1 pago con tarjeta pagan precio de oferta/transferencia)' : 'MODO TRADICIONAL (Toda tarjeta paga Precio de Lista)'}\n`;
          content += `  - Explicación de Ganancias para IA: ${config.pricingStrategy.card1PayDiscount ? 'En 1 Pago con tarjeta el cliente abona el precio de oferta/transferencia, por lo que la ganancia nominal en pesos en 1 pago es menor que en 3 cuotas porque se cobró un ticket menor en caja.' : 'A toda tarjeta se le cobra Precio de Lista. Por ende, 1 pago deja mayor ganancia neta en pesos que 3 cuotas debido a la menor comisión de pasarela (6.6% vs 18.7%).'}\n`;
        }

        content += `• Impuestos (IVA): ${config.taxes?.iva || 21}%\n`;
        content += `• Envío Gratis: ${config.shippingConfig?.freeShippingThreshold ? 'A partir de $' + config.shippingConfig.freeShippingThreshold.toLocaleString('es-AR') : 'Sin umbral configurado'}\n`;

        // Pasarelas
        content += `• Pasarelas de Pago Habilitadas:\n`;
        if (config.paymentGateways?.mercadopago) {
          const mp = config.paymentGateways.mercadopago;
          content += `  - Mercado Pago: ${mp.active ? 'ACTIVO' : 'INACTIVO'} | Máx cuotas: ${mp.maxInstallments || 12} | Comisión base: ${mp.baseCommission}% | CFT3: ${mp.cft3cuotas}% | CFT6: ${mp.cft6Cuotas}%\n`;
        }
        if (config.paymentGateways?.transfer) {
          const tr = config.paymentGateways.transfer;
          content += `  - Transferencia Bancaria: ${tr.active ? 'ACTIVO' : 'INACTIVO'}` + (tr.alias ? ` (Alias: ${tr.alias} | Banco: ${tr.bankName || 'N/A'} | Titular: ${tr.titular || 'N/A'})` : '') + `\n`;
        }
        if (config.paymentGateways?.uala) {
          const ua = config.paymentGateways.uala;
          content += `  - Ualá Bis: ${ua.active ? 'ACTIVO' : 'INACTIVO'} | Comisión base: ${ua.baseCommission || 4.9}% | CFT3: ${ua.cft3cuotas || 12}% | CFT6: ${ua.cft6Cuotas || 18.9}%\n`;
        }

        // Contacto
        if (config.contact) {
          content += `• Canales de Contacto: WhatsApp/Tel: ${config.contact.whatsapp || config.contact.phone || 'N/A'} | Email: ${config.contact.email || 'N/A'}\n`;
        }
        if (config.social) {
          content += `• Redes Sociales: IG: ${config.social.instagram || 'N/A'} | TikTok: ${config.social.tiktok || 'N/A'} | FB: ${config.social.facebook || 'N/A'}\n`;
        }
        content += `• Calces / Cortes Oficiales de la Tienda: ${this.storeClothingFits().join(', ')}\n`;
        content += `• Géneros Registrados: Hombre, Mujer, Unisex, Niños\n`;
      } else {
        content += `• Configuración global: En proceso de carga / Predeterminada\n`;
      }
      content += `\n`;

      // ==========================================
      // 2. RESUMEN DEL LOTE Y MÉTRICAS
      // ==========================================
      content += `======================================================================\n`;
      content += `## 📊 2. RESUMEN DEL LOTE Y MÉTRICAS DE INVENTARIO\n`;
      content += `======================================================================\n`;
      content += `• Cantidad de productos en esta vista: ${products.length} (Total en catálogo: ${this.ProductState.products().itemsCount})\n`;
      content += `• Productos Publicados: ${publishedCount} | Otros Estados: ${products.length - publishedCount}\n`;
      content += `• Stock total acumulado en unidades: ${totalUnits.toLocaleString('es-AR')} unidades\n`;
      content += `• Valor potencial del stock disponible a Precio de Venta: $${totalRetailValue.toLocaleString('es-AR')} ARS\n`;
      content += `• Costo potencial de reposición del stock disponible: $${totalCostValue.toLocaleString('es-AR')} ARS\n`;
      content += `• Ganancia neta potencial acumulada (Transferencia): $${totalTransferProfit.toLocaleString('es-AR')} ARS\n`;
      content += `• Filtros aplicados en la vista: ${activeFilters.length > 0 ? activeFilters.join(' | ') : 'Ninguno (Catálogo completo)'}\n\n`;

      // ==========================================
      // 3. DETALLE EXHAUSTIVO POR PRODUCTO
      // ==========================================
      content += `======================================================================\n`;
      content += `## 📦 3. DETALLE EXHAUSTIVO DE PRODUCTOS (${products.length})\n`;
      content += `======================================================================\n\n`;

      products.forEach((p, idx) => {
        const stock = this.getTotalStock(p);
        const priceAge = this.formatPriceAge(p.price?.updatedAt || p.updatedAt);

        content += `### [${idx + 1}] ${p.model} (Marca: ${p.brand || 'N/A'})\n`;
        content += `- ID / Slug: ${p._id} / ${p.slug || 'N/A'}\n`;
        content += `- Tipo de Producto: ${p.productType || 'General'}\n`;
        content += `- Categoría: ${p.category || 'Sin categoría'}\n`;
        if (p.subtitle) content += `- Subtítulo / Bajada: ${p.subtitle}\n`;
        content += `- Estado: ${this.getStatusBadge(p.status).label}\n`;
        content += `- Producto Destacado (Home / Ofertas): ${p.isFeatured ? '⭐ SÍ' : 'NO'}\n`;
        content += `- Antigüedad del Precio: ${priceAge.text} (${priceAge.fullDate || 'Sin fecha'})\n`;

        // 👗 DATOS POLIMÓRFICOS: INDUMENTARIA & CALZADO
        const isClothing = p.productType === ProductType.CLOTHING || (p as any).gender || (p as any).fit || (p as any).material;
        if (isClothing) {
          const cp = p as any;
          content += `\n--- 👗 ESPECIFICACIONES DE INDUMENTARIA & CALZADO ---\n`;
          if (cp.gender) content += `- Género: ${cp.gender}\n`;
          if (cp.clothingType) content += `- Tipo de Prenda: ${cp.clothingType}\n`;
          if (cp.fit) content += `- Calce (Fit): ${cp.fit}\n`;
          if (cp.material) content += `- Material: ${cp.material}\n`;
          if (cp.composition && cp.composition.length > 0) {
            const compStr = cp.composition.map((c: any) => `${c.percentage}% ${c.material}`).join(', ');
            content += `- Composición Textil: ${compStr}\n`;
          }
          if (cp.sizeType) content += `- Tipo de Talles: ${cp.sizeType}\n`;
          if (cp.season) content += `- Temporada: ${cp.season}\n`;
          if (cp.careInstructions && cp.careInstructions.length > 0) {
            content += `- Cuidados de la Prenda: ${cp.careInstructions.join(', ')}\n`;
          }

          // Guía de talles completa
          if (cp.sizeGuide && cp.sizeGuide.headers && cp.sizeGuide.headers.length > 0 && cp.sizeGuide.rows && cp.sizeGuide.rows.length > 0) {
            content += `- Guía de Talles & Medidas Exactas:\n`;
            content += `  | ${cp.sizeGuide.headers.join(' | ')} |\n`;
            content += `  | ${cp.sizeGuide.headers.map(() => '---').join(' | ')} |\n`;
            cp.sizeGuide.rows.forEach((row: any) => {
              content += `  | ${row.size} | ${(row.values || []).join(' | ')} |\n`;
            });
            if (cp.sizeGuide.tolerance) {
              content += `  * Tolerancia: ${cp.sizeGuide.tolerance}\n`;
            }
          }
        }

        // 📱 DATOS POLIMÓRFICOS: TECNOLOGÍA & GADGETS
        const isTech = p.productType === ProductType.TECH || (p as any).storage || (p as any).ram || (p as any).processor;
        if (isTech) {
          const tp = p as any;
          content += `\n--- 📱 ESPECIFICACIONES DE TECNOLOGÍA ---\n`;
          if (tp.storage && tp.storage.length > 0) content += `- Almacenamiento: ${tp.storage.join(', ')}\n`;
          if (tp.ram) content += `- Memoria RAM: ${tp.ram}\n`;
          if (tp.processor) content += `- Procesador: ${tp.processor}\n`;
          if (tp.screenSize) content += `- Pantalla: ${tp.screenSize}\n`;
          if (tp.os) content += `- Sistema Operativo: ${tp.os}\n`;
          if (tp.batteryHealth) content += `- Condición de Batería: ${tp.batteryHealth}\n`;
          if (tp.condition) content += `- Condición del Equipo: ${tp.condition}\n`;
          if (tp.connectivity && tp.connectivity.length > 0) content += `- Conectividad: ${tp.connectivity.join(', ')}\n`;
        }

        // 💄 DATOS POLIMÓRFICOS: BELLEZA & COSMÉTICA
        const isBeauty = p.productType === ProductType.BEAUTY || (p as any).volume || (p as any).fragranceFamily;
        if (isBeauty) {
          const bp = p as any;
          content += `\n--- 💄 ESPECIFICACIONES DE BELLEZA & CUIDADO ---\n`;
          if (bp.volume) content += `- Contenido / Volumen: ${bp.volume}\n`;
          if (bp.concentration) content += `- Concentración: ${bp.concentration}\n`;
          if (bp.fragranceFamily) content += `- Familia Olfativa: ${bp.fragranceFamily}\n`;
          if (bp.scentNotes) {
            content += `- Notas Olfativas: Salida: ${bp.scentNotes.top || 'N/A'} | Corazón: ${bp.scentNotes.heart || 'N/A'} | Fondo: ${bp.scentNotes.base || 'N/A'}\n`;
          }
          if (bp.skinType) content += `- Tipo de Piel recomendada: ${bp.skinType}\n`;
          if (bp.applicationArea) content += `- Zona de Aplicación: ${bp.applicationArea}\n`;
        }

        // 📝 CONTENIDO, DESCRIPCIÓN Y ESPECIFICACIONES
        content += `\n--- 📝 CONTENIDO, DESCRIPCIÓN & CARACTERÍSTICAS ---\n`;
        if (p.shortDescription) content += `- Descripción Corta: ${p.shortDescription}\n`;
        if (p.largeDescription) content += `- Descripción Detallada: ${p.largeDescription}\n`;
        if (p.features && p.features.length > 0) {
          content += `- Características Clave (Features):\n`;
          p.features.forEach((feat) => {
            content += `  • ${feat}\n`;
          });
        }
        if (p.specifications && p.specifications.length > 0) {
          content += `- Especificaciones Técnicas:\n`;
          p.specifications.forEach((spec) => {
            content += `  • ${spec.key}: ${spec.value}\n`;
          });
        }

        // 💰 DESGLOSE FINANCIERO Y DE PRECIOS
        content += `\n--- 💰 DESGLOSE FINANCIERO, COSTOS & RENTABILIDAD ---\n`;
        const listPrice = p.price?.listPrice || 0;
        const transferPrice = p.price?.cashTransferPrice || 0;
        const transferDiscountPercent = p.price?.discountPercentageTransfer || (listPrice > 0 ? Math.round((1 - transferPrice / listPrice) * 100) : 0);
        const isCashActive = Boolean((config?.paymentGateways as any)?.cash?.active);
        const transferPricingLabel = isCashActive ? 'Precio Venta Efectivo / Transferencia' : 'Precio Venta por Transferencia';
        content += `- ${transferPricingLabel}: $${transferPrice.toLocaleString('es-AR')} ARS (${transferDiscountPercent}% de descuento respecto a Lista)\n`;
        content += `- Precio Venta Lista (Tarjetas / Cuotas): $${listPrice.toLocaleString('es-AR')} ARS\n`;
        const isCard1PayDiscount = config?.pricingStrategy?.card1PayDiscount;
        const actual1PayPrice = isCard1PayDiscount ? (p.price?.cashTransferPrice || p.price?.card_ticket1PayPrice) : p.price?.listPrice;
        content += `- Precio Cobrado en 1 Pago / Débito: $${actual1PayPrice?.toLocaleString('es-AR') || 0} ARS (${isCard1PayDiscount ? 'Precio Oferta' : 'Precio Lista'})\n`;
        
        const cuota3 = Math.round(listPrice / 3);
        const cuota6 = Math.round(listPrice / 6);
        content += `- Simulación de Cuotas sin Interés:\n`;
        content += `  • 3 Cuotas sin interés de: $${cuota3.toLocaleString('es-AR')} ARS c/u (Total: $${listPrice.toLocaleString('es-AR')} ARS)\n`;
        content += `  • 6 Cuotas sin interés de: $${cuota6.toLocaleString('es-AR')} ARS c/u (Total: $${listPrice.toLocaleString('es-AR')} ARS)\n`;

        if (p.discount && p.discount > 0) content += `- Descuento Promocional Activo: ${p.discount}% OFF\n`;

        if (p.finance?.providerCost?.inARS) {
          content += `- Costo Proveedor: $${p.finance.providerCost.inARS.toLocaleString('es-AR')} ARS`;
          if (p.finance.providerCost.inUSD) {
            content += ` (USD ${p.finance.providerCost.inUSD} @ $${p.finance.exchangeRateSnapshot || 0}/USD)`;
          }
          content += `\n`;
        }

        if (p.finance?.additionalCosts && p.finance.additionalCosts.length > 0) {
          content += `- Costos Operativos Adicionales (Packaging/Fletes/Etc):\n`;
          p.finance.additionalCosts.forEach((c) => {
            const normalizedConcept = /^(bolsas?|packaging|paqueter[ií]a)$/i.test(c.concept?.trim()) ? 'Paqueteria' : c.concept;
            const valStr = c.type === 'percent_over_provider' ? `${c.value}% s/costo proveedor` : `$${c.value.toLocaleString('es-AR')} fijos`;
            content += `  • ${normalizedConcept}: ${valStr}\n`;
          });
        }

        if (p.finance?.mpCommissionSnapshot) {
          content += `- Comisiones Pasarela de Pago (Mercado Pago Snapshot):\n`;
          content += `  • Comisión Base (1 Pago): ${p.finance.mpCommissionSnapshot.base}%\n`;
          if (p.finance.mpCommissionSnapshot.cft3Cuotas) content += `  • CFT 3 Cuotas: ${p.finance.mpCommissionSnapshot.cft3Cuotas}%\n`;
          if (p.finance.mpCommissionSnapshot.cft6Cuotas) content += `  • CFT 6 Cuotas: ${p.finance.mpCommissionSnapshot.cft6Cuotas}%\n`;
        }

        // Margen y Estrategia de Rentabilidad
        const isCustomProfit = (p as any).useCustomProfit === true || 
          (p as any).useCustomProfit === 'true' || 
          (p as any).customProfitMargin !== undefined || 
          (p as any).customProfitMargin1Pay !== undefined ||
          (p.finance?.pricingStrategy?.targetProfit !== undefined && (p as any).useCustomProfit !== false);

        const productProfitMargin = p.finance?.pricingStrategy?.targetProfit ?? (p as any).customProfitMargin ?? (p as any).customProfitMargin1Pay ?? config?.profit ?? 30;

        if (isCustomProfit) {
          content += `- Estrategia de Margen: 🎯 MARGEN PERSONALIZADO (Custom Profit Override: ${productProfitMargin}%)\n`;
          content += `  * Este producto NO aplica la regla global de la tienda; tiene fijado un margen propio del ${productProfitMargin}%.\n`;
        } else {
          content += `- Estrategia de Margen: 🌐 MARGEN GLOBAL DE TIENDA (${productProfitMargin}%)\n`;
          content += `  * Este producto hereda la regla global de rentabilidad de la tienda.\n`;
        }

        if (p.finance?.calculatedProfits) {
          content += `- Ganancia Neta en Mano (Bolsillo del Vendedor) por Modalidad de Cobro:\n`;
          const transferProfitLabel = isCashActive ? 'Por Transferencia / Efectivo' : 'Por Transferencia Bancaria';
          content += `  • 💵 ${transferProfitLabel}: +$${p.finance.calculatedProfits.transfer?.toLocaleString('es-AR') || 0} ARS netos (0% comisión)\n`;
          content += `  • 💳 Con Tarjeta 1 Pago / Débito: +$${p.finance.calculatedProfits.card_ticket1Pay?.toLocaleString('es-AR') || 0} ARS netos\n`;
          if (p.finance.calculatedProfits.card3Installments) {
            content += `  • 💳 En 3 Cuotas sin interés: +$${p.finance.calculatedProfits.card3Installments?.toLocaleString('es-AR') || 0} ARS netos (absorbiendo CFT)\n`;
          }
          if (p.finance.calculatedProfits.card6Installments) {
            content += `  • 💳 En 6 Cuotas sin interés: +$${p.finance.calculatedProfits.card6Installments?.toLocaleString('es-AR') || 0} ARS netos (absorbiendo CFT)\n`;
          }
        }

        // 📦 STOCK Y VARIANTES
        content += `\n--- 📦 STOCK Y VARIANTES POLIMÓRFICAS (${p.variants ? p.variants.length : 0}) ---\n`;
        content += `- Stock Total Disponible: ${stock} unidades\n`;
        if (p.lowStockThreshold) content += `- Alerta de Stock Bajo: Menor a ${p.lowStockThreshold} unidades\n`;

        if (p.variants && p.variants.length > 0) {
          p.variants.forEach((v: any, vIdx: number) => {
            const sizePart = v.size ? `Talle: ${v.size}` : '';
            const colorPart = v.color ? `Color: ${v.color.name || 'S/N'} (${v.color.hex || ''})` : '';
            const skuPart = v.sku ? `SKU: ${v.sku}` : '';
            const barcodePart = v.barcode ? `EAN: ${v.barcode}` : '';
            const attrPart = v.attributes && v.attributes.length > 0 ? `Atributos: ${v.attributes.map((a: any) => a.key + '=' + a.value).join(', ')}` : '';
            const parts = [sizePart, colorPart, skuPart, barcodePart, attrPart].filter(Boolean).join(' | ');

            content += `  [Variante ${vIdx + 1}] ${parts || 'Variante Estándar'}: ${v.stock} unidades (Activo: ${v.isActive !== false ? 'SÍ' : 'NO'})\n`;
          });
        } else {
          content += `  (Sin variantes configuradas — producto simple con stock directo)\n`;
        }

        // 📐 GUÍA DE TALLES Y MEDIDAS (SIZE GUIDE)
        content += `\n--- 📐 GUÍA DE TALLES Y TABLA DE MEDIDAS ---\n`;
        const sizeGuide = (p as any).sizeGuide;
        if (sizeGuide && Array.isArray(sizeGuide.rows) && sizeGuide.rows.length > 0) {
          content += `- Estado de Guía: ✅ Configurada (${sizeGuide.rows.length} talles)\n`;
          if (Array.isArray(sizeGuide.headers) && sizeGuide.headers.length > 0) {
            content += `  • Columnas / Medidas: ${sizeGuide.headers.join(' | ')}\n`;
          }
          sizeGuide.rows.forEach((r: any) => {
            const vals = Array.isArray(r.values) ? r.values.join(' cm | ') : '';
            content += `  • Talle [${r.size}]: ${vals} cm\n`;
          });
          if (sizeGuide.tolerance) {
            content += `  • Tolerancia / Aclaración: ${sizeGuide.tolerance}\n`;
          }
        } else {
          content += `- Estado de Guía: ⚠️ Sin Guía de Talles configurada (Pendiente)\n`;
        }

        // 🏭 PROVEEDOR
        content += `\n--- 🏭 PROVEEDOR & LOGÍSTICA ---\n`;
        if (p.provider) {
          content += `- Proveedor Asignado: ${p.provider.name || 'N/A'}\n`;
          if (p.provider.cuit) content += `- CUIT Proveedor: ${p.provider.cuit}\n`;
          if (p.provider.phone) content += `- Teléfono Proveedor: ${p.provider.phone}\n`;
          if (p.provider.contactEmail) content += `- Email Proveedor: ${p.provider.contactEmail}\n`;
          if (p.provider.address) {
            const addr = p.provider.address;
            const fullAddr = [addr.street, addr.number, addr.city, addr.province].filter(Boolean).join(' ');
            if (fullAddr) content += `- Dirección Proveedor: ${fullAddr}\n`;
          }
        } else {
          content += `- Proveedor: No asignado\n`;
        }
        if (p.linkProductProvider) {
          content += `- Enlace Directo al Producto en Proveedor: ${p.linkProductProvider}\n`;
        }

        // 🔍 SEO Y MULTIMEDIA
        content += `\n--- 🔍 SEO Y MULTIMEDIA ---\n`;
        content += `- Meta Título SEO: ${p.seo?.metaTitle || 'Sin configurar'}\n`;
        content += `- Meta Descripción SEO: ${p.seo?.metaDescription || 'Sin configurar'}\n`;
        const metaImgUrl = typeof p.seo?.metaImage === 'string' ? p.seo?.metaImage : p.seo?.metaImage?.url;
        content += `- Imagen SEO Dedicada (OG Image): ${metaImgUrl || 'Sin imagen dedicada'}\n`;
        if (p.images && p.images.length > 0) {
          content += `- Galería de Imágenes (${p.images.length}):\n`;
          p.images.forEach((img, imgIdx) => {
            content += `  [Foto ${imgIdx + 1}] ${img.url}\n`;
          });
        }

        // 🎯 RECOMENDACIONES
        if (p.recommendationsMode) {
          content += `- Modo de Recomendación Cruzada: ${p.recommendationsMode === 'manual' ? 'Manual (Productos curados)' : 'Automático por Categoría/Marca'}\n`;
        }

        content += `\n----------------------------------------------------------------------\n\n`;
      });

      await navigator.clipboard.writeText(content);
      this.#snackBar.open(`✨ ¡Reporte completo de ${products.length} productos copiado para la IA!`, 'Genial', { duration: 4000 });
    } catch (err) {
      console.error('Error al copiar contexto para IA:', err);
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

    const dateFormatted = new Intl.DateTimeFormat('es-AR', {
      timeZone: 'America/Argentina/Buenos_Aires',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(d).replace(',', '');
    const fullDate = `${dateFormatted}hs`;
    const timeOnly = dateFormatted.split(' ')[1] || '';

    let text = '';
    if (diffMinutes < 1) text = 'Recién';
    else if (diffMinutes < 60) text = `Hace ${diffMinutes}m`;
    else if (diffHours < 24) text = `Hoy ${timeOnly}`;
    else if (diffDays === 1) text = 'Ayer';
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

  // ==========================================
  // 🤖 AI BULK SUITE (CREACIÓN Y ACTUALIZACIÓN)
  // ==========================================
  showAiBulkModal = signal<boolean>(false);
  aiBulkMode = signal<'create' | 'update'>('create');
  aiRawInput = signal<string>('');
  aiParseError = signal<string | null>(null);
  aiPromptCopied = signal<boolean>(false);
  aiProcessing = signal<boolean>(false);
  aiConversationalMode = signal<boolean>(false);

  storeClothingFits = computed(() => {
    const config = this.#StoreConfigState.StoreConfig().config;
    const raw = (config?.clothingFits || []).map((f: string) => f?.trim()).filter(Boolean);
    return raw.length > 0 ? raw : ['Regular', 'Slim', 'Oversized', 'Relaxed', 'Boxy', 'Straight', 'Tapered', 'Baggy'];
  });

  isKnownFit(fit: string | undefined): boolean {
    if (!fit || !fit.trim()) return true;
    const known = this.storeClothingFits().map((f) => f.toLowerCase().trim());
    return known.includes(fit.toLowerCase().trim());
  }

  get availableScopeProperties() {
    const fitsList = this.storeClothingFits().join(', ');
    return [
      // 🌐 GENERALES & COMERCIALES
      {
        key: 'model',
        payloadKey: 'model',
        label: '🏷️ Nombre / Modelo',
        category: 'general',
        type: 'string',
        explanation: 'Nombre o modelo comercial.',
        example: 'Remera Oversize Vesper'
      },
      {
        key: 'subtitle',
        payloadKey: 'subtitle',
        label: '📌 Subtítulo / Frase Comercial',
        category: 'general',
        type: 'string',
        explanation: 'Subtítulo breve o bajada comercial del producto.',
        example: 'Edición Limitada 2026'
      },
      {
        key: 'costPriceARS',
        payloadKey: 'costPriceARS',
        label: '💵 Costo Proveedor ($ ARS)',
        category: 'general',
        type: 'number',
        explanation: 'Costo de compra al proveedor en pesos sin IVA (ej: 14500). El sistema calcula precios de venta, cuotas y transferencias automáticamente.',
        example: 14500
      },
      {
        key: 'variants_matrix',
        payloadKey: 'variants',
        label: '🎨 Variantes Completas (Talles & Colores)',
        category: 'general',
        type: 'Array<{ colorName, colorHex, size, stock }>',
        explanation: 'Estructura completa de matriz de variantes con color, código HEX, talle/capacidad y stock.',
        example: [
          { colorName: 'Negro', colorHex: '#000000', size: 'S', stock: 10 },
          { colorName: 'Negro', colorHex: '#000000', size: 'M', stock: 15 },
          { colorName: 'Blanco', colorHex: '#FFFFFF', size: 'S', stock: 8 }
        ]
      },
      {
        key: 'variants_colors',
        payloadKey: 'variants',
        label: '🎨 Paleta de Colores',
        category: 'general',
        type: 'Array<{ colorName, colorHex, size, stock }>',
        explanation: 'Actualizar colores oficiales y códigos HEX exactos de cada variante.',
        example: [
          { colorName: 'Azul Marino', colorHex: '#000080', size: 'M', stock: 10 },
          { colorName: 'Verde Militar', colorHex: '#4B5320', size: 'S', stock: 10 },
          { colorName: 'Crudo', colorHex: '#F5F5DC', size: 'M', stock: 15 }
        ]
      },
      {
        key: 'variants_sizes',
        payloadKey: 'variants',
        label: '📏 Curva de Talles / Capacidades',
        category: 'general',
        type: 'Array<{ colorName, colorHex, size, stock }>',
        explanation: 'Normalizar o definir la curva de talles/capacidades disponibles (ej: S, M, L, XL, XXL o 128GB, 256GB).',
        example: [
          { colorName: 'Negro', colorHex: '#000000', size: 'S', stock: 10 },
          { colorName: 'Negro', colorHex: '#000000', size: 'M', stock: 10 },
          { colorName: 'Negro', colorHex: '#000000', size: 'L', stock: 10 },
          { colorName: 'Negro', colorHex: '#000000', size: 'XL', stock: 10 }
        ]
      },
      {
        key: 'shortDescription',
        payloadKey: 'shortDescription',
        label: '📝 Descripción Corta',
        category: 'general',
        type: 'string',
        explanation: 'Resumen vendedor de 1-2 líneas para la tarjeta de producto.',
        example: 'Remera oversize de calce amplio confeccionada en algodón peinado.'
      },
      {
        key: 'largeDescription',
        payloadKey: 'largeDescription',
        label: '📄 Descripción Detallada (HTML)',
        category: 'general',
        type: 'string HTML',
        explanation: 'Descripción estructurada en HTML limpio (<p>, <ul>, <li>, <strong>).',
        example: '<p>Prenda versátil diseñada para uso diario con terminaciones de alta calidad.</p>'
      },
      {
        key: 'tags',
        payloadKey: 'tags',
        label: '🏷️ Etiquetas / Tags',
        category: 'general',
        type: 'string[]',
        explanation: 'Array de palabras clave para búsqueda interna y filtros.',
        example: ['verano', 'algodon', 'novedad', 'urbano']
      },
      {
        key: 'specifications',
        payloadKey: 'specifications',
        label: '⚙️ Ficha Técnica / Especificaciones',
        category: 'general',
        type: 'Array<{ key: string, value: string }>',
        explanation: 'Ficha técnica en pares clave y valor estructurados.',
        example: [
          { key: 'Gramaje', value: '180 g/m²' },
          { key: 'Costura', value: 'Reforzada de 4 hilos' }
        ]
      },
      {
        key: 'seo',
        payloadKey: 'seo',
        label: '🌐 SEO (Meta Título & Meta Descripción)',
        category: 'general',
        type: 'Object { metaTitle, metaDescription }',
        explanation: 'Optimización para buscadores (Google): metaTitle (máx 60 caracteres) y metaDescription (máx 150 caracteres).',
        example: {
          metaTitle: 'Remera Oversize Vura | Tienda Oficial',
          metaDescription: 'Comprá la remera oversize Vura en cuotas sin interés y envíos a todo el país.'
        }
      },

      // 👕 INDUMENTARIA & CALZADO (ClothingProduct)
      {
        key: 'material',
        payloadKey: 'material',
        label: '🧵 Tela / Material Principal',
        category: 'clothing',
        type: 'string',
        explanation: 'Tipo de tejido o material principal de confección (ej: "Algodón peinado 24/1", "Denim rígido 12oz", "Lino rústico").',
        example: 'Algodón Peinado 24/1'
      },
      {
        key: 'composition',
        payloadKey: 'composition',
        label: '🧪 Composición Textil (% Porcentajes)',
        category: 'clothing',
        type: 'Array<{ material: string, percentage: number }>',
        explanation: 'Desglose porcentual exacto de la composición (ej: 95% Algodón, 5% Elastano).',
        example: [
          { material: 'Algodón', percentage: 95 },
          { material: 'Elastano', percentage: 5 }
        ]
      },
      {
        key: 'fit',
        payloadKey: 'fit',
        label: '👔 Calce / Fit',
        category: 'clothing',
        type: 'string',
        explanation: `Calce o corte de la prenda. Cortes registrados en la tienda: [ ${fitsList} ]. Prioriza estrictamente estos cortes oficiales o sugiere uno nuevo indicándoselo al usuario si la prenda lo requiere.`,
        example: this.storeClothingFits()[0] || 'Oversized'
      },
      {
        key: 'gender',
        payloadKey: 'gender',
        label: '👥 Género',
        category: 'clothing',
        type: 'string',
        explanation: '"Hombre" | "Mujer" | "Unisex" | "Niños".',
        example: 'Unisex'
      },
      {
        key: 'sizeType',
        payloadKey: 'sizeType',
        label: '📐 Tipo de Talle / Curva',
        category: 'clothing',
        type: '"Ropa" | "Calzado" | "Numérico" | "Talle Único"',
        explanation: 'Sistema de curva de talles: "Ropa" (S..XXL), "Calzado" (35..45), "Numérico" (38..52), o "Talle Único".',
        example: 'Ropa'
      },
      {
        key: 'season',
        payloadKey: 'season',
        label: '🍂 Temporada / Colección',
        category: 'clothing',
        type: 'string',
        explanation: 'Temporada o estación del año (ej: "Primavera / Verano 2026", "Otoño / Invierno", "Atemporal").',
        example: 'Primavera / Verano 2026'
      },
      {
        key: 'careInstructions',
        payloadKey: 'careInstructions',
        label: '🧺 Cuidados & Lavado',
        category: 'clothing',
        type: 'string[]',
        explanation: 'Instrucciones de conservación y lavado de la prenda.',
        example: ['Lavar con agua fría', 'No retorcer', 'Secar a la sombra']
      },
      {
        key: 'sizeGuide',
        payloadKey: 'sizeGuide',
        label: '📐 Guía de Medidas (Tabla)',
        category: 'clothing',
        type: 'Object { headers, rows, tolerance }',
        explanation: 'Tabla de medidas en cm por talle.',
        example: {
          headers: ['Talle', 'Ancho de Pecho (cm)', 'Largo (cm)'],
          rows: [
            { size: 'S', values: ['52', '68'] },
            { size: 'M', values: ['54', '70'] }
          ],
          tolerance: '* Medidas tomadas en plano (+/- 1 cm).'
        }
      },

      // 💻 TECNOLOGÍA & GADGETS (TechProduct)
      {
        key: 'processor',
        payloadKey: 'processor',
        label: '💻 Procesador / CPU',
        category: 'tech',
        type: 'string',
        explanation: 'Modelo de chip o procesador (ej: "Apple M3", "Snapdragon 8 Gen 3").',
        example: 'Apple M3'
      },
      {
        key: 'ram',
        payloadKey: 'ram',
        label: '🧠 Memoria RAM',
        category: 'tech',
        type: 'string',
        explanation: 'Cantidad y tipo de memoria RAM (ej: "8GB", "16GB LPDDR5X").',
        example: '16GB'
      },
      {
        key: 'storage',
        payloadKey: 'storage',
        label: '💾 Almacenamiento',
        category: 'tech',
        type: 'string[]',
        explanation: 'Capacidades de almacenamiento disponibles (ej: ["128GB", "256GB", "512GB"]).',
        example: ['128GB', '256GB']
      },
      {
        key: 'screenSize',
        payloadKey: 'screenSize',
        label: '📱 Pantalla / Display',
        category: 'tech',
        type: 'string',
        explanation: 'Tamaño y tecnología del display (ej: "6.7\\" Super Retina XDR OLED 120Hz").',
        example: '6.7" OLED 120Hz'
      },
      {
        key: 'os',
        payloadKey: 'os',
        label: '⚙️ Sistema Operativo',
        category: 'tech',
        type: 'string',
        explanation: 'Sistema operativo de fábrica (ej: "iOS 18", "Android 15").',
        example: 'Android 15'
      },
      {
        key: 'connectivity',
        payloadKey: 'connectivity',
        label: '📡 Conectividad',
        category: 'tech',
        type: 'string[]',
        explanation: 'Conexiones inalámbricas y puertos (ej: ["5G", "Wi-Fi 6E", "Bluetooth 5.3", "NFC"]).',
        example: ['5G', 'Wi-Fi 6E', 'Bluetooth 5.3', 'NFC']
      },

      // 🌸 BELLEZA & COSMÉTICA (BeautyProduct)
      {
        key: 'volume',
        payloadKey: 'volume',
        label: '🧴 Volumen / Capacidad (ml)',
        category: 'beauty',
        type: 'string',
        explanation: 'Contenido neto o volumen (ej: "50ml", "100ml").',
        example: '100ml'
      },
      {
        key: 'concentration',
        payloadKey: 'concentration',
        label: '💎 Concentración',
        category: 'beauty',
        type: 'string',
        explanation: 'Concentración de fragancia o fórmula (ej: "Eau de Parfum", "Serum Concentrado").',
        example: 'Eau de Parfum'
      },
      {
        key: 'fragranceFamily',
        payloadKey: 'fragranceFamily',
        label: '🌸 Familia Olfativa / Tipo',
        category: 'beauty',
        type: 'string',
        explanation: 'Familia olfativa o línea dermatológica (ej: "Amaderada Especiada", "Ácido Hialurónico").',
        example: 'Amaderada Oriental'
      },
      {
        key: 'applicationArea',
        payloadKey: 'applicationArea',
        label: '✨ Zona de Aplicación',
        category: 'beauty',
        type: 'string',
        explanation: 'Zona de aplicación recomendada (ej: "Rostro & Cuello", "Cuerpo").',
        example: 'Rostro & Cuello'
      },

      // 📦 BAZAR & GENERAL (GeneralProduct)
      {
        key: 'barcode',
        payloadKey: 'barcode',
        label: '🔢 Código de Barras (EAN / UPC)',
        category: 'bazar',
        type: 'string',
        explanation: 'Código de barras principal o EAN-13 del producto.',
        example: '7791234567890'
      },
      {
        key: 'weight',
        payloadKey: 'weight',
        label: '⚖️ Peso / Dimensiones',
        category: 'bazar',
        type: 'string',
        explanation: 'Peso neto o medidas físicas (ej: "450g", "25 x 15 x 10 cm").',
        example: '450g'
      },
      {
        key: 'unit',
        payloadKey: 'unit',
        label: '📦 Unidad de Medida',
        category: 'bazar',
        type: 'string',
        explanation: 'Unidad de comercialización (ej: "Unidad", "Pack x6", "Kg").',
        example: 'Unidad'
      }
    ];
  }

  selectedScopeCategory = signal<string>('all');

  scopeCategories = [
    { id: 'all', label: 'Todas', icon: 'apps' },
    { id: 'general', label: '🌐 Generales', icon: 'payments' },
    { id: 'clothing', label: '👕 Indumentaria', icon: 'checkroom' },
    { id: 'tech', label: '💻 Tecnología', icon: 'devices' },
    { id: 'beauty', label: '🌸 Belleza', icon: 'spa' },
    { id: 'bazar', label: '📦 Bazar', icon: 'inventory_2' }
  ];

  filteredScopeProperties = computed(() => {
    const cat = this.selectedScopeCategory();
    if (cat === 'all') return this.availableScopeProperties;
    return this.availableScopeProperties.filter((p) => p.category === cat);
  });

  selectRecommendedPropertiesForRubro(rubro: 'clothing' | 'tech' | 'beauty' | 'general' | 'all') {
    switch (rubro) {
      case 'clothing':
        this.selectedScopeProperties.set([
          'variants_matrix',
          'costPriceARS',
          'material',
          'composition',
          'fit',
          'sizeType',
          'season',
          'shortDescription',
          'tags',
          'seo'
        ]);
        break;
      case 'tech':
        this.selectedScopeProperties.set([
          'variants_sizes',
          'costPriceARS',
          'specifications',
          'processor',
          'ram',
          'storage',
          'screenSize',
          'tags',
          'seo'
        ]);
        break;
      case 'beauty':
        this.selectedScopeProperties.set([
          'variants_sizes',
          'costPriceARS',
          'volume',
          'concentration',
          'fragranceFamily',
          'shortDescription',
          'tags',
          'seo'
        ]);
        break;
      case 'general':
        this.selectedScopeProperties.set([
          'variants_matrix',
          'costPriceARS',
          'barcode',
          'weight',
          'unit',
          'shortDescription',
          'tags',
          'seo'
        ]);
        break;
      case 'all':
        this.selectedScopeProperties.set(this.availableScopeProperties.map((p) => p.key));
        break;
    }
  }

  aiTargetProductType = signal<ProductType>(ProductType.CLOTHING);

  productTypeOptions = [
    { type: ProductType.CLOTHING, label: 'Indumentaria & Calzado', icon: 'checkroom', badge: 'Talles y Medidas' },
    { type: ProductType.TECH, label: 'Tecnología & Gadgets', icon: 'devices', badge: 'Capacidad y Specs' },
    { type: ProductType.BEAUTY, label: 'Belleza & Cosmética', icon: 'spa', badge: 'Tonos y Volúmenes' },
    { type: ProductType.GENERAL, label: 'Bazar, Hogar & General', icon: 'inventory_2', badge: 'Variantes Libres' }
  ];

  selectedScopeProperties = signal<string[]>(['variants_matrix', 'costPriceARS']);
  aiCustomInstruction = signal<string>('');

  selectedProductsTypesSummary = computed(() => {
    const selectedIds = this.selectedProducts();
    const allProducts = this.ProductState.products().data || [];
    const selectedList = allProducts.filter((p) => selectedIds.includes(p._id));
    if (selectedList.length === 0) return { isMixed: false, dominantType: ProductType.CLOTHING, breakdown: '', types: [], count: 0 };

    const typeCounts: Record<string, number> = {};
    selectedList.forEach((p) => {
      const t = p.productType || ProductType.CLOTHING;
      typeCounts[t] = (typeCounts[t] || 0) + 1;
    });

    const uniqueTypes = Object.keys(typeCounts);
    const breakdown = uniqueTypes
      .map((t) => {
        const count = typeCounts[t];
        const label = this.productTypeOptions.find((o) => o.type === t)?.label || t;
        return `${count} ${label}`;
      })
      .join(', ');

    return {
      isMixed: uniqueTypes.length > 1,
      dominantType: (uniqueTypes[0] as ProductType) || ProductType.CLOTHING,
      breakdown,
      types: uniqueTypes,
      count: selectedList.length
    };
  });

  quickInstructionPresets = computed(() => {
    const isUpdate = this.aiBulkMode() === 'update';
    if (isUpdate) {
      const summary = this.selectedProductsTypesSummary();
      if (summary.isMixed) {
        return [
          'Ajustar los costos de compra un 15% por inflación en todo el lote',
          'Extraer colores, talles o capacidades según el rubro de cada producto',
          'Poner 10 unidades de stock a todas las variantes disponibles',
          'Generar descripciones atractivas y vendedoras para e-commerce'
        ];
      }
      const pType = summary.dominantType;
      switch (pType) {
        case ProductType.TECH:
          return [
            'Extraer especificaciones técnicas y modelos desde la web',
            'Configurar variantes por capacidad (ej: 64GB, 128GB, 256GB)',
            'Ajustar costos de compra un 15% por inflación',
            'Generar ficha técnica en HTML con viñetas'
          ];
        case ProductType.BEAUTY:
          return [
            'Extraer ingredientes, modo de uso y volumen (ml) desde la web',
            'Configurar variantes por tamaño o tono (ej: 30ml, 50ml)',
            'Ajustar costos de compra un 15% por inflación',
            'Generar descripción enfocada en beneficios y cuidado'
          ];
        case ProductType.GENERAL:
          return [
            'Extraer medidas, materiales y variantes desde el proveedor',
            'Poner 10 unidades de stock a cada variante',
            'Ajustar costos un 15% por inflación',
            'Generar descripciones claras y directas para venta online'
          ];
        case ProductType.CLOTHING:
        default:
          return [
            'Extraer colores y talles reales desde la web del proveedor',
            'Poner 10 unidades de stock a todos los talles',
            'Ajustar los costos de compra un 15% por inflación',
            'Generar descripciones atractivas y vendedoras para e-commerce'
          ];
      }
    }

    const pType = this.aiTargetProductType();
    switch (pType) {
      case ProductType.TECH:
        return [
          'Extraer especificaciones técnicas y modelos desde la web',
          'Configurar variantes por capacidad (ej: 64GB, 128GB, 256GB)',
          'Ajustar costos de compra un 15% por inflación',
          'Generar ficha técnica en HTML con viñetas'
        ];
      case ProductType.BEAUTY:
        return [
          'Extraer ingredientes, modo de uso y volumen (ml) desde la web',
          'Configurar variantes por tamaño o tono (ej: 30ml, 50ml)',
          'Ajustar costos de compra un 15% por inflación',
          'Generar descripción enfocada en beneficios y cuidado'
        ];
      case ProductType.GENERAL:
        return [
          'Extraer medidas, materiales y variantes desde el proveedor',
          'Poner 10 unidades de stock a cada variante',
          'Ajustar costos un 15% por inflación',
          'Generar descripciones claras y directas para venta online'
        ];
      case ProductType.CLOTHING:
      default:
        return [
          'Extraer colores y talles reales desde la web del proveedor',
          'Poner 10 unidades de stock a todos los talles',
          'Ajustar los costos de compra un 15% por inflación',
          'Generar descripciones atractivas y vendedoras para e-commerce'
        ];
    }
  });

  setQuickInstruction(text: string) {
    this.aiCustomInstruction.set(text);
  }

  setProductType(type: ProductType) {
    this.aiTargetProductType.set(type);
  }

  toggleScopeProperty(key: string) {
    const current = this.selectedScopeProperties();
    if (current.includes(key)) {
      this.selectedScopeProperties.set(current.filter((k) => k !== key));
    } else {
      this.selectedScopeProperties.set([...current, key]);
    }
  }

  toggleAllScopeProperties() {
    if (this.isAllScopePropertiesSelected()) {
      this.selectedScopeProperties.set([]);
    } else {
      this.selectedScopeProperties.set(this.availableScopeProperties.map((p) => p.key));
    }
  }

  isAllScopePropertiesSelected(): boolean {
    return this.selectedScopeProperties().length === this.availableScopeProperties.length;
  }

  aiParsedCreateItems = signal<any[]>([]);
  aiParsedUpdateItems = signal<any[]>([]);
  aiParsedUpdateDiffs = signal<any[]>([]);

  openAiBulkModal(mode: 'create' | 'update') {
    this.aiBulkMode.set(mode);
    this.aiRawInput.set('');
    this.aiCustomInstruction.set('');
    this.aiParseError.set(null);
    this.aiPromptCopied.set(false);
    this.aiParsedCreateItems.set([]);
    this.aiParsedUpdateItems.set([]);
    this.aiParsedUpdateDiffs.set([]);
    this.showAiBulkModal.set(true);
  }

  closeAiBulkModal() {
    this.showAiBulkModal.set(false);
  }

  async copyAiCreatePrompt() {
    const pType = this.aiTargetProductType();
    const customInstruction = this.aiCustomInstruction().trim();
    const categoriesList = this.Categories().length > 0
      ? this.Categories().join(', ')
      : 'Remeras, Pantalones, Buzos, Camperas, Suéteres, Camisas, Chombas, Blusas, Calzado, Accesorios';

    const config = this.#StoreConfigState.StoreConfig().config;
    const defaultBrand = config?.brands?.[0] || 'Vura';
    const providersList = (this.ProviderState().data || []).map((p: any) => p.name).filter(Boolean).join(', ') || 'Vura, Krencia';
    const fitsList = this.storeClothingFits().join(', ');

    let dictionary = '';
    let exampleData: any[] = [];

    switch (pType) {
      case ProductType.TECH:
        dictionary = `- provider (string, OBLIGATORIO): Proveedor o fabricante.
  ⚡ Proveedores registrados en la tienda: [ ${providersList} ].
- linkProductProvider (string URL, opcional): Enlace web al producto en el proveedor/fabricante.
- model (string, OBLIGATORIO): Modelo comercial (ej: "Auriculares Inalámbricos Pro ANC").
- subtitle (string, opcional): Subtítulo o versión (ej: "Edición 2026", "Hi-Res Audio").
- brand (string, OBLIGATORIO): Marca. Por defecto "${defaultBrand}" o fabricante ("Sony", "Apple", "Samsung").
- category (string, OBLIGATORIO): Categoría del producto.
  ⚡ Categorías activas en la tienda: [ ${categoriesList} ].
  (Prioriza usar una de estas categorías o sugiere una nueva precisa si amerita).
- productType (string, OBLIGATORIO): "TechProduct".
- status (string, OBLIGATORIO): "draft" (modo Borrador).
- costPriceARS (number, OBLIGATORIO): Costo unitario en pesos sin IVA (ej: 45000). El sistema calcula precios de venta, transferencias y cuotas automáticamente.
- images (string[], opcional): URLs directas de fotos del producto extraídas de la web/catálogo (ej: ["https://ejemplo.com/foto1.jpg", "https://ejemplo.com/foto2.jpg"]).
- shortDescription (string, opcional): Resumen de características clave (1-2 líneas).
- largeDescription (string HTML, opcional): Ficha técnica detallada en HTML enriquecido (<p>, <ul>, <li>, <strong>).
- specifications (Array de objetos, opcional): Ficha técnica con pares clave y valor:
    [
      { "key": "Conectividad", "value": "Bluetooth 5.3" },
      { "key": "Batería", "value": "30 horas continuas con ANC" }
    ]
- tags (string[] opcional): Array de etiquetas de búsqueda (ej: ["bluetooth", "anc", "audio-hd"]).
- seo (Objeto, opcional): Meta tags para SEO y Google:
    {
      "metaTitle": "Auriculares Inalámbricos Pro ANC | ${defaultBrand}",
      "metaDescription": "Auriculares con cancelación activa de ruido y 30hs de batería."
    }
- variants (Array de objetos, opcional): Variantes por capacidad, memoria o color con su índice de foto asociada (imageIndex 0, 1, 2...):
    [
      { "colorName": "Negro", "colorHex": "#000000", "size": "128GB", "stock": 10, "imageIndex": 0 },
      { "colorName": "Plata", "colorHex": "#CCCCCC", "size": "256GB", "stock": 5, "imageIndex": 1 }
    ]`;
        exampleData = [
          {
            provider: 'Sony Oficial',
            linkProductProvider: 'https://sony.com.ar/producto/wh-1000xm5',
            model: 'Auriculares Inalámbricos Pro ANC',
            subtitle: 'Conexión Hi-Res y Cancelación Activa',
            brand: 'Sony',
            category: 'Audio',
            productType: 'TechProduct',
            status: 'draft',
            costPriceARS: 45000,
            images: [
              'https://sony.com.ar/uploads/wh1000xm5-negro.jpg',
              'https://sony.com.ar/uploads/wh1000xm5-plata.jpg'
            ],
            shortDescription: 'Auriculares con cancelación activa de ruido y 30hs de batería.',
            largeDescription: '<p>Experimenta un sonido envolvente de alta fidelidad con cancelación de ruido inteligente.</p><ul><li>Cancelación Activa de Ruido (ANC) de última generación</li><li>Autonomía de 30 horas continuas</li><li>Conexión multipunto Bluetooth 5.3</li></ul>',
            specifications: [
              { key: 'Conectividad', value: 'Bluetooth 5.3' },
              { key: 'Batería', value: '30 horas' },
              { key: 'Cancelación de Ruido', value: 'ANC Dual' }
            ],
            tags: ['audio', 'bluetooth', 'auriculares', 'cancelacion-ruido'],
            seo: {
              metaTitle: 'Auriculares Inalámbricos Pro ANC | Sony',
              metaDescription: 'Auriculares con cancelación activa de ruido y 30hs de batería.'
            },
            variants: [
              { colorName: 'Negro', colorHex: '#000000', size: '128GB', stock: 15, imageIndex: 0 },
              { colorName: 'Plata', colorHex: '#CCCCCC', size: '256GB', stock: 8, imageIndex: 1 }
            ]
          }
        ];
        break;

      case ProductType.BEAUTY:
        dictionary = `- provider (string, OBLIGATORIO): Proveedor o fabricante.
  ⚡ Proveedores registrados en la tienda: [ ${providersList} ].
- linkProductProvider (string URL, opcional): Enlace a la web del fabricante.
- model (string, OBLIGATORIO): Nombre del cosmético/tratamiento (ej: "Serum Facial Ácido Hialurónico").
- subtitle (string, opcional): Subtítulo o beneficio específico (ej: "Tratamiento Antiage y Firmeza").
- brand (string, OBLIGATORIO): Marca. Por defecto "${defaultBrand}" o fabricante ("Vichy", "La Roche-Posay").
- category (string, OBLIGATORIO): Categoría del producto.
  ⚡ Categorías activas en la tienda: [ ${categoriesList} ].
- productType (string, OBLIGATORIO): "BeautyProduct".
- status (string, OBLIGATORIO): "draft" (modo Borrador).
- costPriceARS (number, OBLIGATORIO): Costo unitario en pesos sin IVA (ej: 18000).
- images (string[], opcional): URLs directas de fotos del producto extraídas de la web (ej: ["https://ejemplo.com/foto1.jpg"]).
- shortDescription (string, opcional): Beneficio principal del producto.
- largeDescription (string HTML, opcional): Modo de uso, ingredientes y beneficios en HTML (<p>, <ul>, <li>, <strong>).
- specifications (Array de objetos, opcional): Ficha técnica con atributos (ej: tipo de piel, textura, volumen).
- tags (string[] opcional): Array de etiquetas (ej: ["antiage", "hidratacion", "vegano"]).
- seo (Objeto, opcional): Meta tags para SEO y Google.
- variants (Array de objetos, opcional): Variantes por volumen (ml), tamaño o tono con imageIndex:
    [
      { "colorName": "Incoloro", "colorHex": "#FFFFFF", "size": "30ml", "stock": 20, "imageIndex": 0 },
      { "colorName": "Incoloro", "colorHex": "#FFFFFF", "size": "50ml", "stock": 15, "imageIndex": 0 }
    ]`;
        exampleData = [
          {
            provider: 'L\'Oréal Proveedor',
            linkProductProvider: 'https://vichy.com.ar/producto/mineral-89',
            model: 'Serum Facial Ácido Hialurónico Mineral 89',
            subtitle: 'Fortificante e Hidratante 24h',
            brand: 'Vichy',
            category: 'Cuidado Facial',
            productType: 'BeautyProduct',
            status: 'draft',
            costPriceARS: 18000,
            images: [
              'https://vichy.com.ar/uploads/mineral-89.jpg'
            ],
            shortDescription: 'Concentrado fortificante e hidratante con ácido hialurónico puro.',
            largeDescription: '<p>Fortalece la barrera cutánea frente a las agresiones externas y aporta hidratación por 24hs.</p><ul><li>Apto para todo tipo de pieles incluso sensibles</li><li>Fórmula hipoalergénica sin perfume</li><li>Aplicar 2 gotas por la mañana y noche sobre piel limpia</li></ul>',
            specifications: [
              { key: 'Tipo de Piel', value: 'Todo tipo de pieles, incluso sensibles' },
              { key: 'Textura', value: 'Gel ligero de rápida absorción' }
            ],
            tags: ['serum', 'facial', 'hidratante', 'antiage'],
            seo: {
              metaTitle: 'Serum Facial Ácido Hialurónico Mineral 89 | Vichy',
              metaDescription: 'Concentrado fortificante e hidratante con ácido hialurónico puro.'
            },
            variants: [
              { colorName: 'Incoloro', colorHex: '#FFFFFF', size: '30ml', stock: 25, imageIndex: 0 },
              { colorName: 'Incoloro', colorHex: '#FFFFFF', size: '50ml', stock: 12, imageIndex: 0 }
            ]
          }
        ];
        break;

      case ProductType.GENERAL:
        dictionary = `- provider (string, OBLIGATORIO): Proveedor o fabricante.
  ⚡ Proveedores registrados en la tienda: [ ${providersList} ].
- linkProductProvider (string URL, opcional): Link a la página web del proveedor.
- model (string, OBLIGATORIO): Nombre comercial (ej: "Botella Térmica de Acero 1L").
- subtitle (string, opcional): Subtítulo o variante general (ej: "Doble Pared Aislada").
- brand (string, OBLIGATORIO): Marca. Por defecto "${defaultBrand}" o marca del producto.
- category (string, OBLIGATORIO): Categoría del producto.
  ⚡ Categorías activas en la tienda: [ ${categoriesList} ].
- productType (string, OBLIGATORIO): "GeneralProduct".
- status (string, OBLIGATORIO): "draft" (modo Borrador).
- costPriceARS (number, OBLIGATORIO): Costo unitario en pesos sin IVA (ej: 16500).
- images (string[], opcional): URLs directas de fotos del producto extraídas de la web.
- shortDescription (string, opcional): Resumen breve de 1-2 líneas.
- largeDescription (string HTML, opcional): Descripción y especificaciones en HTML (<p>, <ul>, <li>).
- specifications (Array de objetos, opcional): Ficha técnica clave-valor.
- tags (string[] opcional): Array de etiquetas (ej: ["acero-inoxidable", "termica", "bazar"]).
- seo (Objeto, opcional): Meta tags para SEO y Google.
- variants (Array de objetos, opcional): Variantes por color, capacidad o pack con imageIndex:
    [
      { "colorName": "Negro Mate", "colorHex": "#1A1A1A", "size": "1 Litro", "stock": 15, "imageIndex": 0 },
      { "colorName": "Verde Oliva", "colorHex": "#556B2F", "size": "1 Litro", "stock": 10, "imageIndex": 1 }
    ]`;
        exampleData = [
          {
            provider: 'Bazar Central',
            linkProductProvider: 'https://stanley.com.ar/producto/botella-1l',
            model: 'Botella Térmica de Acero Inoxidable 1L',
            subtitle: 'Aislamiento al Vacío 24hs',
            brand: 'Stanley',
            category: 'Bazar & Hogar',
            productType: 'GeneralProduct',
            status: 'draft',
            costPriceARS: 16500,
            images: [
              'https://stanley.com.ar/uploads/botella-negro.jpg',
              'https://stanley.com.ar/uploads/botella-verde.jpg'
            ],
            shortDescription: 'Botella de doble pared aislada al vacío, mantiene frío por 24hs y calor por 12hs.',
            largeDescription: '<p>Construida en acero inoxidable 18/8 de alta durabilidad, libre de BPA con tapa hermética a rosca a prueba de fugas.</p>',
            specifications: [
              { key: 'Material', value: 'Acero Inoxidable 18/8 libre de BPA' },
              { key: 'Capacidad', value: '1 Litro' },
              { key: 'Aislamiento', value: 'Doble pared al vacío' }
            ],
            tags: ['termica', 'acero', 'botella', 'camping'],
            seo: {
              metaTitle: 'Botella Térmica de Acero Inoxidable 1L | Stanley',
              metaDescription: 'Botella de doble pared aislada al vacío, mantiene frío por 24hs y calor por 12hs.'
            },
            variants: [
              { colorName: 'Negro Mate', colorHex: '#1A1A1A', size: '1 Litro', stock: 20, imageIndex: 0 },
              { colorName: 'Verde Oliva', colorHex: '#556B2F', size: '1 Litro', stock: 15, imageIndex: 1 }
            ]
          }
        ];
        break;

      case ProductType.CLOTHING:
      default:
        dictionary = `- provider (string, OBLIGATORIO): Proveedor o fabricante de la prenda.
  ⚡ Proveedores registrados en la tienda: [ ${providersList} ].
  (Selecciona el proveedor correspondiente de esta lista exacta).
- linkProductProvider (string URL, opcional): Enlace web a la página del producto en el fabricante/proveedor.
- model (string, OBLIGATORIO): Nombre/modelo comercial de la prenda (ej: "Remera Oversize Vesper").
- subtitle (string, opcional): Subtítulo comercial breve (ej: "Colección Urbana 2026", "Cápsula Limitada").
- brand (string, OBLIGATORIO): Marca. Por defecto debe ser "${defaultBrand}".
- category (string, OBLIGATORIO): Categoría del producto.
  ⚡ Categorías activas en la tienda: [ ${categoriesList} ].
  (Prioriza usar una de estas categorías existentes. Si la prenda amerita una categoría nueva y precisa como "Parkas" o "Chalecos", puedes sugerirla).
- productType (string, OBLIGATORIO): "ClothingProduct".
- status (string, OBLIGATORIO): "draft" (modo Borrador para que el comerciante revise fotos y variantes antes de publicar).
- costPriceARS (number, OBLIGATORIO): Costo de compra mayorista al proveedor en pesos sin IVA (ej: 14500). El sistema calcula precios de venta, cuotas y transferencias automáticamente.
- images (string[], opcional): URLs directas de las fotos del producto extraídas de la web/catálogo (ej: ["https://ejemplo.com/foto1.jpg", "https://ejemplo.com/foto2.jpg"]).
- gender (string, opcional): Género. Opciones: "Hombre" | "Mujer" | "Unisex" | "Niños".
- fit (string, opcional): Calce o corte de la prenda.
  ⚡ Cortes registrados en la tienda: [ ${fitsList} ].
  (Elige prioritariamente uno de estos calces oficiales de la tienda. Si la descripción del proveedor usa sinónimos como "corte holgado", "al cuerpo" o "recto", mapealo a su equivalente oficial [ ${fitsList} ]. Si la prenda verdaderamente requiere un calce nuevo no contemplado, indícaselo claramente al usuario en tu respuesta o sugiérelo en 'fit' para que lo dé de alta en la configuración de la tienda).
- material (string, opcional): Composición general textil (ej: "100% Algodón Peinado 24/1").
- composition (Array de objetos, opcional): Detalle porcentual de materiales:
    [ { "material": "Algodón", "percentage": 100 } ]
- sizeType (string, opcional): Tipo de talle. Opciones: "Ropa" | "Calzado" | "Numérico" | "Talle Único".
- season (string, opcional): Temporada de la prenda (ej: "Verano 2026", "Otoño / Invierno 2026", "Atemporal").
- shortDescription (string, opcional): Resumen comercial breve de 1-2 líneas para la tarjeta de producto.
- largeDescription (string HTML, opcional): Descripción y ficha de estilo completa en HTML estructurado (<p>, <ul>, <li>, <strong>).
- careInstructions (string[], opcional): Lista de instrucciones de cuidado y lavado (ej: ["Lavar con agua fría a máquina", "No usar secadora", "Planchar del revés"]).
- specifications (Array de objetos, opcional): Ficha técnica con atributos y detalles en formato clave y valor:
    [
      { "key": "Cuello", "value": "Ribb redondo reforzado" },
      { "key": "Manga", "value": "Corta caída" },
      { "key": "Estampa", "value": "Serigrafía al agua de alta resistencia" }
    ]
- tags (string[] opcional): Array de etiquetas de búsqueda (ej: ["remera", "oversize", "algodon", "urbano"]).
- seo (Objeto, opcional): Meta tags para SEO y Google:
    {
      "metaTitle": "Remera Oversize Vesper | ${defaultBrand}",
      "metaDescription": "Remera oversize confeccionada en 100% algodón peinado 24/1 de máxima suavidad y calce holgado."
    }
- variants (Array de objetos, OBLIGATORIO en indumentaria): Variantes por talle y color con su índice de foto (imageIndex 0, 1, 2... correspondiente al array 'images'):
    [
      { "colorName": "Negro", "colorHex": "#000000", "size": "S", "stock": 10, "imageIndex": 0 },
      { "colorName": "Negro", "colorHex": "#000000", "size": "M", "stock": 15, "imageIndex": 0 },
      { "colorName": "Blanco", "colorHex": "#FFFFFF", "size": "S", "stock": 8, "imageIndex": 1 }
    ]
- sizeGuide (Objeto, 100% OPCIONAL): Tabla de medidas en cm SOLO si la página web del fabricante provee la tabla en texto o HTML. Si está dentro de una imagen o no existe, DEJA ESTE CAMPO COMO null O NO LO INCLUYAS:
    {
      "headers": ["Talle", "Ancho de Pecho (cm)", "Largo Total (cm)", "Hombro (cm)"],
      "rows": [
        { "size": "S", "values": ["52", "68", "44"] },
        { "size": "M", "values": ["54", "70", "46"] }
      ],
      "tolerance": "* Medidas tomadas en plano (+/- 1.5 cm)."
    }`;
        exampleData = [
          {
            provider: 'Krencia',
            linkProductProvider: 'https://krencia.com.ar/producto/remera-vesper',
            model: 'Remera Oversize Vesper',
            subtitle: 'Colección Urbana 2026',
            brand: defaultBrand,
            category: 'Remeras',
            productType: 'ClothingProduct',
            status: 'draft',
            costPriceARS: 14500,
            images: [
              'https://krencia.com.ar/wp-content/uploads/2026/remera-vesper-negro.jpg',
              'https://krencia.com.ar/wp-content/uploads/2026/remera-vesper-blanco.jpg'
            ],
            gender: 'Unisex',
            fit: 'Oversized',
            material: '100% Algodón Peinado 24/1',
            composition: [
              { material: 'Algodón', percentage: 100 }
            ],
            sizeType: 'Ropa',
            season: 'Verano 2026',
            shortDescription: 'Remera oversize confeccionada en 100% algodón peinado 24/1 de máxima suavidad.',
            largeDescription: '<p>Remera con calce holgado y cuello en ribb reforzado. Ideal para looks casuales y streetwear.</p><ul><li>Algodón premium peinado 24/1</li><li>Costuras reforzadas en cuello y hombros</li><li>Estampa en serigrafía de alta durabilidad</li></ul>',
            careInstructions: [
              'Lavar con agua fría a máquina',
              'No usar secadora',
              'Planchar del revés a temperatura media'
            ],
            specifications: [
              { key: 'Cuello', value: 'Ribb redondo reforzado' },
              { key: 'Manga', value: 'Corta caída' },
              { key: 'Estampa', value: 'Serigrafía al agua de alta resistencia' }
            ],
            tags: ['remera', 'oversize', 'algodon', 'urbano', 'vesper'],
            seo: {
              metaTitle: `Remera Oversize Vesper | ${defaultBrand}`,
              metaDescription: 'Remera oversize confeccionada en 100% algodón peinado 24/1 de máxima suavidad y calce holgado.'
            },
            variants: [
              { colorName: 'Negro', colorHex: '#000000', size: 'S', stock: 10, imageIndex: 0 },
              { colorName: 'Negro', colorHex: '#000000', size: 'M', stock: 15, imageIndex: 0 },
              { colorName: 'Negro', colorHex: '#000000', size: 'L', stock: 12, imageIndex: 0 },
              { colorName: 'Blanco', colorHex: '#FFFFFF', size: 'S', stock: 8, imageIndex: 1 },
              { colorName: 'Blanco', colorHex: '#FFFFFF', size: 'M', stock: 10, imageIndex: 1 }
            ],
            sizeGuide: {
              headers: ['Talle', 'Ancho de Pecho (cm)", "Largo Total (cm)", "Hombro (cm)'],
              rows: [
                { size: 'S', values: ['52', '68', '44'] },
                { size: 'M', values: ['54', '70', '46'] },
                { size: 'L', values: ['56', '72', '48'] },
                { size: 'XL', values: ['58', '74', '50'] },
                { size: 'XXL', values: ['60', '76', '52'] }
              ],
              tolerance: '* Medidas tomadas en plano (+/- 1.5 cm).'
            }
          }
        ];
        break;
    }

    const typeLabel = this.productTypeOptions.find((o) => o.type === pType)?.label || pType;

    const prompt = `Actúa como especialista de catálogo y e-commerce para NexoCommerce. Genera un array JSON válido con nuevos productos del rubro '${typeLabel}' siguiendo estrictamente este formato y tipos de datos:

DICCIONARIO DE TIPOS Y PROPIEDADES ACEPTADAS:
${dictionary}

${customInstruction ? `🎯 DIRECTIVA ESPECÍFICA DEL USUARIO:
"${customInstruction}"
Asegúrate de respetar prioritariamente esta indicación al generar las propiedades del JSON.\n\n` : ''}🌐 NAVEGACIÓN WEB CON IA:
Si se te proporciona una URL de linkProductProvider o link del proveedor, podés navegar a la página web para extraer la ficha técnica completa, composición/especificaciones, fotos oficiales, colores y la tabla exacta de medidas/capacidades para armar el JSON.

EJEMPLO COMPLETO QUE DEBES DEVOLVER:
\`\`\`json
${JSON.stringify(exampleData, null, 2)}
\`\`\`

${this.aiConversationalMode() ? `REGLAS DE FORMATO Y CONVERSACIÓN:
1. Puedes dialogar con el usuario, fundamentar tus elecciones, aconsejarlo o continuar la conversación con total fluidez.
2. OBLIGATORIO: Justo antes del bloque de código JSON, escribe textualmente la siguiente indicación para el usuario:
   "👉 Copiá únicamente el siguiente bloque de código JSON y pegalo en tu sistema:"
3. Entrega el array de productos dentro de un bloque de código Markdown aislado:
\`\`\`json
[ { ... } ]
\`\`\`
El usuario usará el botón de "Copiar código" de este bloque para pegarlo directamente en el panel de control.
4. Asegúrate de que todos los valores numéricos sean números reales (sin símbolos $ ni comas).
5. Por defecto, asigna 'status: "draft"' a cada producto.` : `REGLAS CRÍTICAS:
1. Responde ÚNICAMENTE con el bloque JSON (un array de objetos [ { ... } ]). No agregues texto introductorio ni explicaciones fuera del JSON.
2. Todos los valores numéricos deben ser números reales (sin símbolos $ ni comas).
3. Por defecto, asigna 'status: "draft"' a cada producto para que se cree como borrador seguro.`}`;

    try {
      await navigator.clipboard.writeText(prompt);
      this.aiPromptCopied.set(true);
      setTimeout(() => this.aiPromptCopied.set(false), 4000);
      this.#snackBar.open(`📋 ¡Prompt de creación para '${typeLabel}' copiado!`, 'Genial', { duration: 3000 });
    } catch {
      this.#snackBar.open('Error al copiar al portapapeles.', 'Cerrar', { duration: 3000 });
    }
  }

  async copyAiUpdatePrompt() {
    const selectedIds = this.selectedProducts();
    const allProducts = this.ProductState.products().data || [];
    const productsToExport = allProducts.filter((p) => selectedIds.includes(p._id));

    if (productsToExport.length === 0) {
      this.#snackBar.open('Selecciona al menos un producto para actualizar.', 'Cerrar', { duration: 3000 });
      return;
    }

    const scopeKeys = this.selectedScopeProperties();
    if (scopeKeys.length === 0) {
      this.#snackBar.open('Selecciona al menos una propiedad para modificar.', 'Cerrar', { duration: 3000 });
      return;
    }

    const hasVariantScope = scopeKeys.some((k) => k.startsWith('variants'));

    // Build only relevant product data
    const compactProducts = productsToExport.map((p) => {
      const item: any = {
        _id: p._id,
        model: p.model,
        category: p.category,
        brand: p.brand,
        productType: p.productType || 'ClothingProduct'
      };

      if (p.linkProductProvider) {
        item.linkProductProvider = p.linkProductProvider;
      }

      if (scopeKeys.includes('model') && p.model) {
        item.currentModel = p.model;
      }

      if (scopeKeys.includes('subtitle') && p.subtitle) {
        item.currentSubtitle = p.subtitle;
      }

      if (scopeKeys.includes('costPriceARS')) {
        item.currentCostPriceARS = (p.finance?.providerCost?.inARS || (p.price as any)?.costPrice?.inARS || 0);
      }

      if (hasVariantScope) {
        item.currentVariants = (p.variants || []).map((v: any) => ({
          colorName: v.colorName || 'Único',
          colorHex: v.colorHex || '#000000',
          size: v.size || 'Único',
          stock: v.stock || 0
        }));
      }

      if (scopeKeys.includes('shortDescription') && p.shortDescription) {
        item.currentShortDescription = p.shortDescription;
      }

      if (scopeKeys.includes('largeDescription') && p.largeDescription) {
        item.currentLargeDescription = p.largeDescription;
      }

      if (scopeKeys.includes('tags') && p.tags && p.tags.length > 0) {
        item.currentTags = p.tags;
      }

      if (scopeKeys.includes('specifications') && p.specifications && p.specifications.length > 0) {
        item.currentSpecifications = p.specifications;
      }

      if (scopeKeys.includes('seo') && p.seo) {
        item.currentSeo = {
          metaTitle: p.seo.metaTitle || '',
          metaDescription: p.seo.metaDescription || ''
        };
      }

      // Clothing fields
      if (scopeKeys.includes('material') && (p as any).material) {
        item.currentMaterial = (p as any).material;
      }

      if (scopeKeys.includes('composition') && (p as any).composition && (p as any).composition.length > 0) {
        item.currentComposition = (p as any).composition;
      }

      if (scopeKeys.includes('fit') && (p as any).fit) {
        item.currentFit = (p as any).fit;
      }

      if (scopeKeys.includes('gender') && (p as any).gender) {
        item.currentGender = (p as any).gender;
      }

      if (scopeKeys.includes('sizeType') && (p as any).sizeType) {
        item.currentSizeType = (p as any).sizeType;
      }

      if (scopeKeys.includes('season') && (p as any).season) {
        item.currentSeason = (p as any).season;
      }

      if (scopeKeys.includes('careInstructions') && (p as any).careInstructions && (p as any).careInstructions.length > 0) {
        item.currentCareInstructions = (p as any).careInstructions;
      }

      if (scopeKeys.includes('sizeGuide') && (p as any).sizeGuide) {
        item.currentSizeGuide = (p as any).sizeGuide;
      }

      // Tech fields
      if (scopeKeys.includes('processor') && (p as any).processor) {
        item.currentProcessor = (p as any).processor;
      }
      if (scopeKeys.includes('ram') && (p as any).ram) {
        item.currentRam = (p as any).ram;
      }
      if (scopeKeys.includes('storage') && (p as any).storage) {
        item.currentStorage = (p as any).storage;
      }
      if (scopeKeys.includes('screenSize') && (p as any).screenSize) {
        item.currentScreenSize = (p as any).screenSize;
      }
      if (scopeKeys.includes('os') && (p as any).os) {
        item.currentOs = (p as any).os;
      }
      if (scopeKeys.includes('connectivity') && (p as any).connectivity) {
        item.currentConnectivity = (p as any).connectivity;
      }

      // Beauty fields
      if (scopeKeys.includes('volume') && (p as any).volume) {
        item.currentVolume = (p as any).volume;
      }
      if (scopeKeys.includes('concentration') && (p as any).concentration) {
        item.currentConcentration = (p as any).concentration;
      }
      if (scopeKeys.includes('fragranceFamily') && (p as any).fragranceFamily) {
        item.currentFragranceFamily = (p as any).fragranceFamily;
      }
      if (scopeKeys.includes('applicationArea') && (p as any).applicationArea) {
        item.currentApplicationArea = (p as any).applicationArea;
      }

      // General fields
      if (scopeKeys.includes('barcode') && (p as any).barcode) {
        item.currentBarcode = (p as any).barcode;
      }
      if (scopeKeys.includes('weight') && (p as any).weight) {
        item.currentWeight = (p as any).weight;
      }
      if (scopeKeys.includes('unit') && (p as any).unit) {
        item.currentUnit = (p as any).unit;
      }

      return item;
    });

    const config = this.#StoreConfigState.StoreConfig().config;
    const defaultBrand = config?.brands?.[0] || 'Vura';
    const fitsList = this.storeClothingFits().join(', ');
    const activeProps = this.availableScopeProperties.filter((p) => scopeKeys.includes(p.key));
    const dictionaryLines = activeProps.map((p) => `- ${p.payloadKey} (${p.type}, OBLIGATORIO): [Objetivo: ${p.label}] ${p.explanation}`).join('\n');
    const exampleObj: any = { _id: productsToExport[0]?._id || '66ce301f92a1...' };
    activeProps.forEach((p) => {
      exampleObj[p.payloadKey] = p.example;
    });

    const hasAnyLink = compactProducts.some((p) => p.linkProductProvider);
    const customInstruction = this.aiCustomInstruction().trim();
    const typeSummary = this.selectedProductsTypesSummary();

    const prompt = `Actúa como especialista de catálogo y e-commerce para NexoCommerce. Necesito actualizar EXCLUSIVAMENTE las siguientes propiedades de estos ${compactProducts.length} productos (${typeSummary.breakdown}): [${activeProps.map((p) => p.label).join(', ')}].

LISTA ACTUAL DE PRODUCTOS CON SUS IDs, TIPOS Y DATOS EXISTENTES:
\`\`\`json
${JSON.stringify(compactProducts, null, 2)}
\`\`\`

DICCIONARIO DE PROPIEDADES QUE DEBES DEVOLVER EN CADA PRODUCTO:
- _id (string, OBLIGATORIO): Mantén el _id original del producto para identificarlo en la base de datos.
${dictionaryLines}

🎯 VOCABULARIO Y REGLAS OFICIALES DE LA TIENDA:
- Marca Principal: "${defaultBrand}"
- Cortes / Fits Registrados: [ ${fitsList} ]
  ⚠️ REGLA DE FITS: Si actualizas el campo 'fit', debes priorizar estrictamente estos cortes oficiales. Si la prenda requiere un calce nuevo no contemplado, indícaselo claramente al usuario.
- Géneros Estándar: [ "Hombre", "Mujer", "Unisex", "Niños" ]
- Tipos de Talles (sizeType): [ "Ropa" (S..XXL), "Calzado" (35..45), "Numérico" (38..52), "Talle Único" ]
- Temporadas (season): Ejemplos: "Primavera / Verano 2026", "Otoño / Invierno", "Atemporal".
- Diferenciación 'material' vs 'composition':
  * 'material' (string): Nombre de la tela o tejido principal (ej: "Algodón peinado 24/1", "Denim 12oz").
  * 'composition' (array de { material, percentage }): Desglose técnico de porcentajes (ej: [ { "material": "Algodón", "percentage": 100 } ] o [ { "material": "Algodón", "percentage": 95 }, { "material": "Elastano", "percentage": 5 } ]).
- SEO: 'seo' debe ser un objeto { "metaTitle": "Título vendedor máx 60 caracteres", "metaDescription": "Resumen atractivo de hasta 150 caracteres para Google" }.
- Ficha Técnica ('specifications'): Array de pares clave-valor [ { "key": "...", "value": "..." } ].

🎯 ADAPTACIÓN SEGÚN EL 'productType' DE CADA PRODUCTO:
- Si el lote contiene productos de distintos rubros, respeta la naturaleza de cada uno:
  * Para ClothingProduct (Indumentaria): Talles de ropa o calzado, colores con HEX, calce (fit), material, composición textil, temporada y guía de medidas.
  * Para TechProduct (Tecnología): Capacidades en variantes, ficha técnica en 'specifications', processor, ram, storage, screenSize, os, connectivity.
  * Para BeautyProduct (Belleza): Volúmenes (30ml, 50ml, etc.) o tonos en variantes, volume, concentration, fragranceFamily, applicationArea.
  * Para GeneralProduct (General/Bazar): Código de barras (barcode), peso (weight), unidad de medida (unit) y variantes libres.

EJEMPLO DEL FORMATO EXACTO QUE DEBES GENERAR:
\`\`\`json
[
${JSON.stringify(exampleObj, null, 2)}
]
\`\`\`

${customInstruction ? `🎯 DIRECTIVA ESPECÍFICA DEL USUARIO:
"${customInstruction}"
Asegúrate de respetar prioritariamente esta indicación al generar las variantes y valores del JSON.\n\n` : ''}${hasAnyLink ? `🌐 NAVEGACIÓN WEB CON IA:
Si los productos tienen 'linkProductProvider' con una URL válida, puedes acceder y navegar por dicha página web para extraer la información oficial de la prenda/producto, su composición, tabla de medidas y fotos de alta resolución para volcarlas en las propiedades correspondientes.\n\n` : ''}${this.aiConversationalMode() ? `REGLAS DE FORMATO Y CONVERSACIÓN:
1. Puedes responder amablemente, fundamentar los cambios, sugerir mejoras o continuar la conversación con el usuario con total fluidez.
2. OBLIGATORIO: Justo antes del bloque de código JSON, escribe textualmente la siguiente indicación para el usuario:
   "👉 Copiá únicamente el siguiente bloque de código JSON y pegalo en tu sistema:"
3. Entrega el array de productos modificados dentro de un bloque de código Markdown aislado:
\`\`\`json
[ { ... } ]
\`\`\`
El usuario tocará el botón de "Copiar código" de este bloque para pegarlo directamente en su panel de administración.
4. Modifica e incluye EXCLUSIVAMENTE el '_id' y las propiedades solicitadas dentro del JSON. NO inventes ni agregues otras propiedades que no fueron solicitadas.
5. Asegúrate de que todos los valores numéricos sean números reales (sin símbolos $ ni comas).` : `REGLAS CRÍTICAS DE SEGURIDAD:
1. Tu respuesta debe ser ÚNICAMENTE el bloque JSON (un array de objetos [ { ... } ]). Sin texto de saludo ni explicaciones.
2. Modifica e incluye EXCLUSIVAMENTE el '_id' y las propiedades solicitadas. NO inventes ni agregues otras propiedades que no fueron solicitadas.
3. Asegúrate de que todos los valores numéricos sean números reales (sin símbolos $ ni comas).`}`;

    try {
      await navigator.clipboard.writeText(prompt);
      this.aiPromptCopied.set(true);
      setTimeout(() => this.aiPromptCopied.set(false), 4000);
      this.#snackBar.open(`📋 ¡Prompt quirúrgico (${activeProps.length} objetivos) copiado!`, 'Genial', { duration: 3500 });
    } catch {
      this.#snackBar.open('Error al copiar al portapapeles.', 'Cerrar', { duration: 3000 });
    }
  }

  parseAiInput() {
    this.aiParseError.set(null);
    let raw = this.aiRawInput().trim();
    if (!raw) {
      this.aiParseError.set('Por favor pega el JSON devuelto por la IA.');
      return;
    }

    // Quitar bloque de código markdown si el usuario copió con ```json ... ```
    raw = raw.replace(/^```(json)?/i, '').replace(/```$/i, '').trim();

    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        this.aiParseError.set('El contenido ingresado no es válido. Debe ser un array JSON [ { ... } ]. Asegúrate de copiar únicamente el bloque de código JSON sin texto de conversación.');
        return;
      }

      if (parsed.length === 0) {
        this.aiParseError.set('El array JSON no contiene ningún producto.');
        return;
      }

      // Helper to normalize specifications
      const normalizeSpecs = (input: any): Array<{ key: string; value: string }> => {
        if (Array.isArray(input)) {
          return input
            .map((s: any) => ({
              key: String(s.key || s.nombre || s.name || '').trim(),
              value: String(s.value || s.valor || '').trim()
            }))
            .filter((s: any) => s.key && s.value);
        } else if (typeof input === 'object' && input !== null) {
          return Object.entries(input)
            .map(([k, v]) => ({ key: String(k).trim(), value: String(v).trim() }))
            .filter((s: any) => s.key && s.value);
        } else if (typeof input === 'string' && input.trim()) {
          return input.split(/[,;\n]+/).map((part: string) => {
            const [k, ...v] = part.split(/[:=]/);
            return { key: (k || '').trim(), value: (v.join(':') || '').trim() };
          }).filter((s: any) => s.key && s.value);
        }
        return [];
      };

      // Helper to normalize composition
      const normalizeComposition = (input: any): Array<{ material: string; percentage: number }> => {
        if (Array.isArray(input)) {
          return input
            .map((c: any) => ({
              material: String(c.material || '').trim(),
              percentage: Number(c.percentage || 0)
            }))
            .filter((c: any) => c.material && !isNaN(c.percentage));
        } else if (typeof input === 'string' && input.trim()) {
          const parts = input.split(/[,;\n/]+/);
          const list: Array<{ material: string; percentage: number }> = [];
          for (const part of parts) {
            const m1 = part.match(/(\d+(?:\.\d+)?)\s*%\s*(.*)/);
            const m2 = part.match(/(.*?)\s*(\d+(?:\.\d+)?)\s*%/);
            if (m1 && m1[2].trim()) {
              list.push({ percentage: Number(m1[1]), material: m1[2].trim() });
            } else if (m2 && m2[1].trim()) {
              list.push({ percentage: Number(m2[2]), material: m2[1].trim() });
            }
          }
          return list;
        }
        return [];
      };

      // Helper to normalize tags
      const normalizeTags = (input: any): string[] => {
        if (Array.isArray(input)) {
          return input.map((t: any) => String(t).trim()).filter(Boolean);
        } else if (typeof input === 'string' && input.trim()) {
          return input.split(/[,;\n]+/).map((t: string) => t.trim()).filter(Boolean);
        }
        return [];
      };

      // Helper to normalize string arrays
      const normalizeStringArray = (input: any): string[] => {
        if (Array.isArray(input)) {
          return input.map((ci: any) => String(ci).trim()).filter(Boolean);
        } else if (typeof input === 'string' && input.trim()) {
          return input.split(/[,;\n]+/).map((ci: string) => ci.trim()).filter(Boolean);
        }
        return [];
      };

      if (this.aiBulkMode() === 'create') {
        const storeCategories = (this.Categories() || []).map((c: string) => c.toLowerCase().trim());
        const config = this.#StoreConfigState.StoreConfig().config;
        const defaultBrand = config?.brands?.[0] || 'Vura';

        const validated = parsed.map((item: any, idx: number) => {
          if (!item.model || !item.category) {
            throw new Error(`Ítem #${idx + 1} no tiene modelo o categoría.`);
          }

          const cat = String(item.category).trim();
          const isNewCategory = storeCategories.length > 0 && !storeCategories.includes(cat.toLowerCase());

          const specifications = normalizeSpecs(item.specifications);
          const tags = normalizeTags(item.tags);
          const composition = normalizeComposition(item.composition);
          const careInstructions = normalizeStringArray(item.careInstructions);

          let images: string[] = [];
          if (Array.isArray(item.images)) {
            images = item.images.map((img: any) => typeof img === 'string' ? img.trim() : (img?.url || '')).filter(Boolean);
          }

          const brand = item.brand ? String(item.brand).trim() : defaultBrand;
          const metaTitle = item.seo?.metaTitle || item.metaTitle || `${item.model} | ${brand}`;
          const metaDescription = item.seo?.metaDescription || item.metaDescription || item.shortDescription || '';

          const knownFits = this.storeClothingFits();
          let rawFit = item.fit ? String(item.fit).trim() : '';
          let normalizedFit = rawFit;
          if (rawFit) {
            const matched = knownFits.find(
              (kf: string) => kf.toLowerCase() === rawFit.toLowerCase() ||
                      kf.toLowerCase().replace(/[-_\s]/g, '') === rawFit.toLowerCase().replace(/[-_\s]/g, '')
            );
            if (matched) normalizedFit = matched;
          }

          return {
            provider: item.provider ? String(item.provider).trim() : '',
            linkProductProvider: item.linkProductProvider ? String(item.linkProductProvider).trim() : '',
            model: String(item.model).trim(),
            brand,
            category: cat,
            isNewCategory,
            subtitle: item.subtitle ? String(item.subtitle).trim() : '',
            season: item.season ? String(item.season).trim() : '',
            sizeType: item.sizeType || 'Ropa',
            productType: item.productType || 'ClothingProduct',
            costPriceARS: Number(item.costPriceARS || item.price || item.providerCost || 0),
            shortDescription: item.shortDescription || '',
            largeDescription: item.largeDescription || item.description || '',
            gender: item.gender || 'Unisex',
            material: item.material || '',
            composition,
            careInstructions,
            fit: normalizedFit,
            specifications,
            tags,
            seo: { metaTitle, metaDescription },
            variants: Array.isArray(item.variants) ? item.variants : [],
            sizeGuide: item.sizeGuide && typeof item.sizeGuide === 'object' && Array.isArray(item.sizeGuide.headers) && item.sizeGuide.headers.length > 0 ? item.sizeGuide : null,
            images,
            status: item.status || 'draft',
            // Discriminators
            processor: item.processor ? String(item.processor).trim() : undefined,
            ram: item.ram ? String(item.ram).trim() : undefined,
            storage: normalizeStringArray(item.storage),
            screenSize: item.screenSize ? String(item.screenSize).trim() : undefined,
            os: item.os ? String(item.os).trim() : undefined,
            connectivity: normalizeStringArray(item.connectivity),
            volume: item.volume ? String(item.volume).trim() : undefined,
            concentration: item.concentration ? String(item.concentration).trim() : undefined,
            fragranceFamily: item.fragranceFamily ? String(item.fragranceFamily).trim() : undefined,
            applicationArea: item.applicationArea ? String(item.applicationArea).trim() : undefined,
            barcode: item.barcode ? String(item.barcode).trim() : undefined,
            weight: item.weight ? String(item.weight).trim() : undefined,
            unit: item.unit ? String(item.unit).trim() : undefined,
            isSoldByWeight: item.isSoldByWeight !== undefined ? Boolean(item.isSoldByWeight) : undefined
          };
        });

        this.aiParsedCreateItems.set(validated);
        this.aiParsedUpdateItems.set([]);
        this.aiParsedUpdateDiffs.set([]);
      } else {
        // Update mode with granular diffing
        const allProducts = this.ProductState.products().data || [];
        const knownFits = this.storeClothingFits();
        const diffs: any[] = [];

        const validated = parsed.map((item: any, idx: number) => {
          if (!item._id) {
            throw new Error(`Ítem #${idx + 1} (${item.model || 'sin nombre'}) no tiene la propiedad _id.`);
          }

          const orig = allProducts.find((p: any) => p._id === item._id);
          const changes: Array<{ label: string; text: string; icon: string }> = [];

          // 1. Costo
          if (item.costPriceARS !== undefined) {
            const oldCost = orig?.finance?.providerCost?.inARS || (orig?.price as any)?.costPrice?.inARS || 0;
            changes.push({
              label: 'Costo',
              text: `$${Number(item.costPriceARS).toLocaleString('es-AR')} (Antes: $${Number(oldCost).toLocaleString('es-AR')})`,
              icon: 'payments'
            });
            item.costPriceARS = Number(item.costPriceARS);
          }

          // 2. Variantes
          if (Array.isArray(item.variants) && item.variants.length > 0) {
            const sizesList = item.variants.map((v: any) => `${v.size || 'Único'} (x${v.stock ?? 0})`).join(', ');
            changes.push({
              label: 'Variantes',
              text: `${item.variants.length} variantes [${sizesList}]`,
              icon: 'straighten'
            });
          }

          // 3. Guía de medidas
          if (item.sizeGuide) {
            const rowCount = item.sizeGuide.rows?.length || 0;
            changes.push({
              label: 'Guía Medidas',
              text: `Tabla con ${rowCount} talles configurados`,
              icon: 'table_chart'
            });
          }

          // 4. Descripciones
          if (item.shortDescription) {
            changes.push({
              label: 'Desc. Corta',
              text: item.shortDescription.length > 35 ? item.shortDescription.slice(0, 35) + '...' : item.shortDescription,
              icon: 'description'
            });
          }
          if (item.largeDescription) {
            changes.push({
              label: 'Desc. HTML',
              text: 'Ficha detallada enriquecida',
              icon: 'article'
            });
          }

          // 5. Tela / Material
          if (item.material) {
            changes.push({
              label: 'Tela / Material',
              text: String(item.material).trim(),
              icon: 'checkroom'
            });
            item.material = String(item.material).trim();
          }

          // 6. Composición textil
          if (item.composition !== undefined) {
            const compList = normalizeComposition(item.composition);
            item.composition = compList;
            if (compList.length > 0) {
              const compText = compList.map((c) => `${c.percentage}% ${c.material}`).join(', ');
              changes.push({
                label: 'Composición',
                text: compText,
                icon: 'science'
              });
            }
          }

          // 7. Calce / Fit
          if (item.fit !== undefined) {
            const rawFit = String(item.fit).trim();
            const matched = knownFits.find(
              (kf: string) => kf.toLowerCase() === rawFit.toLowerCase() ||
                      kf.toLowerCase().replace(/[-_\s]/g, '') === rawFit.toLowerCase().replace(/[-_\s]/g, '')
            );
            const normalizedFit = matched || rawFit;
            const isNew = !matched && !!rawFit;
            item.fit = normalizedFit;
            changes.push({
              label: 'Calce / Fit',
              text: isNew ? `${normalizedFit} (✨ Nuevo Calce)` : normalizedFit,
              icon: 'style'
            });
          }

          // 8. Tipo de Talle
          if (item.sizeType) {
            changes.push({
              label: 'Tipo Talle',
              text: String(item.sizeType).trim(),
              icon: 'straighten'
            });
            item.sizeType = String(item.sizeType).trim();
          }

          // 9. Temporada
          if (item.season) {
            changes.push({
              label: 'Temporada',
              text: String(item.season).trim(),
              icon: 'wb_sunny'
            });
            item.season = String(item.season).trim();
          }

          // 10. Género
          if (item.gender) {
            changes.push({
              label: 'Género',
              text: item.gender,
              icon: 'wc'
            });
          }

          // 11. Cuidados
          if (item.careInstructions !== undefined) {
            const careArr = normalizeStringArray(item.careInstructions);
            item.careInstructions = careArr;
            if (careArr.length > 0) {
              changes.push({
                label: 'Cuidados',
                text: `${careArr.length} instrucciones`,
                icon: 'local_laundry_service'
              });
            }
          }

          // 12. Especificaciones / Ficha Técnica
          if (item.specifications !== undefined) {
            const specs = normalizeSpecs(item.specifications);
            item.specifications = specs;
            if (specs.length > 0) {
              changes.push({
                label: 'Ficha Técnica',
                text: `${specs.length} atributos (${specs.map(s => s.key).slice(0, 2).join(', ')}${specs.length > 2 ? '...' : ''})`,
                icon: 'tune'
              });
            }
          }

          // 13. Tags
          if (item.tags !== undefined) {
            const tagsArr = normalizeTags(item.tags);
            item.tags = tagsArr;
            if (tagsArr.length > 0) {
              changes.push({
                label: 'Tags',
                text: tagsArr.join(', '),
                icon: 'label'
              });
            }
          }

          // 14. SEO
          if (item.seo || item.seoTitle || item.seoMetaTitle || item.seoDescription || item.seoMetaDescription) {
            const metaTitle = item.seo?.metaTitle || item.seoTitle || item.seoMetaTitle || '';
            const metaDescription = item.seo?.metaDescription || item.seoDescription || item.seoMetaDescription || '';
            item.seo = {
              ...(item.seo || {}),
              ...(metaTitle ? { metaTitle: String(metaTitle).trim() } : {}),
              ...(metaDescription ? { metaDescription: String(metaDescription).trim() } : {})
            };
            changes.push({
              label: 'SEO',
              text: metaTitle ? `"${metaTitle}"` : 'Meta tags configurados',
              icon: 'travel_explore'
            });
          }

          // 15. Subtítulo
          if (item.subtitle !== undefined) {
            changes.push({
              label: 'Subtítulo',
              text: item.subtitle ? String(item.subtitle) : '(vacío)',
              icon: 'subtitles'
            });
            item.subtitle = item.subtitle ? String(item.subtitle).trim() : '';
          }

          // 16. Modelo / Nombre
          if (item.model && orig && item.model !== orig.model) {
            changes.push({
              label: 'Nombre',
              text: `${item.model} (Antes: ${orig.model})`,
              icon: 'edit'
            });
          }

          // 17. Tech discriminators
          if (item.processor) changes.push({ label: 'CPU', text: item.processor, icon: 'memory' });
          if (item.ram) changes.push({ label: 'RAM', text: item.ram, icon: 'storage' });
          if (item.screenSize) changes.push({ label: 'Pantalla', text: item.screenSize, icon: 'tv' });
          if (item.storage) changes.push({ label: 'Storage', text: Array.isArray(item.storage) ? item.storage.join(', ') : item.storage, icon: 'save' });
          if (item.os) changes.push({ label: 'OS', text: item.os, icon: 'settings' });
          if (item.connectivity) changes.push({ label: 'Conectividad', text: Array.isArray(item.connectivity) ? item.connectivity.join(', ') : item.connectivity, icon: 'wifi' });

          // 18. Beauty discriminators
          if (item.volume) changes.push({ label: 'Volumen', text: item.volume, icon: 'water_drop' });
          if (item.concentration) changes.push({ label: 'Concentración', text: item.concentration, icon: 'diamond' });
          if (item.fragranceFamily) changes.push({ label: 'Familia Olfativa', text: item.fragranceFamily, icon: 'filter_vintage' });
          if (item.applicationArea) changes.push({ label: 'Área', text: item.applicationArea, icon: 'face' });

          // 19. General discriminators
          if (item.barcode) changes.push({ label: 'Código Barras', text: item.barcode, icon: 'qr_code' });
          if (item.weight) changes.push({ label: 'Peso', text: item.weight, icon: 'scale' });
          if (item.unit) changes.push({ label: 'Unidad', text: item.unit, icon: 'inventory_2' });

          diffs.push({
            _id: item._id,
            model: orig?.model || item.model || item._id,
            category: orig?.category || item.category || '',
            brand: orig?.brand || item.brand || '',
            imageUrl: orig?.images?.[0]?.url || '/no-image.jpg',
            changes: changes.length > 0 ? changes : [{ label: 'Modificación', text: 'Propiedades actualizadas', icon: 'check' }],
            raw: item
          });

          return item;
        });

        this.aiParsedUpdateDiffs.set(diffs);
        this.aiParsedUpdateItems.set(validated);
        this.aiParsedCreateItems.set([]);
      }
    } catch (err: any) {
      const isSyntax = err instanceof SyntaxError || (err.message && err.message.toLowerCase().includes('json'));
      this.aiParseError.set(
        isSyntax
          ? 'Formato no válido. Asegúrate de copiar y pegar ÚNICAMENTE el bloque de código JSON devuelto por la IA (usando el botón "Copiar código" en ChatGPT o Gemini) sin incluir saludos ni texto de la conversación.'
          : (err.message || 'JSON no válido. Verifica el contenido devuelto por la IA.')
      );
    }
  }

  async executeAiBulkCreate() {
    const items = this.aiParsedCreateItems();
    if (items.length === 0) return;

    this.aiProcessing.set(true);
    try {
      const res: any = await this.ProductState.bulkCreateProducts(items);
      this.closeAiBulkModal();
      if (res && res.errors && res.errors.length > 0) {
        if (res.createdCount > 0) {
          this.#snackBar.open(`⚠️ Se crearon ${res.createdCount} de ${items.length} productos (${res.errors.length} con error).`, 'Cerrar', { duration: 5000 });
        } else {
          this.#snackBar.open(`❌ No se pudieron crear los productos: ${res.errors[0]?.error || 'Error desconocido'}`, 'Cerrar', { duration: 5000 });
        }
      } else {
        const count = res?.createdCount ?? items.length;
        this.#snackBar.open(`🎉 ¡${count} productos creados exitosamente!`, 'Cerrar', { duration: 4000 });
      }
    } catch (err: any) {
      this.#snackBar.open(err?.error?.message || err?.message || 'Error al crear productos en lote.', 'Cerrar', { duration: 4000 });
    } finally {
      this.aiProcessing.set(false);
    }
  }

  async executeAiBulkUpdate() {
    const items = this.aiParsedUpdateItems();
    if (items.length === 0) return;

    this.aiProcessing.set(true);
    try {
      const res: any = await this.ProductState.bulkUpdateProducts(items);
      this.clearSelection();
      this.closeAiBulkModal();
      if (res && res.errors && res.errors.length > 0) {
        if (res.updatedCount > 0) {
          this.#snackBar.open(`⚠️ Se actualizaron ${res.updatedCount} de ${items.length} productos (${res.errors.length} con error).`, 'Cerrar', { duration: 5000 });
        } else {
          this.#snackBar.open(`❌ No se pudieron actualizar los productos: ${res.errors[0]?.error || 'Error desconocido'}`, 'Cerrar', { duration: 5000 });
        }
      } else {
        const count = res?.updatedCount ?? items.length;
        this.#snackBar.open(`🎉 ¡${count} productos actualizados exitosamente!`, 'Cerrar', { duration: 4000 });
      }
    } catch (err: any) {
      this.#snackBar.open(err?.error?.message || err?.message || 'Error al actualizar productos en lote.', 'Cerrar', { duration: 4000 });
    } finally {
      this.aiProcessing.set(false);
    }
  }
}
