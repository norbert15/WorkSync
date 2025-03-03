import {
  Component,
  computed,
  HostBinding,
  inject,
  signal,
  TemplateRef,
  viewChild,
} from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { catchError, Observable, of, switchMap, take, tap } from 'rxjs';

import { NotificationFirebaseService } from '../../../services/firebase/notification-firebase.service';
import { NotificationButtonComponent } from './notification-button/notification-button.component';
import { ITableRow, ITableTitle, TableCellOperationType } from '../../../models/table.model';
import { convertToLink, formatDateWithMoment } from '../../../core/helpers';
import { NOTIFICATION_COLORS } from '../../../core/constans/variables';
import { AuthFirebaseService } from '../../../services/firebase/auth-firebase.service';
import { IconIds, TableOperationEnum } from '../../../core/constans/enums';
import { DialogsService } from '../../../services/dialogs.service';
import { INotification } from '../../../models/notification.model';
import { TableComponent } from '../../reusables/table/table.component';
import { DialogModel } from '../../../models/dialog.model';
import { PopupService } from '../../../services/popup.service';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [TableComponent, NotificationButtonComponent, MatIcon],
  templateUrl: './notifications.component.html',
  styleUrl: './notifications.component.scss',
})
export class NotificationsComponent {
  public bellNotificationTemplate = viewChild<TemplateRef<any>>('bellNotificationTemplate');
  public readonly BELL_FILL_ICON = IconIds.BELL_FILL;

  public tableTitles: ITableTitle[] = [
    { text: '#' },
    { text: 'Értesítés' },
    { text: 'Feladó' },
    { text: 'Létrehozva', order: true },
    { text: 'Műveletek', class: 'text-end' },
  ];

  public tableRows = computed<ITableRow<INotification>[]>(() => this.getTableRows());

  public notificationForEdit = signal<INotification | null>(null);

  private readonly notiFirebaseService = inject(NotificationFirebaseService);
  private readonly dialogsService = inject(DialogsService);
  private readonly popupService = inject(PopupService);
  private readonly authFirebaseService = inject(AuthFirebaseService);

  public markNotificationAsSeen(notification: INotification): void {
    if (!notification.seen) {
      this.notiFirebaseService.markNotificationAsSeen(notification.id).pipe(take(1)).subscribe();
    }
  }

  private getTableRows(): ITableRow<INotification>[] {
    const notifications = this.notiFirebaseService
      .userNotifications()
      .sort((a, b) => b.updatedDatetime.localeCompare(a.updatedDatetime));
    const { userId } = this.authFirebaseService.userPayload()!;

    return notifications.map((n) => {
      const operations: TableCellOperationType[] = [
        {
          name: TableOperationEnum.SEE,
          triggerFn: this.onOpenNotificationViewDialogClick.bind(this),
        },
      ];

      if (userId === n.createdUserId) {
        operations.push(
          {
            name: TableOperationEnum.EDIT,
            triggerFn: (row: ITableRow) => this.notificationForEdit.set(row.model),
          },
          { name: TableOperationEnum.DELETE, triggerFn: this.onOpenWarningDialogClick.bind(this) },
        );
      }

      return {
        model: n,
        cells: {
          seenTemplate: {
            templateRef: this.bellNotificationTemplate(),
          },
          not: {
            value: `<div class="fw-bold ${NOTIFICATION_COLORS[n.type]}">${n.subject}</div><div class="ellipsis">${n.text}</div>`,
          },
          createdUser: { value: n.createdUserName, class: 'fw-bold' },
          createdDatetime: {
            value: formatDateWithMoment(n.createdDatetime, {
              formats: ['YYYY. MM. DD. HH:mm:ss'],
              useFormat: 'YYYY. MM. DD. HH:mm',
            }),
          },
          options: {
            operations: operations,
          },
        },
      };
    });
  }

  private onOpenWarningDialogClick(row: ITableRow<INotification>): void {
    const newDialog: DialogModel = new DialogModel('Figyelmeztetés!', {
      type: 'delete',
      templateConfig: {
        contentText: `<div>Biztos abban, hogy eltávolítja a(z) <span class="label-primary">"${row.model?.subject}"</span> nevű értesítést?</div>`,
      },
    });
    newDialog.trigger$.pipe(switchMap(() => this.deleteNotification(row.model!.id))).subscribe();
    this.dialogsService.addNewDialog(newDialog);
  }

  private onOpenNotificationViewDialogClick(row: ITableRow<INotification>): void {
    const { subject, text } = row.model!;
    const newDialog: DialogModel = new DialogModel(subject, {
      type: 'default',
      size: 'normal',
      templateConfig: {
        contentText: `<div class="pre-wrap label-medium">${convertToLink(text)}</div>`,
        contentClass: 'd-block text-start',
      },
    });
    this.markNotificationAsSeen(row.model!);
    this.dialogsService.addNewDialog(newDialog);
  }

  private deleteNotification(notificationId: string): Observable<string | null> {
    return this.notiFirebaseService.deleteNotification(notificationId).pipe(
      tap(() => {
        this.dialogsService.removeLastOpenedDialog();
        this.popupService.add({
          details: 'Az értesítés eltávolításra került',
          severity: 'success',
          title: 'Sikeres művelet!',
        });
      }),
      catchError(() => {
        this.popupService.add({
          details: 'Az értesítés eltávolítása során hiba történt',
          severity: 'error',
          title: 'Sikertelen művelet!',
        });
        return of(null);
      }),
    );
  }

  @HostBinding('class.stretch')
  // eslint-disable-next-line @typescript-eslint/class-literal-property-style
  public get stretchClass(): boolean {
    return true;
  }
}
