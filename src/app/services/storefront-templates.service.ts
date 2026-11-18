import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  IStorefrontTemplatesResponse,
  ITenantStorefrontSummary,
  ITenantStorefrontTemplateItem,
} from '../interfaces/storefront-templates.interface';

@Injectable({ providedIn: 'root' })
export class StorefrontTemplatesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/addons/storefront-templates`;

  async getTemplates(): Promise<{
    storefront: ITenantStorefrontSummary;
    templates: ITenantStorefrontTemplateItem[];
  }> {
    const res = await firstValueFrom(
      this.http.get<IStorefrontTemplatesResponse>(this.baseUrl)
    );
    if (!res?.success || !Array.isArray(res?.data?.templates)) {
      throw new Error('La respuesta de /addons/storefront-templates es inválida.');
    }
    return {
      storefront: res.data.storefront ?? {},
      templates: res.data.templates,
    };
  }

  async activateTemplate(templateKey: string): Promise<{
    storefront: ITenantStorefrontSummary;
    templates: ITenantStorefrontTemplateItem[];
  }> {
    const res = await firstValueFrom(
      this.http.put<IStorefrontTemplatesResponse>(`${this.baseUrl}/activate`, {
        templateKey,
      })
    );
    if (!res?.success || !Array.isArray(res?.data?.templates)) {
      throw new Error(res?.message || 'No se pudo activar la plantilla.');
    }
    return {
      storefront: res.data.storefront ?? {},
      templates: res.data.templates,
    };
  }

  async saveTemplateSettings(
    settings: Record<string, unknown>
  ): Promise<ITenantStorefrontSummary> {
    const res = await firstValueFrom(
      this.http.put<IStorefrontTemplatesResponse>(`${this.baseUrl}/settings`, {
        settings,
      })
    );
    if (!res?.success) {
      throw new Error(res?.message || 'No se pudieron guardar los ajustes de la plantilla.');
    }
    return res.data?.storefront ?? {};
  }

  async updateDomain(payload: {
    customDomain?: string | null;
    domainMode?: 'vexx_subdomain' | 'custom_domain';
  }): Promise<{
    storefront: ITenantStorefrontSummary;
    dnsInstructions?: string[];
  }> {
    const res = await firstValueFrom(
      this.http.put<IStorefrontTemplatesResponse>(`${this.baseUrl}/domain`, payload)
    );
    if (!res?.success) {
      throw new Error(res?.message || 'No se pudo actualizar el dominio.');
    }
    return {
      storefront: res.data?.storefront ?? {},
      dnsInstructions: res.data?.dnsInstructions,
    };
  }
}
