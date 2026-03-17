import { httpResource } from '@angular/common/http';
import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { environment } from '../../environments/environment';
import { OrdersService } from '../services/orders.service';

interface DailyStats {
  date: string;
  totalRevenue: number;
  totalEarnings: number;
  salesCount: {
    total: number;
    local: number;
    online: number;
  };
  incomeByMethod: Record<string, number>;
}


@Injectable({
  providedIn: 'root',
})
export class DailyReportsStoreService {
  #orderService = inject(OrdersService);

  // Date signal for reactivity
  private _selectedDate = signal<string>(new Date().toISOString().split('T')[0]);
  readonly selectedDate = this._selectedDate.asReadonly();

  // httpResource for the daily stats
  #fetchedStats = httpResource<DailyStats>(() => ({
    url: `${environment.apiUrl}/orders/admin/daily-stats`,
    params: { date: this._selectedDate() }
  }));

  // Public computed state
  readonly state = computed(() => {
    const isLoading = this.#fetchedStats.isLoading();
    const error = this.#fetchedStats.error();
    const hasValue = this.#fetchedStats.hasValue();

    const stats = (hasValue && !error)
      ? this.#fetchedStats.value()
      : undefined;

    return {
      isLoading,
      hasError: !!error, // Convertimos el objeto de error a booleano
      hasData: this.#fetchedStats.value() !== null,
      stats
    };
  });

  setDate(date: string) {
    this._selectedDate.set(date);
  }

  refresh() {
    this.#fetchedStats.reload();
  }
}
