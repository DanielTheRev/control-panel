import {
  ITenantStorefrontSummary,
  ITenantStorefrontTemplateItem,
} from './storefront-templates.interface';
import { ITenantAddonItem } from './tenant-bootstrap.interface';

export interface IMarketplaceSummary {
  planTier: 'local' | 'point' | 'pro';
  planCode: string;
  ownedAddonsCount: number;
  ownedTemplatesCount: number;
  activeTemplateKey: string | null;
  publicUrl: string;
  vexxSubdomainUrl: string;
  customDomain: string | null;
  pendingRequestsCount: number;
}

export interface IMarketplaceAddonItem extends ITenantAddonItem {
  isOwned: boolean;
  isIncludedInPlan: boolean;
  canActivateDirectly: boolean;
  canRequestPurchase: boolean;
}

export interface IMarketplaceTemplateItem extends ITenantStorefrontTemplateItem {
  templateKind: 'mobile_catalog' | 'full_website';
  isPurchasable: boolean;
  canRequestPurchase: boolean;
}

export interface IPurchaseRequest {
  _id: string;
  kind: 'addon' | 'template';
  itemId: string;
  itemName: string;
  priceARS: number;
  billingCycle: 'monthly' | 'one_time' | 'quote';
  status: 'pending' | 'approved' | 'rejected';
  resolutionNote?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface IMarketplaceData {
  summary: IMarketplaceSummary;
  storefront: ITenantStorefrontSummary;
  addons: IMarketplaceAddonItem[];
  templates: IMarketplaceTemplateItem[];
  requests: IPurchaseRequest[];
}

export interface IMarketplaceResponse {
  success: boolean;
  message?: string;
  data: IMarketplaceData;
}

export interface IPurchaseResponse {
  success: boolean;
  message?: string;
  data?: {
    status: 'pending' | 'approved' | 'rejected';
    request?: IPurchaseRequest;
  };
}
