import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { IAddSpecOptionResponse } from '../interfaces/tenant-bootstrap.interface';

@Injectable({ providedIn: 'root' })
export class DetailsBuilderService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.apiUrl}/addons/details-builder/spec-options`;

  async addSpecOption(key: string, value: string): Promise<{ key: string; options: string[] }> {
    const res = await firstValueFrom(
      this.http.post<IAddSpecOptionResponse>(this.endpoint, { key, value })
    );
    if (!res?.success || !Array.isArray(res?.data?.options)) {
      throw new Error('La respuesta de /addons/details-builder/spec-options es inválida.');
    }
    return res.data;
  }
}
