import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CanActivateFn, Router } from '@angular/router';
import { filter, map, take } from 'rxjs';
import { BusinessFeatures, BusinessProfileService } from '../services/business-profile.service';
import { TenantBootstrapStateService } from '../states/tenant-bootstrap.state.service';

export function capabilityGuard(feature: keyof BusinessFeatures): CanActivateFn {
  return () => {
    const profile = inject(BusinessProfileService);
    const bootstrapState = inject(TenantBootstrapStateService);
    const router = inject(Router);

    const current = bootstrapState.state();
    if (!current.isLoading) {
      if (current.hasError || !current.hasData) {
        return false;
      }
      return profile.features()[feature]
        ? true
        : router.createUrlTree([profile.defaultLandingRoute()]);
    }

    return toObservable(bootstrapState.state).pipe(
      filter((s) => !s.isLoading),
      take(1),
      map((s) => {
        if (s.hasError || !s.hasData) {
          return false;
        }
        return profile.features()[feature]
          ? true
          : router.createUrlTree([profile.defaultLandingRoute()]);
      }),
    );
  };
}

export function addonGuard(addonId: string): CanActivateFn {
  return () => {
    const profile = inject(BusinessProfileService);
    const bootstrapState = inject(TenantBootstrapStateService);
    const router = inject(Router);

    const current = bootstrapState.state();
    if (!current.isLoading) {
      if (current.hasError || !current.hasData) {
        return false;
      }
      return profile.isAddonActive(addonId)
        ? true
        : router.createUrlTree([profile.defaultLandingRoute()]);
    }

    return toObservable(bootstrapState.state).pipe(
      filter((s) => !s.isLoading),
      take(1),
      map((s) => {
        if (s.hasError || !s.hasData) {
          return false;
        }
        return profile.isAddonActive(addonId)
          ? true
          : router.createUrlTree([profile.defaultLandingRoute()]);
      }),
    );
  };
}
