import { TemplateRef } from '@angular/core';
import { Subject } from 'rxjs';

type Size = 'normal' | 'small' | 'medium' | 'large';

type DialogSettingsType = {
  content?: TemplateRef<any> | null;
  footer?: TemplateRef<any> | null;
  class?: Array<string>;
  headerCloseButton?: boolean;
  footerCloseButton?: boolean;
  size?: Size;
};

export class DialogModel {
  public title: string;
  public content: TemplateRef<any> | null;
  public footer: TemplateRef<any> | null;
  public headerCloseButton: boolean;
  public footerCloseButton: boolean;
  public class: Array<string>;
  public size: Size;
  private readonly _afterComplete$ = new Subject<void>();
  public readonly afterComplete$ = this._afterComplete$.asObservable();

  constructor(title: string, settings: DialogSettingsType | null = null) {
    this.title = title;
    this.content = settings?.content || null;
    this.footer = settings?.footer || null;
    this.class = settings?.class ?? [];
    this.headerCloseButton = settings?.headerCloseButton ?? true;
    this.footerCloseButton = settings?.footerCloseButton ?? true;
    this.size = settings?.size ?? 'small';
  }

  public complete(): void {
    this._afterComplete$.next();
    this._afterComplete$.complete();
  }
}
