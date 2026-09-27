import { CanDeactivateFn } from '@angular/router';
import { Observable } from 'rxjs';

export interface CanComponentDeactivate {
  canDeactivate: () => boolean | Observable<boolean> | Promise<boolean>;
}

/**
 * Functional guard que intercepta la salida de una vista cuando hay cambios pendientes
 * sin guardar, permitiendo al componente mostrar una advertencia o modal y revertir
 * modificaciones transitorias si el usuario decide salir.
 */
export const unsavedChangesGuard: CanDeactivateFn<CanComponentDeactivate> = (component) => {
  if (component && typeof component.canDeactivate === 'function') {
    return component.canDeactivate();
  }
  return true;
};
