import { User as PrismaUser } from '@prisma/client';
import { Profile } from './profile.model';
import { UserStats } from './user-stats.model';
import { Rank } from '../run/rank.model';
import { Socials } from './socials.model';
import { Bitfield } from '../../utils';
import { Role } from '../../../enums/role.enum';
import { Ban } from '../../../enums/bans.enum';

export interface User extends Omit<PrismaUser, 'avatar'> {
  roles: Bitfield<Role>;
  bans: Bitfield<Ban>;
  avatarURL: string;
  profile?: Profile;
  userStats?: UserStats;
  mapRank?: Rank;
}

export type CreateUser = Pick<User, 'alias'>;

export interface UpdateUser {
  alias?: string;
  bio?: string;
  socials?: Socials;
}

export interface AdminUpdateUser extends UpdateUser {
  roles?: Bitfield<Role>;
  bans?: Bitfield<Ban>;
}

export interface MergeUser {
  placeholderID: number;
  userID: number;
}
