import {UserProfile} from './profile.model';
import {UserStats} from './user-stats.model';

export interface User {
  id: string;
  roles: number;
  bans: number;
  alias: string;
  avatarURL: string;
  country: string;
  createdAt?: string;
  updatedAt?: string;
  profile?: UserProfile;
  stats?: UserStats;
}
