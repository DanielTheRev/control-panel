import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { PageLayout } from '../../shared/components/page-layout/page-layout';
import { SidebarService } from '../../services/sidebar.service';
import { StoreConfigService } from '../../services/store.config.service';
import { NotificationsService } from '../../services/notifications.service';

@Component({
  selector: 'app-recommendations',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    PageHeader,
    PageLayout,
  ],
  templateUrl: './recommendations.html',
})
export class RecommendationsComponent implements OnInit {
  #storeConfigService = inject(StoreConfigService);
  #sidebarService = inject(SidebarService);
  #notificationsService = inject(NotificationsService);

  limit = signal<number>(8);
  rules = signal<Record<string, string[]>>({});
  defaultRules = signal<Record<string, string[]>>({});
  availableCategories = signal<string[]>([]);
  isLoading = signal<boolean>(true);
  isSaving = signal<boolean>(false);

  ngOnInit() {
    this.#sidebarService.navbarTitle.set({ title: 'Recomendaciones' });
    this.loadConfig();
  }

  async loadConfig() {
    this.isLoading.set(true);
    try {
      const data = await this.#storeConfigService.getRecommendationsConfig();
      this.limit.set(data.limit || 8);
      this.defaultRules.set(data.defaultRules || {});

      const categories = data.availableCategories || [];
      this.availableCategories.set(categories);
      this.rules.set(data.rules || {});
    } catch (error) {
      this.#notificationsService.error('Error al cargar la configuración de recomendaciones');
    } finally {
      this.isLoading.set(false);
    }
  }

  getRecommendedForCategory(category: string): string[] {
    return this.rules()[category] || [];
  }

  addCategoryRule(category: string, targetToAdd: string) {
    if (!targetToAdd) return;
    const currentMap = { ...this.rules() };
    const currentList = currentMap[category] ? [...currentMap[category]] : [];
    if (!currentList.includes(targetToAdd)) {
      currentList.push(targetToAdd);
      currentMap[category] = currentList;
      this.rules.set(currentMap);
    }
  }

  removeCategoryRule(category: string, targetToRemove: string) {
    const currentMap = { ...this.rules() };
    const currentList = currentMap[category] ? [...currentMap[category]] : [];
    currentMap[category] = currentList.filter(item => item !== targetToRemove);
    this.rules.set(currentMap);
  }

  resetCategoryToDefault(category: string) {
    const currentMap = { ...this.rules() };
    const norm = category.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const def = this.defaultRules()[norm];
    const dbCats = this.availableCategories();
    if (def) {
      currentMap[category] = def.filter(target => dbCats.includes(target));
    } else {
      currentMap[category] = [];
    }
    this.rules.set(currentMap);
  }

  resetAllToDefaults() {
    const currentMap: Record<string, string[]> = {};
    const dbCats = this.availableCategories();
    dbCats.forEach(cat => {
      const norm = cat.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const def = this.defaultRules()[norm];
      currentMap[cat] = def ? def.filter(target => dbCats.includes(target)) : [];
    });
    this.rules.set(currentMap);
    this.#notificationsService.info('Se restablecieron las reglas sugeridas por defecto.');
  }

  async saveConfig() {
    this.isSaving.set(true);
    try {
      await this.#storeConfigService.updateRecommendationsConfig({
        limit: this.limit(),
        rules: this.rules()
      });
      this.#notificationsService.success('Configuración de recomendaciones guardada exitosamente');
    } catch (error) {
      this.#notificationsService.error('Error al guardar la configuración');
    } finally {
      this.isSaving.set(false);
    }
  }
}
