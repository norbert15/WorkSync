import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import moment from 'moment';

import { environment } from '../../../environments/environment';
import { ICalendarEvent, ICalendarTask } from '../../models/calendar.model';
import { convertToLink, formatDateWithMoment } from '../../core/helpers';
import { CalendarEventEnum, GoogleCalendarResponseStatus } from '../../core/constans/enums';
import { GOOGLE_CALENDAR_RESPONES_CLASSES } from '../../core/constans/variables';

@Injectable({
  providedIn: 'root',
})
export class GoogleCalendarService {
  private httpClient = inject(HttpClient);

  public getEvents(year: number, month: number): Observable<Array<ICalendarEvent>> {
    const lastMonth = moment()
      .year(year)
      .month(month - 2)
      .startOf('month')
      .format('YYYY-MM-DDTHH:mm:ss[Z]');
    const nextMonth = moment()
      .year(year)
      .month(month)
      .endOf('month')
      .format('YYYY-MM-DDTHH:mm:ss[Z]');
    const params = new HttpParams().appendAll({ timeMin: lastMonth, timeMax: nextMonth });
    return this.httpClient
      .get<any>(`${environment.googleConfig.apiUrl}/calendar/v3/calendars/primary/events`, {
        params,
      })
      .pipe(
        map((event) => {
          const items: Array<any> = event?.items ?? [];
          return items
            .map((item: any) => {
              const calendarItem: ICalendarEvent = {
                id: item.id,
                type: CalendarEventEnum.GOOGLE_EVENT,
                summary: item.summary,
                description: convertToLink(item.description),
                eventStart: item.start?.dateTime
                  ? formatDateWithMoment(item.start?.dateTime)
                  : formatDateWithMoment(item.start?.date, { useFormat: 'YYYY. MM. DD.' }),
                eventStartShort: formatDateWithMoment(item.start?.dateTime ?? item.start.date, {
                  useFormat: 'HH:mm',
                }),
                eventEnd: item.end?.dateTime
                  ? formatDateWithMoment(item.end?.dateTime)
                  : formatDateWithMoment(item.end?.date, { useFormat: 'YYYY. MM. DD.' }),
                eventEndShort: formatDateWithMoment(item.end?.dateTime ?? item.end.date, {
                  useFormat: 'HH:mm',
                }),
                organizer: item?.organizer,
                hangoutLink: item?.hangoutLink ?? null,
                location: item?.location ?? null,
                attendees: (item?.attendees ?? []).map((a: any) => {
                  return {
                    email: a.email,
                    responseStatus: a.responseStatus,
                    displayName: a.displayName || null,
                    optional: a.optional || null,
                    response:
                      GOOGLE_CALENDAR_RESPONES_CLASSES[
                        a.responseStatus as GoogleCalendarResponseStatus
                      ],
                  };
                }),
              };

              if (calendarItem.eventEndShort === '00:00') {
                calendarItem.eventEndShort = '';
              }

              if (calendarItem.eventStartShort === '00:00') {
                calendarItem.eventStartShort = '';
              }
              return calendarItem;
            })
            .sort((a, b) => (a.eventStart ?? '').localeCompare(b.eventStart ?? ''));
        }),
      );
  }

  public getTasks(year: number, month: number): Observable<Array<ICalendarTask>> {
    const lastMonth = moment()
      .year(year)
      .month(month - 2)
      .startOf('month')
      .format('YYYY-MM-DDTHH:mm:ss[Z]');
    const nextMonth = moment()
      .year(year)
      .month(month)
      .endOf('month')
      .format('YYYY-MM-DDTHH:mm:ss[Z]');
    const params = new HttpParams().appendAll({
      dueMin: lastMonth,
      dueMax: nextMonth,
      showCompleted: true,
      showHidden: true,
    });
    return this.httpClient
      .get<any>(`${environment.googleConfig.apiUrl}/tasks/v1/lists/@default/tasks`, { params })
      .pipe(
        map((task) =>
          (task.items as Array<ICalendarTask>).map((task) => {
            task.due = formatDateWithMoment(task.due, {
              formats: ['YYYY-MM-DDTHH:mm:ss[Z]'],
              useFormat: task.due.includes('00:00:00') ? 'YYYY. MM. DD.' : 'YYYY. MM. DD. HH:mm:ss',
            });

            if (!task.title) {
              task.title = '(Nincs cím)';
            }
            return task;
          }),
        ),
      );
  }
}
