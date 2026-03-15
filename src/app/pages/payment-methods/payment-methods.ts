import { Component, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';
import { NotificationsService } from '../../services/notifications.service';
import { PaymentMethodsService } from '../../services/payment-methods.service';
import { SidebarService } from '../../services/sidebar.service';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { PageLayout } from '../../shared/components/page-layout/page-layout';
import { StoreConfigStateService } from '../../states/store.config.state.service';
import { PaymentMethodsStateService } from '../../states/payment-methods.state.service';

@Component({
  selector: 'app-payment-methods',
  standalone: true,
  imports: [
    PageLayout,
    PageHeader,
    MatIconModule,
    MatTableModule,
    MatMenuModule,
    RouterLink,
    MatSnackBarModule
  ],
  templateUrl: './payment-methods.html',
})
export class PaymentMethods {
  readonly #paymentMethodsState = inject(PaymentMethodsStateService);
  readonly #paymentMethodsService = inject(PaymentMethodsService);
  readonly #SidebarService = inject(SidebarService);
  readonly #NotificationService = inject(NotificationsService);
  readonly #StoreConfig = inject(StoreConfigStateService);

  readonly state = this.#paymentMethodsState.state;
  readonly activeTab = signal<'manual' | 'mercadopago'>('manual');

  displayedColumns: string[] = ['name', 'status', 'description', 'actions'];
  constructor() {
    this.#SidebarService.navbarTitle.set({
      title: 'Métodos de pago'
    });
  }

  async toggleMPActive(active: boolean) {
    try {
      const config = this.state().automaticGateways.mercadopago;
      await this.#paymentMethodsState.updateMPConfig({
        paymentGateways: {
          mercadopago: {
            ...config,
            active
          }
        }
      });
      this.#NotificationService.success(`Mercado Pago ${active ? 'activado' : 'desactivado'}`);
    } catch (err) {
      this.#NotificationService.error('Error al actualizar Mercado Pago');
    }
  }

  async toggleMethodExclusion(methodId: string, isCurrentlyExcluded: boolean) {
    try {
      const config = this.state().automaticGateways.mercadopago;
      let excludedPaymentMethods = [...config.excludedPaymentMethods];

      if (isCurrentlyExcluded) {
        excludedPaymentMethods = excludedPaymentMethods.filter(id => id !== methodId);
      } else {
        excludedPaymentMethods.push(methodId);
      }

      await this.#paymentMethodsState.updateMPConfig({
        paymentGateways: {
          mercadopago: {
            ...config,
            excludedPaymentMethods
          }
        }
      });
      this.#NotificationService.info('Preferencia de pago actualizada');
    } catch (err) {
      this.#NotificationService.error('Error al actualizar preferencia');
    }
  }

  async toggleTypeExclusion(type: string, isCurrentlyExcluded: boolean) {
    try {
      const config = this.state().automaticGateways.mercadopago;
      let excludedPaymentTypes = [...config.excludedPaymentTypes];

      if (isCurrentlyExcluded) {
        excludedPaymentTypes = excludedPaymentTypes.filter(t => t !== type);
      } else {
        excludedPaymentTypes.push(type);
      } 
      console.log(config);
      console.log(excludedPaymentTypes);
      await this.#paymentMethodsState.updateMPConfig({
        paymentGateways: {
          mercadopago: {
            ...config,
            excludedPaymentTypes
          }
        }
      });
      this.#NotificationService.info('Tipo de pago actualizado');
    } catch (err) {
      this.#NotificationService.error('Error al actualizar tipo');
    }
  }

  async delete(id: string) {
    if (confirm('¿Estás seguro de eliminar este método de pago?')) {
      try {
        await this.#paymentMethodsState.deletePaymentMethod(id);
        this.#NotificationService.success('Método de pago eliminado');
      } catch (err) {
        console.error('Error deleting', err);
        this.#NotificationService.error('Error al eliminar');
      }
    }
  }
}
