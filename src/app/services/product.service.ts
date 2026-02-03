import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment.development';
import { HttpClient } from '@angular/common/http';
import { IProduct } from '../interfaces/product.interface';

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

  updateProduct(id: string, productData: FormData) {
    return this.#http.patch<Partial<IProduct>>(`${this.#apiUrl}/products/${id}`, productData);
  }

  deleteProduct(id: string) {
    return this.#http.delete(`${this.#apiUrl}/products/${id}`);
  }
}