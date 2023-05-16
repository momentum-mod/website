import { ActivityType } from '@momentum/constants';
import { User } from '@momentum/types';
import { Activity as PrismaActivity } from '@prisma/client';
import { NumberifyBigInt } from '../../utility.interface';

export interface Activity extends NumberifyBigInt<PrismaActivity> {
  type: ActivityType;
  user?: User;
}
