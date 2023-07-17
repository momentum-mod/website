import { Follow as PrismaFollow } from '@prisma/client';
import { ActivityType } from '../../../enums/activity-type.enum';
import { User } from './user.model';

export interface Follow extends PrismaFollow {
  notifyOn: ActivityType;
  followed: User;
  followee: User;
}

export interface FollowStatus {
  local?: Follow;
  target?: Follow;
}

export interface UpdateFollowStatus extends Pick<Follow, 'notifyOn'> {}
