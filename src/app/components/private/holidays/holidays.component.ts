import {
  Component,
  inject,
  model,
  OnDestroy,
  OnInit,
  Signal,
  signal,
  TemplateRef,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  catchError,
  combineLatest,
  finalize,
  Observable,
  of,
  ReplaySubject,
  switchMap,
  take,
  takeUntil,
  tap,
} from 'rxjs';

import {
  CalendarEventEnum,
  HolidayRequestStatus,
  TableOperationEnum,
  UserEnum,
} from '../../../core/constans/enums';
import { HolidayFirebaseService } from '../../../services/firebase/holiday-firebase.service';
import { UserFirebaseService } from '../../../services/firebase/user-firebase.service';
import { HolidayRequestComponent } from './holiday-request/holiday-request.component';
import { ButtonComponent } from '../../reusables/button/button.component';
import { TableComponent } from '../../reusables/table/table.component';
import { ITableRow, ITableTitle } from '../../../models/table.model';
import { IRequestedHoliday } from '../../../models/holiday.model';
import { PopupService } from '../../../services/popup.service';
import { DialogModel } from '../../../models/dialog.model';
import { DialogsService } from '../../../services/dialogs.service';
import { IUser } from '../../../models/user.model';
import { CalendarFirebaseService } from '../../../services/firebase/calendar-firebase.service';
import { CalendarRegisterType } from '../../../models/calendar.model';
import { formatDateWithMoment } from '../../../core/helpers';

@Component({
  selector: 'app-holidays',
  standalone: true,
  imports: [TableComponent, ButtonComponent, HolidayRequestComponent, FormsModule],
  templateUrl: './holidays.component.html',
})
export class HolidaysComponent implements OnInit, OnDestroy {
  public rejectHolidayRequestDialogTemplate = viewChild<TemplateRef<any>>(
    'rejectHolidayRequestDialogTemplate',
  );

  public tableTitles: ITableTitle[] = [
    { text: 'Igénylő' },
    { text: 'Mettől', order: true },
    { text: 'Meddig', order: true },
    { text: 'Státusz' },
    { text: 'Megjegyzés/Indoklás' },
    { text: 'Műveletek', class: 'text-end' },
  ];

  public ownHolidaytableRows = signal<ITableRow<IRequestedHoliday>[]>([]);
  public requestedHolidayTableRows = signal<ITableRow<IRequestedHoliday>[]>([]);

  public holidayRequest = signal<IRequestedHoliday | null>(null);

  public reasonForReject = model('');

  private readonly destroyed$ = new ReplaySubject<void>(1);

  private readonly _isAdministrator = signal(false);

  private readonly holidayFirebaseService = inject(HolidayFirebaseService);
  private readonly userFirebaseService = inject(UserFirebaseService);
  private readonly popupService = inject(PopupService);
  private readonly dialogsService = inject(DialogsService);
  private readonly calendarFirebaseService = inject(CalendarFirebaseService);

  public get isAdministrator(): Signal<boolean> {
    return this._isAdministrator.asReadonly();
  }

  public ngOnInit(): void {
    this.fetchHolidays();
  }

  public ngOnDestroy(): void {
    this.destroyed$.next();
    this.destroyed$.complete();
  }

  public onSetHolidayRequestClick(row: ITableRow<IRequestedHoliday>): void {
    this.holidayRequest.set(row.model!);
  }

  public onWarningAcceptDialogClick(row: ITableRow<IRequestedHoliday>): void {
    const warningMessage =
      '<div>Biztos abban, hogy <span class="label-success">elfogadja</span> a szabadság kérelmet?</div>';
    const newDialog: DialogModel = new DialogModel('Szabadság kérelem elfogadása!', {
      type: 'warning',
      templateConfig: { contentText: warningMessage, triggerBtnLabel: 'Elfogadás' },
    });

    this.dialogsService.addNewDialog(newDialog);
    newDialog.trigger$
      .pipe(
        take(1),
        switchMap(() => this.acceptOrRejectHolidayRequestObservable(row.model!, true)),
      )
      .subscribe({
        next: (result) => {
          console.log('Result: ', result);
        },
      });
  }

  public onWarningRejectDialogClick(row: ITableRow<IRequestedHoliday>): void {
    const warningMessage = `<div>Biztos abban, hogy <span class="label-danger">elutasítja</span> a szabadság kérelmet?</div>`;
    const newDialog: DialogModel = new DialogModel('Szabadság kérelem elutsítása!', {
      content: this.rejectHolidayRequestDialogTemplate(),
      type: 'delete',
      templateConfig: { contentText: warningMessage, triggerBtnLabel: 'Elutasítás' },
    });

    this.dialogsService.addNewDialog(newDialog);
    newDialog.trigger$
      .pipe(
        take(1),
        switchMap(() => this.acceptOrRejectHolidayRequestObservable(row.model!, false)),
      )
      .subscribe();
  }

  public onWarningDeleteDialogClick(row: ITableRow<IRequestedHoliday>): void {
    const warningMessage = `Biztos abban, hogy ki szeretné törölni a szabadság kérelmet?`;
    const newDialog: DialogModel = new DialogModel('Figyelmeztetés', {
      type: 'delete',
      templateConfig: { contentText: warningMessage },
    });
    this.dialogsService.addNewDialog(newDialog);
    newDialog.trigger$
      .pipe(
        take(1),
        switchMap(() => this.deleteHolidayRequstObservable(row.model!.id)),
      )
      .subscribe();
  }

  private fetchHolidays(): void {
    this.userFirebaseService.user$
      .pipe(
        takeUntil(this.destroyed$),
        switchMap((user: IUser | null) => {
          this._isAdministrator.set(user?.role === UserEnum.ADMINISTRATOR);

          if (!user) {
            return of([]);
          }

          const { id } = user;

          return combineLatest([
            this.getUserHolidaysObservable(id),
            this.getAllDeveloperHolidaysObservable(id),
          ]);
        }),
      )
      .subscribe();
  }

  private getUserHolidaysObservable(userId: string): Observable<IRequestedHoliday[]> {
    return this.holidayFirebaseService.getUserHolidays(userId).pipe(
      tap((holidays: IRequestedHoliday[]) => {
        this.ownHolidaytableRows.set(this.buildTableRows(holidays, userId));
      }),
      catchError(() => of([])),
    );
  }

  private getAllDeveloperHolidaysObservable(userId: string): Observable<IRequestedHoliday[]> {
    return this.holidayFirebaseService.getAllDeveloperHolidays().pipe(
      tap((holidays: IRequestedHoliday[]) => {
        this.requestedHolidayTableRows.set(this.buildTableRows(holidays, userId));
      }),
      catchError(() => of([])),
    );
  }

  private buildTableRows(
    holidays: IRequestedHoliday[],
    userId: string,
  ): ITableRow<IRequestedHoliday>[] {
    return holidays.map((holiday) => {
      const operations = [];

      if (holiday.status === HolidayRequestStatus.UNDER_EVALUATION) {
        if (this.isAdministrator()) {
          operations.push(
            {
              name: TableOperationEnum.CHECK,
              triggerFn: this.onWarningAcceptDialogClick.bind(this),
            },
            {
              name: TableOperationEnum.CANCEL,
              triggerFn: this.onWarningRejectDialogClick.bind(this),
            },
          );
        }

        if (holiday.userId === userId) {
          operations.push(
            {
              name: TableOperationEnum.EDIT,
              triggerFn: this.onSetHolidayRequestClick.bind(this),
            },
            {
              name: TableOperationEnum.DELETE,
              triggerFn: this.onWarningDeleteDialogClick.bind(this),
            },
          );
        }
      }

      return {
        model: holiday,
        cells: {
          name: { value: holiday.claimant },
          from: { value: holiday.startDate },
          to: { value: holiday.endDate },
          status: { value: this.getRequestStatusConfig(holiday) },
          comment: { value: holiday.decisionReason ?? holiday.reason },
          op: {
            operations: operations,
          },
        },
      };
    });
  }

  private acceptOrRejectHolidayRequestObservable(
    holidayRequest: IRequestedHoliday,
    accept: boolean,
  ): Observable<string | null | string[]> {
    const label = accept ? 'elfogadása' : 'elutasítása';
    this.popupService.add({
      details: `A szabadság kérelem ${label} folyamatban...`,
      severity: 'info',
    });

    const user = this.userFirebaseService.user$.getValue();

    if (!user) {
      return of(null);
    }

    const data: Partial<IRequestedHoliday> = {
      decisionBy: `${user.lastName} ${user.firstName}`,
      decisionReason: accept ? null : this.reasonForReject(),
      status: accept ? HolidayRequestStatus.ACCEPTED : HolidayRequestStatus.REJECTED,
    };

    const observables: Observable<any>[] = [
      this.holidayFirebaseService.updateHolidayRequest(holidayRequest.id, data).pipe(
        finalize(() => {
          this.reasonForReject.set('');
          this.dialogsService.removeLastOpenedDialog();
        }),
        tap(() => {
          this.popupService.add({
            details: `A szabadság kérelem ${label} sikeresen megtörtént`,
            severity: 'success',
            title: 'Sikeres művelet!',
          });
        }),
        catchError(() => {
          this.popupService.add({
            details: `A szabadság kérelem ${label} sorá hiba történt`,
            severity: 'error',
            title: 'Sikertelen művelet!',
          });
          return of(null);
        }),
      ),
    ];

    if (accept) {
      observables.push(this.createCalendarEvents(holidayRequest));
    }

    return combineLatest(observables);
  }

  private createCalendarEvents(holidayRequest: IRequestedHoliday): Observable<void> {
    const { claimant, startDate, endDate } = holidayRequest;

    const register: CalendarRegisterType = {
      type: CalendarEventEnum.HOLIDAY,
      summary: `${claimant} szabadságon`,
      organizerDisplayName: claimant,
      eventStart: formatDateWithMoment(startDate, { formats: ['YYYY. MM. DD.'] }),
      eventEnd: formatDateWithMoment(endDate, { formats: ['YYYY. MM. DD.'] }),
      description: holidayRequest.reason,
      organizerEmail: '',
    };
    return this.calendarFirebaseService.createEvent(register, holidayRequest.userId);
  }

  private deleteHolidayRequstObservable(holidayRequestId: string): Observable<string | null> {
    this.popupService.add({
      details: 'A szabadság kérelem törlés folyamatban...',
      severity: 'info',
    });
    return this.holidayFirebaseService.deleteHolidayRequet(holidayRequestId).pipe(
      tap(() => {
        this.popupService.add({
          details: 'A szabadság kérelem törlése sikeresen megtörtént',
          severity: 'success',
          title: 'Sikeres művelet!',
        });
        this.dialogsService.removeLastOpenedDialog();
      }),
      catchError(() => {
        this.popupService.add({
          details: 'A szabadság kérelem törlése során hiba történt',
          severity: 'error',
          title: 'Sikertelen művelet!',
        });
        return of(null);
      }),
    );
  }

  private getRequestStatusConfig(holidayRequest: IRequestedHoliday): string {
    switch (holidayRequest.status) {
      case HolidayRequestStatus.ACCEPTED:
        return `<div class="label-success">Elfogadva</div><div class="small fw-bold">${holidayRequest.decisionBy} álltal</div>`;
      case HolidayRequestStatus.REJECTED:
        return `<div class="label-danger">Elutasítva</div><div class="small fw-bold">${holidayRequest.decisionBy} álltal</div>`;
      default:
        return `<div class="small fw-bold">${HolidayRequestStatus.UNDER_EVALUATION}</div>`;
    }
  }
}
