import { Component, computed, HostBinding, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { AsyncPipe, CommonModule } from '@angular/common';
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

type UserGroupType = {
  name: string;
  users: Array<IUser>;
};

@Component({
  selector: 'app-chat-rooms',
  standalone: true,
  imports: [
    CommonModule,
    ButtonComponent,
    AsyncPipe,
    ChatRoomDialogFormComponent,
    ChatMessagesComponent,
  ],
  templateUrl: './chat-rooms.component.html',
  styleUrl: './chat-rooms.component.scss',
})
export class ChatRoomsComponent implements OnInit, OnDestroy {
  public chatRooms = signal<Array<IChatRoom>>([]);

  public userGroups = signal<Array<UserGroupType>>([]);

  public usersWithMonogram = signal<Array<IUser>>([]);

  public activeChatRoomId = signal('');
  public activeChatRoom = computed<IChatRoom | undefined>(() => {
    const chatRoomId = this.activeChatRoomId();
    const chatRooms = this.chatRooms();

    return chatRooms.find((cr) => cr.id === chatRoomId);
  });

  public chatRoomToEdit = signal<IChatRoom | null>(null);

  private userId!: string;

  private readonly destroyed$ = new ReplaySubject<void>(1);

  private readonly userFirebaseService = inject(UserFirebaseService);
  private readonly chatFirebaseService = inject(ChatFirebaseService);

  public ngOnInit(): void {
    this.userId = this.userFirebaseService.user$.getValue()!.id;

    this.fetchChatRooms();
    this.fetchAllUsers();
  }

  public ngOnDestroy(): void {
    this.destroyed$.next();
    this.destroyed$.complete();
  }

  private fetchChatRooms(): void {
    this.chatFirebaseService
      .getUserChatRooms(this.userId)
      .pipe(takeUntil(this.destroyed$))
      .subscribe({
        next: (chatRooms: Array<IChatRoom>) => {
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
        next: (users: Array<IUser>) => {
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

  @HostBinding('class')
  public get componentClass(): string {
    return 'stretch';
  }
}
