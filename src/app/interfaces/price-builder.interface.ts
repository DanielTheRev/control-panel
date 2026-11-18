import { PriceRoundingMode } from './config.interface';
import { ICostConcept } from './product.interface';

export type ChannelKey = 'cash' | 'transfer' | 'qr' | 'debit' | 'credit1Pay' | 'list';
export type ChannelRuleMode = 'auto' | 'linked' | 'discount_from_list' | 'fixed';
export type ChannelSurface = 'all' | 'web' | 'pos';
export type PricingPresetKey = '2_prices' | '3_prices' | '6_channels';

export type WebSettlementTerm = 'instant' | '10d' | '18d' | '35d';
export type QrDebitSettlementTerm = 'instant' | '2d';
export type QrCreditSettlementTerm = 'instant' | '10d';
export type GatewayEnvironment = 'sandbox' | 'production';
export type MpCheckoutMode = 'pro' | 'bricks' | 'hybrid';
export type CredentialSource = 'oauth' | 'manual';

export interface IPriceBuilderChannelRule {
  enabled: boolean;
  mode: ChannelRuleMode;
  linkedTo?: ChannelKey;
  discountPercent?: number;
  fixedPrice?: number;
  inheritCosts: boolean;
  excludedCostConcepts?: string[];
  extraCosts?: ICostConcept[];
}

export type IPriceBuilderChannelPricing = Partial<Record<ChannelKey, IPriceBuilderChannelRule>>;

export interface IPriceBuilderChannelSnapshot {
  enabled: boolean;
  price: number;
  mode: ChannelRuleMode;
  inheritCosts: boolean;
  linkedTo?: ChannelKey;
  discountPercent?: number;
  excludedCostConcepts?: string[];
  extraCosts?: ICostConcept[];
  costBaseARS: number;
  feeLabel: string;
  netProfit: number;
  netMarginPercent: number;
  isWarningLoss: boolean;
  isBelowTargetMargin: boolean;
  surface: ChannelSurface;
}

export interface IDisplaySummaryItem {
  label: string;
  price: number;
  channels: ChannelKey[];
  surface: ChannelSurface;
}

export interface IPriceBuilderInsight {
  type: 'info' | 'warning' | 'error';
  message: string;
  suggestedFix?: {
    label: string;
    expensiveCh: ChannelKey;
    cheapCh: ChannelKey;
    suggestedPrice: number;
  };
}

export interface IPaymentRestrictions {
  allowCardPayment: boolean;
  allowInterestFreeInstallments: boolean;
  maxInstallments?: number;
}

export interface IPriceBuilderCalculateRequest {
  providerCost?: number;
  costPrice?: number;
  pricingMethodChoice?: 'markup' | 'margin';
  useCustomProfit?: boolean;
  customProfitMargin?: number;
  additionalCosts?: ICostConcept[];
  paymentRestrictions?: Partial<IPaymentRestrictions>;
  channelPricing?: IPriceBuilderChannelPricing;
  priceRoundingMode?: PriceRoundingMode;
  dolar?: number;
}

export interface IPriceBuilderCalculateResult {
  success?: boolean;
  activeGateway?: {
    key: string;
    label: string;
  };
  price: {
    listPrice: number;
    card_ticket1PayPrice?: number;
    cashTransferPrice?: number;
    cashPrice?: number;
    transferPrice?: number;
    qrPrice?: number;
    debitPrice?: number;
    shippingSubsidy?: number;
    channels: Record<ChannelKey, IPriceBuilderChannelSnapshot>;
    displaySummary: IDisplaySummaryItem[];
  };
  insights: IPriceBuilderInsight[];
  finance?: unknown;
}

export interface IPriceBuilderPresetItem {
  label: string;
  channelPricing: Record<ChannelKey, IPriceBuilderChannelRule>;
}

export interface IPriceBuilderPresetsResponse {
  success: boolean;
  data: {
    presets: Record<PricingPresetKey, IPriceBuilderPresetItem>;
    mercadoPagoRates: {
      note: string;
      webCheckout: Record<WebSettlementTerm, number>;
      defaultCft: {
        cft2cuotas: number;
        cft3cuotas: number;
        cft6Cuotas: number;
        cft9cuotas: number;
        cft12cuotas: number;
        cft18cuotas: number;
      };
      qr: {
        accountMoney: number;
        debit: Record<QrDebitSettlementTerm, number>;
        credit: Record<QrCreditSettlementTerm, number>;
        prepaid?: number;
      };
      posPoint: {
        debit: number;
        credit?: number;
        prepaid?: number;
        pix?: number;
      };
    };
  };
}
