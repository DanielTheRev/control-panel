import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { NotificationsService } from '../services/notifications.service';
import { TenantBootstrapStateService } from '../states/tenant-bootstrap.state.service';
import { getTenantSlug } from '../utils/tenant.utils';

let lastBootstrapRefreshAt = 0;

export const httpInterceptor: HttpInterceptorFn = (req, next) => {
  const notifications = inject(NotificationsService);
  const bootstrapState = inject(TenantBootstrapStateService);
  const router = inject(Router);
  const tenantSlug = localStorage.getItem('lastTenantSlug') || getTenantSlug();

  const headers: Record<string, string> = {};
  if (tenantSlug) {
    headers['x-tenant-id'] = tenantSlug;
  }

  req = req.clone({
    withCredentials: true,
    setHeaders: headers,
  });

  return next(req).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse && err.status === 401) {
        const url = req.url.toLowerCase();
        const isAuthRequest = url.includes('/auth/') || url.includes('/login');
        if (!isAuthRequest) {
          localStorage.removeItem('vexx_panel_token');
          if (!router.url.startsWith('/login')) {
            router.navigate(['/login']);
          }
        }
      }
      if (err instanceof HttpErrorResponse && err.status === 403) {
        const url = req.url.toLowerCase();
        const isAuthOrBootstrap =
          url.includes('/auth/') || url.includes('/login') || url.includes('/tenant/bootstrap');

        if (!isAuthOrBootstrap) {
          const message =
            (typeof err.error?.message === 'string' && err.error.message.trim()) ||
            'Módulo no habilitado para este comercio';
          notifications.error(message);

          const now = Date.now();
          if (now - lastBootstrapRefreshAt > 2000) {
            lastBootstrapRefreshAt = now;
            bootstrapState.refresh();
          }
        }
      }
      return throwError(() => err);
    }),
  );
};
