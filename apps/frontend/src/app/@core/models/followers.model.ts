import { UserFollowObject } from './follow.model';

export interface Followers {
  count?: number;
  followers: UserFollowObject[];
}
