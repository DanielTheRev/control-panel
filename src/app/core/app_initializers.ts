import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export function initializeAuth() {
  const authService = inject(AuthService);
  return new Promise((resolve) => {
    authService.initializeAuthState().subscribe({
      complete: () => {
        return resolve(true);
      },
    });
  });
}
