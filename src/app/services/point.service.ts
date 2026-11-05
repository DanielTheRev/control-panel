import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface IPointDevice {
  id: string;
  name: string;
  operatingMode: string;
  posId?: string;
  storeId?: string;
  externalId?: string;
}

export interface IPointOrderResponse {
  orderId: string;
  status: string; // 'created' | 'at_terminal' | 'processed' | 'failed' | 'cancelled'
  deviceId: string;
  totalAmount: number;
  externalReference: string;
  createdAt?: string;
  paymentDetails?: {
    paymentId?: string;
    status?: string;
    paymentMethodId?: string;
    paymentTypeId?: string;
    cardLastFourDigits?: string;
  };
}

@Injectable({
  providedIn: 'root',
})
export class PointService {
  private _http = inject(HttpClient);
  readonly endpoint = `${environment.apiUrl}/pos/point`;

  /** Obtiene las terminales Point registradas en la cuenta del comercio */
  getDevices(): Observable<{ success: boolean; count: number; data: IPointDevice[] }> {
    return this._http.get<{ success: boolean; count: number; data: IPointDevice[] }>(
      `${this.endpoint}/devices`
    );
  }

  /** Envía la orden de cobro a la terminal Point */
  createOrder(params: {
    deviceId: string;
    amount: number;
    orderNumber?: string;
    description?: string;
    printOnTerminal?: boolean;
  }): Observable<{ success: boolean; message: string; data: IPointOrderResponse }> {
    return this._http.post<{ success: boolean; message: string; data: IPointOrderResponse }>(
      `${this.endpoint}/order`,
      params
    );
  }

  /** Consulta el estado en tiempo real de la orden en la terminal Point */
  getOrderStatus(orderId: string): Observable<{ success: boolean; data: IPointOrderResponse }> {
    return this._http.get<{ success: boolean; data: IPointOrderResponse }>(
      `${this.endpoint}/order/${encodeURIComponent(orderId)}`
    );
  }

  /** Cancela la orden activa en la terminal Point */
  cancelOrder(orderId: string): Observable<{ success: boolean; message: string }> {
    return this._http.post<{ success: boolean; message: string }>(
      `${this.endpoint}/order/${encodeURIComponent(orderId)}/cancel`,
      {}
    );
  }
}
