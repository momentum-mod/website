import { MapZoneTrigger as PrismaMapZoneTrigger } from '@prisma/client';
import { MapZoneTriggerProperties } from '@momentum/types';

export interface MapZoneTrigger
  extends Omit<PrismaMapZoneTrigger, 'id' | 'zoneID'> {
  properties?: MapZoneTriggerProperties;
}
