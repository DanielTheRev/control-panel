// ============ ENUMS ============

import { IProvider } from "./provider.interface";

export enum ProductType {
  TECH = 'TechProduct',
  CLOTHING = 'ClothingProduct'
}


// ============ VARIANT INTERFACES ============
export interface IVariantColor {
  name: string;
  hex: string;
}

export interface IVariantAttribute {
  key: string;
  value: string;
}

// Campos compartidos por todos los tipos de variantes
export interface IBaseVariant {
  _id?: string;
  sku: string;
  color?: IVariantColor;
  stock: number;
  reservedStock: number;
  isActive: boolean;
  imageReference: { url: string; public_id: string };
  barcode?: string;
}

// Vura (ClothingProduct) — talle obligatorio
export interface IClothingVariant extends IBaseVariant {
  size: string;
}

// Electromix (TechProduct) — atributos flexibles obligatorios
export interface ITechVariant extends IBaseVariant {
  attributes: IVariantAttribute[];
}

// Union type para contextos donde no se discrimina el tipo
export type IVariant = IClothingVariant | ITechVariant;


// ============ PRODUCT INTERFACES ============

export interface IProduct {
  _id: string;
  productType: ProductType;
  provider: IProvider;
  slug: string;
  category: string;
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
  isActive?: boolean;
  isFeatured?: boolean;
  // Virtuals
  totalStock: number;
  hasStock: boolean;
  // Tech fields (opcionales, presentes si productType === TECH)
  storage?: string[];
  ram?: string;
  processor?: string;
  screenSize?: string;
  os?: string;
  connectivity?: string[];
  // Clothing fields (opcionales, presentes si productType === CLOTHING)
  gender?: ClothingGender;
  fit?: ClothingFit;
  material?: string;
  composition?: { material: string; percentage: number }[];
  sizeType?: ClothingSizeType;
  careInstructions?: string[];
  season?: string;
  seo: IProductSeo
}

export interface ITechProduct extends IProduct {
  productType: ProductType.TECH;
  storage: string[];
  ram?: string;
  processor?: string;
  screenSize?: string;
  os?: string;
  connectivity?: string[];
  variants: ITechVariant[];
}

export interface IClothingProduct extends IProduct {
  productType: ProductType.CLOTHING;
  gender: ClothingGender;
  fit: ClothingFit;
  material: string;
  composition?: { material: string; percentage: number }[];
  sizeType: ClothingSizeType;
  careInstructions?: string[];
  season?: string;
  variants: IClothingVariant[];
}

export enum ClothingGender {
  Hombre = 'Hombre',
  Mujer = 'Mujer',
  Unisex = 'Unisex',
  Ninos = 'Niños'
}

export enum ClothingFit {
  Regular = 'Regular',
  Slim = 'Slim',
  Oversized = 'Oversized',
  Relaxed = 'Relaxed'
}

export enum ClothingSizeType {
  Ropa = 'Ropa',
  Calzado = 'Calzado',
  Numerico = 'Numérico',
  Unico = 'Talle Único'
}

export interface IProductPrices {
  costPrice: {
    inUSD: number;
    inARS: number;
  };
  dolarPrice: number;
  // profitMargin: number;
  profitMargin1Pay?: number;
  profitMarginInstallments?: number;
  baseCommission: number;
  cft6Cuotas: number;
  efectivo_transferencia: number;
  tarjeta_credito_debito: number;
  cuotas: {
    cuotas_3_si: number;
    cuotas_6_si: number;
  };
  earnings: {
    cash_transfer: number;
    card_3_installments: number;
    card_6_installments: number;
  };
}

export interface IProductSeo {
  metaTitle: string;
  metaDescription: string;
  metaImage: {
    url: string,
    public_id: string
  }
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
  category: string;
  customProfitMargin1Pay?: number | string;
  customProfitMarginInstallments?: number | string;
  isActive?: boolean;
  isFeatured?: boolean;
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
  connectivity?: string[];
  // Clothing
  gender?: string;
  fit?: string;
  material?: string;
  composition?: { material: string; percentage: number }[];
  sizeType?: string;
  careInstructions?: string[];
  seo?: IProductSeo
}

export interface IProductUpdateDTO extends Partial<IProductCreateDTO> {
  _id: string;
}


// Le dice a TS: "Si esta función da true, te juro que v es ITechVariant"
export function isTechVariant(v: IVariant): v is ITechVariant {
  return (v as ITechVariant).attributes !== undefined;
}

// Le dice a TS: "Si esta función da true, te juro que v es IClothingVariant"
export function isClothingVariant(v: IVariant): v is IClothingVariant {
  return (v as IClothingVariant).size !== undefined;
}
