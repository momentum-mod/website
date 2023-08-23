import { MMap as PrismaMMap } from '@prisma/client';
import { MapStatus } from '../../../enums/map-status.enum';
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
import { MapCreditType } from '../../../enums/map-credit-type.enum';
import { MapSubmissionSuggestion } from './map-submission-suggestion.model';

/**
 * The term "MMap" (Momentum Map)  is used just in cases where we would use
 * "Map" to avoid collision with the "Map" data structure.
 */
export interface MMap extends Omit<PrismaMMap, 'thumbnailID' | 'mainTrackID'> {
  type: Gamemode;
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

export interface CreateMap extends Pick<MMap, 'name' | 'fileName'> {
  submissionType: MapSubmissionType;
  suggestions: MapSubmissionSuggestion[];
  wantsPrivateTesting: boolean;
  placeholders: { alias: string; type: MapCreditType }[];
  testInvites?: number[];
  info: CreateMapInfo;
  tracks: CreateMapTrack[];
  credits: CreateMapCredit[];
}

// TODO: redo during /maps patch
export type UpdateMap = Pick<MMap, 'status'>;
