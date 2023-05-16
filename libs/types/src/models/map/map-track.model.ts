import { CreateMapZone, MapZone } from '@momentum/types';
import { MapTrack as PrismaMapTrack } from '@prisma/client';

export interface MapTrack extends PrismaMapTrack {
  zones?: MapZone[];
}

export interface CreateMapTrack
  extends Pick<MapTrack, 'trackNum' | 'isLinear' | 'numZones' | 'difficulty'> {
  zones: CreateMapZone[];
}
