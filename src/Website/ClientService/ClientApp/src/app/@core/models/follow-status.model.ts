import {UserFollowObject} from './follow.model';

export interface FollowStatus {
  local?: UserFollowObject; // The relationship the local user has to the target, if it exists
  target?: UserFollowObject; // The relationship the target has to the local user, if it exists
}
