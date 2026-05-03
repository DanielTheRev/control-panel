// ============ FAVORITOS POR PRODUCTO ============

export interface IFavoriteProduct {
  _id: string;
  brand: string;
  model: string;
  slug: string;
  category: string;
  isActive: boolean;
  images: { url: string; public_id: string }[];
  prices: {
    efectivo_transferencia: number;
    tarjeta_credito_debito: number;
  };
}

export interface IFavoriteUser {
  _id: string;
  name: string;
  email: string;
}

export interface IFavoritesByProduct {
  product: IFavoriteProduct;
  favoritesCount: number;
  users: IFavoriteUser[];
}

// ============ RESULTADO DE NOTIFICACIÓN ============

export interface INotifyStockResult {
  sentCount: number;
  failedCount: number;
}

// ============ RESPONSE WRAPPER ============

export interface FavoritesApiResponse<T> {
  success: boolean;
  count?: number;
  message?: string;
  data: T;
}
