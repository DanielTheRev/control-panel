import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { ProductType } from '../../interfaces/product.interface';
import {
  PRODUCT_TYPE_TO_ROUTE_SLUG,
  resolveProductTypeFromRouteParam,
} from '../../interfaces/business-vertical.interface';
import { ProductService } from '../../services/product.service';
import { BusinessProfileService } from '../../services/business-profile.service';
import { ProductCreate } from '../product-create/product-create';
import { TechProductCreate } from './tech-product-create/tech-product-create';
import { KioscoProductCreate } from './kiosco-product-create/kiosco-product-create';
import { BeautyProductCreate } from './beauty-product-create/beauty-product-create';
import { ProductTypeSelector } from '../../shared/components/product-type-selector/product-type-selector';

@Component({
  selector: 'app-product-form-dispatcher',
  standalone: true,
  host: {
    class: 'flex flex-col flex-1 w-full h-full min-h-0',
  },
  imports: [
    ProductCreate,
    TechProductCreate,
    KioscoProductCreate,
    BeautyProductCreate,
    ProductTypeSelector,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isLoadingType()) {
      <div class="flex flex-col items-center justify-center min-h-[70vh] gap-3 bg-base-100">
        <span class="loading loading-spinner loading-lg text-primary"></span>
        <p class="text-xs font-bold uppercase tracking-widest text-base-content/50">
          Preparando entorno de catálogo...
        </p>
      </div>
    } @else if (showSelector()) {
      <app-product-type-selector />
    } @else {
      @switch (resolvedType()) {
        @case (ProductType.TECH) {
          <app-tech-product-create [productID]="routeProductId()" />
        }
        @case (ProductType.KIOSK) {
          <app-kiosco-product-create [productID]="routeProductId()" />
        }
        @case (ProductType.BEAUTY) {
          <app-beauty-product-create [productID]="routeProductId()" />
        }
        @default {
          <app-product-create [productID]="routeProductId()" />
        }
      }
    }
  `,
})
export class ProductFormDispatcher implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly productService = inject(ProductService);
  private readonly businessProfile = inject(BusinessProfileService);

  readonly ProductType = ProductType;

  private readonly routeTypeParam = toSignal(
    this.route.paramMap.pipe(map((p) => p.get('typeParam'))),
    { initialValue: null },
  );
  readonly routeProductId = toSignal(
    this.route.paramMap.pipe(map((p) => p.get('productID') ?? p.get('id'))),
    { initialValue: null },
  );
  private readonly querySelect = toSignal(
    this.route.queryParamMap.pipe(map((q) => q.get('select'))),
    { initialValue: null },
  );

  readonly isLoadingType = signal<boolean>(false);
  readonly fetchedEditType = signal<ProductType | null>(null);

  /**
   * Muestra el selector de plantillas cuando el usuario hace clic en "Cambiar plantilla" (?select=true)
   */
  readonly showSelector = computed<boolean>(() => {
    const id = this.routeProductId();
    if (id) return false;
    return this.querySelect() === 'true';
  });

  readonly resolvedType = computed<ProductType>(() => {
    // 1. Si viene por URL (/home/products/create/kiosco, /indumentaria, /tecnologia, /perfumeria)
    const param = this.routeTypeParam();
    const mapped = resolveProductTypeFromRouteParam(param);
    if (mapped) {
      return mapped;
    }

    // 2. Si es edición y ya resolvimos el tipo desde el backend
    const edited = this.fetchedEditType();
    if (edited) {
      return edited;
    }

    // 3. Fallback determinista según la vertical comercial configurada de la tienda
    return this.businessProfile.primaryProductType();
  });

  constructor() {
    // Si alguien navega a una URL legacy con discriminador de Mongoose (ej: /home/products/create/GeneralProduct)
    // o entra a /home/products/create sin slug (y sin ?select=true), normalizamos la URL al slug limpio (ej: /home/products/create/kiosco)
    effect(() => {
      const id = this.routeProductId();
      const select = this.querySelect();
      if (id || select === 'true') return;

      const param = this.routeTypeParam();
      const resolved = this.resolvedType();
      const canonicalSlug = PRODUCT_TYPE_TO_ROUTE_SLUG[resolved] ?? 'kiosco';

      if (!param || param === 'undefined' || param !== canonicalSlug) {
        this.router.navigate(['/home/products/create', canonicalSlug], {
          replaceUrl: true,
        });
      }
    });
  }

  ngOnInit(): void {
    const id = this.routeProductId();
    const param = this.routeTypeParam();

    if (id && !param) {
      this.isLoadingType.set(true);
      this.productService
        .getProduct(id)
        .then((product) => {
          const type = product?.productType as ProductType | undefined;
          this.fetchedEditType.set(
            resolveProductTypeFromRouteParam(type) ?? this.businessProfile.primaryProductType(),
          );
          this.isLoadingType.set(false);
        })
        .catch(() => {
          this.fetchedEditType.set(this.businessProfile.primaryProductType());
          this.isLoadingType.set(false);
        });
    }
  }
}
