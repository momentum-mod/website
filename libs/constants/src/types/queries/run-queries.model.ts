import { PagedQuery } from './pagination.model';

export type RunsGetAllQuery = PagedQuery & {
  expand?: string[];
  mapID?: number;
  mapName?: string;
  userID?: number;
  userIDs?: number[];
  isPB?: boolean;
  flags?: number;
  order?: string;
};

export type MapsCtlRunsGetAllQuery = Omit<RunsGetAllQuery, 'mapID' | 'mapName'>;

export type UserCtlRunsGetAllQuery = Pick<
  RunsGetAllQuery,
  'userID' | 'skip' | 'take'
>;

export type RunsGetQuery = {
  expand?: string[];
};
