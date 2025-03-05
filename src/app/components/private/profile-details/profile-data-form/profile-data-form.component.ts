import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { catchError, finalize, of, ReplaySubject, switchMap, take, takeUntil } from 'rxjs';

import { InputComponent } from '../../../reusables/input/input.component';
import { ButtonComponent } from '../../../reusables/button/button.component';
import { SwitchButtonComponent } from '../../../reusables/switch-button/switch-button.component';
import { UserFirebaseService } from '../../../../services/firebase/user-firebase.service';
import { IUser, IUserBase } from '../../../../models/user.model';
import { GoogleAuthService } from '../../../../services/google/google-auth.service';
import { PopupService } from '../../../../services/popup.service';
import { IconIds } from '../../../../core/constans/enums';

@Component({
  selector: 'app-profile-data-form',
  standalone: true,
  imports: [InputComponent, ButtonComponent, SwitchButtonComponent, ReactiveFormsModule],
  templateUrl: './profile-data-form.component.html',
  styleUrl: './profile-data-form.component.scss',
})
export class ProfileDataFormComponent implements OnInit, OnDestroy {
  public readonly ICON_IDS = IconIds;
  public profileForm!: FormGroup;

  public isLoading = signal(false);

  private user: IUser | null = null;

  private readonly destroyed$ = new ReplaySubject<void>(1);
  private readonly userFirebaseService = inject(UserFirebaseService);
  private readonly googleAuthService = inject(GoogleAuthService);
  private readonly formBudiler = inject(FormBuilder);
  private readonly popupService = inject(PopupService);

  public ngOnInit(): void {
    this.initForm();
    this.fetchUser();
  }

  public ngOnDestroy(): void {
    this.destroyed$.next();
    this.destroyed$.complete();
  }

  public onSubmit(): void {
    if (this.profileForm.valid && this.user && !this.isLoading()) {
      const form = this.profileForm.getRawValue();
      const userBase: IUserBase = {
        email: form['email'],
        firstName: form['firstName'],
        lastName: form['lastName'],
        jobTitle: form['jobTitle'],
        phone: form['phone'],
      };

      this.isLoading.set(true);

      this.popupService.add({
        details: 'A felhasználói adatok mentése folyamatban...',
        severity: 'info',
      });

      this.userFirebaseService
        .updateUserDetails(this.user.id, userBase)
        .pipe(
          take(1),
          finalize(() => {
            this.isLoading.set(false);
          }),
        )
        .subscribe({
          next: () => {
            this.popupService.add({
              details: 'A felhasználói adatok mentése sikeresen megtörtént',
              severity: 'success',
              title: 'Sikeres művelet!',
            });
          },
          error: () => {
            this.popupService.add({
              details: 'A felhasználói adatok mentése során hiba történt',
              severity: 'error',
              title: 'Sikertelen művelet!',
            });
          },
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
        this.pattchFormValues();
        console.log('User: ', user);
      },
    });
  }

  private initForm(): void {
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

  private pattchFormValues(): void {
    this.profileForm.patchValue({
      firstName: this.user?.firstName,
      lastName: this.user?.lastName,
      phone: this.user?.phone,
      email: this.user?.email,
      jobTitle: this.user?.jobTitle,
      hasGoogleSyns: this.user?.googleRefreshToken !== '',
      role: this.user?.role,
    });
  }

  private revokeGoogleTokens(): void {
    this.popupService.add({
      details: 'A google naptár szinkron visszavonása folyamatban...',
      severity: 'info',
    });

    this.googleAuthService
      .revokeGoogleTokens()
      .pipe(
        take(1),
        switchMap(() => {
          this.popupService.add({
            details: 'A google naptár szinkron visszavonása sikeresen megtörtént',
            severity: 'success',
            title: 'Sikeres művelet!',
          });

          return this.userFirebaseService.updateUserGoogleRefreshToken('').pipe(
            catchError(() => {
              return of('failed');
            }),
          );
        }),
      )
      .subscribe({
        next: (result) => {
          if (result !== 'failed') {
            this.user!.googleRefreshToken = '';
            this.userFirebaseService.user$.next(this.user);
          }
        },
        error: () => {
          this.popupService.add({
            details: 'A google naptár szinkron visszavonása során hiba történt',
            severity: 'error',
            title: 'Sikertelen művelet!',
          });
        },
      });
  }
}
