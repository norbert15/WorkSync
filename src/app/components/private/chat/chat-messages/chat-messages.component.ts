import {
  Component,
  ElementRef,
  inject,
  input,
  model,
  OnDestroy,
  OnInit,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { catchError, Observable, of, ReplaySubject, switchMap, take, takeUntil, tap } from 'rxjs';
import moment from 'moment';

import { ChatFirebaseService } from '../../../../services/firebase/chat-firebase.service';
import { ChatParticipantType, IMessage } from '../../../../models/chat.model';
import { convertToLink, getMonogram } from '../../../../core/helpers';
import { PopupService } from '../../../../services/popup.service';
import { HUN_DAYS, SYSTEM } from '../../../../core/constans/variables';
import { IUser } from '../../../../models/user.model';
import { AuthFirebaseService } from '../../../../services/firebase/auth-firebase.service';
import { MatIcon } from '@angular/material/icon';
import { IconIds } from '../../../../core/constans/enums';

type ChatMessageType = {
  text: string;
  datetime: string;
};

type ChatTimeGroupType = {
  time: string;
  datetime: string;
  userId: string;
  userName: string;
  userMonogram: string;
  messages: ChatMessageType[];
};

type ChatDayGroupType = {
  date: string;
  datetime: string;
  timeGroups: ChatTimeGroupType[];
};

@Component({
  selector: 'app-chat-messages',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIcon],
  templateUrl: './chat-messages.component.html',
  styleUrl: './chat-messages.component.scss',
})
export class ChatMessagesComponent implements OnInit, OnDestroy {
  public chatContainerRef = viewChild<ElementRef<HTMLDivElement>>('chatContainerRef');

  public chatRoomId = input<string | null>(null);
  public chatParticipant = input<IUser | null>(null);

  public roomOwnerUserId = input<string>('');

  public roomParticipants = input<ChatParticipantType[]>([]);

  public openRoomEditor = output<void>();

  public readonly PENCIL_ICON = IconIds.PENCIL_SQUARE;
  public readonly SEND_ICON = IconIds.SEND;
  public readonly SYSTEM_ID = SYSTEM.id;

  public chatGroupMessages = signal<ChatDayGroupType[]>([]);

  public message = model('');

  public userId = signal('');

  private _chatRoomId$ = toObservable(this.chatRoomId);
  private _chatParticipant$ = toObservable(this.chatParticipant);

  private readonly destroyed$ = new ReplaySubject<void>(1);
  private readonly chatFirebaseSevice = inject(ChatFirebaseService);
  private readonly authFirebaseService = inject(AuthFirebaseService);
  private readonly popupService = inject(PopupService);

  public ngOnInit(): void {
    this.userId.set(this.authFirebaseService.userPayload()!.userId);
    this.handleChatRoomIdChange();
    this.handleChatParticipantChange();
  }

  public ngOnDestroy(): void {
    this.destroyed$.next();
    this.destroyed$.complete();
  }

  public onSendMessageClick(): void {
    if (this.chatParticipant()) {
      this.sendMessageToParticipant();
    } else {
      this.sendMessageToChatRoom();
    }
  }

  private sendMessageToChatRoom(): void {
    const message = this.message().trim();

    if (this.chatRoomId() && message) {
      this.chatFirebaseSevice
        .createChatMessage(message, this.chatRoomId()!)
        .pipe(take(1))
        .subscribe({
          next: () => {
            this.message.set('');
            this.popupService.add({
              details: 'Az üzenet elküldése sikeresen megtörtént',
              severity: 'success',
            });
          },
          error: () => {
            this.popupService.add({
              details: 'Az üzenet elküldése során hiba történt',
              severity: 'error',
            });
          },
        });
    } else {
      this.message.update((prev) => prev.trim());
    }
  }

  private sendMessageToParticipant(): void {
    const message = this.message().trim();
    if (this.chatParticipant() && message) {
      this.chatFirebaseSevice
        .createChatMessageWithParticipant(message, this.chatParticipant()!)
        .pipe(take(1))
        .subscribe({
          next: () => {
            this.message.set('');
            this.popupService.add({
              details: 'Az üzenet elküldése sikeresen megtörtént',
              severity: 'success',
            });
          },
          error: () => {
            this.popupService.add({
              details: 'Az üzenet elküldése során hiba történt',
              severity: 'error',
            });
          },
        });
    } else {
      this.message.update((prev) => prev.trim());
    }
  }

  private handleChatParticipantChange(): void {
    this._chatParticipant$
      .pipe(
        takeUntil(this.destroyed$),
        switchMap((user: IUser | null) => {
          this.chatGroupMessages.set([]);
          this.message.set('');

          if (user) {
            return this.fetchChatUserAndParticipantMessages(user.id);
          }

          return of([]);
        }),
      )
      .subscribe();
  }

  private fetchChatUserAndParticipantMessages(participantUserId: string): Observable<IMessage[]> {
    return this.chatFirebaseSevice.getAddressAndSendedMessages(participantUserId).pipe(
      tap((messages: IMessage[]) => {
        this.chatGroupMessages.set(this.buildChatGroups(messages));

        if (this.chatContainerRef()) {
          setTimeout(() => {
            const { nativeElement } = this.chatContainerRef()!;
            nativeElement.scrollTop = nativeElement.offsetHeight + 85;
          }, 100);
        }
      }),
      catchError(() => of([])),
    );
  }

  private handleChatRoomIdChange(): void {
    this._chatRoomId$
      .pipe(
        takeUntil(this.destroyed$),
        switchMap((roomId: string | null) => {
          this.chatGroupMessages.set([]);
          this.message.set('');

          if (roomId) {
            return this.fetchChatRoomMessagesObservable(roomId);
          }

          return of([]);
        }),
      )
      .subscribe();
  }

  private fetchChatRoomMessagesObservable(roomId: string): Observable<IMessage[]> {
    return this.chatFirebaseSevice.getChatRoomMessages(roomId).pipe(
      tap((messages: IMessage[]) => {
        this.chatGroupMessages.set(this.buildChatGroups(messages));

        if (this.chatContainerRef()) {
          setTimeout(() => {
            const { nativeElement } = this.chatContainerRef()!;
            nativeElement.scrollTop = nativeElement.offsetHeight + 85;
          }, 100);
        }
      }),
      catchError(() => of([])),
    );
  }

  private buildChatGroups(messages: IMessage[]): ChatDayGroupType[] {
    const dayGroups: Record<
      string,
      {
        date: string;
        datetime: string;
        timeGroups: Record<string, ChatTimeGroupType>;
      }
    > = {};

    const dateFormat = ['YYYY. MM. DD. HH:mm:ss'];
    const sortedMessages = messages.sort(
      (a, b) =>
        moment(a.sendedDatetime, dateFormat).valueOf() -
        moment(b.sendedDatetime, dateFormat).valueOf(),
    );

    let lastTimeKey = '';
    let lastUserId = '';

    for (const message of sortedMessages) {
      const { sendedDatetime, sender } = message;

      const dateMoment = moment(sendedDatetime, dateFormat);

      const groupKey = `${dateMoment.format('YYYY. MM. DD.')} ${HUN_DAYS[dateMoment.day()].dayName.toLowerCase()}`;

      if (!dayGroups[groupKey]) {
        dayGroups[groupKey] = {
          date: groupKey,
          datetime: sendedDatetime,
          timeGroups: {},
        };
      }

      const { timeGroups } = dayGroups[groupKey];

      let timeKey = `${sender.userId}-${dateMoment.format('HH:mm')}`;

      if (timeGroups[timeKey]) {
        const sameSender = lastUserId === sender.userId;

        if (!sameSender) {
          timeKey = `${sender.userId}-${dateMoment.format('HH:mm:ss')}`;
        } else if (timeKey !== lastTimeKey) {
          timeKey = lastTimeKey;
        }
      }

      if (!timeGroups[timeKey]) {
        const monogram = getMonogram(sender.userName).toUpperCase();
        timeGroups[timeKey] = {
          messages: [],
          time: dateMoment.format('HH:mm'),
          datetime: sendedDatetime,
          userId: sender.userId,
          userName: sender.userName,
          userMonogram: sender.userId === SYSTEM.id ? 'R' : monogram,
        };
      }

      timeGroups[timeKey].messages.push({
        text: convertToLink(message.text) ?? '',
        datetime: sendedDatetime,
      });

      lastTimeKey = timeKey;
      lastUserId = sender.userId;
    }

    const data: ChatDayGroupType[] = [];

    Object.values(dayGroups).forEach((dayGroup) => {
      const timeGroups: ChatTimeGroupType[] = Object.values(dayGroup.timeGroups).sort((a, b) =>
        a.datetime.localeCompare(b.datetime),
      );
      data.push({
        date: dayGroup.date,
        datetime: dayGroup.datetime,
        timeGroups: timeGroups,
      });
    });

    return data.sort((a, b) => a.datetime.localeCompare(b.datetime));
  }
}
