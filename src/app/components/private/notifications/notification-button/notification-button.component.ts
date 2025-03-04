import {
  Component,
  inject,
  Input,
  OnInit,
  output,
  Signal,
  signal,
  TemplateRef,
  viewChild,
} from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, Observable, of, switchMap, take, tap } from 'rxjs';

import { ButtonComponent } from '../../../reusables/button/button.component';
import { InputComponent } from '../../../reusables/input/input.component';
import { DialogsService } from '../../../../services/dialogs.service';
import { DialogModel } from '../../../../models/dialog.model';
import { NotificationFirebaseService } from '../../../../services/firebase/notification-firebase.service';
import { PopupService } from '../../../../services/popup.service';
import { INotification } from '../../../../models/notification.model';
import { NotificationEnum } from '../../../../core/constans/enums';

@Component({
  selector: 'app-notification-button',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonComponent, InputComponent],
  templateUrl: './notification-button.component.html',
})
export class NotificationButtonComponent implements OnInit {
  public notificationFormContentTemplate = viewChild<TemplateRef<any>>(
    'notificationFormContentTemplate',
  );

  @Input() public set notification(noti: INotification | null) {
    this._notification.set(noti);

    if (noti) {
      this.patchFormValues(noti);
      this.onOpenNotificationFormDialogClick();
    }
  }

  public get notification(): Signal<INotification | null> {
    return this._notification.asReadonly();
  }

  public dialogClose = output<void>();

  public notificationForm!: FormGroup;

  private _notification = signal<INotification | null>(null);

  private readonly formBuilder = inject(FormBuilder);
  private readonly dialogsService = inject(DialogsService);
  private readonly popupService = inject(PopupService);
  private readonly notiFirebaseService = inject(NotificationFirebaseService);

  public ngOnInit(): void {
    this.initForm();
  }

  public onOpenNotificationFormDialogClick(): void {
    const dialogTitle = this.notification() ? 'Értesítés módosítása' : 'Új értesítés közzététele';
    const newDialog: DialogModel = new DialogModel(dialogTitle, {
      content: this.notificationFormContentTemplate(),
      size: 'normal',
      type: 'default',
      templateConfig: { triggerBtnLabel: 'Közzététel' },
    });

    newDialog.dialogClosed$.pipe(take(1)).subscribe({
      next: () => {
        this.reset();
      },
    });

    newDialog.trigger$.pipe(switchMap(() => this.handleTrigger())).subscribe();

    this.dialogsService.addNewDialog(newDialog);
  }

  public handleTrigger(): Observable<string | null> {
    if (this.notificationForm.invalid) {
      return of(null);
    }

    if (this.notification()) {
      return this.updateNotificationObservable(this.notification()!.id);
    }

    return this.createNotificationObservable();
  }

  public onCloseDialogClick(): void {
    this.dialogsService.removeLastOpenedDialog();
  }

  private createNotificationObservable(): Observable<string | null> {
    this.popupService.add({
      details: 'Az értesítés felvétele folyamatban...',
      severity: 'info',
    });
    const form = this.notificationForm.getRawValue();

    return this.notiFirebaseService
      .createNotification(form['subject'], form['text'], NotificationEnum.INFO)
      .pipe(
        tap(() => {
          this.popupService.add({
            details: 'Az értesítés felvétele sikeresen megtörtént',
            severity: 'success',
            title: 'Sikeres művelet!',
          });
          this.dialogsService.removeLastOpenedDialog();
        }),
        catchError(() => {
          this.popupService.add({
            details: 'Az értesítés felvétele során hiba történt',
            severity: 'error',
            title: 'Sikertelen művelet!',
          });
          return of(null);
        }),
      );
  }

  private updateNotificationObservable(notificationId: string): Observable<string | null> {
    this.popupService.add({
      details: 'Az értesítés felvétele folyamatban...',
      severity: 'info',
    });
    const form = this.notificationForm.getRawValue();

    return this.notiFirebaseService
      .updateNotification(notificationId, form['subject'], form['text'])
      .pipe(
        tap(() => {
          this.popupService.add({
            details: 'Az értesítés módosítása sikeresen megtörtént',
            severity: 'success',
            title: 'Sikeres művelet!',
          });
          this.dialogsService.removeLastOpenedDialog();
        }),
        catchError(() => {
          this.popupService.add({
            details: 'Hiba történt az értesítés módosítása során',
            severity: 'error',
            title: 'Sikertelen művelet!',
          });
          return of(null);
        }),
      );
  }

  private initForm(): void {
    this.notificationForm = this.formBuilder.nonNullable.group({
      subject: ['', Validators.required],
      text: ['', Validators.required],
    });
  }

  private patchFormValues(notification: INotification): void {
    this.notificationForm.patchValue({
      subject: notification.subject,
      text: notification.text,
    });
  }

  private reset(): void {
    this.dialogClose.emit();
    this._notification.set(null);
    this.notificationForm.reset();
  }
}
