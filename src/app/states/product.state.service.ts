import { httpResource, HttpResourceRef } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { environment } from '../../environments/environment';
import { IProduct, ProductType, IProductCategories } from '../interfaces/product.interface';
import { IPaginatedResult } from '../interfaces/pagination.interface';
import { ProductService } from '../services/product.service';
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

  // httpResource that auto-fetches when page/size signals change
  #fetchedProducts: HttpResourceRef<IPaginatedResult<IProduct> | undefined>;

  constructor() {
    this.#fetchedProducts = httpResource<IPaginatedResult<IProduct>>(() => ({
      url: `${environment.apiUrl}/products/list`,
      params: {
        page: this.pageNumber(),
        limit: this.pageSize(),
        ...(this.searchQuery() ? { q: this.searchQuery() } : {}),
        ...(this.categoryFilter() ? { category: this.categoryFilter() } : {}),
      },
    }));
  }

  // Public computed state (maintains same shape for backward compatibility)
  readonly products = computed(() => {
    const result = this.#fetchedProducts.value();
    return {
      data: result?.data || [],
      hasData: this.#fetchedProducts.hasValue(),
      hasError: !!this.#fetchedProducts.error(),
      isLoading: this.#fetchedProducts.isLoading(),
      itemsCount: result?.pagination?.totalItems ?? 0,
    };
  });

  readonly pagination = computed(() => {
    const result = this.#fetchedProducts.value();
    return result!.pagination
  });

  readonly techProducts = computed(() =>
    (this.#fetchedProducts.value()?.data || []).filter(p => p.productType === ProductType.TECH)
  );

  readonly clothingProducts = computed(() =>
    (this.#fetchedProducts.value()?.data || []).filter(p => p.productType === ProductType.CLOTHING)
  );

  readonly categories = signal(Object.values(IProductCategories));

  readonly currentSearchQuery = computed(() => this.searchQuery());
  readonly currentCategoryFilter = computed(() => this.categoryFilter());

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

  changePage(page: number, size: number) {
    this.pageSize.set(size);
    this.pageNumber.set(page);
  }

  async getProduct(id: string) {
    try {
      const product = await this.#productService.getProduct(id);
      return product;
    } catch (error) {
      this.#notificationService.error('Error al obtener el producto');
      throw error;
    }
  }

  calculatePrices(costPrice: number, customProfitMargin?: number | string) {
    return this.#productService.calculatePrices(costPrice, customProfitMargin);
  }

  async createProduct(data: FormData) {
    try {
      await this.#productService.create(data);
      this.#fetchedProducts.reload();
    } catch (error) {
      throw error;
    }
  }

  async updateProduct(id: string, data: FormData) {
    try {
      await this.#productService.updateProduct(id, data);
      this.#fetchedProducts.reload();
    } catch (error) {
      throw error;
    }
  }

  async deleteProduct(id: string) {
    try {
      await this.#productService.deleteProduct(id);
      this.#fetchedProducts.reload();
    } catch (error) {
      throw error;
    }
  }
}
