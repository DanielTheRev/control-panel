import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subscription } from 'rxjs';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { PageLayout } from '../../shared/components/page-layout/page-layout';
import { SidebarService } from '../../services/sidebar.service';
import { MenuService } from '../../services/menu.service';
import { IMenu, IMenuItem, IMenuItemChild } from '../../interfaces/menu.interface';

export interface IMenuFormItemChild {
  uid: string;
  _id?: string;
  label: string;
  link: string;
  badge?: string;
  isActive: boolean;
}

export interface IMenuFormItem {
  uid: string;
  _id?: string;
  label: string;
  link: string;
  badge?: string;
  subtitle?: string;
  imageFile?: File | string | null;
  imageUrl?: string;
  previewUrl?: string;
  isActive: boolean;
  isCollapsed?: boolean;
  children: IMenuFormItemChild[];
}

export interface IMenuFormData {
  name: string;
  slug: string;
  description: string;
  isActive: boolean;
  items: IMenuFormItem[];
}

@Component({
  selector: 'app-menu-editor',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatIconModule,
    MatButtonModule,
    PageLayout,
    PageHeader
  ],
  templateUrl: './menu-editor.html',
  styleUrl: './menu-editor.scss'
})
export class MenuEditorComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private menuService = inject(MenuService);
  private sidebarService = inject(SidebarService);
  private snackBar = inject(MatSnackBar);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  menuId = signal<string | null>(null);
  isEditMode = signal(false);
  isLoading = signal(false);
  isSaving = signal(false);
  previewMode = signal<'cards' | 'sidebar' | 'json'>('cards');

  // Mapa reactivo de URLs de preview por uid de item
  imagePreviewMap: Record<string, string> = {};

  // Signal reactivo para la vista previa y header sincronizado
  formSnapshot = signal<IMenuFormData>({
    name: '',
    slug: '',
    description: '',
    isActive: true,
    items: []
  });

  private formSub?: Subscription;

  menuForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    slug: ['', [Validators.required, Validators.pattern(/^[a-z0-9-_]+$/)]],
    description: [''],
    isActive: [true],
    items: this.fb.array([])
  });

  get items(): FormArray {
    return this.menuForm.get('items') as FormArray;
  }

  constructor() {
    this.sidebarService.navbarTitle.set({
      title: 'Editor de Menú'
    });
  }

  ngOnInit(): void {
    this.formSub = this.menuForm.valueChanges.subscribe(() => {
      this.syncSnapshot();
    });

    const id = this.route.snapshot.paramMap.get('menuId');
    if (id) {
      this.menuId.set(id);
      this.isEditMode.set(true);
      this.loadMenu(id);
    } else {
      this.addItem();
      this.syncSnapshot();
    }
  }

  ngOnDestroy(): void {
    this.formSub?.unsubscribe();
    Object.values(this.imagePreviewMap).forEach((url) => {
      if (url && url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    });
  }

  trackByItemUid(index: number, control: AbstractControl): string {
    return control.get('uid')?.value || `${index}`;
  }

  trackByChildUid(index: number, control: AbstractControl): string {
    return control.get('uid')?.value || `${index}`;
  }

  async loadMenu(slugOrId: string): Promise<void> {
    this.isLoading.set(true);
    try {
      const menu = await this.menuService.getMenu(slugOrId);
      if (menu) {
        this.menuId.set(menu._id || slugOrId);
        this.menuForm.patchValue(
          {
            name: menu.name,
            slug: menu.slug,
            description: menu.description || '',
            isActive: menu.isActive !== false
          },
          { emitEvent: false }
        );

        this.items.clear();
        this.imagePreviewMap = {};

        if (menu.items && menu.items.length > 0) {
          menu.items.forEach((item) => this.addItem(item, false));
        } else {
          this.addItem(undefined, false);
        }

        this.syncSnapshot();
      }
    } catch (err) {
      console.error(err);
      this.snackBar.open('Error al cargar el menú', 'Cerrar', { duration: 3000 });
    } finally {
      this.isLoading.set(false);
    }
  }

  createItemFormGroup(item?: IMenuItem): FormGroup {
    const uid = crypto.randomUUID();
    const childrenArray = this.fb.array(
      (item?.children || []).map((child) => this.createChildFormGroup(child))
    );

    const initialImageUrl = item?.image?.url || '';
    if (initialImageUrl) {
      this.imagePreviewMap[uid] = initialImageUrl;
    }

    return this.fb.group({
      uid: [uid],
      _id: [item?._id || ''],
      label: [item?.label || '', [Validators.required]],
      link: [item?.link || '/products', [Validators.required]],
      badge: [item?.badge || ''],
      subtitle: [item?.subtitle || ''],
      order: [item?.order ?? this.items.length + 1],
      isActive: [item?.isActive !== false],
      target: [item?.target || '_self'],
      imageFile: [null],
      imageUrl: [initialImageUrl],
      isCollapsed: [false],
      showUrlInput: [false],
      children: childrenArray
    });
  }

  createChildFormGroup(child?: IMenuItemChild): FormGroup {
    return this.fb.group({
      uid: [crypto.randomUUID()],
      _id: [child?._id || ''],
      label: [child?.label || '', [Validators.required]],
      link: [child?.link || '/products', [Validators.required]],
      badge: [child?.badge || ''],
      order: [child?.order ?? 1],
      isActive: [child?.isActive !== false]
    });
  }

  addItem(item?: IMenuItem, emitSync = true): void {
    const group = this.createItemFormGroup(item);
    this.items.push(group);
    if (emitSync) {
      this.syncSnapshot();
    }
  }

  removeItem(index: number): void {
    if (this.items.length <= 1) {
      this.snackBar.open('El menú debe tener al menos un ítem.', 'Cerrar', { duration: 2500 });
      return;
    }

    const group = this.items.at(index);
    const uid = group.get('uid')?.value;
    if (uid && this.imagePreviewMap[uid]) {
      if (this.imagePreviewMap[uid].startsWith('blob:')) {
        URL.revokeObjectURL(this.imagePreviewMap[uid]);
      }
      delete this.imagePreviewMap[uid];
    }

    this.items.removeAt(index);
    this.syncSnapshot();
  }

  moveItemUp(index: number): void {
    if (index === 0) return;
    const current = this.items.at(index);
    this.items.removeAt(index);
    this.items.insert(index - 1, current);
    this.syncSnapshot();
  }

  moveItemDown(index: number): void {
    if (index === this.items.length - 1) return;
    const current = this.items.at(index);
    this.items.removeAt(index);
    this.items.insert(index + 1, current);
    this.syncSnapshot();
  }

  toggleCollapse(index: number): void {
    const group = this.items.at(index);
    const current = group.get('isCollapsed')?.value;
    group.patchValue({ isCollapsed: !current });
    this.syncSnapshot();
  }

  expandAll(): void {
    this.items.controls.forEach((ctrl) => ctrl.patchValue({ isCollapsed: false }));
    this.syncSnapshot();
  }

  collapseAll(): void {
    this.items.controls.forEach((ctrl) => ctrl.patchValue({ isCollapsed: true }));
    this.syncSnapshot();
  }

  getChildren(itemIndex: number): FormArray {
    return this.items.at(itemIndex).get('children') as FormArray;
  }

  addChild(itemIndex: number): void {
    this.getChildren(itemIndex).push(this.createChildFormGroup());
    this.syncSnapshot();
  }

  removeChild(itemIndex: number, childIndex: number): void {
    this.getChildren(itemIndex).removeAt(childIndex);
    this.syncSnapshot();
  }

  // --- MANEJO DE IMÁGENES COMPACTO ---

  getImagePreview(control: AbstractControl): string | null {
    const uid = control.get('uid')?.value;
    return this.imagePreviewMap[uid] || control.get('imageUrl')?.value || null;
  }

  onImageFileSelected(event: Event, itemIndex: number): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    if (!file.type.startsWith('image/')) {
      this.snackBar.open('Por favor seleccioná un archivo de imagen válido', 'Cerrar', { duration: 3000 });
      return;
    }

    const group = this.items.at(itemIndex);
    const uid = group.get('uid')?.value;

    if (this.imagePreviewMap[uid]?.startsWith('blob:')) {
      URL.revokeObjectURL(this.imagePreviewMap[uid]);
    }

    const blobUrl = URL.createObjectURL(file);
    this.imagePreviewMap[uid] = blobUrl;

    group.patchValue({
      imageFile: file,
      imageUrl: blobUrl
    });

    input.value = '';
    this.syncSnapshot();
  }

  onImageUrlChange(url: string, itemIndex: number): void {
    const group = this.items.at(itemIndex);
    const uid = group.get('uid')?.value;
    const cleanUrl = url.trim();

    if (cleanUrl) {
      if (this.imagePreviewMap[uid]?.startsWith('blob:')) {
        URL.revokeObjectURL(this.imagePreviewMap[uid]);
      }
      this.imagePreviewMap[uid] = cleanUrl;
      group.patchValue({
        imageFile: null,
        imageUrl: cleanUrl
      });
    } else {
      this.removeImage(itemIndex);
    }

    this.syncSnapshot();
  }

  onPasteImage(event: ClipboardEvent, itemIndex: number): void {
    const items = event.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          event.preventDefault();
          const group = this.items.at(itemIndex);
          const uid = group.get('uid')?.value;

          if (this.imagePreviewMap[uid]?.startsWith('blob:')) {
            URL.revokeObjectURL(this.imagePreviewMap[uid]);
          }

          const blobUrl = URL.createObjectURL(file);
          this.imagePreviewMap[uid] = blobUrl;

          group.patchValue({
            imageFile: file,
            imageUrl: blobUrl
          });

          this.syncSnapshot();
          break;
        }
      }
    }
  }

  removeImage(itemIndex: number): void {
    const group = this.items.at(itemIndex);
    const uid = group.get('uid')?.value;

    if (this.imagePreviewMap[uid]?.startsWith('blob:')) {
      URL.revokeObjectURL(this.imagePreviewMap[uid]);
    }
    delete this.imagePreviewMap[uid];

    group.patchValue({
      imageFile: null,
      imageUrl: ''
    });

    this.syncSnapshot();
  }

  toggleUrlInput(itemIndex: number): void {
    const group = this.items.at(itemIndex);
    const current = group.get('showUrlInput')?.value;
    group.patchValue({ showUrlInput: !current });
  }

  // --- SINCRONIZACIÓN DE SNAPSHOT ---

  syncSnapshot(): void {
    const rawVal = this.menuForm.getRawValue();
    const itemsList: IMenuFormItem[] = [];

    this.items.controls.forEach((ctrl) => {
      const val = ctrl.value;
      const uid = val.uid;
      const previewUrl = this.imagePreviewMap[uid] || val.imageUrl || '';

      const childrenList: IMenuFormItemChild[] = (
        (ctrl.get('children') as FormArray)?.controls || []
      ).map((cCtrl) => {
        const cVal = cCtrl.value;
        return {
          uid: cVal.uid,
          _id: cVal._id,
          label: cVal.label || '',
          link: cVal.link || '',
          badge: cVal.badge || '',
          isActive: cVal.isActive !== false
        };
      });

      itemsList.push({
        uid,
        _id: val._id,
        label: val.label || '',
        link: val.link || '',
        badge: val.badge || '',
        subtitle: val.subtitle || '',
        imageFile: val.imageFile,
        imageUrl: val.imageUrl || '',
        previewUrl,
        isActive: val.isActive !== false,
        isCollapsed: val.isCollapsed || false,
        children: childrenList
      });
    });

    this.formSnapshot.set({
      name: rawVal.name || '',
      slug: rawVal.slug || '',
      description: rawVal.description || '',
      isActive: rawVal.isActive !== false,
      items: itemsList
    });
  }

  onNameInput(): void {
    if (!this.isEditMode()) {
      const name = this.menuForm.get('name')?.value || '';
      const slug = this.slugify(name);
      this.menuForm.patchValue({ slug });
    }
    this.syncSnapshot();
  }

  private slugify(text: string): string {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  // --- GUARDAR MENÚ ---

  async saveMenu(): Promise<void> {
    if (this.menuForm.invalid) {
      this.menuForm.markAllAsTouched();
      this.snackBar.open('Por favor completá los campos obligatorios marcados en rojo.', 'Cerrar', {
        duration: 3500
      });
      return;
    }

    this.isSaving.set(true);

    try {
      const formVal = this.menuForm.value;
      const formData = new FormData();

      const itemsPayload: any[] = [];

      this.items.controls.forEach((ctrl, i: number) => {
        const val = ctrl.value;
        const itemObj: any = {
          _id: val._id || undefined,
          label: val.label?.trim(),
          link: val.link?.trim() || '/products',
          badge: val.badge?.trim() || '',
          subtitle: val.subtitle?.trim() || '',
          order: i + 1,
          isActive: val.isActive !== false,
          target: val.target || '_self',
          children: ((ctrl.get('children') as FormArray)?.controls || []).map(
            (cCtrl, cIdx: number) => {
              const cVal = cCtrl.value;
              return {
                _id: cVal._id || undefined,
                label: cVal.label?.trim() || `Subítem ${cIdx + 1}`,
                link: cVal.link?.trim() || '/products',
                badge: cVal.badge?.trim() || '',
                order: cIdx + 1,
                isActive: cVal.isActive !== false
              };
            }
          )
        };

        const imgFileVal = val.imageFile;
        if (imgFileVal instanceof File) {
          formData.append(`image_${i}`, imgFileVal);
        } else if (val.imageUrl && !val.imageUrl.startsWith('blob:')) {
          itemObj.image = { url: val.imageUrl, public_id: 'existing' };
        } else if (!val.imageUrl) {
          itemObj.image = null;
        }

        itemsPayload.push(itemObj);
      });

      const menuData = {
        name: formVal.name.trim(),
        slug: this.slugify(formVal.slug),
        description: formVal.description?.trim() || '',
        isActive: formVal.isActive !== false,
        items: itemsPayload
      };

      formData.append('data', JSON.stringify(menuData));

      if (this.isEditMode() && this.menuId()) {
        await this.menuService.updateMenu(this.menuId()!, formData);
        this.snackBar.open('Menú actualizado exitosamente', 'Cerrar', { duration: 3000 });
      } else {
        await this.menuService.createMenu(formData);
        this.snackBar.open('Menú creado exitosamente', 'Cerrar', { duration: 3000 });
      }

      this.router.navigate(['/home/menus']);
    } catch (err: any) {
      console.error(err);
      const msg = err.error?.message || err.message || 'Error al guardar el menú.';
      this.snackBar.open(msg, 'Cerrar', { duration: 4000 });
    } finally {
      this.isSaving.set(false);
    }
  }
}

