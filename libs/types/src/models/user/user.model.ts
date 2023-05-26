import { Ban, Role } from '@momentum/constants';
import { Profile, Rank, UserStats } from '@momentum/types';
import { User as PrismaUser } from '@prisma/client';
import { BitwiseEnum } from '../../bitwise-enum.interface';

export interface User extends Omit<PrismaUser, 'avatar'> {
  roles: BitwiseEnum<Role>;
  bans: BitwiseEnum<Ban>;
  avatarURL: string;
  profile?: Profile;
  userStats?: UserStats;
  mapRank?: Rank;
}

export interface CreateUser extends Pick<User, 'alias'> {}

export interface UpdateUser {
  alias?: string;
  bio?: string;
}

export interface AdminUpdateUser extends UpdateUser {
  roles?: BitwiseEnum<Role>;
  bans?: BitwiseEnum<Ban>;
}

export interface MergeUser {
  placeholderID: number;
  userID: number;
}
