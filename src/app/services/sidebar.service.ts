import { computed, Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class SidebarService {
  private Expanded = signal(false);

  navbarTitle = signal({
    title: 'Dashboard',
  });

  constructor() {
    const isExpanded = localStorage.getItem('sidebar-expanded');
    this.Expanded.set(isExpanded === 'true');
  }

  SidebarStatus = computed(() => ({
    isExpanded: this.Expanded(),
    isCollapsed: this.Expanded() ? false : true,
  }));

  public toggleExpanded() {
    this.Expanded.update((state) => {
      const newState = !state;
      localStorage.setItem('sidebar-expanded', newState.toString());
      return newState;
    });

  }
}
