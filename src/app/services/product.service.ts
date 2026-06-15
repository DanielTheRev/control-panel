import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment.development';
import { HttpClient } from '@angular/common/http';
import {
  IProduct,
  IProductPrices,
  IProductFinance,
  ICostConcept,
} from '../interfaces/product.interface';
import { IPaginatedResult } from '../interfaces/pagination.interface';
import { firstValueFrom, Observable, map } from 'rxjs';
import { HotToastService } from '@ngxpert/hot-toast';
import { IFinanceCost } from '../interfaces/finance.interface';

export function mapProductPrices(product: any): IProduct {
  if (!product) return product;

  if (!product.price && product.prices) {
    product.isLegacyPrices = true;
    // Just in case we receive the old structure, map prices to price for components that expect price
    product.price = {
      listPrice: product.prices.tarjeta_credito_debito || 0,
      card_ticket1PayPrice: product.prices.tarjeta_credito_debito || 0,
      cashTransferPrice: product.prices.efectivo_transferencia || 0,
      discountPercentageTransfer:
        product.prices.discountPercentageTransfer || 0,
      installments: {
        threePaymentsAmount: product.prices.cuotas?.cuotas_3_si || 0,
        sixPaymentsAmount: product.prices.cuotas?.cuotas_6_si || 0,
        hasThreeInstallmentsSeamless: true,
        hasSixInstallmentsSeamless: true,
      },
    };

    if (!product.finance) {
      product.finance = {
        exchangeRateSnapshot: product.prices.dolarPrice || 0,
        mpCommissionSnapshot: {
          base: product.prices.baseCommission || 0,
          cft3Cuotas: 0,
          cft6Cuotas: product.prices.cft6Cuotas || 0,
        },
        providerCost: {
          inUSD: product.prices.costPrice?.inUSD || 0,
          inARS: product.prices.costPrice?.inARS || 0,
        },
        additionalCosts: [],
        pricingStrategy: {
          method: product.prices.customPricingMethod || 'margin',
          targetProfit: product.prices.profitMargin1Pay || 0,
        },
        calculatedProfits: {
          transfer: product.prices.earnings?.cash_transfer || 0,
          card_ticket1Pay: product.prices.earnings?.card_1_installments || 0,
          card3Installments: product.prices.earnings?.card_3_installments || 0,
          card6Installments: product.prices.earnings?.card_6_installments || 0,
        },
      };
    }
  }

  // Remove legacy prices property entirely
  delete product.prices;

  return product;
}

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  #apiUrl = `${environment.apiUrl}/products`;
  #http = inject(HttpClient);
  #toast = inject(HotToastService);

  getProduct(id: string) {
    return firstValueFrom(
      this.#http.get<IProduct>(`${this.#apiUrl}/complete/${id}`).pipe(
        map(mapProductPrices),
        this.#toast.observe({
          error: {
            content: 'Error al obtener el producto',
            icon: '❌',
            position: 'top-right',
            theme: 'snackbar',
          },
        }),
      ),
    );
  }

  create(productData: FormData) {
    return firstValueFrom(
      this.#http.post<IProduct>(`${this.#apiUrl}`, productData).pipe(
        map(mapProductPrices),
        this.#toast.observe({
          loading: {
            content: 'Creando producto...',
            icon: '⏳',
            position: 'top-right',
            theme: 'snackbar',
          },
          success: {
            content: 'Producto creado correctamente',
            icon: '✅',
            position: 'top-right',
            theme: 'snackbar',
          },
          error: {
            content: 'Error al crear el producto',
            icon: '❌',
            position: 'top-right',
            theme: 'snackbar',
          },
        }),
      ),
    );
  }

  updateProduct(id: string, product: FormData) {
    return firstValueFrom(
      this.#http.patch<any>(`${this.#apiUrl}/${id}`, product).pipe(
        map(mapProductPrices),
        this.#toast.observe({
          loading: {
            content: 'Actualizando producto...',
            icon: '⏳',
            position: 'top-right',
            theme: 'snackbar',
          },
          success: {
            content: 'Producto actualizado correctamente',
            icon: '✅',
            position: 'top-right',
            theme: 'snackbar',
          },
          error: {
            content: 'Error al actualizar el producto',
            icon: '❌',
            position: 'top-right',
            theme: 'snackbar',
          },
        }),
      ),
    );
  }
  /**
   * @description Calcula los precios del producto
   */
  calculatePrices(data: {
    costPrice: number;
    additionalCosts: ICostConcept[];
    discountPercentageTransfer: number;
    customProfitMargin?: number;
    customPricingMethod?: 'markup' | 'margin';
  }): Observable<{ price: IProductPrices; finance: IProductFinance }> {
    return this.#http
      .post<{
        price: IProductPrices;
        finance: IProductFinance;
      }>(`${this.#apiUrl}/calculate-prices`, data)
      .pipe(
        this.#toast.observe({
          loading: {
            content: 'Calculando precios...',
            icon: '⏳',
            position: 'top-right',
            theme: 'snackbar',
          },
          success: {
            content: 'Precios calculados correctamente',
            icon: '✅',
            position: 'top-right',
            theme: 'snackbar',
          },
          error: {
            content: 'Error al calcular los precios',
            icon: '❌',
            position: 'top-right',
            theme: 'snackbar',
          },
        }),
      );
  }

  /**
   *@description Calcula el precio de lista basado en el precio de costo, los costos adicionales, el margen deseado del cliente, el método de calculo y las comisiones de la pasarela
   */
  calculateListPrice(data: {
    providerCost: number;
    additionalCosts: ICostConcept[];
    useCustomProfit: boolean;
    customProfitMargin: number;
    pricingMethodChoice: 'markup' | 'margin';
    calculate: boolean;
  }) {
    return this.#http
      .post<IFinanceCost>(`${this.#apiUrl}/finance/calculate`, {
        ...data,
        calculate: 'list_price',
      })
      .pipe(
        this.#toast.observe({
          loading: {
            content: 'Calculando precios...',
            icon: '⏳',
            position: 'top-right',
            theme: 'snackbar',
          },
          success: {
            content: 'Precios calculados correctamente',
            icon: '✅',
            position: 'top-right',
            theme: 'snackbar',
          },
          error: {
            content: 'Error al calcular los precios',
            icon: '❌',
            position: 'top-right',
            theme: 'snackbar',
          },
        }),
      );
  }

  deleteProduct(id: string) {
    return firstValueFrom(
      this.#http.delete(`${this.#apiUrl}/${id}`).pipe(
        this.#toast.observe({
          loading: 'Eliminando producto...',
          success: 'Producto eliminado correctamente',
          error: 'Error al eliminar el producto',
        }),
      ),
    );
  }

  searchProducts(query: string): Observable<IPaginatedResult<any>> {
    return this.#http
      .get<IPaginatedResult<any>>(`${this.#apiUrl}/search`, {
        params: { q: query },
      })
      .pipe(
        map((res) => {
          if (res && Array.isArray(res.data)) {
            res.data = res.data.map(mapProductPrices);
          }
          return res;
        }),
      );
  }

  getSuggestions(query: string): Observable<any[]> {
    return this.#http
      .get<any[]>(`${this.#apiUrl}/search`, {
        params: { q: query, suggestions: 'true' },
      })
      .pipe(
        map((res) => {
          if (Array.isArray(res)) {
            return res.map(mapProductPrices);
          }
          return res;
        }),
      );
  }

  bulkUpdateStatus(ids: string[], isActive: boolean) {
    return firstValueFrom(
      this.#http
        .patch<any>(`${this.#apiUrl}/bulk-status`, { ids, isActive })
        .pipe(
          this.#toast.observe({
            loading: 'Actualizando estado de los productos...',
            success: `Productos ${isActive ? 'activados' : 'desactivados'} correctamente`,
            error: 'Error al actualizar el estado de los productos',
          }),
        ),
    );
  }
}
