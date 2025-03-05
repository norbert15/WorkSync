import {
  Component,
  inject,
  Input,
  OnInit,
  output,
  Signal,
  signal,
  TemplateRef,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIcon } from '@angular/material/icon';
import { finalize, switchMap, take } from 'rxjs';

import { ButtonComponent } from '../../../reusables/button/button.component';
import { InputComponent } from '../../../reusables/input/input.component';
import { IOption, SelectComponent } from '../../../reusables/select/select.component';
import { DialogsService } from '../../../../services/dialogs.service';
import { DialogModel } from '../../../../models/dialog.model';
import { PopupService } from '../../../../services/popup.service';
import { CalendarFirebaseService } from '../../../../services/firebase/calendar-firebase.service';
import { UserFirebaseService } from '../../../../services/firebase/user-firebase.service';
import { CalendarRegisterType, ICalendarEvent } from '../../../../models/calendar.model';
import { CalendarEventEnum, HolidayRequestStatus, IconIds } from '../../../../core/constans/enums';
import { formatDateWithMoment } from '../../../../core/helpers';
import { HolidayFirebaseService } from '../../../../services/firebase/holiday-firebase.service';
import { IRequestedHoliday } from '../../../../models/holiday.model';
import { APP_PATHS } from '../../../../core/constans/paths';
import { AuthFirebaseService } from '../../../../services/firebase/auth-firebase.service';

@Component({
  selector: 'app-calendar-event-creator',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonComponent,
    InputComponent,
    SelectComponent,
    MatIcon,
  ],
  templateUrl: './calendar-event-creator.component.html',
})
export class CalendarEventCreatorComponent implements OnInit {
  public newEventDialogContentTemplate = viewChild<TemplateRef<any>>(
    'newEventDialogContentTemplate',
  );

  public footerDialogTemplate = viewChild<TemplateRef<any>>('footerDialogTemplate');

  @Input() public set calendarEvent(calendarEvent: ICalendarEvent | null) {
    this._calendarEvent.set(calendarEvent);

    if (calendarEvent) {
      this.patchFormValues(calendarEvent);
      this.onOpenNewEventDialogClick();
    }
  }

  public get calendarEvent(): Signal<ICalendarEvent | null> {
    return this._calendarEvent.asReadonly();
  }

  public dialogClosed = output<void>();

  public eventSave = output<void>();

  public readonly GOOGLE_EVENT = CalendarEventEnum.GOOGLE_EVENT;
  public readonly ICON_IDS = IconIds;

  public eventForm!: FormGroup;

  public isSaveBtnLoading = signal(false);

  public readonly eventTypeOptions: IOption<CalendarEventEnum>[] = [
    { label: 'Házon kívűl', value: CalendarEventEnum.OUT_OF_HOME },
    { label: 'Szabadság kérelem', value: CalendarEventEnum.HOLIDAY },
    { label: 'Google esemény', value: CalendarEventEnum.GOOGLE_EVENT },
  ];

  public viewOnly = signal(false);

  private _calendarEvent = signal<ICalendarEvent | null>(null);

  private navigateAfterClose = false;

  private readonly dialogsService = inject(DialogsService);

  private readonly formBuilder = inject(FormBuilder);
  private readonly popupService = inject(PopupService);
  private readonly userFirebaseService = inject(UserFirebaseService);
  private readonly authFirebaseService = inject(AuthFirebaseService);
  private readonly calendarFirebaseService = inject(CalendarFirebaseService);
  private readonly holidayFirebaseService = inject(HolidayFirebaseService);
  private readonly router = inject(Router);

  public ngOnInit(): void {
    this.initForm();
  }

  public initForm(): void {
    this.eventForm = this.formBuilder.group({
      eventType: [this.calendarEvent()?.type, Validators.required],
      eventStart: [
        formatDateWithMoment(this.calendarEvent()?.eventStart, {
          formats: ['YYYY. MM. DD. HH:mm:ss'],
          useFormat: 'YYYY-MM-DDTHH:mm',
        }),
        Validators.required,
      ],
      eventEnd: [
        formatDateWithMoment(this.calendarEvent()?.eventEnd, {
          formats: ['YYYY. MM. DD. HH:mm:ss'],
          useFormat: 'YYYY-MM-DDTHH:mm',
        }),
        Validators.required,
      ],
      reason: [this.calendarEvent()?.description, Validators.required],
      organizer: [this.calendarEvent()?.organizer.displayName],
    });
  }

  public onOptionSelect(value: CalendarEventEnum | null): void {
    if (value === CalendarEventEnum.GOOGLE_EVENT) {
      this.eventForm.get('eventType')?.setValue('');
      window.open('https://calendar.google.com/calendar', '_blank');
    }
  }

  public onSaveClick(): void {
    const user = this.userFirebaseService.userValue;
    if (this.eventForm.valid && user) {
      this.isSaveBtnLoading.set(true);
      const form = this.eventForm.getRawValue();

      if (form['eventType'] === CalendarEventEnum.HOLIDAY) {
        this.createHolidayRequest();
      } else {
        const userName = `${user.lastName} ${user.firstName}`;

        const register: CalendarRegisterType = {
          eventEnd: form['eventEnd'],
          eventStart: form['eventStart'],
          organizerEmail: user.email,
          organizerDisplayName: userName,
          summary: `${userName} ${this.getSummaryByEventType(form['eventType'])}`,
          description: form['reason'],
          type: form['eventType'],
        };

        if (this.calendarEvent()) {
          this.updateEvent(register);
        } else {
          this.createEvent(register, user.id);
        }
      }
    }
  }

  public onCloseDialogClick(): void {
    this.dialogsService.removeLastOpenedDialog();
    this.resetAfterDialogClosed();
  }

  public onOpenNewEventDialogClick(): void {
    const dialogTitle = this.viewOnly()
      ? 'Esemény megtekintése'
      : this.calendarEvent()
        ? 'Esemény módosítása'
        : 'Új esemény létrehozása';
    const newDialog: DialogModel = new DialogModel(dialogTitle, {
      content: this.newEventDialogContentTemplate(),
      footer: this.footerDialogTemplate(),
      size: 'normal',
    });
    this.dialogsService.addNewDialog(newDialog);
    newDialog.dialogClosed$.pipe(take(1)).subscribe({
      next: () => {
        this.resetAfterDialogClosed();
      },
    });
  }

  public onWarningDeleteClick(): void {
    const warningMessage = 'Biztos abban, hogy szeretné eltávolítani a kiválasztott eseményt?';
    const newDialog: DialogModel = new DialogModel('Figyelmeztetés', {
      type: 'delete',
      templateConfig: { contentText: warningMessage },
    });
    this.dialogsService.addNewDialog(newDialog);
    const id = this.calendarEvent()!.id!;

    newDialog.trigger$
      .pipe(
        take(1),
        switchMap(() => {
          this.popupService.add({
            details: 'Az esemény törlése folyamatban...',
            severity: 'info',
          });
          return this.calendarFirebaseService.deleteEvent(id);
        }),
      )
      .subscribe({
        next: () => {
          this.dialogsService.clearAll();
          this.eventSave.emit();
          this.popupService.add({
            details: 'Az esemény törlése sikeresen megtörtént.',
            severity: 'success',
            title: 'Sikeres művelet!',
          });
        },
        error: () => {
          this.popupService.add({
            details: 'Az esemény törlése során hiba történt.',
            severity: 'error',
            title: 'Sikertelen művelet!',
          });
        },
      });
  }

  private createHolidayRequest(): void {
    this.popupService.add({
      details: 'Esemény felvétele folyamatban...',
      severity: 'info',
    });

    const user = this.userFirebaseService.userValue!;

    const form = this.eventForm.getRawValue();

    const holidayRequest: Partial<IRequestedHoliday> = {
      claimant: `${user.lastName} ${user.firstName}`,
      endDate: formatDateWithMoment(form['eventEnd'], { useFormat: 'YYYY. MM. DD.' }),
      startDate: formatDateWithMoment(form['eventStart'], { useFormat: 'YYYY. MM. DD.' }),
      reason: form['reason'],
      role: user.role,
      status: HolidayRequestStatus.UNDER_EVALUATION,
      userId: user.id,
    };
    this.holidayFirebaseService
      .addHolidayRequest(holidayRequest)
      .pipe(
        take(1),
        finalize(() => {
          this.isSaveBtnLoading.set(false);
        }),
      )
      .subscribe({
        next: () => {
          this.popupService.add({
            details: 'A szabadság kérelem felvétele sikeresen megtörtént',
            severity: 'success',
            title: 'Sikeres művelet!',
          });
          this.navigateAfterClose = true;
          this.dialogsService.removeLastOpenedDialog();
        },
        error: () => {
          this.popupService.add({
            details: 'A szabadság kérelem felvétele során hiba törént.',
            severity: 'error',
            title: 'Sikertelen művelet!',
          });
        },
      });
  }

  private updateEvent(register: CalendarRegisterType): void {
    const id = this.calendarEvent()!.id!;
    this.popupService.add({
      details: 'Esemény módosítása folyamatban...',
      severity: 'info',
    });

    this.calendarFirebaseService
      .updateEvent(id, register)
      .pipe(
        take(1),
        finalize(() => {
          this.isSaveBtnLoading.set(false);
        }),
      )
      .subscribe({
        next: () => {
          this.eventSave.emit();
          this.popupService.add({
            details: 'Az esemény felvétele sikeresen megtörtént.',
            severity: 'success',
            title: 'Sikeres művelet!',
          });
        },
        error: () => {
          this.popupService.add({
            details: 'Az esemény felvétele során hiba történt.',
            severity: 'error',
            title: 'Sikertelen művelet!',
          });
        },
      });
  }

  private createEvent(register: CalendarRegisterType, userId: string): void {
    this.popupService.add({
      details: 'Esemény létrehozása folyamatban...',
      severity: 'info',
    });

    this.calendarFirebaseService
      .createEvent(register, userId)
      .pipe(
        take(1),
        finalize(() => {
          this.isSaveBtnLoading.set(false);
        }),
      )
      .subscribe({
        next: () => {
          this.eventSave.emit();
          this.popupService.add({
            details: 'Az esemény felvétele sikeresen megtörtént.',
            severity: 'success',
            title: 'Sikeres művelet!',
          });
          this.dialogsService.removeLastOpenedDialog();
        },
        error: () => {
          this.popupService.add({
            details: 'Az esemény felvétele során hiba történt.',
            severity: 'error',
            title: 'Sikertelen művelet!',
          });
        },
      });
  }

  private resetAfterDialogClosed(): void {
    this.dialogClosed.emit();
    this.eventForm.reset();
    this.eventForm.enable();
    this.viewOnly.set(false);
    this._calendarEvent.set(null);

    if (this.navigateAfterClose) {
      this.navigateAfterClose = false;
      this.router.navigate([APP_PATHS.root, APP_PATHS.holidays]);
    }
  }

  private getSummaryByEventType(eventType: CalendarEventEnum): string {
    switch (eventType) {
      case CalendarEventEnum.HOLIDAY:
        return 'szabadságon';
      case CalendarEventEnum.OUT_OF_HOME:
        return 'nem elérhető';
      default:
        return eventType;
    }
  }

  private patchFormValues(calendarEvent: ICalendarEvent): void {
    this.eventForm.patchValue({
      eventType: calendarEvent.type,
      eventStart: formatDateWithMoment(calendarEvent.eventStart, {
        formats: ['YYYY. MM. DD. HH:mm:ss'],
        useFormat: 'YYYY-MM-DDTHH:mm',
      }),
      eventEnd: formatDateWithMoment(calendarEvent.eventEnd, {
        formats: ['YYYY. MM. DD. HH:mm:ss'],
        useFormat: 'YYYY-MM-DDTHH:mm',
      }),
      reason: calendarEvent.description,
      organizer: calendarEvent.organizer.displayName,
    });

    const { userId } = this.authFirebaseService.userPayload()!;

    if (
      userId !== calendarEvent.userId ||
      [CalendarEventEnum.DAY_END, CalendarEventEnum.DAY_START, CalendarEventEnum.HOLIDAY].includes(
        calendarEvent.type as CalendarEventEnum,
      )
    ) {
      this.eventForm.disable();
      this.viewOnly.set(true);
    } else {
      this.viewOnly.set(false);
    }

    this.eventForm.get('organizer')?.disable();
  }
}
