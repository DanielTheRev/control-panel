import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  IPriceBuilderCalculateRequest,
  IPriceBuilderCalculateResult,
  IPriceBuilderPresetsResponse,
} from '../interfaces/price-builder.interface';

@Injectable({
  providedIn: 'root',
})
export class PriceBuilderService {
  readonly #http = inject(HttpClient);
  readonly #baseUrl = `${environment.apiUrl}/addons/price-builder`;

  getPresetsAndRates(): Promise<IPriceBuilderPresetsResponse['data']> {
    return firstValueFrom(
      this.#http.get<IPriceBuilderPresetsResponse>(`${this.#baseUrl}/presets`),
    ).then((res) => {
      if (!res?.success || !res.data) {
        throw new Error('La respuesta de /addons/price-builder/presets es inválida.');
      }
      return res.data;
    });
  }

  calculatePreview(
    payload: IPriceBuilderCalculateRequest,
  ): Promise<IPriceBuilderCalculateResult> {
    return firstValueFrom(
      this.#http.post<IPriceBuilderCalculateResult>(`${this.#baseUrl}/calculate`, payload),
    );
  }
}
