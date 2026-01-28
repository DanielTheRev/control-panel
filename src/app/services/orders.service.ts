import { HttpClient } from '@angular/common/http';
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
}
