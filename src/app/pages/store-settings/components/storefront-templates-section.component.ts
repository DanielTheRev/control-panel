import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import {
  ITenantStorefrontSummary,
  ITenantStorefrontTemplateItem,
} from '../../../interfaces/storefront-templates.interface';
import { NotificationsService } from '../../../services/notifications.service';
import { StorefrontTemplatesService } from '../../../services/storefront-templates.service';

@Component({
  selector: 'app-storefront-templates-section',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      <!-- 1. Subdominio gratuito Vexx -->
      @if (showVexxSubdomainInfo()) {
        <div class="bg-base-100 rounded-2xl border border-base-200 shadow-sm p-4 sm:p-6 space-y-3">
          <div class="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-base-200">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <mat-icon class="text-[20px]! w-5! h-5!">language</mat-icon>
              </div>
              <div>
                <h3 class="text-sm font-bold text-base-content">Enlace de tu Tienda Online</h3>
                <p class="text-xs text-base-content/55">
                  Compartí este link en WhatsApp, Instagram y redes sociales.
                </p>
              </div>
            </div>
            <span class="badge badge-success badge-sm text-white font-bold">Online</span>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <input
              type="text"
              readonly
              [value]="publicStoreUrl()"
              class="input input-sm input-bordered flex-1 min-w-[220px] rounded-xl font-mono text-xs bg-base-200/50 select-all"
            />
            <button
              type="button"
              class="btn btn-sm btn-outline btn-primary rounded-xl font-bold gap-1"
              (click)="copyPublicUrl()"
            >
              <mat-icon class="text-[15px]! w-4! h-4!">content_copy</mat-icon>
              <span>{{ isCopiedUrl() ? '¡Copiado!' : 'Copiar link' }}</span>
            </button>
            <a
              [href]="publicStoreUrl()"
              target="_blank"
              rel="noopener noreferrer"
              class="btn btn-sm btn-primary rounded-xl font-bold gap-1"
            >
              <mat-icon class="text-[15px]! w-4! h-4!">open_in_new</mat-icon>
              <span>Abrir tienda</span>
            </a>
          </div>
        </div>
      }

      <!-- 2. Dominio Propio (custom_domain) -->
      @if (showCustomDomainSetup()) {
        <div class="bg-base-100 rounded-2xl border border-base-200 shadow-sm p-4 sm:p-6 space-y-4">
          <div class="flex items-center gap-3 pb-3 border-b border-base-200">
            <div class="w-10 h-10 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center">
              <mat-icon class="text-[20px]! w-5! h-5!">dns</mat-icon>
            </div>
            <div>
              <h3 class="text-sm font-bold text-base-content">Dominio Propio Personalizado</h3>
              <p class="text-xs text-base-content/55">
                Conectá tu dominio (ej. <code>mitienda.com.ar</code>) para reemplazar el subdominio de Vexx.
              </p>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div class="sm:col-span-4 space-y-1">
              <label class="text-xs font-bold text-base-content/80 block">Modo de dominio</label>
              <select
                class="select select-sm select-bordered w-full rounded-xl text-xs"
                [ngModel]="domainMode()"
                (ngModelChange)="domainMode.set($event)"
              >
                <option value="vexx_subdomain">Subdominio gratuito (.vexx.com.ar)</option>
                <option value="custom_domain">Dominio propio personalizado</option>
              </select>
            </div>

            <div class="sm:col-span-6 space-y-1">
              <label class="text-xs font-bold text-base-content/80 block">Tu dominio</label>
              <input
                type="text"
                class="input input-sm input-bordered w-full rounded-xl font-mono text-xs"
                placeholder="ej. vura.com.ar"
                [disabled]="domainMode() !== 'custom_domain'"
                [ngModel]="customDomainInput()"
                (ngModelChange)="customDomainInput.set($event)"
              />
            </div>

            <div class="sm:col-span-2">
              <button
                type="button"
                class="btn btn-sm btn-primary w-full rounded-xl font-bold"
                [disabled]="isSavingDomain()"
                (click)="saveDomain()"
              >
                @if (isSavingDomain()) {
                  <span class="loading loading-spinner loading-xs"></span>
                } @else {
                  Guardar
                }
              </button>
            </div>
          </div>

          @if (dnsInstructions().length > 0) {
            <div class="p-3 rounded-xl bg-info/10 border border-info/25 space-y-1.5 text-xs">
              <p class="font-bold text-info">Instrucciones DNS:</p>
              <ul class="list-disc pl-4 space-y-0.5 text-base-content/80 font-mono text-[11px]">
                @for (line of dnsInstructions(); track line) {
                  <li>{{ line }}</li>
                }
              </ul>
            </div>
          }
        </div>
      }

      <!-- 3. Selector / Tienda de Plantillas + Personalización -->
      @if (showTemplateSelector()) {
        <div class="bg-base-100 rounded-2xl border border-base-200 shadow-sm p-4 sm:p-6 space-y-5">
          <div class="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-base-200">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <mat-icon class="text-[20px]! w-5! h-5!">palette</mat-icon>
              </div>
              <div>
                <h3 class="text-sm font-bold text-base-content">Tienda de Plantillas</h3>
                <p class="text-xs text-base-content/55">
                  Elegí el diseño de tu catálogo móvil o tienda web y personalizá sus colores y opciones.
                </p>
              </div>
            </div>
          </div>

          @if (isLoading()) {
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              @for (i of [1, 2, 3]; track i) {
                <div class="skeleton h-64 w-full rounded-xl"></div>
              }
            </div>
          } @else if (loadError()) {
            <div class="p-4 rounded-xl bg-error/10 border border-error/25 flex items-center justify-between gap-3 text-xs">
              <span class="text-error font-semibold">{{ loadError() }}</span>
              <button type="button" class="btn btn-xs btn-error btn-outline" (click)="loadTemplates()">
                Reintentar
              </button>
            </div>
          } @else if (templates().length === 0) {
            <p class="text-xs text-base-content/55">No hay plantillas disponibles para tu comercio.</p>
          } @else {
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              @for (tpl of templates(); track tpl.key) {
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
                          {{ formatCheckoutMode(tpl.checkoutMode) }}
                        </span>
                      </div>

                      @if (tpl.isActive) {
                        <span class="badge badge-success badge-xs text-white font-bold absolute top-2 right-2">
                          Activa
                        </span>
                      }
                    </div>

                    <div class="p-3.5 space-y-2">
                      <h4 class="font-bold text-sm text-base-content">{{ tpl.name }}</h4>
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

                  <div class="p-3.5 pt-0 flex items-center justify-between gap-2">
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
                      <span class="text-xs font-bold text-success flex items-center gap-1">
                        <mat-icon class="!text-[15px] !w-4 !h-4">check_circle</mat-icon>
                        En uso
                      </span>
                    } @else if (tpl.isUnlocked) {
                      <button
                        type="button"
                        class="btn btn-xs btn-primary rounded-lg font-bold"
                        [disabled]="activatingKey() === tpl.key"
                        (click)="activate(tpl)"
                      >
                        @if (activatingKey() === tpl.key) {
                          <span class="loading loading-spinner loading-xs"></span>
                        } @else {
                          Activar Plantilla
                        }
                      </button>
                    } @else {
                      <span class="badge badge-warning badge-outline badge-xs font-semibold">
                        {{ formatLockedLabel(tpl) }}
                      </span>
                    }
                  </div>
                </div>
              }
            </div>
          }

          <!-- Personalización de la plantilla activa (customizableFields) -->
          @if (activeTemplate(); as activeTpl) {
            @if (activeTpl.customizableFields.length > 0) {
              <div class="pt-4 border-t border-base-200 space-y-4">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 class="text-xs font-bold uppercase tracking-wide text-base-content/80">
                      Personalización de "{{ activeTpl.name }}"
                    </h4>
                    <p class="text-[11px] text-base-content/55">
                      Ajustá los parámetros visuales propios de tu plantilla activa.
                    </p>
                  </div>
                  <button
                    type="button"
                    class="btn btn-primary btn-xs rounded-lg font-bold gap-1"
                    [disabled]="isSavingSettings()"
                    (click)="saveSettings()"
                  >
                    @if (isSavingSettings()) {
                      <span class="loading loading-spinner loading-xs"></span>
                    } @else {
                      Guardar Personalización
                    }
                  </button>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  @for (field of activeTpl.customizableFields; track field.key) {
                    <div class="p-3 rounded-xl bg-base-200/35 border border-base-200 space-y-1.5">
                      @if (field.type === 'boolean') {
                        <label class="flex items-center justify-between gap-2 cursor-pointer">
                          <div>
                            <span class="text-xs font-semibold text-base-content block">{{ field.label }}</span>
                            @if (field.description) {
                              <span class="text-[11px] text-base-content/55">{{ field.description }}</span>
                            }
                          </div>
                          <input
                            type="checkbox"
                            class="toggle toggle-primary toggle-sm"
                            [ngModel]="!!editableSettings()[field.key]"
                            (ngModelChange)="updateSetting(field.key, $event)"
                          />
                        </label>
                      } @else if (field.type === 'color') {
                        <label class="text-xs font-semibold text-base-content block">{{ field.label }}</label>
                        <div class="flex items-center gap-2">
                          <input
                            type="color"
                            class="w-9 h-8 rounded cursor-pointer border border-base-300 p-0.5 bg-base-100"
                            [ngModel]="editableSettings()[field.key] || field.defaultValue"
                            (ngModelChange)="updateSetting(field.key, $event)"
                          />
                          <input
                            type="text"
                            class="input input-xs input-bordered flex-1 font-mono"
                            [ngModel]="editableSettings()[field.key] || field.defaultValue"
                            (ngModelChange)="updateSetting(field.key, $event)"
                          />
                        </div>
                      } @else if (field.type === 'select') {
                        <label class="text-xs font-semibold text-base-content block">{{ field.label }}</label>
                        <select
                          class="select select-xs select-bordered w-full"
                          [ngModel]="editableSettings()[field.key] ?? field.defaultValue"
                          (ngModelChange)="updateSetting(field.key, $event)"
                        >
                          @for (opt of field.options || []; track opt) {
                            <option [value]="opt">{{ opt }}</option>
                          }
                        </select>
                      } @else {
                        <label class="text-xs font-semibold text-base-content block">{{ field.label }}</label>
                        <input
                          type="text"
                          class="input input-xs input-bordered w-full"
                          [ngModel]="editableSettings()[field.key] ?? field.defaultValue"
                          (ngModelChange)="updateSetting(field.key, $event)"
                        />
                      }
                    </div>
                  }
                </div>
              </div>
            }
          }
        </div>
      }
    </div>
  `,
})
export class StorefrontTemplatesSectionComponent implements OnInit {
  private readonly service = inject(StorefrontTemplatesService);
  private readonly notifications = inject(NotificationsService);

  showTemplateSelector = input<boolean>(false);
  showVexxSubdomainInfo = input<boolean>(false);
  showCustomDomainSetup = input<boolean>(false);
  tenantSlug = input<string>('');

  isLoading = signal(false);
  loadError = signal<string | null>(null);
  storefront = signal<ITenantStorefrontSummary>({});
  templates = signal<ITenantStorefrontTemplateItem[]>([]);
  editableSettings = signal<Record<string, unknown>>({});

  activatingKey = signal<string | null>(null);
  isSavingSettings = signal(false);
  isSavingDomain = signal(false);
  isCopiedUrl = signal(false);

  domainMode = signal<'vexx_subdomain' | 'custom_domain'>('vexx_subdomain');
  customDomainInput = signal('');
  dnsInstructions = signal<string[]>([]);

  readonly activeTemplate = computed<ITenantStorefrontTemplateItem | null>(
    () => this.templates().find((t) => t.isActive) ?? null
  );

  readonly publicStoreUrl = computed(() => {
    const sf = this.storefront();
    if (sf.publicUrl) return sf.publicUrl;
    const slug = this.tenantSlug().trim();
    return slug ? `https://${slug}.vexx.com.ar` : 'https://vexx.com.ar';
  });

  ngOnInit(): void {
    this.loadTemplates();
  }

  async loadTemplates(): Promise<void> {
    this.isLoading.set(true);
    this.loadError.set(null);
    try {
      const { storefront, templates } = await this.service.getTemplates();
      this.applyState(storefront, templates);
    } catch (err: any) {
      this.loadError.set(
        err?.error?.message || err?.message || 'No se pudieron cargar las plantillas.'
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  private applyState(
    storefront: ITenantStorefrontSummary,
    templates: ITenantStorefrontTemplateItem[]
  ): void {
    this.storefront.set(storefront);
    this.templates.set(templates);
    this.domainMode.set(storefront.domainMode || 'vexx_subdomain');
    this.customDomainInput.set(storefront.customDomain || '');

    const active = templates.find((t) => t.isActive);
    if (active) {
      const merged: Record<string, unknown> = {};
      for (const f of active.customizableFields) {
        merged[f.key] = active.currentSettings?.[f.key] ?? f.defaultValue;
      }
      this.editableSettings.set(merged);
    }
  }

  async activate(tpl: ITenantStorefrontTemplateItem): Promise<void> {
    if (this.activatingKey()) return;
    this.activatingKey.set(tpl.key);
    try {
      const { storefront, templates } = await this.service.activateTemplate(tpl.key);
      this.applyState(storefront, templates);
      this.notifications.success(`Plantilla "${tpl.name}" activada.`);
    } catch (err: any) {
      this.notifications.error(
        err?.error?.message || err?.message || 'No se pudo activar la plantilla.'
      );
    } finally {
      this.activatingKey.set(null);
    }
  }

  updateSetting(key: string, value: unknown): void {
    this.editableSettings.update((prev) => ({ ...prev, [key]: value }));
  }

  async saveSettings(): Promise<void> {
    if (this.isSavingSettings()) return;
    this.isSavingSettings.set(true);
    try {
      const updated = await this.service.saveTemplateSettings(this.editableSettings());
      this.storefront.set(updated);
      this.notifications.success('Personalización de plantilla guardada.');
    } catch (err: any) {
      this.notifications.error(
        err?.error?.message || err?.message || 'No se pudo guardar la personalización.'
      );
    } finally {
      this.isSavingSettings.set(false);
    }
  }

  async saveDomain(): Promise<void> {
    if (this.isSavingDomain()) return;
    this.isSavingDomain.set(true);
    try {
      const { storefront, dnsInstructions } = await this.service.updateDomain({
        domainMode: this.domainMode(),
        customDomain: this.domainMode() === 'custom_domain' ? this.customDomainInput().trim() : null,
      });
      this.storefront.set(storefront);
      this.dnsInstructions.set(dnsInstructions ?? []);
      this.notifications.success('Configuración de dominio actualizada.');
    } catch (err: any) {
      this.notifications.error(
        err?.error?.message || err?.message || 'No se pudo actualizar el dominio.'
      );
    } finally {
      this.isSavingDomain.set(false);
    }
  }

  async copyPublicUrl(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.publicStoreUrl());
      this.isCopiedUrl.set(true);
      this.notifications.success('Enlace de tienda copiado.');
      setTimeout(() => this.isCopiedUrl.set(false), 2000);
    } catch {
      this.notifications.error('No se pudo copiar el enlace.');
    }
  }

  formatCheckoutMode(mode: string): string {
    if (mode === 'whatsapp_and_pickup') return 'WhatsApp & Retiro';
    if (mode === 'full_ecommerce') return 'E-commerce Full';
    return 'Híbrido';
  }

  formatLockedLabel(tpl: ITenantStorefrontTemplateItem): string {
    if (tpl.pricingType === 'monthly_addon' && tpl.monthlyPriceARS) {
      return `+\$${tpl.monthlyPriceARS}/mes`;
    }
    if (tpl.pricingType === 'one_time_purchase' && tpl.oneTimePriceARS) {
      return `\$${tpl.oneTimePriceARS} único`;
    }
    return `Plan ${tpl.minPlanTier.toUpperCase()}`;
  }
}
