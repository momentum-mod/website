import {User} from './user.model';

export interface MapCredit {
  id: string;
  mapID?: number;
  type: number;
  userID?: number;
  user?: User;
  createdAt?: number;
  updatedAt?: number;
}
