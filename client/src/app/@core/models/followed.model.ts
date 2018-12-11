import {UserFollowObject} from './follow.model';

export interface Followed {
  count?: number;
  followed: UserFollowObject[];
}
