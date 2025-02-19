import { Routes } from '@angular/router';

import { APP_PATHS } from './core/constans/paths';
import { USER_LAYOUT_ROUTES } from './core/components/user-layout/user-layout.routes';
import { authGuard } from './core/guard/auth.guard';

export const routes: Routes = [
  {
    path: APP_PATHS.login,
    loadComponent: () =>
      import('./components/public/login/login.component').then(
        (component) => component.LoginComponent,
      ),
  },
  {
    path: APP_PATHS.root,
    canActivate: [authGuard],
    loadComponent: () =>
      import('./core/components/user-layout/user-layout.component').then(
        (component) => component.UserLayoutComponent,
      ),
    children: USER_LAYOUT_ROUTES,
  },

  {
    path: '**',
    redirectTo: APP_PATHS.login,
  },
];
