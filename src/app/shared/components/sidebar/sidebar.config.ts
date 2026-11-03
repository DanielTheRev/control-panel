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
      },
      {
        id: 'cash-register',
        label: 'Caja Registradora',
        icon: 'account_balance_wallet',
        route: '/home/cash-register',
      },
      {
        id: 'client-orders',
        label: 'Pedidos / Delivery',
        icon: 'shopping_cart',
        route: '/home/client-orders',
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
        label: 'Ajustes',
        icon: 'store',
        route: '/home/settings',
      },
      {
        id: 'payment-methods',
        label: 'Cobros & Pagos',
        icon: 'payments',
        route: '/home/payment-methods',
      },
      {
        id: 'staff',
        label: 'Equipo & Empleados',
        icon: 'badge',
        route: '/home/staff',
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
      },
      {
        id: 'pos',
        label: 'Mostrador (POS)',
        icon: 'point_of_sale',
        route: '/home/pos',
      },
      {
        id: 'cash-register',
        label: 'Caja Registradora',
        icon: 'account_balance_wallet',
        route: '/home/cash-register',
      },
      {
        id: 'clients',
        label: 'Clientes',
        icon: 'people',
        route: '/home/clients',
        adminOnly: true,
      },
      {
        id: 'favorites',
        label: 'Favoritos',
        icon: 'favorite',
        route: '/home/favorites',
        adminOnly: true,
        requiredFeature: 'showFavorites',
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
      },
    ],
  },
  {
    id: 'retail-marketing',
    title: 'Marketing & Diseño',
    requiredFeature: 'showBanners',
    items: [
      {
        id: 'home-layout',
        label: 'Diseño del Home',
        icon: 'dashboard_customize',
        route: '/home/home-layout',
      },
      {
        id: 'banners',
        label: 'Banners',
        icon: 'view_carousel',
        route: '/home/banners',
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
        id: 'shop-the-look',
        label: 'Shop The Look',
        icon: 'style',
        route: '/home/shop-the-look',
        requiredFeature: 'showShopTheLook',
      },
      {
        id: 'coupons',
        label: 'Cupones',
        icon: 'local_offer',
        route: '/home/coupons',
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
        icon: 'store',
        route: '/home/settings',
      },
      {
        id: 'staff',
        label: 'Equipo & Empleados',
        icon: 'badge',
        route: '/home/staff',
      },
      {
        id: 'payment-methods',
        label: 'Cobros & Pagos',
        icon: 'payments',
        route: '/home/payment-methods',
      },
      {
        id: 'emails',
        label: 'Emails & Plantillas',
        icon: 'mail',
        route: '/home/emails',
        requiredFeature: 'showEmailsTemplates',
      },
      {
        id: 'shipping-options',
        label: 'Envíos',
        icon: 'local_shipping',
        route: '/home/shipping-options',
        requiredFeature: 'showShippingOptions',
      },
      {
        id: 'recommendations',
        label: 'Recomendaciones AI',
        icon: 'auto_awesome',
        route: '/home/recommendations',
        requiredFeature: 'showRecommendations',
      },
    ],
  },
];
