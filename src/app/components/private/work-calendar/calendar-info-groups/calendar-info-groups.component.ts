import { CommonModule } from '@angular/common';
import { Component, computed, input, OnInit, signal, TemplateRef, viewChild } from '@angular/core';
import { ButtonComponent } from '../../../reusables/button/button.component';
import {
  CalendarItemType,
  ICalendar,
  ICalendarEvent,
  ICalendarTask,
} from '../../../../models/calendar.model';
import moment from 'moment';

type EventType = { name: string; time?: string; class?: string };

type EventKey = {
  calendarEvents: Array<EventType>;
  notificationEvents: Array<EventType>;
  todays: Array<EventType>;
  branchEvents: Array<EventType>;
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
  imports: [CommonModule, ButtonComponent],
  templateUrl: './calendar-info-groups.component.html',
  styleUrl: './calendar-info-groups.component.scss',
})
export class CalendarInfoGroupsComponent implements OnInit {
  public todayTemplate = viewChild<TemplateRef<any>>('todayTemplate');

  public googleCalendarEventsAndTasks = input<Array<ICalendar>>([]);

  public infoCards = computed<Array<InfoCardType>>(() => {
    const today = moment();
    const todayEventsAndTasks = this.googleCalendarEventsAndTasks()
      .flatMap((calendar) => calendar.events)
      .filter((et) => et.date.startsWith(today.format('YYYY. MM. DD')));

    console.log('Todays: ', todayEventsAndTasks);

    const todayTemplate = this.todayTemplate();
    const events = this.events();
    return [
      {
        title: 'Közelgő esemény(ek)',
        bootstrapIconClass: 'bi bi-calendar2-check',
        fallbackLabel: 'Nincs előre ütemezett esemény.',
        showCounter: true,
        footer: { label: 'További részletek' },
        events: todayEventsAndTasks.map((et) => {
          if (et.type === 'event') {
            const event: ICalendarEvent = et.item as ICalendarEvent;
            return {
              name: event.summary,
              class: 'label-primary',
              time: event.eventStart,
            };
          }

          const task: ICalendarTask = et.item as ICalendarTask;

          return {
            name: task.title,
            class: 'label-primary',
            time: task.due,
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
        events: events.todays,
        footer: { templateRef: todayTemplate },
      },
      {
        title: 'Publikálásra vár',
        bootstrapIconClass: 'bi bi-github',
        events: events.branchEvents,
        showCounter: true,
        fallbackLabel: 'Nincs publikálásra váró branch',
        footer: {
          label:
            events.branchEvents.length > 3 ? 'Továbbiak megtekintése' : 'Branch(es) megtekintése',
        },
      },
    ];
  });

  private events = signal<EventKey>({
    branchEvents: [],
    calendarEvents: [],
    notificationEvents: [],
    todays: [],
  });

  public ngOnInit(): void {
    this.fetchInfoCards();
  }

  private fetchInfoCards(): void {
    // TODO: lekérdezés
    this.events.set({
      // TODO: status alapján sorba rendezés pl due old new
      branchEvents: [
        { name: '20250205-BN-Development-AttendanceSheets', class: 'label-danger' },
        { name: '20250205-BN-Development-AttendanceSheets', class: 'label-accent' },
        { name: '20250211-BN-Development-Notifications', class: 'label-primary' },
      ],
      calendarEvents: [
        { class: 'label-primary', name: 'MiniCRM kiváltása', time: '2025. 02. 01. 10:00' },
        { class: 'label-primary', name: 'Hétindító', time: '2025. 02. 01. 11:00' },
      ],
      notificationEvents: [
        { class: 'label-primary', name: 'Új branch került publikálásra' },
        { class: 'label-gray', name: 'Horváth Lajos nem elérhető' },
        { class: 'label-success', name: 'Szabadságkérelmét elfogadták' },
      ],
      todays: [{ name: '2025. 02. 11. 08:00' }, { name: '2025. 02. 11. 16:00' }],
    });
  }
}
