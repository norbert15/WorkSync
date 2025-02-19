import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { finalize, take } from 'rxjs';

import { InputComponent } from '../../reusables/input/input.component';
import { ButtonComponent } from '../../reusables/button/button.component';
import { FadeDirective } from '../../../directives/fade.directive';
import { APP_PATHS } from '../../../core/constans/paths';
import { AuthFirebaseService } from '../../../services/firebase/auth-firebase.service';
import { PopupService } from '../../../services/popup.service';

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

  public isLoginLoading = signal(false);

  private readonly authFirebaseService = inject(AuthFirebaseService);
  private readonly popupService = inject(PopupService);

  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);

  public ngOnInit(): void {
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]],
    });
  }

  public onSubmit(): void {
    if (this.loginForm.valid && !this.isLoginLoading()) {
      const form = this.loginForm.getRawValue();
      this.isLoginLoading.set(true);
      this.popupService.add({
        details: 'Bejelentkezés folyamatban...',
        severity: 'info',
      });
      this.authFirebaseService
        .login(form['email'], form['password'])
        .pipe(
          take(1),
          finalize(() => {
            this.isLoginLoading.set(false);
          }),
        )
        .subscribe({
          next: (userCredential) => {
            this.popupService.add({
              details: 'Sikeres bejelentkezés.',
              severity: 'success',
            });
            const user = userCredential.user as any;
            this.authFirebaseService.setAccessToken(user.accessToken);
            this.authFirebaseService.setRefreshToken(user.refreshToken);

            this.router.navigate([APP_PATHS.root, APP_PATHS.calendar]);
          },
          error: () => {
            this.popupService.add({
              details: 'A megadott felhasználónév vagy jelszó helytelen.',
              severity: 'error',
              title: 'Hiba!',
            });
          },
        });
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
