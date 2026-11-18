import { computed, effect, inject, Injectable } from '@angular/core';
import { StoreConfigStateService } from '../states/store.config.state.service';
import { TenantBootstrapStateService } from '../states/tenant-bootstrap.state.service';
import {
  BusinessType,
  IVerticalCapabilities,
  PRODUCT_TYPE_TO_ROUTE_SLUG,
  ProductCreateRouteSlug,
  VERTICAL_ALLOWED_PRODUCTS,
  getPrimaryProductTypeForBusiness,
  isProductTypeAllowedForStore,
} from '../interfaces/business-vertical.interface';
import {
  IBootstrapTheme,
  IPlanCapabilities,
  IProductFormConfig,
  IProductListViewConfig,
  VexxPlanTier,
} from '../interfaces/tenant-bootstrap.interface';
import { ProductType } from '../interfaces/product.interface';
import { getTenantSlug } from '../utils/tenant.utils';

import { BusinessFeatures, BusinessThemeConfig } from '../interfaces/business-profile.interface';

export type { BusinessFeatures, BusinessThemeConfig };

function getTenantBusinessTypeKey(): string {
  const slug = getTenantSlug();
  return `gp_store_business_type_${slug}`;
}

function getTenantThemeKey(): string {
  const slug = getTenantSlug();
  return `gp_store_theme_${slug}`;
}

/**
 * Paleta de colores temáticos por cada rubro adaptada a la identidad del comercio en Argentina
 */
export const BUSINESS_THEMES: Record<BusinessType, BusinessThemeConfig> = {
  kiosk_grocery: {
    primary: 'oklch(60% 0.19 150)',
    primaryContent: '#ffffff',
    label: 'Kiosco / Maxikiosco / Almacén',
    badge: 'Mostrador, Balanza & Escáner',
    colorName: 'Verde Esmeralda Retail',
    previewHex: '#059669',
  },
  fashion: {
    primary: 'oklch(54% 0.25 292)',
    primaryContent: '#ffffff',
    label: 'Indumentaria & Calzado',
    badge: 'Moda Visual, Talles & Curvas',
    colorName: 'Violeta Real',
    previewHex: '#7c3aed',
  },
  butcher: {
    primary: 'oklch(55% 0.22 25)',
    primaryContent: '#ffffff',
    label: 'Carnicería & Granja',
    badge: 'Cortes por Kilo & Balanza',
    colorName: 'Rojo Carmesí',
    previewHex: '#dc2626',
  },
  bakery: {
    primary: 'oklch(63% 0.18 65)',
    primaryContent: '#ffffff',
    label: 'Panadería & Confitería',
    badge: 'Pan por Peso & Docenas',
    colorName: 'Ámbar Dorado',
    previewHex: '#d97706',
  },
  tech_electronics: {
    primary: 'oklch(56% 0.20 235)',
    primaryContent: '#ffffff',
    label: 'Tecnología & Celulares',
    badge: 'Garantías & N° de Serie',
    colorName: 'Azul Eléctrico',
    previewHex: '#0284c7',
  },
  gastronomy: {
    primary: 'oklch(58% 0.21 42)',
    primaryContent: '#ffffff',
    label: 'Gastronomía & Cafetería / Bar',
    badge: 'Mesas, Mostrador & Cocina',
    colorName: 'Naranja Gastronómico',
    previewHex: '#ea580c',
  },
};

@Injectable({
  providedIn: 'root',
})
export class BusinessProfileService {
  readonly #configState = inject(StoreConfigStateService);
  readonly #bootstrapState = inject(TenantBootstrapStateService);

  readonly planTier = computed<VexxPlanTier | null>(
    () => this.#bootstrapState.planTier(),
  );

  readonly activeAddons = computed<string[]>(
    () => this.#bootstrapState.activeAddons(),
  );

  readonly customLabels = computed<Record<string, string>>(
    () => this.#bootstrapState.customLabels(),
  );

  readonly addonLabels = computed<Record<string, Record<string, string>>>(
    () => this.#bootstrapState.data()?.tenant?.addonLabels ?? {},
  );

  /**
   * Resuelve una etiqueta Addon-First desde bootstrap.tenant.addonLabels[addonId][key]
   * o bootstrap.addons.find(a => a.id === addonId)?.labels?.[key].
   */
  getAddonLabel(addonId: string, key: string, defaultLabel = ''): string {
    const fromTenantMap = this.addonLabels()?.[addonId]?.[key];
    if (typeof fromTenantMap === 'string' && fromTenantMap.trim().length > 0) {
      return fromTenantMap;
    }

    const addonItem = this.#bootstrapState.addons().find((a) => a.id === addonId);
    const fromAddonItem = addonItem?.labels?.[key];
    if (typeof fromAddonItem === 'string' && fromAddonItem.trim().length > 0) {
      return fromAddonItem;
    }

    return defaultLabel;
  }

  readonly planCapabilities = computed<IPlanCapabilities | null>(
    () => this.#bootstrapState.planCapabilities(),
  );

  readonly productFormConfig = computed<IProductFormConfig | null>(
    () => this.#bootstrapState.productFormConfig(),
  );

  readonly productListViewConfig = computed<IProductListViewConfig | null>(
    () => this.#bootstrapState.productListViewConfig(),
  );

  readonly bootstrapTheme = computed<IBootstrapTheme | null>(
    () => this.#bootstrapState.theme(),
  );

  hasAddon(addon: string): boolean {
    return this.activeAddons().includes(addon);
  }

  /**
   * Rubro comercial del comercio actual.
   * Cumple estrictamente la política Fail Fast: cuando la configuración del servidor
   * ya fue cargada (hasData === true), si falta businessType o no es válido, lanza un
   * error explícito y trazable en lugar de aplicar un fallback silencioso.
   */
  readonly businessType = computed<BusinessType>(() => {
    const bootstrapType = this.#bootstrapState.data()?.tenant?.businessType;
    const state = this.#configState.StoreConfig();
    const configuredType = bootstrapType ?? state.config?.businessType;

    if (this.#bootstrapState.state().hasData || state.hasData) {
      if (!configuredType || !(configuredType in BUSINESS_THEMES)) {
        throw new Error(
          'Business type not configured: El comercio no tiene un rubro comercial asignado en su configuración.',
        );
      }
      return configuredType;
    }

    if (configuredType && configuredType in BUSINESS_THEMES) {
      return configuredType;
    }

    // Mientras la petición HTTP inicial de configuración está en vuelo, leemos únicamente
    // la caché autenticada previa del mismo tenant si existe.
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('gp_store_business_type');
      const cached = localStorage.getItem(getTenantBusinessTypeKey()) as BusinessType | null;
      if (cached && cached in BUSINESS_THEMES) {
        return cached;
      }
    }

    return undefined as unknown as BusinessType;
  });

  /**
   * Objeto capabilities resuelto desde el Backend (GET /api/ecommerce)
   */
  readonly capabilities = computed<IVerticalCapabilities | null>(() => {
    return this.#configState.StoreConfig().config?.capabilities ?? null;
  });

  /**
   * Tipos de producto permitidos para la vertical comercial del comercio
   */
  readonly allowedProductTypes = computed<ProductType[]>(() => {
    const caps = this.capabilities();
    if (caps?.allowedProductTypes?.length) {
      return caps.allowedProductTypes;
    }
    const type = this.businessType();
    if (!type) return [];
    return VERTICAL_ALLOWED_PRODUCTS[type] ?? [];
  });

  /**
   * Plantilla de producto principal según el rubro comercial del comercio
   */
  readonly primaryProductType = computed<ProductType>(() => {
    const type = this.businessType();
    if (!type) return ProductType.KIOSK;
    return getPrimaryProductTypeForBusiness(type, this.capabilities());
  });

  /**
   * Slug semántico limpio para el botón "+ Nuevo producto" (ej: 'kiosco', 'indumentaria', 'tecnologia')
   */
  readonly defaultCreateProductSlug = computed<ProductCreateRouteSlug>(() => {
    const primary = this.primaryProductType();
    return PRODUCT_TYPE_TO_ROUTE_SLUG[primary] ?? 'kiosco';
  });

  constructor() {
    effect(() => {
      const remoteTheme = this.bootstrapTheme();
      if (remoteTheme) {
        this.applyThemeFromBootstrap(remoteTheme);
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(getTenantThemeKey(), JSON.stringify(remoteTheme));
          if (remoteTheme.businessType && remoteTheme.businessType in BUSINESS_THEMES) {
            localStorage.setItem(getTenantBusinessTypeKey(), remoteTheme.businessType);
          }
        }
        return;
      }

      const type = this.businessType();
      if (type && type in BUSINESS_THEMES) {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(getTenantBusinessTypeKey(), type);
          const rawCachedTheme = localStorage.getItem(getTenantThemeKey());
          if (rawCachedTheme) {
            try {
              const parsed = JSON.parse(rawCachedTheme) as IBootstrapTheme;
              if (parsed?.primary && parsed?.primaryContent && parsed?.businessType === type) {
                this.applyThemeFromBootstrap(parsed);
                return;
              }
            } catch {
              localStorage.removeItem(getTenantThemeKey());
            }
          }
        }
        this.applyTheme(type);
      }
    });
  }

  /**
   * Valida preventivamente si un ProductType está permitido para el comercio actual
   */
  isProductTypeAllowed(productType: ProductType): boolean {
    const type = this.businessType();
    return isProductTypeAllowedForStore(type, productType, this.capabilities());
  }

  /**
   * Aplica el tema dinámico provisto por GET /api/tenant/bootstrap.
   * Cumple estrictamente Fail Fast: no inventa colores ni rubros por defecto.
   */
  applyThemeFromBootstrap(bootstrapTheme: IBootstrapTheme): void {
    if (!bootstrapTheme?.primary?.trim() || !bootstrapTheme?.primaryContent?.trim()) {
      throw new Error(
        'Invalid bootstrap theme: El servidor devolvió un objeto theme sin color primario o contraste válido.',
      );
    }
    if (!bootstrapTheme?.businessType?.trim()) {
      throw new Error(
        'Invalid bootstrap theme: El objeto theme recibido no especifica businessType.',
      );
    }
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      root.style.setProperty('--color-primary', bootstrapTheme.primary.trim());
      root.style.setProperty('--color-primary-content', bootstrapTheme.primaryContent.trim());
      root.setAttribute('data-business-type', bootstrapTheme.businessType.trim());
    }
  }

  /**
   * Aplica dinámicamente el color primario y contraste en CSS `:root` / `<html>`
   */
  applyTheme(type: BusinessType): void {
    if (!type || !(type in BUSINESS_THEMES)) {
      throw new Error(
        `Business type not configured or invalid ('${String(type)}'): No se puede aplicar tema visual sin rubro comercial válido.`,
      );
    }
    const theme = BUSINESS_THEMES[type];
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      root.style.setProperty('--color-primary', theme.primary);
      root.style.setProperty('--color-primary-content', theme.primaryContent);
      root.setAttribute('data-business-type', type);
    }
  }

  /**
   * Retorna la configuración de tema para un rubro específico
   */
  getThemeConfig(type: BusinessType): BusinessThemeConfig {
    if (!type || !(type in BUSINESS_THEMES)) {
      throw new Error(
        `Business type not configured or invalid ('${String(type)}'): Rubro comercial inexistente.`,
      );
    }
    return BUSINESS_THEMES[type];
  }

  /**
   * Comercios de mostrador / rotación rápida / barrio:
   * Kiosco, Almacén, Carnicería, Panadería, Gastronomía.
   */
  readonly isKioskOrCounter = computed(() => {
    const t = this.businessType();
    return t === 'kiosk_grocery' || t === 'butcher' || t === 'bakery' || t === 'gastronomy';
  });

  /**
   * Comercios de moda / retail con fuerte componente visual / e-commerce
   */
  readonly isFashion = computed(() => {
    return this.businessType() === 'fashion';
  });

  /**
   * Comercios de tecnología / electrónica
   */
  readonly isTech = computed(() => {
    return this.businessType() === 'tech_electronics';
  });

  /**
   * Comercios que admiten venta por peso / balanza (Carnicería, Panadería, Kiosco/Almacén con fiambrería)
   */
  readonly canSellByWeight = computed(() => {
    const planCaps = this.planCapabilities();
    if (planCaps) {
      return planCaps.hasScaleWeightPricing;
    }
    const caps = this.capabilities();
    if (caps) {
      return caps.hasWeightScalePricing;
    }
    const t = this.businessType();
    return t === 'butcher' || t === 'bakery' || t === 'kiosk_grocery';
  });

  readonly addons = this.#bootstrapState.addons;

  isAddonActive(addonId: string): boolean {
    const item = this.addons().find((a) => a.id === addonId);
    if (item) {
      return item.isActive === true;
    }
    return this.activeAddons().includes(addonId);
  }

  /**
   * Flags granulares de características gobernados estrictamente por capabilities y addons del Backend.
   * Si una bandera no viene explícitamente en true, se trata como false (cero fallbacks silenciosos).
   */
  readonly features = computed<BusinessFeatures>(() => {
    const planCaps = this.planCapabilities();
    const formCfg = this.productFormConfig();
    const caps = this.capabilities();

    return {
      showPOS: Boolean(planCaps?.hasPos),
      showCashRegister: Boolean(planCaps?.hasCashRegister),
      showOnlineOrders: Boolean(planCaps?.hasOnlineOrders),
      showCustomerAccounts: Boolean(planCaps?.hasCustomerAccounts),
      showSupplierPurchases: Boolean(planCaps?.hasSupplierPurchases),
      showShopTheLook: Boolean(caps?.hasShopTheLook),
      showDataSets: Boolean(planCaps?.hasDataSets),
      showProductBundles: Boolean(planCaps?.hasProductBundles),
      allowMetricDataSets: Boolean(planCaps?.hasMetricDataSets),
      showCoupons: Boolean(planCaps?.hasCoupons),
      showArcaBilling: Boolean(planCaps?.hasArcaBilling),
      showHeroSlider: Boolean(planCaps?.hasMarketingBanners),
      showBanners: Boolean(planCaps?.hasMarketingBanners),
      showWebMenus: Boolean(planCaps?.hasWebCatalog),
      showNewsletter: this.isAddonActive('newsletter'),
      showShippingOptions: Boolean(
        planCaps?.hasAutomatedShippingCouriers || planCaps?.hasLocalDeliveryAndTakeaway,
      ),
      showEmailsTemplates: Boolean(planCaps?.hasFullWebStore),
      showRecommendations: Boolean(planCaps?.hasFullWebStore),
      showFavorites: Boolean(planCaps?.hasWebCatalog || planCaps?.hasFullWebStore),
      canSellByWeight: Boolean(planCaps?.hasScaleWeightPricing),
      showSettingsAuth: Boolean(planCaps?.hasFullWebStore),
      showSettingsIntegrations: Boolean(
        planCaps?.hasFullWebStore || planCaps?.hasArcaBilling,
      ),
      showSettingsShipping: Boolean(
        planCaps?.hasAutomatedShippingCouriers || planCaps?.hasLocalDeliveryAndTakeaway,
      ),
      showSettingsEmails: Boolean(planCaps?.hasFullWebStore),
      showSettingsContact: Boolean(planCaps?.hasWebCatalog || planCaps?.hasFullWebStore),
      showSettingsClothing: Boolean(formCfg?.showSizeGuideAndFits),
    };
  });

  /**
   * Etiqueta dinámica del módulo de combos / conjuntos de productos según el comercio
   */
  readonly bundleLabel = computed<string>(() => {
    const formLabel = this.productFormConfig()?.bundleLabel;
    if (formLabel) return formLabel;
    const customLabel = this.customLabels()['bundleTitle'];
    if (customLabel) return customLabel;
    return 'Conjuntos de Productos';
  });

  /**
   * Ruta de aterrizaje recomendada por perfil de negocio:
   * - Kiosco / Almacén / Mostrador: va directo al Mostrador POS
   * - Moda / Retail: va a Ventas & Métricas
   */
  readonly defaultLandingRoute = computed(() => {
    if (this.isKioskOrCounter() && this.features().showPOS) {
      return '/home/pos';
    }
    if (this.features().showPOS && !this.features().showOnlineOrders) {
      return '/home/pos';
    }
    return '/home/sales';
  });

  /**
   * Nombre amigable argentino para mostrar en badges, sidebar o títulos
   */
  readonly businessTypeLabel = computed(() => {
    const caps = this.capabilities();
    if (caps?.label) {
      return caps.label;
    }
    const t = this.businessType();
    if (!t || !(t in BUSINESS_THEMES)) {
      return '';
    }
    return BUSINESS_THEMES[t].label;
  });
}
