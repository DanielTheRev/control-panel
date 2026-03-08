import { computed, inject, Injectable, signal } from '@angular/core';
import { ConfigService } from '../services/config.service';
import { IEcommerceConfig } from '../interfaces/config.interface';
import { NotificationsService } from '../services/notifications.service';

@Injectable({
  providedIn: 'root'
})
export class ConfigStateService {
  #configService = inject(ConfigService);
  #notificationService = inject(NotificationsService);

  private configSignal = signal<IEcommerceConfig | null>(null);
  private loadingSignal = signal<boolean>(false);
  private errorSignal = signal<boolean>(false);

  readonly config = computed(() => this.configSignal());
  readonly isLoading = computed(() => this.loadingSignal());
  readonly hasError = computed(() => this.errorSignal());

  async loadConfig() {
    this.loadingSignal.set(true);
    this.errorSignal.set(false);
    try {
      const config = await this.#configService.getConfig();
      this.configSignal.set(config);
    } catch (error) {
      console.error('Error loading config', error);
      this.errorSignal.set(true);
      this.#notificationService.error('Error al cargar la configuración de la tienda');
    } finally {
      this.loadingSignal.set(false);
    }
  }

  async saveConfig(newConfig: IEcommerceConfig) {
    this.loadingSignal.set(true);
    try {
      const savedConfig = await this.#configService.updateConfig(newConfig);
      this.configSignal.set(savedConfig);
      this.#notificationService.success('Configuración guardada correctamente');
      return true;
    } catch (error) {
      console.error('Error saving config', error);
      this.#notificationService.error('Error al guardar la configuración');
      return false;
    } finally {
      this.loadingSignal.set(false);
    }
  }
}
