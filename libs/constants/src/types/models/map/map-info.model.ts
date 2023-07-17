import { MapInfo as PrismaMapInfo } from '@prisma/client';

export type MapInfo = Omit<PrismaMapInfo, 'mapID'>;

export type CreateMapInfo = Pick<
  MapInfo,
  'description' | 'youtubeID' | 'numTracks' | 'creationDate'
>;

export type UpdateMapInfo = Partial<
  Pick<MapInfo, 'description' | 'youtubeID' | 'creationDate'>
>;
