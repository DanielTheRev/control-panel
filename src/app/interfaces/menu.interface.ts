import { IProductImage } from "./product.interface";

export interface IMenuItemChild {
  _id?: string;
  label: string;
  link: string;
  badge?: string;
  image?: IProductImage | { url: string; public_id?: string };
  order?: number;
  isActive?: boolean;
}

export interface IMenuItem {
  _id?: string;
  label: string;
  link: string;
  badge?: string;
  subtitle?: string;
  image?: IProductImage | { url: string; public_id?: string };
  order: number;
  isActive: boolean;
  target?: '_self' | '_blank';
  children?: IMenuItemChild[];
}

export interface IMenu {
  _id?: string;
  name: string;
  slug: string;
  description?: string;
  items: IMenuItem[];
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface IMenuCreateDTO {
  name: string;
  slug: string;
  description?: string;
  items: IMenuItem[];
  isActive?: boolean;
}
