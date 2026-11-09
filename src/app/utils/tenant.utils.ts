import { environment } from '../../environments/environment';

/**
 * Returns the tenant slug for the current session.
 * - localhost: reads from environment.tenantSlug or localStorage
 * - production: extracts from subdomain (e.g. bellaisabella.vexx.com.ar -> "bellaisabella")
 */
export function getTenantSlug(): string {
  if (typeof window === 'undefined') {
    return environment.tenantSlug || '';
  }

  const hostname = window.location.hostname;

  // 1. Si está guardado en localStorage, usarlo
  try {
    const saved = localStorage.getItem('lastTenantSlug');
    if (saved && saved.trim()) {
      return saved.trim().toLowerCase();
    }
  } catch (e) {}

  // 2. Extraer subdominio si estamos en producción (ej: mitienda.vexx.com.ar -> "mitienda")
  if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1') {
    const parts = hostname.split('.');
    if (parts.length > 2 && parts[0] !== 'admin' && parts[0] !== 'panel' && parts[0] !== 'www' && parts[0] !== 'api') {
      return parts[0].toLowerCase();
    }
  }

  // 3. Environment configurado o vacío
  return environment.tenantSlug || '';
}

/**
 * Returns the public store URL for the current tenant.
 * - If environment.storeUrl is set, use it.
 * - Otherwise, builds it from the tenant slug: https://{slug}.vexx.com.ar
 */
export function getStoreUrl(): string {
  if (!environment.production) {
    return 'http://localhost:4200';
  }
  const slug = getTenantSlug();
  return slug ? `https://${slug}.vexx.com.ar` : 'https://vexx.com.ar';
}
