import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { IOrder, OrderStatus, PaymentStatus } from '../interfaces/order.interface';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class OrdersService {
  private apiURI = `${environment.apiUrl}/orders`;
  private _http = inject(HttpClient);

  getOrders() {
    return firstValueFrom(this._http.get(`${this.apiURI}`));
  }

  getOrderById(id: string) {
    return this._http.get<IOrder>(`${this.apiURI}/admin/order/${id}`);
  }

  updatePaymentState(
    orderID: string,
    target: 'updatePayment' | 'updateShippingStatus',
    status: PaymentStatus | OrderStatus,
  ) {
    const action =
      target === 'updatePayment'
        ? 'updatePaymentStatus'
        : 'updateShippingStatus';

    return firstValueFrom(
      this._http.post<{ message: string; orderUpdated: IOrder }>(
        `${this.apiURI}/${action}`,
        {
          orderID,
          status,
        }
      )
    );
  }

  /**
   * Registra una venta física en sucursal (POS)
   */
  async registerLocalSale(data: { items: any[], splitPayments: any[], userId?: string, notes?: string }): Promise<any> {
    return await firstValueFrom(
      this._http.post<any>(`${this.apiURI}/admin/local-sale`, data)
    );
  }

  /**
   * Obtiene estadísticas y resumen de ventas del día
   */
  async getDailyStats(date?: string): Promise<any> {
    let params = new HttpParams();
    if (date) params = params.set('date', date);
    
    return await firstValueFrom(
      this._http.get<any>(`${this.apiURI}/admin/daily-stats`, { params })
    );
  }

  /**
   * Descarga el ticket térmico en PDF
   */
  async downloadTicket(orderId: string): Promise<void> {
    const response = await firstValueFrom(
      this._http.get(`${this.apiURI}/${orderId}/ticket`, { responseType: 'blob' })
    );
    const fileURL = URL.createObjectURL(new Blob([response], { type: 'application/pdf' }));
    window.open(fileURL, '_blank');
  }
}
