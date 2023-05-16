import { MapStatus, MapType } from '@momentum/constants';
import { PaginationQuery } from './pagination.model';

interface MapsGetAllBaseQuery {
  skip: number;
  take: number;
  search: string;
  submitterID: number;
}

export interface AdminCtlMapsGetAllQuery extends MapsGetAllBaseQuery {
  expand: string[];
  status: MapStatus;
  priority: boolean;
}

export interface MapsCtlGetAllQuery extends MapsGetAllBaseQuery {
  expand: string[];
  type: MapType;
  difficultyLow: number;
  difficultyHigh: number;
  isLinear: boolean;
}

export interface MapsGetQuery {
  expand: string[];
}

export interface MapCreditsGetQuery {
  expand: string[];
}

export interface MapRanksGetQuery extends PaginationQuery {
  playerID: number;
  playerIDs: number[];
  flags: number;
  orderByDate: boolean;
}

export interface MapRankGetNumberQuery {
  trackNum: number;
  zoneNum: number;
  flags: number;
}
