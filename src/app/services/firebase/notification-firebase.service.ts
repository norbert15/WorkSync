import { inject, Injectable, Signal, signal } from '@angular/core';
import {
  addDoc,
  collection,
  collectionData,
  deleteDoc,
  doc,
  Firestore,
  getDoc,
  setDoc,
  updateDoc,
} from '@angular/fire/firestore';
import { combineLatest, from, map, Observable, switchMap, throwError } from 'rxjs';
import moment from 'moment';

import { UserFirebaseService } from './user-firebase.service';
import { INotification, SeenNotificationsType } from '../../models/notification.model';
import { AuthFirebaseService } from './auth-firebase.service';
import { NotificationEnum } from '../../core/constans/enums';
import { SYSTEM } from '../../core/constans/variables';

@Injectable({
  providedIn: 'root',
})
export class NotificationFirebaseService {
  private readonly NOTIFICATIONS_COLLECTION = 'notifications';
  private readonly SEEN_NOTIFICATIONS_COLLECTION = 'seen-notifications';

  private readonly fireStore = inject(Firestore);
  private readonly userFirebaseService = inject(UserFirebaseService);
  private readonly authFirebaseServive = inject(AuthFirebaseService);

  private _userNotifications = signal<INotification[]>([]);

  get userNotifications(): Signal<INotification[]> {
    return this._userNotifications.asReadonly();
  }

  public setUserNotifications(notifications: INotification[]): void {
    this._userNotifications.set(notifications);
  }

  public getUserNotifications(): Observable<INotification[]> {
    const { userId } = this.authFirebaseServive.userPayload()!;

    const notiCollection = collection(this.fireStore, this.NOTIFICATIONS_COLLECTION);

    const notiResultData = collectionData(notiCollection, { idField: 'id' }) as Observable<
      INotification[]
    >;

    const notificationsOBservable = notiResultData.pipe(
      map((notifications) => {
        return notifications.filter(
          (n) => n.targetUserIds === 'all' || n.targetUserIds.includes(userId),
        );
      }),
    );

    return combineLatest([notificationsOBservable, this.getSeenNotifications()]).pipe(
      map((result) => {
        return result[0].map((n) => ({
          ...n,
          seen: !!(result[1].length && result[1][0][n.id]),
        }));
      }),
    );
  }

  public getSeenNotifications(): Observable<SeenNotificationsType[]> {
    const { userId } = this.authFirebaseServive.userPayload()!;
    const seenCollection = collection(this.fireStore, this.SEEN_NOTIFICATIONS_COLLECTION);

    return collectionData(seenCollection, { idField: 'id' }).pipe(
      map((docData) => docData.filter((d) => d.id === userId)),
    );
  }

  public markNotificationAsSeen(notificationId: string): Observable<string> {
    const { userId } = this.authFirebaseServive.userPayload()!;

    const seenNotiRef = doc(this.fireStore, this.SEEN_NOTIFICATIONS_COLLECTION, userId);
    const data: Record<string, boolean> = {};
    data[notificationId] = true;

    return from(getDoc(seenNotiRef)).pipe(
      switchMap((docData) => {
        if (docData.exists()) {
          return from(updateDoc(seenNotiRef, data));
        }

        return from(setDoc(seenNotiRef, data));
      }),
      map(() => notificationId),
    );
  }

  public createNotification(
    subject: string,
    text: string,
    type: NotificationEnum,
    targetUserIds: string[] | 'all' = 'all',
  ): Observable<string> {
    const user = this.userFirebaseService.user$.getValue();

    if (!user) {
      return throwError(() => new Error('User not found'));
    }

    const notiRef = collection(this.fireStore, this.NOTIFICATIONS_COLLECTION);

    const now = moment().format('YYYY. MM. DD. HH:mm:ss');
    const newNotification: Partial<INotification> = {
      updatedDatetime: now,
      createdDatetime: now,
      createdUserId: user.id,
      createdUserName: `${user.lastName} ${user.firstName}`,
      seen: false,
      subject: subject,
      targetUserIds: targetUserIds,
      text: text,
      type: type,
    };

    return from(addDoc(notiRef, newNotification)).pipe(map((doc) => doc.id));
  }

  public createSystemNotification(
    subject: string,
    text: string,
    type: NotificationEnum,
    targetUserIds: string[],
  ): Observable<string> {
    const notiRef = collection(this.fireStore, this.NOTIFICATIONS_COLLECTION);
    const now = moment().format('YYYY. MM. DD. HH:mm:ss');

    const newNotification: Partial<INotification> = {
      updatedDatetime: now,
      createdDatetime: now,
      createdUserId: SYSTEM.id,
      createdUserName: 'Rendszer',
      seen: false,
      subject: subject,
      targetUserIds: targetUserIds,
      text: text,
      type: type,
    };

    return from(addDoc(notiRef, newNotification)).pipe(map((doc) => doc.id));
  }

  public updateNotification(
    notificationId: string,
    subject: string,
    text: string,
  ): Observable<string> {
    const notiRef = doc(this.fireStore, this.NOTIFICATIONS_COLLECTION, notificationId);

    const notification: Partial<INotification> = {
      seen: false,
      subject: subject,
      text: text,
      updatedDatetime: moment().format('YYYY. MM. DD. HH:mm:ss'),
    };

    return from(updateDoc(notiRef, notification)).pipe(map(() => notificationId));
  }

  public deleteNotification(notificationId: string): Observable<string> {
    const notiRef = doc(this.fireStore, this.NOTIFICATIONS_COLLECTION, notificationId);

    return from(deleteDoc(notiRef)).pipe(map(() => notificationId));
  }
}
