export interface IProductBundleItem {
  _id?: string;
  product: string | any;
  variantSku?: string;
  quantity: number;
}

export interface IProductBundleImage {
  url: string;
  public_id?: string;
  isMain?: boolean;
  source?: 'uploaded' | 'inherited';
}

export type BundlePricingType = 'custom' | 'sum_inherited';

export interface IProductBundle {
  _id?: string;
  name: string;
  slug: string;
  description?: string;
  category?: string;
  tags?: string[];
  items: IProductBundleItem[];
  pricingType: BundlePricingType;
  bundlePrice: number;
  discountPercentage?: number;
  inheritedCostPrice?: number;
  profitMarginPercent?: number;
  virtualStock?: number;
  images?: IProductBundleImage[];
  isActive: boolean;
  order?: number;
  metrics?: {
    salesCount: number;
    viewsCount: number;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface IProductBundleResponse<T = IProductBundle> {
  success: boolean;
  message?: string;
  data: T;
}
