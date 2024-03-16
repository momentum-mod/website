﻿import { ActivitiesGetQuery } from './activity-queries.model';
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
  userIDs?: number[];
  mapRank?: number;
};

export type UsersGetActivitiesQuery = Omit<ActivitiesGetQuery, 'userID'>;

export type UsersGetCreditsExpand = ('map' | 'info')[];

export type UsersGetCreditsQuery = PagedQuery & {
  expand?: UsersGetCreditsExpand;
};

type UserMapsBaseGetQuery = PagedQuery & { search?: string };

export type UserMapLibraryGetExpand = ('submitter' | 'inFavorites')[];

export type UserMapLibraryGetQuery = UserMapsBaseGetQuery & {
  expand?: UserMapLibraryGetExpand;
};

export type UserMapFavoritesGetExpand = (
  | 'info'
  | 'credits'
  | 'submitter'
  | 'inLibrary'
  | 'personalBest'
)[];

export type UserMapFavoritesGetQuery = UserMapsBaseGetQuery & {
  expand?: UserMapFavoritesGetExpand;
};
