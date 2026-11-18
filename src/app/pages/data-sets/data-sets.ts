import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import {
  DataSetFilterField,
  DataSetFilterOperator,
  DataSetSortBy,
  IDataSet,
  IDataSetFilter,
} from '../../interfaces/data-set.interface';
import { IProduct } from '../../interfaces/product.interface';
import { BusinessProfileService } from '../../services/business-profile.service';
import { DataSetService } from '../../services/data-set.service';
import { NotificationsService } from '../../services/notifications.service';
import { SidebarService } from '../../services/sidebar.service';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { PageLayout } from '../../shared/components/page-layout/page-layout';

interface SelectOption<T extends string> {
  value: T;
  label: string;
  requiresMetrics?: boolean;
}

const FILTER_FIELDS: SelectOption<DataSetFilterField>[] = [
  { value: 'name', label: 'Nombre del producto' },
  { value: 'category', label: 'Categoría' },
  { value: 'brand', label: 'Marca' },
  { value: 'tags', label: 'Etiquetas (Tags)' },
  { value: 'price', label: 'Precio' },
  { value: 'stockStatus', label: 'Estado de stock' },
  { value: 'entityType', label: 'Tipo de entidad' },
  { value: 'salesCount', label: 'Cantidad de ventas (Métrica)', requiresMetrics: true },
  { value: 'viewsCount', label: 'Vistas (Métrica)', requiresMetrics: true },
  { value: 'cartAddsCount', label: 'Agregados al carrito (Métrica)', requiresMetrics: true },
];

const FILTER_OPERATORS: SelectOption<DataSetFilterOperator>[] = [
  { value: 'equals', label: 'Igual a (=)' },
  { value: 'not_equals', label: 'Distinto de (≠)' },
  { value: 'greater_than', label: 'Mayor que (>)' },
  { value: 'less_than', label: 'Menor que (<)' },
  { value: 'between', label: 'Entre (min,max)' },
  { value: 'in', label: 'Incluido en lista (coma)' },
  { value: 'not_in', label: 'Excluido de lista (coma)' },
  { value: 'contains', label: 'Contiene texto' },
  { value: 'not_contains', label: 'No contiene texto' },
];

const SORT_OPTIONS: SelectOption<DataSetSortBy>[] = [
  { value: 'newest', label: 'Más recientes' },
  { value: 'oldest', label: 'Más antiguos' },
  { value: 'alphabetical_asc', label: 'Alfabético (A-Z)' },
  { value: 'alphabetical_desc', label: 'Alfabético (Z-A)' },
  { value: 'price_asc', label: 'Menor precio primero' },
  { value: 'price_desc', label: 'Mayor precio primero' },
  { value: 'most_sold', label: 'Más vendidos (Métrica)', requiresMetrics: true },
  { value: 'most_viewed', label: 'Más vistos (Métrica)', requiresMetrics: true },
  { value: 'most_cart_adds', label: 'Más agregados al carrito (Métrica)', requiresMetrics: true },
];

@Component({
  selector: 'app-data-sets',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, PageLayout, PageHeader],
  templateUrl: './data-sets.html',
})
export class DataSetsComponent implements OnInit {
  private readonly dataSetService = inject(DataSetService);
  private readonly notifications = inject(NotificationsService);
  private readonly sidebarService = inject(SidebarService);
  readonly profile = inject(BusinessProfileService);

  dataSets = signal<IDataSet[]>([]);
  isLoading = signal(true);
  isSaving = signal(false);
  searchTerm = signal('');

  // Modal Crear / Editar
  isModalOpen = signal(false);
  editingId = signal<string | null>(null);
  formName = signal('');
  formSlug = signal('');
  formDescription = signal('');
  formMatchType = signal<'all' | 'any'>('all');
  formSortBy = signal<DataSetSortBy>('newest');
  formMaxItems = signal<number>(20);
  formIsActive = signal<boolean>(true);
  formFilters = signal<IDataSetFilter[]>([]);

  // Modal Preview "Probar en vivo"
  isPreviewOpen = signal(false);
  previewTitle = signal('');
  isPreviewLoading = signal(false);
  previewProducts = signal<IProduct[]>([]);

  readonly allowMetrics = computed(() => this.profile.features().allowMetricDataSets);

  readonly availableFields = computed(() =>
    FILTER_FIELDS.filter((f) => !f.requiresMetrics || this.allowMetrics())
  );

  readonly availableSorts = computed(() =>
    SORT_OPTIONS.filter((s) => !s.requiresMetrics || this.allowMetrics())
  );

  readonly operators = FILTER_OPERATORS;

  readonly filteredDataSets = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    if (!term) return this.dataSets();
    return this.dataSets().filter(
      (ds) =>
        ds.name.toLowerCase().includes(term) ||
        ds.slug.toLowerCase().includes(term) ||
        (ds.description || '').toLowerCase().includes(term)
    );
  });

  readonly activeCount = computed(() => this.dataSets().filter((d) => d.isActive).length);

  ngOnInit(): void {
    this.sidebarService.navbarTitle.set({
      title: 'Conjuntos de Datos',
    });
    this.loadDataSets();
  }

  loadDataSets(): void {
    this.isLoading.set(true);
    this.dataSetService.getAll().subscribe({
      next: (res) => {
        this.dataSets.set(res.data || []);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.notifications.error(err?.error?.message || 'Error al cargar conjuntos de datos');
        this.isLoading.set(false);
      },
    });
  }

  openCreateModal(): void {
    this.editingId.set(null);
    this.formName.set('');
    this.formSlug.set('');
    this.formDescription.set('');
    this.formMatchType.set('all');
    this.formSortBy.set('newest');
    this.formMaxItems.set(20);
    this.formIsActive.set(true);
    this.formFilters.set([{ field: 'category', operator: 'equals', value: '' }]);
    this.isModalOpen.set(true);
  }

  openEditModal(ds: IDataSet): void {
    this.editingId.set(ds._id || null);
    this.formName.set(ds.name);
    this.formSlug.set(ds.slug);
    this.formDescription.set(ds.description || '');
    this.formMatchType.set(ds.matchType || 'all');
    this.formSortBy.set(ds.sortBy || 'newest');
    this.formMaxItems.set(ds.maxItems || 20);
    this.formIsActive.set(ds.isActive !== false);
    this.formFilters.set(
      (ds.filters || []).map((f) => ({
        field: f.field,
        operator: f.operator,
        value: Array.isArray(f.value) ? f.value.join(', ') : String(f.value ?? ''),
      }))
    );
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
  }

  onNameChange(value: string): void {
    this.formName.set(value);
    if (!this.editingId()) {
      this.formSlug.set(this.slugify(value));
    }
  }

  addFilterRow(): void {
    this.formFilters.update((rows) => [
      ...rows,
      { field: 'category', operator: 'equals', value: '' },
    ]);
  }

  removeFilterRow(index: number): void {
    this.formFilters.update((rows) => rows.filter((_, i) => i !== index));
  }

  updateFilterRow(index: number, patch: Partial<IDataSetFilter>): void {
    this.formFilters.update((rows) =>
      rows.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );
  }

  saveDataSet(): void {
    const name = this.formName().trim();
    const slug = (this.formSlug().trim() || this.slugify(name)).trim();

    if (!name) {
      this.notifications.warning('Ingresá un nombre para el conjunto de datos');
      return;
    }

    const parsedFilters: IDataSetFilter[] = this.formFilters()
      .filter((f) => f.value !== '' && f.value !== null && f.value !== undefined)
      .map((f) => ({
        field: f.field,
        operator: f.operator,
        value: this.parseFilterValue(f.field, f.operator, f.value),
      }));

    const payload: Partial<IDataSet> = {
      name,
      slug,
      description: this.formDescription().trim() || undefined,
      matchType: this.formMatchType(),
      filters: parsedFilters,
      sortBy: this.formSortBy(),
      maxItems: Math.max(1, Number(this.formMaxItems()) || 20),
      isActive: this.formIsActive(),
    };

    this.isSaving.set(true);
    const id = this.editingId();
    const request$ = id
      ? this.dataSetService.update(id, payload)
      : this.dataSetService.create(payload);

    request$.subscribe({
      next: () => {
        this.notifications.success(id ? 'Conjunto de datos actualizado' : 'Conjunto de datos creado');
        this.isSaving.set(false);
        this.closeModal();
        this.loadDataSets();
      },
      error: (err) => {
        this.notifications.error(err?.error?.message || 'Error al guardar el conjunto de datos');
        this.isSaving.set(false);
      },
    });
  }

  testLive(ds: IDataSet): void {
    const target = ds.slug || ds._id;
    if (!target) return;

    this.previewTitle.set(ds.name);
    this.previewProducts.set([]);
    this.isPreviewLoading.set(true);
    this.isPreviewOpen.set(true);

    this.dataSetService.execute(target).subscribe({
      next: (res) => {
        this.previewProducts.set(res.data || []);
        this.isPreviewLoading.set(false);
      },
      error: (err) => {
        this.notifications.error(err?.error?.message || 'Error al ejecutar conjunto de datos');
        this.isPreviewLoading.set(false);
      },
    });
  }

  closePreview(): void {
    this.isPreviewOpen.set(false);
  }

  toggleActive(ds: IDataSet): void {
    if (!ds._id) return;
    this.dataSetService.update(ds._id, { isActive: !ds.isActive }).subscribe({
      next: () => {
        this.notifications.success(!ds.isActive ? 'Conjunto activado' : 'Conjunto desactivado');
        this.loadDataSets();
      },
      error: (err) => {
        this.notifications.error(err?.error?.message || 'Error al actualizar estado');
      },
    });
  }

  deleteDataSet(ds: IDataSet): void {
    if (!ds._id) return;
    if (!confirm(`¿Eliminar "${ds.name}"?`)) return;

    this.dataSetService.delete(ds._id).subscribe({
      next: () => {
        this.notifications.success('Conjunto de datos eliminado');
        this.loadDataSets();
      },
      error: (err) => {
        this.notifications.error(err?.error?.message || 'Error al eliminar');
      },
    });
  }

  getSortLabel(sortBy: DataSetSortBy): string {
    return SORT_OPTIONS.find((s) => s.value === sortBy)?.label || sortBy;
  }

  getProductPrice(product: IProduct): number {
    const p = product.price as any;
    if (typeof p === 'number') return p;
    return p?.cashTransferPrice || p?.listPrice || p?.card_ticket1PayPrice || 0;
  }

  private parseFilterValue(
    field: DataSetFilterField,
    operator: DataSetFilterOperator,
    raw: unknown
  ): unknown {
    const str = String(raw).trim();
    if (operator === 'in' || operator === 'not_in' || operator === 'between') {
      return str
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => (field === 'price' && !Number.isNaN(Number(s)) ? Number(s) : s));
    }
    if (
      field === 'price' ||
      field === 'salesCount' ||
      field === 'viewsCount' ||
      field === 'cartAddsCount'
    ) {
      const num = Number(str);
      return Number.isNaN(num) ? str : num;
    }
    return str;
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
