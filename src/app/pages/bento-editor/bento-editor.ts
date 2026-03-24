import { NgClass } from '@angular/common';
import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { SidebarService } from '../../services/sidebar.service';
import { NotificationsService } from '../../services/notifications.service';
import { BentoService } from '../../services/bento.service';
import { IBentoConfig, IBentoBlock } from '../../interfaces/bento.interface';
import { PageHeader } from "../../shared/components/page-header/page-header";
import { PageLayout } from "../../shared/components/page-layout/page-layout";
import { SingleImageUpload } from '../../shared/components/single-image-upload/single-image-upload';

type BlockKey = 'mainBlock' | 'topRightBlock' | 'bottomRightBlock' | 'footerBlock';

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

  selectedBlock = signal<BlockKey | null>(null);
  loading = signal(true);
  originalConfig: IBentoConfig | null = null;

  bentoForm: FormGroup = this.#fb.group({
    sectionTitle: ['Vura / Catálogo', Validators.required],
    sectionSubtitle: ['Explorá la Colección.', Validators.required],
    blocks: this.#fb.group({
      mainBlock: this.createBlockGroup(),
      topRightBlock: this.createBlockGroup(),
      bottomRightBlock: this.createBlockGroup(),
      footerBlock: this.createBlockGroup()
    })
  });

  constructor() {
    this.#sidebarService.navbarTitle.set({
      title: 'Editor de Bento'
    });
  }

  async ngOnInit() {
    this.loading.set(true);
    try {
      const config = await this.#bentoService.getBentoConfig();
      if (config) {
        this.originalConfig = config;
        this.bentoForm.patchValue({
          sectionTitle: config.sectionTitle,
          sectionSubtitle: config.sectionSubtitle
        });

        const keys: BlockKey[] = ['mainBlock', 'topRightBlock', 'bottomRightBlock', 'footerBlock'];
        for (const key of keys) {
          const blockContent = config.blocks[key];
          this.blocksForm.get(key)?.patchValue({
            title: blockContent.title,
            subtitle: blockContent.subtitle,
            link: blockContent.link,
            isActive: blockContent.isActive,
            imageDesktop: blockContent.imageDesktop?.url || null,
            imageMobile: blockContent.imageMobile?.url || null
          });
        }
      } else {
        this.bentoForm.patchValue({
          sectionTitle: 'Crea tu primer Bento',
          sectionSubtitle: 'Explorá la Colección.'
        });
      }
    } catch (e) {
      console.error('Error fetching config', e);
      this.#notificationsService.error('Hubo un error al cargar la configuración.');
    } finally {
      this.loading.set(false);
    }
  }

  createBlockGroup(): FormGroup {
    return this.#fb.group({
      title: ['', Validators.required],
      subtitle: [''],
      link: ['', Validators.required],
      imageDesktop: [null, Validators.required],
      imageMobile: [null, Validators.required],
      isActive: [true]
    });
  }

  get blocksForm(): FormGroup {
    return this.bentoForm.get('blocks') as FormGroup;
  }

  get currentBlockForm(): FormGroup | null {
    if (!this.selectedBlock()) return null;
    return this.blocksForm.get(this.selectedBlock()!) as FormGroup;
  }

  getControl(controlName: string): FormControl {
    // Return a dummy disabled control if no block is selected to prevent template crash before @if kicks in
    if (!this.currentBlockForm) return new FormControl({ value: null, disabled: true });
    return this.currentBlockForm.get(controlName) as FormControl;
  }

  #objectUrlCache = new WeakMap<File, string>();

  getPreviewUrl(blockKey: BlockKey): string | null {
    const val = this.blocksForm.get(blockKey)?.get('imageDesktop')?.value;
    if (val instanceof File) {
      if (!this.#objectUrlCache.has(val)) {
        this.#objectUrlCache.set(val, URL.createObjectURL(val));
      }
      return this.#objectUrlCache.get(val)!;
    }
    if (typeof val === 'string' && val.trim() !== '') {
      return val;
    }
    return null;
  }

  selectBlock(block: BlockKey) {
    if (this.selectedBlock() === block) {
      this.selectedBlock.set(null);
    } else {
      this.selectedBlock.set(block);
    }
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

    // Clean blocks from File objects for stringification
    const blocksLimpio: Record<string, any> = {};
    const blockKeys: BlockKey[] = ['mainBlock', 'topRightBlock', 'bottomRightBlock', 'footerBlock'];

    for (const key of blockKeys) {
      const blockValue = formValue.blocks[key];
      const originalBlock = this.originalConfig ? this.originalConfig.blocks[key] : null;

      let imgDesktopPayload = null;
      if (blockValue.imageDesktop instanceof File) {
        imgDesktopPayload = null;
      } else if (originalBlock && originalBlock.imageDesktop && blockValue.imageDesktop === originalBlock.imageDesktop.url) {
        imgDesktopPayload = originalBlock.imageDesktop;
      } else if (typeof blockValue.imageDesktop === 'string' && blockValue.imageDesktop.trim() !== '') {
        imgDesktopPayload = { url: blockValue.imageDesktop };
      }

      let imgMobilePayload = null;
      if (blockValue.imageMobile instanceof File) {
        imgMobilePayload = null;
      } else if (originalBlock && originalBlock.imageMobile && blockValue.imageMobile === originalBlock.imageMobile.url) {
        imgMobilePayload = originalBlock.imageMobile;
      } else if (typeof blockValue.imageMobile === 'string' && blockValue.imageMobile.trim() !== '') {
        imgMobilePayload = { url: blockValue.imageMobile };
      }

      blocksLimpio[key] = {
        title: blockValue.title,
        subtitle: blockValue.subtitle,
        link: blockValue.link,
        isActive: blockValue.isActive,
        imageDesktop: imgDesktopPayload,
        imageMobile: imgMobilePayload
      };

      // Append actual File objects to formData for Multer
      if (blockValue.imageDesktop instanceof File) {
        formData.append(`${key}_imageDesktop`, blockValue.imageDesktop);
      }
      if (blockValue.imageMobile instanceof File) {
        formData.append(`${key}_imageMobile`, blockValue.imageMobile);
      }
    }

    formData.append('blocks', JSON.stringify(blocksLimpio));

    try {
      const response = await this.#bentoService.saveBentoConfig(formData);
      this.originalConfig = response; // Update local config
      this.#notificationsService.success('Bento guardado correctamente');
    } catch (error) {
      console.error('Error saving bento', error);
      this.#notificationsService.error('Error al guardar el Bento');
    } finally {
      this.loading.set(false);
    }
  }
}
