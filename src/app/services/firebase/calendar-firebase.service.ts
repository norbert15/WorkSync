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
  writeBatch,
} from '@angular/fire/firestore';
import { inject, Injectable } from '@angular/core';
import { catchError, filter, forkJoin, from, map, Observable, of } from 'rxjs';
import moment from 'moment';

import { CalendarRegisterType, ICalendarEvent } from '../../models/calendar.model';
import { CalendarEventEnum, UserEnum } from '../../core/constans/enums';

@Injectable({
  providedIn: 'root',
})
export class CalendarFirebaseService {
  private readonly CALENDAR_COLLECTION = 'calendar-events';
  private readonly firestore = inject(Firestore);

  public getCalendarEvents(
    year: number,
    month: number,
    userId: string,
    role: UserEnum,
  ): Observable<Array<ICalendarEvent>> {
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

    const results = from(getDocs(cquery)).pipe(
      map((snapshot) => snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))),
    ) as Observable<Array<ICalendarEvent>>;

    if (role === UserEnum.ADMINISTRATOR) {
      return results;
    }

    return results.pipe(
      map((items) =>
        items.filter(
          (item) =>
            item.userId === userId ||
            [CalendarEventEnum.HOLIDAY, CalendarEventEnum.OUT_OF_HOME].includes(item.type),
        ),
      ),
    );
  }

  public createEvent(register: CalendarRegisterType, userId: string): Observable<void> {
    const eventStartMoment = moment(register.eventStart, ['YYYY-MM-DDTHH:mm']);
    const eventEndMoment = moment(register.eventEnd, ['YYYY-MM-DDTHH:mm']);

    const newEvent: Partial<ICalendarEvent> = {
      userId: userId,
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
      eventEnd: eventEndMoment.isValid() ? eventEndMoment.format('YYYY. MM. DD. HH:mm:ss') : null,
      eventEndShort: eventEndMoment.isValid() ? eventEndMoment.format('HH:mm') : null,
    };

    if (newEvent.eventStartShort === '00:00') {
      newEvent.eventStartShort = 'Egésznap';
    }

    if (newEvent.eventEndShort === '00:00') {
      newEvent.eventEndShort = '';
    }

    let days = eventEndMoment.isValid()
      ? Math.abs(eventEndMoment.date() - eventStartMoment.date())
      : 0;

    const batch = writeBatch(this.firestore);

    for (days; days > -1; days--) {
      newEvent.eventEnd = eventEndMoment.isValid()
        ? `${eventStartMoment.format('YYYY. MM. DD.')} ${eventEndMoment.format('HH:mm:ss')}`
        : null;

      batch.set(doc(collection(this.firestore, this.CALENDAR_COLLECTION)), newEvent);
      eventStartMoment.date(eventStartMoment.date() + 1);
      newEvent.eventStart = eventStartMoment.format('YYYY. MM. DD. HH:mm:ss');
    }

    return from(batch.commit());
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
