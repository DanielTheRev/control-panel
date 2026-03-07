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
            path: 'create',
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
        path: 'settings',
        loadComponent: () => import('./pages/store-settings/store-settings').then(c => c.StoreSettings)
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
