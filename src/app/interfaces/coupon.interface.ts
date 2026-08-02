export interface ICouponUsedBy {
  email?: string;
  userId?: string;
  orderId?: string;
  usedAt: string;
}

export interface ICoupon {
  _id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderAmount?: number;
  maxUses?: number;
  usedCount: number;
  usedBy?: ICouponUsedBy[];
  isFirstPurchaseOnly?: boolean;
  assignedUserEmail?: string;
  assignedUserId?: string;
  expiresAt?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCouponDTO {
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderAmount?: number;
  maxUses?: number;
  isFirstPurchaseOnly?: boolean;
  assignedUserEmail?: string;
  expiresAt?: string | null;
}
