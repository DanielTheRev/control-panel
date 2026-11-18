import { ISidebarGroup } from './sidebar.models';

/**
 * Grupos y rutas del menú para comercios de mostrador y rotación rápida
 * (Kiosco, Maxikiosco, Almacén, Carnicería, Panadería, Gastronomía).
 */
export const COUNTER_SIDEBAR_GROUPS: ISidebarGroup[] = [
  {
    id: 'counter-operations',
    title: 'Mostrador & Caja',
    items: [
      {
        id: 'pos',
        label: 'Mostrador (POS)',
        icon: 'point_of_sale',
        route: '/home/pos',
        highlight: true,
        requiredFeature: 'showPOS',
      },
      {
        id: 'cash-register',
        label: 'Caja Registradora',
        icon: 'account_balance_wallet',
        route: '/home/cash-register',
        requiredFeature: 'showCashRegister',
      },
      {
        id: 'client-orders',
        label: 'Pedidos / Delivery',
        icon: 'shopping_cart',
        route: '/home/client-orders',
        requiredFeature: 'showOnlineOrders',
      },
    ],
  },
  {
    id: 'counter-inventory',
    title: 'Stock & Catálogo',
    items: [
      {
        id: 'products',
        label: 'Productos',
        icon: 'inventory_2',
        route: '/home/products',
      },
      {
        id: 'categories',
        label: 'Categorías',
        icon: 'category',
        route: '/home/categories',
      },
      {
        id: 'providers',
        label: 'Proveedores',
        icon: 'domain',
        route: '/home/providers',
        adminOnly: true,
        requiredFeature: 'showSupplierPurchases',
      },
      {
        id: 'product-bundles',
        label: 'Conjuntos de Productos',
        icon: 'workspaces',
        route: '/home/product-bundles',
        requiredFeature: 'showProductBundles',
      },
      {
        id: 'data-sets',
        label: 'Conjuntos de Datos',
        icon: 'dataset',
        route: '/home/data-sets',
        requiredFeature: 'showDataSets',
      },
      {
        id: 'coupons',
        label: 'Cupones',
        icon: 'local_offer',
        route: '/home/coupons',
        requiredFeature: 'showCoupons',
      },
    ],
  },
  {
    id: 'counter-metrics',
    title: 'Métricas',
    items: [
      {
        id: 'daily-reports',
        label: 'Resumen Diario',
        icon: 'today',
        route: '/home/daily-reports',
      },
      {
        id: 'sales',
        label: 'Historial Ventas',
        icon: 'bar_chart',
        route: '/home/sales',
      },
      {
        id: 'fiscal',
        label: 'ARCA & Fiscal',
        icon: 'account_balance',
        route: '/home/fiscal',
        requiredFeature: 'showArcaBilling',
      },
      {
        id: 'clients',
        label: 'Clientes',
        icon: 'people',
        route: '/home/clients',
        adminOnly: true,
      },
    ],
  },
  {
    id: 'counter-settings',
    title: 'Configuración',
    adminOnly: true,
    items: [
      {
        id: 'settings',
        label: 'Ajustes de Tienda',
        icon: 'settings',
        route: '/home/settings',
      },
      {
        id: 'addons',
        label: 'Complementos',
        icon: 'extension',
        route: '/home/addons',
        adminOnly: true,
      },
    ],
  },
];

/**
 * Grupos y rutas del menú para comercios con catálogo digital, moda o e-commerce
 * (Indumentaria & Calzado, Tecnología, Retail).
 */
export const RETAIL_SIDEBAR_GROUPS: ISidebarGroup[] = [
  {
    id: 'retail-metrics',
    title: 'Métricas',
    items: [
      {
        id: 'sales',
        label: 'Ventas',
        icon: 'bar_chart',
        route: '/home/sales',
      },
      {
        id: 'daily-reports',
        label: 'Resumen Diario',
        icon: 'today',
        route: '/home/daily-reports',
      },
      {
        id: 'fiscal',
        label: 'ARCA & Fiscal',
        icon: 'account_balance',
        route: '/home/fiscal',
        requiredFeature: 'showArcaBilling',
      },
    ],
  },
  {
    id: 'retail-sales',
    title: 'Ventas & POS',
    items: [
      {
        id: 'client-orders',
        label: 'Pedidos Online',
        icon: 'shopping_cart',
        route: '/home/client-orders',
        requiredFeature: 'showOnlineOrders',
      },
      {
        id: 'pos',
        label: 'Mostrador (POS)',
        icon: 'point_of_sale',
        route: '/home/pos',
        requiredFeature: 'showPOS',
      },
      {
        id: 'cash-register',
        label: 'Caja Registradora',
        icon: 'account_balance_wallet',
        route: '/home/cash-register',
        requiredFeature: 'showCashRegister',
      },
      {
        id: 'clients',
        label: 'Clientes',
        icon: 'people',
        route: '/home/clients',
        adminOnly: true,
      },
    ],
  },
  {
    id: 'retail-catalog',
    title: 'Catálogo',
    items: [
      {
        id: 'products',
        label: 'Productos',
        icon: 'inventory_2',
        route: '/home/products',
      },
      {
        id: 'categories',
        label: 'Categorías',
        icon: 'category',
        route: '/home/categories',
      },
      {
        id: 'providers',
        label: 'Proveedores',
        icon: 'domain',
        route: '/home/providers',
        adminOnly: true,
        requiredFeature: 'showSupplierPurchases',
      },
      {
        id: 'product-bundles',
        label: 'Conjuntos de Productos',
        icon: 'workspaces',
        route: '/home/product-bundles',
        requiredFeature: 'showProductBundles',
      },
      {
        id: 'data-sets',
        label: 'Conjuntos de Datos',
        icon: 'dataset',
        route: '/home/data-sets',
        requiredFeature: 'showDataSets',
      },
    ],
  },
  {
    id: 'retail-marketing',
    title: 'Marketing & Diseño',
    items: [
      {
        id: 'home-layout',
        label: 'Diseño del Home',
        icon: 'dashboard_customize',
        route: '/home/home-layout',
        requiredFeature: 'showBanners',
      },
      {
        id: 'banners',
        label: 'Banners',
        icon: 'view_carousel',
        route: '/home/banners',
        requiredFeature: 'showBanners',
      },
      {
        id: 'hero',
        label: 'Hero Slider',
        icon: 'view_day',
        route: '/home/hero',
        requiredFeature: 'showHeroSlider',
      },
      {
        id: 'menus',
        label: 'Menús Bento',
        icon: 'menu_book',
        route: '/home/menus',
        requiredFeature: 'showWebMenus',
      },
      {
        id: 'coupons',
        label: 'Cupones',
        icon: 'local_offer',
        route: '/home/coupons',
        requiredFeature: 'showCoupons',
      },
      {
        id: 'subscribers',
        label: 'Newsletter',
        icon: 'mark_email_read',
        route: '/home/subscribers',
        requiredFeature: 'showNewsletter',
      },
    ],
  },
  {
    id: 'retail-settings',
    title: 'Configuración',
    adminOnly: true,
    items: [
      {
        id: 'settings',
        label: 'Ajustes de Tienda',
        icon: 'settings',
        route: '/home/settings',
      },
      {
        id: 'addons',
        label: 'Complementos',
        icon: 'extension',
        route: '/home/addons',
        adminOnly: true,
      },
    ],
  },
];
