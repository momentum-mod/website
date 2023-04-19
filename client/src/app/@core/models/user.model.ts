import { UserProfile } from './profile.model';
import { UserStats } from './user-stats.model';

export interface User {
  id: number;
  steamID: string;
  roles: number;
  bans: number;
  alias: string;
  aliasLocked: boolean;
  avatarURL: string;
  country: string;
  createdAt?: string;
  updatedAt?: string;
  profile?: UserProfile;
  stats?: UserStats;
}
