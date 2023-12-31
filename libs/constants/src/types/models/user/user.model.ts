import { User as PrismaUser } from '@prisma/client';
import { Bitfield } from '../../utils';
import { Role } from '../../../enums/role.enum';
import { Ban } from '../../../enums/bans.enum';
import { Profile } from './profile.model';
import { UserStats } from './user-stats.model';
import { Socials } from './socials.model';

export interface User extends Omit<PrismaUser, 'avatar'> {
  roles: Bitfield<Role>;
  bans: Bitfield<Ban>;
  avatarURL: string;
  profile?: Profile;
  userStats?: UserStats;
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
