import { environment } from '../../environments/environment';

/**
 * Returns the tenant slug for the current session.
 * - localhost: reads from environment.tenantSlug
 * - production: extracts from subdomain (e.g. bellaisabella.nexocommerce.com → "bellaisabella")
 */
export function getTenantSlug(): string {
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return environment.tenantSlug;
  }
  // Actualmente no tengo el dominio de nexocommerce.com asi que el dominio seria asi dashboard.paginadelcliente.com.ar
  // return hostname.split('.')[0];
  return hostname.split('.')[1];
}

/**
 * Returns the public store URL for the current tenant.
 * - If environment.storeUrl is set, use it.
 * - Otherwise, builds it from the tenant slug: https://{slug}.nexocommerce.com
 */
export function getStoreUrl(): string {
  if (environment.storeUrl) {
    return environment.storeUrl;
  }
  const slug = getTenantSlug();
  return `https://${slug}.nexocommerce.com`;
}
