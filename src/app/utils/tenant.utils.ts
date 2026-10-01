import { environment } from '../../environments/environment';

/**
 * Returns the tenant slug for the current session.
 * - localhost: reads from environment.tenantSlug
 * - production: extracts from subdomain (e.g. bellaisabella.vexx.com.ar → "bellaisabella")
 */
export function getTenantSlug(): string {
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return environment.tenantSlug || '';
  }
  return localStorage.getItem('lastTenantSlug') || '';
}

/**
 * Returns the public store URL for the current tenant.
 * - If environment.storeUrl is set, use it.
 * - Otherwise, builds it from the tenant slug: https://{slug}.vexx.com.ar
 */
export function getStoreUrl(): string {
  // if (environment.storeUrl) {
  //   return environment.storeUrl;
  // }
  if (!environment.production) {
    return 'http://localhost:4200';
  }
  const slug = getTenantSlug();
  if (slug === 'vura') {
    return 'https://vura.com.ar';
  }
  return `https://${slug}.vexx.com.ar`;
}
