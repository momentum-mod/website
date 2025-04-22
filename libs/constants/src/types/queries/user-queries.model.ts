import { ActivitiesGetQuery } from './activity-queries.model';
import { PagedQuery } from './pagination.model';
import { Role, Ban, Flags, User, Socials, Follow } from '../../';

export type CreateUser = Pick<User, 'alias'>;

export interface UpdateUser {
  alias?: string;
  bio?: string;
  socials?: Socials;
  resetAvatar?: boolean;
}

export interface AdminUpdateUser extends UpdateUser {
  roles?: Flags<Role>;
  bans?: Flags<Ban>;
}

export interface MergeUser {
  placeholderID: number;
  userID: number;
}

export type UsersGetExpand = Array<'profile' | 'userStats'>;

export type UsersGetQuery = {
  expand?: UsersGetExpand;
};

export type UsersGetAllExpand = UsersGetExpand;

export type UsersGetAllQuery = PagedQuery & {
  expand?: UsersGetAllExpand;
  search?: string;
  steamID?: string;
  steamIDs?: string[];
  userIDs?: number[];
};

export type UsersGetActivitiesQuery = Omit<ActivitiesGetQuery, 'userID'>;

export type UpdateFollowStatus = Pick<Follow, 'notifyOn'>;

export type UsersGetCreditsExpand = Array<'map' | 'info'>;

export type UsersGetCreditsQuery = PagedQuery & {
  expand?: UsersGetCreditsExpand;
};

type UserMapsBaseGetQuery = PagedQuery & { search?: string };

export type UserMapFavoritesGetExpand = Array<
  'info' | 'credits' | 'submitter' | 'personalBest'
>;

export type UserMapFavoritesGetQuery = UserMapsBaseGetQuery & {
  expand?: UserMapFavoritesGetExpand;
};
