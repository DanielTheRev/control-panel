import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ShippingType } from '../../interfaces/shipping.interface';
import { ShippingOptionsService } from '../../services/shipping-options.service';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { PageLayout } from '../../shared/components/page-layout/page-layout';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ShippingOptionsStateService } from '../../states/shipping-options.state.service';
import { SidebarService } from '../../services/sidebar.service';

import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-shipping-options-create',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    RouterLink,
    PageLayout,
    PageHeader,
    MatSnackBarModule
  ],
  templateUrl: './shipping-options-create.html',
})
export class ShippingOptionsCreate implements OnInit {
  #fb = inject(FormBuilder);
  #router = inject(Router);
  #shippingState = inject(ShippingOptionsStateService);
  #snackBar = inject(MatSnackBar);
  #SidebarService = inject(SidebarService)

  shippingOptionID = input.required<string>();
  isEditMode = computed(() => this.shippingOptionID());
  shippingTypes = Object.values(ShippingType);

  form: FormGroup = this.#fb.group({
    type: [ShippingType.HOME_DELIVERY, Validators.required],
    name: ['', Validators.required],
    cost: [0, [Validators.required, Validators.min(0)]],
    carrier: [''],
    estimatedDelivery: [''],
    instructions: [''],
    isActive: [true, [Validators.required]],
    isDefaultForCash: [false],
    pickupPoints: this.#fb.array([])
  });

  get pickupPointsControls() {
    return this.form.get('pickupPoints') as FormArray;
  }

  get showPickupPoints(): boolean {
    const type = this.form.get('type')?.value;
    return type === ShippingType.PICKUP || type === ShippingType.STORE_PICKUP || type === ShippingType.BRANCH_PICKUP;
  }

  constructor() {
    this.#SidebarService.navbarTitle.set({
      title: 'Gestionar método de envío'
    });
  }

  ngOnInit() {
    const id = this.shippingOptionID();
    if (id) {
      this.loadOption(id);
    }
  }

  selectShippingType(type: ShippingType) {
    this.form.patchValue({ type });
    this.form.markAsDirty();
  }

  async loadOption(id: string) {
    const option = await this.#shippingState.getShippingOptionByID(id);
    this.form.patchValue({
      type: option.type,
      name: option.name,
      cost: option.cost,
      carrier: option.carrier || '',
      estimatedDelivery: option.estimatedDelivery || '',
      instructions: option.instructions || '',
      isActive: option.isActive,
      isDefaultForCash: option.isDefaultForCash
    });

    if (option.pickupPoints && Array.isArray(option.pickupPoints)) {
      option.pickupPoints.forEach(point => {
        this.addPickupPoint(point.name, point.address);
      });
    }
  }

  addPickupPoint(name: string = '', address: string = '') {
    this.pickupPointsControls.push(this.#fb.group({
      name: [name, Validators.required],
      address: [address, Validators.required]
    }));
  }

  removePickupPoint(index: number) {
    this.pickupPointsControls.removeAt(index);
  }

  async save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.value;

    // Clear pickupPoints if not a pickup-oriented method
    if (!this.showPickupPoints) {
      value.pickupPoints = [];
    }

    if (this.isEditMode()) {
      try {
        await this.#shippingState.updateShippingOption(this.shippingOptionID(), value);
        this.#snackBar.open('Opción de envío actualizada', 'Cerrar', { duration: 3000 });
        this.#router.navigate(['/home/shipping-options']);
      } catch (error) {
        this.#snackBar.open('Error al actualizar la opción de envío', 'Cerrar', { duration: 3000 });
      }

    } else {
      try {
        await this.#shippingState.addShippingOption(value);
        this.#snackBar.open('Opción de envío creada', 'Cerrar', { duration: 3000 });
        this.#router.navigate(['/home/shipping-options']);
      } catch (error) {
        this.#snackBar.open('Error al crear la opción de envío', 'Cerrar', { duration: 3000 });
      }
    }
  }
}
