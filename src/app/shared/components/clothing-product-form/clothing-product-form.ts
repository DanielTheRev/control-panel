import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  input,
  OnChanges,
  OnInit,
  OnDestroy,
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
import { ProductService } from '../../../services/product.service';
import { MatDialog } from '@angular/material/dialog';
import { AddBrandCategory } from '../../../share/components/add-brand-category/add-brand-category';
import { MatIcon } from '@angular/material/icon';
import { IProduct } from '../../../interfaces/product.interface';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, catchError, of } from 'rxjs';

export interface ICombineWithItemValue {
  product: string;
  color?: string | null;
}

export interface ClothingFormValue {
  gender: string;
  fit: string;
  material: string;
  sizeType: string;
  season: string;
  combineWith: ICombineWithItemValue[];
}

@Component({
  selector: 'app-clothing-product-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, MatIcon],
  templateUrl: './clothing-product-form.html',
})
export class ClothingProductForm implements OnInit, OnChanges, OnDestroy {
  /** Pre-load values when editing an existing product */
  value = input<Partial<ClothingFormValue> | null>(null);
  currentProductId = input<string | null>(null);

  @Output() formChange = new EventEmitter<ClothingFormValue>();

  clothingForm: FormGroup;
  configState = inject(StoreConfigStateService);
  #productService = inject(ProductService);
  #dialog = inject(MatDialog);

  readonly genderOptions: string[] = ['Hombre', 'Mujer', 'Unisex', 'Niños'];

  // Búsqueda y selector de prendas combinadas
  searchTerm = signal('');
  isDropdownOpen = signal(false);
  isSearching = signal(false);
  searchResults = signal<IProduct[]>([]);
  #searchSubject = new Subject<string>();
  #sub?: Subscription;

  // Mapa de productos conocidos (populados desde backend o cargados desde el buscador)
  knownProductsMap = signal<Map<string, IProduct>>(new Map());

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

  get selectedCombineItems(): ICombineWithItemValue[] {
    const raw = this.clothingForm?.get('combineWith')?.value;
    if (!Array.isArray(raw)) return [];
    const items: ICombineWithItemValue[] = [];
    for (const item of raw) {
      if (typeof item === 'string' && item) {
        items.push({ product: item, color: null });
      } else if (item && typeof item === 'object') {
        const pId = item.product || item._id;
        const resolvedId = typeof pId === 'object' ? pId._id : (pId ? String(pId) : null);
        if (resolvedId) {
          items.push({ product: resolvedId, color: item.color || null });
        }
      }
    }
    return items;
  }

  // Lista de items combinados seleccionados con sus datos completos para mostrar
  selectedCombinedDisplayList = computed(() => {
    const map = this.knownProductsMap();
    const items = this.selectedCombineItems;
    return items.map((item) => {
      const prod = map.get(item.product);
      let image = '/no-image.jpg';
      let colorHex: string | undefined = undefined;

      if (prod) {
        if (item.color && (prod as any).variants?.length) {
          const matchVar = (prod as any).variants.find(
            (v: any) => v.color?.name?.toLowerCase() === item.color?.toLowerCase(),
          );
          if (matchVar) {
            image = matchVar.imageReference?.url || this.getProductImage(prod);
            colorHex = matchVar.color?.hex;
          } else {
            image = this.getProductImage(prod);
          }
        } else {
          image = this.getProductImage(prod);
        }
      }

      return {
        productId: item.product,
        color: item.color,
        colorHex,
        model: prod?.model || 'Prenda asociada',
        brand: prod?.brand || '',
        category: prod?.category || '',
        image,
        key: `${item.product}_${item.color || 'default'}`,
      };
    });
  });

  // Opciones desplegadas por variante de color (Opción A)
  availableCombineOptions = computed(() => {
    const all = this.searchResults();
    const currentId = this.currentProductId();
    const selectedKeys = new Set(
      this.selectedCombineItems.map((i) => `${i.product}_${i.color || 'default'}`),
    );

    const options: {
      product: IProduct;
      colorName: string | null;
      colorHex?: string;
      image: string;
      key: string;
    }[] = [];

    for (const p of all) {
      if (currentId && p._id === currentId) continue;

      const variants = ((p as any).variants || []).filter((v: any) => v.isActive !== false);
      const colorMap = new Map<string, any>();

      for (const v of variants) {
        const cName = v.color?.name?.trim();
        if (cName && !colorMap.has(cName.toLowerCase())) {
          colorMap.set(cName.toLowerCase(), v);
        }
      }

      if (colorMap.size > 0) {
        for (const [_, v] of colorMap.entries()) {
          const colorName = v.color?.name || null;
          const key = `${p._id}_${colorName || 'default'}`;
          if (!selectedKeys.has(key)) {
            options.push({
              product: p,
              colorName,
              colorHex: v.color?.hex,
              image: v.imageReference?.url || this.getProductImage(p),
              key,
            });
          }
        }
      } else {
        const key = `${p._id}_default`;
        if (!selectedKeys.has(key)) {
          options.push({
            product: p,
            colorName: null,
            colorHex: undefined,
            image: this.getProductImage(p),
            key,
          });
        }
      }
    }

    return options.slice(0, 20);
  });

  constructor(private fb: FormBuilder) {
    this.clothingForm = this.fb.group({
      gender: [''],
      fit: [''],
      material: [''],
      sizeType: [''],
      season: [''],
      combineWith: [[] as ICombineWithItemValue[]],
    });

    this.clothingForm.valueChanges.subscribe(() => {
      this.formChange.emit(this.clothingForm.value as ClothingFormValue);
    });

    // Pipeline de búsqueda reactiva independiente sin filtros de tabla
    this.#sub = this.#searchSubject
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        switchMap((term) => {
          this.isSearching.set(true);
          return this.#productService.searchAdminProducts(term, 30).pipe(
            catchError(() => of([])),
          );
        }),
      )
      .subscribe((prods) => {
        this.isSearching.set(false);
        this.searchResults.set(prods);
        // Guardamos en el mapa conocido para no perder nombres ni fotos
        this.knownProductsMap.update((currentMap) => {
          const next = new Map(currentMap);
          prods.forEach((p) => next.set(p._id, p));
          return next;
        });
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

  ngOnDestroy(): void {
    this.#sub?.unsubscribe();
  }

  #applyInitialValue() {
    const v = this.value();
    if (!v) return;

    let initialCombine: ICombineWithItemValue[] = [];
    if (Array.isArray(v.combineWith)) {
      v.combineWith.forEach((item: any) => {
        if (typeof item === 'object' && item) {
          const prodObj = item.product || item;
          const prodId = typeof prodObj === 'object' ? prodObj._id : prodObj;
          const color = item.color || null;
          if (prodId) {
            initialCombine.push({ product: String(prodId), color });
            if (typeof prodObj === 'object' && prodObj._id) {
              this.knownProductsMap.update((map) => {
                const next = new Map(map);
                next.set(String(prodObj._id), prodObj as IProduct);
                return next;
              });
            }
          }
        } else if (typeof item === 'string' && item) {
          initialCombine.push({ product: item, color: null });
        }
      });
    }

    // Si hay IDs en combineWith que aún no tienen objeto en el mapa, los buscamos de fondo
    const missing = initialCombine
      .map((i) => i.product)
      .filter((id) => !this.knownProductsMap().has(id));

    if (missing.length > 0) {
      this.#productService.searchAdminProducts('', 100).subscribe((prods) => {
        this.knownProductsMap.update((map) => {
          const next = new Map(map);
          prods.forEach((p) => next.set(p._id, p));
          return next;
        });
      });
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

  onSearchChange(term: string) {
    this.searchTerm.set(term);
    this.isDropdownOpen.set(true);
    this.#searchSubject.next(term);
  }

  onSearchFocus() {
    this.isDropdownOpen.set(true);
    if (this.searchResults().length === 0) {
      this.#searchSubject.next(this.searchTerm());
    }
  }

  onSearchBlur() {
    // Retrasar cierre para permitir click en el dropdown
    setTimeout(() => {
      this.isDropdownOpen.set(false);
    }, 250);
  }

  getValue(): ClothingFormValue {
    return this.clothingForm.value as ClothingFormValue;
  }

  addCombinedProduct(product: IProduct, color: string | null = null) {
    const current = this.selectedCombineItems;
    const key = `${product._id}_${color || 'default'}`;
    const exists = current.some((i) => `${i.product}_${i.color || 'default'}` === key);

    if (!exists) {
      this.knownProductsMap.update((map) => {
        const next = new Map(map);
        next.set(product._id, product);
        return next;
      });
      this.clothingForm.patchValue({
        combineWith: [...current, { product: product._id, color }],
      });
    }
    this.searchTerm.set('');
    this.isDropdownOpen.set(false);
  }

  removeCombinedItem(productId: string, color: string | null = null) {
    const current = this.selectedCombineItems;
    const targetKey = `${productId}_${color || 'default'}`;
    this.clothingForm.patchValue({
      combineWith: current.filter((i) => `${i.product}_${i.color || 'default'}` !== targetKey),
    });
  }

  removeCombinedProduct(productId: string) {
    this.removeCombinedItem(productId, null);
  }

  getProductImage(product: any): string {
    if (!product?.images?.length) return '/no-image.jpg';
    const first = product.images[0];
    return typeof first === 'string' ? first : (first?.secure_url || first?.url || '/no-image.jpg');
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
