import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { GoogleAuthService } from '../../services/google/google-auth.service';

export const googleAuthInterceptor: HttpInterceptorFn = (req, next) => {
  const googleAuthService = inject(GoogleAuthService);
  const paylaod = googleAuthService.googleApiPayload$.getValue();

  if (paylaod && req.url.startsWith(environment.googleConfig.apiUrl)) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${paylaod.accessToken}`,
      },
    });
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && paylaod) {
        return googleAuthService.renewAccessToken(paylaod.refreshToken).pipe(
          switchMap((result) => {
            googleAuthService.setGoogleApiPayload(
              result.access_token ?? '',
              result.refresh_token ?? '',
            );

            req = req.clone({
              setHeaders: {
                Authorization: `Bearer ${result.access_token}`,
              },
            });
            return next(req);
          }),
        );
      }

      return throwError(() => error);
    }),
  );
};
