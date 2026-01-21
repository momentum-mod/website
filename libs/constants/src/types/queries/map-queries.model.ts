import { Gamemode } from '../../enums/gamemode.enum';
import { MapStatus } from '../../enums/map-status.enum';
import { TrackType } from '../../enums/track-type.enum';
import { Style } from '../../enums/style.enum';
import { PagedQuery } from './pagination.model';
import { MapSubmissionType } from '../../enums/map-submission-type.enum';
import * as Enum from '@momentum/enum';
import { MapCreditType } from '../../enums/map-credit-type.enum';
import { MapSortType } from '../../enums/map-sort-type.enum';
import { LeaderboardType } from '../../enums/leaderboard-type.enum';
import { MapTag } from '../../enums/map-tag.enum';
import type {
  MapCredit,
  MapInfo,
  MapNotify,
  MapReview,
  MapReviewComment,
  MapSubmissionApproval,
  MapSubmissionPlaceholder,
  MapSubmissionSuggestion,
  MapVersion,
  MapZones,
  MMap
} from '../models/models';

//#region Map

type BaseMapsGetAllExpand =
  | 'leaderboards'
  | 'info'
  | 'stats'
  | 'submitter'
  | 'currentVersionWithZones'
  | 'currentVersion'
  | 'versions'
  | 'versionsWithZones'
  | 'credits';

export type MapsGetAllExpand = Array<
  BaseMapsGetAllExpand | 'inFavorites' | 'personalBest' | 'worldRecord'
>;

export type MapsGetAllSubmissionExpand = Array<
  BaseMapsGetAllExpand | 'inFavorites' | 'personalBest' | 'worldRecord'
>;

type MapsGetAllBaseQuery = {
  skip?: number;
  take?: number;
  search?: string;
  searchStartsWith?: string;
  submitterID?: number;
  creditID?: number;
  creditType?: MapCreditType;
  sortType?: MapSortType;
};

// Keep this in sync with backend MapSortTypeOrder
export const AllowedMapSortTypes = [
  MapSortType.DATE_RELEASED_NEWEST,
  MapSortType.DATE_RELEASED_OLDEST,
  MapSortType.DATE_CREATED_NEWEST,
  MapSortType.DATE_CREATED_OLDEST,
  MapSortType.ALPHABETICAL,
  MapSortType.ALPHABETICAL_REVERSE,
  MapSortType.FAVORITED_LEAST,
  MapSortType.FAVORITED_MOST,
  MapSortType.SUBMISSION_CREATED_NEWEST,
  MapSortType.SUBMISSION_CREATED_OLDEST,
  MapSortType.SUBMISSION_UPDATED_NEWEST,
  MapSortType.SUBMISSION_UPDATED_OLDEST
];

export enum TagQualifier {
  INCLUDE = 1,
  EXCLUDE = 0
}
export const AllowedTagsWithQualifiers = Enum.fastValuesNumeric(MapTag).flatMap(
  (tag) => [
    `${tag};${TagQualifier.INCLUDE}` as const,
    `${tag};${TagQualifier.EXCLUDE}` as const
  ]
);
export type TagWithQualifier = (typeof AllowedTagsWithQualifiers)[number];

export type MapsGetAllQuery = MapsGetAllBaseQuery & {
  expand?: MapsGetAllExpand;
  gamemode?: Gamemode;
  difficultyLow?: number;
  difficultyHigh?: number;
  linear?: boolean;
  favorite?: boolean;
  PB?: boolean;
  leaderboardType?: LeaderboardType;
  // Array containing semicolon-separated 2-tuple strings,
  // where the first part in the tuple is a MapTag value,
  // and the second either a 1 (to include) or 0 (to exclude the tag).
  tagsWithQualifiers?: string[];
};

export type MapsGetAllAdminFilter = Array<MapStatus>;

export type MapsGetAllAdminQuery = MapsGetAllBaseQuery & {
  filter?: MapsGetAllAdminFilter;
};

export type MapsGetAllSubmissionFilter = Array<
  | MapStatus.PUBLIC_TESTING
  | MapStatus.PRIVATE_TESTING
  | MapStatus.CONTENT_APPROVAL
  | MapStatus.FINAL_APPROVAL
>;

export type MapsGetAllSubmissionQuery = MapsGetAllBaseQuery & {
  expand?: MapsGetAllSubmissionExpand;
  filter?: MapsGetAllSubmissionFilter;
  hasApprovingReview?: boolean;
};

export type MapsGetAllUserSubmissionFilter = Array<
  | MapStatus.PUBLIC_TESTING
  | MapStatus.PRIVATE_TESTING
  | MapStatus.CONTENT_APPROVAL
  | MapStatus.FINAL_APPROVAL
  | MapStatus.APPROVED
>;

export type MapsGetAllUserSubmissionQuery = Omit<
  MapsGetAllBaseQuery,
  'submitterID'
> & {
  expand?: MapsGetAllSubmissionExpand; // Re-use from submission.
  filter?: MapsGetAllUserSubmissionFilter;
};

export type MapsGetExpand = Array<
  | MapsGetAllSubmissionExpand[number]
  | 'submission'
  | 'testInvites'
  | 'reviewStats'
>;

export type MapsGetQuery = { expand?: MapsGetExpand };

export interface CreateMapWithFiles {
  vmfs: File[];
  data: CreateMap;
}

export interface CreateMap extends Pick<MMap, 'name'> {
  submissionType: MapSubmissionType;
  suggestions: MapSubmissionSuggestion[];
  wantsPrivateTesting: boolean;
  placeholders: MapSubmissionPlaceholder[];
  testInvites?: number[];
  info: CreateMapInfo;
  zones: MapZones;
  credits: CreateMapCredit[];
  portingChangelog?: string;
}

export interface UpdateMap
  extends Partial<
    Pick<
      CreateMap,
      | 'name'
      | 'suggestions'
      | 'placeholders'
      | 'testInvites'
      | 'credits'
      | 'submissionType'
    >
  > {
  status?: MapStatus;
  info?: UpdateMapInfo;
  portingChangelog?: string;
  resetLeaderboards?: boolean;
  submitterID?: number;
  finalLeaderboards?: MapSubmissionApproval[];
  leaderboards?: MapSubmissionSuggestion[];
}

//#endregion
//#region Map Info

export type CreateMapInfo = Pick<
  MapInfo,
  'description' | 'youtubeID' | 'creationDate' | 'requiredGames'
>;

export type UpdateMapInfo = Partial<
  Pick<
    CreateMapInfo,
    'description' | 'youtubeID' | 'creationDate' | 'requiredGames'
  >
>;

//#endregion
//#region Credits

export type MapCreditsGetExpand = 'user';

export type MapCreditsGetQuery = { expand?: MapCreditsGetExpand };

export type CreateMapCredit = Pick<
  MapCredit,
  'userID' | 'type' | 'description'
>;

//#endregion
//#region Images

export interface UpdateMapImages {
  imageIDs: string[];
}

export interface UpdateMapImagesWithFiles {
  images: File[];
  data: UpdateMapImages;
}

//#endregion
//#region Notifications

export type UpdateMapNotify = Pick<MapNotify, 'notifyOn'>;

//#endregion
//#region Runs

export type MapRunsGetExpand = 'splits';
export type MapRunsGetFilter = 'around' | 'friends';

export type MapLeaderboardGetQuery = PagedQuery & {
  gamemode: Gamemode;
  trackType?: TrackType; // Default 0
  trackNum?: number; // Default 1
  style?: Style; // Default 0
  expand?: MapRunsGetExpand;
  filter?: MapRunsGetFilter;
  userIDs?: number[];
  steamIDs?: string[];
  orderByDate?: boolean;
};

export type MapLeaderboardGetRunQuery = PagedQuery & {
  gamemode: Gamemode;
  trackType?: TrackType; // Default 0
  trackNum?: number; // Default 1
  style?: Style; // Default 0
  expand?: MapRunsGetExpand;
  userID?: number;
  rank?: number;
};

//#endregion
//#region Submissions

export interface CreateMapVersion
  extends Pick<MapVersion, 'changelog' | 'zones'> {
  resetLeaderboards?: boolean;
  hasBSP: boolean;
}

export interface CreateMapVersionWithFiles {
  vmfs: File[];
  data: CreateMapVersion;
}

//#endregion
//#region Reviews

export type MapReviewsGetExpand = ('map' | 'reviewer' | 'resolver')[];

export type MapReviewsGetQuery = PagedQuery & {
  official?: boolean;
  expand?: MapReviewsGetExpand;
  comments?: number;
};

export type MapReviewGetIdQuery = {
  expand?: string[];
};

type PickMapReview = Pick<MapReview, 'mainText'> &
  Partial<Pick<MapReview, 'suggestions'>>;

export interface CreateMapReview extends PickMapReview {
  needsResolving?: boolean;
  approves?: boolean;
}

export interface CreateMapReviewWithFiles {
  images?: File[];
  data: CreateMapReview;
}

export interface UpdateMapReview extends Partial<CreateMapReview> {
  resolved?: boolean | null;
}

export type AdminUpdateMapReview = Pick<UpdateMapReview, 'resolved'>;

export type CreateMapReviewComment = Pick<MapReviewComment, 'text'>;
export type UpdateMapReviewComment = CreateMapReviewComment;

//#endregion
//#region Test Invites

export interface CreateMapTestInvite {
  userIDs: number[];
}

export interface UpdateMapTestInvite {
  accept: boolean;
}

//#endregion
