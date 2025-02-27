type MessageParticipantType = { userId: string; userName: string };

export interface IMessage {
  id: string;
  text: string;
  sendedDatetime: string;
  sender: MessageParticipantType;
  address: MessageParticipantType | null;
  chatRoomId: string | null;
}

export type ChatParticipantType = {
  monogram: string;
  userName: string;
  userId: string;
};

export interface IChatRoom {
  createdDatetime: string;
  id: string;
  name: string;
  ownedUserId: string;
  participants: Array<ChatParticipantType>;
}
