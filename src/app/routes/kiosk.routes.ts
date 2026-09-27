import { Routes } from '@angular/router';

/**
 * Rutas operativas de mostrador, punto de venta y caja registradora.
 * Accesibles para Kiosco, Almacén, Carnicería, Panadería y también disponibles para moda/general.
 */
export const kioskRoutes: Routes = [
  {
    path: 'pos',
    title: 'Punto de Venta / Mostrador',
    loadComponent: () => import('../pages/pos/pos').then(c => c.PosComponent)
  },
  {
    path: 'cash-register',
    title: 'Caja Registradora & Turnos',
    loadComponent: () => import('../pages/cash-register/cash-register').then(c => c.CashRegisterComponent)
  },
];
