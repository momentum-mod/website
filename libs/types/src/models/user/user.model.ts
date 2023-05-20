import {
  Bans,
  Profile,
  Rank,
  Roles,
  UpdateBans,
  UpdateRoles,
  UserStats
} from '@momentum/types';
import { User as PrismaUser } from '@prisma/client';

export interface User extends Omit<PrismaUser, 'avatar'> {
  avatarURL: string;
  profile?: Profile;
  userStats?: UserStats;
  roles?: Roles;
  bans?: Bans;
  mapRank?: Rank;
}

export interface CreateUser extends Pick<User, 'alias'> {}

export interface UpdateUser {
  alias?: string;
  bio?: string;
}

export interface AdminUpdateUser extends UpdateUser {
  roles?: UpdateRoles;
  bans?: UpdateBans;
}

export interface MergeUser {
  placeholderID: number;
  userID: number;
}
