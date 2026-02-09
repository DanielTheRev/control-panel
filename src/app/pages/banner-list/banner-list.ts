import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';
import { PageHeader } from "../../shared/components/page-header/page-header";
import { PageLayout } from "../../shared/components/page-layout/page-layout";
import { BannerStateService } from '../../states/banner.state.service';

@Component({
  selector: 'app-banner-list',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    RouterLink,
    PageLayout,
    PageHeader
  ],
  templateUrl: './banner-list.html',
  styleUrl: './banner-list.scss',
})
export class BannerList {
  readonly bannerService = inject(BannerStateService);
  #snackBar = inject(MatSnackBar);

  displayedColumns: string[] = ['Portada', 'Marca', 'Titulo', 'Posicion', 'Estado', 'Acciones'];


  refresh() {
    this.bannerService.refresh();
  }



  async deleteBanner(id: string) {
    if (confirm('¿Estás seguro de eliminar este banner?')) {
      try {
        await this.bannerService.deleteBanner(id);
        this.#snackBar.open('Banner eliminado', 'Close', { duration: 3000 });
      } catch (error) {
        console.log(error);
        this.#snackBar.open('Error al eliminar el banner', 'Close', { duration: 3000 });
      }
    }
  }
}
