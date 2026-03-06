import { HttpInterceptorFn } from '@angular/common/http';
import { getTenantSlug } from '../utils/tenant.utils';

export const httpInterceptor: HttpInterceptorFn = (req, next) => {
  req = req.clone({
    withCredentials: true,
    setHeaders: {
      'x-tenant-id': getTenantSlug(),
    },
  });
  return next(req);
};
