import { User as PrismaUser } from '@prisma/client';
import { BitwiseEnum } from '../../bitwise-enum.interface';
import { Ban } from '../../../enums/bans.enum';
import { Role } from '../../../enums/role.enum';
import { Profile } from './profile.model';
import { UserStats } from './user-stats.model';
import { Rank } from '../run/rank.model';
import { Socials } from './socials.model';

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
  socials?: Socials;
}

export interface AdminUpdateUser extends UpdateUser {
  roles?: BitwiseEnum<Role>;
  bans?: BitwiseEnum<Ban>;
}

export interface MergeUser {
  placeholderID: number;
  userID: number;
}
