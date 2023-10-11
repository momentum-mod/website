import { MapZones } from '@momentum/constants';

export const ZoneUtil = {
  isLinearMainTrack: function (zoneData: MapZones): boolean {
    return zoneData.tracks.main.zones.segments.length === 1;
  }
};
