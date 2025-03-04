import {
  Component,
  computed,
  inject,
  Input,
  input,
  model,
  output,
  signal,
  TemplateRef,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { catchError, Observable, of, switchMap, take, tap } from 'rxjs';

import { ButtonComponent } from '../../../reusables/button/button.component';
import { IUser } from '../../../../models/user.model';
import { DialogsService } from '../../../../services/dialogs.service';
import { DialogModel } from '../../../../models/dialog.model';
import { InputComponent } from '../../../reusables/input/input.component';
import { PopupService } from '../../../../services/popup.service';
import { ChatFirebaseService } from '../../../../services/firebase/chat-firebase.service';
import { ChatParticipantType, IChatRoom } from '../../../../models/chat.model';
import { IOption, SelectComponent } from '../../../reusables/select/select.component';
import { IconIds } from '../../../../core/constans/enums';

@Component({
  selector: 'app-chat-room-dialog-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonComponent, InputComponent, SelectComponent],
  templateUrl: './chat-room-dialog-form.component.html',
})
export class ChatRoomDialogFormComponent {
  public chatRoomFormTemplate = viewChild<TemplateRef<any>>('chatRoomFormTemplate');
  public chatRoomDialogFooterTemplate = viewChild<TemplateRef<any>>('roomDialogFooterTemplate');

  @Input() public set room(room: IChatRoom | null) {
    this.chatRoomForEdit.set(room);

    if (room) {
      this.chatRoomName.set(room.name);
      this.onOpenChatRoomFormDialogClick();
    }
  }

  public users = input<IUser[]>([]);

  public roomCreate = output<string>();
  public closed = output<void>();

  public readonly CHAT_DOTS_ICON = IconIds.CHAT_DOTS;

  public selectableUsers = computed<({ checked: boolean } & IUser)[]>(() => {
    const chatRoom = this.chatRoomForEdit();
    const users = this.users();

    return users.map((user) => ({
      checked: !!(chatRoom && chatRoom.participants.find((pr) => pr.userId === user.id)),
      ...user,
    }));
  });

  public selecableUserOptions = computed<IOption<IUser>[]>(() => {
    return this.users().map((u) => ({ label: `${u.lastName} ${u.firstName}`, value: u }));
  });

  public chatRoomName = model('');

  public transferedUser = model<IUser | null>(null);

  public chatRoomForEdit = signal<IChatRoom | null>(null);

  private readonly dialogService = inject(DialogsService);
  private readonly popupService = inject(PopupService);
  private readonly chatFirebaseService = inject(ChatFirebaseService);

  public onOpenChatRoomFormDialogClick(): void {
    console.log('2x');

    const title = this.chatRoomForEdit()
      ? 'Csevegő szoba szerkesztése'
      : 'Új csevegő szoba létrehozása';
    const newDialog: DialogModel = new DialogModel(title, {
      content: this.chatRoomFormTemplate(),
      footer: this.chatRoomDialogFooterTemplate(),
      size: 'medium',
    });
    newDialog.dialogClosed$.pipe(take(1)).subscribe({
      next: () => {
        this.reset();
      },
    });

    this.dialogService.addNewDialog(newDialog);
  }

  public onCloseDialog(): void {
    this.dialogService.removeLastOpenedDialog();
  }

  public onOpenWarningDeleteDialogTemplate(): void {
    const newDialog: DialogModel = new DialogModel('Figyelmeztetés!', {
      type: 'delete',
      templateConfig: {
        contentText: `<div>Biztos abban, hogy eltávolítja a <span class="label-primary">"${this.chatRoomForEdit()?.name}"</span> nevű csevegő szobát? Eltávolítás után a csevegő szoba és a hozzátartozó üzenetek <span class="label-danger">végleges törlődnek</span>!</div>`,
      },
    });
    newDialog.trigger$
      .pipe(
        take(1),
        switchMap(() => this.handleDeleteChatRoom()),
      )
      .subscribe({
        next: () => {
          this.dialogService.removeLastOpenedDialog();
        },
      });

    this.dialogService.addNewDialog(newDialog);
  }

  public handleCreateOrUpdateChatRoom(): void {
    if (this.hasMissingData()) {
      return;
    }

    if (this.chatRoomForEdit()) {
      this.updateChatRoom();
    } else {
      this.createChatRoom();
    }
  }

  public onTransferedUserChange(transferedUser: IUser | null): void {
    if (transferedUser) {
      const findedUser = this.selectableUsers().find((u) => u.id === transferedUser.id)!;
      findedUser.checked = true;
    }
  }

  private createChatRoom(): void {
    const participants = this.getChatRoomParticipants();
    this.popupService.add({
      details: 'A csevegő szoba létrehozása folyamatban...',
      severity: 'info',
    });

    this.chatFirebaseService
      .createChatRoom(this.chatRoomName(), participants)
      .pipe(take(1))
      .subscribe({
        next: (roomId: string) => {
          this.dialogService.removeLastOpenedDialog();
          this.roomCreate.emit(roomId);
          this.popupService.add({
            details: 'A csevegő szoba létrehozása sikeresen megtörént',
            severity: 'success',
            title: 'Sikeres művelet!',
          });
        },
        error: () => {
          this.popupService.add({
            details: 'Hiba történt a csevegő szoba létrehozása során',
            severity: 'error',
            title: 'Sikertelen művelet!',
          });
        },
      });
  }

  private updateChatRoom(): void {
    const participants = this.getChatRoomParticipants();
    this.popupService.add({
      details: 'A csevegő szoba módosítása folyamatban...',
      severity: 'info',
    });

    this.chatFirebaseService
      .updateChatRoom(
        this.chatRoomForEdit()!.id,
        this.chatRoomName(),
        participants,
        this.chatRoomForEdit()!,
        this.transferedUser(),
      )
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.dialogService.removeLastOpenedDialog();
          this.popupService.add({
            details: 'A csevegő szoba módosítása sikeresen megtörtént',
            severity: 'success',
            title: 'Sikeres művelet!',
          });
        },
        error: () => {
          this.popupService.add({
            details: 'A csevegő szoba módosítása során hiba történt',
            severity: 'error',
            title: 'Sikertelen művelet!',
          });
        },
      });
  }

  private getChatRoomParticipants(): ChatParticipantType[] {
    return this.selectableUsers()
      .filter((u) => u.checked)
      .map((u) => ({
        monogram: u.monogram!,
        userId: u.id,
        userName: `${u.lastName} ${u.firstName}`,
      }));
  }

  private hasMissingData(): boolean {
    let missing = false;

    const addedUsers = this.selectableUsers().filter((u) => u.checked);

    if (!addedUsers.length) {
      this.popupService.add({
        details: 'Legalább egy résztvevőt válaszson ki.',
        severity: 'warning',
        title: 'Hiányzó adat!',
      });
      missing = true;
    }

    if (!this.chatRoomName()) {
      this.popupService.add({
        details: 'A csevegő szoba nevének megadása kötelező.',
        severity: 'warning',
        title: 'Hiányzó adat!',
      });
      missing = true;
    }

    return missing;
  }

  private handleDeleteChatRoom(): Observable<string | null> {
    this.popupService.add({
      details: 'A csevegő szoba eltávolítása folyamatban...',
      severity: 'info',
    });
    return this.chatFirebaseService.deleteChatRoom(this.chatRoomForEdit()!).pipe(
      tap(() => {
        this.roomCreate.emit('');
        this.popupService.add({
          details: 'A csevegő szoba eltávolítása sikeresen megtörtént',
          severity: 'success',
          title: 'Sikeres művelet!',
        });
        this.dialogService.removeLastOpenedDialog();
      }),
      catchError(() => {
        this.popupService.add({
          details: 'A csevegő szoba eltávolítása során hiba történt',
          severity: 'error',
          title: 'Sikertelen művelet!',
        });
        return of(null);
      }),
    );
  }

  private reset(): void {
    this.closed.emit();
    this.chatRoomName.set('');
  }
}
