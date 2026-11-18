export interface BusinessFeatures {
  showPOS: boolean;
  showCashRegister: boolean;
  showOnlineOrders: boolean;
  showCustomerAccounts: boolean;
  showSupplierPurchases: boolean;
  showShopTheLook: boolean;
  showDataSets: boolean;
  showProductBundles: boolean;
  allowMetricDataSets: boolean;
  showCoupons: boolean;
  showArcaBilling: boolean;
  showHeroSlider: boolean;
  showBanners: boolean;
  showWebMenus: boolean;
  showNewsletter: boolean;
  showShippingOptions: boolean;
  showEmailsTemplates: boolean;
  showRecommendations: boolean;
  showFavorites: boolean;
  canSellByWeight: boolean;
  showSettingsAuth: boolean;
  showSettingsIntegrations: boolean;
  showSettingsShipping: boolean;
  showSettingsEmails: boolean;
  showSettingsContact: boolean;
  showSettingsClothing: boolean;
}

export interface BusinessThemeConfig {
  primary: string;
  primaryContent: string;
  label: string;
  badge: string;
  colorName: string;
  previewHex: string;
}
