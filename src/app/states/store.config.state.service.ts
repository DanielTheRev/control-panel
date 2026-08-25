import { computed, inject, Injectable, signal } from '@angular/core';
import { StoreConfigService } from '../services/store.config.service';
import { IEcommerceConfig } from '../interfaces/config.interface';
import { NotificationsService } from '../services/notifications.service';
import { httpResource } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class StoreConfigStateService {
  #configService = inject(StoreConfigService);
  #notificationService = inject(NotificationsService);
  #RsState = httpResource<IEcommerceConfig>(() => ({
    url: this.#configService.getConfigString(),
  }), {
    parse: value => {
      console.log(value);
      return value as any
    }
  })

  readonly StoreConfig = computed(() => ({
    hasData: this.#RsState.hasValue(),
    hasError: this.#RsState.error(),
    isLoading: this.#RsState.isLoading(),
    config: this.#RsState.value()!,
  }))

  signMercadoPago() {
    const clientId = this.#configService.getMasterClientID();
    const tenantSlug = this.#configService.getTenantID() || localStorage.getItem('lastTenantSlug') || 'vura';
    const redirectUri = 'https://www.vura.com.ar/api/config/mercadopago/callback';

    const authUrl = `https://auth.mercadopago.com/authorization?client_id=${clientId}&response_type=code&platform_id=mp&redirect_uri=${encodeURIComponent(redirectUri)}&state=${tenantSlug}`;
    window.location.href = authUrl;
  }


  async saveConfig(newConfig: Partial<IEcommerceConfig>): Promise<{ success: boolean; shouldRecalculate: boolean }> {
    try {
      const response = await this.#configService.updateConfig(newConfig);
      this.#notificationService.success('Configuración guardada correctamente');
      return { success: true, shouldRecalculate: response.shouldRecalculate };
    } catch (error) {
      console.error('Error saving config', error);
      this.#notificationService.error('Error al guardar la configuración');
      return { success: false, shouldRecalculate: false };
    } finally {
      this.#RsState.reload()
    }
  }

  async uploadLogo(file: File): Promise<boolean> {
    try {
      await this.#configService.uploadLogo(file);
      this.#notificationService.success('Logo de la tienda actualizado');
      this.#RsState.reload();
      return true;
    } catch (error) {
      console.error('Error uploading logo', error);
      this.#notificationService.error('Error al subir el logotipo');
      return false;
    }
  }

  async recalculateAllPrices(): Promise<boolean> {
    try {
      await this.#configService.recalculatePrices();
      this.#notificationService.success('Precios recalculados correctamente');
      return true;
    } catch (error) {
      console.error('Error recalculating prices', error);
      this.#notificationService.error('Error al recalcular los precios');
      return false;
    }
  }
}
