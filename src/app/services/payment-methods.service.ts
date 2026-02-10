import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { IPaymentMethod } from '../interfaces/paymentInfo.interface';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PaymentMethodsService {
  #http = inject(HttpClient);
  apiUrl = `${environment.apiUrl}/payment-methods`;

  getById(id: string) {
    return firstValueFrom(this.#http.get<IPaymentMethod>(`${this.apiUrl}/${id}`));
  }

  create(paymentMethod: Omit<IPaymentMethod, '_id'>) {
    return firstValueFrom(this.#http.post<IPaymentMethod>(`${this.apiUrl}`, paymentMethod));
  }

  update(id: string, paymentMethod: Partial<IPaymentMethod>) {
    return firstValueFrom(this.#http.put<IPaymentMethod>(`${this.apiUrl}/${id}`, paymentMethod));
  }

  delete(id: string) {
    return firstValueFrom(this.#http.delete<IPaymentMethod>(`${this.apiUrl}/${id}`));
  }
}
