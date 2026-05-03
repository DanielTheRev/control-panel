import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  FavoritesApiResponse,
  IFavoritesByProduct,
  INotifyStockResult,
} from '../interfaces/favorites.interface';

@Injectable({
  providedIn: 'root',
})
export class FavoritesService {
  private _http = inject(HttpClient);

  /** Endpoint público para que otros servicios puedan conocer la URL base */
  readonly endpoint = `${environment.apiUrl}/favorites/admin`;

  /** Obtiene productos agrupados por cantidad de favoritos con sus usuarios */
  getFavoritesByProduct(): Observable<FavoritesApiResponse<IFavoritesByProduct[]>> {
    return this._http.get<FavoritesApiResponse<IFavoritesByProduct[]>>(
      `${this.endpoint}/by-product`
    );
  }

  /** Envía email de "volvió al stock" a todos los usuarios que tienen el producto en favoritos */
  notifyBackInStock(productId: string): Observable<FavoritesApiResponse<INotifyStockResult>> {
    return this._http.post<FavoritesApiResponse<INotifyStockResult>>(
      `${this.endpoint}/notify-stock/${productId}`,
      {}
    );
  }
}
