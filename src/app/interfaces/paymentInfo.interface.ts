// Enum para tipos de métodos de pago
export enum PaymentType {
	CASH = 'CASH',
	BANK_TRANSFER = 'BANK_TRANSFER',
	ALIAS_TRANSFER = 'ALIAS_TRANSFER',
	CARD = 'CARD',
	TICKET = 'TICKET'
}

// Interface principal del documento
export interface IPaymentMethod {
  _id: string;
  type: PaymentType;
  name: string;
  description?: string;
  isActive: boolean;
  processingFee?: number; // Comisión en porcentaje (opcional)
  createdAt: Date;
  updatedAt: Date;
}
