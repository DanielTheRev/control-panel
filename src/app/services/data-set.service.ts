import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { IDataSet, IDataSetResponse } from '../interfaces/data-set.interface';

@Injectable({
  providedIn: 'root',
})
export class DataSetService {
  readonly #http = inject(HttpClient);
  readonly #apiUrl = `${environment.apiUrl}/data-sets`;

  getAll(): Observable<IDataSetResponse<IDataSet[]>> {
    return this.#http.get<IDataSetResponse<IDataSet[]>>(this.#apiUrl);
  }

  getByIdOrSlug(idOrSlug: string): Observable<IDataSetResponse<IDataSet>> {
    return this.#http.get<IDataSetResponse<IDataSet>>(`${this.#apiUrl}/${idOrSlug}`);
  }

  execute(idOrSlug: string): Observable<IDataSetResponse<any[]>> {
    return this.#http.get<IDataSetResponse<any[]>>(`${this.#apiUrl}/${idOrSlug}/execute`);
  }

  create(payload: Partial<IDataSet>): Observable<IDataSetResponse<IDataSet>> {
    return this.#http.post<IDataSetResponse<IDataSet>>(this.#apiUrl, payload);
  }

  update(id: string, payload: Partial<IDataSet>): Observable<IDataSetResponse<IDataSet>> {
    return this.#http.put<IDataSetResponse<IDataSet>>(`${this.#apiUrl}/${id}`, payload);
  }

  delete(id: string): Observable<{ success: boolean; message: string }> {
    return this.#http.delete<{ success: boolean; message: string }>(`${this.#apiUrl}/${id}`);
  }
}
