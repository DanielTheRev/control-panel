import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { IHeroSlide } from '../core/interfaces/home.interface';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class HeroService {
  #http = inject(HttpClient);
  readonly apiUrl = `${environment.apiUrl}/hero`;

  getById(id: string) {
    return firstValueFrom(this.#http.get<IHeroSlide>(`${this.apiUrl}/${id}`));
  }

  create(slide: FormData) {
    return firstValueFrom(this.#http.post<IHeroSlide>(this.apiUrl, slide));
  }

  update(id: string, slide: FormData) {
    return firstValueFrom(this.#http.put<Partial<IHeroSlide>>(`${this.apiUrl}/${id}`, slide));
  }

  delete(id: string) {
    return firstValueFrom(this.#http.delete(`${this.apiUrl}/${id}`));
  }
}
