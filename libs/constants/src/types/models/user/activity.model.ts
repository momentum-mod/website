import { Activity as PrismaActivity } from '@prisma/client';
import { ActivityType } from '../../../enums/activity-type.enum';
import { NumberifyBigInt } from '../../utils';
import { User } from './user.model';

export interface Activity extends NumberifyBigInt<PrismaActivity> {
  type: ActivityType;
  user?: User;
}
