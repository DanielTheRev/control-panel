export interface IMetaPixelConfig {
  active: boolean;
  pixelId: string;
  accessToken: string;
  testEventCode?: string;
}

export interface IGoogleAnalyticsConfig {
  active: boolean;
  measurementId: string;
}

export interface IGoogleAuthConfig {
  active: boolean;
  clientId: string;
}

export interface IResendConfig {
  active: boolean;
  apiKey?: string;
  fromEmail?: string;
  fromName?: string;
}

export interface IEmailTemplateItem {
  enabled: boolean;
  subject: string;
  heading?: string;
  message: string;
  extraInstructions?: string;
  buttonText?: string;
  fromName?: string;
  fromEmail?: string;
  replyTo?: string;
}

export interface IEmailBrandingConfig {
  primaryColor?: string;
  footerText?: string;
  showSocialLinks?: boolean;
  showStoreLogo?: boolean;
}

export interface IEmailTemplatesConfig {
  branding?: IEmailBrandingConfig;
  orderConfirmation?: IEmailTemplateItem;
  bankTransfer?: IEmailTemplateItem;
  cashPayment?: IEmailTemplateItem;
  paymentReceived?: IEmailTemplateItem;
  paymentPending?: IEmailTemplateItem;
  orderShipped?: IEmailTemplateItem;
  orderDelivered?: IEmailTemplateItem;
  abandonedCart?: IEmailTemplateItem;
  backInStock?: IEmailTemplateItem;
}

export interface IAuthConfig {
  allowEmailPassword: boolean;
  allowMagicCode: boolean;
  allowGoogle: boolean;
  defaultMethod?: 'google' | 'magic_code' | 'password';
}

export interface IEcommerceIntegrations {
  metaPixel?: IMetaPixelConfig;
  googleAnalytics?: IGoogleAnalyticsConfig;
  googleAuth?: IGoogleAuthConfig;
  resend?: IResendConfig;
}

export interface IPricingStrategy {
  method: 'markup' | 'margin';
  transferGrossUp: boolean;
  absorbInstallments: boolean;
  maxInstallmentsToAbsorb?: number;
  transferDiscountPercentage?: number;
  cashDiscountPercentage?: number;
  card1PayDiscount?: boolean;
}

export interface IDolarRate {
  moneda: string;
  casa: string;
  nombre: string;
  compra: number;
  venta: number;
  fechaActualizacion: string;
}

export interface IPOSConfig {
  transferValidationMode: 'fast_receipt' | 'strict_admin_approval';
  allowManualDiscount?: boolean;
  autoPrintReceipt?: boolean;
}

export interface IEcommerceConfig {
  name: string;
  logo?: string;
  profit: number;
  profit1Pay?: number;
  profitInstallments?: number;
  taxes: {
    iva: number;
  };
  costCurrency?: 'USD' | 'ARS';
  dollarQuoteType?: 'oficial' | 'blue' | 'bolsa' | 'ccl' | 'tarjeta' | 'mayorista' | 'cripto' | 'custom';
  customDollarRate?: number;
  pricingStrategy?: IPricingStrategy;
  posConfig?: IPOSConfig;
  integrations?: IEcommerceIntegrations;
  authConfig?: IAuthConfig;
  contact: {
    email: string;
    phone: string;
    address: string;
    whatsapp?: string;
  };
  social: {
    instagram: string;
    facebook: string;
    twitter: string;
    tiktok: string;
  };
  brands: string[];
  categories: string[];
  clothingFits: string[];
  shippingConfig?: {
    freeShippingThreshold: number;
  };
  emailTemplates?: IEmailTemplatesConfig;
  workingHours?: {
    weekdayStart?: string;
    weekdayEnd?: string;
    sundayStart?: string;
    sundayEnd?: string;
    noticeText?: string;
  };
  paymentGateways: {
    uala: {
      active: boolean;
      baseCommission: number;
      cft3cuotas: number;
      cft6Cuotas: number;
      cft12cuotas?: number;
      callbackSuccess?: string;
      callbackFail?: string;
      notificationUrl?: string;
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
      cft12cuotas?: number;
      accessToken: string;
      publicKey: string;
      environment?: 'sandbox' | 'production';
      checkoutMode?: 'transparent' | 'redirect' | 'modal' | 'bricks' | 'pro' | 'api';
      webhookSecret?: string;
      maxInstallments: number;
      excludedPaymentMethods?: string[];
      excludedPaymentTypes?: string[];
    };
    getnet?: {
      active: boolean;
      clientId: string;
      clientSecret: string;
      environment: 'sandbox' | 'production';
      baseCommission: number;
      cft3cuotas: number;
      cft6Cuotas: number;
      cft12cuotas?: number;
      maxInstallments: number;
      checkoutMode?: 'redirect' | 'modal' | 'iframe';
    };
    transfer: {
      active: boolean;
      alias: string;
      cbuCvu: string;
      bankName?: string;
      titular?: string;
    };
  };
  callbackURLs?: {
    success?: string;
    fail?: string;
    notification?: string;
  };
}
