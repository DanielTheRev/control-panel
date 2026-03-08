import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { IEcommerceConfig } from '../interfaces/config.interface';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  #http = inject(HttpClient);
  #apiUrl = `${environment.apiUrl}/config`;

  async getConfig(): Promise<IEcommerceConfig> {
    return firstValueFrom(this.#http.get<IEcommerceConfig>(this.#apiUrl));
  }

  async updateConfig(config: IEcommerceConfig): Promise<IEcommerceConfig> {
    return firstValueFrom(this.#http.put<IEcommerceConfig>(this.#apiUrl, config));
  }
}
