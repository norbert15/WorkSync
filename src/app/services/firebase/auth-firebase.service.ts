import { inject, Injectable, Signal, signal } from '@angular/core';
import {
  Auth,
  createUserWithEmailAndPassword,
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  UserCredential,
} from '@angular/fire/auth';
import { JwtHelperService } from '@auth0/angular-jwt';
import { Router } from '@angular/router';
import { finalize, from, Observable, take } from 'rxjs';

import { IUserPayload } from '../../models/user.model';
import { APP_PATHS } from '../../core/constans/paths';
import { PopupService } from '../popup.service';

@Injectable({
  providedIn: 'root',
})
export class AuthFirebaseService {
  private readonly _userPayload = signal<IUserPayload | null>(null);

  private readonly firebaseAuth = inject(Auth);

  private readonly router = inject(Router);
  private readonly popupService = inject(PopupService);

  public get userPayload(): Signal<IUserPayload | null> {
    return this._userPayload.asReadonly();
  }

  public get accessToken(): string | null {
    return sessionStorage.getItem('accessToken');
  }

  public get refreshToken(): string | null {
    return sessionStorage.getItem('refreshToken');
  }

  public login(email: string, password: string): Observable<UserCredential> {
    return from(signInWithEmailAndPassword(this.firebaseAuth, email, password));
  }

  public register(email: string, password: string): Observable<any> {
    return from(createUserWithEmailAndPassword(this.firebaseAuth, email, password));
  }

  public logout(): void {
    from(signOut(getAuth()))
      .pipe(
        take(1),
        finalize(() => {
          this.clearTokens();
          this.router.navigate([APP_PATHS.login]);
        }),
      )
      .subscribe({
        next: () => {
          this.popupService.add({
            details: 'Sikeres kijelentkezés.',
            severity: 'success',
          });
        },
        error: () => {
          this.popupService.add({
            details: 'Hiba történt a kijeletkezés során.',
            severity: 'error',
          });
        },
      });
  }

  public decodeAccessToken(): IUserPayload | null {
    if (this.accessToken) {
      const jwtHelper = new JwtHelperService();
      this._userPayload.set(jwtHelper.decodeToken(this.accessToken));
      return this._userPayload();
    }

    return null;
  }

  public setAccessToken(accessToken: string): void {
    sessionStorage.setItem('accessToken', accessToken);
  }

  public setRefreshToken(refreshToken: string): void {
    sessionStorage.setItem('refreshToken', refreshToken);
  }

  private clearTokens(): void {
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('refreshToken');
  }
}
