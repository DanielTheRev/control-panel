// ============ ENUMS ============

import {
  ChannelKey,
  IDisplaySummaryItem,
  IPaymentRestrictions,
  IPriceBuilderChannelPricing,
  IPriceBuilderChannelSnapshot,
} from './price-builder.interface';
import { IProvider } from './provider.interface';

export enum ProductType {
  TECH = 'TechProduct',
  CLOTHING = 'ClothingProduct',
  BEAUTY = 'BeautyProduct',
  KIOSK = 'KioskProduct',
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

export interface IProductViewEvent {
  viewedAt: Date | string;
  device: 'mobile' | 'desktop' | 'tablet' | 'bot';
  browser?: string;
  os?: string;
  url?: string;
  referrer?: string;
  ip?: string;
  isBot: boolean;
  botName?: string;
  userAgent?: string;
}

export interface IProductMetrics {
  viewsCount?: number;
  botViewsCount?: number;
  cartAddsCount?: number;
  salesCount?: number;
  viewsByDevice?: {
    mobile?: number;
    desktop?: number;
    tablet?: number;
    bot?: number;
  };
  recentViews?: IProductViewEvent[];
  lastViewedAt?: Date | string;
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
  label?: string;
  color?: IVariantColor;
  size?: string;
  volume?: string;
  attributes?: IVariantAttribute[];
  stock: number;
  reservedStock: number;
  isActive: boolean;
  barcode?: string;
  inheritPrice?: boolean;
  providerCost?: number;
  profitMargin?: number;
  prices?: Record<string, unknown>;
}

// Indumentaria & Moda (ClothingProduct) — talle obligatorio
export interface IClothingVariant extends IBaseVariant {
  size: string;
}

// Tecnología & Electrónica (TechProduct) — atributos flexibles obligatorios
export interface ITechVariant extends IBaseVariant {
  attributes: IVariantAttribute[];
}

// General / Beauty Product
export interface IGeneralVariant extends IBaseVariant {
  size?: string;
  volume?: string;
}

// Union type para contextos donde no se discrimina el tipo
export type IVariant = IClothingVariant | ITechVariant | IGeneralVariant;

export type ProductStatus = 'published' | 'draft' | 'paused' | 'archived';

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
  subtitle?: string;
  price: IProductPrices;
  finance?: IProductFinance;
  paymentRestrictions?: IPaymentRestrictions;
  channelPricing?: IPriceBuilderChannelPricing;
  isLegacyPrices?: boolean;
  discount: number;
  rating: number | null;
  reviews: number | null;
  images: IProductImage[];
  features: string[];
  specifications: { key: string; value: string; isFeatured?: boolean }[];
  variants: IVariant[];
  tags?: string[];
  lowStockThreshold?: number;
  status: ProductStatus;
  isFeatured?: boolean;
  linkProductProvider?: string;
  recommendationsMode?: 'auto' | 'manual';
  manualRecommendations?: string[] | IProduct[];
  rankingScore?: number;
  metrics?: IProductMetrics;
  effectiveScore?: number;
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
  gender?: ClothingGender | string;
  fit?: ClothingFit;
  material?: string;
  composition?: { material: string; percentage: number }[];
  sizeType?: ClothingSizeType;
  sizeGuide?: ISizeGuide;
  careInstructions?: string[];
  season?: string;
  combineWith?: (string | IProduct | ICombineWithItem)[];
  // Beauty fields (opcionales, presentes si productType === BEAUTY)
  volume?: string;
  concentration?: string;
  fragranceFamily?: string;
  scentNotes?: {
    top?: string;
    heart?: string;
    base?: string;
  };
  applicationArea?: string;
  // General fields (opcionales, presentes si productType === GENERAL)
  unit?: string;
  weight?: string;
  barcode?: string;
  isSoldByWeight?: boolean;
  seo: IProductSeo;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface IKioskProduct extends IProduct {
  productType: ProductType.KIOSK;
  unit?: string;
  weight?: string;
  barcode?: string;
  isSoldByWeight?: boolean;
}

export type IGeneralProduct = IKioskProduct;

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
  combineWith?: (string | IProduct | ICombineWithItem)[];
}

export interface ICombineWithItem {
  product: string | IProduct;
  color?: string | null;
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
  type: 'fixed' | 'percent_over_provider' | 'percent_over_price';
  category?: 'expense' | 'tax' | 'shipping';
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
  cashPrice?: number;
  transferPrice?: number;
  qrPrice?: number;
  debitPrice?: number;
  discountPercentageTransfer: number;
  updatedAt?: string | Date;
  shippingSubsidy?: number;
  channels?: Record<ChannelKey, IPriceBuilderChannelSnapshot>;
  displaySummary?: IDisplaySummaryItem[];
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

export interface IProductImageCrop {
  aspectRatio: '1:1' | '4:5' | '9:16' | '16:9' | string;
  url: string;
  public_id: string;
  storageKey?: string;
  width?: number;
  height?: number;
  bytes?: number;
  format?: string;
}

export interface IProductImage {
  id?: string;
  url: string;
  public_id: string;
  storageProvider?: string;
  storageKey?: string;
  width?: number;
  height?: number;
  bytes?: number;
  format?: string;
  aspectRatio?: '1:1' | '4:5' | '9:16' | '16:9' | string;
  crops?: IProductImageCrop[];
  variantSkus?: string[];
  isMain?: boolean;
}

export interface IProductCreateDTO {
  productType: ProductType;
  brand: string;
  model: string;
  subtitle?: string;
  shortDescription: string;
  largeDescription: string;
  price: number;
  category: string;
  customProfitMargin1Pay?: number | string;
  customProfitMarginInstallments?: number | string;
  customPricingMethod?: 'markup' | 'margin';
  status?: ProductStatus;
  isFeatured?: boolean;
  image: { link: string; file: File }[];
  features: string[];
  specifications: { key: string; value: string; isFeatured?: boolean }[];
  variants: IVariant[];
  tags?: string[];
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
  season?: string;
  sizeGuide?: ISizeGuide;
  careInstructions?: string[];
  seo?: IProductSeo;
  // Beauty
  volume?: string;
  concentration?: string;
  fragranceFamily?: string;
  applicationArea?: string;
  // General / Kiosco
  barcode?: string;
  isSoldByWeight?: boolean;
  unit?: string;
  weight?: string;
  stock?: number;
  // Nuevos campos
  additionalCosts?: string;
  discountPercentageTransfer?: number;
  customProfitMargin?: number | string;
  linkProductProvider?: string;
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
