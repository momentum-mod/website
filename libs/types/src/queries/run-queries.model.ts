export interface RunsGetAllQuery {
  skip: number;
  take: number;
  expand: string[];
  mapID: number;
  mapName: string;
  userID: number;
  userIDs: number[];
  flags: number;
  isPB: boolean;
  order: string;
}

export interface MapsCtlRunsGetAllQuery
  extends Omit<RunsGetAllQuery, 'mapID' | 'mapName'> {}

export interface UserCtlRunsGetAllQuery
  extends Pick<RunsGetAllQuery, 'userID' | 'skip' | 'take'> {}

export interface RunsGetQuery {
  expand: string[];
}
