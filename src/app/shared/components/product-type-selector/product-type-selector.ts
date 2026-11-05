import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ProductType } from '../../../interfaces/product.interface';
import {
  PRODUCT_TYPE_TO_ROUTE_SLUG,
  ProductCreateRouteSlug,
} from '../../../interfaces/business-vertical.interface';
import { BusinessProfileService } from '../../../services/business-profile.service';
import { PageLayout } from '../page-layout/page-layout';
import { PageHeader } from '../page-header/page-header';

export interface ProductTypeOption {
  type: ProductType;
  routeSlug: ProductCreateRouteSlug;
  title: string;
  subtitle: string;
  badge: string;
  icon: string;
  code: string;
  accentColor: string;
  iconBgClass: string;
  badgeClass: string;
  description: string;
  examples: string[];
  features: { icon: string; label: string }[];
  allowedBusinessLabels: string;
}

@Component({
  selector: 'app-product-type-selector',
  standalone: true,
  imports: [CommonModule, RouterLink, PageLayout, PageHeader],
  templateUrl: './product-type-selector.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductTypeSelector {
  private readonly router = inject(Router);
  readonly businessProfile = inject(BusinessProfileService);

  readonly ProductType = ProductType;

  readonly currentBusinessType = this.businessProfile.businessType;
  readonly businessLabel = this.businessProfile.businessTypeLabel;
  readonly primaryType = this.businessProfile.primaryProductType;
  readonly allowedTypes = this.businessProfile.allowedProductTypes;

  readonly pendingMismatchOption = signal<ProductTypeOption | null>(null);

  readonly options: ProductTypeOption[] = [
    {
      type: ProductType.KIOSK,
      routeSlug: PRODUCT_TYPE_TO_ROUTE_SLUG[ProductType.KIOSK],
      title: 'Kiosco & Almacén',
      subtitle: 'Mostrador Express, Código de Barras EAN-13 & Balanza',
      badge: '⚡ Carga Express 1 Pág',
      icon: 'storefront',
      code: 'TPL-KIOSK',
      accentColor: 'text-emerald-600 dark:text-emerald-400',
      iconBgClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      badgeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25',
      description:
        'Plantilla de una sola pantalla diseñada para alta rotación en mostrador: lectura con pistola lectora EAN-13, autocompletado de catálogo maestro, margen en vivo y soporte de venta por peso ($/Kg).',
      examples: [
        'Bebidas, golosinas, lácteos y almacén por código de barras',
        'Fiambres, quesos, panadería o cortes de carnicería por peso ($/Kg)',
        'Artículos de bazar, limpieza y perfumería comercial de mostrador',
      ],
      features: [
        { icon: 'qr_code_scanner', label: 'Escáner EAN-13 y catálogo maestro instantáneo' },
        { icon: 'calculate', label: 'Cálculo de costo, margen % y ganancia neta en vivo' },
        { icon: 'scale', label: 'Venta por unidad o fraccionada por balanza ($/Kg)' },
        { icon: 'bolt', label: 'Guardado continuo con tecla Enter para carga masiva' },
      ],
      allowedBusinessLabels: 'Kiosco, Almacén, Carnicería, Panadería, Gastronomía y Accesorios Tech',
    },
    {
      type: ProductType.CLOTHING,
      routeSlug: PRODUCT_TYPE_TO_ROUTE_SLUG[ProductType.CLOTHING],
      title: 'Indumentaria & Calzado',
      subtitle: 'Matriz de Talles, Curvas, Colores Hex & Galería por Variante',
      badge: 'Moda, Talles & Curvas',
      icon: 'checkroom',
      code: 'TPL-FASHION',
      accentColor: 'text-violet-600 dark:text-violet-400',
      iconBgClass: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
      badgeClass: 'bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/25',
      description:
        'Arquitectura matricial para tiendas de ropa, calzado y marroquinería: grilla de stock cruzando talles y colores, calce (fit), guía de medidas interactiva y fotos asignadas por color.',
      examples: [
        'Remeras, camisas, abrigos y vestidos con curva S a XXL',
        'Pantalones, jeans y calzado con numeración (24 al 45)',
        'Accesorios de moda con variantes cromáticas y lookbook',
      ],
      features: [
        { icon: 'grid_on', label: 'Matriz de stock combinando talles y colores hex' },
        { icon: 'photo_library', label: 'Galería fotográfica vinculada a cada variante de color' },
        { icon: 'straighten', label: 'Tabla de medidas en cm, calce (fit) y composición textil' },
        { icon: 'credit_card', label: 'Simulador de precio de lista, cuotas y transferencia' },
      ],
      allowedBusinessLabels: 'Indumentaria & Calzado',
    },
    {
      type: ProductType.TECH,
      routeSlug: PRODUCT_TYPE_TO_ROUTE_SLUG[ProductType.TECH],
      title: 'Tecnología & Celulares',
      subtitle: 'Ficha de Hardware, Capacidad GB/TB, Condición & Garantía',
      badge: 'Specs & Garantías',
      icon: 'devices',
      code: 'TPL-TECH',
      accentColor: 'text-sky-600 dark:text-sky-400',
      iconBgClass: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
      badgeClass: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/25',
      description:
        'Estructura técnica para comercios de electrónica, telefonía y computación: especificaciones de hardware (RAM, almacenamiento, procesador, pantalla), condición del equipo y garantía oficial.',
      examples: [
        'Smartphones y tablets por capacidad (128GB / 256GB / 512GB) y color',
        'Notebooks, consolas, monitores y componentes de hardware',
        'Equipos nuevos sellados, reacondicionados (refurbished) o seminuevos',
      ],
      features: [
        { icon: 'memory', label: 'Ficha estructurada de CPU, RAM, almacenamiento y pantalla' },
        { icon: 'verified_user', label: 'Estado del dispositivo y meses de garantía oficial' },
        { icon: 'sd_storage', label: 'Variantes por capacidad (GB/TB) y acabado estético' },
        { icon: 'qr_code', label: 'Trazabilidad por modelo técnico, número de parte y EAN/UPC' },
      ],
      allowedBusinessLabels: 'Tecnología & Celulares',
    },
    {
      type: ProductType.BEAUTY,
      routeSlug: PRODUCT_TYPE_TO_ROUTE_SLUG[ProductType.BEAUTY],
      title: 'Perfumería & Cosmética',
      subtitle: 'Pirámide Olfativa de Autor, Concentración & Volumen en ml',
      badge: 'Notas & Presentaciones ml',
      icon: 'spa',
      code: 'TPL-BEAUTY',
      accentColor: 'text-rose-600 dark:text-rose-400',
      iconBgClass: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
      badgeClass: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/25',
      description:
        'Plantilla especializada para perfumería fina y cosmética de autor: desglose de pirámide olfativa (notas de salida, corazón y fondo), concentración (EDP, EDT, Parfum) y envases por mililitros.',
      examples: [
        'Fragancias importadas y de autor (Eau de Parfum, Eau de Toilette, Extrait)',
        'Presentaciones múltiples por volumen (30ml, 50ml, 100ml, 200ml)',
        'Tratamientos dermocosméticos y líneas sensoriales',
      ],
      features: [
        { icon: 'air', label: 'Pirámide olfativa: notas de salida, corazón y fondo' },
        { icon: 'water_drop', label: 'Variantes por mililitros (ml) y concentración aromática' },
        { icon: 'wb_sunny', label: 'Perfil de estación recomendada, ocasión e intensidad' },
        { icon: 'auto_awesome', label: 'Storytelling sensorial y presentación de fragancia' },
      ],
      allowedBusinessLabels: 'Perfumería de Autor & Cosmética Especializada',
    },
  ];

  readonly sortedOptions = computed<ProductTypeOption[]>(() => {
    const primary = this.primaryType();
    const allowed = this.allowedTypes();
    return [...this.options].sort((a, b) => {
      if (a.type === primary) return -1;
      if (b.type === primary) return 1;
      const aAllowed = allowed.includes(a.type);
      const bAllowed = allowed.includes(b.type);
      if (aAllowed && !bAllowed) return -1;
      if (!aAllowed && bAllowed) return 1;
      return 0;
    });
  });

  readonly recommendedOption = computed<ProductTypeOption>(() => {
    const primary = this.primaryType();
    return this.options.find((o) => o.type === primary) || this.options[0];
  });

  isOptionAllowed(type: ProductType): boolean {
    return this.allowedTypes().includes(type);
  }

  isPrimaryOption(type: ProductType): boolean {
    return this.primaryType() === type;
  }

  onSelectOption(option: ProductTypeOption): void {
    if (this.isOptionAllowed(option.type)) {
      this.navigateToTemplate(option.routeSlug);
      return;
    }
    this.pendingMismatchOption.set(option);
  }

  confirmNavigateToRecommended(): void {
    const rec = this.recommendedOption();
    this.pendingMismatchOption.set(null);
    this.navigateToTemplate(rec.routeSlug);
  }

  confirmPreviewMismatch(): void {
    const target = this.pendingMismatchOption();
    if (!target) return;
    this.pendingMismatchOption.set(null);
    this.navigateToTemplate(target.routeSlug);
  }

  cancelMismatchModal(): void {
    this.pendingMismatchOption.set(null);
  }

  private navigateToTemplate(slug: ProductCreateRouteSlug): void {
    this.router.navigate(['/home/products/create', slug]);
  }
}
