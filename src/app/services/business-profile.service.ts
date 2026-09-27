import { computed, effect, inject, Injectable } from '@angular/core';
import { StoreConfigStateService } from '../states/store.config.state.service';
import { BusinessType } from '../interfaces/config.interface';

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
  general: {
    primary: 'oklch(53% 0.22 265)',
    primaryContent: '#ffffff',
    label: 'Comercio General / Polirrubro',
    badge: 'Multirrubro & Bazar',
    colorName: 'Azul Cobalto',
    previewHex: '#4f46e5',
  },
};

@Injectable({
  providedIn: 'root'
})
export class BusinessProfileService {
  readonly #configState = inject(StoreConfigStateService);

  readonly businessType = computed<BusinessType>(() => {
    return this.#configState.StoreConfig().config?.businessType || 'general';
  });

  constructor() {
    // Sincroniza dinámicamente el tema en el HTML cuando cambia la configuración de la tienda
    effect(() => {
      const type = this.businessType();
      this.applyTheme(type);
    });
  }

  /**
   * Aplica dinámicamente el color primario y contraste en CSS `:root` / `<html>`
   */
  applyTheme(type: BusinessType): void {
    const theme = BUSINESS_THEMES[type] || BUSINESS_THEMES['general'];
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
    return BUSINESS_THEMES[type] || BUSINESS_THEMES['general'];
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
   * Comercios de moda / retail con fuerte componente visual / e-commerce (ej: Vura)
   */
  readonly isFashion = computed(() => {
    return this.businessType() === 'fashion';
  });

  /**
   * Comercios de tecnología / electrónica (ej: Electromix)
   */
  readonly isTech = computed(() => {
    return this.businessType() === 'tech_electronics';
  });

  /**
   * Comercios que admiten venta por peso / balanza (Carnicería, Panadería, Kiosco/Almacén con fiambrería)
   */
  readonly canSellByWeight = computed(() => {
    const t = this.businessType();
    return t === 'butcher' || t === 'bakery' || t === 'kiosk_grocery' || t === 'general';
  });

  /**
   * Flags granulares de características según rubro
   */
  readonly features = computed<BusinessFeatures>(() => {
    const isCounter = this.isKioskOrCounter();
    const isFashion = this.isFashion();

    return {
      showPOS: true,
      showCashRegister: true,
      showShopTheLook: isFashion,
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
      showSettingsClothing: isFashion || this.businessType() === 'general',
    };
  });

  /**
   * Ruta de aterrizaje recomendada por perfil de negocio:
   * - Kiosco / Almacén / Mostrador: va directo al Mostrador POS
   * - Moda / Retail / General: va a Ventas & Métricas
   */
  readonly defaultLandingRoute = computed(() => {
    return this.isKioskOrCounter() ? '/home/pos' : '/home/sales';
  });

  /**
   * Nombre amigable argentino para mostrar en badges, sidebar o títulos
   */
  readonly businessTypeLabel = computed(() => {
    const t = this.businessType();
    return (BUSINESS_THEMES[t] || BUSINESS_THEMES['general']).label;
  });
}
