import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment.development';
import { HttpClient } from '@angular/common/http';
import { IProduct, IProductPrices } from '../interfaces/product.interface';
import { firstValueFrom, map, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ProductService {

  #apiUrl = `${environment.apiUrl}/products`;
  #http = inject(HttpClient);

  constructor() { }

  getProduct(id: string) {
    return firstValueFrom(this.#http.get<IProduct>(`${this.#apiUrl}/complete/${id}`));
  }

  create(productData: FormData) {
    return firstValueFrom(this.#http.post<IProduct>(`${this.#apiUrl}`, productData));
  }

  updateProduct(id: string, product: FormData) {
    return firstValueFrom(this.#http.patch<any>(`${this.#apiUrl}/${id}`, product));
  }

  calculatePrices(costPrice: number): Observable<IProductPrices> {
    return this.#http.post<IProductPrices>(`${this.#apiUrl}/calculate-prices`, { costPrice })
  }

  deleteProduct(id: string) {
    return firstValueFrom(this.#http.delete(`${this.#apiUrl}/${id}`));
  }
}