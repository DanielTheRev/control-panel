
import { httpResource } from "@angular/common/http";
import { computed, inject, Injectable } from "@angular/core";
import { IProvider, IProviderCreate } from "../interfaces/provider.interface";
import { ProviderService } from "../services/provider.service";

@Injectable({
  providedIn: 'root'
})
export class ProviderStateService {

  #providerService = inject(ProviderService);

  readonly #State = httpResource<IProvider[]>(() => ({
    url: this.#providerService.apiURL,
    method: 'GET'
  }))

  readonly ProviderState = computed(() => ({
    data: this.#State.value()!,
    isLoading: this.#State.isLoading(),
    hasError: this.#State.error(),
    hasData: this.#State.value() ? this.#State.value()!.length > 0 : false
  }))

  async createProvider(data: IProviderCreate) {
    const provider = await this.#providerService.createProvider(data);
    this.#addProvider(provider);
  }

  async updateProvider(id: string, data: Partial<IProvider>) {
    const provider = await this.#providerService.updateProvider(id, data);
    this.#updateProvider(provider);
  }

  reload() {
    this.#State.reload();
  }

  #addProvider(data: IProvider) {
    this.#State.update((state) => {
      if (!state) return [data];
      return [...state, data];
    })
  }

  #updateProvider(data: IProvider) {
    this.#State.update((state) => {
      if (!state) return [data];
      return state.map((provider) => provider._id === data._id ? data : provider);
    })
  }
}