import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ITenantAddonItem } from '../interfaces/tenant-bootstrap.interface';

@Injectable({
  providedIn: 'root',
})
export class AddonsService {
  readonly #http = inject(HttpClient);
  readonly #apiUrl = `${environment.apiUrl}/addons`;

  getCatalog(): Observable<{ success: boolean; data: ITenantAddonItem[] }> {
    return this.#http.get<{ success: boolean; data: ITenantAddonItem[] }>(`${this.#apiUrl}/catalog`);
  }

  updateSettings(
    addonId: string,
    settings: Record<string, unknown>,
  ): Observable<{ success: boolean; data: ITenantAddonItem; message?: string }> {
    return this.#http.put<{ success: boolean; data: ITenantAddonItem; message?: string }>(
      `${this.#apiUrl}/${addonId}/settings`,
      settings,
    );
  }
}
