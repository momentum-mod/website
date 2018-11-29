export interface UserStats {
  id: number;
  userID?: string;
  totalJumps: number;
  totalStrafes: number;
  rankXP: number;
  cosXP: number;
  mapsCompleted: number;
  runsSubmitted: number;
  createdAt?: Date;
  updatedAt?: Date;
}
