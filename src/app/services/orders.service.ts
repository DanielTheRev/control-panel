import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { IOrder } from '../interfaces/order.interface';

@Injectable({
  providedIn: 'root',
})
export class OrdersService {
  private apiURI = `http://localhost:3000/api/orders`;
  private _http = inject(HttpClient);

  getOrders() {
    return firstValueFrom(this._http.get(`${this.apiURI}`));
  }

  updatePaymentState(orderID: string) {
    return firstValueFrom(
      this._http.post<{ message: string; orderUpdated: IOrder }>(
        `${this.apiURI}/updatePaymentStatus`,
        {
          orderID,
        }
      )
    );
  }
}
