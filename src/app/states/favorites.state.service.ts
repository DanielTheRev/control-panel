import { httpResource } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../environments/environment';
import {
  FavoritesApiResponse,
  IFavoritesByProduct,
  INotifyStockResult,
} from '../interfaces/favorites.interface';
import { AuthService } from '../services/auth.service';
import { FavoritesService } from '../services/favorites.service';

@Injectable({
  providedIn: 'root',
})
export class FavoritesStateService {
  private favoritesService = inject(FavoritesService);
  private auth = inject(AuthService);

  // ── httpResource: GET automático ligado a autenticación ──
  private resource = httpResource<FavoritesApiResponse<IFavoritesByProduct[]>>(() => {
    if (!this.auth.isAuthenticated()) return;
    return {
      url: `${this.favoritesService.endpoint}/by-product`,
    };
  });

  // ── Computed principal: estado consolidado ──
  readonly state = computed(() => ({
    data: this.resource.value()?.data ?? [],
    isLoading: this.resource.isLoading(),
    hasError: !!this.resource.error(),
    hasData: (this.resource.value()?.data?.length ?? 0) > 0,
    error: this.resource.error(),
    count: this.resource.value()?.count ?? 0,
  }));

  // ── Signal para trackear envíos en curso por productId ──
  private _notifying = signal<Record<string, boolean>>({});
  readonly notifying = this._notifying.asReadonly();

  // ── Signal para resultados de notificación por productId ──
  private _notifyResults = signal<Record<string, { success: boolean; message: string }>>({});
  readonly notifyResults = this._notifyResults.asReadonly();

  // ── Métodos privados ──

  private async _notifyStock(productId: string): Promise<FavoritesApiResponse<INotifyStockResult>> {
    return await firstValueFrom(this.favoritesService.notifyBackInStock(productId));
  }

  // ── Métodos públicos ──

  /** Envía la notificación de stock a todos los usuarios que tienen el producto en favoritos */
  async notifyBackInStock(productId: string): Promise<void> {
    // Marcar como enviando
    this._notifying.update(prev => ({ ...prev, [productId]: true }));
    // Limpiar resultado anterior
    this._notifyResults.update(prev => {
      const copy = { ...prev };
      delete copy[productId];
      return copy;
    });

    try {
      const response = await this._notifyStock(productId);
      this._notifyResults.update(prev => ({
        ...prev,
        [productId]: {
          success: true,
          message: response.message ?? `${response.data.sentCount} emails enviados`,
        },
      }));
    } catch (error: any) {
      this._notifyResults.update(prev => ({
        ...prev,
        [productId]: {
          success: false,
          message: error?.error?.message ?? 'Error al enviar notificaciones',
        },
      }));
    } finally {
      this._notifying.update(prev => ({ ...prev, [productId]: false }));
    }
  }

  /** Refresca los datos del resource */
  refresh(): void {
    this.resource.reload();
  }
}
