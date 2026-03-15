import { httpResource } from '@angular/common/http';
import { computed, inject, Injectable } from '@angular/core';
import { IPaymentMethod } from '../interfaces/paymentInfo.interface';
import { PaymentMethodsService } from '../services/payment-methods.service';
import { IAggregatedPaymentMethodsResponse, IUpdateMPConfigDTO } from '../interfaces/mercadopago.interface';
import { StoreConfigService } from '../services/store.config.service';

@Injectable({
  providedIn: 'root'
})
export class PaymentMethodsStateService {
  #paymentService = inject(PaymentMethodsService);
  #storeConfigService = inject(StoreConfigService);

  #state = httpResource<IAggregatedPaymentMethodsResponse>(() => {
    return {
      url: `${this.#paymentService.apiUrl}`, // GET /api/payment-methods
      method: 'GET',
    };
  });

  readonly state = computed(() => ({
    manualMethods: this.#state.value()?.manualMethods || [],
    automaticGateways: this.#state.value()?.automaticGateways || {
        mercadopago: {
            active: false,
            availableMethods: [],
            excludedPaymentMethods: [],
            excludedPaymentTypes: []
        }
    },
    isLoading: this.#state.isLoading(),
    error: this.#state.error(),
    hasValue: this.#state.hasValue(),
  }))

  refresh() {
    this.#state.reload();
  }

  async getPaymentMethodByID(id: string) {
    return this.#paymentService.getById(id);
  }

  async addPaymentMethod(paymentMethod: any) {
    try {
      const newPaymentMethod = await this.#paymentService.create(paymentMethod);
      this.refresh(); // Reload to get aggregated state
    } catch (error) {
      throw error
    }
  }

  async updatePaymentMethod(id: string, paymentMethod: any) {
    try {
      await this.#paymentService.update(id, paymentMethod);
      this.refresh(); // Reload to get aggregated state
    } catch (error) {
      throw error
    }
  }

  async deletePaymentMethod(id: string) {
    try {
      await this.#paymentService.delete(id);
      this.refresh(); // Reload to get aggregated state
    } catch (error) {
      throw error
    }
  }

  async updateMPConfig(config: IUpdateMPConfigDTO) {
    try {
      await this.#storeConfigService.updateConfig(config as any); // Sending to /api/ecommerce/config
      this.refresh();
    } catch (error) {
      throw error;
    }
  }
}