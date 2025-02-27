import { signal, TemplateRef } from '@angular/core';
import { Subject, tap } from 'rxjs';

type Size = 'normal' | 'small' | 'medium' | 'large';

type DialogType = 'default' | 'warning' | 'delete';

type DialogTemplateConfigType = {
  contentText: string;
  triggerBtnLabel: string;
  triggerBtnColor: any; // A gomb Paletta color típusa miatt sír így ezért any
};

type DialogSettingsType = {
  content?: TemplateRef<any>;
  footer?: TemplateRef<any>;
  size?: Size;
  type?: DialogType;
  templateConfig?: Partial<DialogTemplateConfigType>;
};

export class DialogModel {
  public title: string;
  public size: Size;
  public type: DialogType;
  public content: TemplateRef<any> | undefined;
  public footer: TemplateRef<any> | undefined;

  public triggerIsLoading = signal(false);

  public templateConfig: DialogTemplateConfigType;

  private readonly _dialogClosed$ = new Subject<void>();
  public readonly dialogClosed$ = this._dialogClosed$.asObservable();

  private readonly _trigger$ = new Subject<void>();
  public readonly trigger$ = this._trigger$.asObservable().pipe(
    tap(() => {
      this.triggerIsLoading.set(false);
    }),
  );

  constructor(title: string, settings: DialogSettingsType | null = null) {
    this.title = title;
    this.content = settings?.content;
    this.size = settings?.size ?? 'small';
    this.type = settings?.type ?? 'default';
    this.footer = settings?.footer;

    const defaultConfig = this.getConfig(this.type);
    const templateConfig = settings?.templateConfig;

    this.templateConfig = {
      contentText: templateConfig?.contentText ?? '',
      triggerBtnColor: templateConfig?.triggerBtnColor ?? defaultConfig.color,
      triggerBtnLabel: templateConfig?.triggerBtnLabel ?? defaultConfig.label,
    };
  }

  public closeDialog(): void {
    this._dialogClosed$.next();
    this._dialogClosed$.complete();
    this._trigger$.complete();
  }

  public trigger(): void {
    this._trigger$.next();
  }

  private getConfig(type: DialogType): { color: string; label: string } {
    switch (type) {
      case 'delete':
        return { label: 'Eltávolítás', color: 'danger' };
      case 'warning':
        return { label: 'Végrahajtás', color: 'primary' };
      default:
        return { label: '', color: 'primary' };
    }
  }
}
