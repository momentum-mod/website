export interface UserStats {
  id: number;
  userID?: string;
  totalJumps: number;
  totalStrafes: number;
  level: number;
  cosXP: number;
  mapsCompleted: number;
  runsSubmitted: number;
  createdAt?: Date;
  updatedAt?: Date;
}
