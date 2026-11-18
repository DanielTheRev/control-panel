export interface CashRegisterSession {
  _id: string;
  status: 'OPEN' | 'CLOSED';
  initialBalance: number;
  calculatedCloseBalance?: number;
  expectedCloseBalance?: number;
  actualCloseBalance?: number;
  difference?: number;
  openedAt?: string;
  openDate?: string;
  closedAt?: string;
  closeDate?: string;
  createdAt?: string;
  updatedAt?: string;
  openedBy: any;
  closedBy?: any;
  notes?: string;
}
