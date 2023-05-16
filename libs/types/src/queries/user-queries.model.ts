import { ActivitiesGetQuery } from './activity-queries.model';
import { PaginationQuery } from './pagination.model';

export interface UsersGetQuery {
  expand: string[];
  mapRank: number;
}

export interface UsersGetAllQuery extends PaginationQuery {
  expand: string[];
  search: string;
  steamID: bigint;
  steamIDs: bigint[];
  mapRank: number;
}

export interface UsersGetActivitiesQuery
  extends Omit<ActivitiesGetQuery, 'userID'> {}

interface UserMapsBaseGetQuery extends PaginationQuery {
  search: string;
}

export interface UserMapLibraryGetQuery extends UserMapsBaseGetQuery {
  expand: string[];
}

export interface UserMapFavoritesGetQuery extends UserMapsBaseGetQuery {
  expand: string[];
}

export interface UserMapSubmittedGetQuery extends UserMapsBaseGetQuery {
  expand: string[];
}
