import { Component, ElementRef, OnInit, Renderer2, inject } from '@angular/core';

@Component({
  selector: 'app-page-layout',
  imports: [],
  templateUrl: './page-layout.html',
  styleUrl: './page-layout.scss',
})
export class PageLayout implements OnInit {
  #el = inject(ElementRef);
  #renderer = inject(Renderer2);

  ngOnInit() {
    const parent = this.#el.nativeElement.parentElement;
    if (parent) {
      this.#renderer.addClass(parent, 'flex');
      this.#renderer.addClass(parent, 'flex-col');
      this.#renderer.addClass(parent, 'h-full');
      this.#renderer.addClass(parent, 'w-full');
    }
  }
}
