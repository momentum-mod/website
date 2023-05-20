import { MapStatus, MapType } from '@momentum/constants';
import { Map as PrismaMap } from '@prisma/client';
import {
  CreateMapInfo,
  CreateMapTrack,
  CreateMapCredit,
  MapCredit,
  MapFavorite,
  MapImage,
  MapLibraryEntry,
  MapStats,
  Rank,
  User
} from '@momentum/types';
import { MapInfo } from '@momentum/types';
import { MapTrack } from '@momentum/types';

export interface Map extends Omit<PrismaMap, 'thumbnailID' | 'mainTrackID'> {
  type: MapType;
  status: MapStatus;
  downloadURL: string;
  thumbnail?: MapImage;
  mainTrack?: MapTrack;
  info?: MapInfo;
  submitter?: User;
  images?: MapImage[];
  tracks?: MapTrack[];
  stats?: MapStats;
  credits?: MapCredit[];
  favorites?: MapFavorite[];
  libraryEntries?: MapLibraryEntry[];
  worldRecord?: Rank;
  personalBest?: Rank;
}

export interface UpdateMap extends Pick<Map, 'status'> {}

export interface CreateMap extends Pick<Map, 'name' | 'type'> {
  info: CreateMapInfo;
  tracks: CreateMapTrack[];
  credits: CreateMapCredit[];
}
