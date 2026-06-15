import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom, map } from 'rxjs';
import { IOrder, OrderStatus, PaymentStatus } from '../interfaces/order.interface';
import { SalesRange, SalesStatsResponse } from '../interfaces/sales.interface';
import { environment } from '../../environments/environment';

export function sanitizeOrder(order: any): IOrder {
  if (!order) return order;
  if (order.items) {
    order.items = order.items.map((item: any) => {
      if (item.productSnapshot) {
        if (!item.productSnapshot.price && item.productSnapshot.prices) {
          item.productSnapshot.isLegacyPrices = true;
          const oldPrices = item.productSnapshot.prices;
          item.productSnapshot.price = {
            listPrice: oldPrices.tarjeta_credito_debito || 0,
            card_ticket1PayPrice: oldPrices.tarjeta_credito_debito || 0,
            cashTransferPrice: oldPrices.efectivo_transferencia || 0,
            discountPercentageTransfer: oldPrices.discountPercentageTransfer || 0,
            installments: {
              threePaymentsAmount: oldPrices.cuotas?.cuotas_3_si || 0,
              sixPaymentsAmount: oldPrices.cuotas?.cuotas_6_si || 0,
              hasThreeInstallmentsSeamless: true,
              hasSixInstallmentsSeamless: true
            }
          };
        }

        if (!item.productSnapshot.finance && item.productSnapshot.prices) {
          const oldPrices = item.productSnapshot.prices;
          item.productSnapshot.finance = {
            exchangeRateSnapshot: oldPrices.dolarPrice || 0,
            mpCommissionSnapshot: {
              base: oldPrices.baseCommission || 0,
              cft3Cuotas: 0,
              cft6Cuotas: oldPrices.cft6Cuotas || 0
            },
            providerCost: {
              inUSD: oldPrices.costPrice?.inUSD || 0,
              inARS: oldPrices.costPrice?.inARS || 0
            },
            additionalCosts: [],
            pricingStrategy: {
              method: oldPrices.customPricingMethod || 'margin',
              targetProfit: oldPrices.profitMargin1Pay || 0
            },
            calculatedProfits: {
              transfer: oldPrices.earnings?.cash_transfer || 0,
              card_ticket1Pay: oldPrices.earnings?.card_1_installments || 0,
              card3Installments: oldPrices.earnings?.card_3_installments || 0,
              card6Installments: oldPrices.earnings?.card_6_installments || 0
            }
          };
        }

        delete item.productSnapshot.prices;
      }
      return item;
    });
  }
  return order;
}

@Injectable({
  providedIn: 'root',
})
export class OrdersService {
  private apiURI = `${environment.apiUrl}/orders`;
  private _http = inject(HttpClient);

  getOrders() {
    return firstValueFrom(
      this._http.get<any>(`${this.apiURI}`).pipe(
        map((res: any) => {
          if (Array.isArray(res)) {
            return res.map(sanitizeOrder);
          } else if (res && Array.isArray(res.data)) {
            res.data = res.data.map(sanitizeOrder);
          }
          return res;
        })
      )
    );
  }

  getOrderById(id: string) {
    return this._http.get<IOrder>(`${this.apiURI}/admin/order/${id}`).pipe(
      map(sanitizeOrder)
    );
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
        { orderID, status }
      ).pipe(
        map(res => {
          if (res && res.orderUpdated) {
            res.orderUpdated = sanitizeOrder(res.orderUpdated);
          }
          return res;
        })
      )
    );
  }

  /** Registra una venta física en sucursal (POS) */
  async registerLocalSale(data: { items: any[], splitPayments: any[], userId?: string, notes?: string }): Promise<any> {
    return await firstValueFrom(
      this._http.post<any>(`${this.apiURI}/admin/local-sale`, data).pipe(
        map(res => {
          if (res && res.order) {
            res.order = sanitizeOrder(res.order);
          }
          return res;
        })
      )
    );
  }

  /** Obtiene estadísticas del día — usado por CashRegister */
  async getDailyStats(date?: string): Promise<any> {
    let params = new HttpParams();
    if (date) params = params.set('date', date);
    return await firstValueFrom(
      this._http.get<any>(`${this.apiURI}/admin/daily-stats`, { params })
    );
  }

  /**
   * Obtiene estadísticas de ventas por rango (día/semana/mes/año).
   * Solo incluye órdenes con paymentInfo.status === APPROVED.
   */
  async getSalesStats(range: SalesRange, date?: string): Promise<SalesStatsResponse> {
    let params = new HttpParams().set('range', range);
    if (date) params = params.set('date', date);
    return await firstValueFrom(
      this._http.get<SalesStatsResponse>(`${this.apiURI}/admin/sales-stats`, { params })
    );
  }

  /** Descarga el ticket térmico en PDF */
  async downloadTicket(orderId: string): Promise<void> {
    const response = await firstValueFrom(
      this._http.get(`${this.apiURI}/${orderId}/ticket`, { responseType: 'blob' })
    );
    const fileURL = URL.createObjectURL(new Blob([response], { type: 'application/pdf' }));
    window.open(fileURL, '_blank');
  }
}
