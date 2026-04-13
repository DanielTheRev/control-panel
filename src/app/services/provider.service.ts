
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { IProvider, IProviderCreate, IProviderUpdate } from '../interfaces/provider.interface';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ProviderService {
  readonly apiURL = `${environment.apiUrl}/provider`;
  #http = inject(HttpClient)


  updateProvider(id: string, provider: IProviderUpdate) {
    return firstValueFrom(this.#http.put<IProvider>(`${this.apiURL}/${id}`, provider));
  }

  createProvider(provider: IProviderCreate) {
    return firstValueFrom(this.#http.post<IProvider>(`${this.apiURL}`, provider));
  }

  getProvider(id: string) {
    return firstValueFrom(this.#http.get<IProvider>(`${this.apiURL}/${id}`));
  }
}