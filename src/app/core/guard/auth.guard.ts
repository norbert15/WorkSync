import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { of } from 'rxjs';

import { AuthFirebaseService } from '../../services/firebase/auth-firebase.service';
import { APP_PATHS } from '../constans/paths';

export const authGuard: CanActivateFn = (route, state) => {
  const authFirebaseService = inject(AuthFirebaseService);
  const router = inject(Router);

  const userPayload = authFirebaseService.decodeAccessToken();

  if (userPayload && userPayload.userId) {
    return of(true);
  }

  return router.navigate([APP_PATHS.login]);
};
