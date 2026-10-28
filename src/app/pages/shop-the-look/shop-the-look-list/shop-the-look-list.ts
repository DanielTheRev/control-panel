import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink, RouterModule } from '@angular/router';
import { SidebarService } from '../../../services/sidebar.service';
import { NotificationsService } from '../../../services/notifications.service';
import { PageHeader } from '../../../shared/components/page-header/page-header';
import { PageLayout } from '../../../shared/components/page-layout/page-layout';
import { ShopTheLookStateService } from '../../../states/shop-the-look.state.service';
import { getStoreUrl } from '../../../utils/tenant.utils';
import { IShopTheLook } from '../../../interfaces/shop-the-look.interface';

@Component({
  selector: 'app-shop-the-look-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    RouterLink,
    MatIconModule,
    PageLayout,
    PageHeader,
  ],
  templateUrl: './shop-the-look-list.html',
})
export class ShopTheLookListComponent implements OnInit {
  #sidebarService = inject(SidebarService);
  #shopTheLookState = inject(ShopTheLookStateService);
  #notificationService = inject(NotificationsService);

  campaigns = this.#shopTheLookState.campaigns;
  updatingScoreId = signal<string | null>(null);
  isResettingAll = signal<boolean>(false);
  resettingLookId = signal<string | null>(null);

  constructor() {
    this.#sidebarService.navbarTitle.set({
      title: 'Outfits · Shop The Look',
    });
  }

  ngOnInit() {}

  getCoverImage(look: IShopTheLook): string {
    return look.gallery?.[0]?.url || '';
  }

  getProductsCount(look: IShopTheLook): number {
    return look.products?.length || 0;
  }

  getPhotosCount(look: IShopTheLook): number {
    return look.gallery?.length || 0;
  }

  onImageError(event: Event) {
    const target = event.target as HTMLImageElement;
    target.style.display = 'none';
    const parent = target.parentElement;
    if (parent && !parent.querySelector('.broken-image-alert')) {
      const alert = document.createElement('div');
      alert.className =
        'broken-image-alert w-full h-full flex flex-col items-center justify-center bg-error/15 border-2 border-dashed border-error/40 text-error p-4 text-center';
      alert.innerHTML =
        '<span style="font-size: 26px; margin-bottom: 4px;">⚠️</span><span style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em;">Foto Rota (404)</span><span style="font-size: 9px; opacity: 0.8; margin-top: 2px;">La imagen no existe en Cloudinary</span>';
      parent.appendChild(alert);
    }
  }

  async resetAllLooksRanking(resetBaseTo100: boolean = false) {
    const confirmMsg = resetBaseTo100
      ? "¿Estás seguro de restablecer TODOS los outfits a ELO 100 y limpiar métricas?"
      : "¿Estás seguro de reiniciar el ELO de todos los outfits a su puntaje base y limpiar métricas?";
    if (!confirm(confirmMsg)) return;

    this.isResettingAll.set(true);
    try {
      const res = await this.#shopTheLookState.resetAllRankingScores(resetBaseTo100);
      this.#notificationService.success(res.message || "Puntajes ELO de outfits reiniciados a base");
    } catch {
      this.#notificationService.error("Error al reiniciar los puntajes ELO");
    } finally {
      this.isResettingAll.set(false);
    }
  }

  async resetSingleLookRanking(look: IShopTheLook, resetBaseTo100: boolean = false) {
    if (!look._id) return;
    this.resettingLookId.set(look._id);
    try {
      await this.#shopTheLookState.resetLookRankingScore(look._id, resetBaseTo100);
      const targetBase = resetBaseTo100 ? 100 : (look.rankingScore ?? 100);
      this.#notificationService.success(`ELO de "${look.name || look.title}" reiniciado a su base (${targetBase})`);
    } catch {
      this.#notificationService.error("Error al reiniciar el puntaje ELO del outfit");
    } finally {
      this.resettingLookId.set(null);
    }
  }

  async onScoreChange(look: IShopTheLook, newScoreRaw: any) {
    const newScore = Number(newScoreRaw);
    if (isNaN(newScore) || newScore < 0) return;
    if (look.rankingScore === newScore) return;

    this.updatingScoreId.set(look._id!);
    try {
      await this.#shopTheLookState.updateRankingScore(look._id!, newScore);
      this.#notificationService.success(
        `ELO de "${look.name || look.title}" actualizado a ${newScore}`
      );
    } catch {
      this.#notificationService.error('No se pudo actualizar el puntaje ELO');
    } finally {
      this.updatingScoreId.set(null);
    }
  }

  async copyLink(look: IShopTheLook) {
    const slug = look.slug || look._id;
    const url = `${getStoreUrl()}/shop-the-look/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      this.#notificationService.success(
        `Enlace de "${look.name || look.title}" copiado`,
      );
    } catch {
      this.#notificationService.error('No se pudo copiar al portapapeles');
    }
  }

  async deleteCampaign(id: string) {
    if (confirm('¿Estás seguro de eliminar este outfit?')) {
      try {
        await this.#shopTheLookState.deleteCampaign(id);
      } catch (error) {
        // Error manejado en servicio
      }
    }
  }
}
