import { MapStatus, MapType } from '@momentum/constants';
import { PagedQuery } from './pagination.model';
import { Query } from './query.interface';

interface MapsGetAllBaseQuery extends Query {
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

export interface MapsGetQuery extends Query {
  expand: string[];
}

export interface MapCreditsGetQuery extends Query {
  expand: string[];
}

export interface MapRanksGetQuery extends PagedQuery {
  playerID: number;
  playerIDs: number[];
  flags: number;
  orderByDate: boolean;
}

export interface MapRankGetNumberQuery extends Query {
  trackNum: number;
  zoneNum: number;
  flags: number;
}
