import { PagedQuery } from './pagination.model';
import { Gamemode } from '../../enums/gamemode.enum';
import { MapStatusNew } from '../../enums/map-status.enum';

//#region Get All

type BaseMapsGetAllExpand =
  | 'info'
  | 'stats'
  | 'submitter'
  | 'credits'
  | 'thumbnail'
  | 'images'
  | 'tracks';

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
  submitterID?: number;
};

export type MapsGetAllQuery = MapsGetAllBaseQuery & {
  expand?: MapsGetAllExpand;
  type?: Gamemode;
  difficultyLow?: number;
  difficultyHigh?: number;
  isLinear?: boolean;
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
};

//#endregion
//#region Credits

export type MapCreditsGetExpand = ['user'];

export type MapCreditsGetQuery = {
  expand?: MapCreditsGetExpand;
};

//#endregion
//#region Ranks

export type MapRanksGetQuery = PagedQuery & {
  playerID?: number;
  playerIDs?: number[];
  flags?: number;
  orderByDate?: boolean;
};

export type MapRankGetNumberQuery = {
  trackNum?: number;
  zoneNum?: number;
  flags?: number;
};

//#endregion
//#region Reviews

export type MapReviewsGetExpand = ('map' | 'reviewer')[];

export type MapReviewsGetQuery = {
  official?: boolean;
  expand?: string[];
};

export type MapReviewGetIdQuery = {
  expand?: string[];
};

//#endregion
