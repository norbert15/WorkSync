import { Component, inject, model, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { take, switchMap, of, catchError, Observable, tap } from 'rxjs';

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
export class ProfileDetailsComponent implements OnInit {
  public readonly subMenus: Array<ISubmenuItem> = [
    { label: 'Felhasználói adatok', route: 'profile' },
    { label: 'Jelszó módosítás', route: 'password' },
  ];

  public activeMenu = model(this.subMenus[0].route);

  private readonly googleAuthService = inject(GoogleAuthService);
  private readonly userFirebaseSevice = inject(UserFirebaseService);
  private readonly popupService = inject(PopupService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  public ngOnInit(): void {
    this.getGoogleTokens();
  }

  private getGoogleTokens(): void {
    const googleCode = this.route.snapshot.queryParamMap.get('code');
    if (!googleCode) {
      return;
    }

    this.router.navigate([]); // Felesleges paraméterek eltávolítása amit a google állít be

    this.googleAuthService
      .getGoogleTokens(googleCode)
      .pipe(
        take(1),
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
      )
      .subscribe({
        error: () => {
          this.popupService.add({
            details: 'Hiba történt a google hitelesítése adatok lekérdezése során.',
            severity: 'error',
            title: 'Google naptár szinkon',
          });
        },
      });
  }

  private updateUserDeails(refreshToken: string): Observable<IUser | null> {
    return this.userFirebaseSevice.updateUserGoogleRefreshToken(refreshToken).pipe(
      tap((user: IUser) => {
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
