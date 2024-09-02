import {
  MainTrack,
  BonusTrack,
  MapZones,
  Zone,
  TrackZones
} from '@momentum/constants';
import { Vec } from '@momentum/util-fn';

// Contents of this file largely correspond to mom_timer_defs.cpp/h
// and `mom_zone_runtime_data.cpp/h
// Some of this implementation is kept deliberately quite C++ish so easiest to
// keep both in sync.

export const CURRENT_ZONE_FORMAT_VERSION = 1;

export const MAX_COORD_FLOAT = 65536;
export const MIN_COORD_FLOAT = -MAX_COORD_FLOAT;

export const MAX_ZONE_REGION_POINTS = 64;

export const MAX_TRACK_SEGMENTS = 255;
export const MAX_STAGE_TRACKS = MAX_TRACK_SEGMENTS;
export const MAX_BONUS_TRACKS = 255;

// Includes the segment start zone
export const MAX_SEGMENT_CHECKPOINTS = 255;

// From C++:
// One segment start for max Main segments plus Main end zone plus start and end for each stage track.
// The limit could be increased from here (barring region entity overload) but this is the bare minimum to allow for MAX_TRACK_SEGMENTS.
export const MAX_ZONES_ALL_TRACKS =
  MAX_TRACK_SEGMENTS + 1 + MAX_STAGE_TRACKS * 2;

export class ZoneValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ZoneValidationError';
  }
}

type Track = MainTrack | BonusTrack | { zones: TrackZones };

/**
 * Validate a MapZones JavaScript Object
 * @throws ZoneValidationError
 */
export function validateZoneFile(input: MapZones): void {
  if (!input) throw new ZoneValidationError('Bad input data');

  const { tracks, formatVersion } = input;

  if (!tracks) throw new ZoneValidationError('Missing tracks');

  if (formatVersion !== CURRENT_ZONE_FORMAT_VERSION)
    throw new ZoneValidationError('Bad format version');

  let totalZones = 0;

  const mainSegmentCount = tracks.main.zones.segments.length;
  const stageTrackCount = mainSegmentCount > 1 ? mainSegmentCount : 0;

  // Main track
  if (mainSegmentCount === 0) {
    throw new ZoneValidationError('The Main track has no segments');
  }

  validateTrack(tracks.main, 'Main');

  // Stages
  for (let stageIndex = 0; stageIndex < stageTrackCount; stageIndex++) {
    const currSegment = tracks.main.zones.segments[stageIndex];

    const name = `Stage ${stageIndex + 1}`;
    if (stageIndex + 1 < mainSegmentCount) {
      if (tracks.main.stagesEndAtStageStarts) {
        validateTrack(
          {
            zones: {
              segments: [currSegment],
              end: tracks.main.zones.segments[stageIndex + 1].checkpoints[0]
            }
          },
          name
        );
      } else {
        if (currSegment.checkpoints.length < 2)
          // If stagesEndAtStageStarts is true, 1 checkpoint segments are fine,
          // otherwise they make no sense.
          throw new ZoneValidationError(
            `${name} does not have a checkpoint to use as a ` +
              'stage track end. Add a checkpoint or use stagesEndAtStageStarts.'
          );

        if (!currSegment.checkpointsOrdered)
          throw new ZoneValidationError(
            `Stage ${stageIndex + 1} wants to use its last checkpoint as the ` +
              'stage track end but has checkpointsOrdered == false. ' +
              'Enable at least one of checkpointsOrdered or stagesEndAtStageStarts.'
          );

        validateTrack(
          {
            zones: {
              segments: [
                {
                  ...currSegment,
                  checkpoints: currSegment.checkpoints.slice(0, -1)
                }
              ],
              end: currSegment.checkpoints.at(-1)!
            }
          },
          name
        );
      }
    } else {
      validateTrack(
        { zones: { segments: [currSegment], end: tracks.main.zones.end } },
        name
      );
    }
  }

  if ((tracks.bonuses?.length ?? 0) > MAX_BONUS_TRACKS)
    throw new ZoneValidationError('Too many bonus tracks');

  for (const [bonusIndex, bonusTrack] of tracks.bonuses?.entries() ?? []) {
    if (Boolean(bonusTrack.zones) === Boolean(bonusTrack.defragModifiers))
      throw new ZoneValidationError(
        `Bonus ${bonusIndex + 1} track must specify exactly one of zones or defragModifiers`
      );

    if (bonusTrack.zones) {
      if (bonusTrack.zones.segments.length !== 1)
        throw new ZoneValidationError(
          `Bonus ${bonusIndex + 1} track must have a single segment`
        );
    } else {
      if (mainSegmentCount > 1)
        throw new ZoneValidationError(
          `Bonus ${bonusIndex + 1} track is a Defrag modifier bonus but modifiers can only be used when the Main track has one segment`
        );
    }

    validateTrack(bonusTrack, `bonus ${bonusIndex}`);
  }

  if (totalZones > MAX_ZONES_ALL_TRACKS)
    throw new ZoneValidationError('Too many zones in total');

  function validateTrack(track: Track, debugName: string) {
    const { zones } = track;

    if (!zones) return; // Defrag modifiers (already checked they exist)

    if (zones.segments.length > MAX_TRACK_SEGMENTS)
      throw new ZoneValidationError(`Track ${debugName} has too many segments`);

    for (const [segmentIndex, segment] of zones.segments.entries()) {
      const thr = (str: string) => {
        throw new ZoneValidationError(
          `Track ${debugName} segment ${segmentIndex + 1} ${str}`
        );
      };

      if (!Array.isArray(segment?.checkpoints)) {
        thr('has no checkpoints');
      }

      if (segment.checkpoints.length + 1 > MAX_SEGMENT_CHECKPOINTS) {
        thr('has too many checkpoints');
      }

      if (!segment.checkpoints?.[0]) {
        thr('has no start zone');
      }

      (
        [
          'limitStartGroundSpeed',
          'checkpointsRequired',
          'checkpointsOrdered'
        ] as const
      )
        .filter((k) => !(segment[k] === true || segment[k] === false))
        .forEach((k) => thr(`${k} must be a boolean`));

      validateZone(
        segment.checkpoints[0],
        debugName,
        `segment ${segmentIndex + 1} start zone`,
        true
      );

      segment.checkpoints
        .slice(1)
        .forEach((checkpoint) =>
          validateZone(
            checkpoint,
            debugName,
            `segment ${segmentIndex + 1} checkpoint zone`,
            false
          )
        );

      segment.cancel?.forEach((cancel) =>
        validateZone(
          cancel,
          debugName,
          `segment ${segmentIndex + 1} cancel zone`,
          false
        )
      );
    }

    validateZone(zones.end, debugName, 'end zone', false);
  }

  function validateZone(
    zone: Zone,
    trackName: string,
    zoneName: string,
    requiresTele: boolean
  ) {
    if (!zone) throw new ZoneValidationError('Missing zones');

    totalZones++;

    if (!Array.isArray(zone.regions) || zone.regions.length === 0)
      throw new ZoneValidationError(
        `Track ${trackName} ${zoneName} has no regions`
      );

    for (const [regionIndex, region] of zone.regions.entries()) {
      const thr = (str: string) => {
        throw new ZoneValidationError(
          `Track ${trackName} ${zoneName} region ${regionIndex} ${str}`
        );
      };

      if (!Array.isArray(region.points)) {
        thr('has no points');
      }

      if (region.points.length < 3) {
        thr('does not have enough points');
      }

      if (region.points.length > MAX_ZONE_REGION_POINTS) {
        thr('has too many points');
      }

      if (region.bottom == null) {
        thr('has no bottom position');
      }

      if (
        !(region.bottom >= MIN_COORD_FLOAT && region.bottom < MAX_COORD_FLOAT)
      ) {
        thr('bottom is out of bounds');
      }

      if (region.height == null || region.height <= 0) {
        thr('has no height');
      }

      if (region.bottom + region.height > MAX_COORD_FLOAT) {
        thr('is too high');
      }

      for (const [i, point] of region.points.entries()) {
        if (point.length !== 2 || !point.every((p) => !Number.isNaN(+p))) {
          thr(`point ${i} is not a 2-tuple`);
        }
      }

      const MIN_DIST = 4;
      const MIN_ANGLE = Math.PI * (15 / 180);

      const points = region.points;
      const count = points.length;

      for (let i = 0; i < count; i++) {
        const prev1 = points[(i - 1 + count) % count];
        const curr1 = points[i];
        const next1 = points[(i + 1) % count];

        const [currX, currY] = curr1;

        if (
          !(
            currX >= MIN_COORD_FLOAT &&
            currX <= MAX_COORD_FLOAT &&
            currY >= MIN_COORD_FLOAT &&
            currY <= MAX_COORD_FLOAT
          )
        ) {
          thr(`point ${i} is out of bounds`);
        }

        const line1 = Vec.sub(prev1, curr1);
        const line2 = Vec.sub(next1, curr1);

        const d1 = Vec.len(line1);
        const d2 = Vec.len(line2);

        if (d1 < MIN_DIST || d2 < MIN_DIST || d1 <= 0 || d2 <= 0)
          thr('polygon vertices are too close to each other');

        const angle = Math.acos(Vec.dot(line1, line2) / (d1 * d2));

        if (angle < MIN_ANGLE) thr('polygon has an angle which is too small');

        if (angle > Math.PI - 0.0001) thr('polygon has colinear points');

        if (
          count <= 3 || // Triangles can't self-intersect
          i === count - 1 // Skip a case we don't want to check
        )
          continue;

        // Loop through every line segment not connected to i, i + 1 segment
        for (let j = i + 2; j < count; j++) {
          // Skip another bad case
          if (i === 0 && j === count - 1) continue;

          // line2 is vec between curr and next of first loop
          const curr2 = points[j];
          const next2 = points[(j + 1) % count];

          // https://bryceboe.com/2006/10/23/line-segment-intersection-algorithm/
          if (
            Vec.ccw(curr1, curr2, next2) !== Vec.ccw(next1, curr2, next2) &&
            Vec.ccw(curr1, next1, curr2) !== Vec.ccw(curr1, next1, next2)
          )
            thr('polygon is self-intersecting');
        }
      }

      const isNum = (p: any) => typeof p === 'number' && !Number.isNaN(+p);
      if (region.teleDestPos !== undefined) {
        if (region.teleDestTargetname !== undefined)
          thr(
            'must not specify both a targetname-based and a custom position-based destination'
          );

        if (region.teleDestYaw === undefined)
          thr('must specify teleDestYaw if teleDestPos is specified');

        if (region.teleDestPos.length !== 3 || !region.teleDestPos.every(isNum))
          thr('teleDestPos must be a 3-tuple of numbers');

        if (!isNum(region.teleDestYaw)) {
          thr('teleDestYaw must be a number');
        }
      } else {
        if (requiresTele && region.teleDestTargetname === undefined)
          thr(
            'must specify either a targetname-based or a custom position-based destination'
          );
      }
    }
  }
}
