import { IProduct } from './product.interface';

// Imagen alojada en Cloudinary
export interface IShopTheLookImage {
  url: string;
  public_id: string;
}

// Datos posicionales del Pin
export interface IHotspotPosition {
  x: number; // Porcentaje de 0 a 100
  y: number; // Porcentaje de 0 a 100
}

export interface IHotspotColor {
  name: string;
  hex?: string;
}

// Representación de un Hotspot
export interface IShopTheLookHotspot {
  _id?: string;
  product: IProduct; // ⚠️ En los GET vendrá el Objeto Producto poblado. En los POST/PUT enviarás solo el String (ID del producto).
  position: IHotspotPosition;
  selectedColor?: IHotspotColor;
  selectedSku?: string;
  variantImage?: IShopTheLookImage;
  isActive: boolean;
}

export interface ILookItem {
  _id?: string;
  name?: string;
  mainImage: IShopTheLookImage; // POST: No necesario si envías un archivo. PUT: Indispensable si NO cambias la imagen.
  hotspots: IShopTheLookHotspot[];
  isActive: boolean;
}

// Documento Principal
export interface IShopTheLook {
  _id: string;
  title: string;
  subtitle: string;
  slug?: string;
  isActive: boolean;
  looks: ILookItem[];
  createdAt: string;
  updatedAt: string;
}
