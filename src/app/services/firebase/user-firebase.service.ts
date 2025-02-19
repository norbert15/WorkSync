import { inject, Injectable } from '@angular/core';
import {
  collection,
  collectionData,
  doc,
  Firestore,
  getDocs,
  getDoc,
  updateDoc,
} from '@angular/fire/firestore';
import { BehaviorSubject, from, map, Observable, of, switchMap, take } from 'rxjs';

import { IUser, IUserBase } from '../../models/user.model';
import { HttpErrorResponse } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class UserFirebaseService {
  private readonly USERS_COLLECTION = 'users';

  private readonly firestore = inject(Firestore);

  private readonly _user = new BehaviorSubject<IUser | null>(null);

  public user$ = this._user;

  public getUserDetails(userId: string): Observable<IUser> {
    const userDocRef = doc(this.firestore, this.USERS_COLLECTION, userId);
    return from(getDoc(userDocRef)).pipe(
      map((docSnapShot) => {
        if (docSnapShot.exists()) {
          return { id: docSnapShot.id, ...docSnapShot.data() } as IUser;
        }

        throw new HttpErrorResponse({ error: 'Not found', status: 400 });
      }),
    );
  }

  public updateUserDetails(userId: string, user: Partial<IUserBase>): Observable<void> {
    const userDocRef = doc(this.firestore, this.USERS_COLLECTION, userId);
    return from(updateDoc(userDocRef, user));
  }

  public updateUserGoogleRefreshToken(
    userId: string,
    googleRefreshToken: string,
  ): Observable<void> {
    const userDocRef = doc(this.firestore, this.USERS_COLLECTION, userId);
    return from(updateDoc(userDocRef, { googleRefreshToken }));
  }

  public setUser(user: IUser): void {
    this._user.next(user);
  }
}
