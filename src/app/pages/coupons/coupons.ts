import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { debounceTime, distinctUntilChanged, Subject, switchMap } from 'rxjs';
import { CouponService } from '../../services/coupon.service';
import { ProductService } from '../../services/product.service';
import { StoreConfigStateService } from '../../states/store.config.state.service';
import { DebugService } from '../../services/debug.service';
import { CreateCouponDTO, ICoupon, CouponPaymentMethodRestriction } from '../../interfaces/coupon.interface';

@Component({
  selector: 'app-coupons',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule, CurrencyPipe, DatePipe],
  templateUrl: './coupons.html'
})
export class CouponsComponent implements OnInit {
  #couponService = inject(CouponService);
  #productService = inject(ProductService);
  #configState = inject(StoreConfigStateService);
  #debug = inject(DebugService);
  #fb = inject(FormBuilder);

  coupons = signal<ICoupon[]>([]);
  isLoading = signal<boolean>(true);
  isSubmitting = signal<boolean>(false);
  showModal = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  firstPurchaseEnabled = signal<boolean>(true);
  firstPurchasePercentage = signal<number>(10);
  isUpdatingFirstPurchase = signal<boolean>(false);

  // Available categories from store configuration
  availableCategories = computed(() => this.#configState.StoreConfig().config?.categories || []);

  // Available product types (discriminators)
  availableProductTypes = [
    { id: 'TechProduct', label: 'Tecnología', icon: 'devices' },
    { id: 'ClothingProduct', label: 'Indumentaria & Calzado', icon: 'checkroom' },
    { id: 'BeautyProduct', label: 'Perfumería & Belleza', icon: 'spa' },
    { id: 'GeneralProduct', label: 'General / Kiosco & Bazar', icon: 'storefront' }
  ];

  // Selected scope items for the modal form
  selectedProductTypes = signal<string[]>([]);
  selectedCategories = signal<string[]>([]);
  selectedProducts = signal<any[]>([]);

  // Product autocomplete search
  productSearchQuery = new Subject<string>();
  productSuggestions = signal<any[]>([]);
  isSearchingProducts = signal<boolean>(false);

  form: FormGroup = this.#fb.group({
    code: ['', [Validators.required, Validators.minLength(3)]],
    discountType: ['percentage', [Validators.required]],
    discountValue: [10, [Validators.required, Validators.min(1)]],
    minOrderAmount: [0, [Validators.min(0)]],
    maxUses: [null],
    isFirstPurchaseOnly: [false],
    paymentMethodRestriction: ['ALL', [Validators.required]],
    assignedUserEmail: [''],
    expiresAt: [null]
  });

  ngOnInit(): void {
    this.loadCoupons();
    this.loadFirstPurchaseConfig();
    this.#setupProductSearch();
  }

  #setupProductSearch(): void {
    this.productSearchQuery.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((query) => {
        if (!query || query.trim().length < 2) {
          this.isSearchingProducts.set(false);
          this.productSuggestions.set([]);
          return [];
        }
        this.isSearchingProducts.set(true);
        return this.#productService.getSuggestions(query);
      })
    ).subscribe({
      next: (results) => {
        this.productSuggestions.set(results || []);
        this.isSearchingProducts.set(false);
      },
      error: () => {
        this.isSearchingProducts.set(false);
        this.productSuggestions.set([]);
      }
    });
  }

  onProductSearchInput(event: Event): void {
    const query = (event.target as HTMLInputElement).value;
    this.productSearchQuery.next(query);
  }

  toggleProductType(typeId: string): void {
    this.selectedProductTypes.update((types) =>
      types.includes(typeId) ? types.filter((t) => t !== typeId) : [...types, typeId]
    );
  }

  toggleCategory(catName: string): void {
    this.selectedCategories.update((cats) =>
      cats.includes(catName) ? cats.filter((c) => c !== catName) : [...cats, catName]
    );
  }

  addProduct(product: any): void {
    if (!this.selectedProducts().some((p) => (p._id || p.id) === (product._id || product.id))) {
      this.selectedProducts.update((list) => [...list, product]);
    }
    this.productSuggestions.set([]);
  }

  removeProduct(productId: string): void {
    this.selectedProducts.update((list) => list.filter((p) => (p._id || p.id) !== productId));
  }

  loadCoupons(): void {
    this.isLoading.set(true);
    this.#couponService.getCoupons().subscribe({
      next: (data) => {
        this.coupons.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.#debug.error('Error cargando cupones', err);
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
      error: (err) => this.#debug.error('Error cargando config de primera compra', err)
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
        this.#debug.error('Error actualizando config de primera compra', err);
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
        this.#debug.error('Error actualizando porcentaje de primera compra', err);
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
      paymentMethodRestriction: 'ALL',
      assignedUserEmail: '',
      expiresAt: null
    });
    this.selectedProductTypes.set([]);
    this.selectedCategories.set([]);
    this.selectedProducts.set([]);
    this.productSuggestions.set([]);
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
      paymentMethodRestriction: val.paymentMethodRestriction as CouponPaymentMethodRestriction,
      applicableProductTypes: this.selectedProductTypes().length > 0 ? this.selectedProductTypes() : undefined,
      applicableCategories: this.selectedCategories().length > 0 ? this.selectedCategories() : undefined,
      applicableProducts: this.selectedProducts().length > 0 ? this.selectedProducts().map(p => p._id || p.id) : undefined,
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
      error: (err) => this.#debug.error('Error al cambiar estado del cupón', err)
    });
  }

  deleteCoupon(coupon: ICoupon): void {
    if (!confirm(`¿Estás seguro de eliminar el cupón ${coupon.code}?`)) return;

    this.#couponService.deleteCoupon(coupon._id).subscribe({
      next: () => {
        this.coupons.update(list => list.filter(c => c._id !== coupon._id));
      },
      error: (err) => this.#debug.error('Error al eliminar el cupón', err)
    });
  }
}
