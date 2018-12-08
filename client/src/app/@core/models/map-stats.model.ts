import {MapZoneStats} from './map-zone-stats.model';

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
  zoneStats: MapZoneStats[];
  createdAt?: Date;
  updatedAt?: Date;
}
