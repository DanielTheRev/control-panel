import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { IClientResponse } from '../interfaces/client.interface';

@Injectable({
  providedIn: 'root',
})
export class ClientsService {
  private _http = inject(HttpClient);

  /** Endpoint público para que otros servicios puedan conocer la URL base */
  readonly endpoint = `${environment.apiUrl}/users`;

  /** Obtiene la lista de clientes paginada con búsqueda opcional */
  getClients(params: { page: number; limit: number; q?: string }): Observable<IClientResponse> {
    const queryParams = new URLSearchParams();
    queryParams.set('page', params.page.toString());
    queryParams.set('limit', params.limit.toString());
    if (params.q) {
      queryParams.set('q', params.q);
    }

    return this._http.get<IClientResponse>(
      `${this.endpoint}/clients?${queryParams.toString()}`
    );
  }
}
