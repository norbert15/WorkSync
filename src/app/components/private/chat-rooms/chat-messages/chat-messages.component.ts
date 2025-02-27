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
import { UserFirebaseService } from '../../../../services/firebase/user-firebase.service';
import { PopupService } from '../../../../services/popup.service';
import { HUN_DAYS, SYSTEM } from '../../../../core/constans/variables';

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
  messages: Array<ChatMessageType>;
};

type ChatDayGroupType = {
  date: string;
  datetime: string;
  timeGroups: Array<ChatTimeGroupType>;
};

@Component({
  selector: 'app-chat-messages',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-messages.component.html',
  styleUrl: './chat-messages.component.scss',
})
export class ChatMessagesComponent implements OnInit, OnDestroy {
  public chatContainerRef = viewChild<ElementRef<HTMLDivElement>>('chatContainerRef');

  public chatRoomId = input<string | null>(null);

  public roomOwnerUserId = input<string>('');

  public roomParticipants = input<Array<ChatParticipantType>>([]);

  public openRoomEditor = output<void>();

  public readonly SYSTEM_ID = SYSTEM.id;

  public chatGroupMessages = signal<Array<ChatDayGroupType>>([]);

  public message = model('');

  public userId = signal('');

  private _chatRoomId$ = toObservable(this.chatRoomId);

  private readonly destroyed$ = new ReplaySubject<void>(1);
  private readonly chatFirebaseSevice = inject(ChatFirebaseService);
  private readonly userFirebaseService = inject(UserFirebaseService);
  private readonly popupService = inject(PopupService);

  public ngOnInit(): void {
    //this.fetchUserAndAddressMessages();
    this.userId.set(this.userFirebaseService.user$.getValue()!.id);
    this.handleChatRoomIdChange();
  }

  public ngOnDestroy(): void {
    this.destroyed$.next();
    this.destroyed$.complete();
  }

  public onSendMessageClick(): void {
    const message = this.message();
    if (message) {
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
    }
  }

  private fetchUserAndAddressMessages(): void {}

  private handleChatRoomIdChange(): void {
    this._chatRoomId$
      .pipe(
        takeUntil(this.destroyed$),
        switchMap((roomId: string | null) => {
          if (roomId) {
            return this.fetchChatRoomMessagesObservable(roomId);
          }

          return of([]);
        }),
      )
      .subscribe();
  }

  private fetchChatRoomMessagesObservable(roomId: string): Observable<Array<IMessage>> {
    return this.chatFirebaseSevice.getChatRoomMessages(roomId).pipe(
      tap((messages: Array<IMessage>) => {
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

  private buildChatGroups(messages: Array<IMessage>): Array<ChatDayGroupType> {
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

      const groupKey = `${dateMoment.format('YYYY. MM.')} ${HUN_DAYS[dateMoment.day()].dayName.toLowerCase()}`;

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

    const data: Array<ChatDayGroupType> = [];

    Object.values(dayGroups).forEach((dayGroup) => {
      const timeGroups: Array<ChatTimeGroupType> = Object.values(dayGroup.timeGroups).sort((a, b) =>
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
