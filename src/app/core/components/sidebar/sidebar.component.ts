import { Component, inject, model, OnDestroy, OnInit, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { ReplaySubject, takeUntil } from 'rxjs';

import { AuthFirebaseService } from '../../../services/firebase/auth-firebase.service';
import { UserFirebaseService } from '../../../services/firebase/user-firebase.service';
import { IUser } from '../../../models/user.model';
import { APP_PATHS } from '../../constans/paths';
import { getMonogram } from '../../helpers';
import { IconIds, UserEnum } from '../../constans/enums';

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

  public sidebarItems = signal<SidebarItemType[]>([]);

  private readonly destroyed$ = new ReplaySubject<void>(1);

  private readonly authFirebaseService = inject(AuthFirebaseService);
  private readonly userFirebaseSerivce = inject(UserFirebaseService);

  public ngOnInit(): void {
    this.fetchSidebarItemsByUserRole();
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

  private fetchSidebarItemsByUserRole(): void {
    this.userFirebaseSerivce.user$.pipe(takeUntil(this.destroyed$)).subscribe({
      next: (user: IUser | null) => {
        this.sidebarItems.set(this.getBaseSidebarItems());

        if (user) {
          const { firstName, lastName, role } = user;
          this.userMonogram.set(getMonogram(`${lastName} ${firstName}`));
          if (role === UserEnum.ADMINISTRATOR) {
            this.sidebarItems.set([
              ...this.sidebarItems(),
              { icon: IconIds.PEOPLES, label: 'Felhasználók', route: APP_PATHS.users.root },
            ]);
          }
        }
      },
    });
  }

  private getBaseSidebarItems(): SidebarItemType[] {
    return [
      { icon: IconIds.CALENDAR3, label: 'Naptár', route: APP_PATHS.calendar },
      { icon: IconIds.GITHUB, label: 'Publikációk', count: '3', route: APP_PATHS.publications },
      { icon: IconIds.DATABASE, label: 'API Projektek', route: APP_PATHS.root },
      { icon: IconIds.CHAT_DOTS, label: 'Csevegő szobák', route: APP_PATHS.chatRooms },
      { icon: IconIds.CLOCK_HISTORY, label: 'Szabadságok', route: APP_PATHS.holidays },
      {
        icon: IconIds.BELL_FILL,
        label: 'Értesítések',
        count: '9+',
        route: APP_PATHS.notifications,
      },
    ];
  }
}
