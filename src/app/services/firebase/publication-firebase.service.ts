import { inject, Injectable, Signal, signal } from '@angular/core';
import {
  addDoc,
  arrayUnion,
  collection,
  collectionData,
  deleteDoc,
  doc,
  Firestore,
  updateDoc,
  writeBatch,
} from '@angular/fire/firestore';
import { from, map, Observable, throwError } from 'rxjs';
import moment from 'moment';

import { IBranch, IRepository, IRepositoryComment } from '../../models/branch.model';
import { NotificationEnum, RepositroyEnum } from '../../core/constans/enums';
import { UserFirebaseService } from './user-firebase.service';
import { INotification } from '../../models/notification.model';
import { SYSTEM } from '../../core/constans/variables';

@Injectable({
  providedIn: 'root',
})
export class PublicationFirebaseService {
  private readonly REPOSITORIES_COLLECTION = 'repositories';
  private readonly AFP_COLLECTION = 'awaiting-for-publications';
  private readonly AP_COLLECTION = 'active-publications';
  private readonly NOTIFICATIONS_COLLECTION = 'notifications';

  private _branchesForPublications = signal<IBranch[]>([]);

  private readonly firestore = inject(Firestore);
  private readonly userFirebaseService = inject(UserFirebaseService);

  public get branchesForPublications(): Signal<IBranch[]> {
    return this._branchesForPublications.asReadonly();
  }

  /**
   *
   * @returns
   */
  public getRepositories(): Observable<IRepository[]> {
    const repositoriesCollection = collection(this.firestore, this.REPOSITORIES_COLLECTION);

    return collectionData(repositoriesCollection, { idField: 'id' }) as Observable<IRepository[]>;
  }

  /**
   *
   * @returns
   */
  public getBranches(type: RepositroyEnum): Observable<IBranch[]> {
    const collectionName =
      type === RepositroyEnum.ACTIVE ? this.AP_COLLECTION : this.AFP_COLLECTION;
    const branchCol = collection(this.firestore, collectionName);

    return collectionData(branchCol, { idField: 'id' }) as Observable<IBranch[]>;
  }

  /**
   *
   * @param branchId
   * @param type
   * @returns
   */
  public deleteBranch(branchId: string, type: RepositroyEnum): Observable<string> {
    const collectionName =
      type === RepositroyEnum.ACTIVE ? this.AP_COLLECTION : this.AFP_COLLECTION;
    const branchCol = doc(this.firestore, collectionName, branchId);

    return from(deleteDoc(branchCol)).pipe(map(() => branchId));
  }

  /**
   *
   * @param branch
   * @param type
   * @returns
   */
  public addBranch(branch: IBranch, type: RepositroyEnum): Observable<string> {
    const collectionName =
      type === RepositroyEnum.ACTIVE ? this.AP_COLLECTION : this.AFP_COLLECTION;

    const branchRef = collection(this.firestore, collectionName);
    const data: Partial<IBranch> = {
      name: branch.name,
      created: moment().format('YYYY. MM. DD. HH:mm:ss'),
      repositoryId: branch.repositoryId,
    };

    return from(addDoc(branchRef, data)).pipe(map((doc) => doc.id));
  }

  /**
   *
   * @param branch
   * @param type
   * @returns
   */
  public updateBranch(branch: IBranch, type: RepositroyEnum): Observable<string> {
    const collectionName =
      type === RepositroyEnum.ACTIVE ? this.AP_COLLECTION : this.AFP_COLLECTION;

    const branchRef = doc(this.firestore, collectionName, branch.id);
    return from(updateDoc(branchRef, { created: moment().format('YYYY. MM. DD. HH:mm:ss') })).pipe(
      map(() => branch.id),
    );
  }

  /**
   *
   * @param repositoryId
   * @param comment
   * @returns
   */
  public addCommentToRepository(repositoryId: string, comment: string): Observable<void> {
    const repositoryRef = doc(this.firestore, this.REPOSITORIES_COLLECTION, repositoryId);

    const user = this.userFirebaseService.user$.getValue();

    if (!user) {
      return throwError(() => new Error('User not exist'));
    }

    const newComment: Partial<IRepositoryComment> = {
      created: moment().format('YYYY. MM. DD. HH:mm:ss'),
      text: comment,
      userId: user.id,
      userName: `${user.lastName} ${user.firstName}`,
    };
    return from(updateDoc(repositoryRef, { comments: arrayUnion(newComment) }));
  }

  /**
   *
   * @param branches
   * @param activeBranches
   * @returns
   */
  public updateActiveAndPublicationBranches(
    branches: IBranch[],
    activeBranches: IBranch[],
  ): Observable<void> {
    const user = this.userFirebaseService.user$.getValue();

    if (!user) {
      return throwError(() => new Error('User not exist'));
    }

    const notiRef = collection(this.firestore, this.NOTIFICATIONS_COLLECTION);
    const branchDocRefs = branches.map((b) => doc(this.firestore, this.AFP_COLLECTION, b.id));

    const branchNames: string[] = branches.map((b) => b.name);
    const activeBranchNames: string[] = activeBranches.map((b) => b.name);

    const batch = writeBatch(this.firestore);
    branchDocRefs.forEach((docRef) => batch.delete(docRef));

    const now = moment().format('YYYY. MM. DD. HH:mm:ss');

    activeBranches
      .filter((ab) => branchNames.includes(ab.name))
      .forEach((ab) => {
        batch.update(doc(this.firestore, this.AP_COLLECTION, ab.id), { created: now });
      });

    branches
      .filter((b) => !activeBranchNames.includes(b.name))
      .forEach((b) => {
        const newBranch: Partial<IBranch> = {
          created: now,
          name: b.name,
          repositoryId: b.repositoryId,
        };
        batch.set(doc(collection(this.firestore, this.AP_COLLECTION)), newBranch);
      });

    const liItems = branches.map((b) => `<li>${b.name}</li>`).join('');

    const newNotification: Partial<INotification> = {
      createdDatetime: now,
      updatedDatetime: now,
      createdUserId: SYSTEM.id,
      createdUserName: 'Rendszer',
      seen: false,
      subject: 'Új branch-ek kerültek publikálásra',
      text: `${user.lastName} ${user.firstName} új branch-eket tett közzé.<br />Repository: ${branches[0].repositoryId}<br />\t<ul style="margin-left:10px">${liItems}</ul>`,
      targetUserIds: 'all',
      type: NotificationEnum.INFO,
    };

    batch.set(doc(notiRef), newNotification);

    return from(batch.commit());
  }

  /**
   *
   * @param branches
   */
  public setBranchesForPublish(branches: IBranch[]): void {
    this._branchesForPublications.set([...branches]);
  }
}
