import { MapZone as PrismaMapZone } from '@prisma/client';
import { MapZoneStats, MapZoneTrigger } from '@momentum/types';

export interface MapZone extends Omit<PrismaMapZone, 'id'> {
  stats?: MapZoneStats[];
  triggers?: MapZoneTrigger[];
}

export interface CreateMapZone extends Pick<MapZone, 'zoneNum'> {
  triggers?: MapZoneTrigger[];
  // Old api also has a stats object just containing a basestats, I'm unsure why.
}
