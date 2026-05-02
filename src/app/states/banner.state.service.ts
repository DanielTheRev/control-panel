import { httpResource } from '@angular/common/http';
import { computed, inject, Injectable } from '@angular/core';
import { IBanner } from '../interfaces/banner.interface';
import { BannerService } from '../services/banner.service';

@Injectable({
  providedIn: 'root'
})
export class BannerStateService {
  #bannerService = inject(BannerService);

  #state = httpResource<IBanner[]>(() => {
    return {
      url: this.#bannerService.apiUrl,
      method: 'GET',
    };
  });

  readonly state = computed(() => ({
    banners: this.#state.value() || [],
    isLoading: this.#state.isLoading(),
    error: this.#state.error(),
    hasValue: this.#state.hasValue(),
  }))

  refresh() {
    this.#state.reload();
  }

  async getBannerById(id: string) {
    return this.#bannerService.getBannerById(id);
  }

  async addBanner(banner: IBanner | FormData) {
    try {
      const createdBanner = await this.#bannerService.createBanner(banner);
      this.#addBanner(createdBanner);
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  async updateBanner(id: string, banner: Partial<IBanner> | FormData) {
    try {
      const updatedBanner = await this.#bannerService.updateBanner(id, banner);
      this.#updateBanner(id, updatedBanner);
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  async deleteBanner(id: string) {
    try {
      await this.#bannerService.deleteBanner(id);
      this.#deleteBanner(id);
    } catch (error) {
      console.log(error);
    }
  }

  #addBanner(banner: IBanner) {
    this.#state.update((oldState) => {
      if (!oldState) return oldState;
      return [...oldState, banner];
    });
  }

  #updateBanner(id: string, banner: Partial<IBanner>) {
    this.#state.update((oldState) => {
      if (!oldState) return oldState;
      return oldState.map((b) => (b._id === id ? { ...b, ...banner } : b));
    });
  }

  #deleteBanner(id: string) {
    this.#state.update((oldState) => {
      if (!oldState) return oldState;
      return oldState.filter((b) => b._id !== id);
    });
  }

}