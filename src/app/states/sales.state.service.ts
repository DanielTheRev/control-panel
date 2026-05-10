import { httpResource } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { environment } from '../../environments/environment';
import { SalesRange, SalesStatsResponse } from '../interfaces/sales.interface';

@Injectable({
  providedIn: 'root',
})
export class SalesStateService {
  // ── Signals de filtro (el httpResource reacciona automáticamente) ──────────
  readonly selectedRange = signal<SalesRange>('day');
  readonly selectedDate = signal<string>(new Date().toISOString().split('T')[0]);

  // ── httpResource reactivo ──────────────────────────────────────────────────
  #stats = httpResource<SalesStatsResponse>(() => ({
    url: `${environment.apiUrl}/orders/admin/sales-stats`,
    params: {
      range: this.selectedRange(),
      date: this.selectedDate(),
    },
  }));

  // ── Estado público computado ───────────────────────────────────────────────
  readonly state = computed(() => ({
    isLoading: this.#stats.isLoading(),
    hasError: !!this.#stats.error(),
    hasData: this.#stats.hasValue() && this.#stats.value() !== null,
    stats: this.#stats.hasValue() ? this.#stats.value() : undefined,
  }));

  // ── Mutaciones públicas (actualizan signals → httpResource recarga solo) ───
  setRange(range: SalesRange): void {
    this.selectedRange.set(range);
  }

  setDate(date: string): void {
    this.selectedDate.set(date);
  }

  refresh(): void {
    this.#stats.reload();
  }
}
