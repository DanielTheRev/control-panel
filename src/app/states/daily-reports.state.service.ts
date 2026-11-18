import { httpResource } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { environment } from '../../environments/environment';
import { SaleWithDetail } from '../interfaces/sales.interface';

import { DailyStats, HourlyBreakpoint } from '../interfaces/daily-reports.interface';

export type { DailyStats, HourlyBreakpoint };

@Injectable({
  providedIn: 'root',
})
export class DailyReportsStoreService {
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
      hasError: !!error,
      hasData: this.#fetchedStats.value() !== null,
      stats
    };
  });

  setDate(date: string) {
    this._selectedDate.set(date);
  }

  setToday() {
    this._selectedDate.set(new Date().toISOString().split('T')[0]);
  }

  prevDay() {
    const current = new Date(this._selectedDate());
    current.setDate(current.getDate() - 1);
    this._selectedDate.set(current.toISOString().split('T')[0]);
  }

  nextDay() {
    const current = new Date(this._selectedDate());
    current.setDate(current.getDate() + 1);
    this._selectedDate.set(current.toISOString().split('T')[0]);
  }

  refresh() {
    this.#fetchedStats.reload();
  }
}
