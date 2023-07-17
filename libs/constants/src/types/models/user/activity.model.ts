import { User } from './user.model';
import { ActivityType } from '../../../enums/activity-type.enum';
import { Activity as PrismaActivity } from '@prisma/client';
import { NumberifyBigInt } from '../../utils';

export interface Activity extends NumberifyBigInt<PrismaActivity> {
  type: ActivityType;
  user?: User;
}
