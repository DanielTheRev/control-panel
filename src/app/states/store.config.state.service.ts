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
  }),{
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

  async saveConfig(newConfig: IEcommerceConfig) {
    try {
      await this.#configService.updateConfig(newConfig);
      this.#notificationService.success('Configuración guardada correctamente');
      return true;
    } catch (error) {
      console.error('Error saving config', error);
      this.#notificationService.error('Error al guardar la configuración');
      return false;
    } finally {
      this.#RsState.reload()
    }
  }
}
