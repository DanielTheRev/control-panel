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
  rating: number | null;
  reviews: number | null;
  stock: number;
  images: IProductImage[];
  features: string[];
  colors: string[];
  storage: string[];
  specifications: { key: string; value: string }[];
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
  costPrice: number;
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

export interface IProductUpdateDTO extends Partial<IProductCreateDTO> {
  _id: string;
}
