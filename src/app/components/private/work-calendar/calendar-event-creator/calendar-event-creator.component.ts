import {
  Component,
  inject,
  Input,
  input,
  model,
  OnInit,
  output,
  Signal,
  signal,
  TemplateRef,
  viewChild,
} from '@angular/core';
import { ButtonComponent } from '../../../reusables/button/button.component';
import { InputComponent } from '../../../reusables/input/input.component';
import { IOption, SelectComponent } from '../../../reusables/select/select.component';
import { DialogsService } from '../../../../services/dialogs.service';
import { DialogModel } from '../../../../models/dialog.model';
import { finalize, switchMap, take } from 'rxjs';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { PopupService } from '../../../../services/popup.service';
import { CalendarFirebaseService } from '../../../../services/firebase/calendar-firebase.service';
import { UserFirebaseService } from '../../../../services/firebase/user-firebase.service';
import { CalendarRegisterType, ICalendarEvent } from '../../../../models/calendar.model';
import { CalendarEventEnum } from '../../../../core/constans/enums';
import { formatDateWithMoment } from '../../../../core/helpers';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-calendar-event-creator',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonComponent, InputComponent, SelectComponent],
  templateUrl: './calendar-event-creator.component.html',
  styleUrl: './calendar-event-creator.component.scss',
})
export class CalendarEventCreatorComponent implements OnInit {
  public newEventDialogContentTemplate = viewChild<TemplateRef<any>>(
    'newEventDialogContentTemplate',
  );

  public footerDialogTemplate = viewChild<TemplateRef<any>>('footerDialogTemplate');

  @Input() public set calendarEvent(calendarEvent: ICalendarEvent | null) {
    this._calendarEvent.set(calendarEvent);

    if (calendarEvent) {
      this.initForm();
      this.onOpenNewEventDialogClick();
    }
  }

  public dialogClosed = output<void>();

  public eventSave = output<string[]>();

  public eventForm!: FormGroup;

  public isSaveBtnLoading = signal(false);

  public readonly GOOGLE_EVENT = CalendarEventEnum.GOOGLE_EVENT;

  public readonly eventTypeOptions: Array<IOption<CalendarEventEnum>> = [
    { label: 'Házon kívűl', value: CalendarEventEnum.OUT_OF_HOME },
    { label: 'Szabadság kérelem', value: CalendarEventEnum.HOLIDAY },
    { label: 'Google esemény', value: CalendarEventEnum.GOOGLE_EVENT },
  ];

  public viewOnly = signal(false);

  private _calendarEvent = signal<ICalendarEvent | null>(null);

  private readonly dialogsService = inject(DialogsService);

  private readonly formBuilder = inject(FormBuilder);
  private readonly popupService = inject(PopupService);
  private readonly userFirebaseService = inject(UserFirebaseService);
  private readonly calendarFirebaseService = inject(CalendarFirebaseService);

  public get calendarEvent(): Signal<ICalendarEvent | null> {
    return this._calendarEvent.asReadonly();
  }

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
      reason: [this.calendarEvent()?.description],
      organizer: [this.calendarEvent()?.organizer.displayName],
    });

    const user = this.userFirebaseService.user$.getValue();
    if (
      this.calendarEvent() &&
      (!user ||
        user.email !== this.calendarEvent()?.organizer.email ||
        [CalendarEventEnum.DAY_END, CalendarEventEnum.DAY_START].includes(
          this.calendarEvent()!.type as CalendarEventEnum,
        ))
    ) {
      this.eventForm.disable();
      this.viewOnly.set(true);
    } else {
      this.viewOnly.set(false);
    }

    this.eventForm.get('organizer')?.disable();
  }

  public onOptionSelect(value: CalendarEventEnum | null): void {
    if (value === CalendarEventEnum.GOOGLE_EVENT) {
      this.eventForm.get('eventType')?.setValue('');
      window.open('https://calendar.google.com/calendar', '_blank');
    }
  }

  public onSaveClick(): void {
    // TODO: a szabadság kérelmek nem eseményként kerülnek be a naptárba
    // A szabadság kérelmek a szabadság menübe vesznek fel új rekordot
    const user = this.userFirebaseService.user$.getValue();
    if (this.eventForm.valid && user) {
      this.isSaveBtnLoading.set(true);

      const form = this.eventForm.getRawValue();
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
        this.createEvent(register);
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
    newDialog.afterComplete$.pipe(take(1)).subscribe({
      next: () => {
        this.resetAfterDialogClosed();
      },
    });
  }

  public onWarningDeleteClick(): void {
    const newDialog: DialogModel = new DialogModel('Figyelmeztetés', {
      isDelete: true,
      deleteMessage: 'Biztos abban, hogy szeretné eltávolítani a kiválasztott eseményt?',
    });
    this.dialogsService.addNewDialog(newDialog);
    const id = this.calendarEvent()!.id!;

    newDialog.delete$
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
          this.eventSave.emit([id]);
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
          this.eventSave.emit([id]);
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

  private createEvent(register: CalendarRegisterType): void {
    this.popupService.add({
      details: 'Esemény létrehozása folyamatban...',
      severity: 'info',
    });

    this.calendarFirebaseService
      .createEvent(register)
      .pipe(
        take(1),
        finalize(() => {
          this.isSaveBtnLoading.set(false);
        }),
      )
      .subscribe({
        next: (result) => {
          this.eventSave.emit(result);
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

  private resetAfterDialogClosed(): void {
    this.dialogClosed.emit();
    this.eventForm.reset();
    this._calendarEvent.set(null);
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
}
