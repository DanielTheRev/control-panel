import { Routes } from '@angular/router';
import { capabilityGuard } from '../guards/capability.guard';

/**
 * Rutas operativas de mostrador, punto de venta y caja registradora.
 * Protegidas dinámicamente según capabilities del bootstrap.
 */
export const kioskRoutes: Routes = [
  {
    path: 'pos',
    title: 'Punto de Venta / Mostrador',
    canActivate: [capabilityGuard('showPOS')],
    loadComponent: () => import('../pages/pos/pos').then(c => c.PosComponent)
  },
  {
    path: 'cash-register',
    title: 'Caja Registradora & Turnos',
    canActivate: [capabilityGuard('showCashRegister')],
    loadComponent: () => import('../pages/cash-register/cash-register').then(c => c.CashRegisterComponent)
  },
];
