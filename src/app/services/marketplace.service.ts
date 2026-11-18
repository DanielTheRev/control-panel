import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  IMarketplaceData,
  IMarketplaceResponse,
  IPurchaseResponse,
} from '../interfaces/marketplace.interface';

@Injectable({ providedIn: 'root' })
export class MarketplaceService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/addons/marketplace`;

  async getMarketplace(): Promise<IMarketplaceData> {
    const res = await firstValueFrom(
      this.http.get<IMarketplaceResponse>(this.baseUrl)
    );
    if (!res?.success || !res?.data) {
      throw new Error('La respuesta de /addons/marketplace es inválida.');
    }
    return res.data;
  }

  async purchaseItem(
    kind: 'addon' | 'template',
    itemId: string
  ): Promise<{ status: 'pending' | 'approved' | 'rejected'; message?: string }> {
    const res = await firstValueFrom(
      this.http.post<IPurchaseResponse>(`${this.baseUrl}/purchase`, {
        kind,
        itemId,
      })
    );
    if (!res?.success) {
      throw new Error(res?.message || 'No se pudo procesar la solicitud.');
    }
    return {
      status: res.data?.status ?? 'pending',
      message: res.message,
    };
  }
}
