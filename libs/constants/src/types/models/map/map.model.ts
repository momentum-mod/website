import { Map as PrismaMap } from '@prisma/client';
import { MapStatus } from '../../../enums/map-status.enum';
import { MapType } from '../../../enums/map-type.enum';
import { MapImage } from './map-image.model';
import { CreateMapTrack, MapTrack } from './map-track.model';
import { CreateMapInfo, MapInfo } from './map-info.model';
import { User } from '../user/user.model';
import { MapStats } from './map-stats.model';
import { CreateMapCredit, MapCredit } from './map-credit.model';
import { MapFavorite } from './map-favorite.model';
import { MapLibraryEntry } from './map-library-entry';
import { Rank } from '../run/rank.model';

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

export type UpdateMap = Pick<Map, 'status'>

export interface CreateMap extends Pick<Map, 'name' | 'type'> {
  info: CreateMapInfo;
  tracks: CreateMapTrack[];
  credits: CreateMapCredit[];
}
