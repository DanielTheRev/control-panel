import { Routes } from '@angular/router';
import { redirectLoggedUserGuard } from './guards/redirect-logged-user.guard';
import { redirectToLoginGuard } from './guards/redirect-to-login.guard';
import { ClientOrders } from './pages/client-orders/client-orders';
import { Login } from './pages/login/login';
import { MainPage } from './pages/main-page/main-page';
import { PaymentMethods } from './pages/payment-methods/payment-methods';
import { ProductCreate } from './pages/product-create/product-create';
import { ProductList } from './pages/product-list/product-list';
import { ShippingOptions } from './pages/shipping-options/shipping-options';
import { ProductTypeSelector } from './shared/components/product-type-selector/product-type-selector';

export const routes: Routes = [
  {
    path: 'login',
    component: Login,
    canActivate: [redirectLoggedUserGuard],
  },
  {
    path: 'home',
    component: MainPage,
    canActivate: [redirectToLoginGuard],
    children: [
      {
        path: 'client-orders',
        children: [
          {
            path: '',
            component: ClientOrders,
          },
          {
            path: ':id',
            loadComponent: () => import('./pages/client-orders/order-details/order-details').then(c => c.OrderDetails)
          }
        ]
      },
      {
        path: 'products',
        children: [
          {
            path: '',
            pathMatch: 'full',
            component: ProductList,
          },
          {
            // Step 1: choose product type
            path: 'create',
            component: ProductTypeSelector,
          },
          {
            // Step 2: fill form for a specific type
            path: 'create/:typeParam',
            component: ProductCreate,
          },
          {
            path: 'edit/:productID',
            component: ProductCreate,
          },
          {
            path: ':productID',
            loadComponent: () => import('./pages/product-detail/product-detail').then(c => c.ProductDetail)
          },
        ]
      },
      {
        path: 'payment-methods',
        children: [
          {
            path: '',
            pathMatch: 'full',
            component: PaymentMethods
          },
          {
            path: 'create',
            loadComponent: () => import('./pages/payment-methods-create/payment-methods-create').then(c => c.PaymentMethodsCreate)
          },
          {
            path: 'edit/:paymentMethodID',
            loadComponent: () => import('./pages/payment-methods-create/payment-methods-create').then(c => c.PaymentMethodsCreate)
          }
        ]
      },
      {
        path: 'shipping-options',
        children: [
          {
            path: '',
            pathMatch: 'full',
            component: ShippingOptions
          },
          {
            path: 'create',
            loadComponent: () => import('./pages/shipping-options-create/shipping-options-create').then(c => c.ShippingOptionsCreate)
          },
          {
            path: 'edit/:shippingOptionID',
            loadComponent: () => import('./pages/shipping-options-create/shipping-options-create').then(c => c.ShippingOptionsCreate)
          }
        ]
      },
      {
        path: 'banners',
        children: [
          {
            path: '',
            pathMatch: 'full',
            loadComponent: () => import('./pages/banner-list/banner-list').then(c => c.BannerList)
          },
          {
            path: 'create',
            loadComponent: () => import('./pages/banner-create/banner-create').then(c => c.BannerCreate)
          },
          {
            path: 'edit/:bannerID',
            loadComponent: () => import('./pages/banner-create/banner-create').then(c => c.BannerCreate)
          }
        ]
      },
      {
        path: 'bento',
        loadComponent: () => import('./pages/bento-editor/bento-editor').then(c => c.BentoEditorComponent)
      },
      {
        path: 'hero',
        children: [
          {
            path: '',
            pathMatch: 'full',
            loadComponent: () => import('./pages/hero-list/hero-list').then(c => c.HeroListComponent)
          },
          {
            path: 'create',
            loadComponent: () => import('./pages/hero-create/hero-create').then(c => c.HeroCreateComponent)
          },
          {
            path: 'edit/:slideID',
            loadComponent: () => import('./pages/hero-create/hero-create').then(c => c.HeroCreateComponent)
          }
        ]
      },
      {
        path: 'shop-the-look',
        children: [
          {
            path: '',
            pathMatch: 'full',
            loadComponent: () => import('./pages/shop-the-look/shop-the-look-list/shop-the-look-list').then(c => c.ShopTheLookListComponent)
          },
          {
            path: 'create',
            loadComponent: () => import('./pages/shop-the-look/shop-the-look-create/shop-the-look-create').then(c => c.ShopTheLookCreateComponent)
          },
          {
            path: 'edit/:lookID',
            loadComponent: () => import('./pages/shop-the-look/shop-the-look-create/shop-the-look-create').then(c => c.ShopTheLookCreateComponent)
          }
        ]
      },
      {
        path: 'settings',
        loadComponent: () => import('./pages/store-settings/store-settings').then(c => c.StoreSettings)
      },
      {
        path: 'cash-register',
        title: 'Caja Registradora',
        loadComponent: () => import('./pages/cash-register/cash-register').then(c => c.CashRegisterComponent)
      },
      {
        path: 'pos',
        title: 'Punto de Venta',
        loadComponent: () => import('./pages/pos/pos').then(c => c.PosComponent)
      },
      {
        path: 'daily-reports',
        title: 'Resumen del Día',
        loadComponent: () => import('./pages/daily-reports/daily-reports').then(c => c.DailyReportsComponent)
      },
      {
        path: 'providers',
        children: [
          {
            path: '',
            pathMatch: 'full',
            loadComponent: () => import('./pages/provider-list/provider-list').then(c => c.ProviderList)
          },
          {
            path: 'create',
            loadComponent: () => import('./pages/provider-create/provider-create').then(c => c.ProviderCreate)
          },
          {
            path: 'edit/:providerID',
            loadComponent: () => import('./pages/provider-create/provider-create').then(c => c.ProviderCreate)
          }
        ]
      },
      {
        path: 'clients',
        title: 'Clientes',
        loadComponent: () => import('./pages/clients/clients').then(c => c.ClientsComponent)
      },
      {
        path: 'favorites',
        title: 'Favoritos',
        loadComponent: () => import('./pages/favorites/favorites').then(c => c.FavoritesComponent)
      },
      {
        path: '**',
        pathMatch: 'full',
        redirectTo: 'products',
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'login',
    pathMatch: 'full',
  },
];
