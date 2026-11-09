import { computed, effect, inject, Injectable } from '@angular/core';
import { StoreConfigStateService } from '../states/store.config.state.service';
import {
  BusinessType,
  IVerticalCapabilities,
  PRODUCT_TYPE_TO_ROUTE_SLUG,
  ProductCreateRouteSlug,
  VERTICAL_ALLOWED_PRODUCTS,
  getPrimaryProductTypeForBusiness,
  isProductTypeAllowedForStore,
} from '../interfaces/business-vertical.interface';
import { ProductType } from '../interfaces/product.interface';
import { getTenantSlug } from '../utils/tenant.utils';

export interface BusinessFeatures {
  showPOS: boolean;
  showCashRegister: boolean;
  showShopTheLook: boolean;
  showHeroSlider: boolean;
  showBanners: boolean;
  showWebMenus: boolean;
  showNewsletter: boolean;
  showShippingOptions: boolean;
  showEmailsTemplates: boolean;
  showRecommendations: boolean;
  showFavorites: boolean;
  canSellByWeight: boolean;
  showSettingsAuth: boolean;
  showSettingsIntegrations: boolean;
  showSettingsShipping: boolean;
  showSettingsEmails: boolean;
  showSettingsContact: boolean;
  showSettingsClothing: boolean;
}

export interface BusinessThemeConfig {
  primary: string;           // Valor CSS (oklch o hex)
  primaryContent: string;    // Color de texto contrastante
  label: string;             // Nombre argentino legible
  badge: string;             // Tag breve descriptivo
  colorName: string;         // Nombre del color para badges
  previewHex: string;        // Hex para swatches/indicadores UI
}

function getTenantBusinessTypeKey(): string {
  const slug = getTenantSlug();
  return `gp_store_business_type_${slug}`;
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

  /**
   * Rubro comercial del comercio actual.
   * Cumple estrictamente la política Fail Fast: cuando la configuración del servidor
   * ya fue cargada (hasData === true), si falta businessType o no es válido, lanza un
   * error explícito y trazable en lugar de aplicar un fallback silencioso.
   */
  readonly businessType = computed<BusinessType>(() => {
    const state = this.#configState.StoreConfig();
    const configuredType = state.config?.businessType;

    if (state.hasData) {
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
      const type = this.businessType();
      if (type && type in BUSINESS_THEMES) {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(getTenantBusinessTypeKey(), type);
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
    const caps = this.capabilities();
    if (caps) {
      return caps.hasWeightScalePricing;
    }
    const t = this.businessType();
    return t === 'butcher' || t === 'bakery' || t === 'kiosk_grocery';
  });

  /**
   * Flags granulares de características según rubro y capabilities del Backend
   */
  readonly features = computed<BusinessFeatures>(() => {
    const caps = this.capabilities();
    const isCounter = this.isKioskOrCounter();
    const isFashion = this.isFashion();

    return {
      showPOS: true,
      showCashRegister: true,
      showShopTheLook: caps ? caps.hasShopTheLook : isFashion,
      showHeroSlider: isFashion || !isCounter,
      showBanners: isFashion || !isCounter,
      showWebMenus: isFashion || !isCounter,
      showNewsletter: isFashion || !isCounter,
      showShippingOptions: isFashion || !isCounter,
      showEmailsTemplates: isFashion || !isCounter,
      showRecommendations: isFashion || !isCounter,
      showFavorites: isFashion || !isCounter,
      canSellByWeight: this.canSellByWeight(),
      showSettingsAuth: !isCounter,
      showSettingsIntegrations: !isCounter,
      showSettingsShipping: !isCounter,
      showSettingsEmails: !isCounter,
      showSettingsContact: !isCounter,
      showSettingsClothing: caps ? caps.hasClothingSizesAndFits : isFashion,
    };
  });

  /**
   * Ruta de aterrizaje recomendada por perfil de negocio:
   * - Kiosco / Almacén / Mostrador: va directo al Mostrador POS
   * - Moda / Retail: va a Ventas & Métricas
   */
  readonly defaultLandingRoute = computed(() => {
    return this.isKioskOrCounter() ? '/home/pos' : '/home/sales';
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
