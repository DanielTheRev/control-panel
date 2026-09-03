import { computed, inject, Injectable, signal } from '@angular/core';
import { StoreConfigService } from '../services/store.config.service';
import { IEcommerceConfig } from '../interfaces/config.interface';
import { NotificationsService } from '../services/notifications.service';
import { DebugService } from '../services/debug.service';
import { httpResource } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class StoreConfigStateService {
  #configService = inject(StoreConfigService);
  #notificationService = inject(NotificationsService);
  #debug = inject(DebugService);
  #RsState = httpResource<IEcommerceConfig>(() => ({
    url: this.#configService.getConfigString(),
  }), {
    parse: value => value as any
  });

  readonly StoreConfig = computed(() => ({
    hasData: this.#RsState.hasValue(),
    hasError: this.#RsState.error(),
    isLoading: this.#RsState.isLoading(),
    config: this.#RsState.value()!,
  }));

  refresh() {
    this.#RsState.reload();
  }

  connectionSettings = signal<{
    apiKey: string;
    allowedOrigins: string[];
    subscriptionStatus: string;
    slug: string;
    name: string;
  } | null>(null);
  isLoadingConnection = signal(false);

  async loadConnectionSettings() {
    this.isLoadingConnection.set(true);
    try {
      const data = await this.#configService.getConnectionSettings();
      this.connectionSettings.set(data);
    } catch (error) {
      this.#debug.error('Error loading connection settings', error);
      this.#notificationService.error('Error al cargar la llave de conexión');
    } finally {
      this.isLoadingConnection.set(false);
    }
  }

  async regenerateApiKey(): Promise<boolean> {
    try {
      const res = await this.#configService.regenerateApiKey();
      if (res.success && this.connectionSettings()) {
        this.connectionSettings.update(curr => curr ? { ...curr, apiKey: res.apiKey } : null);
        this.#notificationService.success('Nueva llave de conexión generada exitosamente');
        return true;
      }
      return false;
    } catch (error) {
      this.#debug.error('Error regenerating API key', error);
      this.#notificationService.error('Error al regenerar la llave de conexión');
      return false;
    }
  }

  async updateAllowedOrigins(origins: string[]): Promise<boolean> {
    try {
      const res = await this.#configService.updateAllowedOrigins(origins);
      if (res.success && this.connectionSettings()) {
        this.connectionSettings.update(curr => curr ? { ...curr, allowedOrigins: res.allowedOrigins } : null);
        this.#notificationService.success('Dominios autorizados actualizados');
        return true;
      }
      return false;
    } catch (error) {
      this.#debug.error('Error updating allowed origins', error);
      this.#notificationService.error('Error al actualizar dominios');
      return false;
    }
  }

  signMercadoPago() {
    const clientId = this.#configService.getMasterClientID();
    const tenantSlug = this.#configService.getTenantID() || localStorage.getItem('lastTenantSlug') || 'vura';
    const redirectUri = 'https://api.vura.com.ar/config/mercadopago/callback';

    const authUrl = `https://auth.mercadopago.com/authorization?client_id=${clientId}&response_type=code&platform_id=mp&redirect_uri=${encodeURIComponent(redirectUri)}&state=${tenantSlug}`;
    window.location.href = authUrl;
  }

  async saveConfig(newConfig: Partial<IEcommerceConfig>): Promise<{ success: boolean; shouldRecalculate: boolean }> {
    try {
      const response = await this.#configService.updateConfig(newConfig);
      this.#notificationService.success('Configuración guardada correctamente');
      return { success: true, shouldRecalculate: response.shouldRecalculate };
    } catch (error) {
      this.#debug.error('Error saving config', error);
      this.#notificationService.error('Error al guardar la configuración');
      return { success: false, shouldRecalculate: false };
    } finally {
      this.#RsState.reload();
    }
  }

  async uploadLogo(file: File): Promise<boolean> {
    try {
      await this.#configService.uploadLogo(file);
      this.#notificationService.success('Logo de la tienda actualizado');
      this.#RsState.reload();
      return true;
    } catch (error) {
      this.#debug.error('Error uploading logo', error);
      this.#notificationService.error('Error al subir el logotipo');
      return false;
    }
  }

  async recalculatePrices(): Promise<boolean> {
    try {
      const response = await this.#configService.recalculatePrices();
      this.#notificationService.success(response.message || 'Precios recalculados correctamente');
      return true;
    } catch (error) {
      this.#debug.error('Error recalculating prices', error);
      this.#notificationService.error('Error al recalcular los precios');
      return false;
    }
  }

  async getDolares(refresh = false) {
    try {
      return await this.#configService.getDolares(refresh);
    } catch (error) {
      this.#debug.error('Error fetching dolar quotes', error);
      return [];
    }
  }
}
