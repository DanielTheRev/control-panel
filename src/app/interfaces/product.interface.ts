export interface IProduct {
  _id: string;
  slug: string;
  category: IProductCategories;
  shortDescription: string;
  largeDescription: string;
  brand: string;
  model: string;
  prices: IProductPrices;
  discount: number;
  rating: number;
  reviews: number;
  stock: number;
  images: IProductImage[];
  features: string[];
}

export interface IProductCreateDTO {
  brand: string;
  shortDescription: string;
  largeDescription: string;
  model: string;
  price: number;
  category: IProductCategories;
  image: { link: string; file: File }[];
  features: string[];
}

export enum IProductCategories {
  Electrodomesticos = 'Electrodomésticos',
  Smartphones = 'Smartphones',
  Pantallas = 'TV / Monitores',
  PC = 'PC',
  Consolas = 'Consolas',
}

export interface IProductPrices {
  efectivo_transferencia: number;
  tarjeta_credito_debito: number;
  cuotas: {
    '3_cuotas_sin_interes': number;
    '6_cuotas_sin_interes': number;
  };
}

export interface IProductImage {
  url: string;
  public_id: string;
  width?: number;
  height?: number;
}

export interface IProductUpdateDTO extends Partial<IProductCreateDTO> {
  _id: string;
}
