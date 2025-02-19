import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { catchError, of, ReplaySubject, switchMap, takeUntil, tap } from 'rxjs';

import { SidebarComponent } from '../sidebar/sidebar.component';
import { DialogsComponent } from '../dialogs/dialogs.component';
import { GoogleAuthService } from '../../../services/google/google-auth.service';
import { UserFirebaseService } from '../../../services/firebase/user-firebase.service';
import { IUser } from '../../../models/user.model';
import { PopupService } from '../../../services/popup.service';

@Component({
  selector: 'app-user-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent, DialogsComponent],
  templateUrl: './user-layout.component.html',
  styleUrl: './user-layout.component.scss',
})
export class UserLayoutComponent implements OnInit, OnDestroy {
  public sidebarIsOpened = signal(true);

  private fetched = false;

  private readonly destroyed$ = new ReplaySubject<void>(1);
  private readonly googleAuthService = inject(GoogleAuthService);
  private readonly userFirebaseService = inject(UserFirebaseService);
  private readonly popupService = inject(PopupService);

  public ngOnInit(): void {
    this.fetchGoogleApiTokens();
  }

  public ngOnDestroy(): void {
    this.destroyed$.next();
    this.destroyed$.complete();
  }

  private fetchGoogleApiTokens(): void {
    this.userFirebaseService.user$
      .pipe(
        takeUntil(this.destroyed$),
        switchMap((user: IUser | null) => {
          if (user && user.googleRefreshToken && !this.fetched) {
            return this.googleAuthService.renewAccessToken(user.googleRefreshToken).pipe(
              tap((result) => {
                this.fetched = true;
                this.googleAuthService.setGoogleApiPayload(
                  result.access_token ?? '',
                  user.googleRefreshToken,
                );
              }),
              catchError(() => {
                this.popupService.add({
                  details: 'Hiba történt a google api hitelesítési adatok megújítása során.',
                  severity: 'error',
                  title: 'Google naptár szinkon',
                });
                return of(null);
              }),
            );
          }

          return of(null);
        }),
      )
      .subscribe();
  }
}
