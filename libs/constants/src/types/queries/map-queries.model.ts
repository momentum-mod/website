import { Gamemode } from '../../enums/gamemode.enum';
import { MapStatus } from '../../enums/map-status.enum';
import { TrackType } from '../../enums/track-type.enum';
import { Style } from '../../enums/style.enum';
import { PagedQuery } from './pagination.model';
import { MapSubmissionType } from '../../enums/map-submission-type.enum';
import {
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
} from '../../';

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
  | BaseMapsGetAllExpand
  | 'inFavorites'
  | 'personalBest'
  | 'worldRecord'
  | 'reviews'
>;

type MapsGetAllBaseQuery = {
  skip?: number;
  take?: number;
  search?: string;
  searchStartsWith?: string;
  submitterID?: number;
};

export type MapsGetAllQuery = MapsGetAllBaseQuery & {
  expand?: MapsGetAllExpand;
  gamemode?: Gamemode;
  difficultyLow?: number;
  difficultyHigh?: number;
  linear?: boolean;
  favorite?: boolean;
  PB?: boolean;
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
};

export type MapsGetAllUserSubmissionQuery = Omit<
  MapsGetAllSubmissionQuery,
  'submitterID'
>;

export type MapsGetExpand = Array<
  MapsGetAllSubmissionExpand[number] | 'submission' | 'testInvites'
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
  status?: MapStatus.CONTENT_APPROVAL | MapStatus.FINAL_APPROVAL;
  info?: UpdateMapInfo;
  zones?: MapZones;
  resetLeaderboards?: boolean;
}

export interface UpdateMapAdmin extends Omit<UpdateMap, 'status'> {
  status?: MapStatus;
  finalLeaderboards?: MapSubmissionApproval[];
}

//#endregion
//#region Map Info

export type CreateMapInfo = Pick<
  MapInfo,
  'description' | 'youtubeID' | 'creationDate'
>;

export type UpdateMapInfo = Partial<
  Pick<CreateMapInfo, 'description' | 'youtubeID' | 'creationDate'>
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
