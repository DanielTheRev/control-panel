import { computed, Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class SidebarService {
  private Expanded = signal(true);

  SidebarStatus = computed(() => ({
    isExpanded: this.Expanded(),
    isCollapsed: this.Expanded() ? false : true,
  }));

  public toggleExpanded() {
    this.Expanded.update((state) => !state);
  }
}
