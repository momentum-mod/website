import { ActivityType } from '@momentum/constants';
import { MapNotify as PrismaMapNotify } from '@prisma/client';

export interface MapNotify extends PrismaMapNotify {
  notifyOn: ActivityType;
}

export interface UpdateMapNotify extends Pick<MapNotify, 'notifyOn'> {}
