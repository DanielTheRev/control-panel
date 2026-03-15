import { computed, Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class SidebarService {
  private Expanded = signal(localStorage.getItem('sidebar-expanded') || false);

  navbarTitle = signal({
    title: 'Dashboard',
  });

  SidebarStatus = computed(() => ({
    isExpanded: this.Expanded(),
    isCollapsed: this.Expanded() ? false : true,
  }));

  public toggleExpanded() {
    this.Expanded.update((state) => !state);
    localStorage.setItem('sidebar-expanded', this.Expanded().toString());
  }
}
