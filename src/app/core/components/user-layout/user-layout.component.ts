import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { AsyncPipe, CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { catchError, of, ReplaySubject, switchMap, takeUntil, tap } from 'rxjs';
import moment from 'moment';

import { SidebarComponent } from '../sidebar/sidebar.component';
import { DialogsComponent } from '../dialogs/dialogs.component';
import { GoogleAuthService } from '../../../services/google/google-auth.service';
import { UserFirebaseService } from '../../../services/firebase/user-firebase.service';
import { IUser } from '../../../models/user.model';
import { PopupService } from '../../../services/popup.service';
import { PublicationFirebaseService } from '../../../services/firebase/publication-firebase.service';
import { IBranch } from '../../../models/branch.model';
import { DeviceType, DeviceTypeService } from '../../../services/device-type.service';
import { RepositroyEnum } from '../../constans/enums';

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

  private fetched = false;

  private readonly destroyed$ = new ReplaySubject<void>(1);
  private readonly googleAuthService = inject(GoogleAuthService);
  private readonly userFirebaseService = inject(UserFirebaseService);
  private readonly popupService = inject(PopupService);
  private readonly publicationFirebaseService = inject(PublicationFirebaseService);
  private readonly deviceTypeService = inject(DeviceTypeService);

  public ngOnInit(): void {
    this.fetchDeviceType();
    this.fetchGoogleApiTokens();
    this.fetchBarnchForPublications();
  }

  public ngOnDestroy(): void {
    this.destroyed$.next();
    this.destroyed$.complete();
  }

  private fetchBarnchForPublications(): void {
    this.publicationFirebaseService
      .getBranches(RepositroyEnum.PUBLISH)
      .pipe(takeUntil(this.destroyed$))
      .subscribe({
        next: (branches: Array<IBranch>) => {
          const today = moment();
          const data: Array<IBranch> = branches
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

  private fetchDeviceType(): void {
    this.deviceTypeService.pipe(takeUntil(this.destroyed$)).subscribe({
      next: (dt) => {
        this.deviceType.set(dt);
      },
    });
  }
}
