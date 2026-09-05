import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { PageLayout } from '../../shared/components/page-layout/page-layout';
import { SidebarService } from '../../services/sidebar.service';
import { MenuService } from '../../services/menu.service';
import { IMenu } from '../../interfaces/menu.interface';

@Component({
  selector: 'app-menu-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatIconModule,
    MatButtonModule,
    PageLayout,
    PageHeader
  ],
  templateUrl: './menu-list.html',
  styleUrl: './menu-list.scss'
})
export class MenuListComponent implements OnInit {
  private menuService = inject(MenuService);
  private sidebarService = inject(SidebarService);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);

  menus = signal<IMenu[]>([]);
  isLoading = signal(true);

  constructor() {
    this.sidebarService.navbarTitle.set({
      title: 'Menús de Navegación'
    });
  }

  ngOnInit(): void {
    this.loadMenus();
  }

  async loadMenus(): Promise<void> {
    this.isLoading.set(true);
    try {
      const list = await this.menuService.getMenus();
      this.menus.set(list);
    } catch (err) {
      console.error(err);
      this.snackBar.open('Error al cargar la lista de menús', 'Cerrar', { duration: 3000 });
    } finally {
      this.isLoading.set(false);
    }
  }

  async deleteMenu(menu: IMenu): Promise<void> {
    if (!menu._id) return;
    if (confirm(`¿Estás seguro de que deseas eliminar el menú "${menu.name}"?`)) {
      try {
        await this.menuService.deleteMenu(menu._id);
        this.snackBar.open('Menú eliminado correctamente', 'Cerrar', { duration: 3000 });
        this.loadMenus();
      } catch (err) {
        console.error(err);
        this.snackBar.open('Error al eliminar el menú', 'Cerrar', { duration: 3000 });
      }
    }
  }

  copySlug(slug: string): void {
    navigator.clipboard.writeText(slug);
    this.snackBar.open(`Slug "${slug}" copiado al portapapeles`, 'Cerrar', { duration: 2000 });
  }
}
