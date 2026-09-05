import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { PageLayout } from '../../shared/components/page-layout/page-layout';
import { SidebarService } from '../../services/sidebar.service';
import { CategoryGroupService } from '../../services/category-group.service';
import { ICategoryGroup, IRawCategoryCount } from '../../interfaces/category-group.interface';

@Component({
  selector: 'app-category-group-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    PageLayout,
    PageHeader
  ],
  templateUrl: './category-group-list.html',
  styleUrl: './category-group-list.scss'
})
export class CategoryGroupListComponent implements OnInit {
  private categoryGroupService = inject(CategoryGroupService);
  private sidebarService = inject(SidebarService);
  private snackBar = inject(MatSnackBar);

  groups = signal<ICategoryGroup[]>([]);
  rawCategories = signal<IRawCategoryCount[]>([]);
  isLoading = signal(true);
  searchTerm = signal('');

  // Grupos filtrados reactivamente por búsqueda
  filteredGroups = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    if (!term) return this.groups();

    return this.groups().filter(g => {
      const matchName = g.name.toLowerCase().includes(term);
      const matchSlug = g.slug.toLowerCase().includes(term);
      const matchDesc = (g.description || '').toLowerCase().includes(term);
      const matchTargets = g.targetCategories?.some(c => c.toLowerCase().includes(term));
      const matchSynonyms = g.synonyms?.some(s => s.toLowerCase().includes(term));
      return matchName || matchSlug || matchDesc || matchTargets || matchSynonyms;
    });
  });

  // Métricas
  activeCount = computed(() => this.groups().filter(g => g.isActive !== false).length);
  totalCatalogCategories = computed(() => this.rawCategories().length);

  constructor() {
    this.sidebarService.navbarTitle.set({
      title: 'Categorías & Taxonomía'
    });
  }

  ngOnInit(): void {
    this.loadData();
  }

  async loadData(): Promise<void> {
    this.isLoading.set(true);
    try {
      const [groups, rawCats] = await Promise.all([
        this.categoryGroupService.getCategoryGroups(),
        this.categoryGroupService.getRawCategories()
      ]);
      this.groups.set(groups);
      this.rawCategories.set(rawCats);
    } catch (err) {
      console.error(err);
      this.snackBar.open('Error al cargar las categorías', 'Cerrar', { duration: 3000 });
    } finally {
      this.isLoading.set(false);
    }
  }

  async toggleActive(group: ICategoryGroup, event: Event): Promise<void> {
    event.stopPropagation();
    if (!group._id) return;
    const newStatus = !group.isActive;
    try {
      await this.categoryGroupService.updateCategoryGroup(group._id, { isActive: newStatus });
      group.isActive = newStatus;
      this.groups.set([...this.groups()]);
      this.snackBar.open(
        `Categoría "${group.name}" ${newStatus ? 'activada' : 'desactivada'}`,
        'Cerrar',
        { duration: 2500 }
      );
    } catch (err) {
      console.error(err);
      this.snackBar.open('Error al cambiar estado de la categoría', 'Cerrar', { duration: 3000 });
    }
  }

  async deleteGroup(group: ICategoryGroup, event: Event): Promise<void> {
    event.stopPropagation();
    if (!group._id) return;
    if (confirm(`¿Estás seguro de que deseas eliminar la macro-categoría "${group.name}"?`)) {
      try {
        await this.categoryGroupService.deleteCategoryGroup(group._id);
        this.snackBar.open('Categoría eliminada correctamente', 'Cerrar', { duration: 3000 });
        this.loadData();
      } catch (err) {
        console.error(err);
        this.snackBar.open('Error al eliminar la categoría', 'Cerrar', { duration: 3000 });
      }
    }
  }

  copySlugQuery(slug: string, event: Event): void {
    event.stopPropagation();
    const query = `?category=${slug}`;
    navigator.clipboard.writeText(query);
    this.snackBar.open(`Parámetro "${query}" copiado al portapapeles`, 'Cerrar', { duration: 2000 });
  }
}
