import { IProduct, IProductImage } from "./product.interface";

export interface IHeroSlide {
  _id?: string;
  title: string;
  sub_title: string;
  description: string;
  ctaText: string;
  ctaLink: string;
  imageDesktop1: IProductImage;
  imageDesktop2?: IProductImage;
  imageMobile1: IProductImage;
  imageMobile2?: IProductImage;
  featuredProducts: IProduct[];
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}
