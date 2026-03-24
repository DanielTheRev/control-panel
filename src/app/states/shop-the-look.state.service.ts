import { httpResource, HttpResourceRef } from '@angular/common/http';
import { computed, inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment.development';
import { IShopTheLook } from '../interfaces/shop-the-look.interface';
import { ShopTheLookService } from '../services/shop-the-look.service';
import { NotificationsService } from '../services/notifications.service';

@Injectable({
  providedIn: 'root'
})
export class ShopTheLookStateService {
  #shopTheLookService = inject(ShopTheLookService);
  #notificationService = inject(NotificationsService);

  #fetchedCampaigns: HttpResourceRef<IShopTheLook[] | undefined>;

  constructor() {
    this.#fetchedCampaigns = httpResource<IShopTheLook[]>(() => ({
      url: `${environment.apiUrl}/shop-the-look`,
    }));
  }

  readonly campaigns = computed(() => {
    const data = this.#fetchedCampaigns.value();
    return {
      data: data || [],
      isLoading: this.#fetchedCampaigns.isLoading(),
      hasError: !!this.#fetchedCampaigns.error(),
      hasData: this.#fetchedCampaigns.hasValue(),
    };
  });

  async getCampaignById(id: string) {
    const localCampaign = this.campaigns().data.find(c => c._id === id);
    if (localCampaign) {
      return localCampaign;
    }

    try {
      return await this.#shopTheLookService.getById(id);
    } catch (error) {
      throw error;
    }
  }

  async createCampaign(data: FormData) {
    try {
      const response = await this.#shopTheLookService.create(data);
      this.#addCampaignLocal(response);
      return response;
    } catch (error) {
      throw error;
    }
  }

  async updateCampaign(id: string, data: FormData | Partial<IShopTheLook>) {
    try {
      const response = await this.#shopTheLookService.update(id, data);
      this.#updateCampaignLocal(response);
      return response;
    } catch (error) {
      throw error;
    }
  }

  async deleteCampaign(id: string) {
    const previousState = this.#fetchedCampaigns.value();
    this.#deleteCampaignLocal(id);
    try {
      await this.#shopTheLookService.delete(id);
      this.#fetchedCampaigns.reload();
    } catch (error) {
      this.#fetchedCampaigns.set(previousState);
      throw error;
    }
  }

  reload() {
    this.#fetchedCampaigns.reload();
  }

  #addCampaignLocal(campaign: IShopTheLook) {
    this.#fetchedCampaigns.update(state => {
      if (!state) return [campaign];
      return [...state, campaign];
    });
  }

  #updateCampaignLocal(campaign: IShopTheLook) {
    this.#fetchedCampaigns.update(state => {
      if (!state) return state;
      return state.map(c => c._id === campaign._id ? { ...c, ...campaign } : c);
    });
  }

  #deleteCampaignLocal(id: string) {
    this.#fetchedCampaigns.update(state => {
      if (!state) return state;
      return state.filter(c => c._id !== id);
    });
  }
}
