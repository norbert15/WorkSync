import { UserEnum } from '../core/constans/enums';

export interface IUserBase {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  jobTitle: string;
}

export interface IUser extends IUserBase {
  id: string;
  googleRefreshToken: string;
  role: UserEnum;
}

export interface IUserPayload {
  user_id: string;
  email: string;
}

export interface IUserWorkStatus {
  id: string;
  userId: string;
  created: string;
  workStart: string;
  workEnd: string | null;
  report: string | null;
}
