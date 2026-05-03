import { CommonModule, CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';

import { IFavoritesByProduct } from '../../interfaces/favorites.interface';
import { SidebarService } from '../../services/sidebar.service';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { PageLayout } from '../../shared/components/page-layout/page-layout';
import { FavoritesStateService } from '../../states/favorites.state.service';

@Component({
  selector: 'app-favorites',
  standalone: true,
  imports: [
    CommonModule,
    PageLayout,
    PageHeader,
    CurrencyPipe,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatTooltipModule,
  ],
  templateUrl: './favorites.html',
  styleUrl: './favorites.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FavoritesComponent {
  private favoritesState = inject(FavoritesStateService);
  #sidebarService = inject(SidebarService);

  // Estado consolidado del resource
  readonly state = this.favoritesState.state;
  readonly notifying = this.favoritesState.notifying;
  readonly notifyResults = this.favoritesState.notifyResults;

  // Extracciones directas para el template
  readonly favorites = computed(() => this.state().data);
  readonly isLoading = computed(() => this.state().isLoading);
  readonly hasData = computed(() => this.state().hasData);
  readonly hasError = computed(() => this.state().hasError);

  // Signal para controlar qué producto tiene la lista de usuarios expandida
  private _expandedProduct = signal<string | null>(null);
  readonly expandedProduct = this._expandedProduct.asReadonly();

  // Search
  private _searchTerm = signal('');
  readonly searchTerm = this._searchTerm.asReadonly();

  // Filtro de búsqueda
  readonly filteredFavorites = computed(() => {
    const term = this._searchTerm().toLowerCase().trim();
    const data = this.favorites();
    if (!term) return data;
    return data.filter(fav =>
      fav.product.brand.toLowerCase().includes(term) ||
      fav.product.model.toLowerCase().includes(term) ||
      fav.product.category.toLowerCase().includes(term)
    );
  });

  // Stats
  readonly totalProducts = computed(() => this.favorites().length);
  readonly totalFavorites = computed(() =>
    this.favorites().reduce((sum, fav) => sum + fav.favoritesCount, 0)
  );
  readonly uniqueUsers = computed(() => {
    const userIds = new Set<string>();
    this.favorites().forEach(fav =>
      fav.users.forEach(u => userIds.add(u._id))
    );
    return userIds.size;
  });

  constructor() {
    this.#sidebarService.navbarTitle.set({
      title: 'Favoritos',
    });
  }

  /** Toggle expandir/colapsar usuarios de un producto */
  toggleExpand(productId: string): void {
    this._expandedProduct.update(current =>
      current === productId ? null : productId
    );
  }

  /** Verificar si un producto está expandido */
  isExpanded(productId: string): boolean {
    return this._expandedProduct() === productId;
  }

  /** Enviar notificación de stock */
  async sendNotification(productId: string): Promise<void> {
    await this.favoritesState.notifyBackInStock(productId);
  }

  /** Verifica si un producto está siendo notificado */
  isNotifying(productId: string): boolean {
    return this.notifying()[productId] ?? false;
  }

  /** Obtiene el resultado de notificación de un producto */
  getNotifyResult(productId: string): { success: boolean; message: string } | undefined {
    return this.notifyResults()[productId];
  }

  /** Refresh */
  refreshData(): void {
    this.favoritesState.refresh();
  }

  /** Actualizar búsqueda */
  updateSearch(term: string): void {
    this._searchTerm.set(term);
  }

  /** TrackBy para la lista de productos */
  trackByProduct(index: number, item: IFavoritesByProduct): string {
    return item.product._id;
  }
}
