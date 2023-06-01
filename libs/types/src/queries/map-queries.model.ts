import { MapStatus, MapType } from '@momentum/constants';
import { PagedQuery } from './pagination.model';

type MapsGetAllBaseQuery = {
  skip?: number;
  take?: number;
  search?: string;
  submitterID?: number;
};

export type AdminMapsGetAllQuery = MapsGetAllBaseQuery & {
  expand?: string[];
  status?: MapStatus;
  priority?: boolean;
};

export type MapsGetAllQuery = MapsGetAllBaseQuery & {
  expand?: string[];
  type?: MapType;
  difficultyLow?: number;
  difficultyHigh?: number;
  isLinear?: boolean;
};

export type MapsGetQuery = {
  expand?: string[];
};

export type MapCreditsGetQuery = {
  expand?: string[];
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
