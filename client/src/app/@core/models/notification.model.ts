import {User} from './user.model';
import {Activity} from './activity.model';

export interface SiteNotification {
  id: number;
  forUser: User;
  activityID?: number;
  activity: Activity;
  read: boolean;
  createdAt?: string; // Date
  updatedAt?: string; // Date
}
