import { Component, computed, inject, model, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReplaySubject, take, takeUntil } from 'rxjs';

import { HUN_DAYS, HUN_MONTHS } from '../../../core/constans/variables';
import { DeviceType, DeviceTypeService } from '../../../services/device-type.service';
import { DatepickerComponent } from '../../reusables/datepicker/datepicker.component';
import { GoogleCalendarService } from '../../../services/google/google-calendar.service';
import { ICalendarEvent } from '../../../models/calendar.model';
import { CalendarEventCreatorComponent } from './calendar-event-creator/calendar-event-creator.component';
import { DragScrollDirective } from '../../../directives/drag-scroll.directive';
import { CalendarInfoGroupsComponent } from './calendar-info-groups/calendar-info-groups.component';

type CalenderItemType = {
  label: string;
  date: string;
  dayName: string;
  monthName: string;
  status: 'previous' | 'current' | 'next' | 'today';
  events: Array<ICalendarEvent>;
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
  ],
  templateUrl: './work-calendar.component.html',
  styleUrl: './work-calendar.component.scss',
})
export class WorkCalendarComponent implements OnInit, OnDestroy {
  public readonly HUN_MONTHS = HUN_MONTHS;
  public readonly SORTED_HUN_DAYS = HUN_DAYS.sort((a, b) => a.order - b.order);

  public calendarItems = computed<Array<CalenderItemType>>(() =>
    this.computedCalendarDaysAndEvents(),
  );

  /*   public month = model(new Date().getMonth() + 1);
  public year = model(new Date().getFullYear()); */
  public month = model(9);
  public year = model(2024);

  public deviceType = signal<DeviceType>('desktop');

  private googleCalendarEvents = signal<Array<ICalendarEvent>>([]);

  private readonly destroyed$ = new ReplaySubject<void>(1);

  private readonly deviceTypeSerivce$ = inject(DeviceTypeService);
  private readonly googleCalendarService = inject(GoogleCalendarService);

  public ngOnInit(): void {
    this.googleCalendarEvents.set(this.googleCalendarService.getCalendarEvents());
    this.googleCalendarService
      .getMockEvents()
      .pipe(take(1))
      .subscribe({
        next: (events) => {
          this.googleCalendarEvents.set([...this.googleCalendarEvents(), ...events]);
          console.log(this.googleCalendarEvents());
        },
      });
    this.fetchDeviceType();
  }

  public ngOnDestroy(): void {
    this.destroyed$.next();
    this.destroyed$.complete();
  }

  private fetchDeviceType(): void {
    this.deviceTypeSerivce$.pipe(takeUntil(this.destroyed$)).subscribe(this.deviceType.set);
  }

  private computedCalendarDaysAndEvents(): Array<CalenderItemType> {
    const googleCalendarEvents = this.googleCalendarEvents();

    const today = new Date();
    const selectedDate = new Date(this.year(), this.month() - 1, 1);

    const monthEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);

    const days: Array<CalenderItemType> = [];

    const prevMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 0, 0, 0, 0, 0);
    let neededDaysFromThePreviousMonth = (selectedDate.getDay() || 7) - 1;

    for (
      neededDaysFromThePreviousMonth;
      neededDaysFromThePreviousMonth > 0;
      neededDaysFromThePreviousMonth--
    ) {
      days.push({
        date: prevMonth.toLocaleDateString(),
        events: googleCalendarEvents.filter((event) =>
          event.eventStart.startsWith(prevMonth.toLocaleDateString()),
        ),
        label: `${prevMonth.getDate().toString().padStart(2, '0')}.`,
        status: 'previous',
        dayName: HUN_DAYS[prevMonth.getDay()].dayName,
        monthName: HUN_MONTHS[prevMonth.getMonth()].shortName,
      });
      prevMonth.setDate(prevMonth.getDate() - 1);
    }

    for (let day = 1; day <= monthEnd.getDate(); day++) {
      days.push({
        date: selectedDate.toLocaleDateString(),
        events: googleCalendarEvents.filter((event) =>
          event.eventStart.startsWith(selectedDate.toLocaleDateString()),
        ),
        label: `${selectedDate.getDate().toString().padStart(2, '0')}.`,
        status:
          today.toLocaleDateString() === selectedDate.toLocaleDateString() ? 'today' : 'current',
        dayName: HUN_DAYS[selectedDate.getDay()].dayName,
        monthName: HUN_MONTHS[selectedDate.getMonth()].shortName,
      });
      selectedDate.setDate(selectedDate.getDate() + 1);
    }

    const nextMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1);
    let neededDaysFromTheNextMonth = 7 - (monthEnd.getDay() || 7);

    for (neededDaysFromTheNextMonth; neededDaysFromTheNextMonth > 0; neededDaysFromTheNextMonth--) {
      days.push({
        date: nextMonth.toLocaleDateString(),
        events: googleCalendarEvents.filter((event) =>
          event.eventStart.startsWith(nextMonth.toLocaleDateString()),
        ),
        label: `${nextMonth.getDate().toString().padStart(2, '0')}.`,
        status: 'next',
        dayName: HUN_DAYS[nextMonth.getDay()].dayName,
        monthName: HUN_MONTHS[nextMonth.getMonth()].shortName,
      });
      nextMonth.setDate(nextMonth.getDate() + 1);
    }

    console.log(days.filter((d) => d.events.length));

    return days.sort((a, b) => a.date.localeCompare(b.date));
  }
}
