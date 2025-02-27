import { HolidayRequestStatus, UserEnum } from '../core/constans/enums';

export interface IRequestedHoliday {
  startDate: string;
  endDate: string;
  userId: string;
  claimant: string;
  reason: string;
  decisionBy: string | null;
  decisionReason: string | null;
  status: HolidayRequestStatus;
  id: string;
  role: UserEnum;
}
