import { Component, input, model, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIcon } from '@angular/material/icon';

import { IChatRoom } from '../../../../models/chat.model';
import { IconIds } from '../../../../core/constans/enums';

@Component({
  selector: 'app-chat-rooms',
  standalone: true,
  imports: [CommonModule, MatIcon],
  templateUrl: './chat-rooms.component.html',
  styleUrl: './chat-rooms.component.scss',
})
export class ChatRoomsComponent {
  public chatRooms = input<Array<IChatRoom>>([]);

  public activeChatRoomId = model<string | null>(null);

  public chatRoomSelect = output<string>();

  public readonly CHAT_SQUARE_ICON = IconIds.CHAT_SQUARE;
  public readonly CHAT_SQUARE_DOTS_ICON = IconIds.CHAT_SQUARE_DOTS;

  public onChatRoomSelect(roomId: string): void {
    this.chatRoomSelect.emit(roomId);
    this.activeChatRoomId.set(roomId);
  }
}
