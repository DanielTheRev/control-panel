import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  IClientAccountResponse,
  IDebtorsSummaryResponse,
  IRecordPaymentPayload,
  IRecordAdjustmentPayload,
  IUpdateCreditConfigPayload,
} from '../interfaces/account-movement.interface';

@Injectable({
  providedIn: 'root',
})
export class AccountMovementService {
  private _http = inject(HttpClient);
  readonly endpoint = `${environment.apiUrl}/account-movements`;

  /** Obtiene la lista global de clientes deudores y el monto total en la calle */
  getDebtors(search?: string): Observable<IDebtorsSummaryResponse> {
    const params = search ? `?search=${encodeURIComponent(search)}` : '';
    return this._http.get<IDebtorsSummaryResponse>(`${this.endpoint}/debtors${params}`);
  }

  /** Obtiene el resumen de cuenta y los movimientos de un cliente */
  getClientAccount(clientId: string, page: number = 1, limit: number = 30): Observable<IClientAccountResponse> {
    return this._http.get<IClientAccountResponse>(`${this.endpoint}/clients/${clientId}?page=${page}&limit=${limit}`);
  }

  /** Registra un pago total o parcial de deuda */
  recordPayment(clientId: string, payload: IRecordPaymentPayload): Observable<any> {
    return this._http.post<any>(`${this.endpoint}/clients/${clientId}/payments`, payload);
  }

  /** Registra un ajuste de saldo manual */
  recordAdjustment(clientId: string, payload: IRecordAdjustmentPayload): Observable<any> {
    return this._http.post<any>(`${this.endpoint}/clients/${clientId}/adjustments`, payload);
  }

  /** Actualiza límite de crédito o habilita/suspende el fiado */
  updateCreditConfig(clientId: string, payload: IUpdateCreditConfigPayload): Observable<any> {
    return this._http.patch<any>(`${this.endpoint}/clients/${clientId}/credit-config`, payload);
  }

  /** Genera texto y link de WhatsApp para recordatorio de cobro */
  getWhatsAppReminder(clientId: string): Observable<{ success: boolean; data: { phone: string; message: string; waLink: string } }> {
    return this._http.get<any>(`${this.endpoint}/clients/${clientId}/whatsapp-reminder`);
  }
}
