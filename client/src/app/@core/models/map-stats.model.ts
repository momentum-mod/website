import {BaseStats} from './base-stats.model';

export interface MapStats {
  id?: number;
  mapID?: number;
  totalReviews?: number;
  totalDownloads?: number;
  totalSubscriptions?: number;
  totalFavorites?: number;
  totalPlays?: number;
  totalCompletions?: number;
  totalUniqueCompletions?: number;
  totalTimePlayed?: number;
  baseStats?: BaseStats;
  createdAt?: Date;
  updatedAt?: Date;
}
