import { Component, inject, model, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { switchMap, of, catchError, Observable, tap, Subscription } from 'rxjs';

import {
  ISubmenuItem,
  SubmenuStripComponent,
} from '../../reusables/submenu-strip/submenu-strip.component';
import { ProfileDataFormComponent } from './profile-data-form/profile-data-form.component';
import { PasswodModifyFormComponent } from './passwod-modify-form/passwod-modify-form.component';
import { FadeDirective } from '../../../directives/fade.directive';
import { UserFirebaseService } from '../../../services/firebase/user-firebase.service';
import { GoogleAuthService } from '../../../services/google/google-auth.service';
import { PopupService } from '../../../services/popup.service';
import { IUser } from '../../../models/user.model';

@Component({
  selector: 'app-profile-details',
  standalone: true,
  imports: [
    SubmenuStripComponent,
    ProfileDataFormComponent,
    PasswodModifyFormComponent,
    FadeDirective,
  ],
  templateUrl: './profile-details.component.html',
  styleUrl: './profile-details.component.scss',
})
export class ProfileDetailsComponent implements OnInit, OnDestroy {
  public readonly subMenus: ISubmenuItem[] = [
    { label: 'Felhasználói adatok', route: 'profile' },
    { label: 'Jelszó módosítás', route: 'password' },
  ];

  public activeMenu = model(this.subMenus[0].route);

  private subscription: Subscription | null = null;

  private readonly googleAuthService = inject(GoogleAuthService);
  private readonly userFirebaseSevice = inject(UserFirebaseService);
  private readonly popupService = inject(PopupService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  public ngOnInit(): void {
    this.getGoogleTokens();
  }

  public ngOnDestroy(): void {
    if (this.subscription && !this.subscription.closed) {
      this.subscription?.unsubscribe();
    }
  }

  private getGoogleTokens(): void {
    const googleCode = this.route.snapshot.queryParamMap.get('code');
    if (!googleCode) {
      return;
    }

    this.router.navigate([]); // Felesleges paraméterek eltávolítása amit a google állít be

    this.subscription = this.userFirebaseSevice.user$
      .pipe(
        switchMap((user: IUser | null) => {
          if (user) {
            this.googleAuthService.setClientId(user.clientId);
            this.googleAuthService.setClientSecret(user.clientSecret);

            return this.googleAuthService.getGoogleTokens(googleCode).pipe(
              switchMap((result) => {
                const { access_token = '', refresh_token = '' } = result;

                if (refresh_token) {
                  this.googleAuthService.setGoogleApiPayload(access_token, refresh_token);

                  return this.updateUserDeails(refresh_token);
                }

                this.popupService.add({
                  details: 'Hiba történt a google refresh token lekérése során.',
                  severity: 'warning',
                });

                return of(null);
              }),
            );
          }

          return of('no-user');
        }),
      )
      .subscribe({
        next: (result) => {
          if (result && result !== 'no-user') {
            this.subscription?.unsubscribe();
          }
        },
        error: () => {
          this.popupService.add({
            details: 'Hiba történt a google hitelesítése adatok lekérdezése során.',
            severity: 'error',
            title: 'Google naptár szinkon',
          });
          this.subscription?.unsubscribe();
        },
      });
  }

  private updateUserDeails(refreshToken: string): Observable<IUser | null> {
    return this.userFirebaseSevice.updateUserGoogleRefreshToken(refreshToken).pipe(
      tap((user: IUser) => {
        this.subscription?.unsubscribe();
        this.userFirebaseSevice.setUser(user);
      }),
      catchError(() => {
        this.popupService.add({
          details: 'Hiba történt a felhasználói adatok módosítása során.',
          severity: 'error',
        });
        return of(null);
      }),
    );
  }
}
