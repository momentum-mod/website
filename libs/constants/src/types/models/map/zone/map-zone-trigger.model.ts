import { MapZoneTrigger as PrismaMapZoneTrigger } from '@prisma/client';
import { MapZoneTriggerProperties } from './map-zone-trigger-properties.model';

export interface MapZoneTrigger
  extends Omit<PrismaMapZoneTrigger, 'id' | 'zoneID'> {
  zoneProps?: MapZoneTriggerProperties;
}
