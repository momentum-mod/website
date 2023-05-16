import { MapZoneTriggerProperties as PrismaMapZoneTriggerProperties } from '@prisma/client';

// Apparently there's some reason for this stupid table to exist, I can't remember what Goc said though
// Think it's changing for 0.10 anyway ╚(•⌂•)╝
export interface MapZoneTriggerProperties
  extends Omit<PrismaMapZoneTriggerProperties, 'id' | 'triggerID'> {}
