import { computed, inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { httpResource } from '@angular/common/http';
import { IPaymentMethod } from '../interfaces/paymentInfo.interface';
import { PaymentMethodsService } from '../services/payment-methods.service';

@Injectable({
  providedIn: 'root'
})
export class PaymentMethodsStateService {
  #apiUrl = `${environment.apiUrl}/payment-methods`;
  #paymentService = inject(PaymentMethodsService);
  #state = httpResource<IPaymentMethod[]>(() => {
    return {
      url: `${this.#apiUrl}`,
      method: 'GET',
    };
  });

  readonly state = computed(() => ({
    data: this.#state.value() || [],
    isLoading: this.#state.isLoading(),
    error: this.#state.error(),
    hasValue: this.#state.hasValue(),
  }))

  refresh() {
    this.#state.reload();
  }

  async addPaymentMethod(paymentMethod: IPaymentMethod) {
    try {
      const newPaymentMethod = await this.#paymentService.create(paymentMethod);
      this.#addPaymentMethod(newPaymentMethod);
    } catch (error) {
      throw error
    }
  }

  async updatePaymentMethod(id: string, paymentMethod: Partial<IPaymentMethod>) {
    try {
      const updatedPaymentMethod = await this.#paymentService.update(id, paymentMethod);
      this.#updatePaymentMethod(id, updatedPaymentMethod);
    } catch (error) {
      throw error
    }
  }

  async deletePaymentMethod(id: string) {
    try {
      await this.#paymentService.delete(id);
      this.#deletePaymentMethod(id);
    } catch (error) {
      throw error
    }
  }

  #addPaymentMethod(paymentMethod: IPaymentMethod) {
    this.#state.update((oldState) => {
      if (!oldState) return oldState;
      return [...oldState, paymentMethod];
    });
  }

  #updatePaymentMethod(id: string, paymentMethod: Partial<IPaymentMethod>) {
    this.#state.update((oldState) => {
      if (!oldState) return oldState;
      return oldState.map((p) => (p._id === id ? { ...p, ...paymentMethod } : p));
    });
  }

  #deletePaymentMethod(id: string) {
    this.#state.update((oldState) => {
      if (!oldState) return oldState;
      return oldState.filter((p) => p._id !== id);
    });
  }
}