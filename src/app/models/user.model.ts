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
