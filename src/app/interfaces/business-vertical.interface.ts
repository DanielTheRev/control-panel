import { ProductType } from './product.interface';

/**
 * Rubros Comerciales Oficiales de GanarPlata
 * Sincronizado estrictamente con Backend (verticalCapabilities.ts)
 */
export enum BusinessTypeEnum {
  KIOSK_GROCERY = 'kiosk_grocery',
  FASHION = 'fashion',
  TECH_ELECTRONICS = 'tech_electronics',
  BUTCHER = 'butcher',
  BAKERY = 'bakery',
  GASTRONOMY = 'gastronomy',
}

export type BusinessType =
  | 'kiosk_grocery'
  | 'fashion'
  | 'tech_electronics'
  | 'butcher'
  | 'bakery'
  | 'gastronomy';

/**
 * Capacidades resueltas desde el Backend en GET /api/ecommerce (config.capabilities)
 */
export interface IVerticalCapabilities {
  businessType: BusinessType;
  label: string;
  hasShopTheLook: boolean;
  hasClothingSizesAndFits: boolean;
  hasSizeGuide: boolean;
  hasOutfitsCombineWith: boolean;
  hasMasterBarcodeCatalog: boolean;
  hasWeightScalePricing: boolean;
  hasTechSpecifications: boolean;
  hasQuickPosCheckout: boolean;
  hasBeautyAromas: boolean;
  allowedProductTypes: ProductType[];
}

/**
 * Matriz de compatibilidad estricta para validación preventiva en Frontend.
 * Sincronizada con ALLOWED_PRODUCT_TYPES_BY_BUSINESS del Backend.
 */
export const VERTICAL_ALLOWED_PRODUCTS: Record<BusinessType, ProductType[]> = {
  kiosk_grocery: [ProductType.KIOSK],
  fashion: [ProductType.CLOTHING],
  tech_electronics: [ProductType.TECH, ProductType.KIOSK],
  butcher: [ProductType.KIOSK],
  bakery: [ProductType.KIOSK],
  gastronomy: [ProductType.KIOSK],
};

/**
 * Slugs semánticos limpios para rutas de creación de productos (/home/products/create/:slug).
 * Erradica completamente 'GeneralProduct' y 'KioskProduct' de la barra de direcciones del navegador.
 */
export type ProductCreateRouteSlug = 'kiosco' | 'indumentaria' | 'tecnologia' | 'perfumeria';

export const PRODUCT_TYPE_TO_ROUTE_SLUG: Record<ProductType, ProductCreateRouteSlug> = {
  [ProductType.KIOSK]: 'kiosco',
  [ProductType.CLOTHING]: 'indumentaria',
  [ProductType.TECH]: 'tecnologia',
  [ProductType.BEAUTY]: 'perfumeria',
};

/**
 * Metadatos de UI para cada plantilla de producto.
 * Nota: 'KioskProduct' es el discriminador interno de Mongoose;
 * de cara al comerciante la plantilla se denomina 'Kiosco & Almacén'.
 */
export interface ProductTemplateMetadata {
  type: ProductType;
  routeSlug: ProductCreateRouteSlug;
  label: string;
  shortLabel: string;
  badge: string;
  icon: string;
  subtitle: string;
  description: string;
  features: string[];
  accentClass: string;
  badgeClass: string;
}

export const PRODUCT_TEMPLATE_METADATA: Record<ProductType, ProductTemplateMetadata> = {
  [ProductType.KIOSK]: {
    type: ProductType.KIOSK,
    routeSlug: 'kiosco',
    label: 'Kiosco & Almacén',
    shortLabel: 'Kiosco & Almacén',
    badge: '⚡ Carga Express 1 Pág',
    icon: 'storefront',
    subtitle: 'Mostrador, Escáner EAN-13, Balanza & Margen en Vivo',
    description:
      'Optimizado para alta rotación en mostrador: lectura con pistola lectora de códigos de barra, autocompletado de catálogo maestro, cálculo de margen en tiempo real y venta por unidad o peso ($/Kg).',
    features: [
      'Escáner EAN-13 y autocompletado inmediato',
      'Calculadora de costo, margen % y ganancia neta en vivo',
      'Soporte para venta unitaria o pesable por balanza ($/Kg)',
      'Flujo continuo "Guardar y Cargar Siguiente" (Enter)',
    ],
    accentClass: 'text-emerald-600 dark:text-emerald-400',
    badgeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25',
  },
  [ProductType.CLOTHING]: {
    type: ProductType.CLOTHING,
    routeSlug: 'indumentaria',
    label: 'Indumentaria & Calzado',
    shortLabel: 'Indumentaria',
    badge: 'Talles, Curvas & Fotos',
    icon: 'checkroom',
    subtitle: 'Matriz de Talles, Variantes de Color, Calces & Galería por Color',
    description:
      'Diseñado para tiendas de moda, ropa y calzado: grilla matricial de stock por talle y color, selector cromático hex, guía de medidas, calce (fit) y fotos vinculadas a cada variante.',
    features: [
      'Matriz interactiva de stock por curva de talles y colores',
      'Galería fotográfica asignable por color de prenda',
      'Atributos de moda: calce (fit), género, composición y temporada',
      'Simulador financiero de cuotas, tarjeta de lista y efectivo/transferencia',
    ],
    accentClass: 'text-violet-600 dark:text-violet-400',
    badgeClass: 'bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/25',
  },
  [ProductType.TECH]: {
    type: ProductType.TECH,
    routeSlug: 'tecnologia',
    label: 'Tecnología & Celulares',
    shortLabel: 'Tecnología',
    badge: 'Specs, RAM & Garantía',
    icon: 'devices',
    subtitle: 'Especificaciones de Hardware, Almacenamiento, Condición & Garantía',
    description:
      'Especializado para casas de electrónica, telefonía e informática: ficha técnica estructurada (procesador, RAM, almacenamiento, pantalla, batería), estado del equipo y meses de garantía.',
    features: [
      'Ficha técnica de hardware (RAM, almacenamiento, CPU, pantalla)',
      'Variantes por capacidad (128GB / 256GB / 512GB) y acabado',
      'Control de condición (Nuevo Sellado, Refurbished, Usado Seleccionado)',
      'Gestión de garantía oficial, modelo exacto y SKU técnico',
    ],
    accentClass: 'text-sky-600 dark:text-sky-400',
    badgeClass: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/25',
  },
  [ProductType.BEAUTY]: {
    type: ProductType.BEAUTY,
    routeSlug: 'perfumeria',
    label: 'Perfumería & Cosmética',
    shortLabel: 'Perfumería',
    badge: 'Pirámide Olfativa & ml',
    icon: 'spa',
    subtitle: 'Notas de Salida, Corazón y Fondo, Concentración & Presentaciones en ml',
    description:
      'Plantilla de autor para perfumerías finas y cosmética especializada: pirámide olfativa detallada, familia aromática, concentración (EDP, EDT, Parfum) y variantes por mililitros.',
    features: [
      'Pirámide olfativa estructurada (notas de salida, corazón y fondo)',
      'Clasificación por concentración (Parfum, EDP, EDT, Body Mist)',
      'Variantes por volumen en mililitros (30ml, 50ml, 100ml, 200ml)',
      'Atributos de perfil sensorial, ocasión de uso y estación',
    ],
    accentClass: 'text-rose-600 dark:text-rose-400',
    badgeClass: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/25',
  },
};

/**
 * Helper de validación preventiva en Frontend
 */
export function isProductTypeAllowedForStore(
  businessType: BusinessType | undefined | null,
  productType: ProductType,
  capabilities?: IVerticalCapabilities | null,
): boolean {
  if (!businessType) {
    throw new Error(
      'Business type not configured: El comercio no tiene un rubro comercial asignado en su configuración.',
    );
  }
  if (capabilities?.allowedProductTypes?.length) {
    return capabilities.allowedProductTypes.includes(productType);
  }
  const allowed = VERTICAL_ALLOWED_PRODUCTS[businessType];
  if (!allowed) {
    throw new Error(`Rubro comercial desconocido o no soportado: '${businessType}'`);
  }
  return allowed.includes(productType);
}

/**
 * Resuelve el ProductType principal (por defecto) según el rubro del comercio
 */
export function getPrimaryProductTypeForBusiness(
  businessType: BusinessType,
  capabilities?: IVerticalCapabilities | null,
): ProductType {
  if (!businessType) {
    return ProductType.KIOSK;
  }
  if (capabilities?.allowedProductTypes?.length) {
    const raw = capabilities.allowedProductTypes[0];
    return resolveProductTypeFromRouteParam(raw) ?? (raw as ProductType);
  }
  switch (businessType) {
    case 'fashion':
      return ProductType.CLOTHING;
    case 'tech_electronics':
      return ProductType.TECH;
    case 'kiosk_grocery':
    case 'butcher':
    case 'bakery':
    case 'gastronomy':
      return ProductType.KIOSK;
    default:
      return ProductType.KIOSK;
  }
}

/**
 * Resuelve cualquier parámetro de ruta (slug semántico o discriminador legacy) a ProductType
 */
export function resolveProductTypeFromRouteParam(param: string | null | undefined): ProductType | null {
  if (!param) return null;
  const normalized = param.trim().toLowerCase();
  switch (normalized) {
    case 'kiosco':
    case 'almacen':
    case 'kiosk':
    case 'kiosk_grocery':
    case 'butcher':
    case 'bakery':
    case 'gastronomy':
    case 'kioskproduct':
    case 'generalproduct':
      return ProductType.KIOSK;
    case 'indumentaria':
    case 'moda':
    case 'fashion':
    case 'clothingproduct':
      return ProductType.CLOTHING;
    case 'tecnologia':
    case 'tech':
    case 'tech_electronics':
    case 'techproduct':
      return ProductType.TECH;
    case 'perfumeria':
    case 'beauty':
    case 'cosmetica':
    case 'beautyproduct':
      return ProductType.BEAUTY;
    default:
      return null;
  }
}
