import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import {
  ICategoryGroup,
  ICategoryGroupCreateDTO,
  ICategoryGroupUpdateDTO,
  IRawCategoryCount
} from '../interfaces/category-group.interface';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CategoryGroupService {
  private http = inject(HttpClient);
  readonly apiUrl = `${environment.apiUrl}/category-groups`;

  static slugify(text: string): string {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/&/g, '-y-')
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  async getCategoryGroups(): Promise<ICategoryGroup[]> {
    const res = await firstValueFrom(
      this.http.get<{ success: boolean; data: ICategoryGroup[] }>(this.apiUrl)
    );
    return res.data || [];
  }

  async getCategoryGroup(idOrSlug: string): Promise<ICategoryGroup> {
    const res = await firstValueFrom(
      this.http.get<{ success: boolean; data: ICategoryGroup }>(`${this.apiUrl}/${idOrSlug}`)
    );
    return res.data;
  }

  async getRawCategories(): Promise<IRawCategoryCount[]> {
    const res = await firstValueFrom(
      this.http.get<{ success: boolean; data: IRawCategoryCount[] }>(`${this.apiUrl}/raw-categories`)
    );
    return res.data || [];
  }

  createCategoryGroup(
    payload: ICategoryGroupCreateDTO
  ): Promise<{ success: boolean; data: ICategoryGroup; message?: string }> {
    return firstValueFrom(
      this.http.post<{ success: boolean; data: ICategoryGroup; message?: string }>(
        this.apiUrl,
        payload
      )
    );
  }

  updateCategoryGroup(
    id: string,
    payload: ICategoryGroupUpdateDTO
  ): Promise<{ success: boolean; data: ICategoryGroup; message?: string }> {
    return firstValueFrom(
      this.http.put<{ success: boolean; data: ICategoryGroup; message?: string }>(
        `${this.apiUrl}/${id}`,
        payload
      )
    );
  }

  deleteCategoryGroup(id: string): Promise<{ success: boolean; message?: string }> {
    return firstValueFrom(
      this.http.delete<{ success: boolean; message?: string }>(`${this.apiUrl}/${id}`)
    );
  }
}
