import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ShippingType } from '../../interfaces/shipping.interface';
import { ShippingOptionsService } from '../../services/shipping-options.service';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { PageLayout } from '../../shared/components/page-layout/page-layout';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ShippingOptionsStateService } from '../../states/shipping-options.state.service';

@Component({
  selector: 'app-shipping-options-create',
  standalone: true,
  imports: [
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
  #route = inject(ActivatedRoute);
  #shippingService = inject(ShippingOptionsService);
  #shippingState = inject(ShippingOptionsStateService);
  #snackBar = inject(MatSnackBar);

  optionId = signal<string | null>(null);
  isEditMode = computed(() => this.optionId() !== null);
  shippingTypes = Object.values(ShippingType);

  form: FormGroup = this.#fb.group({
    type: ['', Validators.required],
    name: ['', Validators.required],
    cost: [0, [Validators.required, Validators.min(0)]],
    isActive: [true, [Validators.required]],
    isDefaultForCash: [false],
    pickupPoints: this.#fb.array([])
  });

  get pickupPointsControls() {
    return this.form.get('pickupPoints') as FormArray;
  }

  ngOnInit() {
    this.#route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.optionId.set(id);
        this.loadOption(id);
      }
    });

    // Listen to type changes to handle pickupPoints validation/clearing if needed
    // For now, we only show pickup points if type is PICKUP in the template
  }

  loadOption(id: string) {
    this.#shippingService.getById(id).subscribe({
      next: (option) => {
        this.form.patchValue({
          type: option.type,
          name: option.name,
          cost: option.cost,
          isActive: option.isActive,
          isDefaultForCash: option.isDefaultForCash
        });

        if (option.pickupPoints && Array.isArray(option.pickupPoints)) {
          option.pickupPoints.forEach(point => {
            this.addPickupPoint(point.name, point.address);
          });
        }
      },
      error: (err) => console.error('Error loading shipping option', err)
    });
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

    // If not pickup, clear pickupPoints just in case
    if (value.type !== ShippingType.PICKUP) {
      value.pickupPoints = [];
    }

    if (this.isEditMode()) {
      try {
        await this.#shippingState.updateShippingOption(this.optionId()!, value);
        this.#snackBar.open('Opción de envío actualizada', 'Cerrar', { duration: 3000 });
        this.#router.navigate(['/home/shipping-options']);
      } catch (error) {
        console.error('Error updating', error);
        this.#snackBar.open('Error al actualizar la opción de envío', 'Cerrar', { duration: 3000 });
      }

    } else {
      try {
        await this.#shippingState.addShippingOption(value);
        this.#snackBar.open('Opción de envío creada', 'Cerrar', { duration: 3000 });
        this.#router.navigate(['/home/shipping-options']);
      } catch (error) {
        console.error('Error creating', error);
        this.#snackBar.open('Error al crear la opción de envío', 'Cerrar', { duration: 3000 });
      }
    }
  }
}
