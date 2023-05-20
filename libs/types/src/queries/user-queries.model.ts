import { ActivitiesGetQuery } from './activity-queries.model';
import { PagedQuery } from './pagination.model';
import { Query } from './query.interface';

export interface UsersGetQuery extends Query {
  expand: string[];
  mapRank: number;
}

export interface UsersGetAllQuery extends PagedQuery {
  expand: string[];
  search: string;
  steamID: string;
  steamIDs: string[];
  mapRank: number;
}

export interface UsersGetActivitiesQuery
  extends Omit<ActivitiesGetQuery, 'userID'> {}

interface UserMapsBaseGetQuery extends PagedQuery {
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
