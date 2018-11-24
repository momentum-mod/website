export interface UserStats {
  id: number;
  userID?: string;
  totalJumps: number;
  totalStrafes: number;
  rankXP: number;
  cosXP: number;
  mapsCompleted: number;
  createdAt?: Date;
  updatedAt?: Date;
}
