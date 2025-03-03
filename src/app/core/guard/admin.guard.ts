import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { UserFirebaseService } from '../../services/firebase/user-firebase.service';
import { APP_PATHS } from '../constans/paths';
import { UserEnum } from '../constans/enums';

export const adminGuard: CanActivateFn = () => {
  const userFirebaseService = inject(UserFirebaseService);

  const user = userFirebaseService.user$.getValue();

  if (!user || user.role !== UserEnum.ADMINISTRATOR) {
    const router = inject(Router);

    return router.navigate([APP_PATHS.login]);
  }

  return true;
};
