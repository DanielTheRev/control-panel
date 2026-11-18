export interface MasterCatalogProduct {
  _id?: string;
  barcode: string;
  name: string;
  brand?: string;
  category: string;
  description?: string;
  imageUrl?: string;
  unit?: string;
  isSoldByWeight?: boolean;
  suggestedPrice?: number;
  source?: 'seed' | 'crowdsourced' | 'admin';
  verified?: boolean;
}

export interface MasterCatalogLookupResponse {
  success: boolean;
  found: boolean;
  source?: 'database' | 'external' | 'not_found';
  product?: MasterCatalogProduct;
}

export interface MasterCatalogSearchResponse {
  success: boolean;
  count: number;
  data: MasterCatalogProduct[];
}
