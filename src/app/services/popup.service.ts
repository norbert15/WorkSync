import { Injectable, Signal, signal } from '@angular/core';

type SeverityType = 'success' | 'warning' | 'info' | 'error';

export type PopupType<T = any> = {
  title?: string;
  details: string;
  severity: SeverityType;
  callback?: () => void;
  item?: T;
};

export type PopupGroupsType = Record<string, PopupType[]>;

@Injectable({
  providedIn: 'root',
})
export class PopupService {
  private readonly _popupGroups = signal<PopupGroupsType>({});

  public get popupGroups(): Signal<PopupGroupsType> {
    return this._popupGroups.asReadonly();
  }

  public add(popup: PopupType): void {
    let key = `${popup.severity}_${popup.details}`;

    if (popup.title) {
      key = `${popup.title}_${key}`;
    }

    const popups = { ...this.popupGroups() };
    if (!(key in popups)) {
      popups[key] = [];
    }

    popups[key].push(popup);
    this._popupGroups.set({ ...popups });
  }

  public timeout(key: string): void {
    const popups = { ...this.popupGroups() };
    delete popups[key];

    this._popupGroups.set({ ...popups });
  }

  public close(key: string): void {
    const popupGroups = { ...this.popupGroups() };

    for (const popup of popupGroups[key]) {
      popup?.callback?.();
    }

    delete popupGroups[key];
    this._popupGroups.set({ ...popupGroups });
  }

  public clearAll(): void {
    this._popupGroups.set({});
  }
}
