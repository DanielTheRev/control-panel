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

  async updateConfig(config: Partial<IEcommerceConfig>) {
    return firstValueFrom(this.#http.put<IEcommerceConfig>(this.#apiUrl, config));
  }

  async updateMPConfig(config: Partial<IUpdateMPConfigDTO>) {
    return firstValueFrom(this.#http.put<IUpdateMPConfigDTO>(`${this.#apiUrl}/mercadopago`, config));
  }

  async getMercadoPagoMethods(): Promise<IAggregatedPaymentMethodsResponse['automaticGateways']['mercadopago']['availableMethods']> {
    const response = await firstValueFrom(this.#http.get<IAggregatedPaymentMethodsResponse>(`${this.#apiUrl}/mercadopago-methods`));
    return response.automaticGateways.mercadopago.availableMethods;
  }
}
