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
import { MatIcon } from '@angular/material/icon';
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
  ICalendar,
} from '../../../../models/calendar.model';
import { UserFirebaseService } from '../../../../services/firebase/user-firebase.service';
import { IUser, IUserWorkStatus } from '../../../../models/user.model';
import { PopupService } from '../../../../services/popup.service';
import { DialogModel } from '../../../../models/dialog.model';
import { DialogsService } from '../../../../services/dialogs.service';
import { CalendarFirebaseService } from '../../../../services/firebase/calendar-firebase.service';
import { CalendarEventEnum, IconIds } from '../../../../core/constans/enums';
import { PublicationFirebaseService } from '../../../../services/firebase/publication-firebase.service';
import { NotificationFirebaseService } from '../../../../services/firebase/notification-firebase.service';
import { NOTIFICATION_COLORS } from '../../../../core/constans/variables';
import { INotification } from '../../../../models/notification.model';
import { Router } from '@angular/router';
import { APP_PATHS } from '../../../../core/constans/paths';

type EventType = {
  name: string;
  subLabel?: string;
  class?: string;
  item?: any;
  callback?: (item: any) => void;
};

type InfoCardType = {
  title: string;
  icon: IconIds;
  iconColor: string;
  events: EventType[];
  fallbackLabel?: string;
  showCounter?: boolean;
  footer?: { label?: string; link?: string; templateRef?: TemplateRef<any>; callback?: () => void };
};

@Component({
  selector: 'app-calendar-info-groups',
  standalone: true,
  imports: [CommonModule, ButtonComponent, FormsModule, MatIcon],
  templateUrl: './calendar-info-groups.component.html',
  styleUrl: './calendar-info-groups.component.scss',
})
export class CalendarInfoGroupsComponent implements OnInit, OnDestroy {
  public todayTemplate = viewChild<TemplateRef<any>>('todayTemplate');
  public endOfDayDialogTemplate = viewChild<TemplateRef<any>>('endOfDayDialogTemplate');
  public endOfDayButtonDialogTemplate = viewChild<TemplateRef<any>>('endOfDayButtonDialogTemplate');

  public googleCalendarEventsAndTasks = input<CalendarTodayEventTaskType[]>([]);

  public userWorkStatusCalendarEvent = input<ICalendar | null>(null);

  public calendarSave = output<void>();

  public calendarTodayClick = output<void>();

  public ownWorkStatus = signal<IUserWorkStatus | null>(null);

  public infoCards = computed<InfoCardType[]>(() => {
    return [
      this.getCalendarEventsAndTasksInfoCard(),
      this.getNotificationsInfoCard(),
      this.getWorkStatusInfoCard(),
      this.getBranchesInfoCard(),
    ];
  });

  public userReport = model('');
  public endOfDayDatetime = model('');
  public startOfDatetime = model('');
  public endOfDayBtnIsLoading = signal(false);

  private user: IUser | null = null;

  private readonly destroyed$ = new ReplaySubject<void>(1);

  private readonly router = inject(Router);
  private readonly userFirebaseService = inject(UserFirebaseService);
  private readonly popupService = inject(PopupService);
  private readonly dialogService = inject(DialogsService);
  private readonly calendarFirebaseSevice = inject(CalendarFirebaseService);
  private readonly publicationFirebaseService = inject(PublicationFirebaseService);
  private readonly notiFirebaseService = inject(NotificationFirebaseService);

  public ngOnInit(): void {
    this.fetchUserWorkStatus();
  }

  public ngOnDestroy(): void {
    this.destroyed$.next();
    this.destroyed$.complete();
  }

  public onCloseDialogClick(): void {
    this.dialogService.removeLastOpenedDialog();
  }

  public onOpenEndOfDayDialog(): void {
    if (!this.ownWorkStatus()) {
      return;
    }

    const { workEnd, workStart } = this.ownWorkStatus()!;
    this.userReport.set(this.ownWorkStatus()?.report ?? '');

    this.endOfDayDatetime.set(workEnd ?? moment().format('YYYY. MM. DD. HH:mm'));
    this.startOfDatetime.set(workStart);

    const newDialog: DialogModel = new DialogModel(
      workEnd ? 'Munka befejezve' : 'Munka befejezése',
      {
        footer: this.endOfDayButtonDialogTemplate(),
        content: this.endOfDayDialogTemplate(),
        size: 'normal',
      },
    );
    this.dialogService.addNewDialog(newDialog);
    newDialog.dialogClosed$.pipe(takeUntil(this.destroyed$)).subscribe({
      next: () => {
        this.userReport.set('');
        this.endOfDayDatetime.set('');
      },
    });
  }

  public onEndOfDayClick(): void {
    const workStatus = this.ownWorkStatus();
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
              this.ownWorkStatus()!.workStart,
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
    if (!this.ownWorkStatus() && this.user) {
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

  public onFooterClick(infoCard: InfoCardType): void {
    if (infoCard.footer?.callback) {
      infoCard.footer.callback();
    } else if (infoCard.footer?.link) {
      this.router.navigate([infoCard.footer.link]);
    }
  }

  private addCalendarEventByWorkStatusChange(
    startDatetime: string,
    endDateTime: string,
    type: CalendarEventEnum,
    report: string,
  ): Observable<void | null> {
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
    return this.calendarFirebaseSevice.createEvent(register, this.user!.id).pipe(
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
        return of(null);
      }),
    );
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
          this.ownWorkStatus.set(result);
        },
      });
  }

  private getCalendarEventsAndTasksInfoCard(): InfoCardType {
    const calendarEventsAndTasks = this.googleCalendarEventsAndTasks();

    return {
      title: 'Közelgő esemény(ek)',
      icon: IconIds.CALENDAR_CHECK,
      fallbackLabel: 'Nincs előre ütemezett esemény.',
      showCounter: true,
      iconColor: 'label-success',
      footer: { label: 'Naptárhoz', callback: () => this.calendarTodayClick.emit() },
      events: calendarEventsAndTasks.map((et) => {
        return {
          subLabel: et.label,
          class: 'label-primary',
          name: et.time,
          item: et.event ?? et.task,
          callback: et.callback,
        };
      }),
    };
  }

  /**
   * Értesítések infókártya adatainak összeállítása
   *
   * @returns {InfoCardType}
   */
  private getNotificationsInfoCard(): InfoCardType {
    const notifications = this.notiFirebaseService.userNotifications().filter((n) => !n.seen);
    return {
      title: 'Értesítések',
      icon: IconIds.BELL_FILL,
      iconColor: 'label-accent',
      showCounter: true,
      events: notifications.map((n) => ({
        name: n.subject,
        class: NOTIFICATION_COLORS[n.type],
        item: n,
        callback: (item: INotification) => {
          this.router.navigate([APP_PATHS.root, APP_PATHS.notifications], {
            queryParams: { notificationId: item.id },
          });
        },
      })),
      fallbackLabel: 'Nincs elérhető értesítés.',
      footer: {
        label: notifications.length ? 'Továbbiak megtekintése' : 'Értesítés megtekintése',
        link: `${APP_PATHS.root}/${APP_PATHS.notifications}`,
      },
    };
  }

  private getWorkStatusInfoCard(): InfoCardType {
    const todayTemplate = this.todayTemplate();
    const userWorkStatus = this.ownWorkStatus();

    return {
      title: 'Mai napom',
      icon: IconIds.CARD_TEXT,
      iconColor: 'label-secondary',
      footer: { templateRef: todayTemplate },
      events: [
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
      ],
    };
  }

  private getBranchesInfoCard(): InfoCardType {
    const branches = this.publicationFirebaseService.branchesForPublications();
    return {
      title: 'Publikálásra vár',
      icon: IconIds.GITHUB,
      iconColor: 'label-primary',
      events: branches.map((branch) => ({
        name: branch.name,
        class: `${branch.status} label-small`,
      })),
      showCounter: true,
      fallbackLabel: 'Nincs publikálásra váró branch',
      footer: {
        label: branches.length > 3 ? 'Továbbiak megtekintése' : 'Branch(es) megtekintése',
        link: `${APP_PATHS.root}/${APP_PATHS.publications}`,
      },
    };
  }
}
