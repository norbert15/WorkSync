import { CommonModule } from '@angular/common';
import { Component, model, output, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { APP_PATHS } from '../../constans/paths';

type SidebarItem = {
  label: string;
  icon: string;
  route: string;
  count?: number;
};

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent {
  public readonly PROFILE_PATH: string = APP_PATHS.profileDetails;

  public openedChange = output<boolean>();

  public opened = model(true);

  // TODO: username beállítása
  public userMonogram = signal<string>('BN');

  // TODO: role alapján beállítani
  public sidebarItems = signal<Array<SidebarItem>>([
    { icon: 'bi bi-calendar3', label: 'Naptár', route: APP_PATHS.calendar },
    { icon: 'bi bi-github', label: 'Branches', route: APP_PATHS.branches.root, count: 3 },
    { icon: 'bi bi-database', label: 'API Projektek', route: APP_PATHS.chatRooms.root },
    { icon: 'bi bi-chat-dots', label: 'Csevegő szobák', route: APP_PATHS.chatRooms.root },
    { icon: 'bi bi-clock-history', label: 'Szabadságok', route: APP_PATHS.holidays.root },
    { icon: 'bi bi-people', label: 'Felhasználók', route: APP_PATHS.users.root },
    { icon: 'bi bi-bell', label: 'Értesítések', count: 7, route: APP_PATHS.notifications.root },
  ]);

  public toggleSidebar(): void {
    this.opened.set(!this.opened());
    this.openedChange.emit(this.opened());
  }
}
