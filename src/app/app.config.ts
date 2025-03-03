import {
  APP_INITIALIZER,
  ApplicationConfig,
  provideExperimentalZonelessChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { googleAuthInterceptor } from './core/interceptors/google.interceptor';
import { environment } from '../environments/environment';
import { routes } from './app.routes';
import { IconsRegisterService } from './services/icons-register.service';

export function initializeIcons(iconService: IconsRegisterService): () => void {
  return () => {
    iconService.registerCustomIcons();
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideExperimentalZonelessChangeDetection(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([googleAuthInterceptor])),
    provideFirebaseApp(() => initializeApp(environment.firebaseConfig)),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()),
    provideAnimationsAsync(),
    {
      provide: APP_INITIALIZER,
      useFactory: initializeIcons,
      multi: true,
      deps: [IconsRegisterService],
    },
  ],
};
