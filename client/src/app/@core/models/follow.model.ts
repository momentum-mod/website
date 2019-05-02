import {User} from './user.model';

export interface UserFollowObject {
  followeeID: string; // The ID of the user following the followed
  followedID: string; // The ID of the user being followed by followee
  notifyOn: number; // What the followee is notified of from the followed
  createdAt?: string; // Date at which followee started following followed
  updatedAt?: string;
  followee?: User; // The followee, as a User object
  followed?: User; // The user being followed, as a User object
}
