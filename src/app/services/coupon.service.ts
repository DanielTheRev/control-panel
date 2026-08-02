import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { CreateCouponDTO, ICoupon } from '../interfaces/coupon.interface';

@Injectable({
  providedIn: 'root'
})
export class CouponService {
  #http = inject(HttpClient);
  #apiUrl = `${environment.apiUrl}/coupons`;

  getCoupons(): Observable<ICoupon[]> {
    return this.#http.get<ICoupon[]>(this.#apiUrl);
  }

  createCoupon(dto: CreateCouponDTO): Observable<ICoupon> {
    return this.#http.post<ICoupon>(this.#apiUrl, dto);
  }

  toggleCoupon(id: string): Observable<ICoupon> {
    return this.#http.patch<ICoupon>(`${this.#apiUrl}/${id}/toggle`, {});
  }

  deleteCoupon(id: string): Observable<{ message: string }> {
    return this.#http.delete<{ message: string }>(`${this.#apiUrl}/${id}`);
  }

  getFirstPurchaseConfig(): Observable<{ enabled: boolean; percentage: number }> {
    return this.#http.get<{ enabled: boolean; percentage: number }>(`${this.#apiUrl}/first-purchase-config`);
  }

  updateFirstPurchaseConfig(enabled: boolean, percentage: number): Observable<{ enabled: boolean; percentage: number }> {
    return this.#http.patch<{ enabled: boolean; percentage: number }>(`${this.#apiUrl}/first-purchase-config`, { enabled, percentage });
  }
}
