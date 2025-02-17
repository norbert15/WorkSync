import { Component, model } from '@angular/core';

import {
  ISubmenuItem,
  SubmenuStripComponent,
} from '../../reusables/submenu-strip/submenu-strip.component';
import { ProfileDataFormComponent } from './profile-data-form/profile-data-form.component';
import { PasswodModifyFormComponent } from './passwod-modify-form/passwod-modify-form.component';

@Component({
  selector: 'app-profile-details',
  standalone: true,
  imports: [SubmenuStripComponent, ProfileDataFormComponent, PasswodModifyFormComponent],
  templateUrl: './profile-details.component.html',
  styleUrl: './profile-details.component.scss',
})
export class ProfileDetailsComponent {
  public readonly subMenus: Array<ISubmenuItem> = [
    { label: 'Felhasználói adatok', route: 'profile' },
    { label: 'Jelszó módsítás', route: 'password' },
  ];

  public activeMenu = model(this.subMenus[0].route);
}
