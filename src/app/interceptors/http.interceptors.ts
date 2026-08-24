import { HttpInterceptorFn } from '@angular/common/http';
import { getTenantSlug } from '../utils/tenant.utils';

export const httpInterceptor: HttpInterceptorFn = (req, next) => {
  const tenantSlug = localStorage.getItem('lastTenantSlug') || getTenantSlug();

  const headers: Record<string, string> = {};
  if (tenantSlug) {
    headers['x-tenant-id'] = tenantSlug;
  }

  req = req.clone({
    withCredentials: true,
    setHeaders: headers,
  });
  return next(req);
};
