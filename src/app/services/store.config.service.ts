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

  async uploadLogo(file: File): Promise<{ success: boolean; logoUrl: string }> {
    const formData = new FormData();
    formData.append('logo', file);
    return firstValueFrom(
      this.#http.patch<{ success: boolean; logoUrl: string }>(
        `${environment.apiUrl}/config/logo`,
        formData,
        { withCredentials: true }
      )
    );
  }

  async previewRecalculatePrices(onlyActive: boolean = true): Promise<{
    success: boolean;
    totalProducts: number;
    onlyActive: boolean;
    dolar: number;
    quoteType: string;
    items: Array<{
      _id: string;
      model: string;
      brand: string;
      image: string;
      isActive: boolean;
      oldPrice: {
        cashTransferPrice: number;
        cardPrice: number;
        installments?: { count: number; amount: number };
      };
      newPrice: {
        cashTransferPrice: number;
        cardPrice: number;
        installments?: { count: number; amount: number };
      };
      diff: {
        cashDiff: number;
        cashDiffPercent: number;
        cardDiff: number;
        cardDiffPercent: number;
      };
    }>;
  }> {
    return firstValueFrom(this.#http.post<any>(`${this.#apiUrl}/recalculate-preview`, { onlyActive }));
  }

  async recalculatePrices(onlyActive: boolean = true): Promise<{ success: boolean; message: string; updatedCount: number }> {
    return firstValueFrom(this.#http.post<{ success: boolean; message: string; updatedCount: number }>(`${this.#apiUrl}/recalculate-prices`, { onlyActive }));
  }

  async updateMPConfig(config: Partial<IUpdateMPConfigDTO>) {
    return firstValueFrom(this.#http.put<IUpdateMPConfigDTO>(`${this.#apiUrl}/mercadopago`, config));
  }

  async getMercadoPagoMethods(): Promise<IAggregatedPaymentMethodsResponse['automaticGateways']['mercadopago']['availableMethods']> {
    const response = await firstValueFrom(this.#http.get<IAggregatedPaymentMethodsResponse>(`${this.#apiUrl}/mercadopago-methods`));
    return response.automaticGateways.mercadopago.availableMethods;
  }

  async getDolares(refresh = false): Promise<import('../interfaces/config.interface').IDolarRate[]> {
    return firstValueFrom(
      this.#http.get<import('../interfaces/config.interface').IDolarRate[]>(`${this.#apiUrl}/dolares`, {
        params: refresh ? { refresh: 'true' } : {}
      })
    );
  }

  async getRecommendationsConfig(): Promise<{
    limit: number;
    rules: Record<string, string[]>;
    defaultRules: Record<string, string[]>;
    availableCategories: string[];
  }> {
    return firstValueFrom(
      this.#http.get<{
        limit: number;
        rules: Record<string, string[]>;
        defaultRules: Record<string, string[]>;
        availableCategories: string[];
      }>(`${this.#apiUrl}/recommendations`)
    );
  }

  async updateRecommendationsConfig(payload: {
    limit: number;
    rules: Record<string, string[]>;
  }): Promise<{
    success: boolean;
    data: { limit: number; rules: Record<string, string[]> };
  }> {
    return firstValueFrom(
      this.#http.put<{
        success: boolean;
        data: { limit: number; rules: Record<string, string[]> };
      }>(`${this.#apiUrl}/recommendations`, payload)
    );
  }

  async sendTestEmail(templateKey: string, recipientEmail: string): Promise<{ success: boolean; message: string }> {
    return firstValueFrom(
      this.#http.post<{ success: boolean; message: string }>(`${this.#apiUrl}/test-email`, {
        templateKey,
        recipientEmail
      })
    );
  }

  async getConnectionSettings(): Promise<{
    apiKey: string;
    allowedOrigins: string[];
    subscriptionStatus: string;
    slug: string;
    name: string;
  }> {
    return firstValueFrom(
      this.#http.get<{
        apiKey: string;
        allowedOrigins: string[];
        subscriptionStatus: string;
        slug: string;
        name: string;
      }>(`${this.#apiUrl}/connection`)
    );
  }

  async regenerateApiKey(): Promise<{ success: boolean; apiKey: string; message: string }> {
    return firstValueFrom(
      this.#http.post<{ success: boolean; apiKey: string; message: string }>(`${this.#apiUrl}/connection/regenerate-key`, {})
    );
  }

  async updateAllowedOrigins(allowedOrigins: string[]): Promise<{ success: boolean; allowedOrigins: string[]; message: string }> {
    return firstValueFrom(
      this.#http.put<{ success: boolean; allowedOrigins: string[]; message: string }>(`${this.#apiUrl}/connection/allowed-origins`, { allowedOrigins })
    );
  }
}
