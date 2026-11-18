export interface IInvoiceResponse {
  _id: string;
  order: string;
  cae: string;
  caeExpiration: string;
  voucherType: number;
  voucherTypeName: string;
  ptoVta: number;
  voucherNumber: number;
  voucherDate: string;
  amountTotal: number;
  amountNet: number;
  amountTax: number;
  qrData?: string;
  status: string;
}

export interface IMonotributoCategoryScale {
  category: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K';
  annualLimit: number;
  monthlyQuota: number;
  taxOnlyQuota: number;
}

export interface IMonotributoMonthBreakdown {
  monthKey: string;
  label: string;
  year: number;
  monthNumber: number;
  totalBilled: number;
  totalInvoiced: number;
  ordersCount: number;
  invoicesCount: number;
}

export interface IMonotributoReport {
  success: boolean;
  declaredCategory: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K';
  declaredScale: IMonotributoCategoryScale;
  calculatedCategory: string;
  isExceededMonotributo: boolean;
  previousExternalBilling?: number;
  systemBilledRolling12Months?: number;
  totalBilledRolling12Months: number;
  totalInvoicedRolling12Months: number;
  remainingForDeclaredCategory: number;
  percentDeclaredCategoryUsed: number;
  exclusionLimit: number;
  remainingForExclusion: number;
  percentExclusionUsed: number;
  estimatedMonthlyQuota: number;
  nextRecategorization: {
    window: string;
    daysRemaining: number;
    dueDate: string;
    description: string;
  };
  healthStatus: 'ok' | 'warning' | 'danger';
  statusMessage: string;
  monthlyBreakdown: IMonotributoMonthBreakdown[];
  scales: IMonotributoCategoryScale[];
}
