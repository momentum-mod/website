import {RunZoneStats} from './run-zone-stats.model';

export interface RunStats {
  id: number;
  runID: number;
  zoneStats: RunZoneStats[];
  createdAt?: Date;
  updatedAt?: Date;
}
