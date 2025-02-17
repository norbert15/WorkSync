import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { InputComponent } from '../../reusables/input/input.component';
import { ButtonComponent } from '../../reusables/button/button.component';
import { FadeDirective } from '../../../directives/fade.directive';
import { APP_PATHS } from '../../../core/constans/paths';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, InputComponent, ButtonComponent, FadeDirective],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent implements OnInit {
  public loginForm!: FormGroup;

  public showForgottenPasswordCard = signal(false);

  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);

  public ngOnInit(): void {
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]],
    });
  }

  public onSubmit(): void {
    if (this.loginForm.valid) {
      // TODO: bejelentkezés megvalósítása
      this.router.navigate([APP_PATHS.calendar]);
    }
  }

  public onSendPasswordResetSubmit(): void {
    if (this.showForgottenPasswordCard() && this.loginForm.get('email')?.valid) {
      // TODO: elfelejtett jelszó megvalósítása
    }
  }

  public toggleForgottenPasswordCard(): void {
    this.loginForm.reset();
    this.showForgottenPasswordCard.set(!this.showForgottenPasswordCard());
  }
}
