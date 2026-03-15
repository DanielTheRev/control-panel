import { Component, computed, inject, input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { Router, RouterLink } from '@angular/router';
import { PaymentType } from '../../interfaces/paymentInfo.interface';
import { NotificationsService } from '../../services/notifications.service';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { PageLayout } from '../../shared/components/page-layout/page-layout';
import { StoreConfigStateService } from '../../states/store.config.state.service';
import { PaymentMethodsStateService } from '../../states/payment-methods.state.service'; // Assuming this exists or I should check.

@Component({
  selector: 'app-payment-methods-create',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatIconModule,
    RouterLink,
    PageLayout,
    PageHeader,
    MatSnackBarModule
  ],
  templateUrl: './payment-methods-create.html',
})
export class PaymentMethodsCreate implements OnInit {
  #fb = inject(FormBuilder);
  #router = inject(Router);
  #paymentMethodsState = inject(PaymentMethodsStateService);
  #NotificationService = inject(NotificationsService);
  #StoreConfig = inject(StoreConfigStateService)
  readonly paymentMethodID = input.required<string>();

  isEditMode = computed(() => this.paymentMethodID());
  paymentTypes = Object.values(PaymentType).filter(type => type !== PaymentType.CARD);
  readonly StoreConfig = this.#StoreConfig.StoreConfig;

  form: FormGroup = this.#fb.group({
    name: ['', Validators.required],
    type: ['', Validators.required],
    description: ['', Validators.required],
    isActive: [true]
  });

  ngOnInit() {
    const id = this.paymentMethodID();
    if (id) {
      this.loadMethod(id);
    }
  }

  async loadMethod(id: string) {
    try {
      const method = await this.#paymentMethodsState.getPaymentMethodByID(id);
      this.form.patchValue({
        name: method.name,
        type: method.type,
        description: method.description,
        isActive: method.isActive
      });
    } catch (error) {
      console.error('Error loading payment method', error);
      this.#NotificationService.error('Error al cargar el método de pago');
    }
  }

  async save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.value;

    if (this.isEditMode()) {
      try {
        await this.#paymentMethodsState.updatePaymentMethod(this.paymentMethodID()!, value)
        this.#NotificationService.info('Método de pago actualizado');
        this.#router.navigate(['/home/payment-methods']);
      } catch (error) {
        console.error('Error updating', error);
        this.#NotificationService.error('Error al actualizar');
      }
    } else {
      try {
        await this.#paymentMethodsState.addPaymentMethod(value)
        this.#NotificationService.success('Método de pago creado');
        this.#router.navigate(['/home/payment-methods']);
      } catch (error) {
        console.error('Error creating', error);
        this.#NotificationService.error('Error al crear');
      }
    }
  }
}
