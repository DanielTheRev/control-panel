import { BusinessType } from './business-vertical.interface';

export type VexxPlanTier = 'local' | 'point' | 'pro';

export type AddonCategory =
  | 'operaciones'
  | 'producto'
  | 'marketing'
  | 'fiscal'
  | 'web_storefront'
  | 'tracking';

export type AddonSurface =
  | 'admin_form'
  | 'admin_module'
  | 'pos'
  | 'storefront_section'
  | 'tracker';

export type AddonImplementationStatus = 'ready' | 'draft';

export type AddonImpactDomain =
  | 'product_form'
  | 'product_pricing'
  | 'storefront_prices'
  | 'checkout'
  | 'shipping'
  | 'pos'
  | 'inventory'
  | 'fiscal';

export type AddonProductFormSlotKey =
  | 'scanner_lookup'
  | 'supplier'
  | 'pricing'
  | 'inventory_unit'
  | 'variants'
  | 'specs'
  | 'bundles'
  | 'catalog_visibility'
  | 'seo'
  | 'expirations';

export interface IAddonProductFormSlotTarget {
  slot: AddonProductFormSlotKey;
  mode: 'replace' | 'extend';
  componentKey: string;
}

export interface IAddonTargets {
  domains: readonly AddonImpactDomain[];
  productFormSlots?: readonly IAddonProductFormSlotTarget[];
  adminScreens?: readonly string[];
  storefrontBlocks?: readonly string[];
  interactions?: readonly { target: string; behavior: string }[];
}

export interface ITenantAddonItem {
  id: string;
  name: string;
  shortDescription: string;
  category: AddonCategory;
  icon: string;
  implementationStatus: AddonImplementationStatus;
  includedInPlans: VexxPlanTier[];
  isPurchasable: boolean;
  monthlyPriceARS: number;
  surfaces: AddonSurface[];
  grantsCapabilities: (keyof IPlanCapabilities)[];
  requiresSetup: boolean;
  targets?: IAddonTargets;
  settingsRoute?: string;
  isActive: boolean;
  isConfigured: boolean;
  status: 'active' | 'pending_setup' | 'available';
  labels?: Record<string, string>;
  settings?: Record<string, unknown>;
}

export interface IBootstrapTheme {
  primary: string;
  primaryContent: string;
  businessType: BusinessType | string;
}

export interface IPlanCapabilities {
  // Operación Local Físico (Capa 1)
  hasPos: boolean;
  hasCashRegister: boolean;
  hasStockAndCostControl: boolean;
  hasScaleWeightPricing: boolean;
  hasCustomerAccounts: boolean;
  hasSupplierPurchases: boolean;
  hasTeamManagement: boolean;
  hasArcaBilling: boolean;
  hasInStorePaymentConfig: boolean;

  // Catálogo Digital & Pedidos (Capa 2)
  hasWebCatalog: boolean;
  hasOnlineOrders: boolean;
  hasThemeTemplates: boolean;
  hasCoupons: boolean;
  hasLocalDeliveryAndTakeaway: boolean;
  hasFeaturedProducts: boolean;
  hasStoreHoursAndStatus: boolean;
  hasSocialLinks: boolean;
  hasProductBundles: boolean;
  hasDataSets: boolean;

  // Omnicanal & Tienda Web Completa (Capa 3)
  hasFullWebStore: boolean;
  hasCustomDomain: boolean;
  hasMarketingBanners: boolean;
  hasOnlinePaymentGateways: boolean;
  hasAutomatedShippingCouriers: boolean;
  hasProductFeeds: boolean;
  hasMetricDataSets: boolean;
}

export interface IProductFormLabels {
  name: string;
  category: string;
  brand: string;
  barcode: string;
  supplier: string;
  variantsTitle: string;
  weightTitle: string;
  specsTitle: string;
  bundleTitle: string;
}

export interface IProductFormPlaceholders {
  name: string;
  category: string;
  brand: string;
  barcode: string;
}

export type VariantMode = 'fashion' | 'tech' | 'presentation';

export interface IProductVariantFormConfig {
  variantMode: VariantMode;
  allowPerVariantPrice: boolean;
  allowPerVariantMargin: boolean;
  showColorColumn: boolean;
  showSizeColumn: boolean;
  showVolumeColumn: boolean;
  showAttributesColumn: boolean;
  showFits?: boolean;
}

export interface ISizeGuideTemplate {
  id: string;
  name: string;
  headers: string[];
  defaultRows: string[];
  tolerance?: string;
  isDefault?: boolean;
}

export interface ISaveSizeGuideTemplatePayload {
  id?: string;
  name: string;
  headers: string[];
  defaultRows: string[];
  tolerance?: string;
  isDefault?: boolean;
}

export interface ISizeGuideTemplatesResponse {
  success: boolean;
  data: {
    template?: ISizeGuideTemplate;
    templates: ISizeGuideTemplate[];
  };
}

export interface IAddSpecOptionResponse {
  success: boolean;
  data: {
    key: string;
    options: string[];
  };
}

export interface IProductSizeGuideFormConfig {
  addonEnabled: boolean;
  allowCustomColumns: boolean;
  showToleranceField: boolean;
  templates?: ISizeGuideTemplate[];
}

export interface IProductSpecFieldSchema {
  key: string;
  inputType: 'text' | 'select';
  required: boolean;
  options?: string[];
  optionsSource?: string;
  allowMerchantAddOption?: boolean;
  allowFeatured?: boolean;
  placeholder?: string;
}

export interface IProductGalleryFormConfig {
  addonEnabled: boolean;
  maxImages: number;
  enableCropper: boolean;
  allowedAspectRatios: string[];
  enableVariantTagging: boolean;
  autoOptimizeWebP: boolean;
  defaultQuality?: number;
  idStrategy: 'vexx-uuid-agnostic';
}

export interface IProductDescriptionFormConfig {
  addonEnabled: boolean;
  showSubtitle: boolean;
  showShortDescription: boolean;
  showRichDescription: boolean;
}

export interface IProductWeighableFormConfig {
  addonEnabled?: boolean;
  allowedUnits: readonly string[];
  defaultUnit?: string;
  pluBarcodePrefix?: string;
  allowFractionalVariants?: boolean;
}

export interface IProductDetailsFormConfig {
  addonEnabled: boolean;
  showSpecifications: boolean;
  showCareInstructions: boolean;
  showTags: boolean;
  showFeatures: boolean;
  allowBulkPaste: boolean;
  suggestedSpecKeys: string[];
  suggestedCareChips: string[];
  specFields?: IProductSpecFieldSchema[];
}

export interface IProductWebCatalogFormConfig {
  addonEnabled: boolean;
  showStatusSelector: boolean;
  showFeaturedToggle: boolean;
}

export interface IProductSeoFormConfig {
  addonEnabled: boolean;
  showSeoFields: boolean;
  showMetaImage: boolean;
  showSlugEditor: boolean;
  enableJsonLd: boolean;
}

export interface IProductCrossSellFormConfig {
  addonEnabled: boolean;
  allowVariantSelection: boolean;
  maxItems: number;
  showInStorefront: boolean;
}

export interface IProductFormConfig {
  showBarcodeScanner: boolean;
  showMasterCatalogLookup: boolean;
  showPrintBarcodeLabelButton: boolean;
  showSupplierSelector: boolean;
  showWeightScalePrice: boolean;
  allowedWeighableUnits?: readonly string[];
  weighableConfig?: IProductWeighableFormConfig;
  showVariantsGrid: boolean;
  variantConfig?: IProductVariantFormConfig;
  sizeGuideConfig?: IProductSizeGuideFormConfig;
  showSizeGuideAndFits?: boolean;
  showSpecifications?: boolean;
  showMultiPhotosGallery: boolean;
  maxImagesAllowed: number;
  allowVariantImageLinking: boolean;
  allowedAspectRatios: string[];
  galleryConfig?: IProductGalleryFormConfig;
  descriptionConfig?: IProductDescriptionFormConfig;
  detailsConfig?: IProductDetailsFormConfig;
  webCatalogConfig?: IProductWebCatalogFormConfig;
  seoConfig?: IProductSeoFormConfig;
  crossSellConfig?: IProductCrossSellFormConfig;
  showInstallmentsAndListPrice: boolean;
  showWebCatalogOptions?: boolean;
  showProductBundleOptions: boolean;
  bundleLabel: string;
  showSeoFields?: boolean;
  labels: IProductFormLabels;
  placeholders: IProductFormPlaceholders;
}

export interface IProductListViewConfig {
  showEloRankingTab: boolean;
  showImgSeoFilter: boolean;
  showFeaturedFilter: boolean;
  showSupplierLinkFilter: boolean;
  showSupplierFilter: boolean;
  showSizeGuideFilter: boolean;
  showWeighableFilter: boolean;
  showDataSetsTab: boolean;
  showProductBundlesTab: boolean;
  bundleTabLabel: string;
  allowMetricFiltersInDataSets: boolean;
}

export interface IBootstrapSidebarItem {
  key: string;
  addonId: string;
  label: string;
  route: string;
  icon: string;
  enabled: boolean;
  adminOnly?: boolean;
  requiredPermission?: string;
  actions?: Record<string, boolean | number | string>;
}

export interface IBootstrapSidebarGroup {
  groupKey: 'metrics' | 'sales_and_pos' | 'catalog' | 'marketing_and_design' | 'settings' | string;
  groupLabel: string;
  items: IBootstrapSidebarItem[];
}

export interface IBootstrapSettingsTab {
  tabKey: string;
  addonId: string;
  label: string;
  icon: string;
  enabled: boolean;
  adminOnly?: boolean;
  requiredPermission?: string;
  sections: Record<string, boolean | number | string>;
}

export interface IPermissionCatalogItem {
  key: string;
  label: string;
  description: string;
  sensitive?: boolean;
}

export interface IPermissionSectionGroup {
  sectionKey: string;
  addonIds: string[];
  title: string;
  description: string;
  permissions: IPermissionCatalogItem[];
}

export interface IBootstrapNavigation {
  sidebarGroups: IBootstrapSidebarGroup[];
  settingsTabs: IBootstrapSettingsTab[];
}

export interface ITenantBootstrapData {
  user: {
    _id: string;
    name: string;
    lastName?: string;
    email: string;
    role: string;
    position?: string;
    permissions: string[];
    isAdmin: boolean;
  };
  tenant: {
    name: string;
    slug: string;
    businessType: BusinessType;
    planTier: VexxPlanTier;
    activeAddons: string[];
    customLabels: Record<string, string>;
    addonLabels?: Record<string, Record<string, string>>;
    maxEmployeesAllowed: number;
    extraEmployeesPurchased: number;
  };
  capabilities: IPlanCapabilities;
  addons: ITenantAddonItem[];
  navigation?: IBootstrapNavigation;
  permissionCatalog?: IPermissionSectionGroup[];
  forms: {
    product: IProductFormConfig;
  };
  views: {
    productList: IProductListViewConfig;
  };
  store: {
    name: string;
    logo?: string;
    customDomain?: string;
    publicUrl?: string;
    posConfig?: Record<string, any>;
  };
  theme: IBootstrapTheme;
}

export interface ITenantBootstrapResponse {
  success: boolean;
  data: ITenantBootstrapData;
}
