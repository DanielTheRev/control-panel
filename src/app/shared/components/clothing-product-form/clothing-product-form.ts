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

  get selectedCombineIds(): string[] {
    return this.clothingForm?.get('combineWith')?.value || [];
  }

  // Lista de productos combinados seleccionados con sus datos completos (nombre, foto, categoría)
  selectedCombinedProducts = computed(() => {
    const map = this.knownProductsMap();
    const ids = this.selectedCombineIds;
    return ids.map(
      (id) =>
        map.get(id) ||
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
    const all = this.searchResults();
    const currentId = this.currentProductId();
    const selectedIds = new Set(this.selectedCombineIds);

    return all
      .filter((p) => {
        if (currentId && p._id === currentId) return false;
        if (selectedIds.has(p._id)) return false;
        return true;
      })
      .slice(0, 15);
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

    let initialCombine: string[] = [];
    if (Array.isArray(v.combineWith)) {
      v.combineWith.forEach((item: any) => {
        if (typeof item === 'object' && item && item._id) {
          initialCombine.push(item._id);
          this.knownProductsMap.update((map) => {
            const next = new Map(map);
            next.set(item._id, item as IProduct);
            return next;
          });
        } else if (typeof item === 'string' && item) {
          initialCombine.push(item);
        }
      });
    }

    // Si hay IDs en combineWith que aún no tienen objeto en el mapa, los buscamos de fondo
    const missing = initialCombine.filter((id) => !this.knownProductsMap().has(id));
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

  addCombinedProduct(product: IProduct) {
    const current = this.selectedCombineIds;
    if (!current.includes(product._id)) {
      this.knownProductsMap.update((map) => {
        const next = new Map(map);
        next.set(product._id, product);
        return next;
      });
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
