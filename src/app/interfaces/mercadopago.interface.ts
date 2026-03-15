export interface IMPAvailableMethod {
  id: string;              // Ej: "visa", "master", "rapipago"
  name: string;            // Ej: "Visa", "Mastercard"
  payment_type_id: string; // Ej: "credit_card", "ticket", "bank_transfer"
  thumbnail: string;       // URL del logo del método
  status: string;          // Ej: "active"
}

export interface IAggregatedPaymentMethodsResponse {
  manualMethods: {
    _id: string;
    type: 'Efectivo' | 'Transferencia bancaria' | 'Transferencia a alias' | 'Tarjeta de crédito / débito';
    name: string;
    description: string;
    isActive: boolean;
  }[];
  automaticGateways: {
    mercadopago: {
      active: boolean;
      availableMethods: IMPAvailableMethod[];
      excludedPaymentMethods: string[];
      excludedPaymentTypes: string[];
    };
  };
}

export interface IUpdateMPConfigDTO {
  paymentGateways: {
    mercadopago: {
      active: boolean;
      excludedPaymentMethods: string[];
      excludedPaymentTypes: string[];
      baseCommission?: number;
      cft3cuotas?: number;
      cft6Cuotas?: number;
      maxInstallments?: number;
    }
  }
}

export interface IManualMethodDTO {
  type: 'Efectivo' | 'Transferencia bancaria' | 'Transferencia a alias' | 'Tarjeta de crédito / débito';
  name: string;
  description: string;
  isActive?: boolean;
}
