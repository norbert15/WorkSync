import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, of, switchMap } from 'rxjs';

import { UserFirebaseService } from '../../services/firebase/user-firebase.service';
import { AuthFirebaseService } from '../../services/firebase/auth-firebase.service';
import { APP_PATHS } from '../constans/paths';
import { IUser } from '../../models/user.model';
import { PopupService } from '../../services/popup.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authFirebaseService = inject(AuthFirebaseService);
  const popupService = inject(PopupService);
  const router = inject(Router);

  const userPayload = authFirebaseService.decodeAccessToken();

  if (userPayload && userPayload.userId) {
    const userFirebaseService = inject(UserFirebaseService);
    return userFirebaseService.getUserDetails(userPayload.userId).pipe(
      catchError(() => {
        popupService.add({
          details: 'Hiba történt a felhasználói adatok lekérdezése során.',
          severity: 'error',
        });
        return of(null);
      }),
      switchMap((result: IUser | null) => {
        if (!result) {
          return router.navigate([APP_PATHS.login]);
        }

        userFirebaseService.setUser(result);
        return of(true);
      }),
    );
  }

  return router.navigate([APP_PATHS.login]);
};
