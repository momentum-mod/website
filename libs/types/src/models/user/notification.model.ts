import { Activity, User } from '@momentum/types';
import { Notification as PrismaNotification } from '@prisma/client';

export interface Notification extends PrismaNotification {
  activity: Activity;
  user?: User;
}

export interface UpdateNotification extends Pick<Notification, 'read'> {}
