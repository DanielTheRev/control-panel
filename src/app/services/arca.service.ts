import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

import {
  IInvoiceResponse,
  IMonotributoCategoryScale,
  IMonotributoMonthBreakdown,
  IMonotributoReport,
} from '../interfaces/arca.interface';

export type {
  IInvoiceResponse,
  IMonotributoCategoryScale,
  IMonotributoMonthBreakdown,
  IMonotributoReport,
};

@Injectable({
  providedIn: 'root',
})
export class ArcaService {
  #http = inject(HttpClient);
  #apiUrl = `${environment.apiUrl}/arca`;

  checkStatus(): Observable<any> {
    return this.#http.get(`${this.#apiUrl}/status`, { withCredentials: true });
  }

  getTaxpayer(cuit: string): Observable<any> {
    return this.#http.get(`${this.#apiUrl}/taxpayer/${cuit}`, { withCredentials: true });
  }

  createInvoiceForOrder(orderId: string): Observable<{ success: boolean; alreadyInvoiced?: boolean; invoice: IInvoiceResponse }> {
    return this.#http.post<{ success: boolean; alreadyInvoiced?: boolean; invoice: IInvoiceResponse }>(
      `${this.#apiUrl}/invoice/order/${orderId}`,
      {},
      { withCredentials: true }
    );
  }

  getInvoice(invoiceId: string): Observable<IInvoiceResponse> {
    return this.#http.get<IInvoiceResponse>(`${this.#apiUrl}/invoice/${invoiceId}`, { withCredentials: true });
  }

  getInvoicePdfUrl(invoiceId: string): string {
    return `${this.#apiUrl}/invoice/${invoiceId}/pdf`;
  }

  getMonotributoReport(): Observable<IMonotributoReport> {
    return this.#http.get<IMonotributoReport>(`${this.#apiUrl}/monotributo/report`, { withCredentials: true });
  }
}
