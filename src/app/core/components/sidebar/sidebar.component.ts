import { Component, inject, model, OnDestroy, OnInit, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReplaySubject, takeUntil } from 'rxjs';

import { AuthFirebaseService } from '../../../services/firebase/auth-firebase.service';
import { UserFirebaseService } from '../../../services/firebase/user-firebase.service';
import { IUser } from '../../../models/user.model';
import { APP_PATHS } from '../../constans/paths';
import { getMonogram } from '../../helpers';
import { UserEnum } from '../../constans/enums';

type SidebarItem = {
  label: string;
  icon: string;
  route: string;
  count?: string;
};

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent implements OnInit, OnDestroy {
  public readonly PROFILE_PATH: string = APP_PATHS.profileDetails;

  public opened = model(true);

  public userMonogram = signal<string>('');

  public sidebarItems = signal<Array<SidebarItem>>([]);

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

  public logout(): void {
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
              { icon: 'bi bi-people', label: 'Felhasználók', route: APP_PATHS.users.root },
            ]);
          }
        }
      },
    });
  }

  private getBaseSidebarItems(): Array<SidebarItem> {
    return [
      { icon: 'bi bi-calendar3', label: 'Naptár', route: APP_PATHS.calendar },
      { icon: 'bi bi-github', label: 'Publikációk', count: '3', route: APP_PATHS.publications },
      { icon: 'bi bi-database', label: 'API Projektek', route: APP_PATHS.chatRooms.root },
      { icon: 'bi bi-chat-dots', label: 'Csevegő szobák', route: APP_PATHS.chatRooms.root },
      { icon: 'bi bi-clock-history', label: 'Szabadságok', route: APP_PATHS.holidays },
      {
        icon: 'bi bi-bell',
        label: 'Értesítések',
        count: '9+',
        route: APP_PATHS.notifications.root,
      },
    ];
  }
}
