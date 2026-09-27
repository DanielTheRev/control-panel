import { Routes } from '@angular/router';
import { redirectLoggedUserGuard } from './guards/redirect-logged-user.guard';
import { redirectToLoginGuard } from './guards/redirect-to-login.guard';
import { Login } from './pages/login/login';
import { MainPage } from './pages/main-page/main-page';
import { coreRoutes } from './routes/core.routes';
import { kioskRoutes } from './routes/kiosk.routes';
import { fashionRoutes } from './routes/fashion.routes';

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
      ...kioskRoutes,
      ...coreRoutes,
      ...fashionRoutes,
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
