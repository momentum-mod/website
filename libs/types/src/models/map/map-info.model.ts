import { MapInfo as PrismaMapInfo } from '@prisma/client';

export interface MapInfo extends Omit<PrismaMapInfo, 'mapID'> {}

export interface CreateMapInfo
  extends Pick<
    MapInfo,
    'description' | 'youtubeID' | 'numTracks' | 'creationDate'
  > {}

export interface UpdateMapInfo
  extends Partial<
    Pick<MapInfo, 'description' | 'youtubeID' | 'creationDate'>
  > {}
