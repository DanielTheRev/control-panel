import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment.development';
import { HttpClient } from '@angular/common/http';
import { IProduct, IProductPrices } from '../interfaces/product.interface';
import { map, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ProductService {

  #apiUrl = environment.apiUrl;
  #http = inject(HttpClient);

  constructor() { }

  create(productData: FormData) {
    return this.#http.post(`${this.#apiUrl}/products`, productData);
  }

  updateProduct(id: string, product: FormData): Observable<IProduct> {
    return this.#http.put<any>(`${this.#apiUrl}/products/${id}`, product).pipe(
      map(response => response.data)
    );
  }

  calculatePrices(costPrice: number): Observable<IProductPrices> {
    return this.#http.post<IProductPrices>(`${this.#apiUrl}/products/calculate-prices`, { costPrice })
  }

  deleteProduct(id: string) {
    return this.#http.delete(`${this.#apiUrl}/products/${id}`);
  }
}