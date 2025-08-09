// Enum para tipos de métodos de pago
export enum PaymentType {
  CASH = 'Efectivo',
  BANK_TRANSFER = 'Transferencia bancaria',
  ALIAS_TRANSFER = 'Transferencia a alias',
  CARD = 'Tarjeta de crédito / débito',
}

// Interface principal del documento
export interface IPaymentMethod {
  type: PaymentType;
  name: string;
  description?: string;
  isActive: boolean;
  processingFee?: number; // Comisión en porcentaje (opcional)
  createdAt: Date;
  updatedAt: Date;
}
