import { Component, inject, model, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { take, switchMap, of, catchError } from 'rxjs';

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
    const googleCode = this.route.snapshot.queryParamMap.get('code');

    if (googleCode) {
      const tokens = { accessToken: '', refreshToken: '' };
      this.router.navigate([]); // Felesleges paraméterek eltávolítása amit a google állít be
      this.googleAuthService
        .getGoogleTokens(googleCode)
        .pipe(
          take(1),
          switchMap((result) => {
            tokens.accessToken = result.access_token ?? '';
            tokens.refreshToken = result.refresh_token ?? '';

            if (tokens.refreshToken) {
              this.googleAuthService.setGoogleApiPayload(tokens.accessToken, tokens.refreshToken);
              return this.userFirebaseSevice
                .updateUserGoogleRefreshToken(
                  this.userFirebaseSevice.user$.getValue()!.id,
                  tokens.refreshToken,
                )
                .pipe(
                  catchError((error) => {
                    this.popupService.add({
                      details: 'Hiba történt a felhasználói adatok módosítása során.',
                      severity: 'error',
                    });
                    return of('failed');
                  }),
                );
            }

            this.popupService.add({
              details: 'Hiba történt a google refresh token lekérése során.',
              severity: 'warning',
            });

            return of('failed');
          }),
        )
        .subscribe({
          next: (result) => {
            if (result !== 'failed') {
              const user = this.userFirebaseSevice.user$.getValue()!;
              user.googleRefreshToken = tokens.refreshToken;
              this.userFirebaseSevice.setUser(user);
            }
          },
          error: () => {
            this.popupService.add({
              details: 'Hiba történt a google hitelesítése adatok lekérdezése során.',
              severity: 'error',
              title: 'Google naptár szinkon',
            });
          },
        });
    }
  }
}
