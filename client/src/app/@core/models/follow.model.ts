export interface UserFollowObject {
  followeeID: string; // The ID of the user following the followed
  followedID: string; // The ID of the user being followed by followee
  notifyOn: number; // What the followee is notified of from the followed
  createdAt?: Date; // Date at which followee started following followed
  updatedAt?: Date;
}
