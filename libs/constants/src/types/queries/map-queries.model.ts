import { Gamemode } from '../../enums/gamemode.enum';
import { MapStatus } from '../../enums/map-status.enum';
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

export type MapsGetAllExpand = Array<
  | BaseMapsGetAllExpand
  | 'inFavorites'
  | 'inLibrary'
  | 'personalBest'
  | 'worldRecord'
>;

export type MapsGetAllSubmissionExpand = Array<
  | BaseMapsGetAllExpand
  | 'inFavorites'
  | 'inLibrary'
  | 'personalBest'
  | 'worldRecord'
  | 'currentVersion'
  | 'versions'
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
  MapStatus.PUBLIC_TESTING | MapStatus.PRIVATE_TESTING
>;

export type MapsGetAllSubmissionQuery = MapsGetAllBaseQuery & {
  expand?: MapsGetAllSubmissionExpand;
  filter?: MapsGetAllSubmissionFilter;
};

export type MapsGetAllUserSubmissionQuery = Omit<
  MapsGetAllSubmissionQuery,
  'submitterID'
>;

export type MapsGetAllSubmissionAdminFilter = Array<
  | MapStatus.PUBLIC_TESTING
  | MapStatus.PRIVATE_TESTING
  | MapStatus.CONTENT_APPROVAL
  | MapStatus.FINAL_APPROVAL
>;

//#endregion
//#region Get

export type MapsGetExpand = Array<
  MapsGetAllSubmissionExpand[number] | 'submission' | 'testInvites'
>;

export type MapsGetQuery = { expand?: MapsGetExpand };

//#endregion
//#region Credits

export type MapCreditsGetExpand = 'user';

export type MapCreditsGetQuery = { expand?: MapCreditsGetExpand };

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
