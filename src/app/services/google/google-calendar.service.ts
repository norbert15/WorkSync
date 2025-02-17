import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable, of } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ICalendarEvent } from '../../models/calendar.model';

import * as googleCalendarExamples from '../../../assets/jsons/googleapicalendarexamples.json';
import { formatDateWithMoment } from '../../core/helpers';

@Injectable({
  providedIn: 'root',
})
export class GoogleCalendarService {
  private httpClient = inject(HttpClient);

  public getEvents(): Observable<Array<ICalendarEvent>> {
    return this.httpClient
      .get<any>(`${environment.googleApiUrl}/calendar/v3/calendars/primary/events`)
      .pipe(
        map((event) => {
          return (event?.items ?? []).map((item: any) => {
            const calendarItem: ICalendarEvent = {
              class: 'google-event',
              summary: item.summary,
              description: item.description,
              eventStart: formatDateWithMoment(item.start.dateTime),
              eventStartShort: formatDateWithMoment(item.start.dateTime, { useFormat: 'HH:mm' }),
              eventEnd: formatDateWithMoment(item.end.dateTime),
              eventEndShort: formatDateWithMoment(item.end.dateTime, { useFormat: 'HH:mm' }),
              organizer: item.organizer,
              hangoutLink: item.hangoutLink || null,
              location: item.location || null,
              attendees: item.attendees.map((a: any) => ({
                email: a.email,
                responseStatus: a.responseStatus,
                displayName: a.displayName || null,
                optional: a.optional || null,
              })),
            };

            if (calendarItem.eventEndShort === '00:00') {
              calendarItem.eventEndShort = '';
            }

            if (calendarItem.eventStartShort === '00:00') {
              calendarItem.eventStartShort = '';
            }
            return calendarItem;
          });
        }),
      );
  }

  public getMockEvents(): Observable<Array<ICalendarEvent>> {
    return of(googleCalendarExamples).pipe(
      map((event) => {
        return (event?.items ?? [])
          .map((item: any) => {
            const calendarItem: ICalendarEvent = {
              class: 'google-event',
              summary: item.summary,
              description: item.description,
              eventStart: formatDateWithMoment(item.start.dateTime),
              eventStartShort: formatDateWithMoment(item.start.dateTime, { useFormat: 'HH:mm' }),
              eventEnd: formatDateWithMoment(item.end.dateTime),
              eventEndShort: formatDateWithMoment(item.end.dateTime, { useFormat: 'HH:mm' }),
              organizer: item.organizer,
              hangoutLink: item.hangoutLink || null,
              location: item.location || null,
              attendees: item.attendees.map((a: any) => ({
                email: a.email,
                responseStatus: a.responseStatus,
                displayName: a.displayName || null,
                optional: a.optional || null,
              })),
            };

            if (calendarItem.eventEndShort === '00:00') {
              calendarItem.eventEndShort = '';
            }

            if (calendarItem.eventStartShort === '00:00') {
              calendarItem.eventStartShort = '';
            }

            return calendarItem;
          })
          .sort((a, b) => a.eventStart.localeCompare(b.eventStart));
      }),
    );
  }

  public getCalendarEvents(): Array<ICalendarEvent> {
    return [
      ...Array.from({ length: 5 }).map((_, i) => ({
        attendees: [],
        class: 'holiday',
        description: '',
        summary: 'Szilágyi Tamás szabadságon',
        eventEnd: '',
        eventEndShort: '',
        eventStart: `2024. 09. 0${i + 1}. 00:00:00`,
        eventStartShort: '',
        hangoutLink: '',
        location: '',
        organizer: {
          email: '',
        },
      })),
      {
        attendees: [],
        class: 'out-of-home',
        description: '',
        summary: 'Nagy Márk nem elérhető',
        eventEnd: '2024. 09. 20. 15:30:00',
        eventEndShort: '15:30',
        eventStart: `2024. 09. 20. 15:00:00`,
        eventStartShort: '15:00',
        hangoutLink: '',
        location: '',
        organizer: {
          email: '',
        },
      },
    ];
  }
}
