import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface IInvoiceResponse {
  _id: string;
  order: string;
  cae: string;
  caeExpiration: string;
  voucherType: number;
  voucherTypeName: string;
  ptoVta: number;
  voucherNumber: number;
  voucherDate: string;
  amountTotal: number;
  amountNet: number;
  amountTax: number;
  qrData?: string;
  status: string;
}

export interface IMonotributoCategoryScale {
  category: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K';
  annualLimit: number;
  monthlyQuota: number;
  taxOnlyQuota: number;
}

export interface IMonotributoMonthBreakdown {
  monthKey: string;
  label: string;
  year: number;
  monthNumber: number;
  totalBilled: number;
  totalInvoiced: number;
  ordersCount: number;
  invoicesCount: number;
}

export interface IMonotributoReport {
  success: boolean;
  declaredCategory: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K';
  declaredScale: IMonotributoCategoryScale;
  calculatedCategory: string;
  isExceededMonotributo: boolean;
  previousExternalBilling?: number;
  systemBilledRolling12Months?: number;
  totalBilledRolling12Months: number;
  totalInvoicedRolling12Months: number;
  remainingForDeclaredCategory: number;
  percentDeclaredCategoryUsed: number;
  exclusionLimit: number;
  remainingForExclusion: number;
  percentExclusionUsed: number;
  estimatedMonthlyQuota: number;
  nextRecategorization: {
    window: string;
    daysRemaining: number;
    dueDate: string;
    description: string;
  };
  healthStatus: 'ok' | 'warning' | 'danger';
  statusMessage: string;
  monthlyBreakdown: IMonotributoMonthBreakdown[];
  scales: IMonotributoCategoryScale[];
}

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
