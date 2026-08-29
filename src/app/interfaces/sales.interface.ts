export type SalesRange = 'day' | 'week' | 'month' | 'year';

export interface SaleItemDetail {
  productName: string;
  image?: string;
  variant?: string;
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
  status?: string;
  paymentStatus?: string;
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
  ordersCount: number;
}

export interface TopProduct {
  productName: string;
  image: string;
  quantity: number;
  revenue: number;
  earnings: number;
}

export interface SalesStatsResponse {
  range: SalesRange;
  from: string;
  to: string;
  currency: 'USD' | 'ARS';

  totalRevenue: number;
  totalEarnings: number;
  totalCostPrice: number;
  averageTicket: number;
  averageMargin: number;

  salesCount: {
    total: number;
    local: number;
    online: number;
  };

  refunds: {
    total: number;
    count: number;
  };

  revenueByMethod: Record<string, number>;
  dailyBreakdown: DailyBreakpoint[];
  topProducts: TopProduct[];
  salesWithDetails: SaleWithDetail[];
}
