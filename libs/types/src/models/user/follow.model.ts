import { ActivityType } from '@momentum/constants';
import { User } from '@momentum/types';
import { Follow as PrismaFollow } from '@prisma/client';

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
