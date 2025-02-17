import { Component } from '@angular/core';
import { InputComponent } from '../../../reusables/input/input.component';
import { ButtonComponent } from '../../../reusables/button/button.component';
import { SwitchButtonComponent } from '../../../reusables/switch-button/switch-button.component';

@Component({
  selector: 'app-profile-data-form',
  standalone: true,
  imports: [InputComponent, ButtonComponent, SwitchButtonComponent],
  templateUrl: './profile-data-form.component.html',
  styleUrl: './profile-data-form.component.scss',
})
export class ProfileDataFormComponent {}
