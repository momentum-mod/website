import {Activity_Type} from './activity-type.model';
import {User} from './user.model';

export interface Activity {
  id: number;
  type: Activity_Type;
  userID?: number;
  user: User;
  data: string;
  createdAt?: Date;
  updatedAt?: Date;
}
