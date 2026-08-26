import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ProductType } from '../../../interfaces/product.interface';
import { MatIcon } from '@angular/material/icon';
import { CommonModule } from '@angular/common';

interface ProductTypeOption {
  type: ProductType;
  label: string;
  subtitle: string;
  icon: string;
  accentClass: string;
  borderClass: string;
  bgClass: string;
  iconBg: string;
}

@Component({
  selector: 'app-product-type-selector',
  standalone: true,
  imports: [CommonModule, MatIcon, RouterLink],
  templateUrl: './product-type-selector.html',
})
export class ProductTypeSelector {
  readonly productTypes: ProductTypeOption[] = [
    {
      type: ProductType.TECH,
      label: 'Tecnología',
      subtitle: 'Smartphones, TVs, PCs, Auriculares',
      icon: 'devices',
      accentClass: 'text-primary',
      borderClass: 'hover:border-primary',
      bgClass: 'hover:bg-primary/5',
      iconBg: 'bg-primary/10 text-primary',
    },
    {
      type: ProductType.CLOTHING,
      label: 'Indumentaria & Calzado',
      subtitle: 'Remeras, Buzos, Pantalones, Zapatillas',
      icon: 'checkroom',
      accentClass: 'text-secondary',
      borderClass: 'hover:border-secondary',
      bgClass: 'hover:bg-secondary/5',
      iconBg: 'bg-secondary/10 text-secondary',
    },
    {
      type: ProductType.BEAUTY,
      label: 'Perfumería & Belleza',
      subtitle: 'Perfumes, Fragancias, Cosméticos, Skincare',
      icon: 'spa',
      accentClass: 'text-rose-500',
      borderClass: 'hover:border-rose-500',
      bgClass: 'hover:bg-rose-500/5',
      iconBg: 'bg-rose-500/10 text-rose-500',
    },
    {
      type: ProductType.GENERAL,
      label: 'General / Bazar & Kiosco',
      subtitle: 'Accesorios, Bazar, Almacén, Varios',
      icon: 'inventory_2',
      accentClass: 'text-amber-500',
      borderClass: 'hover:border-amber-500',
      bgClass: 'hover:bg-amber-500/5',
      iconBg: 'bg-amber-500/10 text-amber-500',
    },
  ];

  constructor(private router: Router) {}

  selectType(type: ProductType): void {
    this.router.navigate(['/home/products/create', type]);
  }
}
