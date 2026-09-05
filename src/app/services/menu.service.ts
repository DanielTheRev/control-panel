import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { IMenu, IMenuCreateDTO } from '../interfaces/menu.interface';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MenuService {
  private http = inject(HttpClient);
  readonly apiUrl = `${environment.apiUrl}/menus`;

  async getMenus(): Promise<IMenu[]> {
    const res = await firstValueFrom(this.http.get<{ success: boolean; data: IMenu[] }>(this.apiUrl));
    return res.data || [];
  }

  async getMenu(slugOrId: string): Promise<IMenu> {
    const res = await firstValueFrom(this.http.get<{ success: boolean; data: IMenu }>(`${this.apiUrl}/${slugOrId}`));
    return res.data;
  }

  createMenu(formData: FormData): Promise<{ success: boolean; data: IMenu; message?: string }> {
    return firstValueFrom(
      this.http.post<{ success: boolean; data: IMenu; message?: string }>(this.apiUrl, formData)
    );
  }

  updateMenu(id: string, formData: FormData): Promise<{ success: boolean; data: IMenu; message?: string }> {
    return firstValueFrom(
      this.http.put<{ success: boolean; data: IMenu; message?: string }>(`${this.apiUrl}/${id}`, formData)
    );
  }

  deleteMenu(id: string): Promise<{ success: boolean; message?: string }> {
    return firstValueFrom(
      this.http.delete<{ success: boolean; message?: string }>(`${this.apiUrl}/${id}`)
    );
  }
}
