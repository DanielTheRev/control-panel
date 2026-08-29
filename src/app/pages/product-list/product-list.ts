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

  aiParsedCreateItems = signal<any[]>([]);
  aiParsedUpdateItems = signal<any[]>([]);

  openAiBulkModal(mode: 'create' | 'update') {
    this.aiBulkMode.set(mode);
    this.aiRawInput.set('');
    this.aiParseError.set(null);
    this.aiPromptCopied.set(false);
    this.aiParsedCreateItems.set([]);
    this.aiParsedUpdateItems.set([]);
    this.showAiBulkModal.set(true);
  }

  closeAiBulkModal() {
    this.showAiBulkModal.set(false);
  }

  async copyAiCreatePrompt() {
    const prompt = `Actúa como especialista de catálogo y e-commerce para NexoCommerce. Genera un array JSON válido con los productos solicitados siguiendo estrictamente este formato y tipos de datos:

DICCIONARIO DE TIPOS Y PROPIEDADES ACEPTADAS:
- model (string, OBLIGATORIO): Nombre/modelo del producto (ej: "Remera Oversize Vesper").
- brand (string, OBLIGATORIO): Marca (ej: "Vura").
- category (string, OBLIGATORIO): Categoría (ej: "Remeras", "Jeans", "Buzos").
- productType (string, OBLIGATORIO): "ClothingProduct" | "TechProduct" | "BeautyProduct" | "GeneralProduct".
- costPriceARS (number, OBLIGATORIO): Costo de compra al proveedor en pesos sin IVA (ej: 12500). El sistema calcula precios de venta, cuotas y márgenes automáticamente.
- shortDescription (string, opcional): Resumen de 1-2 líneas para la tarjeta.
- largeDescription (string HTML, opcional): Descripción completa en HTML limpio (<p>, <ul>, <li>).
- gender (string, opcional): "Hombre" | "Mujer" | "Unisex" | "Niños".
- material (string, opcional): Composición de la tela (ej: "100% Algodón Peinado 24/1").
- fit (string, opcional): "Regular" | "Slim" | "Oversized" | "Relaxed" | "Boxy" | "Straight" | "Tapered" | "Baggy".
- variants (Array de objetos, opcional):
    [
      { "colorName": "Negro", "colorHex": "#000000", "size": "S", "stock": 10 },
      { "colorName": "Negro", "colorHex": "#000000", "size": "M", "stock": 15 },
      { "colorName": "Negro", "colorHex": "#000000", "size": "L", "stock": 12 },
      { "colorName": "Blanco", "colorHex": "#FFFFFF", "size": "S", "stock": 8 }
    ]
- sizeGuide (Objeto, opcional):
    {
      "headers": ["Talle", "Ancho de Pecho (cm)", "Largo Total (cm)", "Hombro (cm)"],
      "rows": [
        { "size": "S", "values": ["52", "68", "44"] },
        { "size": "M", "values": ["54", "70", "46"] }
      ],
      "tolerance": "* Medidas aproximadas (+/- 1.5 cm)."
    }
- images (string[] opcional): Array de URLs públicas de fotos.
- tags (string[] opcional): Array de etiquetas (ej: ["verano", "algodon", "novedad"]).

EJEMPLO COMPLETO QUE DEBES DEVOLVER:
[
  {
    "model": "Remera Oversize Vesper",
    "brand": "Vura",
    "category": "Remeras",
    "productType": "ClothingProduct",
    "costPriceARS": 12500,
    "shortDescription": "Remera oversize 100% algodón peinado 24/1.",
    "largeDescription": "<p>Remera urbana con calce holgado y costuras reforzadas.</p>",
    "gender": "Unisex",
    "material": "100% Algodón Peinado 24/1",
    "fit": "Oversized",
    "variants": [
      { "colorName": "Negro", "colorHex": "#000000", "size": "S", "stock": 10 },
      { "colorName": "Negro", "colorHex": "#000000", "size": "M", "stock": 15 },
      { "colorName": "Negro", "colorHex": "#000000", "size": "L", "stock": 12 },
      { "colorName": "Negro", "colorHex": "#000000", "size": "XL", "stock": 8 },
      { "colorName": "Negro", "colorHex": "#000000", "size": "XXL", "stock": 5 }
    ],
    "sizeGuide": {
      "headers": ["Talle", "Ancho de Pecho (cm)", "Largo Total (cm)", "Hombro (cm)"],
      "rows": [
        { "size": "S", "values": ["52", "68", "44"] },
        { "size": "M", "values": ["54", "70", "46"] },
        { "size": "L", "values": ["56", "72", "48"] },
        { "size": "XL", "values": ["58", "74", "50"] },
        { "size": "XXL", "values": ["60", "76", "52"] }
      ],
      "tolerance": "* Medidas tomadas en plano (+/- 1.5 cm)."
    }
  }
]

REGLAS CRÍTICAS:
1. Responde ÚNICAMENTE con el bloque JSON (un array de objetos [ { ... } ]). No agregues texto introductorio ni explicaciones fuera del JSON.
2. Todos los valores numéricos deben ser números reales (sin símbolos $ ni comas).`;

    try {
      await navigator.clipboard.writeText(prompt);
      this.aiPromptCopied.set(true);
      setTimeout(() => this.aiPromptCopied.set(false), 4000);
      this.#snackBar.open('📋 ¡Prompt maestro de creación copiado al portapapeles!', 'Genial', { duration: 3000 });
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

    const compactProducts = productsToExport.map((p) => {
      const cost = (p.finance?.providerCost?.inARS || (p.price as any)?.costPrice?.inARS || 0);
      const variantsSummary = (p.variants || []).map((v: any) => ({
        colorName: v.colorName || 'Único',
        colorHex: v.colorHex || '#000000',
        size: v.size || 'Único',
        stock: v.stock || 0
      }));

      return {
        _id: p._id,
        model: p.model,
        brand: p.brand,
        category: p.category,
        costPriceARS: cost,
        currentVariants: variantsSummary,
        shortDescription: p.shortDescription || ''
      };
    });

    const prompt = `Actúa como especialista de catálogo para NexoCommerce. Necesito actualizar los siguientes ${compactProducts.length} productos existentes en mi tienda.

A continuación tienes la lista actual de productos con sus IDs y estado actual:
\`\`\`json
${JSON.stringify(compactProducts, null, 2)}
\`\`\`

DICCIONARIO DE TIPOS Y PROPIEDADES ACEPTADAS PARA ACTUALIZAR:
- _id (string, OBLIGATORIO): El ID original del producto que debes mantener para identificarlo.
- model (string, opcional): Nuevo nombre del modelo.
- brand (string, opcional): Nueva marca.
- category (string, opcional): Nueva categoría.
- costPriceARS (number, opcional): Nuevo costo en pesos sin IVA (ej: 14000).
- shortDescription (string, opcional): Nueva descripción corta.
- largeDescription (string HTML, opcional): Nueva descripción en HTML (<p>, <ul>, <li>).
- material (string, opcional): Nueva tela/composición.
- gender (string, opcional): "Hombre" | "Mujer" | "Unisex" | "Niños".
- fit (string, opcional): "Regular" | "Slim" | "Oversized" | "Relaxed" | "Boxy" | "Straight" | "Tapered" | "Baggy".
- variants (Array de objetos, opcional): Si vas a actualizar o agregar talles/colores/stock:
    [
      { "colorName": "Negro", "colorHex": "#000000", "size": "S", "stock": 10 },
      { "colorName": "Negro", "colorHex": "#000000", "size": "M", "stock": 15 },
      { "colorName": "Negro", "colorHex": "#000000", "size": "L", "stock": 12 },
      { "colorName": "Negro", "colorHex": "#000000", "size": "XL", "stock": 8 },
      { "colorName": "Negro", "colorHex": "#000000", "size": "XXL", "stock": 5 }
    ]
- sizeGuide (Objeto, opcional): Nueva tabla de medidas:
    {
      "headers": ["Talle", "Ancho (cm)", "Largo (cm)"],
      "rows": [{ "size": "S", "values": ["50", "68"] }],
      "tolerance": "* Medidas tomadas en plano."
    }

INSTRUCCIÓN:
Genera un array JSON [ { "_id": "...", ...propiedadesActualizadas } ] donde para cada producto mantengas su _id e incluyas las propiedades que deben modificarse o añadirse (por ejemplo, los nuevos talles y variantes con stock, nuevos precios o descripciones).
Responde ÚNICAMENTE con el bloque JSON.`;

    try {
      await navigator.clipboard.writeText(prompt);
      this.aiPromptCopied.set(true);
      setTimeout(() => this.aiPromptCopied.set(false), 4000);
      this.#snackBar.open(`📋 ¡Prompt de actualización para ${compactProducts.length} productos copiado!`, 'Genial', { duration: 3000 });
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
        const validated = parsed.map((item: any, idx: number) => {
          if (!item.model || !item.brand || !item.category) {
            throw new Error(`Ítem #${idx + 1} no tiene modelo, marca o categoría.`);
          }
          return {
            model: String(item.model).trim(),
            brand: String(item.brand).trim(),
            category: String(item.category).trim(),
            productType: item.productType || 'ClothingProduct',
            costPriceARS: Number(item.costPriceARS || item.price || 0),
            shortDescription: item.shortDescription || '',
            largeDescription: item.largeDescription || '',
            gender: item.gender || 'Unisex',
            material: item.material || '',
            fit: item.fit || '',
            variants: Array.isArray(item.variants) ? item.variants : [],
            sizeGuide: item.sizeGuide || null,
            images: Array.isArray(item.images) ? item.images : [],
            tags: Array.isArray(item.tags) ? item.tags : []
          };
        });
        this.aiParsedCreateItems.set(validated);
        this.aiParsedUpdateItems.set([]);
      } else {
        // Update mode
        const validated = parsed.map((item: any, idx: number) => {
          if (!item._id) {
            throw new Error(`Ítem #${idx + 1} (${item.model || 'sin nombre'}) no tiene la propiedad _id.`);
          }
          return item;
        });
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
