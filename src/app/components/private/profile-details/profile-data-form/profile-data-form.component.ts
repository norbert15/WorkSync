import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { catchError, of, ReplaySubject, switchMap, take, takeUntil } from 'rxjs';

import { InputComponent } from '../../../reusables/input/input.component';
import { ButtonComponent } from '../../../reusables/button/button.component';
import { SwitchButtonComponent } from '../../../reusables/switch-button/switch-button.component';
import { UserFirebaseService } from '../../../../services/firebase/user-firebase.service';
import { IUser, IUserBase } from '../../../../models/user.model';
import { GoogleAuthService } from '../../../../services/google/google-auth.service';

@Component({
  selector: 'app-profile-data-form',
  standalone: true,
  imports: [InputComponent, ButtonComponent, SwitchButtonComponent, ReactiveFormsModule],
  templateUrl: './profile-data-form.component.html',
  styleUrl: './profile-data-form.component.scss',
})
export class ProfileDataFormComponent implements OnInit, OnDestroy {
  public profileForm!: FormGroup;

  private user: IUser | null = null;

  private readonly destroyed$ = new ReplaySubject<void>(1);
  private readonly userFirebaseService = inject(UserFirebaseService);
  private readonly googleAuthService = inject(GoogleAuthService);
  private readonly formBudiler = inject(FormBuilder);

  public ngOnInit(): void {
    this.initForm();
    this.fetchUser();
  }

  public ngOnDestroy(): void {
    this.destroyed$.next();
    this.destroyed$.complete();
  }

  public initForm(): void {
    this.profileForm = this.formBudiler.nonNullable.group({
      firstName: [this.user?.firstName, Validators.required],
      lastName: [this.user?.lastName, Validators.required],
      phone: [this.user?.phone, Validators.required],
      email: [this.user?.email, [Validators.required, Validators.email]],
      jobTitle: [this.user?.jobTitle, Validators.required],
      hasGoogleSyns: [this.user?.googleRefreshToken !== ''],
      role: this.formBudiler.control({ value: this.user?.role, disabled: true }),
    });
  }

  public onSubmit(): void {
    if (this.profileForm.valid && this.user) {
      const form = this.profileForm.getRawValue();
      const userBase: IUserBase = {
        email: form['email'],
        firstName: form['firstName'],
        lastName: form['lastName'],
        jobTitle: form['jobTitle'],
        phone: form['phone'],
      };

      this.userFirebaseService
        .updateUserDetails(this.user.id, userBase)
        .pipe(take(1))
        .subscribe({
          next: () => {},
          error: () => {},
        });
    }
  }

  public onGoogleSync(sync: boolean): void {
    if (sync) {
      this.googleAuthService.navigateToGoogleAuthPage();
    } else {
      this.revokeGoogleTokens();
    }
  }

  private fetchUser(): void {
    this.userFirebaseService.user$.pipe(takeUntil(this.destroyed$)).subscribe({
      next: (user: IUser | null) => {
        this.user = user;
        this.initForm();
      },
    });
  }

  private revokeGoogleTokens(): void {
    this.googleAuthService
      .revokeGoogleTokens()
      .pipe(
        take(1),
        switchMap(() =>
          this.userFirebaseService.updateUserGoogleRefreshToken(this.user!.id, '').pipe(
            catchError((err) => {
              return of('failed');
            }),
          ),
        ),
      )
      .subscribe({
        next: (result) => {
          if (result !== 'failed') {
            this.user!.googleRefreshToken = '';
            this.userFirebaseService.user$.next(this.user);
          }
        },
        error: (err) => {},
      });
  }
}
