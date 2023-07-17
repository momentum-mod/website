import { Notification as PrismaNotification } from '@prisma/client';
import { Activity } from './activity.model';
import { User } from './user.model';

export interface Notification extends PrismaNotification {
  activity: Activity;
  user?: User;
}

export interface UpdateNotification extends Pick<Notification, 'read'> {}
