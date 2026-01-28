import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const redirectLoggedUserGuard: CanActivateFn = (route, state) => {
  const UserState = inject(AuthService);
  const _Router = inject(Router);
  if (UserState.authState().isAuthenticated) {
    _Router.navigate(['home']);
    return false;
  }
  return true;
};
