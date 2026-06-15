import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
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
    ).pipe(
      map(res => {
        if (res && res.data) {
          res.data = res.data.map(fav => {
            if (fav.product) {
              const prod = fav.product as any;
              if (!prod.price && prod.prices) {
                prod.price = {
                  listPrice: prod.prices.tarjeta_credito_debito || 0,
                  card_ticket1PayPrice: prod.prices.tarjeta_credito_debito || 0,
                  cashTransferPrice: prod.prices.efectivo_transferencia || 0,
                  discountPercentageTransfer: 0,
                  installments: {
                    threePaymentsAmount: prod.prices.cuotas?.cuotas_3_si || 0,
                    sixPaymentsAmount: prod.prices.cuotas?.cuotas_6_si || 0,
                    hasThreeInstallmentsSeamless: true,
                    hasSixInstallmentsSeamless: true
                  }
                };
              }
              delete prod.prices;
            }
            return fav;
          });
        }
        return res;
      })
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
