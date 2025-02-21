import { computed, inject, Injectable, Signal, signal } from '@angular/core';
import {
  addDoc,
  collection,
  collectionData,
  deleteDoc,
  doc,
  Firestore,
} from '@angular/fire/firestore';
import { from, map, Observable } from 'rxjs';
import { IBranch, IRepository } from '../../models/branch.model';
import moment from 'moment';

@Injectable({
  providedIn: 'root',
})
export class BranchFirebaseService {
  private readonly REPOSITORIES_COLLECTION = 'repositories';
  private readonly AFP_COLLECTION = 'awaiting-for-publications';
  private readonly AP_COLLECTION = 'active-publications';

  private _branchesForPublications = signal<Array<IBranch>>([]);

  private readonly firestore = inject(Firestore);

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
  public getBranches(type: 'active' | 'publish'): Observable<Array<IBranch>> {
    const collectionName = type === 'active' ? this.AP_COLLECTION : this.AFP_COLLECTION;
    const branchCol = collection(this.firestore, collectionName);

    return collectionData(branchCol, { idField: 'id' }) as Observable<Array<IBranch>>;
  }

  /**
   *
   * @param branchId
   * @param type
   * @returns
   */
  public deleteBranch(branchId: string, type: 'active' | 'publish'): Observable<string> {
    const collectionName = type === 'active' ? this.AP_COLLECTION : this.AFP_COLLECTION;
    const branchCol = doc(this.firestore, collectionName, branchId);

    return from(deleteDoc(branchCol)).pipe(map(() => branchId));
  }

  /**
   *
   * @param branch
   * @param type
   * @returns
   */
  public addBranch(branch: IBranch, type: 'active' | 'publish'): Observable<string> {
    const collectionName = type === 'active' ? this.AP_COLLECTION : this.AFP_COLLECTION;

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
   * @param branches
   */
  public setBranchesForPublish(branches: Array<IBranch>): void {
    this._branchesForPublications.set([...branches]);
  }
}
