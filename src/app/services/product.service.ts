import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment.development';
import { HttpClient } from '@angular/common/http';
import { IProduct, IProductPrices } from '../interfaces/product.interface';
import { IPaginatedResult } from '../interfaces/pagination.interface';
import { firstValueFrom, Observable } from 'rxjs';
import { HotToastService } from '@ngxpert/hot-toast';

@Injectable({
  providedIn: 'root'
})
export class ProductService {

  #apiUrl = `${environment.apiUrl}/products`;
  #http = inject(HttpClient);
  #toast = inject(HotToastService);
  constructor() { }

  getProduct(id: string) {
    return firstValueFrom(this.#http.get<IProduct>(`${this.#apiUrl}/complete/${id}`).pipe(
      this.#toast.observe({
        error: {
          content: 'Error al obtener el producto',
          icon: '❌',
          position: 'top-right',
          theme: 'snackbar',
        }
      })
    ));
  }

  getProducts(page: number = 1, limit: number = 10, type?: string) {
    const params: any = { page, limit };
    if (type) params.type = type;
    return firstValueFrom(this.#http.get<IPaginatedResult<IProduct>>(`${this.#apiUrl}/list`, { params }));
  }

  create(productData: FormData) {
    return firstValueFrom(this.#http.post<IProduct>(`${this.#apiUrl}`, productData).pipe(
      this.#toast.observe({
        loading: {
          content: 'Creando producto...',
          icon: '⏳',
          position: 'top-right',
          theme: 'snackbar',
        },
        success: {
          content: 'Producto creado correctamente',
          icon: '✅',
          position: 'top-right',
          theme: 'snackbar',
        },
        error: {
          content: 'Error al crear el producto',
          icon: '❌',
          position: 'top-right',
          theme: 'snackbar',
        }
      })
    ));
  }

  updateProduct(id: string, product: FormData) {
    return firstValueFrom(this.#http.patch<any>(`${this.#apiUrl}/${id}`, product).pipe(
      this.#toast.observe({
        loading: {
          content: 'Actualizando producto...',
          icon: '⏳',
          position: 'top-right',
          theme: 'snackbar',
        },
        success: {
          content: 'Producto actualizado correctamente',
          icon: '✅',
          position: 'top-right',
          theme: 'snackbar',
        },
        error: {
          content: 'Error al actualizar el producto',
          icon: '❌',
          position: 'top-right',
          theme: 'snackbar',
        }
      })
    ));
  }

  calculatePrices(costPrice: number): Observable<IProductPrices> {
    return this.#http.post<IProductPrices>(`${this.#apiUrl}/calculate-prices`, { costPrice })
  }

  deleteProduct(id: string) {
    return firstValueFrom(this.#http.delete(`${this.#apiUrl}/${id}`).pipe(
      this.#toast.observe({
        loading: 'Eliminando producto...',
        success: 'Producto eliminado correctamente',
        error: 'Error al eliminar el producto',
      })
    ));
  }
}