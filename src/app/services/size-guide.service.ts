import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  ISaveSizeGuideTemplatePayload,
  ISizeGuideTemplate,
  ISizeGuideTemplatesResponse,
} from '../interfaces/tenant-bootstrap.interface';

@Injectable({ providedIn: 'root' })
export class SizeGuideService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/addons/size-guide/templates`;

  async saveTemplate(payload: ISaveSizeGuideTemplatePayload): Promise<ISizeGuideTemplate[]> {
    const res = await firstValueFrom(
      this.http.post<ISizeGuideTemplatesResponse>(this.baseUrl, payload)
    );
    if (!res?.success || !Array.isArray(res?.data?.templates)) {
      throw new Error('La respuesta de /addons/size-guide/templates es inválida.');
    }
    return res.data.templates;
  }

  async deleteTemplate(templateId: string): Promise<ISizeGuideTemplate[]> {
    const res = await firstValueFrom(
      this.http.delete<ISizeGuideTemplatesResponse>(`${this.baseUrl}/${encodeURIComponent(templateId)}`)
    );
    if (!res?.success || !Array.isArray(res?.data?.templates)) {
      throw new Error('La respuesta al eliminar la plantilla es inválida.');
    }
    return res.data.templates;
  }
}
