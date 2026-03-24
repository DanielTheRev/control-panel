import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { IBentoConfig } from '../interfaces/bento.interface';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class BentoService {
  private http = inject(HttpClient);
  readonly apiUrl = `${environment.apiUrl}/bento`;

  getBentoConfig(): Promise<IBentoConfig | null> {
    return firstValueFrom(this.http.get<IBentoConfig | null>(this.apiUrl));
  }

  saveBentoConfig(formData: FormData): Promise<IBentoConfig> {
    return firstValueFrom(this.http.put<IBentoConfig>(this.apiUrl, formData));
  }
}
