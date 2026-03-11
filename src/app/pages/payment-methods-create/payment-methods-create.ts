import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { IPaymentMethod, PaymentType } from '../../interfaces/paymentInfo.interface';
import { PaymentMethodsService } from '../../services/payment-methods.service';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { PageLayout } from '../../shared/components/page-layout/page-layout';
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
  #snackBar = inject(MatSnackBar);
  readonly paymentMethodID = input.required<string>();

  isEditMode = computed(() => this.paymentMethodID());
  paymentTypes = Object.values(PaymentType);

  form: FormGroup = this.#fb.group({
    name: ['', Validators.required],
    type: ['', Validators.required],
    description: [''],
    processingFee: [0, [Validators.min(0)]],
    isActive: [true]
  });

  ngOnInit() {
    const id = this.paymentMethodID();
    if (id) {
      console.log(id);
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
        processingFee: method.processingFee || 0,
        isActive: method.isActive
      });
    } catch (error) {
      console.error('Error loading payment method', error);
      this.#snackBar.open('Error al cargar el método de pago', 'Cerrar', { duration: 3000 });
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
        this.#snackBar.open('Método de pago actualizado', 'Cerrar', { duration: 3000 });
        this.#router.navigate(['/home/payment-methods']);
      } catch (error) {
        console.error('Error updating', error);
        this.#snackBar.open('Error al actualizar', 'Cerrar', { duration: 3000 });
      }
    } else {
      try {
        await this.#paymentMethodsState.addPaymentMethod(value)
        this.#snackBar.open('Método de pago creado', 'Cerrar', { duration: 3000 });
        this.#router.navigate(['/home/payment-methods']);
      } catch (error) {
        console.error('Error creating', error);
        this.#snackBar.open('Error al crear', 'Cerrar', { duration: 3000 });
      }
    }
  }
}
