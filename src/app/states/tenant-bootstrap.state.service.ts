import { computed, inject, Injectable } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { AuthService } from '../services/auth.service';
import {
  IBootstrapSettingsTab,
  IBootstrapSidebarGroup,
  IBootstrapSidebarItem,
  IBootstrapTheme,
  IPermissionSectionGroup,
  IPlanCapabilities,
  IProductFormConfig,
  IProductListViewConfig,
  ITenantAddonItem,
  ITenantBootstrapData,
  ITenantBootstrapResponse,
  VexxPlanTier,
} from '../interfaces/tenant-bootstrap.interface';

@Injectable({
  providedIn: 'root',
})
export class TenantBootstrapStateService {
  readonly #authService = inject(AuthService);

  readonly #bootstrapResource = httpResource<ITenantBootstrapData>(
    () =>
      this.#authService.isAuthenticated()
        ? `${environment.apiUrl}/tenant/bootstrap`
        : undefined,
    {
      parse: (value) => {
        const res = value as ITenantBootstrapResponse | ITenantBootstrapData;
        if (res && typeof res === 'object' && 'data' in res && res.data) {
          return res.data;
        }
        return res as ITenantBootstrapData;
      },
    },
  );

  readonly state = computed(() => ({
    hasData: this.#bootstrapResource.hasValue(),
    hasError: this.#bootstrapResource.error(),
    isLoading: this.#bootstrapResource.isLoading(),
    data: this.#bootstrapResource.value() ?? null,
  }));

  readonly data = computed<ITenantBootstrapData | null>(
    () => this.#bootstrapResource.value() ?? null,
  );

  readonly theme = computed<IBootstrapTheme | null>(
    () => this.data()?.theme ?? null,
  );

  readonly planTier = computed<VexxPlanTier | null>(
    () => this.data()?.tenant?.planTier ?? null,
  );

  readonly activeAddons = computed<string[]>(
    () => this.data()?.tenant?.activeAddons ?? [],
  );

  readonly customLabels = computed<Record<string, string>>(
    () => this.data()?.tenant?.customLabels ?? {},
  );

  readonly planCapabilities = computed<IPlanCapabilities | null>(
    () => this.data()?.capabilities ?? null,
  );

  readonly addons = computed<ITenantAddonItem[]>(
    () => this.data()?.addons ?? [],
  );

  readonly productFormConfig = computed<IProductFormConfig | null>(
    () => this.data()?.forms?.product ?? null,
  );

  readonly productListViewConfig = computed<IProductListViewConfig | null>(
    () => this.data()?.views?.productList ?? null,
  );

  readonly sidebarGroups = computed<IBootstrapSidebarGroup[]>(
    () => this.data()?.navigation?.sidebarGroups ?? [],
  );

  readonly settingsTabs = computed<IBootstrapSettingsTab[]>(
    () => this.data()?.navigation?.settingsTabs ?? [],
  );

  readonly permissionCatalog = computed<IPermissionSectionGroup[]>(
    () => this.data()?.permissionCatalog ?? [],
  );

  getSidebarItem(key: string): IBootstrapSidebarItem | null {
    for (const g of this.sidebarGroups()) {
      const found = g.items.find((i) => i.key === key);
      if (found) return found;
    }
    return null;
  }

  getSidebarAction<T extends boolean | number | string = boolean>(
    itemKey: string,
    actionKey: string,
    fallback?: T,
  ): T | undefined {
    const item = this.getSidebarItem(itemKey);
    const val = item?.actions?.[actionKey];
    return val !== undefined ? (val as T) : fallback;
  }

  getSettingsTab(tabKey: string): IBootstrapSettingsTab | null {
    return this.settingsTabs().find((t) => t.tabKey === tabKey) ?? null;
  }

  refresh(): void {
    this.#bootstrapResource.reload();
  }
}
