import {
  Component,
  computed,
  inject,
  model,
  OnDestroy,
  OnInit,
  signal,
  TemplateRef,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { toObservable } from '@angular/core/rxjs-interop';
import {
  catchError,
  combineLatest,
  interval,
  merge,
  Observable,
  of,
  ReplaySubject,
  switchMap,
  take,
  takeUntil,
  tap,
} from 'rxjs';
import moment from 'moment';

import { HUN_DAYS } from '../../../core/constans/variables';
import { DeviceType, DeviceTypeService } from '../../../services/device-type.service';
import { DatepickerComponent } from '../../reusables/datepicker/datepicker.component';
import { GoogleCalendarService } from '../../../services/google/google-calendar.service';
import {
  CalendarTodayEventTaskType,
  ICalendar,
  ICalendarEvent,
  ICalendarTask,
} from '../../../models/calendar.model';
import { CalendarEventCreatorComponent } from './calendar-event-creator/calendar-event-creator.component';
import { DragScrollDirective } from '../../../directives/drag-scroll.directive';
import { CalendarInfoGroupsComponent } from './calendar-info-groups/calendar-info-groups.component';
import { UserFirebaseService } from '../../../services/firebase/user-firebase.service';
import { IUser } from '../../../models/user.model';
import { CalendarFirebaseService } from '../../../services/firebase/calendar-firebase.service';
import { formatDateWithMoment, generateMonthlyCalendar } from '../../../core/helpers';
import { GoogleAuthService } from '../../../services/google/google-auth.service';
import { FadeDirective } from '../../../directives/fade.directive';
import { CalendarEventEnum } from '../../../core/constans/enums';
import { PopupService } from '../../../services/popup.service';
import { DialogsService } from '../../../services/dialogs.service';
import { DialogModel } from '../../../models/dialog.model';

type ResultType = {
  year: number;
  month: number;
  byInterval: boolean;
  payload: { accessToken: string; refreshToken: string } | null;
};

@Component({
  selector: 'app-work-calendar',
  standalone: true,
  imports: [
    CommonModule,
    DatepickerComponent,
    CalendarEventCreatorComponent,
    CalendarInfoGroupsComponent,
    DragScrollDirective,
    FadeDirective,
  ],
  templateUrl: './work-calendar.component.html',
  styleUrl: './work-calendar.component.scss',
})
export class WorkCalendarComponent implements OnInit, OnDestroy {
  public googleCalendarEventViewTemplate = viewChild<TemplateRef<any>>(
    'googleCalendarEventViewTemplate',
  );

  public googleCalendarTaskViewTemplate = viewChild<TemplateRef<any>>(
    'googleCalendarTaskViewTemplate',
  );

  public calendarInfoGroupsComponent = viewChild<CalendarInfoGroupsComponent>(
    CalendarInfoGroupsComponent,
  );

  public readonly SORTED_HUN_DAYS = HUN_DAYS.sort((a, b) => a.order - b.order);
  public readonly CALENDAR_EVENTS = CalendarEventEnum;

  public calendarItems = computed<Array<ICalendar>>(() => {
    const events = [...this.googleCalendarEvents(), ...this.calendarEvents()];
    const tasks = this.googleCalendarTasks();
    const year = this.year();
    const month = this.month();

    return generateMonthlyCalendar(year, month, events, tasks);
  });

  public user = signal<IUser | null>(null);

  public month = model(new Date().getMonth() + 1);
  public year = model(new Date().getFullYear());
  private year$ = toObservable(this.year);
  private month$ = toObservable(this.month);

  public deviceType = signal<DeviceType>('desktop');

  public googleCalendarTodayEventsAndTasks = computed<Array<CalendarTodayEventTaskType>>(() => {
    const tasks = this.googleCalendarTodayTasks();
    const events = this.googleCalendarTodayEvents();
    return [...events, ...tasks].sort((a, b) => {
      if (a.time.length === 13) {
        return 1;
      }

      return a.time.localeCompare(b.time);
    });
  });

  private googleCalendarEvents = signal<Array<ICalendarEvent>>([]);
  private googleCalendarTodayEvents = signal<Array<CalendarTodayEventTaskType>>([]);

  private googleCalendarTasks = signal<Array<ICalendarTask>>([]);
  private googleCalendarTodayTasks = signal<Array<CalendarTodayEventTaskType>>([]);
  private calendarEvents = signal<Array<ICalendarEvent>>([]);

  public selectedCalendarEvent = signal<ICalendarEvent | null>(null);
  public selectedGoogleCalendarEvent = signal<ICalendarEvent | null>(null);
  public selectedGoogleCalendarTask = signal<ICalendarTask | null>(null);

  private readonly INTERVAL_TIME = 600000;
  private readonly destroyed$ = new ReplaySubject<void>(1);
  private readonly interval$ = interval(this.INTERVAL_TIME);

  private readonly deviceTypeSerivce$ = inject(DeviceTypeService);
  private readonly googleCalendarService = inject(GoogleCalendarService);
  private readonly googleAuthService = inject(GoogleAuthService);
  private readonly userFirebaseService = inject(UserFirebaseService);
  private readonly dialogService = inject(DialogsService);
  private readonly calendarFirebaseService = inject(CalendarFirebaseService);
  private readonly popupService = inject(PopupService);

  public ngOnInit(): void {
    this.fetchAllCalendarEvents();
    this.fetchDeviceType();
  }

  public ngOnDestroy(): void {
    this.destroyed$.next();
    this.destroyed$.complete();
  }

  public fetchCalendarEvents(): void {
    if (this.user()) {
      this.getCalendarEventsObservable(this.year(), this.month()).pipe(take(1)).subscribe();
    }
  }

  public onCalendarEventSelect(event: ICalendarEvent): void {
    if (event.type === CalendarEventEnum.GOOGLE_EVENT) {
      this.selectedGoogleCalendarEvent.set({ ...event });

      this.dialogService.addNewDialog(
        new DialogModel('Google esemény', {
          content: this.googleCalendarEventViewTemplate(),
          size: 'normal',
        }),
      );
      return;
    }

    if (event.type === CalendarEventEnum.DAY_START || event.type === CalendarEventEnum.DAY_END) {
      this.calendarInfoGroupsComponent()?.onOpenEndOfDayDialog(event);
      return;
    }

    this.selectedCalendarEvent.set({ ...event });
  }

  public onCalendarTaskSelect(task: ICalendarTask): void {
    this.selectedGoogleCalendarTask.set({ ...task });

    this.dialogService.addNewDialog(
      new DialogModel('Google teendő', {
        content: this.googleCalendarTaskViewTemplate(),
        size: 'small',
      }),
    );
  }

  private fetchAllCalendarEvents(): void {
    this.userFirebaseService.user$
      .pipe(
        takeUntil(this.destroyed$),
        switchMap((user: IUser | null) => this.handleDataChangeObservable(user)),
        switchMap((result) => this.handleResultObservable(result)),
      )
      .subscribe();
  }

  private handleDataChangeObservable(user: IUser | null): Observable<ResultType | null> {
    this.user.set(user);

    if (!user) {
      return of(null);
    }

    const combinedObservable = {
      year: this.year$,
      month: this.month$,
      payload: user.googleRefreshToken ? this.googleAuthService.googleApiPayload$ : of(null),
    };

    return merge(
      combineLatest({
        ...combinedObservable,
        byInterval: of(false),
      }),
      this.interval$.pipe(
        switchMap(() =>
          combineLatest({
            ...combinedObservable,
            byInterval: of(true),
          }),
        ),
      ),
    );
  }

  private handleResultObservable(result: ResultType | null): Observable<Array<any> | null> {
    if (!result) {
      return of(null);
    }

    const combinedObservable: Array<Observable<any>> = [
      this.getCalendarEventsObservable(result.year, result.month),
    ];

    if (result.payload) {
      const todayDate = moment();
      const isToday = todayDate.year() === result.year && todayDate.month() + 1 === result.month;

      combinedObservable.push(
        this.getGoogleCalendarEventsObservable(result.year, result.month, isToday),
        this.getGoogleCalendarTasksObservable(result.year, result.month, isToday),
      );

      if (result.byInterval && !isToday) {
        combinedObservable.push(
          this.getGoogleCalendarEventsObservable(todayDate.year(), todayDate.month() + 1, true),
          this.getGoogleCalendarTasksObservable(todayDate.year(), todayDate.month() + 1, true),
        );
      }
    }

    return combineLatest(combinedObservable);
  }

  private getCalendarEventsObservable(
    year: number,
    month: number,
  ): Observable<Array<ICalendarEvent> | null> {
    return this.calendarFirebaseService
      .getCalendarEvents(year, month, this.user()!.id, this.user()!.role)
      .pipe(
        tap((calendarEvents) => {
          this.calendarEvents.set(calendarEvents);
        }),
        catchError(() => of(null)),
      );
  }

  private getGoogleCalendarEventsObservable(
    year: number,
    month: number,
    today: boolean,
  ): Observable<Array<ICalendarEvent> | null> {
    return this.googleCalendarService.getEvents(year, month, this.user()!.id).pipe(
      tap((events) => {
        this.googleCalendarEvents.set(events);

        if (today) {
          const now = moment();
          const nowDate = now.format('YYYY. MM. DD.');
          now.minute(now.minute() + 10);

          this.googleCalendarTodayEvents.set(
            events
              .filter(
                (event) =>
                  event.eventStart.startsWith(nowDate) &&
                  (event.eventStart.length === 13 || moment(event.eventStart).isAfter(now)),
              )
              .map((event) => ({
                label: event.summary,
                callback: this.onCalendarEventSelect.bind(this),
                time:
                  event.eventStart.length === 13
                    ? event.eventStart
                    : formatDateWithMoment(event.eventStart, {
                        formats: ['YYYY. MM. DD. HH:mm:ss'],
                        useFormat: 'YYYY. MM. DD. HH:mm',
                      }),
                event: event,
              })),
          );
        }
      }),
      catchError(() => {
        this.popupService.add({
          details: 'Hiba történt a google naptár eseményeinek lekérdezése során.',
          severity: 'error',
        });
        return of(null);
      }),
    );
  }

  private getGoogleCalendarTasksObservable(
    year: number,
    month: number,
    today: boolean,
  ): Observable<Array<ICalendarTask> | null> {
    return this.googleCalendarService.getTasks(year, month).pipe(
      tap((tasks) => {
        this.googleCalendarTasks.set(tasks);

        if (today) {
          const now = moment();
          const nowDate = now.format('YYYY. MM. DD.');
          now.minute(now.minute() + 10);
          this.googleCalendarTodayTasks.set(
            tasks
              .filter(
                (task) =>
                  task.due.startsWith(nowDate) &&
                  (task.due.length === 13 || moment(task.due).isAfter(now)),
              )
              .map((task) => ({
                label: task.title,
                time: task.due,
                task: task,
                callback: this.onCalendarTaskSelect.bind(this),
              })),
          );
        }
      }),
      catchError(() => {
        this.popupService.add({
          details: 'Hiba történt a google naptár teendőinek lekérdezése során.',
          severity: 'error',
        });
        return of(null);
      }),
    );
  }

  private fetchDeviceType(): void {
    this.deviceTypeSerivce$.pipe(takeUntil(this.destroyed$)).subscribe(this.deviceType.set);
  }
}
