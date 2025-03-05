import { inject, Injectable } from '@angular/core';
import {
  collection,
  collectionData,
  doc,
  Firestore,
  getDoc,
  updateDoc,
  query,
  where,
  addDoc,
} from '@angular/fire/firestore';
import { BehaviorSubject, forkJoin, from, map, Observable, switchMap } from 'rxjs';
import moment from 'moment';

import { IUser, IUserBase, IUserWorkStatus } from '../../models/user.model';
import { AuthFirebaseService } from './auth-firebase.service';

type GoogleConfigType = {
  clientId: string;
  clientSecret: string;
};

@Injectable({
  providedIn: 'root',
})
export class UserFirebaseService {
  private readonly USERS_COLLECTION = 'users';
  private readonly USER_WORK_STATUS_COLLECTION = 'user-work-statuses';
  private readonly GOOGLE_CONFIG = 'google-config';
  private readonly GOOGLE_CONFIG_ID = 'YOrBVdEmAvXRC0NEFOR5';

  private readonly firestore = inject(Firestore);
  private readonly authFirebaseService = inject(AuthFirebaseService);

  private readonly _user = new BehaviorSubject<IUser | null>(null);

  public user$ = this._user;

  public getUserDetails(userId: string): Observable<IUser> {
    const userDocRef = doc(this.firestore, this.USERS_COLLECTION, userId);
    const googleConfigRef = doc(this.firestore, this.GOOGLE_CONFIG, this.GOOGLE_CONFIG_ID);

    const userObservable: Observable<IUser> = from(getDoc(userDocRef)).pipe(
      map((docSnapShot) => {
        if (docSnapShot.exists()) {
          return { id: docSnapShot.id, ...docSnapShot.data() } as IUser;
        }

        throw new Error('Not found');
      }),
    );

    const googleConfigObservable: Observable<GoogleConfigType> = from(getDoc(googleConfigRef)).pipe(
      map((docSnapShot) => {
        if (docSnapShot.exists()) {
          return { ...docSnapShot.data() } as GoogleConfigType;
        }

        throw new Error('Google config not found');
      }),
    );

    return forkJoin({
      user: userObservable,
      googleConfigRef: googleConfigObservable,
    }).pipe(
      map(({ user, googleConfigRef }) => {
        return {
          ...user,
          ...googleConfigRef,
        };
      }),
    );
  }

  public updateUserDetails(userId: string, user: Partial<IUserBase>): Observable<void> {
    const userDocRef = doc(this.firestore, this.USERS_COLLECTION, userId);
    return from(updateDoc(userDocRef, user));
  }

  public updateUserGoogleRefreshToken(googleRefreshToken: string): Observable<IUser> {
    const { userId } = this.authFirebaseService.userPayload()!;

    const userDocRef = doc(this.firestore, this.USERS_COLLECTION, userId);
    return from(updateDoc(userDocRef, { googleRefreshToken })).pipe(
      switchMap(() => this.getUserDetails(userId)),
    );
  }

  public getUserWorkStatus(userId: string): Observable<IUserWorkStatus | null> {
    const today = moment().format('YYYY. MM. DD.');
    const userWorkStatusesRef = collection(this.firestore, this.USER_WORK_STATUS_COLLECTION);
    const q = query(
      userWorkStatusesRef,
      where('userId', '==', userId),
      where('created', '==', today),
    );
    return from(collectionData(q, { idField: 'id' })).pipe(
      map((docs) => (docs.length ? (docs[0] as IUserWorkStatus) : null)),
    );
  }

  public startUserWorkDay(userId: string, startDate: string): Observable<string> {
    const userWorkStatusesRef = collection(this.firestore, this.USER_WORK_STATUS_COLLECTION);
    const data: Partial<IUserWorkStatus> = {
      created: moment(startDate, ['YYYY. MM. DD. HH:mm:ss']).format('YYYY. MM. DD.'),
      userId: userId,
      workStart: moment(startDate, ['YYYY. MM. DD. HH:mm:ss']).format('YYYY. MM. DD. HH:mm'),
      workEnd: null,
      report: null,
    };

    return from(addDoc(userWorkStatusesRef, data)).pipe(map((doc) => doc.id));
  }

  public startUserEndOfDay(docId: string, workEnd: string, report: string): Observable<string> {
    const userDocRef = doc(this.firestore, this.USER_WORK_STATUS_COLLECTION, docId);

    const data: Partial<IUserWorkStatus> = {
      report,
      workEnd: moment(workEnd).format('YYYY. MM. DD. HH:mm'),
    };
    return from(updateDoc(userDocRef, data)).pipe(map(() => docId));
  }

  public getAllUsers(): Observable<IUser[]> {
    const usersRef = collection(this.firestore, this.USERS_COLLECTION);
    return collectionData(usersRef, { idField: 'id' }) as Observable<IUser[]>;
  }

  public setUser(user: IUser): void {
    this._user.next(user);
  }
}
