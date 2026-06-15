export interface IFinanceCost {
  listPrice: number;
  one_pay: number;
  installments: {
    threePaymentsAmount: number;
    sixPaymentsAmount: number;
  };
  commissions: {
    base: number;
    cft3Cuotas: number;
    cft6Cuotas: number;
  };
  profits: {
    one_pay: number;
    three_installments: number;
    six_installments: number;
  };
  maxSafeDiscount: number;
  breakdown: {
    label: string;
    value: number;
    percentage: number;
  }[];
}
