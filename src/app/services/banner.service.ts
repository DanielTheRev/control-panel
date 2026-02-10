import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { IBanner } from '../interfaces/banner.interface';
import { firstValueFrom, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class BannerService {
  private http = inject(HttpClient);
  readonly apiUrl = `${environment.apiUrl}/home/banners`;

  getBannerById(id: string): Promise<IBanner> {
    return firstValueFrom(this.http.get<IBanner>(`${this.apiUrl}/${id}`));
  }

  createBanner(banner: IBanner) {
    return firstValueFrom(this.http.post<IBanner>(this.apiUrl, banner));
  }

  updateBanner(id: string, banner: Partial<IBanner>) {
    return firstValueFrom(this.http.put<Partial<IBanner>>(`${this.apiUrl}/${id}`, banner));
  }

  deleteBanner(id: string) {
    return firstValueFrom(this.http.delete<{ success: boolean; message: string }>(`${this.apiUrl}/${id}`));
  }
}
