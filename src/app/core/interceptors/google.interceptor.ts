import { HttpInterceptorFn } from '@angular/common/http';

export const googleAuthInterceptor: HttpInterceptorFn = (req, next) => {
  /* const token = googleAuthService.getGoogleApiToken();

  if (token && req.url.startsWith(environment.googleApiUrl)) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  } */

  return next(req);
};
