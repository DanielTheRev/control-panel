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
  /**
   * @description Calcula los precios del producto
   * @param data
   * @param data.costPrice Precio de costo del producto
   * @param data.customProfitMargin1Pay Ganancia personalizada para pago en 1 cuota
   * @param data.customProfitMarginInstallments Ganancia personalizada para pago en cuotas
   */
  calculatePrices(data: { costPrice: number, customProfitMargin1Pay?: number | string, customProfitMarginInstallments?: number | string }): Observable<IProductPrices> {
    let payload = { ...data };
    if (payload.customProfitMargin1Pay !== undefined && payload.customProfitMargin1Pay !== null && payload.customProfitMargin1Pay !== '') {
      payload.customProfitMargin1Pay = Number(payload.customProfitMargin1Pay);
    }
    if (payload.customProfitMarginInstallments !== undefined && payload.customProfitMarginInstallments !== null && payload.customProfitMarginInstallments !== '') {
      payload.customProfitMarginInstallments = Number(payload.customProfitMarginInstallments);
    }
    return this.#http.post<IProductPrices>(`${this.#apiUrl}/calculate-prices`, payload).pipe(
      this.#toast.observe({
        loading: {
          content: 'Calculando precios...',
          icon: '⏳',
          position: 'top-right',
          theme: 'snackbar',
        },
        success: {
          content: 'Precios calculados correctamente',
          icon: '✅',
          position: 'top-right',
          theme: 'snackbar',
        },
        error: {
          content: 'Error al calcular los precios',
          icon: '❌',
          position: 'top-right',
          theme: 'snackbar',
        }
      })
    )
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

  searchProducts(query: string): Observable<IPaginatedResult<any>> {
    return this.#http.get<IPaginatedResult<any>>(`${this.#apiUrl}/search`, {
      params: { q: query },
    });
  }

  getSuggestions(query: string): Observable<any[]> {
    return this.#http.get<any[]>(`${this.#apiUrl}/search`, {
      params: { q: query, suggestions: 'true' },
    });
  }
}