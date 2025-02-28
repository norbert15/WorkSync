import {
  Component,
  effect,
  inject,
  model,
  OnInit,
  signal,
  TemplateRef,
  viewChild,
} from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize, take } from 'rxjs';

import { ButtonComponent } from '../../../reusables/button/button.component';
import { DialogsService } from '../../../../services/dialogs.service';
import { DialogModel } from '../../../../models/dialog.model';
import { InputComponent } from '../../../reusables/input/input.component';
import { HolidayFirebaseService } from '../../../../services/firebase/holiday-firebase.service';
import { IRequestedHoliday } from '../../../../models/holiday.model';
import { UserFirebaseService } from '../../../../services/firebase/user-firebase.service';
import { HolidayRequestStatus } from '../../../../core/constans/enums';
import { PopupService } from '../../../../services/popup.service';
import { formatDateWithMoment } from '../../../../core/helpers';

@Component({
  selector: 'app-holiday-request',
  standalone: true,
  imports: [ButtonComponent, InputComponent, ReactiveFormsModule],
  templateUrl: './holiday-request.component.html',
})
export class HolidayRequestComponent implements OnInit {
  public dialogContentTemplate = viewChild<TemplateRef<any>>('dialogContentTemplate');
  public dialogFooterTemplate = viewChild<TemplateRef<any>>('dialogFooterTemplate');

  public holidayRequest = model<IRequestedHoliday | null>(null);

  public isLoading = signal(false);

  public holidayForm!: FormGroup;

  private readonly dialogsService = inject(DialogsService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly holidayFirebaseService = inject(HolidayFirebaseService);
  private readonly userFirebaseService = inject(UserFirebaseService);
  private readonly popupService = inject(PopupService);

  constructor() {
    effect(
      () => {
        const hr = this.holidayRequest();

        if (hr) {
          this.updateFormValues(hr);
          this.onShowHolidayRequestDialogClick();
        }
      },
      { allowSignalWrites: true },
    );
  }

  public ngOnInit(): void {
    this.initForm();
  }

  public onSendClick(): void {
    if (!this.isLoading() && this.holidayForm.valid) {
      if (this.holidayRequest()) {
        this.updateHolidayRequest();
      } else {
        this.addHolidayRequest();
      }
    }
  }

  public onShowHolidayRequestDialogClick(): void {
    const dialogTitle = this.holidayRequest()
      ? 'Szabadság kérelem módosítása'
      : 'Új szabadság kérelem';
    const newDialog: DialogModel = new DialogModel(dialogTitle, {
      content: this.dialogContentTemplate(),
      footer: this.dialogFooterTemplate(),
    });
    this.dialogsService.addNewDialog(newDialog);
    newDialog.dialogClosed$.pipe(take(1)).subscribe({
      next: () => {
        this.holidayRequest.set(null);
        this.holidayForm.reset();
      },
    });
  }

  public onCloseDialogClick(): void {
    this.holidayForm.reset();
    this.dialogsService.removeLastOpenedDialog();
  }

  private addHolidayRequest(): void {
    const user = this.userFirebaseService.user$.getValue();

    if (user) {
      this.isLoading.set(true);
      this.popupService.add({
        details: 'A szabadság igénylése folyamatban...',
        severity: 'info',
      });

      const form = this.holidayForm.getRawValue();
      const holidayRequest: Partial<IRequestedHoliday> = {
        claimant: `${user.lastName} ${user.firstName}`,
        decisionBy: null,
        decisionReason: null,
        status: HolidayRequestStatus.UNDER_EVALUATION,
        userId: user.id,
        role: user.role,
        endDate: formatDateWithMoment(form['end'], { useFormat: 'YYYY. MM. DD.' }),
        startDate: formatDateWithMoment(form['start'], { useFormat: 'YYYY. MM. DD.' }),
        reason: form['reason'],
      };

      this.holidayFirebaseService
        .addHolidayRequest(holidayRequest)
        .pipe(
          take(1),
          finalize(() => {
            this.isLoading.set(false);
            this.dialogsService.removeLastOpenedDialog();
          }),
        )
        .subscribe({
          next: () => {
            this.popupService.add({
              details: 'A szabadság igénylése sikeresen megtörtént',
              severity: 'success',
              title: 'Sikeres művelet!',
            });
          },
          error: () => {
            this.popupService.add({
              details: 'A szabadság igénylése során hiba történt',
              severity: 'error',
              title: 'Sikertelen művelet!',
            });
          },
        });
    }
  }

  private updateHolidayRequest(): void {
    if (this.holidayRequest()) {
      this.isLoading.set(true);
      this.popupService.add({
        details: 'A szabadság kérelem módosítása folyamatban...',
        severity: 'info',
      });

      const form = this.holidayForm.getRawValue();
      const dataForUpdate: Partial<IRequestedHoliday> = {
        endDate: formatDateWithMoment(form['end'], { useFormat: 'YYYY. MM. DD.' }),
        startDate: formatDateWithMoment(form['start'], { useFormat: 'YYYY. MM. DD.' }),
        reason: form['reason'],
      };

      this.holidayFirebaseService
        .updateHolidayRequest(this.holidayRequest()!.id, dataForUpdate)
        .pipe(
          take(1),
          finalize(() => {
            this.isLoading.set(false);
          }),
        )
        .subscribe({
          next: () => {
            this.popupService.add({
              details: 'A szabadság kérelem módosítása sikeresen megtörtént',
              severity: 'success',
              title: 'Sikeres művelet!',
            });
          },
          error: () => {
            this.popupService.add({
              details: 'A szabadság kérelem módosítása során hiba történt',
              severity: 'error',
              title: 'Sikertelen művelet!',
            });
          },
        });
    }
  }

  private initForm(): void {
    this.holidayForm = this.formBuilder.nonNullable.group({
      start: ['', Validators.required],
      end: ['', Validators.required],
      reason: ['', Validators.required],
    });
  }

  private updateFormValues(holidayRequest: IRequestedHoliday): void {
    if (this.holidayForm) {
      this.holidayForm.patchValue({
        start: formatDateWithMoment(holidayRequest.startDate, {
          formats: ['YYYY. MM. DD.'],
          useFormat: 'YYYY-MM-DD',
        }),
        end: formatDateWithMoment(holidayRequest.endDate, {
          formats: ['YYYY. MM. DD.'],
          useFormat: 'YYYY-MM-DD',
        }),
        reason: holidayRequest.reason,
      });
    }
  }
}
