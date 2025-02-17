import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

import { SidebarComponent } from '../sidebar/sidebar.component';
import { RouterOutlet } from '@angular/router';
import { DialogsComponent } from '../dialogs/dialogs.component';

@Component({
  selector: 'app-user-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent, DialogsComponent],
  templateUrl: './user-layout.component.html',
  styleUrl: './user-layout.component.scss',
})
export class UserLayoutComponent {
  public sidebarIsOpened = signal(true);

  //TODO:
  // - értesítések lekérdezése
  // - felhasználói adatok lekérdezése
}
