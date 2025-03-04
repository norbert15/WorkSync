import { Component, computed, inject, model, OnDestroy, OnInit, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { ReplaySubject, takeUntil } from 'rxjs';

import { PublicationFirebaseService } from '../../../services/firebase/publication-firebase.service';
import { NotificationFirebaseService } from '../../../services/firebase/notification-firebase.service';
import { AuthFirebaseService } from '../../../services/firebase/auth-firebase.service';
import { UserFirebaseService } from '../../../services/firebase/user-firebase.service';
import { IconIds, UserEnum } from '../../constans/enums';
import { IUser } from '../../../models/user.model';
import { APP_PATHS } from '../../constans/paths';
import { getMonogram } from '../../helpers';

type SidebarItemType = {
  label: string;
  icon: IconIds;
  route: string;
  count?: string;
};

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, MatIcon],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent implements OnInit, OnDestroy {
  public readonly PROFILE_PATH: string = APP_PATHS.profileDetails;
  public readonly ICON_IDS = IconIds;

  public opened = model(true);

  public userMonogram = signal<string>('');

  public sidebarItems = computed<SidebarItemType[]>(() => {
    const publicationsLength = this.publicationFirebaseSerivce.branchesForPublications().length;
    const notificationsLength = this.notificationFirebaseService
      .userNotifications()
      .filter((n) => !n.seen).length;
    const user = this.user();

    const menus: SidebarItemType[] = this.getBaseSidebarItems(
      publicationsLength,
      notificationsLength,
    );

    if (user?.role === UserEnum.ADMINISTRATOR) {
      menus.push({ icon: IconIds.PEOPLES, label: 'Felhasználók', route: APP_PATHS.users.root });
    }

    return menus;
  });

  private user = signal<IUser | null>(null);

  private readonly destroyed$ = new ReplaySubject<void>(1);

  private readonly authFirebaseService = inject(AuthFirebaseService);
  private readonly userFirebaseSerivce = inject(UserFirebaseService);
  private readonly publicationFirebaseSerivce = inject(PublicationFirebaseService);
  private readonly notificationFirebaseService = inject(NotificationFirebaseService);

  public ngOnInit(): void {
    this.fetchCurrentUser();
  }

  public ngOnDestroy(): void {
    this.destroyed$.next();
    this.destroyed$.complete();
  }

  public toggleSidebar(): void {
    this.opened.set(!this.opened());
  }

  public onLogoutClick(): void {
    this.authFirebaseService.logout();
  }

  private fetchCurrentUser(): void {
    this.userFirebaseSerivce.user$.pipe(takeUntil(this.destroyed$)).subscribe({
      next: (user: IUser | null) => {
        this.user.set(user);

        if (user) {
          const { firstName, lastName } = user;
          this.userMonogram.set(getMonogram(`${lastName} ${firstName}`));
        }
      },
    });
  }

  private getBaseSidebarItems(
    githubCounter: number,
    notificationCounter: number,
  ): SidebarItemType[] {
    const gcl = this.getCounterLabel(githubCounter);
    const ncl = this.getCounterLabel(notificationCounter);
    return [
      { icon: IconIds.CALENDAR3, label: 'Naptár', route: APP_PATHS.calendar },
      { icon: IconIds.GITHUB, label: 'Publikációk', count: gcl, route: APP_PATHS.publications },
      { icon: IconIds.DATABASE, label: 'API Projektek', route: APP_PATHS.apiProjects },
      { icon: IconIds.CHAT_DOTS, label: 'Csevegő szobák', route: APP_PATHS.chatRooms },
      { icon: IconIds.CLOCK_HISTORY, label: 'Szabadságok', route: APP_PATHS.holidays },
      {
        icon: IconIds.BELL_FILL,
        label: 'Értesítések',
        count: ncl,
        route: APP_PATHS.notifications,
      },
    ];
  }

  private getCounterLabel(counter: number): string {
    return counter > 9 ? '9+' : !counter ? '' : counter.toString();
  }
}
