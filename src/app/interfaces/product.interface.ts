// ============ ENUMS ============

export enum ProductType {
  TECH = 'TechProduct',
  CLOTHING = 'ClothingProduct'
}

export enum IProductCategories {
  // Tech
  Electrodomesticos = 'Electrodomésticos',
  Smartphones = 'Smartphones',
  Pantallas = 'TV / Monitores',
  PC = 'PC',
  Consolas = 'Consolas',
  // Clothing
  Remeras = 'Remeras',
  Pantalones = 'Pantalones',
  Buzos = 'Buzos / Hoodies',
  Camperas = 'Camperas',
  Zapatillas = 'Zapatillas',
  Accesorios = 'Accesorios',
  Shorts = 'Shorts'
}

// ============ VARIANT INTERFACES ============

export interface IVariantAttribute {
  key: string;
  value: string;
}

export interface IVariantColor {
  name: string;
  hex: string;
}

export interface IVariant {
  _id?: string;
  sku: string;
  attributes: IVariantAttribute[];
  color?: IVariantColor;
  stock: number;
  reservedStock: number;
  isActive: boolean;
  images: { url: string; public_id: string }[];
  barcode?: string;
}

// ============ PRODUCT INTERFACES ============

export interface IProduct {
  _id: string;
  productType: ProductType;
  slug: string;
  category: IProductCategories;
  shortDescription: string;
  largeDescription: string;
  brand: string;
  model: string;
  prices: IProductPrices;
  discount: number;
  rating: number | null;
  reviews: number | null;
  images: IProductImage[];
  features: string[];
  specifications: { key: string; value: string }[];
  variants: IVariant[];
  lowStockThreshold?: number;
  customProfitMargin?: number;
  // Virtuals
  totalStock?: number;
  hasStock?: boolean;
  // Tech fields (opcionales, presentes si productType === TECH)
  storage?: string[];
  ram?: string;
  processor?: string;
  screenSize?: string;
  os?: string;
  connectivity?: string[];
  // Clothing fields (opcionales, presentes si productType === CLOTHING)
  gender?: 'Hombre' | 'Mujer' | 'Unisex' | 'Niños';
  fit?: 'Regular' | 'Slim' | 'Oversized' | 'Relaxed';
  material?: string;
  composition?: { material: string; percentage: number }[];
  sizeType?: 'Ropa' | 'Calzado' | 'Numérico';
  careInstructions?: string[];
  season?: string;
}

export interface IProductPrices {
  costPrice: {
    inUSD: number;
    inARS: number;
  };
  dolarPrice: number;
  profitMargin: number;
  baseCommission: number;
  cft6Cuotas: number;
  efectivo_transferencia: number;
  tarjeta_credito_debito: number;
  cuotas: {
    cuotas_3_si: number;
    cuotas_6_si: number;
  };
  earnings?: {
    cash_transfer: number;
    card_3_installments: number;
    card_6_installments: number;
  };
}

export interface IProductImage {
  url: string;
  public_id: string;
  width?: number;
  height?: number;
}

export interface IProductCreateDTO {
  productType: ProductType;
  brand: string;
  model: string;
  shortDescription: string;
  largeDescription: string;
  price: number;
  category: IProductCategories;
  customProfitMargin?: number | string;
  image: { link: string; file: File }[];
  features: string[];
  specifications: { key: string; value: string }[];
  variants: IVariant[];
  // Tech
  storage?: string[];
  ram?: string;
  processor?: string;
  screenSize?: string;
  os?: string;
  // Clothing
  gender?: string;
  fit?: string;
  material?: string;
  composition?: { material: string; percentage: number }[];
  sizeType?: string;
  careInstructions?: string[];
}

export interface IProductUpdateDTO extends Partial<IProductCreateDTO> {
  _id: string;
}
