import { Component, computed, inject, linkedSignal, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { PageLayout } from '../../shared/components/page-layout/page-layout';
import { SidebarService } from '../../services/sidebar.service';
import { StoreConfigStateService } from '../../states/store.config.state.service';
import { NotificationsService } from '../../services/notifications.service';
import { MenuService } from '../../services/menu.service';
import { IMenu } from '../../interfaces/menu.interface';
import { IHomeSectionConfig, IHomeSectionsConfig } from '../../interfaces/config.interface';

interface SectionMeta {
  key: keyof IHomeSectionsConfig;
  name: string;
  badge: string;
  description: string;
  icon: string;
  hasLimit?: boolean;
  hasTitle?: boolean;
  hasMenu?: boolean;
  manageLink?: string;
  manageLabel?: string;
}

const DEFAULT_SECTIONS: IHomeSectionsConfig = {
  hero: { active: true, order: 1, title: 'Hero Principal' },
  trustBar: { active: true, order: 2, title: 'Beneficios' },
  news: { active: true, order: 3, title: 'Novedades', limit: 12 },
  categories: { active: true, order: 4, title: 'Categorías' },
  shopTheLook: { active: false, order: 5, title: 'Shop The Look' },
  brandSections: { active: false, order: 6, title: 'Marcas' },
  mostSales: { active: false, order: 7, title: 'Más Vendidos', limit: 8 },
  testimonials: { active: false, order: 8, title: 'Testimonios' },
};

@Component({
  selector: 'app-home-layout',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    RouterLink,
    PageHeader,
    PageLayout,
  ],
  templateUrl: './home-layout.html',
  styleUrl: './home-layout.scss',
})
export class HomeLayoutComponent implements OnInit {
  sidebarService = inject(SidebarService);
  configState = inject(StoreConfigStateService);
  notifications = inject(NotificationsService);
  menuService = inject(MenuService);

  isSaving = signal<boolean>(false);
  availableMenus = signal<IMenu[]>([]);

  // Definición de las 8 secciones modulares del Home de Vexx
  readonly sectionMetas: SectionMeta[] = [
    {
      key: 'hero',
      name: 'Hero Slider Principal',
      badge: 'Visual & Campañas',
      description: 'Carrusel principal en pantalla completa con slides publicitarios, llamados a la acción y enlaces de temporada.',
      icon: 'view_carousel',
      manageLink: '/home/hero',
      manageLabel: 'Gestionar Slides',
    },
    {
      key: 'trustBar',
      name: 'Barra de Beneficios (Trust Bar)',
      badge: 'Conversión',
      description: 'Barra destacada de confianza con cuotas sin interés automáticas, envíos gratis y seguridad bancaria.',
      icon: 'verified_user',
    },
    {
      key: 'news',
      name: 'Novedades Inteligentes',
      badge: 'Catálogo Dinámico',
      description: 'Muestra los productos destacados primero seguidos de los últimos ingresos al catálogo.',
      icon: 'auto_awesome',
      hasLimit: true,
      hasTitle: true,
    },
    {
      key: 'categories',
      name: 'Vitrina Visual (Menú Personalizado / Bento)',
      badge: 'Mosaico & Navegación',
      description: 'Mosaico visual de bloques con imágenes, enlaces y submenús. Podés diseñar tus propios menús en el gestor y elegir cuál mostrar aquí.',
      icon: 'dashboard',
      hasTitle: true,
      hasMenu: true,
      manageLink: '/home/menus',
      manageLabel: 'Gestionar Menús',
    },
    {
      key: 'shopTheLook',
      name: 'Shop The Look (Lookbooks)',
      badge: 'Inspiración & Outfits',
      description: 'Producciones editoriales y fotos de modelos con prendas etiquetadas interactivamente para compra directa.',
      icon: 'style',
      manageLink: '/home/shop-the-look',
      manageLabel: 'Gestionar Looks',
    },
    {
      key: 'brandSections',
      name: 'Vitrinas por Marca / Banners',
      badge: 'Multi-Marca / Sponsors',
      description: 'Banners horizontales que agrupan y filtran productos por marca, categoría o colección.',
      icon: 'loyalty',
      manageLink: '/home/banners',
      manageLabel: 'Gestionar Banners',
    },
    {
      key: 'mostSales',
      name: 'Más Vendidos',
      badge: 'Tendencias & Popularidad',
      description: 'Catálogo dinámico con los artículos más demandados por los clientes de la tienda.',
      icon: 'trending_up',
      hasLimit: true,
      hasTitle: true,
    },
    {
      key: 'testimonials',
      name: 'Testimonios & Reseñas',
      badge: 'Prueba Social',
      description: 'Carrusel de opiniones reales y valoraciones de clientes para generar confianza de compra.',
      icon: 'reviews',
    },
  ];

  // linkedSignal: Se inicializa limpiamente con los datos de configState sin bucles de efecto
  sections = linkedSignal<IHomeSectionsConfig>(() => {
    const saved = this.configState.StoreConfig().config?.homeLayout?.sections;
    if (!saved) return { ...DEFAULT_SECTIONS };

    const merged: IHomeSectionsConfig = { ...DEFAULT_SECTIONS };
    for (const meta of this.sectionMetas) {
      const savedSec = saved[meta.key];
      const defaultSec = DEFAULT_SECTIONS[meta.key];
      if (savedSec && defaultSec) {
        merged[meta.key] = {
          ...defaultSec,
          ...savedSec,
          active: savedSec.active ?? defaultSec.active,
        };
      }
    }
    return merged;
  });

  readonly activeSectionsCount = computed(() => {
    const s = this.sections();
    return Object.values(s).filter((sec) => sec?.active).length;
  });

  async ngOnInit(): Promise<void> {
    this.sidebarService.navbarTitle.set({ title: 'Diseño del Home' });
    try {
      const list = await this.menuService.getMenus();
      this.availableMenus.set(list || []);
    } catch (e) {
      console.warn('[HomeLayout] No se pudieron cargar los menús:', e);
    }
  }

  toggleSection(key: keyof IHomeSectionsConfig): void {
    this.sections.update((prev) => {
      const existing = prev[key] || { active: false, order: 1 };
      return {
        ...prev,
        [key]: {
          ...existing,
          active: !existing.active,
        },
      };
    });
  }

  updateLimit(key: keyof IHomeSectionsConfig, limit: number): void {
    this.sections.update((prev) => {
      const existing = prev[key] || { active: true, order: 1 };
      return {
        ...prev,
        [key]: {
          ...existing,
          limit: Math.max(1, limit || 4),
        },
      };
    });
  }

  updateTitle(key: keyof IHomeSectionsConfig, title: string): void {
    this.sections.update((prev) => {
      const existing = prev[key] || { active: true, order: 1 };
      return {
        ...prev,
        [key]: {
          ...existing,
          title,
        },
      };
    });
  }

  updateMenuSlug(key: keyof IHomeSectionsConfig, menuSlug: string): void {
    this.sections.update((prev) => {
      const existing = prev[key] || { active: true, order: 1 };
      return {
        ...prev,
        [key]: {
          ...existing,
          menuSlug,
        },
      };
    });
  }

  async saveLayout(): Promise<void> {
    this.isSaving.set(true);
    try {
      const payload = {
        homeLayout: {
          sections: this.sections(),
        },
      };
      const res = await this.configState.saveConfig(payload);
      if (res.success) {
        this.notifications.success('¡Diseño del Home guardado exitosamente!');
      }
    } catch (error) {
      this.notifications.error('Error al guardar la configuración del Home');
    } finally {
      this.isSaving.set(false);
    }
  }

  enableAll(): void {
    this.sections.update((prev) => {
      const updated: any = {};
      for (const meta of this.sectionMetas) {
        updated[meta.key] = {
          ...(prev[meta.key] || {}),
          active: true,
        };
      }
      return updated;
    });
    this.notifications.info('Todas las secciones han sido activadas (recordá Guardar Cambios)');
  }

  disableAll(): void {
    this.sections.update((prev) => {
      const updated: any = {};
      for (const meta of this.sectionMetas) {
        updated[meta.key] = {
          ...(prev[meta.key] || {}),
          active: false,
        };
      }
      return updated;
    });
    this.notifications.info('Todas las secciones han sido desactivadas (recordá Guardar Cambios)');
  }
}
