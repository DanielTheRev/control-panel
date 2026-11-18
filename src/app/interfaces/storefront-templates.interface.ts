export interface ITemplateCustomizableField {
  key: string;
  label: string;
  type: 'string' | 'boolean' | 'select' | 'color';
  defaultValue: string | boolean;
  options?: string[];
  description?: string;
}

export interface ITenantStorefrontTemplateItem {
  _id?: string;
  key: string;
  name: string;
  shortDescription: string;
  longDescription?: string;
  engine: 'astro' | 'angular' | 'custom';
  checkoutMode: 'whatsapp_and_pickup' | 'full_ecommerce' | 'hybrid';
  thumbnailUrl: string;
  previewUrl?: string;
  minPlanTier: 'local' | 'point' | 'pro';
  supportedBusinessTypes: string[];
  pricingType: 'included_in_plan' | 'monthly_addon' | 'one_time_purchase' | 'custom_quote';
  priceARS: number;
  monthlyPriceARS?: number;
  oneTimePriceARS?: number;
  features: string[];
  customizableFields: ITemplateCustomizableField[];
  isActive: boolean;
  isUnlocked: boolean;
  isActiveForTenant?: boolean;
  isCompatibleWithBusinessType: boolean;
  currentSettings: Record<string, unknown>;
}

export interface ITenantStorefrontSummary {
  activeTemplateKey?: string;
  customDomain?: string | null;
  domainMode?: 'vexx_subdomain' | 'custom_domain';
  publicUrl?: string;
  settings?: Record<string, unknown>;
}

export interface IStorefrontTemplatesResponse {
  success: boolean;
  message?: string;
  data: {
    storefront: ITenantStorefrontSummary;
    templates: ITenantStorefrontTemplateItem[];
    dnsInstructions?: string[];
  };
}
