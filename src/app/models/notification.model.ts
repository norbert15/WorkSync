import { NotificationEnum } from '../core/constans/enums';

export interface INotification {
  id: string;
  createdDatetime: string;
  updatedDatetime: string;
  createdUserName: string;
  createdUserId: string;
  subject: string;
  text: string;
  type: NotificationEnum;
  seen: boolean;
  targetUserIds: Array<string> | 'all';
}

export type SeenNotificationsType = Record<string, boolean>;
