import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { AsyncPipe, CommonModule } from '@angular/common';
import { Router, RouterOutlet } from '@angular/router';
import { catchError, Observable, of, ReplaySubject, switchMap, take, takeUntil, tap } from 'rxjs';
import moment from 'moment';

import { SidebarComponent } from '../sidebar/sidebar.component';
import { DialogsComponent } from '../dialogs/dialogs.component';
import { GoogleAuthService } from '../../../services/google/google-auth.service';
import { UserFirebaseService } from '../../../services/firebase/user-firebase.service';
import { PublicationFirebaseService } from '../../../services/firebase/publication-firebase.service';
import { DeviceType, DeviceTypeService } from '../../../services/device-type.service';
import { PopupService } from '../../../services/popup.service';
import { RepositroyEnum } from '../../constans/enums';
import { IUser } from '../../../models/user.model';
import { IBranch } from '../../../models/branch.model';
import { AuthFirebaseService } from '../../../services/firebase/auth-firebase.service';
import { APP_PATHS } from '../../constans/paths';
import { NotificationFirebaseService } from '../../../services/firebase/notification-firebase.service';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-user-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent, DialogsComponent, AsyncPipe],
  templateUrl: './user-layout.component.html',
  styleUrl: './user-layout.component.scss',
})
export class UserLayoutComponent implements OnInit, OnDestroy {
  public sidebarIsOpened = signal(true);

  public deviceType = signal<DeviceType>('desktop');

  private readonly destroyed$ = new ReplaySubject<void>(1);

  private readonly publicationFirebaseService = inject(PublicationFirebaseService);
  private readonly googleAuthService = inject(GoogleAuthService);
  private readonly userFirebaseService = inject(UserFirebaseService);
  private readonly authFirebaseService = inject(AuthFirebaseService);
  private readonly notiFirebaseService = inject(NotificationFirebaseService);
  private readonly deviceTypeService = inject(DeviceTypeService);
  private readonly popupService = inject(PopupService);
  private readonly router = inject(Router);

  public ngOnInit(): void {
    this.fetchDeviceType();
    this.fetchBarnchForPublications();
    this.fetchUserDetails();
    this.fetchUserNotifications();
  }

  public ngOnDestroy(): void {
    this.destroyed$.next();
    this.destroyed$.complete();
  }

  private fetchUserNotifications(): void {
    this.notiFirebaseService
      .getUserNotifications()
      .pipe(takeUntil(this.destroyed$))
      .subscribe({
        next: (notifications) => {
          this.notiFirebaseService.setUserNotifications(notifications);
        },
      });
  }

  private fetchUserDetails(): void {
    const userPayload = this.authFirebaseService.userPayload()!;
    this.userFirebaseService
      .getUserDetails(userPayload.userId)
      .pipe(
        take(1),
        switchMap((user: IUser) => {
          this.userFirebaseService.setUser(user);
          return this.fetchGoogleApiTokens(user);
        }),
      )
      .subscribe({
        error: () => {
          this.popupService.add({
            details: 'Hiba történt a felhasználói adatok lekérdezése során.',
            severity: 'error',
          });
          return this.router.navigate([APP_PATHS.login]);
        },
      });
  }

  private fetchBarnchForPublications(): void {
    this.publicationFirebaseService
      .getBranches(RepositroyEnum.PUBLISH)
      .pipe(takeUntil(this.destroyed$))
      .subscribe({
        next: (branches: IBranch[]) => {
          const today = moment();
          const data: IBranch[] = branches
            .map((branch) => {
              const createdMoment = moment(branch.created, ['YYYY. MM. DD. HH:mm:ss']);
              const daysDiff = today.diff(createdMoment, 'days');
              return {
                id: branch.id,
                name: branch.name,
                repositoryId: branch.repositoryId,
                created: branch.created,
                status:
                  daysDiff >= 5 ? 'label-danger' : daysDiff >= 3 ? 'label-accent' : 'label-primary',
              } as IBranch;
            })
            .sort((a, b) => a.created.localeCompare(b.created));

          this.publicationFirebaseService.setBranchesForPublish(data);
        },
      });
  }

  private fetchGoogleApiTokens(user: IUser): Observable<any> {
    if (!user.googleRefreshToken) {
      return of(null);
    }

    return this.googleAuthService.renewAccessToken(user.googleRefreshToken).pipe(
      tap((result) => {
        console.log('Token?', result);
        this.googleAuthService.setGoogleApiPayload(
          result.access_token ?? '',
          user.googleRefreshToken,
        );
      }),
      catchError((response: HttpErrorResponse) => {
        let errorMessage = 'Hiba történt a google api hitelesítési adatok megújítása során.';

        if (response.error.error === 'invalid_grant') {
          errorMessage =
            'A google api hitelesítési adatok érvényessége lejárt. Kérem újítsa meg a fiók adatainál.';
        }

        this.popupService.add({
          details: errorMessage,
          severity: 'error',
          title: 'Google naptár szinkon',
        });

        return of(null);
      }),
      switchMap((result) => {
        if (!result) {
          return this.updateUserGoogleRefreshToken();
        }

        return of(result);
      }),
    );
  }

  private updateUserGoogleRefreshToken(): Observable<IUser> {
    return this.userFirebaseService.updateUserGoogleRefreshToken('').pipe(
      tap((user: IUser) => {
        this.userFirebaseService.setUser(user);
      }),
    );
  }

  private fetchDeviceType(): void {
    this.deviceTypeService.pipe(takeUntil(this.destroyed$)).subscribe({
      next: (dt) => {
        this.deviceType.set(dt);
      },
    });
  }
}
