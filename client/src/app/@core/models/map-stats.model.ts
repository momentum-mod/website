export interface MapStats {
  id: number;
  mapID?: number;
  totalReviews: number;
  totalDownloads: number;
  totalSubscriptions: number;
  totalFavorites: number;
  totalPlays: number;
  totalCompletions: number;
  totalUniqueCompletions: number;
  totalTimePlayed: number;
  totalJumps: number;
  totalStrafes: number;
  createdAt?: Date;
  updatedAt?: Date;
}
