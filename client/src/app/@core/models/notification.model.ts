import {User} from './user.model';
import {Activity} from './activity.model';

export interface SiteNotification {
  id: number;
  forUser: User;
  activity: Activity;
  read: boolean;
  createdAt: Date;
}
