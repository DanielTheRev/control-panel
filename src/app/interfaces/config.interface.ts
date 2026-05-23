export interface IEcommerceConfig {
  name: string;
  profit: number;
  profit1Pay?: number;
  profitInstallments?: number;
  taxes: {
    iva: number;
  };
  costCurrency?: 'USD' | 'ARS';
  pricingStrategy?: {
    method: 'markup' | 'margin';
    transferGrossUp: boolean;
    absorbInstallments: boolean;
  };
  contact: {
    email: string;
    phone: string;
    address: string;
  };
  social: {
    instagram: string;
    facebook: string;
    twitter: string;
    tiktok: string;
  };
  brands: string[],
  categories: string[],
  clothingFits: string[],
  shippingConfig?: {
    freeShippingThreshold: number;
  },
  paymentGateways: {
    uala: {
      active: boolean;
      baseCommission: number;
      cft3cuotas: number;
      cft6Cuotas: number;
      credentials?: {
        userName: string;
        clientId: string;
        clientSecret: string;
      };
    };
    mercadopago: {
      active: boolean;
      baseCommission: number;
      cft3cuotas: number;
      cft6Cuotas: number;
      accessToken: string;
      publicKey: string;
      webhookSecret?: string;
      maxInstallments: number;
      excludedPaymentMethods: string[];
      excludedPaymentTypes: string[];
    };
    bankTransfer: {
      active: boolean;
      cbu: string;
      alias: string;
    };
    customMethods: {
      id: string;
      name: string;
      description: string;
      active: boolean;
    }[];
  };
}
