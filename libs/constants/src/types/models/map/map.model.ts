import { MMap as PrismaMMap } from '@prisma/client';
import { MapStatusNew } from '../../../enums/map-status.enum';
import { Gamemode } from '../../../enums/gamemode.enum';
import { MapImage } from './map-image.model';
import { CreateMapInfo, MapInfo, UpdateMapInfo } from './map-info.model';
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
export interface MMap extends Omit<PrismaMMap, 'thumbnailID' | 'zones'> {
  type: Gamemode;
  status: MapStatusNew;
  downloadURL: string;
  thumbnail?: MapImage;
  info?: MapInfo;
  // Omit then redefine zones so can be nullable - even though it's a regular
  // field, we shouldn't SELECT for it unless requested with an expand param.
  zones?: MapZones;
  submitter?: User;
  images?: MapImage[];
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
  zones: MapZones;
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
    | 'credits'
  >
> & {
  status?: MapStatusNew.CONTENT_APPROVAL | MapStatusNew.FINAL_APPROVAL;
  info?: UpdateMapInfo;
  zones?: MapZones;
};

export type UpdateMapAdmin = Omit<UpdateMap, 'status'> & {
  status?: MapStatusNew;
};
