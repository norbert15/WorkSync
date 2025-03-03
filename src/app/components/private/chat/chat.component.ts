import { Component, computed, HostBinding, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { AsyncPipe, CommonModule } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { ReplaySubject, takeUntil } from 'rxjs';

import { ChatRoomDialogFormComponent } from './chat-room-dialog-form/chat-room-dialog-form.component';
import { ChatMessagesComponent } from './chat-messages/chat-messages.component';
import { UserFirebaseService } from '../../../services/firebase/user-firebase.service';
import { HUN_USER_ENUM_LABELS } from '../../../core/constans/variables';
import { ButtonComponent } from '../../reusables/button/button.component';
import { ChatFirebaseService } from '../../../services/firebase/chat-firebase.service';
import { IUser } from '../../../models/user.model';
import { getMonogram } from '../../../core/helpers';
import { IChatRoom } from '../../../models/chat.model';
import { ChatRoomsComponent } from './chat-rooms/chat-rooms.component';
import { AuthFirebaseService } from '../../../services/firebase/auth-firebase.service';
import { IconIds } from '../../../core/constans/enums';

type UserGroupType = {
  name: string;
  users: IUser[];
};

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [
    CommonModule,
    ButtonComponent,
    AsyncPipe,
    ChatRoomDialogFormComponent,
    ChatMessagesComponent,
    ChatRoomsComponent,
    MatIcon,
  ],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.scss',
})
export class ChatComponent implements OnInit, OnDestroy {
  public readonly CHAT_DOTS_ICON = IconIds.CHAT_DOTS;

  public chatRooms = signal<IChatRoom[]>([]);

  public userGroups = signal<UserGroupType[]>([]);

  public usersWithMonogram = signal<IUser[]>([]);

  public activeChatRoomId = signal('');
  public activeChatRoom = computed<IChatRoom | undefined>(() => {
    const chatRoomId = this.activeChatRoomId();
    const chatRooms = this.chatRooms();

    return chatRooms.find((cr) => cr.id === chatRoomId);
  });

  public activeChatParticipant = signal<IUser | null>(null);

  public chatRoomToEdit = signal<IChatRoom | null>(null);

  private userId!: string;

  private readonly destroyed$ = new ReplaySubject<void>(1);

  private readonly userFirebaseService = inject(UserFirebaseService);
  private readonly authFirebaseService = inject(AuthFirebaseService);
  private readonly chatFirebaseService = inject(ChatFirebaseService);

  public ngOnInit(): void {
    this.userId = this.authFirebaseService.userPayload()!.userId;
    this.handleUserChange();
    this.fetchChatRooms();
    this.fetchAllUsers();
  }

  public ngOnDestroy(): void {
    this.destroyed$.next();
    this.destroyed$.complete();
  }

  public startChatWithOtherUser(user: IUser): void {
    this.activeChatRoomId.set('');
    this.activeChatParticipant.set(user);
  }

  private handleUserChange(): void {}

  private fetchChatRooms(): void {
    this.chatFirebaseService
      .getUserChatRooms(this.userId)
      .pipe(takeUntil(this.destroyed$))
      .subscribe({
        next: (chatRooms: IChatRoom[]) => {
          this.chatRooms.set(chatRooms);

          if (!this.activeChatRoomId() && chatRooms.length) {
            this.activeChatRoomId.set(chatRooms[0].id);
          }
        },
      });
  }

  private fetchAllUsers(): void {
    this.userFirebaseService
      .getAllUsers()
      .pipe(takeUntil(this.destroyed$))
      .subscribe({
        next: (users: IUser[]) => {
          const userGroups: Record<string, UserGroupType> = {};
          const filteredUsers = users.filter((u) => u.id !== this.userId);

          for (const user of filteredUsers) {
            const { role } = user;

            if (!userGroups[role]) {
              userGroups[role] = { name: HUN_USER_ENUM_LABELS[role], users: [] };
            }

            const monogram = getMonogram(`${user.lastName} ${user.firstName}`);
            userGroups[role].users.push({ ...user, monogram });
          }

          this.userGroups.set(
            Object.values(userGroups).sort((a, b) => a.name.localeCompare(b.name)),
          );
          this.usersWithMonogram.set(this.userGroups().flatMap((userGroup) => userGroup.users));
        },
      });
  }

  @HostBinding('class.stretch')
  // eslint-disable-next-line @typescript-eslint/class-literal-property-style
  public get componentClass(): boolean {
    return true;
  }
}
