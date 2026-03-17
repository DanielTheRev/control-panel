import { httpResource } from '@angular/common/http';
import { computed, inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { CashRegisterService, CashRegisterSession } from '../services/cash-register.service';
import { NotificationsService } from '../services/notifications.service';

@Injectable({
  providedIn: 'root',
})
export class CashRegisterStoreService {
  #cashService = inject(CashRegisterService);
  #notificationService = inject(NotificationsService);

  // httpResource for the current session
  #fetchedSession = httpResource<CashRegisterSession>(() => `${environment.apiUrl}/cash-register/current`);

  // Public computed state
  readonly session = computed(() => this.#fetchedSession.value());
  readonly isLoading = computed(() => this.#fetchedSession.isLoading());
  readonly hasError = computed(() => !!this.#fetchedSession.error());
  readonly hasData = computed(() => !!this.#fetchedSession.value());

  async openSession(initialBalance: number) {
    try {
      const newSession = await this.#cashService.openSession(initialBalance);
      this.#fetchedSession.set(newSession);
      this.#notificationService.success('Caja abierta exitosamente');
      return newSession;
    } catch (error: any) {
      const msg = error.error?.message || 'Error al abrir la caja';
      this.#notificationService.error(msg);
      throw error;
    }
  }

  async closeSession(actualCloseBalance: number, notes?: string) {
    try {
      const closedSession = await this.#cashService.closeSession(actualCloseBalance, notes);
      this.#fetchedSession.set(null as any); // Reset session after closing
      this.#notificationService.success('Caja cerrada exitosamente');
      // Reload to double check session status
      this.#fetchedSession.reload();
      return closedSession;
    } catch (error: any) {
      const msg = error.error?.message || 'Error al cerrar la caja';
      this.#notificationService.error(msg);
      throw error;
    }
  }

  refresh() {
    this.#fetchedSession.reload();
  }
}
