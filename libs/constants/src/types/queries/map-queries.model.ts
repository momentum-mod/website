import { PagedQuery } from './pagination.model';
import { Gamemode } from '../../enums/gamemode.enum';
import { MapStatusNew } from '../../enums/map-status.enum';

type MapsGetAllBaseQuery = {
  skip?: number;
  take?: number;
  search?: string;
  submitterID?: number;
};

export type AdminMapsGetAllExpand = (
  | 'submitter'
  | 'credits'
  | 'thumbnail'
  | 'stats'
  | 'images'
  | 'tracks'
  | 'info'
)[];

export type AdminMapsGetAllQuery = MapsGetAllBaseQuery & {
  expand?: AdminMapsGetAllExpand;
  status?: MapStatusNew;
  priority?: boolean;
};

export type MapsGetAllExpand = (
  | 'submitter'
  | 'credits'
  | 'thumbnail'
  | 'stats'
  | 'images'
  | 'tracks'
  | 'info'
  | 'inFavorites'
  | 'inLibrary'
  | 'personalBest'
  | 'worldRecord'
)[];

export type MapsGetAllQuery = MapsGetAllBaseQuery & {
  expand?: MapsGetAllExpand;
  type?: Gamemode;
  difficultyLow?: number;
  difficultyHigh?: number;
  isLinear?: boolean;
};

export type MapsGetExpand = MapsGetAllExpand;

export type MapsGetQuery = {
  expand?: string[];
};

export type MapCreditsGetExpand = ['user'];

export type MapCreditsGetQuery = {
  expand?: MapCreditsGetExpand;
};

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

export type MapReviewsGetExpand = ('map' | 'reviewer')[];

export type MapReviewsGetQuery = {
  official?: boolean;
  expand?: string[];
};

export type MapReviewGetIdQuery = {
  expand?: string[];
};
