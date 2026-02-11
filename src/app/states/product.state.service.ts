import { httpResource } from '@angular/common/http';
import { computed, inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { IProduct } from '../interfaces/product.interface';
import { ProductService } from '../services/product.service';
import { NotificationsService } from '../services/notifications.service';

@Injectable({
  providedIn: 'root',
})
export class ProductStoreService {
  #productService = inject(ProductService);
  #fetchedProducts = httpResource<IProduct[]>(() => ({
    url: `${environment.apiUrl}/products/list`,
    method: 'GET',
  }));
  #notificationService = inject(NotificationsService);

  readonly products = computed(() => ({
    data: this.#fetchedProducts.value() || [],
    hasData: this.#fetchedProducts.hasValue(),
    hasError: this.#fetchedProducts.error(),
    isLoading: this.#fetchedProducts.isLoading(),
    itemsCount: (this.#fetchedProducts.value() || []).length,
  }));

  async getProduct(id: string) {
    try {
      const product = await this.#productService.getProduct(id);
      return product;
    } catch (error) {
      this.#notificationService.error('Error al obtener el producto');
      throw error;
    }
  }

  calculatePrices(costPrice: number) {
    return this.#productService.calculatePrices(costPrice);
  }

  async createProduct(data: FormData) {
    try {
      const product = await this.#productService.create(data);
      this.#addProduct(product);
      // this.#notificationService.success('Producto creado correctamente');
    } catch (error) {
      // this.#notificationService.error('Error al crear el producto');
      throw error;
    }
  }

  async updateProduct(id: string, data: FormData) {
    try {
      const product = await this.#productService.updateProduct(id, data);
      this.#updateProduct(product);
      // this.#notificationService.success('Producto actualizado correctamente');
    } catch (error) {
      // this.#notificationService.error('Error al actualizar el producto');
      throw error;
    }
  }

  async deleteProduct(id: string) {
    try {
      await this.#productService.deleteProduct(id);
      this.#deleteProduct(id);
    } catch (error) {
      throw error;
    }
  }

  #addProduct(product: IProduct) {
    this.#fetchedProducts.update(state => {
      if (!state) return state;
      return [...state, product];
    });
  }

  #updateProduct(product: Partial<IProduct>) {
    this.#fetchedProducts.update(state => {
      if (!state) return state;
      return state.map(p => p._id === product._id ? { ...p, ...product } : p);
    });
  }

  #deleteProduct(id: string) {
    this.#fetchedProducts.update(state => {
      if (!state) return state;
      return state.filter(p => p._id !== id);
    });
  }
}
