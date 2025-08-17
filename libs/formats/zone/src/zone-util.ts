import {
  MapZones,
  Region,
  Segment,
  MapTracks,
  Zone
} from '@momentum/constants';
import { arrayFrom } from '@momentum/util-fn';

export function isLinearMainTrack(zoneData: MapZones): boolean {
  if (!zoneData.tracks.main) return false;

  return zoneData.tracks.main.zones.segments.length === 1;
}

/**
 * Generate a MapZones object with regions placed randomly on the z=0 plane.
 */
export function generateRandomMapZones(
  mainSegments: number,
  mainCheckpoints: number[],
  bonusCheckpoints: number[],
  mapWidth: number,
  zoneWidth: number,
  height: number
): MapZones {
  if (mainSegments !== mainCheckpoints.length)
    throw new Error('segments must equal number of checkpoints');

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
        segments: arrayFrom(mainSegments, (i) => doSegment(mainCheckpoints[i]))
      }
    },
    bonuses: bonusCheckpoints.map((numSegments) => ({
      zones: {
        end: randomZone(),
        segments: [doSegment(numSegments)]
      }
    }))
  };

  return { tracks, formatVersion: 1, dataTimestamp: Date.now() };
}
