import { NgClass } from '@angular/common';
import { Component, inject, signal, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { SidebarService } from '../../services/sidebar.service';
import { NotificationsService } from '../../services/notifications.service';
import { VisualMenuService } from '../../services/visual-menu.service';
import { IVisualMenuConfig, IVisualMenuItem, IVisualMenuItemChild } from '../../interfaces/visual-menu.interface';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { PageLayout } from '../../shared/components/page-layout/page-layout';
import { SingleImageUpload } from '../../shared/components/single-image-upload/single-image-upload';

@Component({
  selector: 'app-bento-editor',
  standalone: true,
  imports: [
    NgClass,
    ReactiveFormsModule,
    MatIconModule,
    PageLayout,
    PageHeader,
    SingleImageUpload
  ],
  templateUrl: './bento-editor.html',
  styleUrl: './bento-editor.css'
})
export class BentoEditorComponent implements OnInit {
  #fb = inject(FormBuilder);
  #sidebarService = inject(SidebarService);
  #notificationsService = inject(NotificationsService);
  #visualMenuService = inject(VisualMenuService);

  selectedIndex = signal<number | null>(null);
  loading = signal(true);
  originalConfig: IVisualMenuConfig | null = null;

  visualMenuForm: FormGroup = this.#fb.group({
    sectionTitle: ['Vura / Catálogo', Validators.required],
    sectionSubtitle: ['Explorá Nuestras Categorías.', Validators.required],
    description: [''],
    displayMode: ['grid'],
    items: this.#fb.array([])
  });

  constructor() {
    this.#sidebarService.navbarTitle.set({
      title: 'Menú Visual & Grillas'
    });
  }

  get itemsFormArray(): FormArray {
    return this.visualMenuForm.get('items') as FormArray;
  }

  get currentItemForm(): FormGroup | null {
    if (this.selectedIndex() === null) return null;
    return this.itemsFormArray.at(this.selectedIndex()!) as FormGroup;
  }

  getImageDesktopControl(): FormControl {
    return this.currentItemForm?.get('imageDesktop') as FormControl;
  }

  getImageMobileControl(): FormControl {
    return this.currentItemForm?.get('imageMobile') as FormControl;
  }

  getChildrenFormArray(itemIndex: number): FormArray {
    const item = this.itemsFormArray.at(itemIndex) as FormGroup;
    return item.get('children') as FormArray;
  }

  createChildFormGroup(child?: Partial<IVisualMenuItemChild>): FormGroup {
    return this.#fb.group({
      label: [child?.label || '', Validators.required],
      link: [child?.link || '/products', Validators.required],
      badge: [child?.badge || ''],
      order: [child?.order || 0]
    });
  }

  createItemFormGroup(item?: Partial<IVisualMenuItem>): FormGroup {
    const childrenArray = this.#fb.array(
      (item?.children || []).map(c => this.createChildFormGroup(c))
    );

    return this.#fb.group({
      _id: [item?._id || null],
      title: [item?.title || '', Validators.required],
      subtitle: [item?.subtitle || ''],
      badge: [item?.badge || ''],
      link: [item?.link || '/products', Validators.required],
      colSpanDesktop: [item?.colSpanDesktop || 6, [Validators.required, Validators.min(1), Validators.max(12)]],
      colSpanTablet: [item?.colSpanTablet || 3],
      colSpanMobile: [item?.colSpanMobile || 2],
      rowSpanDesktop: [item?.rowSpanDesktop || 1, [Validators.required, Validators.min(1), Validators.max(3)]],
      order: [item?.order || 0],
      imageDesktop: [
        item?.imageDesktop && typeof item.imageDesktop === 'object' && 'url' in item.imageDesktop
          ? (item.imageDesktop as any).url
          : (item?.imageDesktop || null),
        Validators.required
      ],
      imageMobile: [
        item?.imageMobile && typeof item.imageMobile === 'object' && 'url' in item.imageMobile
          ? (item.imageMobile as any).url
          : (item?.imageMobile || null)
      ],
      isActive: [item?.isActive !== false],
      children: childrenArray
    });
  }

  async ngOnInit() {
    this.loading.set(true);
    try {
      const config = await this.#visualMenuService.getVisualMenu();
      if (config) {
        this.originalConfig = config;
        this.visualMenuForm.patchValue({
          sectionTitle: config.sectionTitle || 'Vura / Catálogo',
          sectionSubtitle: config.sectionSubtitle || 'Explorá Nuestras Categorías.',
          description: config.description || '',
          displayMode: config.displayMode || 'grid'
        });

        this.itemsFormArray.clear();

        if (config.items && config.items.length > 0) {
          config.items.forEach(item => {
            this.itemsFormArray.push(this.createItemFormGroup(item));
          });
          this.selectedIndex.set(0);
        } else {
          this.addDefaultItems();
        }
      } else {
        this.addDefaultItems();
      }
    } catch (e) {
      this.#notificationsService.error('Error al cargar la configuración del Menú Visual');
      this.addDefaultItems();
    } finally {
      this.loading.set(false);
    }
  }

  addDefaultItems() {
    this.itemsFormArray.clear();
    const defaults: Partial<IVisualMenuItem>[] = [
      {
        title: 'Hombre',
        subtitle: 'Colección 2026',
        badge: 'NUEVO',
        link: '/products?gender=Hombre',
        colSpanDesktop: 6,
        colSpanTablet: 3,
        colSpanMobile: 2,
        rowSpanDesktop: 1,
        order: 1,
        isActive: true,
        imageDesktop: '/productsMock/bento-1.jpeg',
        children: [
          { label: 'Remeras', link: '/products?gender=Hombre&category=remeras' },
          { label: 'Pantalones', link: '/products?gender=Hombre&category=pantalones' },
          { label: 'Abrigos', link: '/products?gender=Hombre&category=abrigos' }
        ]
      },
      {
        title: 'Mujer',
        subtitle: 'Tendencia Primavera',
        badge: 'TREND',
        link: '/products?gender=Mujer',
        colSpanDesktop: 6,
        colSpanTablet: 3,
        colSpanMobile: 2,
        rowSpanDesktop: 1,
        order: 2,
        isActive: true,
        imageDesktop: '/productsMock/campera.webp',
        children: [
          { label: 'Vestidos', link: '/products?gender=Mujer&category=vestidos' },
          { label: 'Tops', link: '/products?gender=Mujer&category=tops' },
          { label: 'Camisas', link: '/products?gender=Mujer&category=camisas' }
        ]
      },
      {
        title: 'Calzados & Accesorios',
        subtitle: 'Esenciales',
        link: '/products?category=calzado',
        colSpanDesktop: 4,
        colSpanTablet: 3,
        colSpanMobile: 1,
        rowSpanDesktop: 1,
        order: 3,
        isActive: true,
        imageDesktop: '/productsMock/hero image 2.png',
        children: [
          { label: 'Zapatillas', link: '/products?category=calzado&type=zapatillas' },
          { label: 'Bolsos', link: '/products?category=accesorios&type=bolsos' }
        ]
      },
      {
        title: 'Archive Sale',
        subtitle: 'Hasta 40% OFF',
        badge: 'HOT SALE',
        link: '/products?tags=archive-sale',
        colSpanDesktop: 8,
        colSpanTablet: 3,
        colSpanMobile: 1,
        rowSpanDesktop: 1,
        order: 4,
        isActive: true,
        imageDesktop: '/productsMock/remera wanama manga larga.webp',
        children: []
      }
    ];

    defaults.forEach(item => {
      this.itemsFormArray.push(this.createItemFormGroup(item));
    });
    this.selectedIndex.set(0);
  }

  selectItem(index: number) {
    this.selectedIndex.set(index);
  }

  addItem() {
    const newItem: Partial<IVisualMenuItem> = {
      title: 'Nueva Categoría',
      subtitle: '',
      badge: '',
      link: '/products',
      colSpanDesktop: 6,
      colSpanTablet: 3,
      colSpanMobile: 2,
      rowSpanDesktop: 1,
      order: this.itemsFormArray.length + 1,
      isActive: true,
      imageDesktop: null,
      children: []
    };
    this.itemsFormArray.push(this.createItemFormGroup(newItem));
    this.selectedIndex.set(this.itemsFormArray.length - 1);
  }

  removeItem(index: number, event?: MouseEvent) {
    if (event) event.stopPropagation();
    if (this.itemsFormArray.length <= 1) {
      this.#notificationsService.warning('Debes mantener al menos 1 tarjeta');
      return;
    }

    this.itemsFormArray.removeAt(index);
    if (this.selectedIndex() === index) {
      this.selectedIndex.set(Math.max(0, index - 1));
    } else if (this.selectedIndex()! > index) {
      this.selectedIndex.set(this.selectedIndex()! - 1);
    }
  }

  addChild(itemIndex: number) {
    const children = this.getChildrenFormArray(itemIndex);
    children.push(this.createChildFormGroup({
      label: 'Subcategoría',
      link: '/products',
      order: children.length + 1
    }));
  }

  removeChild(itemIndex: number, childIndex: number) {
    const children = this.getChildrenFormArray(itemIndex);
    children.removeAt(childIndex);
  }

  setPreset(preset: 'third' | 'half' | 'two-thirds' | 'full' | 'tall') {
    if (!this.currentItemForm) return;

    switch (preset) {
      case 'third':
        this.currentItemForm.patchValue({ colSpanDesktop: 4, rowSpanDesktop: 1, colSpanTablet: 3, colSpanMobile: 1 });
        break;
      case 'half':
        this.currentItemForm.patchValue({ colSpanDesktop: 6, rowSpanDesktop: 1, colSpanTablet: 3, colSpanMobile: 2 });
        break;
      case 'two-thirds':
        this.currentItemForm.patchValue({ colSpanDesktop: 8, rowSpanDesktop: 1, colSpanTablet: 6, colSpanMobile: 2 });
        break;
      case 'full':
        this.currentItemForm.patchValue({ colSpanDesktop: 12, rowSpanDesktop: 1, colSpanTablet: 6, colSpanMobile: 2 });
        break;
      case 'tall':
        this.currentItemForm.patchValue({ colSpanDesktop: 6, rowSpanDesktop: 2, colSpanTablet: 3, colSpanMobile: 2 });
        break;
    }
  }

  onImageDesktopSelected(file: File) {
    if (this.currentItemForm) {
      this.currentItemForm.patchValue({ imageDesktop: file });
      this.currentItemForm.get('imageDesktop')?.markAsDirty();
    }
  }

  onImageMobileSelected(file: File) {
    if (this.currentItemForm) {
      this.currentItemForm.patchValue({ imageMobile: file });
      this.currentItemForm.get('imageMobile')?.markAsDirty();
    }
  }

  getPreviewUrl(index: number): string | null {
    const item = this.itemsFormArray.at(index);
    if (!item) return null;
    const img = item.get('imageDesktop')?.value;
    if (!img) return null;
    if (typeof img === 'string') return img;
    if (img instanceof File) return URL.createObjectURL(img);
    if (typeof img === 'object' && 'url' in img) return img.url;
    return null;
  }

  async onSubmit() {
    if (this.visualMenuForm.invalid) {
      this.visualMenuForm.markAllAsTouched();
      this.#notificationsService.warning('Completá los campos requeridos antes de guardar.');
      return;
    }

    this.loading.set(true);

    try {
      const formData = new FormData();
      formData.append('sectionTitle', this.visualMenuForm.get('sectionTitle')?.value || '');
      formData.append('sectionSubtitle', this.visualMenuForm.get('sectionSubtitle')?.value || '');
      formData.append('description', this.visualMenuForm.get('description')?.value || '');
      formData.append('displayMode', this.visualMenuForm.get('displayMode')?.value || 'grid');

      const itemsRaw = this.itemsFormArray.value;
      const itemsPayload: any[] = [];

      itemsRaw.forEach((item: any, index: number) => {
        let imageDesktopPayload: any = item.imageDesktop;
        let imageMobilePayload: any = item.imageMobile;

        if (item.imageDesktop instanceof File) {
          formData.append(`item_${index}_imageDesktop`, item.imageDesktop);
          imageDesktopPayload = null;
        }

        if (item.imageMobile instanceof File) {
          formData.append(`item_${index}_imageMobile`, item.imageMobile);
          imageMobilePayload = null;
        }

        itemsPayload.push({
          _id: item._id,
          title: item.title,
          subtitle: item.subtitle,
          badge: item.badge,
          link: item.link,
          colSpanDesktop: Number(item.colSpanDesktop) || 6,
          colSpanTablet: Number(item.colSpanTablet) || 3,
          colSpanMobile: Number(item.colSpanMobile) || 2,
          rowSpanDesktop: Number(item.rowSpanDesktop) || 1,
          order: Number(item.order) || index + 1,
          isActive: item.isActive,
          imageDesktop: imageDesktopPayload,
          imageMobile: imageMobilePayload,
          children: item.children || []
        });
      });

      formData.append('items', JSON.stringify(itemsPayload));

      await this.#visualMenuService.saveVisualMenu(formData);
      this.#notificationsService.success('Menú visual guardado correctamente');
      
      // Recargar datos actualizados
      await this.ngOnInit();
    } catch (error: any) {
      this.#notificationsService.error(error.message || 'Error al guardar el Menú Visual');
    } finally {
      this.loading.set(false);
    }
  }
}
