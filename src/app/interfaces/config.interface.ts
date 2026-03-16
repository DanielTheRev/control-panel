export interface IEcommerceConfig {
  name: string;
  profit: number;
  taxes: {
    iva: number;
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
    customMethods: {
      id: string;
      name: string;
      description: string;
      active: boolean;
    }[];
  };
}
