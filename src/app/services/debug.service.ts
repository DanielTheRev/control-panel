import { Injectable, isDevMode } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DebugService {
  readonly isDev = !environment.production || isDevMode();

  log(...args: any[]): void {
    if (this.isDev) {
      console.log(...args);
    }
  }

  info(...args: any[]): void {
    if (this.isDev) {
      console.info(...args);
    }
  }

  warn(...args: any[]): void {
    if (this.isDev) {
      console.warn(...args);
    }
  }

  error(...args: any[]): void {
    if (this.isDev) {
      console.error(...args);
    }
  }

  debug(...args: any[]): void {
    if (this.isDev) {
      console.debug(...args);
    }
  }

  table(...args: any[]): void {
    if (this.isDev) {
      console.table(...args);
    }
  }

  group(label: string): void {
    if (this.isDev) {
      console.group(label);
    }
  }

  groupEnd(): void {
    if (this.isDev) {
      console.groupEnd();
    }
  }
}
