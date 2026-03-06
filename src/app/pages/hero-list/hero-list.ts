import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { RouterModule } from '@angular/router';
import { SidebarService } from '../../services/sidebar.service';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { PageLayout } from '../../shared/components/page-layout/page-layout';
import { HeroStateService } from '../../states/hero.state.service';

@Component({
  selector: 'app-hero-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatTableModule,
    MatIconModule,
    MatSlideToggleModule,
    MatMenuModule,
    PageLayout,
    PageHeader,
    MatSnackBarModule
  ],
  templateUrl: './hero-list.html',
  styleUrl: './hero-list.css',
})
export class HeroListComponent {
  #SidebarService = inject(SidebarService);
  #heroStateService = inject(HeroStateService);
  #snackBar = inject(MatSnackBar);

  state = this.#heroStateService.state;
  displayedColumns = ['image', 'title', 'order', 'status', 'actions'];

  constructor() {
    this.#SidebarService.navbarTitle.set({
      title: 'Sliders'
    });
  }


  async deleteSlide(id: string) {
    if (confirm('¿Estás seguro de eliminar este slide?')) {
      await this.#heroStateService.deleteSlide(id);
      this.showMessage('Slide eliminado');
    }
  }


  showMessage(msg: string) {
    this.#snackBar.open(msg, 'Cerrar', { duration: 3000 });
  }
}
