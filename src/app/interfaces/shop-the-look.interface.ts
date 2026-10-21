import { IProduct } from './product.interface';

// Imagen alojada en Cloudinary con soporte para NgOptimizedImage
export interface IShopTheLookImage {
  url: string;
  public_id: string;
  width?: number;
  height?: number;
  alt?: string;
}

// Datos posicionales del Pin (Opcional en la foto principal)
export interface IHotspotPosition {
  x: number; // Porcentaje de 0 a 100
  y: number; // Porcentaje de 0 a 100
}

export interface IHotspotColor {
  name: string;
  hex?: string;
}

// Prenda / Producto vinculado al Outfit
export interface IShopTheLookProductItem {
  _id?: string;
  product: IProduct | string; // Objeto Producto populado (GET) o ID (POST/PUT)
  position?: IHotspotPosition; // Opcional
  selectedColor?: IHotspotColor;
  selectedSku?: string;
  variantImage?: IShopTheLookImage;
  isActive: boolean;
}

// Alias de retrocompatibilidad
export type IShopTheLookHotspot = IShopTheLookProductItem;

export interface ILookItem {
  _id?: string;
  name?: string;
  mainImage?: IShopTheLookImage;
  gallery?: IShopTheLookImage[];
  hotspots?: IShopTheLookProductItem[];
  products?: IShopTheLookProductItem[];
  isActive: boolean;
}

export interface IShopTheLookMetrics {
  viewsCount?: number;
  likesCount?: number;
  sharesCount?: number;
  cartAddsCount?: number;
  salesCount?: number;
}

// Documento Principal: Look / Outfit Independiente
export interface IShopTheLook {
  _id?: string;
  name: string;
  title?: string; // Retrocompatibilidad
  subtitle?: string; // Retrocompatibilidad
  description?: string;
  occasion?: string; // Ej: "Día & Tarde", "Noche", "Sastre"
  slug: string;
  gallery: IShopTheLookImage[];
  products: IShopTheLookProductItem[];
  likes?: number;
  shares?: number;
  order?: number;
  rankingScore?: number;
  effectiveScore?: number;
  metrics?: IShopTheLookMetrics;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}
