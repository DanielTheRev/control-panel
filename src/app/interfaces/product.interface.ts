// ============ ENUMS ============

import { IProvider } from './provider.interface';

export enum ProductType {
  TECH = 'TechProduct',
  CLOTHING = 'ClothingProduct',
}

export interface ISizeGuideRow {
  size: string;
  values: string[];
}

export interface ISizeGuide {
  headers: string[];
  rows: ISizeGuideRow[];
  tolerance?: string;
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
  price: IProductPrices;
  finance?: IProductFinance;
  isLegacyPrices?: boolean;
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
  sizeGuide?: ISizeGuide;
  seo: IProductSeo;
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
  sizeGuide?: ISizeGuide;
}

export enum ClothingGender {
  Hombre = 'Hombre',
  Mujer = 'Mujer',
  Unisex = 'Unisex',
  Ninos = 'Niños',
}

export enum ClothingFit {
  Regular = 'Regular',
  Slim = 'Slim',
  Oversized = 'Oversized',
  Relaxed = 'Relaxed',
}

export enum ClothingSizeType {
  Ropa = 'Ropa',
  Calzado = 'Calzado',
  Numerico = 'Numérico',
  Unico = 'Talle Único',
}

export interface ICostConcept {
  concept: string;
  value: number;
  type: 'fixed' | 'percent_over_provider';
}

export interface IProductFinance {
  exchangeRateSnapshot: number;
  mpCommissionSnapshot: {
    base: number;
    cft3Cuotas: number;
    cft6Cuotas: number;
  };
  providerCost: {
    inUSD: number;
    inARS: number;
  };
  additionalCosts: ICostConcept[];
  pricingStrategy: {
    method: 'markup' | 'margin';
    targetProfit: number;
  };
  calculatedProfits: {
    transfer: number;
    card_ticket1Pay: number;
    card3Installments: number;
    card6Installments: number;
  };
  maxSafeDiscount?: number;
}

export interface IProductPrices {
  listPrice: number;
  card_ticket1PayPrice: number;
  cashTransferPrice: number;
  discountPercentageTransfer: number;
  installments: {
    threePaymentsAmount: number;
    sixPaymentsAmount: number;
    hasThreeInstallmentsSeamless: boolean;
    hasSixInstallmentsSeamless: boolean;
  };
}

export interface IProductSeo {
  metaTitle: string;
  metaDescription: string;
  metaImage: {
    url: string;
    public_id: string;
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
  category: string;
  customProfitMargin1Pay?: number | string;
  customProfitMarginInstallments?: number | string;
  customPricingMethod?: 'markup' | 'margin';
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
  seo?: IProductSeo;
  // Nuevos campos
  additionalCosts?: string;
  discountPercentageTransfer?: number;
  customProfitMargin?: number | string;
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
