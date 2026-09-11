import { CommonModule } from '@angular/common';
import {
  Component,
  inject,
  input,
  OnInit,
  signal,
} from '@angular/core';
import { ProductType } from '../../interfaces/product.interface';
import { ProductStoreService } from '../../states/product.state.service';
import { ProductCreate } from '../product-create/product-create';
import { TechProductCreate } from './tech-product-create/tech-product-create';
import { KioscoProductCreate } from './kiosco-product-create/kiosco-product-create';
import { BeautyProductCreate } from './beauty-product-create/beauty-product-create';

@Component({
  selector: 'app-product-form-dispatcher',
  standalone: true,
  host: {
    class: 'flex flex-col w-full',
  },
  imports: [
    CommonModule,
    ProductCreate,
    TechProductCreate,
    KioscoProductCreate,
    BeautyProductCreate,
  ],
  template: `
    @if (isLoading()) {
      <div class="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <span class="loading loading-spinner loading-lg text-primary"></span>
        <span class="text-xs text-muted-foreground font-semibold">Cargando formulario de producto...</span>
      </div>
    } @else {
      @switch (resolvedType()) {
        @case (ProductType.TECH) {
          <app-tech-product-create [productID]="productID()" />
        }
        @case (ProductType.GENERAL) {
          <app-kiosco-product-create [productID]="productID()" />
        }
        @case (ProductType.BEAUTY) {
          <app-beauty-product-create [productID]="productID()" />
        }
        @default {
          <app-product-create [productID]="productID()!" [typeParam]="typeParam() || ''" />
        }
      }
    }
  `,
})
export class ProductFormDispatcher implements OnInit {
  productID = input<string | null>(null);
  typeParam = input<string | null>(null);

  resolvedType = signal<ProductType | string>(ProductType.CLOTHING);
  isLoading = signal<boolean>(false);

  private productState = inject(ProductStoreService);
  ProductType = ProductType;

  async ngOnInit() {
    const type = this.typeParam();
    const id = this.productID();

    if (type) {
      this.resolvedType.set(this.normalizeType(type));
      return;
    }

    if (id) {
      this.isLoading.set(true);
      try {
        const product = await this.productState.getProduct(id);
        if (product?.productType) {
          this.resolvedType.set(this.normalizeType(product.productType));
        }
      } catch {
        // Fallback a Clothing si no se pudo determinar
        this.resolvedType.set(ProductType.CLOTHING);
      } finally {
        this.isLoading.set(false);
      }
    }
  }

  private normalizeType(type: string): ProductType {
    const t = type.toLowerCase();
    if (t.includes('tech')) return ProductType.TECH;
    if (t.includes('general') || t.includes('kiosco')) return ProductType.GENERAL;
    if (t.includes('beauty') || t.includes('perfum')) return ProductType.BEAUTY;
    return ProductType.CLOTHING;
  }
}
