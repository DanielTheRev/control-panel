import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  inject,
  signal,
  computed,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  FormsModule,
} from '@angular/forms';
import { StoreConfigStateService } from '../../../states/store.config.state.service';
import { ProductStoreService } from '../../../states/product.state.service';
import { MatDialog } from '@angular/material/dialog';
import { AddBrandCategory } from '../../../share/components/add-brand-category/add-brand-category';
import { MatIcon } from '@angular/material/icon';
import { IProduct } from '../../../interfaces/product.interface';

export interface ClothingFormValue {
  gender: string;
  fit: string;
  material: string;
  sizeType: string;
  season: string;
  combineWith: string[];
}

@Component({
  selector: 'app-clothing-product-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, MatIcon],
  templateUrl: './clothing-product-form.html',
})
export class ClothingProductForm implements OnInit, OnChanges {
  /** Pre-load values when editing an existing product */
  value = input<Partial<ClothingFormValue> | null>(null);
  currentProductId = input<string | null>(null);

  @Output() formChange = new EventEmitter<ClothingFormValue>();

  clothingForm: FormGroup;
  configState = inject(StoreConfigStateService);
  productStore = inject(ProductStoreService);
  #dialog = inject(MatDialog);

  readonly genderOptions: string[] = ['Hombre', 'Mujer', 'Unisex', 'Niños'];

  // Búsqueda y selector de prendas combinadas
  searchTerm = signal('');
  isDropdownOpen = signal(false);

  // Opciones dinámicas que vienen de la configuración de negocio
  get fitOptions(): string[] {
    const config = this.configState.StoreConfig().config;
    const rawList = (config?.clothingFits || []).map((f) => f?.trim()).filter(Boolean);
    const currentVal = this.clothingForm?.get('fit')?.value?.trim();
    if (currentVal && !rawList.includes(currentVal)) {
      rawList.push(currentVal);
    }
    return Array.from(new Set(rawList));
  }

  readonly sizeTypeOptions: { label: string; value: string }[] = [
    { value: 'Ropa', label: 'Ropa (S, M, L, XL)' },
    { value: 'Calzado', label: 'Calzado (38-44)' },
    { value: 'Numérico', label: 'Numérico' },
    { value: 'Talle Único', label: 'Talle Único' },
  ];

  get selectedCombineIds(): string[] {
    return this.clothingForm?.get('combineWith')?.value || [];
  }

  // Lista de productos combinados seleccionados con sus datos completos (nombre, foto, categoría)
  selectedCombinedProducts = computed(() => {
    const all = this.productStore.allProducts();
    const idMap = new Map(all.map((p) => [p._id, p]));
    const ids = this.selectedCombineIds;
    return ids.map(
      (id) =>
        idMap.get(id) ||
        ({
          _id: id,
          model: 'Prenda asociada',
          category: '',
          brand: '',
          images: [],
        } as unknown as IProduct),
    );
  });

  // Productos sugeridos en el buscador (excluye el producto actual y los ya seleccionados)
  availableProducts = computed(() => {
    const all = this.productStore.allProducts();
    const currentId = this.currentProductId();
    const selectedIds = new Set(this.selectedCombineIds);
    const q = this.searchTerm().toLowerCase().trim();

    return all
      .filter((p) => {
        if (currentId && p._id === currentId) return false;
        if (selectedIds.has(p._id)) return false;
        if (!q) return true;
        return (
          p.model?.toLowerCase().includes(q) ||
          p.category?.toLowerCase().includes(q) ||
          p.brand?.toLowerCase().includes(q)
        );
      })
      .slice(0, 12);
  });

  constructor(private fb: FormBuilder) {
    this.clothingForm = this.fb.group({
      gender: [''],
      fit: [''],
      material: [''],
      sizeType: [''],
      season: [''],
      combineWith: [[] as string[]],
    });

    this.clothingForm.valueChanges.subscribe(() => {
      this.formChange.emit(this.clothingForm.value as ClothingFormValue);
    });
  }

  ngOnInit(): void {
    this.#applyInitialValue();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value'] && this.clothingForm) {
      this.#applyInitialValue();
    }
  }

  #applyInitialValue() {
    const v = this.value();
    if (!v) return;

    let initialCombine: string[] = [];
    if (Array.isArray(v.combineWith)) {
      initialCombine = v.combineWith
        .map((item: any) => (typeof item === 'string' ? item : item?._id))
        .filter(Boolean);
    }

    this.clothingForm.patchValue({
      gender: v.gender ? String(v.gender).trim() : '',
      fit: v.fit ? String(v.fit).trim() : '',
      material: v.material ? String(v.material).trim() : '',
      sizeType: v.sizeType ? String(v.sizeType).trim() : '',
      season: v.season ? String(v.season).trim() : '',
      combineWith: initialCombine,
    });
  }

  getValue(): ClothingFormValue {
    return this.clothingForm.value as ClothingFormValue;
  }

  addCombinedProduct(product: IProduct) {
    const current = this.selectedCombineIds;
    if (!current.includes(product._id)) {
      this.clothingForm.patchValue({
        combineWith: [...current, product._id],
      });
    }
    this.searchTerm.set('');
    this.isDropdownOpen.set(false);
  }

  removeCombinedProduct(productId: string) {
    const current = this.selectedCombineIds;
    this.clothingForm.patchValue({
      combineWith: current.filter((id) => id !== productId),
    });
  }

  getProductImage(product: any): string {
    if (!product?.images?.length) return 'no-image.jpg';
    const first = product.images[0];
    return typeof first === 'string' ? first : (first?.secure_url || first?.url || 'no-image.jpg');
  }

  addFit() {
    const dialogRef = this.#dialog.open(AddBrandCategory, {
      width: '400px',
      data: { type: 'fit', actuallyData: this.fitOptions },
    });

    dialogRef.afterClosed().subscribe((result: string) => {
      if (result) {
        const trimmed = result.trim();
        if (trimmed) {
          const currentList = this.fitOptions;
          if (!currentList.includes(trimmed)) {
            this.configState.saveConfig({ clothingFits: [...currentList, trimmed] });
          }
          this.clothingForm.patchValue({ fit: trimmed });
        }
      }
    });
  }
}
