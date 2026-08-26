export type BannerLinkType = 'none' | 'category' | 'collection' | 'brand' | 'product' | 'custom';
export type BannerProductSource = 'category' | 'collection' | 'brand' | 'manual' | 'recent';

export interface IBanner {
  _id?: string;
  name?: string;
  image: string;
  imageMobile?: string;

  // Link & Redirección
  linkType?: BannerLinkType;
  linkValue?: string;

  // Vitrina de productos vinculados
  showProducts?: boolean;
  productSource?: BannerProductSource;
  productSourceValue?: string;
  manualProductIds?: string[];
  productsCount?: number;

  // Legacy / Styling compatibility
  brandName?: string;
  description?: string;
  title?: string;
  subtitle?: string;
  textClass?: string;
  buttonClass?: string;
  icon?: string;

  isActive?: boolean;
  order?: number;
  createdAt?: string;
  updatedAt?: string;
}
