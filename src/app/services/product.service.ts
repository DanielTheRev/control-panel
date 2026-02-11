import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment.development';
import { HttpClient } from '@angular/common/http';
import { IProduct, IProductPrices } from '../interfaces/product.interface';
import { firstValueFrom, map, Observable } from 'rxjs';
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
        loading: 'Obteniendo producto...',
        success: 'Producto obtenido correctamente',
        error: 'Error al obtener el producto',
      })
    ));
  }

  create(productData: FormData) {
    return firstValueFrom(this.#http.post<IProduct>(`${this.#apiUrl}`, productData).pipe(
      this.#toast.observe({
        loading: 'Creando producto...',
        success: 'Producto creado correctamente',
        error: 'Error al crear el producto',
      })
    ));
  }

  updateProduct(id: string, product: FormData) {
    return firstValueFrom(this.#http.patch<any>(`${this.#apiUrl}/${id}`, product).pipe(
      this.#toast.observe({
        loading: 'Actualizando producto...',
        success: 'Producto actualizado correctamente',
        error: 'Error al actualizar el producto',
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