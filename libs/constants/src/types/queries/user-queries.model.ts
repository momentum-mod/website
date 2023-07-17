import { ActivitiesGetQuery } from './activity-queries.model';
import { PagedQuery } from './pagination.model';

export type UsersGetQuery = {
  expand?: string[];
  mapRank?: number;
};

export type UsersGetAllQuery = PagedQuery & {
  expand?: string[];
  search?: string;
  steamID?: string;
  steamIDs?: string[];
  mapRank?: number;
};

export type UsersGetActivitiesQuery = Omit<ActivitiesGetQuery, 'userID'>;

export type UsersGetCreditsQuery = PagedQuery & { expand?: string[] };

type UserMapsBaseGetQuery = PagedQuery & { search?: string };

export type UserMapLibraryGetQuery = UserMapsBaseGetQuery & {
  expand?: string[];
};

export type UserMapFavoritesGetQuery = UserMapsBaseGetQuery & {
  expand?: string[];
};

export type UserMapSubmittedGetQuery = UserMapsBaseGetQuery & {
  expand?: string[];
};
