import { computed, Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class SidebarService {
  private Expanded = signal(true);
  public mobileOpen = signal(false);

  navbarTitle = signal({
    title: 'Dashboard',
  });

  constructor() {
    const isExpanded = localStorage.getItem('sidebar-expanded');
    // En pantallas grandes default a expandido (true), en mobile cerrado
    this.Expanded.set(isExpanded !== null ? isExpanded === 'true' : true);
  }

  SidebarStatus = computed(() => ({
    isExpanded: this.Expanded(),
    isCollapsed: !this.Expanded(),
    isMobileOpen: this.mobileOpen(),
  }));

  public toggleExpanded() {
    this.Expanded.update((state) => {
      const newState = !state;
      localStorage.setItem('sidebar-expanded', newState.toString());
      return newState;
    });
  }

  public toggleMobile() {
    this.mobileOpen.update((open) => !open);
  }

  public closeMobile() {
    this.mobileOpen.set(false);
  }

  public openMobile() {
    this.mobileOpen.set(true);
  }
}
