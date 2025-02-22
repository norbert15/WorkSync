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
import { from, map, Observable } from 'rxjs';
import moment from 'moment';

import { IBranch, IRepository, IRepositoryComment } from '../../models/branch.model';
import { RepositroyEnum } from '../../core/constans/enums';
import { UserFirebaseService } from './user-firebase.service';

@Injectable({
  providedIn: 'root',
})
export class PublicationFirebaseService {
  private readonly REPOSITORIES_COLLECTION = 'repositories';
  private readonly AFP_COLLECTION = 'awaiting-for-publications';
  private readonly AP_COLLECTION = 'active-publications';

  private _branchesForPublications = signal<Array<IBranch>>([]);

  private readonly firestore = inject(Firestore);
  private readonly userFirebaseService = inject(UserFirebaseService);

  public get branchesForPublications(): Signal<Array<IBranch>> {
    return this._branchesForPublications.asReadonly();
  }

  /**
   *
   * @returns
   */
  public getRepositories(): Observable<Array<IRepository>> {
    const repositoriesCollection = collection(this.firestore, this.REPOSITORIES_COLLECTION);

    return collectionData(repositoriesCollection, { idField: 'id' }) as Observable<
      Array<IRepository>
    >;
  }

  /**
   *
   * @returns
   */
  public getBranches(type: RepositroyEnum): Observable<Array<IBranch>> {
    const collectionName =
      type === RepositroyEnum.ACTIVE ? this.AP_COLLECTION : this.AFP_COLLECTION;
    const branchCol = collection(this.firestore, collectionName);

    return collectionData(branchCol, { idField: 'id' }) as Observable<Array<IBranch>>;
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
    console.log(branch);

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

    // Biztos, hogy van user különben megse lehetne hívni a végpontott.
    const user = this.userFirebaseService.user$.getValue()!;

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
    branches: Array<IBranch>,
    activeBranches: Array<IBranch>,
  ): Observable<void> {
    const branchDocRefs = branches.map((b) => doc(this.firestore, this.AFP_COLLECTION, b.id));
    const branchNames: Array<string> = branches.map((b) => b.name);
    const activeBranchNames: Array<string> = activeBranches.map((b) => b.name);

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

    return from(batch.commit());
  }

  /**
   *
   * @param branches
   */
  public setBranchesForPublish(branches: Array<IBranch>): void {
    this._branchesForPublications.set([...branches]);
  }
}
