import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { CouponService } from '../../services/coupon.service';
import { CreateCouponDTO, ICoupon } from '../../interfaces/coupon.interface';

@Component({
  selector: 'app-coupons',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule, CurrencyPipe, DatePipe],
  templateUrl: './coupons.html'
})
export class CouponsComponent implements OnInit {
  #couponService = inject(CouponService);
  #fb = inject(FormBuilder);

  coupons = signal<ICoupon[]>([]);
  isLoading = signal<boolean>(true);
  isSubmitting = signal<boolean>(false);
  showModal = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  firstPurchaseEnabled = signal<boolean>(true);
  firstPurchasePercentage = signal<number>(10);
  isUpdatingFirstPurchase = signal<boolean>(false);

  form: FormGroup = this.#fb.group({
    code: ['', [Validators.required, Validators.minLength(3)]],
    discountType: ['percentage', [Validators.required]],
    discountValue: [10, [Validators.required, Validators.min(1)]],
    minOrderAmount: [0, [Validators.min(0)]],
    maxUses: [null],
    isFirstPurchaseOnly: [false],
    assignedUserEmail: [''],
    expiresAt: [null]
  });

  ngOnInit(): void {
    this.loadCoupons();
    this.loadFirstPurchaseConfig();
  }

  loadCoupons(): void {
    this.isLoading.set(true);
    this.#couponService.getCoupons().subscribe({
      next: (data) => {
        this.coupons.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error cargando cupones', err);
        this.isLoading.set(false);
      }
    });
  }

  loadFirstPurchaseConfig(): void {
    this.#couponService.getFirstPurchaseConfig().subscribe({
      next: (config) => {
        this.firstPurchaseEnabled.set(config.enabled);
        this.firstPurchasePercentage.set(config.percentage || 10);
      },
      error: (err) => console.error('Error cargando config de primera compra', err)
    });
  }

  toggleFirstPurchaseDiscount(): void {
    const nextState = !this.firstPurchaseEnabled();
    this.isUpdatingFirstPurchase.set(true);

    this.#couponService.updateFirstPurchaseConfig(nextState, this.firstPurchasePercentage()).subscribe({
      next: (updated) => {
        this.firstPurchaseEnabled.set(updated.enabled);
        this.firstPurchasePercentage.set(updated.percentage);
        this.isUpdatingFirstPurchase.set(false);
      },
      error: (err) => {
        console.error('Error actualizando config de primera compra', err);
        this.isUpdatingFirstPurchase.set(false);
      }
    });
  }

  updateFirstPurchasePercentage(event: Event): void {
    const val = Number((event.target as HTMLInputElement).value);
    if (!val || val <= 0) return;

    this.isUpdatingFirstPurchase.set(true);
    this.#couponService.updateFirstPurchaseConfig(this.firstPurchaseEnabled(), val).subscribe({
      next: (updated) => {
        this.firstPurchaseEnabled.set(updated.enabled);
        this.firstPurchasePercentage.set(updated.percentage);
        this.isUpdatingFirstPurchase.set(false);
      },
      error: (err) => {
        console.error('Error actualizando porcentaje de primera compra', err);
        this.isUpdatingFirstPurchase.set(false);
      }
    });
  }

  openCreateModal(): void {
    this.form.reset({
      code: '',
      discountType: 'percentage',
      discountValue: 10,
      minOrderAmount: 0,
      maxUses: null,
      isFirstPurchaseOnly: false,
      assignedUserEmail: '',
      expiresAt: null
    });
    this.errorMessage.set(null);
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  submitForm(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const val = this.form.value;
    const dto: CreateCouponDTO = {
      code: (val.code || '').trim().toUpperCase(),
      discountType: val.discountType,
      discountValue: Number(val.discountValue),
      minOrderAmount: val.minOrderAmount ? Number(val.minOrderAmount) : 0,
      maxUses: val.maxUses ? Number(val.maxUses) : undefined,
      isFirstPurchaseOnly: !!val.isFirstPurchaseOnly,
      assignedUserEmail: val.assignedUserEmail ? val.assignedUserEmail.trim().toLowerCase() : undefined,
      expiresAt: val.expiresAt ? new Date(val.expiresAt).toISOString() : null
    };

    this.#couponService.createCoupon(dto).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeModal();
        this.loadCoupons();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.message || 'Error al crear el cupón de descuento.');
      }
    });
  }

  toggleCouponStatus(coupon: ICoupon): void {
    this.#couponService.toggleCoupon(coupon._id).subscribe({
      next: (updated) => {
        this.coupons.update(list => list.map(c => c._id === updated._id ? updated : c));
      },
      error: (err) => console.error('Error al cambiar estado del cupón', err)
    });
  }

  deleteCoupon(coupon: ICoupon): void {
    if (!confirm(`¿Estás seguro de eliminar el cupón ${coupon.code}?`)) return;

    this.#couponService.deleteCoupon(coupon._id).subscribe({
      next: () => {
        this.coupons.update(list => list.filter(c => c._id !== coupon._id));
      },
      error: (err) => console.error('Error al eliminar el cupón', err)
    });
  }
}
