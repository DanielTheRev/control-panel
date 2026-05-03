import { httpResource } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';

import {
  IClientResponse,
} from '../interfaces/client.interface';
import { AuthService } from '../services/auth.service';
import { ClientsService } from '../services/clients.service';

@Injectable({
  providedIn: 'root',
})
export class ClientsStateService {
  private clientsService = inject(ClientsService);
  private auth = inject(AuthService);

  // ── Signals para filtros ──
  private _page = signal<number>(1);
  private _limit = signal<number>(20);
  private _search = signal<string>('');

  // Signals públicos de solo lectura
  readonly page = this._page.asReadonly();
  readonly limit = this._limit.asReadonly();
  readonly search = this._search.asReadonly();

  // ── httpResource: GET automático reactivo a filtros ──
  private resource = httpResource<IClientResponse>(() => {
    if (!this.auth.isAuthenticated()) return;

    const params = new URLSearchParams();
    params.set('page', this._page().toString());
    params.set('limit', this._limit().toString());

    const q = this._search().trim();
    if (q) {
      params.set('q', q);
    }

    return {
      url: `${this.clientsService.endpoint}/clients?${params.toString()}`,
    };
  });

  // ── Computed principal: estado consolidado ──
  readonly state = computed(() => ({
    data: this.resource.value()?.data ?? [],
    pagination: this.resource.value()?.pagination ?? { total: 0, page: 1, limit: 20, totalPages: 1 },
    isLoading: this.resource.isLoading(),
    hasError: !!this.resource.error(),
    hasData: (this.resource.value()?.data?.length ?? 0) > 0,
    error: this.resource.error(),
  }));

  // ── Métodos públicos para actualizar filtros ──

  setPage(page: number): void {
    this._page.set(page);
  }

  setLimit(limit: number): void {
    this._limit.set(limit);
    this._page.set(1);
  }

  setSearch(term: string): void {
    this._search.set(term);
    this._page.set(1);
  }

  /** Refresca los datos del resource */
  refresh(): void {
    this.resource.reload();
  }

  /** Páginas a mostrar en el paginador (ventana de 5 páginas) */
  getPageNumbers(): number[] {
    const totalPages = this.state().pagination.totalPages;
    const currentPage = this.state().pagination.page;
    const pages: number[] = [];

    const maxPages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPages / 2));
    let endPage = Math.min(totalPages, startPage + maxPages - 1);

    if (endPage - startPage + 1 < maxPages) {
      startPage = Math.max(1, endPage - maxPages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  }
}
