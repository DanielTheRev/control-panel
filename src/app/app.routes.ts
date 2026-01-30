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
        component: ClientOrders,
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
            path: 'edit/:id',
            component: ProductCreate,
          },
        ]
      },
      {
        path: 'payment-methods',
        component: PaymentMethods,
      },
      {
        path: 'shipping-options',
        component: ShippingOptions,
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
