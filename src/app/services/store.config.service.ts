import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { IEcommerceConfig } from '../interfaces/config.interface';
import { IAggregatedPaymentMethodsResponse, IUpdateMPConfigDTO } from '../interfaces/mercadopago.interface';
import { firstValueFrom } from 'rxjs';
import { getTenantSlug } from '../utils/tenant.utils';

@Injectable({
  providedIn: 'root'
})
export class StoreConfigService {
  #http = inject(HttpClient);
  #apiUrl = `${environment.apiUrl}/config`;
  #tenantID = getTenantSlug()
  #masterClientID = environment.MP_MASTER_CLIENT_ID;


  getConfigString() {
    return this.#apiUrl
  }

  getTenantID() {
    return this.#tenantID
  }

  getMasterClientID() {
    return this.#masterClientID
  }

  async updateConfig(config: Partial<IEcommerceConfig>): Promise<{ success: boolean; data: IEcommerceConfig; shouldRecalculate: boolean }> {
    return firstValueFrom(this.#http.put<{ success: boolean; data: IEcommerceConfig; shouldRecalculate: boolean }>(this.#apiUrl, config));
  }

  async recalculatePrices(): Promise<{ success: boolean; message: string }> {
    return firstValueFrom(this.#http.post<{ success: boolean; message: string }>(`${this.#apiUrl}/recalculate-prices`, {}));
  }

  async updateMPConfig(config: Partial<IUpdateMPConfigDTO>) {
    return firstValueFrom(this.#http.put<IUpdateMPConfigDTO>(`${this.#apiUrl}/mercadopago`, config));
  }

  async getMercadoPagoMethods(): Promise<IAggregatedPaymentMethodsResponse['automaticGateways']['mercadopago']['availableMethods']> {
    const response = await firstValueFrom(this.#http.get<IAggregatedPaymentMethodsResponse>(`${this.#apiUrl}/mercadopago-methods`));
    return response.automaticGateways.mercadopago.availableMethods;
  }
}
