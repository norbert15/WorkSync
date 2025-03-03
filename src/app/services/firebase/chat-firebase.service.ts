import { inject, Injectable } from '@angular/core';
import {
  addDoc,
  collection,
  collectionData,
  doc,
  Firestore,
  getDocs,
  query,
  where,
  writeBatch,
} from '@angular/fire/firestore';
import { catchError, from, map, Observable, of, switchMap, throwError } from 'rxjs';

import { ChatParticipantType, IChatRoom, IMessage } from '../../models/chat.model';
import { UserFirebaseService } from './user-firebase.service';
import moment from 'moment';
import { getMonogram } from '../../core/helpers';
import { IUser } from '../../models/user.model';
import { SYSTEM } from '../../core/constans/variables';
import { AuthFirebaseService } from './auth-firebase.service';

@Injectable({
  providedIn: 'root',
})
export class ChatFirebaseService {
  private readonly CHAT_ROOMS_COLLECTION = 'chat-rooms';
  private readonly CHAT_MESSAGES_COLLECTION = 'chat-messages';

  private readonly firestore = inject(Firestore);
  private readonly userFirebaseService = inject(UserFirebaseService);
  private readonly authFirebaseService = inject(AuthFirebaseService);

  public getUserChatRooms(userId: string): Observable<IChatRoom[]> {
    const chatRoomsRef = collection(this.firestore, this.CHAT_ROOMS_COLLECTION);
    const result = collectionData(chatRoomsRef, { idField: 'id' }) as Observable<IChatRoom[]>;
    return result.pipe(
      map((chatRooms) =>
        chatRooms
          .filter(
            (cr) => cr.ownedUserId === userId || cr.participants.find((p) => p.userId === userId),
          )
          .sort((a, b) => a.createdDatetime.localeCompare(b.createdDatetime)),
      ),
    );
  }

  public getChatRoomMessages(chatRoomId: string): Observable<IMessage[]> {
    const chatMessagesRef = collection(this.firestore, this.CHAT_MESSAGES_COLLECTION);
    const q = query(chatMessagesRef, where('chatRoomId', '==', chatRoomId));

    return collectionData(q, { idField: 'id' }) as Observable<IMessage[]>;
  }

  public getAddressAndSendedMessages(addressUserId: string): Observable<IMessage[]> {
    const { userId } = this.authFirebaseService.userPayload()!;

    const chatMessagesRef = collection(this.firestore, this.CHAT_MESSAGES_COLLECTION);
    const q = query(chatMessagesRef, where('chatRoomId', '==', null));
    const result = collectionData(q, { idField: 'id' }) as Observable<IMessage[]>;
    return result.pipe(
      map((messages) =>
        messages.filter(
          (message) =>
            (message.address?.userId === userId && message.sender.userId === addressUserId) ||
            (message.address?.userId === addressUserId && message.sender.userId === userId),
        ),
      ),
    );
  }

  public createChatRoom(
    chatRoomName: string,
    participants: ChatParticipantType[],
  ): Observable<string> {
    const chatRoomsRef = collection(this.firestore, this.CHAT_ROOMS_COLLECTION);
    const chatMessagesRef = collection(this.firestore, this.CHAT_MESSAGES_COLLECTION);

    const user = this.userFirebaseService.user$.getValue();

    if (!user) {
      return throwError(() => new Error('User not found'));
    }

    const userName = `${user.lastName} ${user.firstName}`;

    participants!.push({ monogram: getMonogram(userName), userId: user.id, userName: userName });

    const now = moment().format('YYYY. MM. DD. HH:mm:ss');
    const newChatRoom: Partial<IChatRoom> = {
      name: chatRoomName,
      ownedUserId: user.id,
      participants: participants,
      createdDatetime: now,
    };

    return from(addDoc(chatRoomsRef, newChatRoom)).pipe(
      switchMap((data) => {
        const newChatMessage: Partial<IMessage> = {
          chatRoomId: data.id,
          sendedDatetime: now,
          sender: { userId: SYSTEM.id, userName: SYSTEM.name },
          text: `<strong>${userName}</strong> létrehozta a csevegő szobát.`,
        };

        return from(addDoc(chatMessagesRef, newChatMessage)).pipe(
          map(() => data.id),
          catchError(() => of(data.id)),
        );
      }),
    );
  }

  public updateChatRoom(
    chatRoomId: string,
    chatRoomName: string,
    participants: ChatParticipantType[],
    lastState: IChatRoom,
    transferedUser: IUser | null,
  ): Observable<string> {
    const chatRoomsRef = doc(this.firestore, this.CHAT_ROOMS_COLLECTION, chatRoomId);
    const chatMessagesRef = collection(this.firestore, this.CHAT_MESSAGES_COLLECTION);

    const user = this.userFirebaseService.user$.getValue();

    if (!user) {
      return throwError(() => new Error('User not found'));
    }

    const userName = `${user.lastName} ${user.firstName}`;

    participants.push({
      monogram: getMonogram(userName),
      userId: user.id,
      userName: userName,
    });

    const chatRoom: Partial<IChatRoom> = {
      participants: participants,
      name: chatRoomName,
    };

    const batch = writeBatch(this.firestore);

    const now = moment().format('YYYY. MM. DD. HH:mm:ss');

    if (transferedUser) {
      chatRoom['ownedUserId'] = transferedUser.id;

      const newChatMessage: Partial<IMessage> = {
        address: null,
        chatRoomId: chatRoomId,
        sendedDatetime: now,
        text: `<strong>${userName}</strong> átruházta a csevegőszoba tulajdonjogát <strong>${transferedUser.lastName} ${transferedUser.firstName}</strong> számára.`,
        sender: { userId: SYSTEM.id, userName: SYSTEM.name },
      };
      batch.set(doc(chatMessagesRef), newChatMessage);
    }

    if (lastState.name !== chatRoomName) {
      const newChatMessage: Partial<IMessage> = {
        address: null,
        chatRoomId: chatRoomId,
        sendedDatetime: now,
        text: `<strong>${userName}</strong> módosította a csevegő szoba nevét: <span class="text-line-through">${lastState.name}</span> -> ${chatRoomName}`,
        sender: { userId: SYSTEM.id, userName: SYSTEM.name },
      };
      batch.set(doc(chatMessagesRef), newChatMessage);
    }

    const newParticipants: ChatParticipantType[] = participants.filter(
      (p) => !lastState.participants.find((oldP) => oldP.userId === p.userId),
    );
    const removedParticipants: ChatParticipantType[] = lastState.participants.filter(
      (oldP) => !participants.find((p) => p.userId === oldP.userId),
    );

    if (newParticipants.length) {
      const newChatMessage: Partial<IMessage> = {
        address: null,
        chatRoomId: chatRoomId,
        sendedDatetime: now,
        text: `<strong>${userName}</strong> hozzáadta a csevegéshez: ${newParticipants.map((p) => p.userName).join(', ')}`,
        sender: { userId: SYSTEM.id, userName: SYSTEM.name },
      };
      batch.set(doc(chatMessagesRef), newChatMessage);
    }

    if (removedParticipants.length) {
      const newChatMessage: Partial<IMessage> = {
        address: null,
        chatRoomId: chatRoomId,
        sendedDatetime: now,
        text: `<strong>${userName}</strong> eltávolította a csevegésből: ${removedParticipants.map((p) => p.userName).join(', ')}`,
        sender: { userId: SYSTEM.id, userName: SYSTEM.name },
      };
      batch.set(doc(chatMessagesRef), newChatMessage);
    }

    batch.update(chatRoomsRef, chatRoom);

    return from(batch.commit()).pipe(map(() => chatRoomId));
  }

  public createChatMessage(message: string, chatRoomId: string): Observable<string> {
    const chatMessagesRef = collection(this.firestore, this.CHAT_MESSAGES_COLLECTION);
    const user = this.userFirebaseService.user$.getValue();

    if (!user) {
      return throwError(() => new Error('User not found'));
    }

    const newChatMessage: Partial<IMessage> = {
      chatRoomId: chatRoomId,
      sendedDatetime: moment().format('YYYY. MM. DD. HH:mm:ss'),
      sender: { userId: user.id, userName: `${user.lastName} ${user.firstName}` },
      text: message,
      address: null,
    };

    return from(addDoc(chatMessagesRef, newChatMessage)).pipe(map((doc) => doc.id));
  }

  public createChatMessageWithParticipant(message: string, participant: IUser): Observable<string> {
    const chatMessagesRef = collection(this.firestore, this.CHAT_MESSAGES_COLLECTION);
    const user = this.userFirebaseService.user$.getValue();

    if (!user) {
      return throwError(() => new Error('User not found'));
    }

    const newChatMessage: Partial<IMessage> = {
      chatRoomId: null,
      sendedDatetime: moment().format('YYYY. MM. DD. HH:mm:ss'),
      sender: { userId: user.id, userName: `${user.lastName} ${user.firstName}` },
      address: {
        userId: participant.id,
        userName: `${participant.lastName} ${participant.firstName}`,
      },
      text: message,
    };

    return from(addDoc(chatMessagesRef, newChatMessage)).pipe(map((doc) => doc.id));
  }

  public deleteChatRoom(chatRoomId: string): Observable<string> {
    const chatMessagesRef = collection(this.firestore, this.CHAT_MESSAGES_COLLECTION);
    const messageQuery = query(chatMessagesRef, where('chatRoomId', '==', chatRoomId));

    const chatRoomRef = doc(this.firestore, this.CHAT_ROOMS_COLLECTION, chatRoomId);

    const batch = writeBatch(this.firestore);
    batch.delete(chatRoomRef);

    return from(getDocs(messageQuery)).pipe(
      switchMap((snapshot) => {
        snapshot.docs.forEach((data) => {
          batch.delete(doc(this.firestore, this.CHAT_MESSAGES_COLLECTION, data.id));
        });

        return from(batch.commit()).pipe(map(() => chatRoomId));
      }),
    );
  }
}
