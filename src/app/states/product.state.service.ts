import { httpResource } from '@angular/common/http';
import { computed, Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { IProduct } from '../interfaces/product.interface';

@Injectable({
  providedIn: 'root',
})
export class ProductStoreService {
  #fetchedProducts = httpResource<IProduct[]>(() => ({
    url: `${environment.apiUrl}/products/all`,
    method: 'GET',
  }));

  readonly products = computed(() => ({
    data: this.#fetchedProducts.value() || [],
    hasData: this.#fetchedProducts.hasValue(),
    hasError: this.#fetchedProducts.error(),
    isLoading: this.#fetchedProducts.isLoading(),
    itemsCount: (this.#fetchedProducts.value() || []).length,
  }));
}
