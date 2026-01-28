import { Routes } from '@angular/router';
import { redirectLoggedUserGuard } from './guards/redirect-logged-user.guard';
import { ClientOrders } from './pages/client-orders/client-orders';
import { Login } from './pages/login/login';
import { MainPage } from './pages/main-page/main-page';
import { ProductList } from './pages/product-list/product-list';
import { redirectToLoginGuard } from './guards/redirect-to-login.guard';

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
        path: 'product-list',
        component: ProductList,
      },
      {
        path: '**',
        pathMatch: 'full',
        redirectTo: 'product-list',
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'login',
    pathMatch: 'full',
  },
];
