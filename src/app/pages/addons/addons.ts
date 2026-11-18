import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { AddonCategory, ITenantAddonItem } from '../../interfaces/tenant-bootstrap.interface';
import { AddonsService } from '../../services/addons.service';
import { BusinessProfileService } from '../../services/business-profile.service';
import { NotificationsService } from '../../services/notifications.service';
import { SidebarService } from '../../services/sidebar.service';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { PageLayout } from '../../shared/components/page-layout/page-layout';
import { TenantBootstrapStateService } from '../../states/tenant-bootstrap.state.service';

const CATEGORY_LABELS: Record<AddonCategory, string> = {
  operaciones: 'Operaciones',
  producto: 'Producto',
  marketing: 'Marketing',
  fiscal: 'Fiscal',
  web_storefront: 'Tienda Web',
  tracking: 'Tracking',
};

@Component({
  selector: 'app-addons',
  standalone: true,
  imports: [CommonModule, MatIconModule, RouterLink, PageLayout, PageHeader],
  templateUrl: './addons.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddonsComponent implements OnInit {
  private readonly addonsService = inject(AddonsService);
  private readonly notifications = inject(NotificationsService);
  private readonly sidebarService = inject(SidebarService);
  readonly profile = inject(BusinessProfileService);
  readonly bootstrapState = inject(TenantBootstrapStateService);

  readonly selectedCategory = signal<AddonCategory | 'all'>('all');
  readonly isRefreshing = signal(false);

  readonly addons = this.profile.addons;

  readonly categories = computed<{ key: AddonCategory; label: string }[]>(() => {
    const present = new Set(this.addons().map((a) => a.category));
    return (Object.keys(CATEGORY_LABELS) as AddonCategory[])
      .filter((k) => present.has(k))
      .map((k) => ({ key: k, label: CATEGORY_LABELS[k] }));
  });

  readonly filteredAddons = computed<ITenantAddonItem[]>(() => {
    const cat = this.selectedCategory();
    const list = this.addons();
    if (cat === 'all') return list;
    return list.filter((a) => a.category === cat);
  });

  readonly activeCount = computed(() => this.addons().filter((a) => a.isActive).length);
  readonly pendingSetupCount = computed(
    () => this.addons().filter((a) => a.status === 'pending_setup').length,
  );

  ngOnInit(): void {
    this.sidebarService.navbarTitle.set({
      title: 'Complementos & Módulos',
    });
  }

  refreshCatalog(): void {
    this.isRefreshing.set(true);
    this.bootstrapState.refresh();
    this.addonsService.getCatalog().subscribe({
      next: () => {
        this.isRefreshing.set(false);
        this.notifications.success('Catálogo de complementos sincronizado');
      },
      error: (err) => {
        this.isRefreshing.set(false);
        this.notifications.error(err?.error?.message || 'Error al sincronizar complementos');
      },
    });
  }

  getCategoryLabel(category: AddonCategory): string {
    return CATEGORY_LABELS[category] || category;
  }
}
