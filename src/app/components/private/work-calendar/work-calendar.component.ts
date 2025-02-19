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
  of,
  ReplaySubject,
  switchMap,
  take,
  takeUntil,
  tap,
} from 'rxjs';

import { HUN_DAYS } from '../../../core/constans/variables';
import { DeviceType, DeviceTypeService } from '../../../services/device-type.service';
import { DatepickerComponent } from '../../reusables/datepicker/datepicker.component';
import { GoogleCalendarService } from '../../../services/google/google-calendar.service';
import { ICalendar, ICalendarEvent, ICalendarTask } from '../../../models/calendar.model';
import { CalendarEventCreatorComponent } from './calendar-event-creator/calendar-event-creator.component';
import { DragScrollDirective } from '../../../directives/drag-scroll.directive';
import { CalendarInfoGroupsComponent } from './calendar-info-groups/calendar-info-groups.component';
import { UserFirebaseService } from '../../../services/firebase/user-firebase.service';
import { IUser } from '../../../models/user.model';
import { CalendarFirebaseService } from '../../../services/firebase/calendar-firebase.service';
import { generateMonthlyCalendar } from '../../../core/helpers';
import { GoogleAuthService } from '../../../services/google/google-auth.service';
import { FadeDirective } from '../../../directives/fade.directive';
import { CalendarEventEnum } from '../../../core/constans/enums';
import { PopupService } from '../../../services/popup.service';
import { DialogsService } from '../../../services/dialogs.service';
import { DialogModel } from '../../../models/dialog.model';

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

  public readonly SORTED_HUN_DAYS = HUN_DAYS.sort((a, b) => a.order - b.order);
  public readonly GOOGLE_EVENT = CalendarEventEnum.GOOGLE_EVENT;

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
  /* public month = model(9);
  public year = model(2024); */
  private year$ = toObservable(this.year);
  private month$ = toObservable(this.month);

  public deviceType = signal<DeviceType>('desktop');

  private googleCalendarEvents = signal<Array<ICalendarEvent>>([]);
  private googleCalendarTasks = signal<Array<ICalendarTask>>([]);
  private calendarEvents = signal<Array<ICalendarEvent>>([]);

  public selectedCalendarEvent = signal<ICalendarEvent | null>(null);
  public selectedGoogleCalendarEvent = signal<ICalendarEvent | null>(null);
  public selectedGoogleCalendarTask = signal<ICalendarTask | null>(null);

  private readonly destroyed$ = new ReplaySubject<void>(1);

  private readonly deviceTypeSerivce$ = inject(DeviceTypeService);
  private readonly googleCalendarService = inject(GoogleCalendarService);
  private readonly googleAuthService = inject(GoogleAuthService);
  private readonly userFirebaseService = inject(UserFirebaseService);
  private readonly dialogService = inject(DialogsService);
  private readonly calendarFirebaseService = inject(CalendarFirebaseService);
  private readonly popupService = inject(PopupService);

  public ngOnInit(): void {
    this.fetchGoogleCalendarEvents();
    this.fetchDeviceType();
  }

  public ngOnDestroy(): void {
    this.destroyed$.next();
    this.destroyed$.complete();
  }

  public fetchCalendarEvents(): void {
    this.calendarFirebaseService
      .getCalendarEvents(this.year(), this.month())
      .pipe(take(1))
      .subscribe({
        next: (calendarEvents) => {
          this.calendarEvents.set(calendarEvents);
        },
      });
  }

  public fetchGoogleCalendarEvents(): void {
    this.userFirebaseService.user$
      .pipe(
        takeUntil(this.destroyed$),
        switchMap((user: IUser | null) => {
          this.user.set(user);
          if (user && user.googleRefreshToken) {
            return combineLatest({
              year: this.year$,
              month: this.month$,
              payload: this.googleAuthService.googleApiPayload$,
            });
          }

          return of(null);
        }),
        switchMap((result) => {
          if (result && result.payload) {
            return combineLatest([
              this.googleCalendarService.getEvents(result.year, result.month).pipe(
                tap((events) => {
                  this.googleCalendarEvents.set(events);
                }),
                catchError(() => {
                  this.popupService.add({
                    details: 'Hiba történt a google naptár eseményeinek lekérdezése során.',
                    severity: 'error',
                  });
                  return of(null);
                }),
              ),
              this.googleCalendarService.getTasks(result.year, result.month).pipe(
                tap((tasks) => {
                  this.googleCalendarTasks.set(tasks);
                }),
                catchError(() => {
                  this.popupService.add({
                    details: 'Hiba történt a google naptár teendőinek lekérdezése során.',
                    severity: 'error',
                  });
                  return of(null);
                }),
              ),
            ]);
          }

          return of(null);
        }),
      )
      .subscribe();
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

  private fetchDeviceType(): void {
    this.deviceTypeSerivce$.pipe(takeUntil(this.destroyed$)).subscribe(this.deviceType.set);
  }
}
