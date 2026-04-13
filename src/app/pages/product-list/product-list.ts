import { CurrencyPipe, NgClass } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatIcon } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router, RouterLink } from '@angular/router';
import { IProduct, ProductType } from '../../interfaces/product.interface';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { PageLayout } from '../../shared/components/page-layout/page-layout';
import { ProductStoreService } from '../../states/product.state.service';
import { getStoreUrl } from '../../utils/tenant.utils';
import { SidebarService } from '../../services/sidebar.service';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { StoreConfigStateService } from '../../states/store.config.state.service';

@Component({
  selector: 'app-product-list',
  imports: [
    PageLayout,
    PageHeader,
    MatIcon,
    MatChipsModule,
    MatTableModule,
    MatPaginatorModule,
    MatDividerModule,
    MatMenuModule,
    CurrencyPipe,
    NgClass,
    RouterLink,
    MatSnackBarModule,
    MatTooltipModule,
  ],
  templateUrl: './product-list.html',
  styleUrl: './product-list.scss',
})
export class ProductList {
  ProductState = inject(ProductStoreService);
  #StoreConfigState = inject(StoreConfigStateService)
  #SidebarService = inject(SidebarService)
  #snackBar = inject(MatSnackBar);
  #router = inject(Router);

  activeFilter = signal<string>('all');
  dataSource = new MatTableDataSource<IProduct>([]);
  private searchSubject = new Subject<string>();

  // Selection state
  selectedProducts = signal<string[]>([]);

  displayedColumns: string[] = [
    'select',
    'image',
    'brand',
    'provider',
    'type',
    'category',
    'stock',
    'price_cost',
    'price_cash',
    'price_installments',
  ];

  Categories = computed(() => {
    if (this.#StoreConfigState.StoreConfig().hasError) return []
    if (this.#StoreConfigState.StoreConfig().isLoading) return []
    return this.#StoreConfigState.StoreConfig().config.categories || []
  });

  constructor() {
    this.#SidebarService.navbarTitle.set({ title: 'Productos' });

    this.searchSubject.pipe(
      debounceTime(400),
      distinctUntilChanged()
    ).subscribe(query => {
      this.ProductState.setSearchQuery(query);
    });
  }

  onSearch(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchSubject.next(value);
  }

  onCategoryChange(event: Event) {
    const category = (event.target as HTMLSelectElement).value;
    this.ProductState.setCategoryFilter(category);
  }

  clearSearch() {
    this.ProductState.setSearchQuery('');
  }

  clearCategory() {
    this.ProductState.setCategoryFilter('');
  }

  clearAllFilters() {
    this.ProductState.setSearchQuery('');
    this.ProductState.setCategoryFilter('');
  }

  onPageChange(event: PageEvent) {
    this.ProductState.changePage(event.pageIndex + 1, event.pageSize);
  }

  getProductTypeLabel(type: string): string {
    return type === ProductType.TECH ? 'Tecnología' : 'Indumentaria';
  }

  getProductTypeClass(type: string): string {
    return type === ProductType.TECH
      ? 'badge badge-primary'
      : 'badge badge-success';
  }

  getTotalStock(product: IProduct): number {
    if (product.totalStock !== undefined) return product.totalStock;
    return product.variants
      ?.filter(v => v.isActive)
      .reduce((sum, v) => sum + v.stock, 0) || 0;
  }

  setFilter(filter: string) {
    this.activeFilter.set(filter);
  }

  viewProduct(product: IProduct) {
    this.#router.navigate(['/home/products', product._id]);
  }

  async deleteProduct(product: IProduct) {
    if (confirm(`¿Estás seguro de que deseas eliminar el producto ${product.model}?`)) {
      try {
        await this.ProductState.deleteProduct(product._id);
        this.#snackBar.open('Producto eliminado correctamente', 'Cerrar', {
          duration: 3000,
        });
      } catch (error) {
        this.#snackBar.open('Error al eliminar el producto', 'Cerrar', {
          duration: 3000,
        });
      }
    }
  }

  copyLink(product: IProduct) {
    const url = `${getStoreUrl()}/products/${product.slug}`;
    navigator.clipboard.writeText(url).then(() => {
      this.#snackBar.open('Enlace copiado al portapapeles', 'Cerrar', {
        duration: 2000,
      });
    });
  }

  // Row Selection Logic
  toggleSelection(productId: string, event: Event) {
    event.stopPropagation();
    const currentSelected = this.selectedProducts();
    if (currentSelected.includes(productId)) {
      this.selectedProducts.set(currentSelected.filter(id => id !== productId));
    } else {
      this.selectedProducts.set([...currentSelected, productId]);
    }
  }

  isAllSelected(): boolean {
    const data = this.ProductState.products().data;
    if (!data || data.length === 0) return false;
    return data.every(p => this.selectedProducts().includes(p._id));
  }

  toggleAll(event: Event) {
    event.stopPropagation();
    const data = this.ProductState.products().data;
    if (!data || data.length === 0) return;

    if (this.isAllSelected()) {
      // Deselect all from current page
      const currentPageIds = data.map(p => p._id);
      this.selectedProducts.set(
        this.selectedProducts().filter(id => !currentPageIds.includes(id))
      );
    } else {
      // Select all from current page that aren't already selected
      const currentSelected = this.selectedProducts();
      const newIds = data
        .map(p => p._id)
        .filter(id => !currentSelected.includes(id));
      this.selectedProducts.set([...currentSelected, ...newIds]);
    }
  }

  clearSelection() {
    this.selectedProducts.set([]);
  }

  async deleteSelected() {
    const selectedCount = this.selectedProducts().length;
    if (selectedCount === 0) return;

    if (confirm(`¿Estás seguro de que deseas eliminar los ${selectedCount} productos seleccionados?`)) {
      try {
        // En la vida real harías una llamada a un endpoint bulk-delete.
        // Simulamos llamando uno por uno o podés pedirle a Cortix un endpoint.
        for (const id of this.selectedProducts()) {
          await this.ProductState.deleteProduct(id);
        }

        this.#snackBar.open(`${selectedCount} productos eliminados correctamente`, 'Cerrar', {
          duration: 3000,
        });
        this.clearSelection();
      } catch (error) {
        this.#snackBar.open('Error al eliminar algunos productos', 'Cerrar', {
          duration: 3000,
        });
      }
    }
  }
}
