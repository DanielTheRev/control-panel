import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import {
  IMarketplaceAddonItem,
  IMarketplaceData,
  IMarketplaceTemplateItem,
} from '../../interfaces/marketplace.interface';
import { MarketplaceService } from '../../services/marketplace.service';
import { NotificationsService } from '../../services/notifications.service';
import { StorefrontTemplatesService } from '../../services/storefront-templates.service';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { PageLayout } from '../../shared/components/page-layout/page-layout';
import { TenantBootstrapStateService } from '../../states/tenant-bootstrap.state.service';

@Component({
  selector: 'app-vexx-marketplace',
  standalone: true,
  imports: [CommonModule, MatIconModule, RouterLink, PageLayout, PageHeader],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-layout [flush]="true">
      <app-page-header
        title="Tienda Vexx & Mis Recursos"
        subtitle="Explorá plantillas móviles y web, activá complementos y seguí el estado de tus solicitudes"
      >
        <div sub-menu class="inline-flex items-center gap-1.5 p-1 bg-base-100/80 rounded-2xl border border-base-200 shadow-2xs">
          <button
            type="button"
            class="btn btn-xs rounded-xl font-bold gap-1.5"
            [ngClass]="activeTab() === 'templates' ? 'btn-primary' : 'btn-ghost text-base-content/70'"
            (click)="activeTab.set('templates')"
          >
            <mat-icon class="text-[13px]! w-3.5! h-3.5!">palette</mat-icon>
            <span>Plantillas</span>
          </button>
          <button
            type="button"
            class="btn btn-xs rounded-xl font-bold gap-1.5"
            [ngClass]="activeTab() === 'addons' ? 'btn-primary' : 'btn-ghost text-base-content/70'"
            (click)="activeTab.set('addons')"
          >
            <mat-icon class="text-[13px]! w-3.5! h-3.5!">extension</mat-icon>
            <span>Complementos</span>
          </button>
          <button
            type="button"
            class="btn btn-xs rounded-xl font-bold gap-1.5"
            [ngClass]="activeTab() === 'owned' ? 'btn-primary' : 'btn-ghost text-base-content/70'"
            (click)="activeTab.set('owned')"
          >
            <mat-icon class="text-[13px]! w-3.5! h-3.5!">inventory</mat-icon>
            <span>Mis Recursos</span>
            @if ((data()?.summary?.pendingRequestsCount ?? 0) > 0) {
              <span class="badge badge-warning badge-xs font-bold">
                {{ data()!.summary.pendingRequestsCount }}
              </span>
            }
          </button>
        </div>
      </app-page-header>

      <ng-container content>
        <div class="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
          @if (isLoading() && !data()) {
            <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
              @for (i of [1, 2, 3, 4]; track i) {
                <div class="skeleton h-20 rounded-xl"></div>
              }
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              @for (i of [1, 2, 3]; track i) {
                <div class="skeleton h-64 rounded-xl"></div>
              }
            </div>
          } @else if (loadError()) {
            <div class="p-6 rounded-xl bg-error/10 border border-error/25 text-center space-y-3">
              <p class="text-sm font-semibold text-error">{{ loadError() }}</p>
              <button type="button" class="btn btn-sm btn-error btn-outline" (click)="load()">
                Reintentar
              </button>
            </div>
          } @else if (data(); as mp) {
            <!-- Resumen de tenencias del comercio -->
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div class="rounded-xl border border-base-200 bg-base-100 p-3.5">
                <span class="text-[11px] uppercase tracking-wide text-base-content/55 font-semibold block">Plan Actual</span>
                <span class="text-base font-black text-primary uppercase">{{ mp.summary.planTier }}</span>
              </div>
              <div class="rounded-xl border border-base-200 bg-base-100 p-3.5">
                <span class="text-[11px] uppercase tracking-wide text-base-content/55 font-semibold block">Complementos</span>
                <span class="text-base font-black text-base-content">{{ mp.summary.ownedAddonsCount }} activos</span>
              </div>
              <div class="rounded-xl border border-base-200 bg-base-100 p-3.5">
                <span class="text-[11px] uppercase tracking-wide text-base-content/55 font-semibold block">Plantillas</span>
                <span class="text-base font-black text-base-content">{{ mp.summary.ownedTemplatesCount }} desbloqueadas</span>
              </div>
              <div class="rounded-xl border border-base-200 bg-base-100 p-3.5 flex items-center justify-between gap-2">
                <div class="min-w-0">
                  <span class="text-[11px] uppercase tracking-wide text-base-content/55 font-semibold block">Tu Tienda</span>
                  <a
                    [href]="mp.summary.publicUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-xs font-mono font-bold text-primary hover:underline truncate block"
                  >
                    {{ mp.summary.customDomain || mp.summary.publicUrl }}
                  </a>
                </div>
                <a
                  routerLink="/home/settings"
                  [queryParams]="{ tab: 'storefront_and_connection' }"
                  class="btn btn-ghost btn-xs btn-square"
                  title="Configurar dominio y conexión"
                >
                  <mat-icon class="!text-[16px] !w-4 !h-4">settings</mat-icon>
                </a>
              </div>
            </div>

            <!-- TAB 1: PLANTILLAS -->
            @if (activeTab() === 'templates') {
              <div class="space-y-4">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <div class="join">
                    <button
                      type="button"
                      class="btn btn-xs join-item"
                      [class.btn-primary]="templateFilter() === 'all'"
                      [class.btn-outline]="templateFilter() !== 'all'"
                      (click)="templateFilter.set('all')"
                    >
                      Todas ({{ mp.templates.length }})
                    </button>
                    <button
                      type="button"
                      class="btn btn-xs join-item"
                      [class.btn-primary]="templateFilter() === 'mobile_catalog'"
                      [class.btn-outline]="templateFilter() !== 'mobile_catalog'"
                      (click)="templateFilter.set('mobile_catalog')"
                    >
                      Catálogo Móvil (POINT)
                    </button>
                    <button
                      type="button"
                      class="btn btn-xs join-item"
                      [class.btn-primary]="templateFilter() === 'full_website'"
                      [class.btn-outline]="templateFilter() !== 'full_website'"
                      (click)="templateFilter.set('full_website')"
                    >
                      Web Completa (PRO)
                    </button>
                  </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  @for (tpl of filteredTemplates(); track tpl.key) {
                    @let isPending = hasPendingRequest('template', tpl.key);
                    <div
                      class="rounded-xl border bg-base-100 overflow-hidden flex flex-col justify-between transition-all"
                      [class.border-primary]="tpl.isActive"
                      [class.ring-1]="tpl.isActive"
                      [class.ring-primary/30]="tpl.isActive"
                      [class.border-base-200]="!tpl.isActive"
                    >
                      <div>
                        <div class="relative aspect-video bg-base-200 overflow-hidden">
                          @if (tpl.thumbnailUrl) {
                            <img [src]="tpl.thumbnailUrl" [alt]="tpl.name" class="w-full h-full object-cover" />
                          } @else {
                            <div class="w-full h-full flex items-center justify-center text-base-content/30">
                              <mat-icon class="!text-[36px] !w-9 !h-9">web</mat-icon>
                            </div>
                          }
                          <div class="absolute top-2 left-2 flex items-center gap-1.5">
                            <span class="badge badge-xs font-bold uppercase bg-neutral/80 text-white border-0">
                              {{ tpl.minPlanTier }}
                            </span>
                            <span class="badge badge-xs font-semibold bg-base-100/90 text-base-content border-0">
                              {{ tpl.templateKind === 'mobile_catalog' ? 'Catálogo Móvil' : 'Web Completa' }}
                            </span>
                          </div>
                          @if (tpl.isActive) {
                            <span class="badge badge-success badge-xs text-white font-bold absolute top-2 right-2">
                              Activa
                            </span>
                          }
                        </div>

                        <div class="p-4 space-y-2">
                          <h3 class="font-bold text-sm text-base-content">{{ tpl.name }}</h3>
                          <p class="text-xs text-base-content/65 line-clamp-2">{{ tpl.shortDescription }}</p>
                          @if (tpl.features.length > 0) {
                            <ul class="space-y-0.5 pt-1">
                              @for (feat of tpl.features.slice(0, 3); track feat) {
                                <li class="text-[11px] text-base-content/70 flex items-center gap-1">
                                  <span class="text-primary font-bold">✓</span>
                                  <span class="truncate">{{ feat }}</span>
                                </li>
                              }
                            </ul>
                          }
                        </div>
                      </div>

                      <div class="p-4 pt-0 flex items-center justify-between gap-2">
                        @if (tpl.previewUrl) {
                          <a
                            [href]="tpl.previewUrl"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="btn btn-xs btn-ghost rounded-lg gap-1"
                          >
                            <mat-icon class="!text-[14px] !w-3.5 !h-3.5">visibility</mat-icon>
                            Demo
                          </a>
                        } @else {
                          <span></span>
                        }

                        @if (tpl.isActive) {
                          <a
                            routerLink="/home/settings"
                            [queryParams]="{ tab: 'storefront_and_connection' }"
                            class="btn btn-xs btn-outline btn-primary rounded-lg font-bold"
                          >
                            Personalizar
                          </a>
                        } @else if (tpl.isUnlocked) {
                          <button
                            type="button"
                            class="btn btn-xs btn-primary rounded-lg font-bold"
                            [disabled]="busyItemId() === tpl.key"
                            (click)="activateTemplate(tpl)"
                          >
                            @if (busyItemId() === tpl.key) {
                              <span class="loading loading-spinner loading-xs"></span>
                            } @else {
                              Activar
                            }
                          </button>
                        } @else if (isPending) {
                          <span class="badge badge-warning badge-outline badge-xs font-semibold">
                            Solicitud enviada
                          </span>
                        } @else if (tpl.canRequestPurchase) {
                          <button
                            type="button"
                            class="btn btn-xs btn-outline btn-primary rounded-lg font-bold"
                            [disabled]="busyItemId() === tpl.key"
                            (click)="requestPurchase('template', tpl.key, tpl.name)"
                          >
                            @if (busyItemId() === tpl.key) {
                              <span class="loading loading-spinner loading-xs"></span>
                            } @else {
                              Solicitar ({{ formatPrice(tpl.monthlyPriceARS || tpl.oneTimePriceARS || tpl.priceARS) }})
                            }
                          </button>
                        } @else {
                          <span class="badge badge-ghost badge-xs">Plan {{ tpl.minPlanTier.toUpperCase() }}</span>
                        }
                      </div>
                    </div>
                  }
                </div>
              </div>
            }

            <!-- TAB 2: COMPLEMENTOS -->
            @if (activeTab() === 'addons') {
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                @for (addon of mp.addons; track addon.id) {
                  @let isPending = hasPendingRequest('addon', addon.id);
                  <div class="rounded-xl border border-base-200 bg-base-100 p-4 flex flex-col justify-between gap-3">
                    <div class="space-y-2">
                      <div class="flex items-start justify-between gap-2">
                        <div class="flex items-center gap-2.5">
                          <div class="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <mat-icon class="!text-[18px] !w-4.5 !h-4.5">{{ addon.icon || 'extension' }}</mat-icon>
                          </div>
                          <div>
                            <h3 class="font-bold text-sm text-base-content">{{ addon.name }}</h3>
                            <span class="text-[10px] uppercase tracking-wide text-base-content/50 font-semibold">
                              {{ addon.category }}
                            </span>
                          </div>
                        </div>
                        @if (addon.isOwned) {
                          <span class="badge badge-success badge-xs text-white font-bold">Activo</span>
                        }
                      </div>
                      <p class="text-xs text-base-content/65 leading-relaxed">{{ addon.shortDescription }}</p>
                    </div>

                    <div class="flex items-center justify-between gap-2 pt-2 border-t border-base-200/70">
                      <span class="text-xs font-bold text-base-content/70">
                        {{ addon.isIncludedInPlan ? 'Incluido en tu plan' : (addon.monthlyPriceARS ? formatPrice(addon.monthlyPriceARS) + '/mes' : 'A medida') }}
                      </span>

                      @if (addon.isOwned) {
                        @if (addon.settingsRoute) {
                          <a [routerLink]="addon.settingsRoute" class="btn btn-xs btn-ghost text-primary font-bold">
                            Configurar →
                          </a>
                        }
                      } @else if (addon.canActivateDirectly) {
                        <button
                          type="button"
                          class="btn btn-xs btn-primary rounded-lg font-bold"
                          [disabled]="busyItemId() === addon.id"
                          (click)="requestPurchase('addon', addon.id, addon.name)"
                        >
                          Activar
                        </button>
                      } @else if (isPending) {
                        <span class="badge badge-warning badge-outline badge-xs font-semibold">
                          Solicitud enviada
                        </span>
                      } @else if (addon.canRequestPurchase) {
                        <button
                          type="button"
                          class="btn btn-xs btn-outline btn-primary rounded-lg font-bold"
                          [disabled]="busyItemId() === addon.id"
                          (click)="requestPurchase('addon', addon.id, addon.name)"
                        >
                          Solicitar
                        </button>
                      }
                    </div>
                  </div>
                }
              </div>
            }

            <!-- TAB 3: MIS RECURSOS & SOLICITUDES -->
            @if (activeTab() === 'owned') {
              <div class="space-y-6">
                <!-- Mis Plantillas -->
                <div class="bg-base-100 rounded-xl border border-base-200 p-4 space-y-3">
                  <h3 class="text-xs font-bold uppercase tracking-wide text-base-content/75">
                    Mis Plantillas Desbloqueadas ({{ ownedTemplates().length }})
                  </h3>
                  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    @for (tpl of ownedTemplates(); track tpl.key) {
                      <div class="p-3 rounded-lg border border-base-200 flex items-center justify-between gap-2">
                        <div class="min-w-0">
                          <p class="text-xs font-bold truncate">{{ tpl.name }}</p>
                          <p class="text-[11px] text-base-content/55">
                            {{ tpl.templateKind === 'mobile_catalog' ? 'Catálogo Móvil' : 'Web Completa' }}
                          </p>
                        </div>
                        @if (tpl.isActive) {
                          <span class="badge badge-success badge-xs text-white font-bold">En uso</span>
                        } @else {
                          <button
                            type="button"
                            class="btn btn-xs btn-primary"
                            [disabled]="busyItemId() === tpl.key"
                            (click)="activateTemplate(tpl)"
                          >
                            Activar
                          </button>
                        }
                      </div>
                    }
                  </div>
                </div>

                <!-- Mis Complementos -->
                <div class="bg-base-100 rounded-xl border border-base-200 p-4 space-y-3">
                  <h3 class="text-xs font-bold uppercase tracking-wide text-base-content/75">
                    Mis Complementos Activos ({{ ownedAddons().length }})
                  </h3>
                  <div class="flex flex-wrap gap-2">
                    @for (addon of ownedAddons(); track addon.id) {
                      <span class="badge badge-sm bg-base-200 border-base-300 py-2.5 px-3 font-semibold gap-1.5">
                        <mat-icon class="!text-[14px] !w-3.5 !h-3.5 text-primary">{{ addon.icon || 'extension' }}</mat-icon>
                        {{ addon.name }}
                      </span>
                    }
                  </div>
                </div>

                <!-- Historial de Solicitudes -->
                <div class="bg-base-100 rounded-xl border border-base-200 p-4 space-y-3">
                  <h3 class="text-xs font-bold uppercase tracking-wide text-base-content/75">
                    Historial de Solicitudes ({{ mp.requests.length }})
                  </h3>
                  @if (mp.requests.length === 0) {
                    <p class="text-xs text-base-content/50">No realizaste solicitudes de compra todavía.</p>
                  } @else {
                    <div class="overflow-x-auto">
                      <table class="table table-xs">
                        <thead>
                          <tr>
                            <th>Ítem</th>
                            <th>Tipo</th>
                            <th>Estado</th>
                            <th>Nota</th>
                          </tr>
                        </thead>
                        <tbody>
                          @for (req of mp.requests; track req._id) {
                            <tr>
                              <td class="font-semibold">{{ req.itemName }}</td>
                              <td class="uppercase text-[10px]">{{ req.kind === 'template' ? 'Plantilla' : 'Addon' }}</td>
                              <td>
                                <span
                                  class="badge badge-xs font-bold"
                                  [class.badge-warning]="req.status === 'pending'"
                                  [class.badge-success]="req.status === 'approved'"
                                  [class.badge-error]="req.status === 'rejected'"
                                >
                                  {{ req.status === 'pending' ? 'Pendiente' : req.status === 'approved' ? 'Aprobada' : 'Rechazada' }}
                                </span>
                              </td>
                              <td class="text-base-content/60">{{ req.resolutionNote || '-' }}</td>
                            </tr>
                          }
                        </tbody>
                      </table>
                    </div>
                  }
                </div>
              </div>
            }
          }
        </div>
      </ng-container>
    </app-page-layout>
  `,
})
export class VexxMarketplaceComponent implements OnInit {
  private readonly marketplaceService = inject(MarketplaceService);
  private readonly templatesService = inject(StorefrontTemplatesService);
  private readonly bootstrapState = inject(TenantBootstrapStateService);
  private readonly notifications = inject(NotificationsService);

  activeTab = signal<'templates' | 'addons' | 'owned'>('templates');
  templateFilter = signal<'all' | 'mobile_catalog' | 'full_website'>('all');
  isLoading = signal(false);
  loadError = signal<string | null>(null);
  data = signal<IMarketplaceData | null>(null);
  busyItemId = signal<string | null>(null);

  readonly filteredTemplates = computed<IMarketplaceTemplateItem[]>(() => {
    const all = this.data()?.templates ?? [];
    const f = this.templateFilter();
    return f === 'all' ? all : all.filter((t) => t.templateKind === f);
  });

  readonly ownedTemplates = computed(() =>
    (this.data()?.templates ?? []).filter((t) => t.isUnlocked)
  );

  readonly ownedAddons = computed<IMarketplaceAddonItem[]>(() =>
    (this.data()?.addons ?? []).filter((a) => a.isOwned)
  );

  ngOnInit(): void {
    this.load();
  }

  async load(): Promise<void> {
    this.isLoading.set(true);
    this.loadError.set(null);
    try {
      const mp = await this.marketplaceService.getMarketplace();
      this.data.set(mp);
    } catch (err: any) {
      this.loadError.set(
        err?.error?.message || err?.message || 'No se pudo cargar la Tienda Vexx.'
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  hasPendingRequest(kind: 'addon' | 'template', itemId: string): boolean {
    return (this.data()?.requests ?? []).some(
      (r) => r.kind === kind && r.itemId === itemId && r.status === 'pending'
    );
  }

  async activateTemplate(tpl: IMarketplaceTemplateItem): Promise<void> {
    if (this.busyItemId()) return;
    this.busyItemId.set(tpl.key);
    try {
      await this.templatesService.activateTemplate(tpl.key);
      this.notifications.success(`Plantilla "${tpl.name}" activada.`);
      await this.load();
      this.bootstrapState.refresh();
    } catch (err: any) {
      this.notifications.error(
        err?.error?.message || err?.message || 'No se pudo activar la plantilla.'
      );
    } finally {
      this.busyItemId.set(null);
    }
  }

  async requestPurchase(
    kind: 'addon' | 'template',
    itemId: string,
    itemName: string
  ): Promise<void> {
    if (this.busyItemId()) return;
    this.busyItemId.set(itemId);
    try {
      const res = await this.marketplaceService.purchaseItem(kind, itemId);
      if (res.status === 'approved') {
        this.notifications.success(`"${itemName}" activado en tu comercio.`);
        this.bootstrapState.refresh();
      } else {
        this.notifications.info(`Solicitud enviada para "${itemName}".`);
      }
      await this.load();
    } catch (err: any) {
      this.notifications.error(
        err?.error?.message || err?.message || 'No se pudo procesar la solicitud.'
      );
    } finally {
      this.busyItemId.set(null);
    }
  }

  formatPrice(amount?: number): string {
    if (!amount || amount <= 0) return 'Consultar';
    return `$${amount.toLocaleString('es-AR')}`;
  }
}
