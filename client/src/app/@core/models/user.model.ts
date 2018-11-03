import {UserProfile} from './profile.model';

export interface User {
  id: string;
  permissions: number;
  createdAt?: string;
  updatedAt?: string;
  profile?: UserProfile;
}
