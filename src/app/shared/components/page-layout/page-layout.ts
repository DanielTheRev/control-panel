import { Component, ElementRef, OnInit, Renderer2, inject, input } from '@angular/core';

@Component({
  selector: 'app-page-layout',
  imports: [],
  templateUrl: './page-layout.html',
  styleUrl: './page-layout.scss',
})
export class PageLayout implements OnInit {
  #el = inject(ElementRef);
  #renderer = inject(Renderer2);

  /**
   * Cuando `flush` es `true`, el contenedor de contenido no agrega padding exterior,
   * permitiendo vistas de borde a borde (tablas full-bleed, barras de herramientas continuas, etc.).
   * Por defecto es `false` para que las páginas estándar tengan respiración interna (`p-4 sm:p-6`)
   * mientras su `app-page-header` y la barra de scroll se mantienen de borde a borde.
   */
  flush = input<boolean>(false);

  ngOnInit() {
    let parent: HTMLElement | null = this.#el.nativeElement.parentElement;
    while (parent && parent.tagName.startsWith('APP-')) {
      this.#renderer.addClass(parent, 'flex');
      this.#renderer.addClass(parent, 'flex-col');
      this.#renderer.addClass(parent, 'h-full');
      this.#renderer.addClass(parent, 'w-full');
      this.#renderer.addClass(parent, 'min-h-0');
      parent = parent.parentElement;
    }
  }
}
