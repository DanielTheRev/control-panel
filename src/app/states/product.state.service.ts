import { httpResource, HttpResourceRef } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { environment } from '../../environments/environment';
import {
  IProduct,
  ProductType,
  ICostConcept,
} from '../interfaces/product.interface';
import { IPaginatedResult } from '../interfaces/pagination.interface';
import { ProductService, mapProductPrices } from '../services/product.service';
import { NotificationsService } from '../services/notifications.service';

@Injectable({
  providedIn: 'root',
})
export class ProductStoreService {
  #productService = inject(ProductService);
  #notificationService = inject(NotificationsService);

  // Pagination signals — httpResource reacts to these automatically
  private pageNumber = signal(1);
  private pageSize = signal(10);
  private searchQuery = signal('');
  private categoryFilter = signal('');
  private providerFilter = signal('');
  private statusFilter = signal<string>('');
  private noSeoOnly = signal(false);

  // httpResource that auto-fetches when page/size signals change
  #fetchedProducts: HttpResourceRef<IPaginatedResult<IProduct> | undefined>;

  // httpResource that fetches all products for global statistics
  #allProductsForStats: HttpResourceRef<IPaginatedResult<IProduct> | undefined>;

  constructor() {
    this.#fetchedProducts = httpResource<IPaginatedResult<IProduct>>(() => ({
      url: `${environment.apiUrl}/products/admin/list`,
      params: {
        page: this.pageNumber(),
        limit: this.pageSize(),
        ...(this.searchQuery() ? { q: this.searchQuery() } : {}),
        ...(this.categoryFilter() ? { category: this.categoryFilter() } : {}),
        ...(this.providerFilter() ? { provider: this.providerFilter() } : {}),
        ...(this.statusFilter() ? { isActive: this.statusFilter() } : {}),
      },
    }));

    this.#allProductsForStats = httpResource<IPaginatedResult<IProduct>>(
      () => ({
        url: `${environment.apiUrl}/products/admin/list`,
        params: {
          page: 1,
          limit: 1000,
          ...(this.searchQuery() ? { q: this.searchQuery() } : {}),
          ...(this.categoryFilter() ? { category: this.categoryFilter() } : {}),
          ...(this.providerFilter() ? { provider: this.providerFilter() } : {}),
          ...(this.statusFilter() ? { isActive: this.statusFilter() } : {}),
        },
      }),
    );
  }

  // Public computed state (maintains same shape for backward compatibility)
  readonly products = computed(() => {
    if (this.noSeoOnly()) {
      const all = this.allProducts().filter(
        (p) =>
          !p.seo || !p.seo.metaTitle?.trim() || !p.seo.metaDescription?.trim(),
      );
      const page = this.pageNumber();
      const limit = this.pageSize();
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const data = all.slice(startIndex, endIndex);

      return {
        data,
        hasData: this.#allProductsForStats.hasValue(),
        hasError: !!this.#allProductsForStats.error(),
        isLoading: this.#allProductsForStats.isLoading(),
        itemsCount: all.length,
      };
    }

    const result = this.#fetchedProducts.value();
    const data = (result?.data || []).map(mapProductPrices);
    return {
      data,
      hasData: this.#fetchedProducts.hasValue(),
      hasError: !!this.#fetchedProducts.error(),
      isLoading: this.#fetchedProducts.isLoading(),
      itemsCount: result?.pagination?.totalItems ?? 0,
    };
  });

  readonly pagination = computed(() => {
    if (this.noSeoOnly()) {
      const all = this.allProducts().filter(
        (p) =>
          !p.seo || !p.seo.metaTitle?.trim() || !p.seo.metaDescription?.trim(),
      );
      const limit = this.pageSize();
      const totalPages = Math.ceil(all.length / limit);

      return {
        currentPage: this.pageNumber(),
        totalPages: totalPages || 1,
        totalItems: all.length,
        itemsPerPage: limit,
      };
    }

    const result = this.#fetchedProducts.value();
    return result!.pagination;
  });

  readonly techProducts = computed(() =>
    (this.#fetchedProducts.value()?.data || []).filter(
      (p) => p.productType === ProductType.TECH,
    ),
  );

  readonly clothingProducts = computed(() =>
    (this.#fetchedProducts.value()?.data || []).filter(
      (p) => p.productType === ProductType.CLOTHING,
    ),
  );

  // readonly categories = signal(Object.values(IProductCategories));

  readonly currentSearchQuery = computed(() => this.searchQuery());
  readonly currentCategoryFilter = computed(() => this.categoryFilter());
  readonly currentProviderFilter = computed(() => this.providerFilter());
  readonly currentStatusFilter = computed(() => this.statusFilter());
  readonly currentNoSeoOnlyFilter = computed(() => this.noSeoOnly());

  // Statistics signals
  readonly allProducts = computed(() =>
    (this.#allProductsForStats.value()?.data || []).map(mapProductPrices),
  );
  readonly statsLoading = computed(() => this.#allProductsForStats.isLoading());
  readonly totalProductsCount = computed(() => this.allProducts().length);
  readonly activeProductsCount = computed(
    () => this.allProducts().filter((p) => p.isActive).length,
  );
  readonly inactiveProductsCount = computed(
    () => this.allProducts().filter((p) => !p.isActive).length,
  );

  readonly noSeoCount = computed(() => {
    return this.allProducts()
      .filter((p) => p.isActive)
      .filter((p) => {
        return (
          !p.seo || !p.seo.metaTitle?.trim() || !p.seo.metaDescription?.trim()
        );
      }).length;
  });

  readonly estimatedEarningsCash = computed(() => {
    return this.allProducts()
      .filter((p) => p.isActive)
      .reduce(
        (acc, p) => acc + (p.finance?.calculatedProfits?.transfer || 0),
        0,
      );
  });

  readonly estimatedEarningsCard1 = computed(() => {
    return this.allProducts()
      .filter((p) => p.isActive)
      .reduce(
        (acc, p) => acc + (p.finance?.calculatedProfits?.card_ticket1Pay || 0),
        0,
      );
  });

  readonly estimatedEarningsCard3 = computed(() => {
    return this.allProducts()
      .filter((p) => p.isActive)
      .reduce(
        (acc, p) =>
          acc + (p.finance?.calculatedProfits?.card3Installments || 0),
        0,
      );
  });

  readonly estimatedEarningsCard6 = computed(() => {
    return this.allProducts()
      .filter((p) => p.isActive)
      .reduce(
        (acc, p) =>
          acc + (p.finance?.calculatedProfits?.card6Installments || 0),
        0,
      );
  });

  readonly totalStockCount = computed(() => {
    return this.allProducts()
      .filter((p) => p.isActive)
      .reduce((acc, p) => {
        if (p.totalStock !== undefined) return acc + p.totalStock;
        const variantsStock =
          p.variants
            ?.filter((v) => v.isActive)
            .reduce((sum, v) => sum + v.stock, 0) || 0;
        return acc + variantsStock;
      }, 0);
  });

  // Pagination methods — just update the signals, httpResource handles the rest
  setPage(page: number) {
    this.pageNumber.set(page);
  }

  setPageSize(size: number) {
    this.pageSize.set(size);
    this.pageNumber.set(1); // Reset to first page when changing size
  }

  setSearchQuery(query: string) {
    this.searchQuery.set(query);
    this.pageNumber.set(1); // Reset page when searching
  }

  setCategoryFilter(category: string) {
    this.categoryFilter.set(category);
    this.pageNumber.set(1); // Reset page when filtering
  }

  setProviderFilter(provider: string) {
    this.providerFilter.set(provider);
    this.pageNumber.set(1);
  }

  setStatusFilter(status: string) {
    this.statusFilter.set(status);
    this.pageNumber.set(1);
  }

  setNoSeoOnlyFilter(value: boolean) {
    this.noSeoOnly.set(value);
    this.pageNumber.set(1);
  }

  changePage(page: number, size: number) {
    this.pageSize.set(size);
    this.pageNumber.set(page);
  }

  async getProduct(id: string) {
    // 1. Buscamos en el estado local de la lista
    // const localProduct = this.products().data.find(p => p._id === id);

    // if (localProduct) {
    //   console.log('Cargado desde caché local 🚀');
    //   return localProduct;
    // }

    // 2. Si no está (ej: refresh de página), vamos a buscarlo
    try {
      console.log('Viajando a Dubai por el producto... ✈️');
      return await this.#productService.getProduct(id);
    } catch (error) {
      this.#notificationService.error('Error al obtener el producto');
      throw error;
    }
  }

  calculateListPrice(data: {
    providerCost: number;
    additionalCosts: ICostConcept[];
    useCustomProfit: boolean;
    customProfitMargin: number;
    pricingMethodChoice: 'markup' | 'margin';
    calculate: boolean;
  }) {
    return this.#productService.calculateListPrice(data);
  }

  calculatePrices(data: {
    costPrice: number;
    additionalCosts: ICostConcept[];
    discountPercentageTransfer: number;
    customProfitMargin?: number;
    customPricingMethod?: 'markup' | 'margin';
  }) {
    return this.#productService.calculatePrices(data);
  }

  async createProduct(data: FormData) {
    try {
      const product = await this.#productService.create(data);
      this.#addProduct(product);
      this.#allProductsForStats.reload();
      return product._id;
    } catch (error) {
      throw error;
    }
  }

  async updateProduct(id: string, data: FormData) {
    try {
      const response = await this.#productService.updateProduct(id, data);
      this.#updateProduct(response);
      this.#allProductsForStats.reload();
    } catch (error) {
      throw error;
    }
  }

  async deleteProduct(id: string) {
    // 1. Guardamos una copia del estado actual por si algo falla (Back up)
    const previousState = this.#fetchedProducts.value();

    // 2. Optimistic Update: Borramos de la UI antes de que el server responda
    this.#deleteProductLocal(id);

    try {
      await this.#productService.deleteProduct(id);
      // 3. Si sale bien, podemos hacer un reload opcional para rellenar la paginación
      this.#fetchedProducts.reload();
      this.#allProductsForStats.reload();
      this.#notificationService.success('Producto eliminado con éxito');
    } catch (error) {
      // 4. ROLLBACK: Si falla, restauramos el estado anterior
      this.#notificationService.error(
        'No se pudo eliminar el producto, restaurando...',
      );
      this.#fetchedProducts.set(previousState); // Reinstalamos la data vieja
    }
  }

  async bulkUpdateStatus(ids: string[], isActive: boolean) {
    const previousState = this.#fetchedProducts.value();

    // Optimistic Update
    this.#fetchedProducts.update((state) => {
      if (!state) return state;
      return {
        ...state,
        data: state.data.map((p) =>
          ids.includes(p._id) ? { ...p, isActive } : p,
        ),
      };
    });

    try {
      await this.#productService.bulkUpdateStatus(ids, isActive);
      this.#allProductsForStats.reload();
      // Optional: reload to ensure consistency
      // this.#fetchedProducts.reload();
    } catch (error) {
      // Rollback
      this.#fetchedProducts.set(previousState);
    }
  }

  #addProduct(product: IProduct) {
    this.#fetchedProducts.update((state) => {
      if (!state) return state;
      return {
        ...state,
        data: [...state.data, product],
        pagination: {
          ...state.pagination,
          totalItems: state.pagination.totalItems + 1,
        },
      };
    });
  }

  #updateProduct(product: Partial<IProduct>) {
    this.#fetchedProducts.update((state) => {
      if (!state) return state;
      return {
        ...state,
        data: state.data.map((p) =>
          p._id === product._id ? { ...p, ...product } : p,
        ),
      };
    });
  }

  #deleteProductLocal(id: string) {
    this.#fetchedProducts.update((state) => {
      if (!state) return state;
      return {
        ...state,
        data: state.data.filter((p) => p._id !== id),
        pagination: {
          ...state.pagination,
          totalItems: state.pagination.totalItems - 1,
        },
      };
    });
  }
}
