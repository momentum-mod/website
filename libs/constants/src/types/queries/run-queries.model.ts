import { PagedQuery } from './pagination.model';

export type RunsGetAllExpand = (
  | 'overallStats'
  | 'map'
  | 'mapWithInfo'
  | 'rank'
  | 'zoneStats'
)[];

export type RunsGetAllQuery = PagedQuery & {
  expand?: RunsGetAllExpand;
  mapID?: number;
  mapName?: string;
  userID?: number;
  userIDs?: number[];
  isPB?: boolean;
  flags?: number;
  order?: string;
};

export type RunsGetExpand = RunsGetAllExpand;

export type RunsGetQuery = {
  expand?: RunsGetExpand;
};
