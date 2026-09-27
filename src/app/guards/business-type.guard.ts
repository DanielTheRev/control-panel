import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { BusinessProfileService } from '../services/business-profile.service';
import { BusinessType } from '../interfaces/config.interface';

/**
 * Functional guard que restringe el acceso a rutas según el rubro o tipo de comercio.
 * Si el comercio no pertenece a los tipos permitidos, redirige a su pantalla principal.
 */
export const businessTypeGuard = (allowedTypes: BusinessType[]): CanActivateFn => {
  return () => {
    const profile = inject(BusinessProfileService);
    const router = inject(Router);

    const currentType = profile.businessType();
    if (allowedTypes.includes(currentType) || currentType === 'general') {
      return true;
    }

    return router.createUrlTree([profile.defaultLandingRoute()]);
  };
};
