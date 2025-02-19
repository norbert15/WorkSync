import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  Firestore,
  getDocs,
  query,
  updateDoc,
  where,
} from '@angular/fire/firestore';
import { inject, Injectable } from '@angular/core';
import { catchError, forkJoin, from, map, Observable, of } from 'rxjs';
import moment from 'moment';

import { CalendarRegisterType, ICalendarEvent } from '../../models/calendar.model';

@Injectable({
  providedIn: 'root',
})
export class CalendarFirebaseService {
  private readonly CALENDAR_COLLECTION = 'calendar-events';
  private readonly firestore = inject(Firestore);

  public getCalendarEvents(year: number, month: number): Observable<Array<ICalendarEvent>> {
    const calendarCollection = collection(this.firestore, this.CALENDAR_COLLECTION);

    const fromDate = moment()
      .year(year)
      .month(month - 1)
      .startOf('month')
      .format('YYYY. MM. DD. HH:mm:ss');
    const toDate = moment()
      .year(year)
      .month(month + 1)
      .endOf('month')
      .format('YYYY. MM. DD. HH:mm:ss');

    const cquery = query(
      calendarCollection,
      where('eventStart', '>=', fromDate),
      where('eventStart', '<=', toDate),
    );
    return from(getDocs(cquery)).pipe(
      map((snapshot) => snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))),
    ) as Observable<Array<ICalendarEvent>>;
  }

  public createEvent(register: CalendarRegisterType): Observable<string[]> {
    const eventStartMoment = moment(register.eventStart, ['YYYY-MM-DDTHH:mm']);
    const eventEndMoment = moment(register.eventEnd, ['YYYY-MM-DDTHH:mm']);

    const newEvent: ICalendarEvent = {
      attendees: null,
      hangoutLink: null,
      location: null,
      description: register.description,
      type: register.type,
      summary: register.summary,
      organizer: {
        email: register.organizerEmail,
        displayName: register.organizerDisplayName,
      },
      eventStart: eventStartMoment.format('YYYY. MM. DD. HH:mm:ss'),
      eventStartShort: eventStartMoment.format('HH:mm'),
      eventEnd: eventEndMoment.format('YYYY. MM. DD. HH:mm:ss'),
      eventEndShort: eventEndMoment.format('HH:mm'),
    };

    if (newEvent.eventStartShort === '00:00') {
      newEvent.eventStartShort = 'Egésznap';
    }

    if (newEvent.eventEndShort === '00:00') {
      newEvent.eventEndShort = '';
    }

    let days = Math.abs(eventEndMoment.date() - eventStartMoment.date()) || 1;
    const observables: Array<Observable<string>> = [];
    const calendarCollection = collection(this.firestore, this.CALENDAR_COLLECTION);

    for (days; days >= 0; days--) {
      newEvent.eventEnd = `${eventStartMoment.format('YYYY. MM. DD.')} ${eventEndMoment.format('HH:mm:ss')}`;
      observables.push(
        from(addDoc(calendarCollection, { ...newEvent })).pipe(
          map((doc) => doc.id),
          catchError(() => of('')),
        ),
      );
      eventStartMoment.date(eventStartMoment.date() + 1);
      newEvent.eventStart = eventStartMoment.format('YYYY. MM. DD. HH:mm:ss');
    }

    return forkJoin(observables);
  }

  /**
   *
   * @param eventId
   * @param register
   * @returns
   */
  public updateEvent(eventId: string, register: CalendarRegisterType): Observable<string[]> {
    const eventStartMoment = moment(register.eventStart, ['YYYY-MM-DDTHH:mm']);
    const eventEndMoment = moment(register.eventEnd, ['YYYY-MM-DDTHH:mm']);

    const data: Partial<ICalendarEvent> = {
      attendees: null,
      hangoutLink: null,
      location: null,
      description: register.description,
      type: register.type,
      summary: register.summary,
      organizer: {
        email: register.organizerEmail,
        displayName: register.organizerDisplayName,
      },
      eventStart: eventStartMoment.format('YYYY. MM. DD. HH:mm:ss'),
      eventStartShort: eventStartMoment.format('HH:mm'),
      eventEnd: `${eventStartMoment.format('YYYY. MM. DD.')} ${eventEndMoment.format('HH:mm:ss')}`,
      eventEndShort: eventEndMoment.format('HH:mm'),
    };

    if (data.eventStartShort === '00:00') {
      data.eventStartShort = 'Egésznap';
    }

    if (data.eventEndShort === '00:00') {
      data.eventEndShort = '';
    }

    const eventDocRef = doc(this.firestore, this.CALENDAR_COLLECTION, eventId);
    const observables: Array<Observable<string>> = [
      from(updateDoc(eventDocRef, data)).pipe(map(() => eventId)),
    ];

    let days = Math.abs(eventEndMoment.date() - eventStartMoment.date());
    const calendarCollection = collection(this.firestore, this.CALENDAR_COLLECTION);

    const newEvent = { ...data };
    for (days; days > 0; days--) {
      eventStartMoment.date(eventStartMoment.date() + 1);
      newEvent.eventStart = eventStartMoment.format('YYYY. MM. DD. HH:mm:ss');
      newEvent.eventEnd = `${eventStartMoment.format('YYYY. MM. DD.')} ${eventEndMoment.format('HH:mm:ss')}`;
      observables.push(
        from(addDoc(calendarCollection, { ...newEvent })).pipe(
          map((doc) => doc.id),
          catchError(() => of('')),
        ),
      );
    }

    return forkJoin(observables);
  }

  /**
   *
   * @param eventId
   */
  public deleteEvent(eventId: string): Observable<void> {
    const eventDocRef = doc(this.firestore, this.CALENDAR_COLLECTION, eventId);
    return from(deleteDoc(eventDocRef));
  }
}
