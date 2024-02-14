import { Gamemode } from '../../enums/gamemode.enum';
import { MapStatusNew } from '../../enums/map-status.enum';
import { TrackType } from '../../enums/track-type.enum';
import { Style } from '../../enums/style.enum';
import { PagedQuery } from './pagination.model';

//#region Get All

type BaseMapsGetAllExpand =
  | 'zones'
  | 'leaderboards'
  | 'info'
  | 'stats'
  | 'submitter'
  | 'credits';

export type MapsGetAllExpand = (
  | BaseMapsGetAllExpand
  | 'inFavorites'
  | 'inLibrary'
  | 'personalBest'
  | 'worldRecord'
)[];

export type MapsGetAllSubmissionExpand = (
  | BaseMapsGetAllExpand
  | 'inFavorites'
  | 'inLibrary'
  | 'personalBest'
  | 'worldRecord'
  | 'currentVersion'
  | 'versions'
  | 'reviews'
)[];

export type MapsGetAllAdminExpand = BaseMapsGetAllExpand[];

export type MapsGetAllSubmissionAdminExpand = BaseMapsGetAllExpand[];

type MapsGetAllBaseQuery = {
  skip?: number;
  take?: number;
  search?: string;
  fileName?: string;
  submitterID?: number;
};

export type MapsGetAllQuery = MapsGetAllBaseQuery & {
  expand?: MapsGetAllExpand;
  gamemode?: Gamemode;
  difficultyLow?: number;
  difficultyHigh?: number;
  linear?: boolean;
};

export type MapsGetAllAdminFilter = MapStatusNew[];

export type MapsGetAllAdminQuery = MapsGetAllBaseQuery & {
  expand?: MapsGetAllAdminExpand;
  filter?: MapsGetAllAdminFilter;
  priority?: boolean;
};

export type MapsGetAllSubmissionFilter = (
  | MapStatusNew.PUBLIC_TESTING
  | MapStatusNew.PRIVATE_TESTING
)[];

export type MapsGetAllSubmissionQuery = MapsGetAllBaseQuery & {
  expand?: MapsGetAllSubmissionExpand;
  filter?: MapsGetAllSubmissionFilter;
};

export type MapsGetAllUserSubmissionQuery = Omit<
  MapsGetAllSubmissionQuery,
  'submitterID'
>;

export type MapsGetAllSubmissionAdminFilter = (
  | MapStatusNew.PUBLIC_TESTING
  | MapStatusNew.PRIVATE_TESTING
  | MapStatusNew.CONTENT_APPROVAL
  | MapStatusNew.FINAL_APPROVAL
)[];

export type MapsGetAllSubmissionAdminQuery = MapsGetAllBaseQuery & {
  expand?: MapsGetAllSubmissionAdminExpand;
  filter?: MapsGetAllSubmissionAdminFilter;
};

//#endregion
//#region Get

export type MapsGetExpand = (MapsGetAllSubmissionExpand[0] | 'submission')[];

export type MapsGetQuery = {
  expand?: MapsGetExpand;
  byName?: boolean;
};

//#endregion
//#region Credits

export type MapCreditsGetExpand = 'user';

export type MapCreditsGetQuery = {
  expand?: MapCreditsGetExpand;
};

//#endregion
//#region Runs

export type MapRunsGetExpand = 'stats';
export type MapRunsGetFilter = 'around' | 'friends';

export type MapLeaderboardGetQuery = PagedQuery & {
  gamemode: Gamemode;
  trackType?: TrackType; // Default 0
  trackNum?: number; // Default 0
  style?: Style; // Default 0
  expand?: MapRunsGetExpand;
  filter?: MapRunsGetFilter;
  filterUserIDs?: number[];
  orderByDate?: boolean;
};

export type MapLeaderboardGetRunQuery = PagedQuery & {
  gamemode: Gamemode;
  trackType?: TrackType; // Default 0
  trackNum?: number; // Default 0
  style?: Style; // Default 0
  expand?: MapRunsGetExpand;
  userID?: number;
  rank?: number;
};

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

//#endregion
