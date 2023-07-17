import { MapNotify as PrismaMapNotify } from '@prisma/client';
import { ActivityType } from '../../../enums/activity-type.enum';

export interface MapNotify extends PrismaMapNotify {
  notifyOn: ActivityType;
}

export interface UpdateMapNotify extends Pick<MapNotify, 'notifyOn'> {}
