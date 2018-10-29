export interface UserFollowObject {
  followeeID: string; // The ID of the user following the followed
  followedID: string; // The ID of the user being followed by followee
  notify: boolean; // Whether the followee is notified of things from the followed
  createdAt: Date; // Date at which followee started following followed
}
