import { computed, inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { httpResource } from '@angular/common/http';
import { HeroService } from '../services/hero.service';
import { IHeroSlide } from '../interfaces/HeroSlide.interface';

@Injectable({
  providedIn: 'root'
})
export class HeroStateService {
  #heroService = inject(HeroService);

  #state = httpResource<IHeroSlide[]>(() => {
    return {
      url: this.#heroService.apiUrl,
      method: 'GET',
    }
  });

  readonly state = computed(() => {
    return {
      data: this.#state.value() || [],
      isLoading: this.#state.isLoading(),
      error: this.#state.error(),
      hasValue: this.#state.hasValue(),
    }
  })

  refresh() {
    this.#state.reload();
  }

  async getSlideById(id: string) {
    try {
      const slide = await this.#heroService.getById(id);
      return slide;
    } catch (error) {
      throw error;
    }
  }

  async addSlide(data: FormData) {
    try {
      const newSlide = await this.#heroService.create(data);
      this.#addSlide(newSlide);
    } catch (error) {
      throw error;
    }

  }

  async updateSlide(id: string, data: FormData) {
    try {
      const updatedSlide = await this.#heroService.update(id, data);
      this.#updateSlide(id, updatedSlide);
    } catch (error) {
      throw error;
    }
  }

  async deleteSlide(id: string) {
    try {
      await this.#heroService.delete(id);
      this.#deleteSlide(id);
    } catch (error) {
      throw error;
    }
  }

  #addSlide(slide: IHeroSlide) {
    this.#state.update((oldState) => {
      if (!oldState) return oldState;
      return [...oldState, slide];
    });
  }

  #updateSlide(id: string, slide: Partial<IHeroSlide>) {
    this.#state.update((oldState) => {
      if (!oldState) return oldState;
      return oldState.map((s) => (s._id === id ? { ...s, ...slide } : s));
    });
  }

  #deleteSlide(id: string) {
    this.#state.update((oldState) => {
      if (!oldState) return oldState;
      return oldState.filter((s) => s._id !== id);
    });
  }

}