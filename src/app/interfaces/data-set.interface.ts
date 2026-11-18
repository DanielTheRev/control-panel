export type DataSetFilterField =
  | 'name'
  | 'category'
  | 'tags'
  | 'brand'
  | 'price'
  | 'stockStatus'
  | 'entityType'
  | 'salesCount'
  | 'viewsCount'
  | 'cartAddsCount';

export type DataSetFilterOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'in'
  | 'not_in'
  | 'greater_than'
  | 'less_than'
  | 'between';

export type DataSetSortBy =
  | 'newest'
  | 'oldest'
  | 'alphabetical_asc'
  | 'alphabetical_desc'
  | 'price_asc'
  | 'price_desc'
  | 'most_sold'
  | 'most_viewed'
  | 'most_cart_adds';

export interface IDataSetFilter {
  field: DataSetFilterField;
  operator: DataSetFilterOperator;
  value: any;
}

export interface IDataSet {
  _id?: string;
  name: string;
  slug: string;
  description?: string;
  matchType: 'all' | 'any';
  filters: IDataSetFilter[];
  sortBy: DataSetSortBy;
  maxItems?: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface IDataSetResponse<T = IDataSet> {
  success: boolean;
  message?: string;
  data: T;
}
