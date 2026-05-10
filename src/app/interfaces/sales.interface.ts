export type SalesRange = 'day' | 'week' | 'month' | 'year';

export interface SaleItemDetail {
  productName: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  provider: { name: string } | null;
}

export interface SaleWithDetail {
  orderId: string;
  orderNumber: string;
  createdAt: string;
  saleType: 'LOCAL' | 'ONLINE';
  total: number;
  earnings: number;
  paymentMethod: string;
  buyer: { name: string; email: string } | null;
  items: SaleItemDetail[];
}

export interface DailyBreakpoint {
  date: string;       // 'YYYY-MM-DD'
  revenue: number;
  earnings: number;
  count: number;
}

export interface SalesStatsResponse {
  range: SalesRange;
  from: string;
  to: string;
  currency: 'USD' | 'ARS';

  totalRevenue: number;
  totalEarnings: number;
  totalCostPrice: number;

  salesCount: {
    total: number;
    local: number;
    online: number;
  };

  revenueByMethod: Record<string, number>;
  dailyBreakdown: DailyBreakpoint[];
  salesWithDetails: SaleWithDetail[];
}
