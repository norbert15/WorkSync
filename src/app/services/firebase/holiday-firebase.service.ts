import { inject, Injectable } from '@angular/core';
import {
  addDoc,
  collection,
  collectionData,
  deleteDoc,
  doc,
  Firestore,
  query,
  updateDoc,
  where,
} from '@angular/fire/firestore';
import { from, map, Observable } from 'rxjs';
import { IRequestedHoliday } from '../../models/holiday.model';
import { UserEnum } from '../../core/constans/enums';

@Injectable({
  providedIn: 'root',
})
export class HolidayFirebaseService {
  private readonly HOLIDAY_COLLECTION = 'holidays';
  private readonly fireStore = inject(Firestore);

  public getUserHolidays(userId: string): Observable<Array<IRequestedHoliday>> {
    const holidayCollection = collection(this.fireStore, this.HOLIDAY_COLLECTION);
    const q = query(holidayCollection, where('userId', '==', userId));

    return collectionData(q, { idField: 'id' }) as Observable<Array<IRequestedHoliday>>;
  }

  public getAllDeveloperHolidays(): Observable<Array<IRequestedHoliday>> {
    const holidayCollection = collection(this.fireStore, this.HOLIDAY_COLLECTION);
    const q = query(holidayCollection, where('role', '==', UserEnum.DEVELOPER));

    return collectionData(q, { idField: 'id' }) as Observable<Array<IRequestedHoliday>>;
  }

  public addHolidayRequest(holidayRequest: Partial<IRequestedHoliday>): Observable<string> {
    const holidayCollection = collection(this.fireStore, this.HOLIDAY_COLLECTION);

    return from(addDoc(holidayCollection, holidayRequest)).pipe(map((doc) => doc.id));
  }

  public updateHolidayRequest(
    holidayRequestId: string,
    holidayRequest: Partial<IRequestedHoliday>,
  ): Observable<string> {
    const holidayRef = doc(this.fireStore, this.HOLIDAY_COLLECTION, holidayRequestId);

    return from(updateDoc(holidayRef, holidayRequest)).pipe(map(() => holidayRequestId));
  }

  public deleteHolidayRequet(holidayRequestId: string): Observable<string> {
    const holidayRef = doc(this.fireStore, this.HOLIDAY_COLLECTION, holidayRequestId);

    return from(deleteDoc(holidayRef)).pipe(map(() => holidayRequestId));
  }
}
