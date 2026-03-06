import { Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { PageLayout } from '../../shared/components/page-layout/page-layout';
import { PaymentMethodsStateService } from '../../states/payment-methods.state.service';
import { PaymentMethodsService } from '../../services/payment-methods.service';
import { SidebarService } from '../../services/sidebar.service';

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
  readonly #snackBar = inject(MatSnackBar);
  readonly #SidebarService = inject(SidebarService);

  readonly state = this.#paymentMethodsState.state;

  displayedColumns: string[] = ['name', 'status', 'description', 'actions'];
  constructor() {
    this.#SidebarService.navbarTitle.set({
      title: 'Métodos de pago'
    });
  }

  async delete(id: string) {
    if (confirm('¿Estás seguro de eliminar este método de pago?')) {
      try {
        await this.#paymentMethodsService.delete(id);
        this.#paymentMethodsState.deletePaymentMethod(id);
        this.#snackBar.open('Método de pago eliminado', 'Cerrar', { duration: 3000 });
      } catch (err) {
        console.error('Error deleting', err);
        this.#snackBar.open('Error al eliminar', 'Cerrar', { duration: 3000 });
      }
    }
  }
}
