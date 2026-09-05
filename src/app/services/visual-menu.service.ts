import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { IVisualMenuConfig } from '../interfaces/visual-menu.interface';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class VisualMenuService {
  private http = inject(HttpClient);
  readonly apiUrl = `${environment.apiUrl}/visual-menu`;

  getVisualMenu(): Promise<IVisualMenuConfig | null> {
    return firstValueFrom(this.http.get<IVisualMenuConfig | null>(this.apiUrl));
  }

  saveVisualMenu(formData: FormData): Promise<{ success: boolean; data: IVisualMenuConfig }> {
    return firstValueFrom(this.http.put<{ success: boolean; data: IVisualMenuConfig }>(this.apiUrl, formData));
  }
}
