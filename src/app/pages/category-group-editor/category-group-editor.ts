import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  FormsModule
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { PageLayout } from '../../shared/components/page-layout/page-layout';
import { SidebarService } from '../../services/sidebar.service';
import { CategoryGroupService } from '../../services/category-group.service';
import { ICategoryGroup, IRawCategoryCount } from '../../interfaces/category-group.interface';

@Component({
  selector: 'app-category-group-editor',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterLink,
    MatIconModule,
    MatButtonModule,
    PageLayout,
    PageHeader
  ],
  templateUrl: './category-group-editor.html',
  styleUrl: './category-group-editor.scss'
})
export class CategoryGroupEditorComponent implements OnInit {
  private fb = inject(FormBuilder);
  private categoryGroupService = inject(CategoryGroupService);
  private sidebarService = inject(SidebarService);
  private snackBar = inject(MatSnackBar);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  groupId = signal<string | null>(null);
  isEditMode = signal(false);
  isLoading = signal(false);
  isSaving = signal(false);
  isSubmitted = signal(false);

  // Categorías reales detectadas en la base de datos
  rawCategories = signal<IRawCategoryCount[]>([]);

  // Categorías seleccionadas para esta macro-categoría
  targetCategories = signal<string[]>([]);

  // Sinónimos de búsqueda
  synonyms = signal<string[]>([]);
  newSynonymInput = signal('');
  newCustomCategoryInput = signal('');

  // Formulario reactivo
  groupForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    slug: ['', [Validators.required, Validators.pattern(/^[a-z0-9-_]+$/)]],
    description: [''],
    isActive: [true],
    order: [0, [Validators.min(0)]]
  });

  slugValue = signal('');

  // Advertencia y explicación interactiva en vivo para el slug
  slugSpecialWarning = computed(() => {
    const raw = this.slugValue();
    if (!raw) return null;

    if (raw.includes('&')) {
      return {
        title: "Símbolo '&' detectado",
        reason: "En URLs web, '&' se reserva para separar variables (ej: ?category=ropa&color=rojo). Si usas '&' dentro del slug, el navegador cortará el nombre creyendo que es un nuevo parámetro. Se convertirá automáticamente a '-y-'.",
        suggested: CategoryGroupService.slugify(raw)
      };
    }
    if (/\s/.test(raw)) {
      return {
        title: "Espacios detectados",
        reason: "Las URLs web no pueden contener espacios en blanco. Se reemplazarán automáticamente por guiones (-) para que el enlace sea seguro y compartible.",
        suggested: CategoryGroupService.slugify(raw)
      };
    }
    if (/[?=#\/%+!]/.test(raw)) {
      return {
        title: "Caracteres especiales de URL detectados",
        reason: "Los símbolos '?', '=', '#', '/', '%' son comandos reservados de los navegadores para rutas y consultas. Se filtrarán automáticamente.",
        suggested: CategoryGroupService.slugify(raw)
      };
    }
    if (/[áéíóúÁÉÍÓÚñÑ]/.test(raw)) {
      return {
        title: "Acentos o caracteres especiales",
        reason: "Para evitar enlaces rotos al compartir en WhatsApp o redes sociales, las tildes y eñes se transforman a caracteres estándar (ej: 'ñ' -> 'n', 'á' -> 'a').",
        suggested: CategoryGroupService.slugify(raw)
      };
    }
    if (/[A-Z]/.test(raw)) {
      return {
        title: "Mayúsculas detectadas",
        reason: "Las direcciones URL web se escriben en minúsculas por convención para asegurar que los enlaces funcionen igual en cualquier navegador o servidor.",
        suggested: CategoryGroupService.slugify(raw)
      };
    }
    return null;
  });

  // Lista de errores detallados para el Alert de DaisyUI
  formErrors = computed(() => {
    const errors: string[] = [];
    const nameCtrl = this.groupForm.get('name');
    const slugCtrl = this.groupForm.get('slug');
    const orderCtrl = this.groupForm.get('order');

    if (nameCtrl?.invalid) {
      if (nameCtrl.errors?.['required']) {
        errors.push('El Nombre de la macro-categoría es obligatorio.');
      } else if (nameCtrl.errors?.['minlength']) {
        errors.push('El Nombre debe tener al menos 2 caracteres.');
      }
    }

    if (slugCtrl?.invalid) {
      if (slugCtrl.errors?.['required']) {
        errors.push('El Identificador URL (slug) es obligatorio.');
      } else if (slugCtrl.errors?.['pattern']) {
        const val = slugCtrl.value || '';
        if (val.includes('&')) {
          errors.push(`El identificador "${val}" contiene el símbolo '&'. En URLs web, el '&' separa parámetros. Cámbialo por "${CategoryGroupService.slugify(val)}".`);
        } else if (/\s/.test(val)) {
          errors.push(`El identificador "${val}" contiene espacios. Usa guiones (-) en su lugar.`);
        } else {
          errors.push(`El identificador "${val}" tiene caracteres no válidos para una URL. Solo se admiten letras minúsculas (a-z), números (0-9) y guiones (-).`);
        }
      }
    }

    if (orderCtrl?.invalid && orderCtrl.errors?.['min']) {
      errors.push('La posición / orden debe ser un número igual o mayor a 0.');
    }

    return errors;
  });

  constructor() {
    this.sidebarService.navbarTitle.set({
      title: 'Editor de Macro-Categoría'
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'create') {
      this.groupId.set(id);
      this.isEditMode.set(true);
    }

    this.loadInitialData();
  }

  async loadInitialData(): Promise<void> {
    this.isLoading.set(true);
    try {
      // 1. Cargar categorías reales del catálogo
      const rawCats = await this.categoryGroupService.getRawCategories();
      this.rawCategories.set(rawCats);

      // 2. Si es modo edición, cargar datos del grupo
      const id = this.groupId();
      if (id) {
        const group = await this.categoryGroupService.getCategoryGroup(id);
        if (group) {
          this.groupForm.patchValue({
            name: group.name,
            slug: group.slug,
            description: group.description || '',
            isActive: group.isActive !== false,
            order: group.order || 0
          });
          this.slugValue.set(group.slug || '');
          this.targetCategories.set(group.targetCategories || []);
          this.synonyms.set(group.synonyms || []);
        } else {
          this.snackBar.open('Categoría no encontrada', 'Cerrar', { duration: 3000 });
          this.router.navigate(['/home/categories']);
        }
      }
    } catch (err) {
      console.error(err);
      this.snackBar.open('Error al cargar datos de la categoría', 'Cerrar', { duration: 3000 });
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Auto-genera el slug a partir del nombre en modo creación si el usuario no editó el slug manualmente
   */
  onNameInput(): void {
    if (!this.isEditMode()) {
      const nameVal = this.groupForm.get('name')?.value || '';
      const autoSlug = CategoryGroupService.slugify(nameVal);
      this.groupForm.get('slug')?.setValue(autoSlug, { emitEvent: false });
      this.slugValue.set(autoSlug);
    }
  }

  onSlugInput(): void {
    const current = this.groupForm.get('slug')?.value || '';
    this.slugValue.set(current);
  }

  /**
   * Auto-corrige el slug eliminando caracteres inválidos (&, espacios, acentos, etc.)
   */
  autoFormatSlug(): void {
    const current = this.groupForm.get('slug')?.value || this.groupForm.get('name')?.value || '';
    const clean = CategoryGroupService.slugify(current);
    this.groupForm.get('slug')?.setValue(clean);
    this.slugValue.set(clean);
    this.groupForm.get('slug')?.markAsTouched();
    this.groupForm.get('slug')?.updateValueAndValidity();
  }

  onSlugBlur(): void {
    const current = this.groupForm.get('slug')?.value;
    if (current && this.groupForm.get('slug')?.invalid) {
      // Si tiene caracteres como & o espacios, auto-formatear
      this.autoFormatSlug();
    }
  }

  /**
   * Alterna la inclusión de una categoría en targetCategories
   */
  toggleTargetCategory(catName: string): void {
    const trimmed = catName.trim();
    if (!trimmed) return;

    const current = this.targetCategories();
    const index = current.findIndex(c => c.toLowerCase() === trimmed.toLowerCase());

    if (index !== -1) {
      const updated = [...current];
      updated.splice(index, 1);
      this.targetCategories.set(updated);
    } else {
      this.targetCategories.set([...current, trimmed]);
    }
  }

  isCategorySelected(catName: string): boolean {
    const trimmed = catName.trim().toLowerCase();
    return this.targetCategories().some(c => c.toLowerCase() === trimmed);
  }

  /**
   * Agrega una categoría personalizada que aún no exista en el catálogo
   */
  addCustomCategory(): void {
    const val = this.newCustomCategoryInput().trim();
    if (!val) return;

    if (!this.isCategorySelected(val)) {
      this.targetCategories.set([...this.targetCategories(), val]);
    }
    this.newCustomCategoryInput.set('');
  }

  removeTargetCategory(catName: string): void {
    const current = this.targetCategories();
    this.targetCategories.set(current.filter(c => c.toLowerCase() !== catName.toLowerCase()));
  }

  selectAllCategories(): void {
    const all = this.rawCategories().map(r => r.category);
    this.targetCategories.set(Array.from(new Set([...this.targetCategories(), ...all])));
  }

  clearAllCategories(): void {
    this.targetCategories.set([]);
  }

  /**
   * Manejo de sinónimos
   */
  addSynonym(): void {
    const val = this.newSynonymInput().trim().toLowerCase();
    if (!val) return;

    // Permitir ingresar múltiples sinónimos separados por coma
    const parts = val.split(',').map(p => p.trim()).filter(Boolean);
    const current = this.synonyms();
    const updated = Array.from(new Set([...current, ...parts]));

    this.synonyms.set(updated);
    this.newSynonymInput.set('');
  }

  removeSynonym(synonym: string): void {
    this.synonyms.set(this.synonyms().filter(s => s.toLowerCase() !== synonym.toLowerCase()));
  }

  /**
   * Guarda los cambios o crea el nuevo grupo
   */
  async onSubmit(): Promise<void> {
    this.isSubmitted.set(true);

    if (this.groupForm.invalid) {
      this.groupForm.markAllAsTouched();
      this.snackBar.open('Corrige los campos marcados en rojo antes de guardar', 'Cerrar', { duration: 3000 });
      return;
    }

    const rawForm = this.groupForm.value;
    const cleanTargets = this.targetCategories();

    if (cleanTargets.length === 0) {
      if (!confirm('No has seleccionado ninguna categoría para agrupar. ¿Deseas guardar de todos modos? Se usará el nombre de la macro-categoría como valor predeterminado.')) {
        return;
      }
    }

    this.isSaving.set(true);

    try {
      const payload = {
        name: rawForm.name.trim(),
        slug: rawForm.slug.trim().toLowerCase(),
        description: rawForm.description?.trim() || '',
        targetCategories: cleanTargets,
        synonyms: this.synonyms(),
        isActive: rawForm.isActive !== false,
        order: Number(rawForm.order) || 0
      };

      if (this.isEditMode() && this.groupId()) {
        await this.categoryGroupService.updateCategoryGroup(this.groupId()!, payload);
        this.snackBar.open('Macro-categoría actualizada exitosamente', 'Cerrar', { duration: 3000 });
      } else {
        await this.categoryGroupService.createCategoryGroup(payload);
        this.snackBar.open('Macro-categoría creada exitosamente', 'Cerrar', { duration: 3000 });
      }

      this.router.navigate(['/home/categories']);
    } catch (err: any) {
      console.error(err);
      const errorMsg = err.error?.message || 'Error al guardar la macro-categoría';
      this.snackBar.open(errorMsg, 'Cerrar', { duration: 4000 });
    } finally {
      this.isSaving.set(false);
    }
  }
}
