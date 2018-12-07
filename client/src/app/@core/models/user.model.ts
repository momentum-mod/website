import {UserProfile} from './profile.model';
import {UserStats} from './user-stats.model';

export interface User {
  id: string;
  permissions: number;
  country: string;
  createdAt?: string;
  updatedAt?: string;
  profile?: UserProfile;
  stats?: UserStats;
}
