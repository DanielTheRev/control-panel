export type AccountMovementType = 'CHARGE' | 'PAYMENT' | 'ADJUSTMENT';
export type AccountPaymentMethod = 'CASH' | 'TRANSFER' | 'CARD' | 'OTHER';

export interface IAccountMovement {
  _id: string;
  client: string;
  type: AccountMovementType;
  amount: number;
  previousBalance: number;
  newBalance: number;
  order?: {
    _id: string;
    orderNumber: number;
    total: number;
    status: string;
    createdAt: string;
  };
  cashRegister?: string;
  paymentMethod?: AccountPaymentMethod;
  notes?: string;
  createdBy?: {
    _id: string;
    name: string;
    lastName?: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface IDebtorItem {
  _id: string;
  name: string;
  lastName?: string;
  phone?: string;
  email?: string;
  balance: number;
  creditLimit: number;
  isCreditAllowed: boolean;
  lastMovementDate?: string;
}

export interface IDebtorsSummaryResponse {
  success: boolean;
  data: {
    totalDebt: number;
    debtorCount: number;
    debtors: IDebtorItem[];
  };
}

export interface IClientAccountResponse {
  success: boolean;
  data: {
    client: {
      _id: string;
      name: string;
      lastName?: string;
      email: string;
      phone?: string;
      dni?: string;
      currentAccount: {
        balance: number;
        creditLimit: number;
        isCreditAllowed: boolean;
      };
    };
    movements: IAccountMovement[];
    pagination: {
      total: number;
      page: number;
      pages: number;
      limit: number;
    };
  };
}

export interface IRecordPaymentPayload {
  amount: number;
  paymentMethod: AccountPaymentMethod;
  cashRegisterId?: string;
  notes?: string;
}

export interface IRecordAdjustmentPayload {
  newBalance: number;
  reason: string;
}

export interface IUpdateCreditConfigPayload {
  creditLimit: number;
  isCreditAllowed?: boolean;
}
