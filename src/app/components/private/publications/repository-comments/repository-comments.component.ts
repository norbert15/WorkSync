import {
  Component,
  computed,
  ElementRef,
  inject,
  input,
  model,
  signal,
  TemplateRef,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize, take } from 'rxjs';

import { IRepositoryComment } from '../../../../models/branch.model';
import { DialogsService } from '../../../../services/dialogs.service';
import { DialogModel } from '../../../../models/dialog.model';
import { ButtonComponent } from '../../../reusables/button/button.component';
import { PublicationFirebaseService } from '../../../../services/firebase/publication-firebase.service';
import { PopupService } from '../../../../services/popup.service';
import moment from 'moment';
import { HUN_DAYS } from '../../../../core/constans/variables';
import { IUser } from '../../../../models/user.model';
import { CommonModule } from '@angular/common';
import { ScrollToBottomDirective } from '../../../../directives/scroll-to-bottom.directive';

type CommentType = {
  monogram: string;
  userName: string;
  userId: string;
  time: string;
  text: string;
};

type CommentGroupType = {
  datetime: string;
  dateStr: string;
  comments: Array<CommentType>;
};

@Component({
  selector: 'app-repository-comments',
  standalone: true,
  imports: [CommonModule, ButtonComponent, FormsModule, ScrollToBottomDirective],
  templateUrl: './repository-comments.component.html',
  styleUrl: './repository-comments.component.scss',
})
export class RepositoryCommentsComponent {
  public commentsDialogContentTemplate = viewChild<TemplateRef<any>>(
    'commentsDialogContentTemplate',
  );
  public commentsDialogFooterTemplate = viewChild<TemplateRef<any>>('commentsDialogFooterTemplate');

  public comments = input<Array<IRepositoryComment>>([]);

  public repositroyId = input.required<string>();

  public user = input<IUser | null>(null);

  public displayedCommentGroups = computed<Array<CommentGroupType>>(() => {
    const comments = this.comments();

    const commentGroups: Record<string, CommentGroupType> = {};

    for (const comment of comments) {
      const dateMoment = moment(comment.created, ['YYYY. MM. DD. HH:mm:ss']);
      const groupKey = `${dateMoment.format('YYYY. MM.')} ${HUN_DAYS[dateMoment.day()].dayName.toLowerCase()}`;

      if (!commentGroups[groupKey]) {
        commentGroups[groupKey] = {
          comments: [],
          dateStr: groupKey,
          datetime: comment.created,
        };
      }

      let monogram = comment.userName
        .split(' ')
        .reduce((prev, current) => `${prev}${current.charAt(0)}`, '');

      commentGroups[groupKey].comments.push({
        monogram: monogram,
        text: comment.text,
        time: dateMoment.format('HH:mm'),
        userName: comment.userName,
        userId: comment.userId,
      });
    }

    return Object.values(commentGroups).sort((a, b) => a.datetime.localeCompare(b.datetime));
  });

  public comment = model('');

  public commentSendIsLoading = signal(false);

  private readonly dialogsService = inject(DialogsService);
  private readonly popupService = inject(PopupService);
  private readonly publicationFirebaseService = inject(PublicationFirebaseService);

  public onSendClick(): void {
    if (this.comment()) {
      this.popupService.add({
        details: 'Megjegyzés hozzáadása folyamatban...',
        severity: 'info',
      });
      this.commentSendIsLoading.set(true);
      this.publicationFirebaseService
        .addCommentToRepository(this.repositroyId(), this.comment())
        .pipe(
          take(1),
          finalize(() => {
            this.commentSendIsLoading.set(false);
          }),
        )
        .subscribe({
          next: () => {
            this.comment.set('');
            this.popupService.add({
              details: 'Megjegyzés hozzáadása sikeresen megtörtént',
              severity: 'success',
              title: 'Sikeres művelet!',
            });
          },
          error: () => {
            this.popupService.add({
              details: 'Megjegyzés hozzáadása során hiba történt',
              severity: 'error',
              title: 'Sikertelen művelet!',
            });
          },
        });
    }
  }

  public onOpenCommentsDialogClick(): void {
    const newDialog: DialogModel = new DialogModel('Megjegyzések', {
      footer: this.commentsDialogFooterTemplate(),
      content: this.commentsDialogContentTemplate(),
      size: 'normal',
    });
    this.dialogsService.addNewDialog(newDialog);
    newDialog.afterComplete$.pipe(take(1)).subscribe({
      next: () => {
        this.comment.set('');
      },
    });
  }

  public onCloseCommentsDialogClick(): void {
    this.dialogsService.removeLastOpenedDialog();
  }
}
