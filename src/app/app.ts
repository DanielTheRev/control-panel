import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SwUpdate } from '@angular/service-worker';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  #swUpdate = inject(SwUpdate, { optional: true });

  ngOnInit(): void {
    if (this.#swUpdate?.isEnabled) {
      this.#swUpdate.versionUpdates.subscribe((evt) => {
        if (evt.type === 'VERSION_READY') {
          this.#swUpdate?.activateUpdate().then(() => {
            document.location.reload();
          });
        }
      });
    }
  }
}
