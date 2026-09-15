import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { PageLayout } from '../../shared/components/page-layout/page-layout';
import { ArcaService, IMonotributoCategoryScale, IMonotributoReport } from '../../services/arca.service';
import { StoreConfigService } from '../../services/store.config.service';
import { NotificationsService } from '../../services/notifications.service';

@Component({
  selector: 'app-fiscal-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CurrencyPipe,
    MatIconModule,
    RouterLink,
    PageHeader,
    PageLayout
  ],
  templateUrl: './fiscal-dashboard.html',
  styleUrl: './fiscal-dashboard.scss'
})
export class FiscalDashboardComponent implements OnInit {
  private arcaService = inject(ArcaService);
  private storeConfigService = inject(StoreConfigService);
  private notifications = inject(NotificationsService);

  report = signal<IMonotributoReport | null>(null);
  loading = signal<boolean>(true);
  updatingCategory = signal<boolean>(false);
  selectedCategory = signal<string>('C');

  categoriesList: string[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'];

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.arcaService.getMonotributoReport().subscribe({
      next: (data) => {
        this.report.set(data);
        this.selectedCategory.set(data.declaredCategory);
        this.loading.set(false);
      },
      error: () => {
        this.notifications.error('Error al calcular las métricas fiscales de Monotributo');
        this.loading.set(false);
      }
    });
  }

  async changeDeclaredCategory(newCat: string): Promise<void> {
    if (this.updatingCategory() || newCat === this.report()?.declaredCategory) return;
    this.updatingCategory.set(true);
    try {
      await this.storeConfigService.updateConfig({
        fiscalProfile: {
          monotributoCategory: newCat as any
        }
      });
      this.selectedCategory.set(newCat);
      this.notifications.success(`Categoría de Monotributo actualizada a "${newCat}"`);
      this.loadData();
    } catch {
      this.notifications.error('No se pudo actualizar la categoría de Monotributo.');
    } finally {
      this.updatingCategory.set(false);
    }
  }

  getMaxMonthSales(): number {
    const rep = this.report();
    if (!rep || !rep.monthlyBreakdown || rep.monthlyBreakdown.length === 0) return 1;
    const max = Math.max(...rep.monthlyBreakdown.map(m => m.totalBilled));
    return max > 0 ? max : 1;
  }

  getBarHeightPercentage(amount: number): number {
    const max = this.getMaxMonthSales();
    return Math.max(8, Math.round((amount / max) * 100));
  }
}
