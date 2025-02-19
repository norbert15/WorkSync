import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PopupComponent } from './core/components/popup/popup.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, PopupComponent],
  template: '<router-outlet></router-outlet><app-popup></app-popup>',
})
export class AppComponent {}
