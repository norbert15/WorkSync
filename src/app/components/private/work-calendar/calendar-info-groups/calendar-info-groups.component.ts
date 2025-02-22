import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  inject,
  input,
  model,
  OnDestroy,
  OnInit,
  output,
  signal,
  TemplateRef,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  catchError,
  finalize,
  Observable,
  of,
  ReplaySubject,
  switchMap,
  take,
  takeUntil,
  tap,
} from 'rxjs';
import moment from 'moment';

import { ButtonComponent } from '../../../reusables/button/button.component';
import {
  CalendarRegisterType,
  CalendarTodayEventTaskType,
} from '../../../../models/calendar.model';
import { UserFirebaseService } from '../../../../services/firebase/user-firebase.service';
import { IUser, IUserWorkStatus } from '../../../../models/user.model';
import { PopupService } from '../../../../services/popup.service';
import { DialogModel } from '../../../../models/dialog.model';
import { DialogsService } from '../../../../services/dialogs.service';
import { CalendarFirebaseService } from '../../../../services/firebase/calendar-firebase.service';
import { CalendarEventEnum } from '../../../../core/constans/enums';
import { PublicationFirebaseService } from '../../../../services/firebase/publication-firebase.service';

type EventType = {
  name: string;
  subLabel?: string;
  class?: string;
  item?: any;
  callback?: (item: any) => void;
};

type EventKey = {
  notificationEvents: Array<EventType>;
};

type InfoCardType = {
  title: string;
  bootstrapIconClass: string;
  events: Array<EventType>;
  fallbackLabel?: string;
  showCounter?: boolean;
  footer?: { label?: string; link?: string; templateRef?: TemplateRef<any> };
};

@Component({
  selector: 'app-calendar-info-groups',
  standalone: true,
  imports: [CommonModule, ButtonComponent, FormsModule],
  templateUrl: './calendar-info-groups.component.html',
  styleUrl: './calendar-info-groups.component.scss',
})
export class CalendarInfoGroupsComponent implements OnInit, OnDestroy {
  public todayTemplate = viewChild<TemplateRef<any>>('todayTemplate');
  public endOfDayDialogTemplate = viewChild<TemplateRef<any>>('endOfDayDialogTemplate');
  public endOfDayButtonDialogTemplate = viewChild<TemplateRef<any>>('endOfDayButtonDialogTemplate');

  public googleCalendarEventsAndTasks = input<Array<CalendarTodayEventTaskType>>([]);

  public calendarSave = output<void>();

  public userWorkStatus = signal<IUserWorkStatus | null>(null);

  public infoCards = computed<Array<InfoCardType>>(() => {
    const calendarEventsAndTasks = this.googleCalendarEventsAndTasks();
    const userWorkStatus = this.userWorkStatus();
    const todayTemplate = this.todayTemplate();
    const events = this.events();
    const branches = this.publicationFirebaseService.branchesForPublications();

    const todayEvents: Array<EventType> = [
      {
        name: userWorkStatus?.workStart ?? 'Kedzje meg a napját,',
        subLabel: userWorkStatus?.workStart ? 'Nap kezdete:' : '',
      },
      {
        name:
          userWorkStatus?.workEnd ??
          (userWorkStatus?.workStart ? '-' : 'és jelentsen a nap végén!'),
        subLabel: userWorkStatus?.workStart ? 'Nap vége:' : '',
      },
    ];

    return [
      {
        title: 'Közelgő esemény(ek)',
        bootstrapIconClass: 'bi bi-calendar2-check',
        fallbackLabel: 'Nincs előre ütemezett esemény.',
        showCounter: true,
        footer: { label: 'További részletek' }, // TODO: navigációs link vagy callback ki találni...
        events: calendarEventsAndTasks.map((et) => {
          return {
            subLabel: et.label,
            class: 'label-primary',
            name: et.time,
            item: et.event ?? et.task,
            callback: et.callback,
          };
        }),
      },
      {
        title: 'Értesítések',
        bootstrapIconClass: 'bi bi-bell',
        showCounter: true,
        events: events.notificationEvents,
        fallbackLabel: 'Nincs elérhető értesítés.',
        footer: {
          label: events.notificationEvents.length
            ? 'Továbbiak megtekintése'
            : 'Értesítés megtekintése',
        },
      },
      {
        title: 'Mai napom',
        bootstrapIconClass: 'bi bi-person-workspace',
        events: todayEvents,
        footer: { templateRef: todayTemplate },
      },
      {
        title: 'Publikálásra vár',
        bootstrapIconClass: 'bi bi-github',
        events: branches.map((branch) => ({
          name: branch.name,
          class: branch.status,
        })),
        showCounter: true,
        fallbackLabel: 'Nincs publikálásra váró branch',
        footer: {
          label: branches.length > 3 ? 'Továbbiak megtekintése' : 'Branch(es) megtekintése',
        },
      },
    ];
  });

  public userReport = model('');
  public endOfDayDatetime = model('');
  public endOfDayBtnIsLoading = signal(false);

  private user: IUser | null = null;

  private events = signal<EventKey>({
    notificationEvents: [],
  });

  private readonly destroyed$ = new ReplaySubject<void>(1);
  private readonly userFirebaseService = inject(UserFirebaseService);
  private readonly popupService = inject(PopupService);
  private readonly dialogService = inject(DialogsService);
  private readonly calendarFirebaseSevice = inject(CalendarFirebaseService);
  private readonly publicationFirebaseService = inject(PublicationFirebaseService);

  public ngOnInit(): void {
    this.fetchUserWorkStatus();
    this.fetchInfoCards();
  }

  public ngOnDestroy(): void {
    this.destroyed$.next();
    this.destroyed$.complete();
  }

  public onCloseDialogClick(): void {
    this.dialogService.removeLastOpenedDialog();
  }

  public onOpenEndOfDayDialog(): void {
    const workEnd = this.userWorkStatus()?.workEnd;
    this.endOfDayDatetime.set(workEnd ?? moment().format('YYYY. MM. DD. HH:mm'));
    this.userReport.set(this.userWorkStatus()?.report ?? '');
    const newDialog: DialogModel = new DialogModel(
      workEnd ? 'Munka befejezve' : 'Munka befejezése',
      {
        footer: this.endOfDayButtonDialogTemplate(),
        content: this.endOfDayDialogTemplate(),
      },
    );
    this.dialogService.addNewDialog(newDialog);
    newDialog.afterComplete$.pipe(takeUntil(this.destroyed$)).subscribe({
      next: () => {
        this.userReport.set('');
        this.endOfDayDatetime.set('');
      },
    });
  }

  public onEndOfDayClick(): void {
    const workStatus = this.userWorkStatus();
    if (workStatus && !workStatus.workEnd && this.userReport()) {
      const endDateTime = this.endOfDayDatetime() + ':00';
      this.endOfDayBtnIsLoading.set(true);
      this.userFirebaseService
        .startUserEndOfDay(workStatus.id, endDateTime, this.userReport())
        .pipe(
          take(1),
          switchMap(() => {
            this.popupService.add({
              details: 'A napja sikeresen befejeződött.',
              severity: 'success',
              title: 'Jó pihenést!',
            });
            const report = this.userReport();
            this.dialogService.removeLastOpenedDialog();
            return this.addCalendarEventByWorkStatusChange(
              this.userWorkStatus()!.workStart,
              endDateTime,
              CalendarEventEnum.DAY_END,
              report,
            );
          }),
          finalize(() => {
            this.endOfDayBtnIsLoading.set(false);
          }),
        )
        .subscribe({
          error: () => {
            this.popupService.add({
              details: 'Hiba történt a művelet elvégzése során.',
              severity: 'error',
            });
          },
        });
    }
  }

  public onStartTheDayClick(): void {
    if (!this.userWorkStatus() && this.user) {
      const startDatetime = moment().format('YYYY. MM. DD. HH:mm:ss');
      this.endOfDayBtnIsLoading.set(true);
      this.userFirebaseService
        .startUserWorkDay(this.user.id, startDatetime)
        .pipe(
          take(1),
          switchMap(() => {
            this.popupService.add({
              details: 'A napja sikeresen megkezdődött.',
              severity: 'success',
              title: 'Jó munkát!',
            });
            return this.addCalendarEventByWorkStatusChange(
              startDatetime,
              '',
              CalendarEventEnum.DAY_START,
              '',
            );
          }),
          finalize(() => {
            this.endOfDayBtnIsLoading.set(false);
          }),
        )
        .subscribe({
          error: () => {
            this.popupService.add({
              details: 'Hiba történt a művelet elvégzése során.',
              severity: 'error',
            });
          },
        });
    }
  }

  private addCalendarEventByWorkStatusChange(
    startDatetime: string,
    endDateTime: string,
    type: CalendarEventEnum,
    report: string,
  ): Observable<string[]> {
    const summary =
      type === CalendarEventEnum.DAY_START ? 'megkezdte a napját' : 'befejezte a napját';
    const userName = `${this.user?.lastName} ${this.user?.firstName}`;
    const register: CalendarRegisterType = {
      description: report,
      eventEnd: endDateTime,
      eventStart: startDatetime,
      organizerDisplayName: userName,
      organizerEmail: this.user?.email ?? '',
      summary: `${userName} ${summary}`,
      type: type,
    };
    return this.calendarFirebaseSevice.createEvent(register).pipe(
      tap(() => {
        this.popupService.add({
          details: 'A művelethez tartozó naptári esemény létrehozva.',
          severity: 'success',
          title: `Naptári esemény`,
        });
        this.calendarSave.emit();
      }),
      catchError(() => {
        this.popupService.add({
          details: 'A művelethez tartozó naptári esemény létrehozása során hiba történt.',
          severity: 'error',
          title: `Naptári esemény`,
        });
        return of([]);
      }),
    );
  }

  private fetchInfoCards(): void {
    // TODO: lekérdezés
    this.events.set({
      // TODO: status alapján sorba rendezés pl due old new
      notificationEvents: [
        { class: 'label-primary', name: 'Új branch került publikálásra' },
        { class: 'label-gray', name: 'Horváth Lajos nem elérhető' },
        { class: 'label-success', name: 'Szabadságkérelmét elfogadták' },
      ],
    });
  }

  private fetchUserWorkStatus(): void {
    this.userFirebaseService.user$
      .pipe(
        takeUntil(this.destroyed$),
        switchMap((user: IUser | null) => {
          this.user = user;
          if (!user) {
            return of(null);
          }

          return this.userFirebaseService.getUserWorkStatus(user.id);
        }),
      )
      .subscribe({
        next: (result: IUserWorkStatus | null) => {
          this.userWorkStatus.set(result);
        },
      });
  }
}
