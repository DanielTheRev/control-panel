import { NgClass } from '@angular/common';
import { Component, inject, signal, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { SidebarService } from '../../services/sidebar.service';
import { NotificationsService } from '../../services/notifications.service';
import { BentoService } from '../../services/bento.service';
import { IBentoConfig, IBentoItem } from '../../interfaces/bento.interface';
import { PageHeader } from "../../shared/components/page-header/page-header";
import { PageLayout } from "../../shared/components/page-layout/page-layout";
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
  #bentoService = inject(BentoService);

  selectedIndex = signal<number | null>(null);
  loading = signal(true);
  originalConfig: IBentoConfig | null = null;

  bentoForm: FormGroup = this.#fb.group({
    sectionTitle: ['Vura / Catálogo', Validators.required],
    sectionSubtitle: ['Explorá la Colección.', Validators.required],
    items: this.#fb.array([])
  });

  constructor() {
    this.#sidebarService.navbarTitle.set({
      title: 'Editor de Bento Grid'
    });
  }

  get itemsFormArray(): FormArray {
    return this.bentoForm.get('items') as FormArray;
  }

  get currentItemForm(): FormGroup | null {
    if (this.selectedIndex() === null) return null;
    return this.itemsFormArray.at(this.selectedIndex()!) as FormGroup;
  }

  createItemFormGroup(item?: Partial<IBentoItem>): FormGroup {
    return this.#fb.group({
      title: [item?.title || '', Validators.required],
      subtitle: [item?.subtitle || ''],
      link: [item?.link || '/products', Validators.required],
      gridSpan: [item?.gridSpan || 'main'],
      order: [item?.order || 0],
      imageDesktop: [item?.imageDesktop && typeof item.imageDesktop === 'object' && 'url' in item.imageDesktop ? (item.imageDesktop as any).url : (item?.imageDesktop || null), Validators.required],
      imageMobile: [item?.imageMobile && typeof item.imageMobile === 'object' && 'url' in item.imageMobile ? (item.imageMobile as any).url : (item?.imageMobile || null)],
      isActive: [item?.isActive !== false]
    });
  }

  async ngOnInit() {
    this.loading.set(true);
    try {
      const config = await this.#bentoService.getBentoConfig();
      if (config) {
        this.originalConfig = config;
        this.bentoForm.patchValue({
          sectionTitle: config.sectionTitle || 'Vura / Catálogo',
          sectionSubtitle: config.sectionSubtitle || 'Explorá la Colección.'
        });

        this.itemsFormArray.clear();

        const itemsToLoad: any[] = (config.items && config.items.length > 0)
          ? config.items
          : this.mapBlocksToItems(config.blocks);

        if (itemsToLoad.length > 0) {
          itemsToLoad.forEach(item => {
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
      console.error('Error fetching config', e);
      this.#notificationsService.error('Hubo un error al cargar la configuración del Bento.');
      this.addDefaultItems();
    } finally {
      this.loading.set(false);
    }
  }

  mapBlocksToItems(blocks: any): any[] {
    if (!blocks) return [];
    const res = [];
    if (blocks.mainBlock) res.push({ ...blocks.mainBlock, gridSpan: 'main', order: 1 });
    if (blocks.topRightBlock) res.push({ ...blocks.topRightBlock, gridSpan: 'top-right', order: 2 });
    if (blocks.bottomRightBlock) res.push({ ...blocks.bottomRightBlock, gridSpan: 'bottom-right', order: 3 });
    if (blocks.footerBlock) res.push({ ...blocks.footerBlock, gridSpan: 'full-width', order: 4 });
    return res;
  }

  addDefaultItems() {
    this.itemsFormArray.clear();
    this.itemsFormArray.push(this.createItemFormGroup({ title: 'Hombre', subtitle: 'Colección 2026', link: '/products?gender=Hombre', gridSpan: 'main', imageDesktop: '/productsMock/bento-1.jpeg' }));
    this.itemsFormArray.push(this.createItemFormGroup({ title: 'Mujer', subtitle: 'Tendencia', link: '/products?gender=Mujer', gridSpan: 'top-right', imageDesktop: '/productsMock/campera.webp' }));
    this.itemsFormArray.push(this.createItemFormGroup({ title: 'Poleras & Abrigos', subtitle: 'Esenciales', link: '/products?category=Poleras', gridSpan: 'bottom-right', imageDesktop: '/productsMock/hero image 2.png' }));
    this.itemsFormArray.push(this.createItemFormGroup({ title: 'Archive Sale.', subtitle: 'Hasta 40% OFF', link: '/products?tags=archive-sale', gridSpan: 'full-width', imageDesktop: '/productsMock/remera wanama manga larga.webp' }));
    this.selectedIndex.set(0);
  }

  addItem() {
    const newItem = this.createItemFormGroup({
      title: 'Nueva Categoría',
      subtitle: 'Destacado',
      link: '/products',
      gridSpan: 'half',
      imageDesktop: null
    });
    this.itemsFormArray.push(newItem);
    this.selectedIndex.set(this.itemsFormArray.length - 1);
  }

  removeItem(index: number, event?: Event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (this.itemsFormArray.length <= 1) {
      this.#notificationsService.warning('Debes mantener al menos una tarjeta en el Bento.');
      return;
    }
    this.itemsFormArray.removeAt(index);
    if (this.selectedIndex() === index) {
      this.selectedIndex.set(Math.max(0, index - 1));
    } else if (this.selectedIndex() !== null && this.selectedIndex()! > index) {
      this.selectedIndex.set(this.selectedIndex()! - 1);
    }
    this.#notificationsService.info('Tarjeta eliminada.');
  }

  moveItemUp(index: number, event?: Event) {
    if (event) event.stopPropagation();
    if (index <= 0) return;
    const current = this.itemsFormArray.at(index);
    this.itemsFormArray.removeAt(index);
    this.itemsFormArray.insert(index - 1, current);
    this.selectedIndex.set(index - 1);
  }

  moveItemDown(index: number, event?: Event) {
    if (event) event.stopPropagation();
    if (index >= this.itemsFormArray.length - 1) return;
    const current = this.itemsFormArray.at(index);
    this.itemsFormArray.removeAt(index);
    this.itemsFormArray.insert(index + 1, current);
    this.selectedIndex.set(index + 1);
  }

  getControl(controlName: string): FormControl {
    if (!this.currentItemForm) return new FormControl({ value: null, disabled: true });
    return this.currentItemForm.get(controlName) as FormControl;
  }

  #objectUrlCache = new WeakMap<File, string>();

  getPreviewUrl(index: number): string | null {
    const itemGroup = this.itemsFormArray.at(index) as FormGroup;
    if (!itemGroup) return null;
    const val = itemGroup.get('imageDesktop')?.value;
    if (val instanceof File) {
      if (!this.#objectUrlCache.has(val)) {
        this.#objectUrlCache.set(val, URL.createObjectURL(val));
      }
      return this.#objectUrlCache.get(val)!;
    }
    if (typeof val === 'string' && val.trim() !== '') {
      return val;
    }
    if (val && typeof val === 'object' && val.url) {
      return val.url;
    }
    return null;
  }

  selectItem(index: number) {
    this.selectedIndex.set(index);
  }

  async onSubmit() {
    if (this.bentoForm.invalid) {
      this.#notificationsService.warning('Por favor completa todos los campos requeridos.');
      return;
    }

    this.loading.set(true);
    const formData = new FormData();
    const formValue = this.bentoForm.value;

    formData.append('sectionTitle', formValue.sectionTitle);
    formData.append('sectionSubtitle', formValue.sectionSubtitle);

    const itemsPayload: any[] = [];

    this.itemsFormArray.controls.forEach((ctrl, index) => {
      const itemVal = ctrl.value;
      const originalItem = (this.originalConfig?.items && this.originalConfig.items[index]) || null;

      let imgDesktopPayload = null;
      if (itemVal.imageDesktop instanceof File) {
        imgDesktopPayload = null;
        formData.append(`item_${index}_imageDesktop`, itemVal.imageDesktop);
      } else if (originalItem && originalItem.imageDesktop && typeof originalItem.imageDesktop === 'object' && 'url' in originalItem.imageDesktop && itemVal.imageDesktop === (originalItem.imageDesktop as any).url) {
        imgDesktopPayload = originalItem.imageDesktop;
      } else if (typeof itemVal.imageDesktop === 'string' && itemVal.imageDesktop.trim() !== '') {
        imgDesktopPayload = { url: itemVal.imageDesktop };
      }

      let imgMobilePayload = null;
      if (itemVal.imageMobile instanceof File) {
        imgMobilePayload = null;
        formData.append(`item_${index}_imageMobile`, itemVal.imageMobile);
      } else if (originalItem && originalItem.imageMobile && typeof originalItem.imageMobile === 'object' && 'url' in originalItem.imageMobile && itemVal.imageMobile === (originalItem.imageMobile as any).url) {
        imgMobilePayload = originalItem.imageMobile;
      } else if (typeof itemVal.imageMobile === 'string' && itemVal.imageMobile.trim() !== '') {
        imgMobilePayload = { url: itemVal.imageMobile };
      }

      itemsPayload.push({
        title: itemVal.title,
        subtitle: itemVal.subtitle,
        link: itemVal.link,
        gridSpan: itemVal.gridSpan,
        order: index + 1,
        isActive: itemVal.isActive,
        imageDesktop: imgDesktopPayload,
        imageMobile: imgMobilePayload
      });
    });

    formData.append('items', JSON.stringify(itemsPayload));

    try {
      const response = await this.#bentoService.saveBentoConfig(formData);
      this.originalConfig = response;
      this.#notificationsService.success('¡Bento Grid guardado correctamente!');
    } catch (error) {
      console.error('Error saving bento', error);
      this.#notificationsService.error('Error al guardar el Bento Grid');
    } finally {
      this.loading.set(false);
    }
  }
}
