import { SaleWithDetail } from './sales.interface';

export interface HourlyBreakpoint {
  hour: number;
  revenue: number;
  count: number;
}

export interface DailyStats {
  date: string;
  totalRevenue: number;
  totalEarnings: number;
  totalCostPrice?: number;
  salesCount: {
    total: number;
    local: number;
    online: number;
  };
  refunds: {
    total: number;
    count: number;
  };
  incomeByMethod: Record<string, number>;
  revenueByMethod: Record<string, number>;
  hourlyBreakdown: HourlyBreakpoint[];
  salesWithDetails: SaleWithDetail[];
}
