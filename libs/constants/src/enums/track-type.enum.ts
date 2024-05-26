import { MapZones } from '../types/models';

export enum TrackType {
  MAIN = 0,
  STAGE = 1,
  BONUS = 2
}

export const TrackTypeName: ReadonlyMap<TrackType, string> = new Map([
  [TrackType.MAIN, 'Main'],
  //[TrackType.STAGE, 'Stage'],
  [TrackType.BONUS, 'Bonus']
]);

export const TrackTypeKey: ReadonlyMap<TrackType, keyof MapZones['tracks']> =
  new Map([
    [TrackType.MAIN, 'main'],
    //[TrackType.STAGE, 'stages'],
    [TrackType.BONUS, 'bonuses']
  ]);
