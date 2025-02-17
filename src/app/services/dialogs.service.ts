import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { DialogModel } from '../models/dialog.model';

@Injectable({
  providedIn: 'root',
})
export class DialogsService {
  private readonly _dialogsSubject$ = new BehaviorSubject<Array<DialogModel>>([]);

  public dialogs$ = this._dialogsSubject$.asObservable();

  public addNewDialog(dialog: DialogModel): void {
    const dialogs = this._dialogsSubject$.value;
    this._dialogsSubject$.next([...dialogs, dialog]);
  }

  public removeLastOpenedDialog(): void {
    const dialogs = this._dialogsSubject$.value;
    const removedDiaog = dialogs.pop();
    removedDiaog?.complete();

    this._dialogsSubject$.next([...dialogs]);
  }

  public clearAll(): void {
    this._dialogsSubject$.value.forEach((dialog) => {
      dialog.complete();
    });
    this._dialogsSubject$.next([]);
  }
}
