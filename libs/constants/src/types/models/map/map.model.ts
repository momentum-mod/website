import { MMap as PrismaMMap } from '@prisma/client';
import { MapStatusNew } from '../../../enums/map-status.enum';
import { Gamemode } from '../../../enums/gamemode.enum';
import { MapImage } from './map-image.model';
import { CreateMapTrack, MapTrack } from './map-track.model';
import { CreateMapInfo, MapInfo } from './map-info.model';
import { User } from '../user/user.model';
import { MapStats } from './map-stats.model';
import { CreateMapCredit, MapCredit } from './map-credit.model';
import { MapFavorite } from './map-favorite.model';
import { MapLibraryEntry } from './map-library-entry';
import { Rank } from '../run/rank.model';
import { MapSubmissionType } from '../../../enums/map-submission-type.enum';
import { MapSubmissionSuggestion } from './map-submission-suggestion.model';
import { MapSubmissionPlaceholder } from './map-submission-placeholder.model';

/**
 * The term "MMap" (Momentum Map)  is used just in cases where we would use
 * "Map" to avoid collision with the "Map" data structure.
 */
export interface MMap extends Omit<PrismaMMap, 'thumbnailID' | 'mainTrackID'> {
  type: Gamemode;
  status: MapStatusNew;
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

export interface CreateMapWithFiles {
  bsp: any;
  vmfs: any[];
  data: CreateMap;
}

export interface CreateMap extends Pick<MMap, 'name' | 'fileName'> {
  submissionType: MapSubmissionType;
  suggestions: MapSubmissionSuggestion[];
  wantsPrivateTesting: boolean;
  placeholders: MapSubmissionPlaceholder[];
  testInvites?: number[];
  info: CreateMapInfo;
  tracks: CreateMapTrack[];
  credits: CreateMapCredit[];
}

export type UpdateMap = Partial<
  Pick<
    CreateMap,
    | 'name'
    | 'fileName'
    | 'suggestions'
    | 'placeholders'
    | 'testInvites'
    | 'info'
    | 'credits'
    | 'tracks'
  >
> & {
  status: MapStatusNew;
};
