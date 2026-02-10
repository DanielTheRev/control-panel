import { computed, inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { httpResource } from '@angular/common/http';
import { IShippingOption } from '../interfaces/shipping.interface';
import { ShippingOptionsService } from '../services/shipping-options.service';

@Injectable({
  providedIn: 'root'
})
export class ShippingOptionsStateService {
  #shippingOptionsService = inject(ShippingOptionsService);

  #shippingOptions = httpResource<IShippingOption[]>(() => {
    return {
      url: `${this.#shippingOptionsService.apiUrl}/all`,
      method: 'GET',
    };
  });

  readonly state = computed(() => ({
    data: this.#shippingOptions.value() || [],
    isLoading: this.#shippingOptions.isLoading(),
    error: this.#shippingOptions.error(),
    hasValue: this.#shippingOptions.hasValue(),
  }))

  refresh() {
    this.#shippingOptions.reload();
  }

  getShippingOptionByID(id: string) {
    return this.#shippingOptionsService.getById(id);
  }


  async addShippingOption(shippingOption: Omit<IShippingOption, '_id'>) {
    try {
      const newShippingOption = await this.#shippingOptionsService.create(shippingOption);
      this.#addShippingOption(newShippingOption);
    } catch (error) {
      throw error;
    }
  }

  async updateShippingOption(id: string, shippingOption: Partial<IShippingOption>) {
    try {
      const updatedShippingOption = await this.#shippingOptionsService.update(id, shippingOption);
      this.#updateShippingOption(id, updatedShippingOption);
    } catch (error) {
      throw error;
    }
  }

  async deleteShippingOption(id: string) {
    try {
      await this.#shippingOptionsService.delete(id);
      this.#deleteShippingOption(id);
    } catch (error) {
      throw error;
    }
  }

  #addShippingOption(shippingOption: IShippingOption) {
    this.#shippingOptions.update((oldState) => {
      if (!oldState) return oldState;
      return [...oldState, shippingOption];
    });
  }

  #updateShippingOption(id: string, shippingOption: Partial<IShippingOption>) {
    this.#shippingOptions.update((oldState) => {
      if (!oldState) return oldState;
      return oldState.map((s) => (s._id === id ? { ...s, ...shippingOption } : s));
    });
  }

  #deleteShippingOption(id: string) {
    this.#shippingOptions.update((oldState) => {
      if (!oldState) return oldState;
      return oldState.filter((s) => s._id !== id);
    });
  }
}