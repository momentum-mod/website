import { ActivitiesGetQuery } from './activity-queries.model';
import { PagedQuery } from './pagination.model';

export type UsersGetExpand = ('profile' | 'userStats')[];

export type UsersGetQuery = {
  expand?: UsersGetExpand;
  mapRank?: number;
};

export type UsersGetAllExpand = UsersGetExpand;

export type UsersGetAllQuery = PagedQuery & {
  expand?: UsersGetAllExpand;
  search?: string;
  steamID?: string;
  steamIDs?: string[];
  mapRank?: number;
};

export type UsersGetActivitiesQuery = Omit<ActivitiesGetQuery, 'userID'>;

export type UsersGetCreditsExpand = ('map' | 'info' | 'thumbnail')[];

export type UsersGetCreditsQuery = PagedQuery & {
  expand?: UsersGetCreditsExpand;
};

type UserMapsBaseGetQuery = PagedQuery & { search?: string };

export type UserMapLibraryGetExpand = (
  | 'submitter'
  | 'thumbnail'
  | 'inFavorites'
)[];

export type UserMapLibraryGetQuery = UserMapsBaseGetQuery & {
  expand?: UserMapLibraryGetExpand;
};

export type UserMapFavoritesGetExpand = (
  | 'info'
  | 'credits'
  | 'thumbnail'
  | 'submitter'
  | 'inLibrary'
  | 'personalBest'
)[];

export type UserMapFavoritesGetQuery = UserMapsBaseGetQuery & {
  expand?: UserMapFavoritesGetExpand;
};

export type UserMapSubmittedGetExpand = ('info' | 'submitter' | 'credits')[];

export type UserMapSubmittedGetQuery = UserMapsBaseGetQuery & {
  expand?: UserMapSubmittedGetExpand;
};
