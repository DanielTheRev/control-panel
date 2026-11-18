import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { IProductBundle, IProductBundleResponse } from '../interfaces/product-bundle.interface';

@Injectable({
  providedIn: 'root',
})
export class ProductBundleService {
  readonly #http = inject(HttpClient);
  readonly #apiUrl = `${environment.apiUrl}/product-bundles`;

  getAll(): Observable<IProductBundleResponse<IProductBundle[]>> {
    return this.#http.get<IProductBundleResponse<IProductBundle[]>>(this.#apiUrl);
  }

  getByIdOrSlug(idOrSlug: string): Observable<IProductBundleResponse<IProductBundle>> {
    return this.#http.get<IProductBundleResponse<IProductBundle>>(`${this.#apiUrl}/${idOrSlug}`);
  }

  create(payload: Partial<IProductBundle>): Observable<IProductBundleResponse<IProductBundle>> {
    return this.#http.post<IProductBundleResponse<IProductBundle>>(this.#apiUrl, payload);
  }

  update(id: string, payload: Partial<IProductBundle>): Observable<IProductBundleResponse<IProductBundle>> {
    return this.#http.put<IProductBundleResponse<IProductBundle>>(`${this.#apiUrl}/${id}`, payload);
  }

  delete(id: string): Observable<{ success: boolean; message: string }> {
    return this.#http.delete<{ success: boolean; message: string }>(`${this.#apiUrl}/${id}`);
  }
}
