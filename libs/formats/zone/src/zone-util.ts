import {
  MapZones,
  Region,
  Segment,
  Tracks,
  Volume,
  Zone
} from '@momentum/constants';
import { from } from '@momentum/util-fn';

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
              teleportYaw: 0,
              teleportPos: [x + zoneWidth / 2, y + zoneWidth / 2, 0]
            }
          : {})
      };
    };

    const randomVolume = (isMajor?: boolean): Volume => ({
      regions: [randomRegion(isMajor)]
    });

    const randomZone = (isMajor = false): Zone => {
      volumes.push(randomVolume(isMajor));
      return { volumeIndex: volumes.length - 1 };
    };

    const doSegment = (numCPs: number): Segment => ({
      limitStartGroundSpeed: false,
      checkpoints: from(numCPs, (_, i) => randomZone(i === 0))
    });

    const volumes: Volume[] = [];
    const tracks: Tracks = {
      main: {
        majorOrdered: true,
        minorRequired: true,
        zones: {
          end: randomZone(),
          segments: from(majorCheckpoints, (_, i) =>
            doSegment(minorCheckpoints[i])
          )
        }
      },
      bonuses: from(numBonuses, () => ({
        zones: {
          end: randomZone(),
          segments: [doSegment(Math.ceil(Math.random() * 4))]
        }
      })),
      stages: []
    };

    if (tracks.main.zones.segments.length > 1)
      for (const [i, segment] of tracks.main.zones.segments.entries())
        tracks.stages.push({
          name: `Stage ${i + 1}`,
          zones: {
            segments: [
              {
                limitStartGroundSpeed: segment.limitStartGroundSpeed,
                checkpoints: segment.checkpoints
              }
            ],
            end:
              tracks.main.zones.segments[i + 1]?.checkpoints[0] ??
              tracks.main.zones.end
          }
        });

    return { tracks, volumes, formatVersion: 1, dataTimestamp: Date.now() };
  }
};
