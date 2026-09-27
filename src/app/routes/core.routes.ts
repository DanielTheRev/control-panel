import { Routes } from '@angular/router';
import { AuthGuard } from '../guards/auth.guard';
import { unsavedChangesGuard } from '../guards/unsaved-changes.guard';
import { ClientOrders } from '../pages/client-orders/client-orders';
import { PaymentMethods } from '../pages/payment-methods/payment-methods';
import { ProductList } from '../pages/product-list/product-list';
import { ProductTypeSelector } from '../shared/components/product-type-selector/product-type-selector';
import { ProductFormDispatcher } from '../pages/product-forms/product-form-dispatcher';

/**
 * Rutas universales del núcleo administrativo:
 * Ventas, Stock, Categorías, Métricas, Clientes, Proveedores, Fiscal ARCA, Configuración y Empleados.
 */
export const coreRoutes: Routes = [
  {
    path: 'client-orders',
    children: [
      {
        path: '',
        component: ClientOrders,
      },
      {
        path: ':id',
        loadComponent: () => import('../pages/client-orders/order-details/order-details').then(c => c.OrderDetails)
      }
    ]
  },
  {
    path: 'products',
    children: [
      {
        path: '',
        pathMatch: 'full',
        component: ProductList,
      },
      {
        path: 'create',
        component: ProductTypeSelector,
      },
      {
        path: 'create/:typeParam',
        component: ProductFormDispatcher,
      },
      {
        path: 'edit/:productID',
        component: ProductFormDispatcher,
      },
      {
        path: ':productID',
        loadComponent: () => import('../pages/product-detail/product-detail').then(c => c.ProductDetail)
      },
    ]
  },
  {
    path: 'categories',
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('../pages/category-group-list/category-group-list').then(c => c.CategoryGroupListComponent)
      },
      {
        path: 'create',
        loadComponent: () => import('../pages/category-group-editor/category-group-editor').then(c => c.CategoryGroupEditorComponent)
      },
      {
        path: 'edit/:id',
        loadComponent: () => import('../pages/category-group-editor/category-group-editor').then(c => c.CategoryGroupEditorComponent)
      }
    ]
  },
  {
    path: 'payment-methods',
    children: [
      {
        path: '',
        pathMatch: 'full',
        component: PaymentMethods
      },
      {
        path: 'create',
        loadComponent: () => import('../pages/payment-methods-create/payment-methods-create').then(c => c.PaymentMethodsCreate)
      },
      {
        path: 'edit/:paymentMethodID',
        loadComponent: () => import('../pages/payment-methods-create/payment-methods-create').then(c => c.PaymentMethodsCreate)
      }
    ]
  },
  {
    path: 'settings',
    canDeactivate: [unsavedChangesGuard],
    loadComponent: () => import('../pages/store-settings/store-settings').then(c => c.StoreSettings)
  },
  {
    path: 'staff',
    title: 'Equipo & Empleados',
    canActivate: [AuthGuard],
    loadComponent: () => import('../pages/staff/staff').then(c => c.StaffComponent)
  },
  {
    path: 'daily-reports',
    title: 'Resumen del Día',
    loadComponent: () => import('../pages/daily-reports/daily-reports').then(c => c.DailyReportsComponent)
  },
  {
    path: 'providers',
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('../pages/provider-list/provider-list').then(c => c.ProviderList)
      },
      {
        path: 'create',
        loadComponent: () => import('../pages/provider-create/provider-create').then(c => c.ProviderCreate)
      },
      {
        path: 'edit/:providerID',
        loadComponent: () => import('../pages/provider-create/provider-create').then(c => c.ProviderCreate)
      }
    ]
  },
  {
    path: 'clients',
    title: 'Clientes',
    loadComponent: () => import('../pages/clients/clients').then(c => c.ClientsComponent)
  },
  {
    path: 'sales',
    title: 'Ventas',
    loadComponent: () => import('../pages/sales/sales').then(c => c.SalesComponent)
  },
  {
    path: 'fiscal',
    title: 'ARCA & Finanzas Fiscales',
    loadComponent: () => import('../pages/fiscal-dashboard/fiscal-dashboard').then(c => c.FiscalDashboardComponent)
  },
];
