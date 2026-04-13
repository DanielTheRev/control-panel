import { httpResource, HttpResourceRef } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { environment } from '../../environments/environment';
import { IProduct, ProductType } from '../interfaces/product.interface';
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
      url: `${environment.apiUrl}/products/admin/list`,
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

  // readonly categories = signal(Object.values(IProductCategories));

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

  /**
   * @description Calcula los precios del producto
   * @param data
   * @param data.costPrice Precio de costo del producto
   * @param data.useCustomProfit1Pay Ganancia personalizada para pago en 1 cuota
   * @param data.useCustomProfitInstallments Ganancia personalizada para pago en cuotas
   */
  calculatePrices(data: { costPrice: number, customProfitMargin1Pay: number | string, customProfitMarginInstallments: number | string }) {
    return this.#productService.calculatePrices(data);
  }

  async createProduct(data: FormData) {
    try {
      const product = await this.#productService.create(data);
      this.#addProduct(product);
      return product._id
    } catch (error) {
      throw error;
    }
  }

  async updateProduct(id: string, data: FormData) {
    try {
      const response = await this.#productService.updateProduct(id, data);

      this.#updateProduct(response);
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
      this.#notificationService.success('Producto eliminado con éxito');
    } catch (error) {
      // 4. ROLLBACK: Si falla, restauramos el estado anterior
      this.#notificationService.error('No se pudo eliminar el producto, restaurando...');
      this.#fetchedProducts.set(previousState); // Reinstalamos la data vieja
    }
  }

  #addProduct(product: IProduct) {
    this.#fetchedProducts.update(state => {
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
    this.#fetchedProducts.update(state => {
      if (!state) return state;
      return {
        ...state,
        data: state.data.map(p => p._id === product._id ? { ...p, ...product } : p),
      };
    });
  }

  #deleteProductLocal(id: string) {
    this.#fetchedProducts.update(state => {
      if (!state) return state;
      return {
        ...state,
        data: state.data.filter(p => p._id !== id),
        pagination: {
          ...state.pagination,
          totalItems: state.pagination.totalItems - 1,
        },
      };
    });
  }
}
