import { Routes } from '@angular/router';
import { Login } from './pages/login/login';
import { ClientOrders } from './pages/client-orders/client-orders';
import { AuthGuard } from './guards/auth.guard';
import { ProductList } from './pages/product-list/product-list';

export const routes: Routes = [
  {
    path: 'login',
    component: Login,
  },
  {
    path: 'client-orders',
    component: ClientOrders,
    canActivate: [AuthGuard],
  },
  {
    path: 'product-list',
    component: ProductList,
    canActivate: [AuthGuard],
  },
  {
    path: '',
    redirectTo: 'product-list',
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: 'login',
    pathMatch: 'full',
  },
];
