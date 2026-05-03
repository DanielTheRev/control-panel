import { CommonModule, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import { IClient } from '../../interfaces/client.interface';
import { SidebarService } from '../../services/sidebar.service';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { PageLayout } from '../../shared/components/page-layout/page-layout';
import { ClientsStateService } from '../../states/clients.state.service';

@Component({
  selector: 'app-clients',
  standalone: true,
  imports: [
    CommonModule,
    PageLayout,
    PageHeader,
    DatePipe,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
  ],
  templateUrl: './clients.html',
  styleUrl: './clients.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientsComponent {
  private clientsState = inject(ClientsStateService);
  #sidebarService = inject(SidebarService);

  // Estado consolidado
  readonly state = this.clientsState.state;

  // Extracciones para el template
  readonly clients = computed(() => this.state().data);
  readonly pagination = computed(() => this.state().pagination);
  readonly isLoading = computed(() => this.state().isLoading);
  readonly hasData = computed(() => this.state().hasData);
  readonly hasError = computed(() => this.state().hasError);

  // Filtros
  readonly page = this.clientsState.page;
  readonly search = this.clientsState.search;

  protected readonly Math = Math;

  constructor() {
    this.#sidebarService.navbarTitle.set({
      title: 'Clientes',
    });
  }

  /** Actualizar búsqueda (debounce manual con timeout) */
  private searchTimeout: any;
  updateSearch(term: string): void {
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.clientsState.setSearch(term);
    }, 400);
  }

  /** Cambiar página */
  changePage(page: number): void {
    this.clientsState.setPage(page);
  }

  /** Refrescar datos */
  refreshData(): void {
    this.clientsState.refresh();
  }

  /** Limpiar búsqueda */
  clearSearch(): void {
    this.clientsState.setSearch('');
  }

  /** Páginas para el paginador */
  getPageNumbers(): number[] {
    return this.clientsState.getPageNumbers();
  }

  /** Obtener iniciales del nombre del cliente */
  getInitials(name: string): string {
    return name
      .split(' ')
      .map(w => w.charAt(0))
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  /** TrackBy */
  trackByClient(index: number, client: IClient): string {
    return client._id;
  }
}
