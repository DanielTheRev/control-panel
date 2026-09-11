import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  ICreateStaffDto,
  IStaffActionResponse,
  IStaffDetailResponse,
  IStaffListResponse,
  IUpdateStaffDto,
} from '../interfaces/staff.interface';

@Injectable({
  providedIn: 'root',
})
export class StaffService {
  private http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/users/staff`;

  /** Obtiene la lista de empleados y administradores */
  getStaff(params?: { search?: string; role?: string; isActive?: boolean }): Observable<IStaffListResponse> {
    let httpParams = new HttpParams();
    if (params?.search) {
      httpParams = httpParams.set('search', params.search.trim());
    }
    if (params?.role) {
      httpParams = httpParams.set('role', params.role);
    }
    if (params?.isActive !== undefined) {
      httpParams = httpParams.set('isActive', String(params.isActive));
    }

    return this.http.get<IStaffListResponse>(this.baseUrl, { params: httpParams });
  }

  /** Obtiene los datos de un empleado por ID */
  getStaffById(id: string): Observable<IStaffDetailResponse> {
    return this.http.get<IStaffDetailResponse>(`${this.baseUrl}/${id}`);
  }

  /** Da de alta un nuevo empleado */
  createStaff(dto: ICreateStaffDto): Observable<IStaffActionResponse> {
    return this.http.post<IStaffActionResponse>(this.baseUrl, dto);
  }

  /** Actualiza los datos de un empleado */
  updateStaff(id: string, dto: IUpdateStaffDto): Observable<IStaffActionResponse> {
    return this.http.put<IStaffActionResponse>(`${this.baseUrl}/${id}`, dto);
  }

  /** Activa o suspende/revoca a un empleado */
  toggleStaffStatus(id: string): Observable<IStaffActionResponse> {
    return this.http.patch<IStaffActionResponse>(`${this.baseUrl}/${id}/toggle-status`, {});
  }

  /** Elimina a un empleado del sistema */
  deleteStaff(id: string): Observable<IStaffActionResponse> {
    return this.http.delete<IStaffActionResponse>(`${this.baseUrl}/${id}`);
  }

  /** Valida el PIN de mostrador */
  verifyPin(pinCode: string, staffId?: string): Observable<{ success: boolean; user?: any; message?: string }> {
    return this.http.post<{ success: boolean; user?: any; message?: string }>(`${this.baseUrl}/verify-pin`, {
      pinCode,
      staffId,
    });
  }
}
