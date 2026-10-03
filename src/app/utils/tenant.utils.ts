import { environment } from '../../environments/environment';

/**
 * Returns the tenant slug for the current session.
 * - localhost: reads from environment.tenantSlug
 * - production: extracts from subdomain (e.g. bellaisabella.vexx.com.ar → "bellaisabella")
 */
export function getTenantSlug(): string {
  if (typeof window === 'undefined') {
    return environment.tenantSlug || 'vura';
  }

  const hostname = window.location.hostname;

  // 1. Si está guardado en localStorage, usarlo
  try {
    const saved = localStorage.getItem('lastTenantSlug');
    if (saved && saved.trim()) {
      return saved.trim().toLowerCase();
    }
  } catch (e) {}

  // 2. Extraer subdominio si estamos en producción (ej: vura.vexx.com.ar -> "vura")
  if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1') {
    const parts = hostname.split('.');
    if (parts.length > 2 && parts[0] !== 'admin' && parts[0] !== 'panel' && parts[0] !== 'www' && parts[0] !== 'api') {
      return parts[0].toLowerCase();
    }
  }

  // 3. Environment o fallback por defecto 'vura'
  return environment.tenantSlug || 'vura';
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
