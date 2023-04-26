import { MomentumMap } from './momentum-map.model';

export interface GlobalMapStats {
  totalCompletedMaps: number;
  totalMaps: number;
  topSubscribedMap: MomentumMap;
  topPlayedMap: MomentumMap;
  topDownloadedMap: MomentumMap;
  topUniquelyCompletedMap: MomentumMap;
}
