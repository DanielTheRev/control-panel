import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SwUpdate } from '@angular/service-worker';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, MatIcon],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  #swUpdate = inject(SwUpdate, { optional: true });

  readonly updateAvailable = signal<boolean>(false);
  readonly isUpdating = signal<boolean>(false);

  ngOnInit(): void {
    if (this.#swUpdate?.isEnabled) {
      // Escuchar cuando el ServiceWorker tenga una versión nueva lista
      this.#swUpdate.versionUpdates.subscribe((evt) => {
        if (evt.type === 'VERSION_READY') {
          this.updateAvailable.set(true);
        }
      });

      // Chequeo periódico de actualizaciones (cada 15 minutos y al volver a enfocar la pestaña)
      if (typeof window !== 'undefined') {
        setInterval(() => {
          this.#swUpdate?.checkForUpdate().catch(() => {});
        }, 15 * 60 * 1000);

        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            this.#swUpdate?.checkForUpdate().catch(() => {});
          }
        });
      }
    }
  }

  activateUpdate(): void {
    this.isUpdating.set(true);
    if (this.#swUpdate?.isEnabled) {
      this.#swUpdate
        .activateUpdate()
        .then(() => {
          document.location.reload();
        })
        .catch(() => {
          document.location.reload();
        });
    } else {
      document.location.reload();
    }
  }

  dismissUpdate(): void {
    this.updateAvailable.set(false);
  }
}
