import { MapTrack as PrismaMapTrack } from '@prisma/client';
import { CreateMapZone, MapZone } from './zone/map-zone.model';

export interface MapTrack extends PrismaMapTrack {
  zones?: MapZone[];
}

export interface CreateMapTrack
  extends Pick<MapTrack, 'trackNum' | 'isLinear' | 'numZones' | 'difficulty'> {
  zones: CreateMapZone[];
}
