import { CurrencyPipe, NgClass } from '@angular/common';
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
    if (this.ProductState.currentIsFeaturedFilter() !== undefined) count++;
    if (this.ProductState.currentSortBy() && this.ProductState.currentSortBy() !== 'newest') count++;
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
      const config = this.#StoreConfigState.StoreConfig().config;
      const activeFilters: string[] = [];
      if (this.ProductState.currentSearchQuery()) activeFilters.push(`Búsqueda: "${this.ProductState.currentSearchQuery()}"`);
      if (this.ProductState.currentCategoryFilter()) activeFilters.push(`Categoría: "${this.ProductState.currentCategoryFilter()}"`);
      if (this.ProductState.currentProviderFilter()) activeFilters.push(`Proveedor: "${this.getProviderName(this.ProductState.currentProviderFilter())}"`);
      if (this.ProductState.currentStatusFilter()) activeFilters.push(`Estado: ${this.ProductState.currentStatusFilter() === 'true' ? 'Activos' : 'Inactivos'}`);
      if (this.ProductState.currentHasSeoImageFilter() !== undefined) activeFilters.push(`Imagen SEO: ${this.ProductState.currentHasSeoImageFilter() ? 'Con Foto' : 'Sin Foto'}`);
      if (this.ProductState.currentHasSizeGuideFilter() !== undefined) activeFilters.push(`Guía Talles: ${this.ProductState.currentHasSizeGuideFilter() ? 'Con Guía' : 'Sin Guía'}`);
      if (this.ProductState.currentHasLinkProviderFilter() !== undefined) activeFilters.push(`Link Proveedor: ${this.ProductState.currentHasLinkProviderFilter() ? 'Con Link' : 'Sin Link'}`);

      // Métricas acumuladas del lote
      let totalUnits = 0;
      let totalRetailValue = 0;
      let totalCostValue = 0;
      let totalTransferProfit = 0;
      let activeCount = 0;

      products.forEach((p) => {
        const stock = this.getTotalStock(p);
        totalUnits += stock;
        if (p.isActive) activeCount++;
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
      content += `• Productos Activos: ${activeCount} | Inactivos/Pausados: ${products.length - activeCount}\n`;
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
        content += `- Estado: ${p.isActive ? '🟢 ACTIVO (Visible en tienda)' : '🔴 INACTIVO (Pausado)'}\n`;
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

  // Propiedades seleccionables para alcance de actualización
  availableScopeProperties = [
    {
      key: 'variants_matrix',
      payloadKey: 'variants',
      label: '🧩 Matriz Completa (Talles + Colores + Stock)',
      type: 'Array<{ colorName, colorHex, size, stock }>',
      explanation: 'Reconstruir todas las combinaciones con colores reales (#HEX), talles y stock (ideal para relevar desde la web del proveedor).',
      example: [
        { colorName: 'Negro', colorHex: '#000000', size: 'S', stock: 10 },
        { colorName: 'Negro', colorHex: '#000000', size: 'M', stock: 15 },
        { colorName: 'Negro', colorHex: '#000000', size: 'L', stock: 12 },
        { colorName: 'Blanco', colorHex: '#FFFFFF', size: 'S', stock: 8 }
      ]
    },
    {
      key: 'variants_stock',
      payloadKey: 'variants',
      label: '📦 Solo Stock (Mantener Talles y Colores)',
      type: 'Array<{ colorName, colorHex, size, stock }>',
      explanation: 'Mantener las combinaciones actuales de color y talle de cada prenda, modificando ÚNICAMENTE las cantidades de stock.',
      example: [
        { colorName: 'Negro', colorHex: '#000000', size: 'S', stock: 12 },
        { colorName: 'Negro', colorHex: '#000000', size: 'M', stock: 20 }
      ]
    },
    {
      key: 'variants_colors',
      payloadKey: 'variants',
      label: '🎨 Solo Colores y Códigos HEX',
      type: 'Array<{ colorName, colorHex, size, stock }>',
      explanation: 'Reemplazar "Único" o colores genéricos por los nombres y códigos HEX reales de la prenda (ej: Verde Militar #4B5320, Beige #F5F5DC).',
      example: [
        { colorName: 'Verde Militar', colorHex: '#4B5320', size: 'S', stock: 10 },
        { colorName: 'Crudo', colorHex: '#F5F5DC', size: 'M', stock: 15 }
      ]
    },
    {
      key: 'variants_sizes',
      payloadKey: 'variants',
      label: '📏 Curva de Talles',
      type: 'Array<{ colorName, colorHex, size, stock }>',
      explanation: 'Normalizar o definir la curva de talles disponibles (ej: S, M, L, XL, XXL o 38, 40, 42, 44).',
      example: [
        { colorName: 'Negro', colorHex: '#000000', size: 'S', stock: 10 },
        { colorName: 'Negro', colorHex: '#000000', size: 'M', stock: 10 },
        { colorName: 'Negro', colorHex: '#000000', size: 'L', stock: 10 },
        { colorName: 'Negro', colorHex: '#000000', size: 'XL', stock: 10 }
      ]
    },
    {
      key: 'costPriceARS',
      payloadKey: 'costPriceARS',
      label: '💵 Costo Proveedor ($ ARS)',
      type: 'number',
      explanation: 'Costo de compra al proveedor en pesos sin IVA (ej: 14500). El sistema calcula precios de venta y cuotas automáticamente.',
      example: 14500
    },
    {
      key: 'sizeGuide',
      payloadKey: 'sizeGuide',
      label: '📐 Guía de Medidas (Tabla)',
      type: 'Object { headers, rows, tolerance }',
      explanation: 'Tabla de medidas en cm por talle.',
      example: {
        headers: ['Talle', 'Ancho de Pecho (cm)', 'Largo (cm)'],
        rows: [{ size: 'S', values: ['52', '68'] }, { size: 'M', values: ['54', '70'] }],
        tolerance: '* Medidas tomadas en plano (+/- 1 cm).'
      }
    },
    {
      key: 'shortDescription',
      payloadKey: 'shortDescription',
      label: '📝 Descripción Corta',
      type: 'string',
      explanation: 'Resumen vendedor de 1-2 líneas para la tarjeta de producto.',
      example: 'Remera oversize 100% algodón peinado 24/1.'
    },
    {
      key: 'largeDescription',
      payloadKey: 'largeDescription',
      label: '📄 Descripción Detallada (HTML)',
      type: 'string HTML',
      explanation: 'Descripción estructurada en HTML limpio (<p>, <ul>, <li>).',
      example: '<p>Remera con calce holgado y costuras reforzadas.</p>'
    },
    {
      key: 'material',
      payloadKey: 'material',
      label: '🧵 Composición / Tela',
      type: 'string',
      explanation: 'Composición de la tela o material principal.',
      example: '100% Algodón Peinado 24/1'
    },
    {
      key: 'fit',
      payloadKey: 'fit',
      label: '👔 Calce / Fit',
      type: 'string',
      explanation: 'Calce: "Regular" | "Slim" | "Oversized" | "Relaxed" | "Boxy" | "Straight" | "Tapered" | "Baggy".',
      example: 'Oversized'
    },
    {
      key: 'gender',
      payloadKey: 'gender',
      label: '👥 Género',
      type: 'string',
      explanation: '"Hombre" | "Mujer" | "Unisex" | "Niños".',
      example: 'Unisex'
    },
    {
      key: 'tags',
      payloadKey: 'tags',
      label: '🏷️ Etiquetas / Tags',
      type: 'string[]',
      explanation: 'Array de palabras clave para búsqueda interna.',
      example: ['verano', 'algodon', 'novedad']
    },
    {
      key: 'model',
      payloadKey: 'model',
      label: '🏷️ Nombre del Producto',
      type: 'string',
      explanation: 'Nombre o modelo comercial.',
      example: 'Remera Oversize Vesper'
    },
    {
      key: 'subtitle',
      payloadKey: 'subtitle',
      label: '📌 Subtítulo / Frase Comercial',
      type: 'string',
      explanation: 'Subtítulo breve o bajada del producto (ej: "100% Algodón Peinado 24/1").',
      example: '100% Algodón Peinado 24/1'
    }
  ];

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

    let dictionary = '';
    let exampleData: any[] = [];

    switch (pType) {
      case ProductType.TECH:
        dictionary = `- model (string, OBLIGATORIO): Modelo comercial (ej: "Auriculares Inalámbricos Pro ANC").
- subtitle (string, opcional): Subtítulo o versión (ej: "Edición 2026", "Hi-Res Audio").
- brand (string, OBLIGATORIO): Marca (ej: "Sony", "Apple", "Samsung").
- category (string, OBLIGATORIO): Categoría del producto.
  ⚡ Categorías activas en la tienda: [ ${categoriesList} ].
  (Prioriza usar una de estas categorías o sugiere una nueva precisa si amerita).
- productType (string, OBLIGATORIO): "TechProduct".
- costPriceARS (number, OBLIGATORIO): Costo unitario en pesos sin IVA (ej: 45000). El sistema calcula precios de venta, transferencias y cuotas automáticamente.
- shortDescription (string, opcional): Resumen de características clave (1-2 líneas).
- largeDescription (string HTML, opcional): Ficha técnica detallada en HTML enriquecido (<p>, <ul>, <li>, <strong>).
- linkProductProvider (string URL, opcional): Enlace a la web oficial del producto/fabricante.
- variants (Array de objetos, opcional): Variantes por capacidad, memoria o color con su índice de imagen asociada (imageIndex):
    [
      { "colorName": "Negro", "colorHex": "#000000", "size": "128GB", "stock": 10, "imageIndex": 0 },
      { "colorName": "Plata", "colorHex": "#CCCCCC", "size": "256GB", "stock": 5, "imageIndex": 1 }
    ]
- tags (string[] opcional): Array de etiquetas de búsqueda (ej: ["bluetooth", "anc", "audio-hd"]).
- isActive (boolean, opcional): false (se crean como borrador desactivado hasta cargar fotos).`;
        exampleData = [
          {
            model: 'Auriculares Inalámbricos Pro ANC',
            subtitle: 'Conexión Hi-Res y Cancelación Activa',
            brand: 'Sony',
            category: 'Audio',
            productType: 'TechProduct',
            costPriceARS: 45000,
            shortDescription: 'Auriculares con cancelación activa de ruido y 30hs de batería.',
            largeDescription: '<p>Experimenta un sonido envolvente de alta fidelidad con cancelación de ruido inteligente.</p><ul><li>Cancelación Activa de Ruido (ANC) de última generación</li><li>Autonomía de 30 horas continuas</li><li>Conexión multipunto Bluetooth 5.3</li></ul>',
            linkProductProvider: 'https://sony.com.ar/producto/wh-1000xm5',
            variants: [
              { colorName: 'Negro', colorHex: '#000000', size: 'Estándar', stock: 15, imageIndex: 0 },
              { colorName: 'Plata', colorHex: '#CCCCCC', size: 'Estándar', stock: 8, imageIndex: 1 }
            ],
            tags: ['audio', 'bluetooth', 'auriculares', 'cancelacion-ruido'],
            isActive: false
          }
        ];
        break;

      case ProductType.BEAUTY:
        dictionary = `- model (string, OBLIGATORIO): Nombre del cosmético/tratamiento (ej: "Serum Facial Ácido Hialurónico").
- subtitle (string, opcional): Subtítulo o beneficio específico (ej: "Tratamiento Antiage y Firmeza").
- brand (string, OBLIGATORIO): Marca (ej: "Vichy", "La Roche-Posay").
- category (string, OBLIGATORIO): Categoría del producto.
  ⚡ Categorías activas en la tienda: [ ${categoriesList} ].
- productType (string, OBLIGATORIO): "BeautyProduct".
- costPriceARS (number, OBLIGATORIO): Costo unitario en pesos sin IVA (ej: 18000).
- shortDescription (string, opcional): Beneficio principal del producto.
- largeDescription (string HTML, opcional): Modo de uso, ingredientes y beneficios en HTML (<p>, <ul>, <li>, <strong>).
- linkProductProvider (string URL, opcional): Enlace a la web del fabricante.
- variants (Array de objetos, opcional): Variantes por volumen (ml), tamaño o tono con imageIndex:
    [
      { "colorName": "Incoloro", "colorHex": "#FFFFFF", "size": "30ml", "stock": 20, "imageIndex": 0 },
      { "colorName": "Incoloro", "colorHex": "#FFFFFF", "size": "50ml", "stock": 15, "imageIndex": 0 }
    ]
- tags (string[] opcional): Array de etiquetas (ej: ["antiage", "hidratacion", "vegano"]).
- isActive (boolean, opcional): false.`;
        exampleData = [
          {
            model: 'Serum Facial Ácido Hialurónico Mineral 89',
            subtitle: 'Fortificante e Hidratante 24h',
            brand: 'Vichy',
            category: 'Cuidado Facial',
            productType: 'BeautyProduct',
            costPriceARS: 18000,
            shortDescription: 'Concentrado fortificante e hidratante con ácido hialurónico puro.',
            largeDescription: '<p>Fortalece la barrera cutánea frente a las agresiones externas y aporta hidratación por 24hs.</p><ul><li>Apto para todo tipo de pieles incluso sensibles</li><li>Fórmula hipoalergénica sin perfume</li><li>Aplicar 2 gotas por la mañana y noche sobre piel limpia</li></ul>',
            linkProductProvider: 'https://vichy.com.ar/producto/mineral-89',
            variants: [
              { colorName: 'Incoloro', colorHex: '#FFFFFF', size: '30ml', stock: 25, imageIndex: 0 },
              { colorName: 'Incoloro', colorHex: '#FFFFFF', size: '50ml', stock: 12, imageIndex: 0 }
            ],
            tags: ['serum', 'facial', 'hidratante', 'antiage'],
            isActive: false
          }
        ];
        break;

      case ProductType.GENERAL:
        dictionary = `- model (string, OBLIGATORIO): Nombre comercial (ej: "Botella Térmica de Acero 1L").
- subtitle (string, opcional): Subtítulo o variante general (ej: "Doble Pared Aislada").
- brand (string, OBLIGATORIO): Marca (ej: "Stanley", "Contigo", "Generic").
- category (string, OBLIGATORIO): Categoría del producto.
  ⚡ Categorías activas en la tienda: [ ${categoriesList} ].
- productType (string, OBLIGATORIO): "GeneralProduct".
- costPriceARS (number, OBLIGATORIO): Costo unitario en pesos sin IVA (ej: 16500).
- shortDescription (string, opcional): Resumen breve de 1-2 líneas.
- largeDescription (string HTML, opcional): Descripción y especificaciones en HTML (<p>, <ul>, <li>).
- linkProductProvider (string URL, opcional): Link a la página web del proveedor.
- variants (Array de objetos, opcional): Variantes por color, capacidad o pack:
    [
      { "colorName": "Negro Mate", "colorHex": "#1A1A1A", "size": "1 Litro", "stock": 15, "imageIndex": 0 },
      { "colorName": "Verde Oliva", "colorHex": "#556B2F", "size": "1 Litro", "stock": 10, "imageIndex": 1 }
    ]
- tags (string[] opcional): Array de etiquetas (ej: ["acero-inoxidable", "termica", "bazar"]).
- isActive (boolean, opcional): false.`;
        exampleData = [
          {
            model: 'Botella Térmica de Acero Inoxidable 1L',
            subtitle: 'Aislamiento al Vacío 24hs',
            brand: 'Stanley',
            category: 'Bazar & Hogar',
            productType: 'GeneralProduct',
            costPriceARS: 16500,
            shortDescription: 'Botella de doble pared aislada al vacío, mantiene frío por 24hs y calor por 12hs.',
            largeDescription: '<p>Construida en acero inoxidable 18/8 de alta durabilidad, libre de BPA con tapa hermética a rosca a prueba de fugas.</p>',
            linkProductProvider: 'https://stanley.com.ar/producto/botella-1l',
            variants: [
              { colorName: 'Negro Mate', colorHex: '#1A1A1A', size: '1 Litro', stock: 20, imageIndex: 0 },
              { colorName: 'Verde Oliva', colorHex: '#556B2F', size: '1 Litro', stock: 15, imageIndex: 1 }
            ],
            tags: ['termica', 'acero', 'botella', 'camping'],
            isActive: false
          }
        ];
        break;

      case ProductType.CLOTHING:
      default:
        dictionary = `- model (string, OBLIGATORIO): Nombre/modelo de la prenda (ej: "Remera Oversize Vesper").
- subtitle (string, opcional): Subtítulo comercial breve (ej: "Colección Urbana 2026", "Cápsula Limitada").
- brand (string, OBLIGATORIO): Marca (ej: "Vura", "Krencia", "Zara").
- category (string, OBLIGATORIO): Categoría del producto.
  ⚡ Categorías activas en la tienda: [ ${categoriesList} ].
  (Prioriza usar una de estas categorías existentes. Si la prenda amerita una categoría nueva y precisa como "Parkas" o "Chalecos", puedes sugerirla).
- productType (string, OBLIGATORIO): "ClothingProduct".
- costPriceARS (number, OBLIGATORIO): Costo de compra al proveedor en pesos sin IVA (ej: 14500). El sistema calcula precios de venta, cuotas y transferencias automáticamente.
- shortDescription (string, opcional): Resumen breve de 1-2 líneas para la tarjeta de producto.
- largeDescription (string HTML, opcional): Descripción y ficha de estilo completa en HTML estructurado (<p>, <ul>, <li>, <strong>).
- season (string, opcional): Temporada de la prenda (ej: "Verano 2026", "Otoño / Invierno 2026", "Atemporal").
- sizeType (string, opcional): Tipo de talle. Opciones: "Ropa" | "Calzado" | "Numérico" | "Talle Único".
- gender (string, opcional): Género. Opciones: "Hombre" | "Mujer" | "Unisex" | "Niños".
- fit (string, opcional): Calce. Opciones: "Regular" | "Slim" | "Oversized" | "Relaxed" | "Boxy" | "Straight" | "Tapered" | "Baggy".
- material (string, opcional): Composición general textil (ej: "100% Algodón Peinado 24/1").
- composition (Array de objetos, opcional): Detalle porcentual de materiales:
    [ { "material": "Algodón", "percentage": 100 } ]
- careInstructions (string[], opcional): Lista de instrucciones de cuidado y lavado (ej: ["Lavar con agua fría a máquina", "No usar secadora"]).
- linkProductProvider (string URL, opcional): Link a la página web del producto en el proveedor/fabricante.
- variants (Array de objetos, OBLIGATORIO en indumentaria): Variantes por talle y color con su índice de foto (imageIndex 0, 1, 2...):
    [
      { "colorName": "Negro", "colorHex": "#000000", "size": "S", "stock": 10, "imageIndex": 0 },
      { "colorName": "Negro", "colorHex": "#000000", "size": "M", "stock": 15, "imageIndex": 0 },
      { "colorName": "Blanco", "colorHex": "#FFFFFF", "size": "S", "stock": 8, "imageIndex": 1 }
    ]
- sizeGuide (Objeto, opcional): Tabla de medidas en cm:
    {
      "headers": ["Talle", "Ancho de Pecho (cm)", "Largo Total (cm)", "Hombro (cm)"],
      "rows": [
        { "size": "S", "values": ["52", "68", "44"] },
        { "size": "M", "values": ["54", "70", "46"] }
      ],
      "tolerance": "* Medidas tomadas en plano (+/- 1.5 cm)."
    }
- tags (string[] opcional): Array de etiquetas de búsqueda (ej: ["verano", "oversize", "algodon", "urbano"]).
- isActive (boolean, opcional): false (los productos se crean como borrador para que el administrador revise y cargue fotos).`;
        exampleData = [
          {
            model: 'Remera Oversize Vesper',
            subtitle: 'Colección Urbana 2026',
            brand: 'Vura',
            category: 'Remeras',
            productType: 'ClothingProduct',
            costPriceARS: 14500,
            shortDescription: 'Remera oversize confeccionada en 100% algodón peinado 24/1 de máxima suavidad.',
            largeDescription: '<p>Remera con calce holgado y cuello en ribb reforzado. Ideal para looks casuales y streetwear.</p><ul><li>Algodón premium peinado 24/1</li><li>Costuras reforzadas en cuello y hombros</li><li>Estampa en serigrafía de alta durabilidad</li></ul>',
            season: 'Verano 2026',
            sizeType: 'Ropa',
            gender: 'Unisex',
            fit: 'Oversized',
            material: '100% Algodón Peinado 24/1',
            composition: [
              { material: 'Algodón', percentage: 100 }
            ],
            careInstructions: [
              'Lavar con agua fría a máquina',
              'No usar secadora',
              'Planchar del revés a temperatura media'
            ],
            linkProductProvider: 'https://krencia.com.ar/producto/remera-vesper',
            variants: [
              { colorName: 'Negro', colorHex: '#000000', size: 'S', stock: 10, imageIndex: 0 },
              { colorName: 'Negro', colorHex: '#000000', size: 'M', stock: 15, imageIndex: 0 },
              { colorName: 'Negro', colorHex: '#000000', size: 'L', stock: 12, imageIndex: 0 },
              { colorName: 'Blanco', colorHex: '#FFFFFF', size: 'S', stock: 8, imageIndex: 1 },
              { colorName: 'Blanco', colorHex: '#FFFFFF', size: 'M', stock: 10, imageIndex: 1 }
            ],
            sizeGuide: {
              headers: ['Talle', 'Ancho de Pecho (cm)', 'Largo Total (cm)', 'Hombro (cm)'],
              rows: [
                { size: 'S', values: ['52', '68', '44'] },
                { size: 'M', values: ['54', '70', '46'] },
                { size: 'L', values: ['56', '72', '48'] },
                { size: 'XL', values: ['58', '74', '50'] },
                { size: 'XXL', values: ['60', '76', '52'] }
              ],
              tolerance: '* Medidas tomadas en plano (+/- 1.5 cm).'
            },
            tags: ['remera', 'oversize', 'algodon', 'urbano'],
            isActive: false
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

REGLAS CRÍTICAS:
1. Responde ÚNICAMENTE con el bloque JSON (un array de objetos [ { ... } ]). No agregues texto introductorio ni explicaciones fuera del JSON.
2. Todos los valores numéricos deben ser números reales (sin símbolos $ ni comas).
3. Por defecto, asigna 'isActive: false' a cada producto para que se cree como borrador seguro.`;

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

      if (scopeKeys.includes('material') && (p as any).material) {
        item.currentMaterial = (p as any).material;
      }

      if (scopeKeys.includes('fit') && (p as any).fit) {
        item.currentFit = (p as any).fit;
      }

      if (scopeKeys.includes('gender') && (p as any).gender) {
        item.currentGender = (p as any).gender;
      }

      if (scopeKeys.includes('subtitle') && p.subtitle) {
        item.currentSubtitle = p.subtitle;
      }

      return item;
    });

    const activeProps = this.availableScopeProperties.filter((p) => scopeKeys.includes(p.key));
    const dictionaryLines = activeProps.map((p) => `- ${p.payloadKey} (${p.type}, OBLIGATORIO): [Objetivo: ${p.label}] ${p.explanation}`).join('\n');
    const exampleObj: any = { _id: productsToExport[0]?._id || '66ce301f92a1...' };
    activeProps.forEach((p) => {
      exampleObj[p.payloadKey] = p.example;
    });

    const hasAnyLink = compactProducts.some((p) => p.linkProductProvider);
    const customInstruction = this.aiCustomInstruction().trim();
    const typeSummary = this.selectedProductsTypesSummary();

    const prompt = `Actúa como especialista de catálogo para NexoCommerce. Necesito actualizar EXCLUSIVAMENTE las siguientes propiedades de estos ${compactProducts.length} productos (${typeSummary.breakdown}): [${activeProps.map((p) => p.label).join(', ')}].

LISTA ACTUAL DE PRODUCTOS CON SUS IDs Y TIPOS:
\`\`\`json
${JSON.stringify(compactProducts, null, 2)}
\`\`\`

DICCIONARIO DE PROPIEDADES QUE DEBES DEVOLVER:
- _id (string, OBLIGATORIO): Mantén el _id original del producto para identificarlo en la base de datos.
${dictionaryLines}

🎯 ADAPTACIÓN SEGÚN EL 'productType' DE CADA PRODUCTO:
- Para ClothingProduct (Indumentaria): Usa talles (S, M, L o 38, 40), colores con código #HEX y guías de medidas en cm.
- Para TechProduct (Tecnología): Usa capacidades/especificaciones en 'size' (ej: "128GB", "256GB") y colores.
- Para BeautyProduct (Belleza): Usa volúmenes en 'size' (ej: "30ml", "50ml", "100ml") o tonos cosméticos.
- Para GeneralProduct (General): Usa medidas, capacidades o packs estándar.

EJEMPLO DEL FORMATO EXACTO QUE DEBES GENERAR:
\`\`\`json
[
${JSON.stringify(exampleObj, null, 2)}
]
\`\`\`

${customInstruction ? `🎯 DIRECTIVA ESPECÍFICA DEL USUARIO:
"${customInstruction}"
Asegúrate de respetar prioritariamente esta indicación al generar las variantes y valores del JSON.\n\n` : ''}${hasAnyLink ? `🌐 NAVEGACIÓN WEB CON IA:
Si los productos tienen 'linkProductProvider' con una URL válida, podés acceder y navegar por dicha página web para extraer la información oficial de la prenda/producto, su composición, tabla de medidas y fotos de alta resolución para volcarlas en las propiedades correspondientes.\n\n` : ''}REGLAS CRÍTICAS DE SEGURIDAD:
1. Tu respuesta debe ser ÚNICAMENTE el bloque JSON (un array de objetos [ { ... } ]). Sin texto de saludo ni explicaciones.
2. Modifica e incluye EXCLUSIVAMENTE el '_id' y las propiedades solicitadas. NO inventes ni agregues otras propiedades que no fueron solicitadas.
3. Asegúrate de que todos los valores numéricos sean números reales (sin símbolos $ ni comas).`;

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

    // Strip markdown code fences if present
    raw = raw.replace(/^```(json)?/i, '').replace(/```$/i, '').trim();

    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        this.aiParseError.set('El JSON debe ser un array de objetos [ { ... } ].');
        return;
      }

      if (parsed.length === 0) {
        this.aiParseError.set('El array JSON no contiene ningún producto.');
        return;
      }

      if (this.aiBulkMode() === 'create') {
        const storeCategories = (this.Categories() || []).map((c: string) => c.toLowerCase().trim());

        const validated = parsed.map((item: any, idx: number) => {
          if (!item.model || !item.brand || !item.category) {
            throw new Error(`Ítem #${idx + 1} no tiene modelo, marca o categoría.`);
          }

          const cat = String(item.category).trim();
          const isNewCategory = storeCategories.length > 0 && !storeCategories.includes(cat.toLowerCase());

          return {
            model: String(item.model).trim(),
            brand: String(item.brand).trim(),
            category: cat,
            isNewCategory,
            subtitle: item.subtitle ? String(item.subtitle).trim() : '',
            season: item.season ? String(item.season).trim() : '',
            sizeType: item.sizeType || 'Ropa',
            productType: item.productType || 'ClothingProduct',
            costPriceARS: Number(item.costPriceARS || item.price || item.providerCost || 0),
            shortDescription: item.shortDescription || '',
            largeDescription: item.largeDescription || item.description || '',
            linkProductProvider: item.linkProductProvider || '',
            gender: item.gender || 'Unisex',
            material: item.material || '',
            composition: Array.isArray(item.composition) ? item.composition : [],
            careInstructions: Array.isArray(item.careInstructions) ? item.careInstructions : [],
            fit: item.fit || '',
            variants: Array.isArray(item.variants) ? item.variants : [],
            sizeGuide: item.sizeGuide || null,
            images: Array.isArray(item.images) ? item.images : [],
            tags: Array.isArray(item.tags) ? item.tags : [],
            isActive: item.isActive === true ? true : false
          };
        });
        this.aiParsedCreateItems.set(validated);
        this.aiParsedUpdateItems.set([]);
        this.aiParsedUpdateDiffs.set([]);
      } else {
        // Update mode with granular diffing
        const allProducts = this.ProductState.products().data || [];
        const diffs: any[] = [];

        const validated = parsed.map((item: any, idx: number) => {
          if (!item._id) {
            throw new Error(`Ítem #${idx + 1} (${item.model || 'sin nombre'}) no tiene la propiedad _id.`);
          }

          const orig = allProducts.find((p) => p._id === item._id);
          const changes: Array<{ label: string; text: string; icon: string }> = [];

          if (item.costPriceARS !== undefined) {
            const oldCost = orig?.finance?.providerCost?.inARS || (orig?.price as any)?.costPrice?.inARS || 0;
            changes.push({
              label: 'Costo',
              text: `$${Number(item.costPriceARS).toLocaleString('es-AR')} (Antes: $${Number(oldCost).toLocaleString('es-AR')})`,
              icon: 'payments'
            });
          }

          if (Array.isArray(item.variants) && item.variants.length > 0) {
            const sizesList = item.variants.map((v: any) => `${v.size || 'Único'} (x${v.stock ?? 0})`).join(', ');
            changes.push({
              label: 'Talles',
              text: `${item.variants.length} variantes [${sizesList}]`,
              icon: 'straighten'
            });
          }

          if (item.sizeGuide) {
            const rowCount = item.sizeGuide.rows?.length || 0;
            changes.push({
              label: 'Guía de Medidas',
              text: `Tabla con ${rowCount} talles configurados`,
              icon: 'table_chart'
            });
          }

          if (item.shortDescription) {
            changes.push({
              label: 'Desc. Corta',
              text: item.shortDescription.length > 40 ? item.shortDescription.slice(0, 40) + '...' : item.shortDescription,
              icon: 'description'
            });
          }

          if (item.material) {
            changes.push({
              label: 'Material',
              text: item.material,
              icon: 'checkroom'
            });
          }

          if (item.fit) {
            changes.push({
              label: 'Calce',
              text: item.fit,
              icon: 'style'
            });
          }

          if (item.gender) {
            changes.push({
              label: 'Género',
              text: item.gender,
              icon: 'wc'
            });
          }

          if (item.tags && Array.isArray(item.tags)) {
            changes.push({
              label: 'Tags',
              text: item.tags.join(', '),
              icon: 'label'
            });
          }

          if (item.model && orig && item.model !== orig.model) {
            changes.push({
              label: 'Nombre',
              text: `${item.model} (Antes: ${orig.model})`,
              icon: 'edit'
            });
          }

          if (item.subtitle !== undefined) {
            changes.push({
              label: 'Subtítulo',
              text: item.subtitle ? String(item.subtitle) : '(vacío)',
              icon: 'subtitles'
            });
          }

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
      this.aiParseError.set(err.message || 'JSON inválido. Verifica la sintaxis devuelta por la IA.');
    }
  }

  async executeAiBulkCreate() {
    const items = this.aiParsedCreateItems();
    if (items.length === 0) return;

    this.aiProcessing.set(true);
    try {
      await this.ProductState.bulkCreateProducts(items);
      this.closeAiBulkModal();
      this.#snackBar.open(`🎉 ¡${items.length} productos creados exitosamente!`, 'Cerrar', { duration: 4000 });
    } catch (err: any) {
      this.#snackBar.open(err?.error?.message || 'Error al crear productos en lote.', 'Cerrar', { duration: 4000 });
    } finally {
      this.aiProcessing.set(false);
    }
  }

  async executeAiBulkUpdate() {
    const items = this.aiParsedUpdateItems();
    if (items.length === 0) return;

    this.aiProcessing.set(true);
    try {
      await this.ProductState.bulkUpdateProducts(items);
      this.clearSelection();
      this.closeAiBulkModal();
      this.#snackBar.open(`🎉 ¡${items.length} productos actualizados exitosamente!`, 'Cerrar', { duration: 4000 });
    } catch (err: any) {
      this.#snackBar.open(err?.error?.message || 'Error al actualizar productos en lote.', 'Cerrar', { duration: 4000 });
    } finally {
      this.aiProcessing.set(false);
    }
  }
}
