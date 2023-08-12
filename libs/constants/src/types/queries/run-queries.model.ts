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

export type RunsGetQuery = {
  expand?: string[];
};
