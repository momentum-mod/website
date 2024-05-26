import {
  MapZones,
  Region,
  Segment,
  MapTracks,
  Zone
} from '@momentum/constants';
import { arrayFrom } from '@momentum/util-fn';

export const ZoneUtil = {
  isLinearMainTrack: function (zoneData: MapZones): boolean {
    return zoneData.tracks.main.zones.segments.length === 1;
  },

  /**
   * Generate a MapZones object with regions placed randomly on the z=0 plane.
   */
  generateRandomMapZones: function (
    majorCheckpoints: number,
    minorCheckpoints: number[],
    numBonuses: number,
    mapWidth: number,
    zoneWidth: number,
    height: number
  ): MapZones {
    if (majorCheckpoints !== minorCheckpoints.length)
      throw new Error('Fuck you');

    const safeWidth = mapWidth - zoneWidth;
    const randomBoundedPos = () =>
      Math.floor(Math.random() * safeWidth * 2 - safeWidth);

    const randomRegion = (isMajor = true): Region => {
      const x = randomBoundedPos();
      const y = randomBoundedPos();

      return {
        bottom: 0,
        height,
        safeHeight: 0,
        points: [
          [x, y],
          [x + zoneWidth, y],
          [x + zoneWidth, y + zoneWidth],
          [x, y + zoneWidth]
        ],
        ...(isMajor
          ? {
              teleDestYaw: 0,
              teleDestPos: [x + zoneWidth / 2, y + zoneWidth / 2, 0]
            }
          : {})
      };
    };

    const randomZone = (isMajor = false): Zone => {
      return { regions: [randomRegion(isMajor)] };
    };

    const doSegment = (numCPs: number): Segment => ({
      limitStartGroundSpeed: false,
      checkpointsRequired: true,
      checkpointsOrdered: true,
      checkpoints: arrayFrom(numCPs, (i) => randomZone(i === 0)),
      cancel: []
    });

    const tracks: MapTracks = {
      main: {
        stagesEndAtStageStarts: true,
        zones: {
          end: randomZone(),
          segments: arrayFrom(majorCheckpoints, (i) =>
            doSegment(minorCheckpoints[i])
          )
        }
      },
      bonuses: arrayFrom(numBonuses, () => ({
        zones: {
          end: randomZone(),
          segments: [doSegment(Math.ceil(Math.random() * 4))]
        }
      }))
    };

    // if (tracks.main.zones.segments.length > 1)
    //   for (const [i, segment] of tracks.main.zones.segments.entries())
    //     tracks.stages.push({
    //       name: `Stage ${i + 1}`,
    //       zones: {
    //         segments: [
    //           {
    //             limitStartGroundSpeed: segment.limitStartGroundSpeed,
    //             checkpoints: segment.checkpoints
    //           }
    //         ],
    //         end:
    //           tracks.main.zones.segments[i + 1]?.checkpoints[0] ??
    //           tracks.main.zones.end
    //       }
    //     });

    return { tracks, formatVersion: 1, dataTimestamp: Date.now() };
  }
};
