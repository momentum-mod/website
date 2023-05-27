import { PagedQuery } from './pagination.model';

export interface RunsGetAllQuery extends PagedQuery {
  expand?: string[];
  mapID?: number;
  mapName?: string;
  userID?: number;
  userIDs?: number[];
  isPB?: boolean;
  flags?: number;
  order?: string;
}

export interface MapsCtlRunsGetAllQuery
  extends Omit<RunsGetAllQuery, 'mapID' | 'mapName'> {}

export interface UserCtlRunsGetAllQuery
  extends Pick<RunsGetAllQuery, 'userID' | 'skip' | 'take'> {}

export interface RunsGetQuery {
  expand?: string[];
}
