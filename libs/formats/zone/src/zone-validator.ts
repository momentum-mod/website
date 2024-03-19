import { MapZones, Region, Track, Volume, Zone } from '@momentum/constants';
import { Vec, arrayFrom } from '@momentum/util-fn';

// Contents of this file largely correspond to mom_zone_defs.cpp/h
// Some of this implementation is kept deliberately quite C++ish so easiest to
// keep both in sync.

export const CURRENT_ZONE_FORMAT_VERSION = 1;

export const MAX_COORD_FLOAT = 65536;
export const MIN_COORD_FLOAT = -MAX_COORD_FLOAT;

export const MAX_ZONE_REGION_POINTS = 64;

export const MAX_TRACK_SEGMENTS = 255;
export const MAX_SEGMENT_CHECKPOINTS = 255;
export const MAX_ZONES_ALL_TRACKS = 512;

export const MAX_STAGE_TRACKS = MAX_TRACK_SEGMENTS;
export const MAX_BONUS_TRACKS = 255;

export class ZoneValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ZoneValidationError';
  }
}

/**
 * Validate a MapZones JavaScript Object
 * @throws ZoneValidationError
 */
export function validateZoneFile(input: MapZones): void {
  if (!input) throw new ZoneValidationError('Bad input data');

  const { volumes, tracks, formatVersion } = input;

  if (!tracks) throw new ZoneValidationError('Missing tracks');

  if (!volumes) throw new ZoneValidationError('Missing volumes');

  if (formatVersion !== CURRENT_ZONE_FORMAT_VERSION)
    throw new ZoneValidationError('Bad format version');

  validateVolumes(volumes);

  const usedVolumes = arrayFrom(volumes.length).fill(false) as boolean[];

  let totalZones = 0;

  validateTrack(tracks.main, 'Main', volumes);

  if (tracks.main.zones.segments.length === 1) {
    if (tracks.stages.length > 0)
      throw new ZoneValidationError(
        'A map with a linear main track cannot have any stage stacks'
      );
  } else {
    if (tracks.stages.length !== tracks.main.zones.segments.length) {
      throw new ZoneValidationError(
        'The number of stage tracks must match the number of main track segments'
      );
    }
  }

  if (tracks.stages.length > 0) {
    if (tracks.stages.length > MAX_STAGE_TRACKS)
      throw new ZoneValidationError('Too many stage tracks');

    for (const [stageIndex, stage] of tracks.stages.entries()) {
      if (stage?.zones?.segments?.length !== 1)
        throw new ZoneValidationError(
          `Stage ${stageIndex + 1} track must have a single segment`
        );

      validateTrack(stage, `stage ${stageIndex}`, volumes);
    }
  }

  if (tracks.bonuses.length > 0) {
    if (tracks.bonuses.length > MAX_BONUS_TRACKS)
      throw new ZoneValidationError('Too many bonus tracks');

    for (const [bonusIndex, bonus] of tracks.bonuses.entries()) {
      if (bonus?.zones?.segments?.length !== 1)
        throw new ZoneValidationError(
          `Bonus ${bonusIndex + 1} track must have a single segment`
        );

      validateTrack(bonus, `bonus ${bonusIndex}`, volumes);
    }
  }

  if (totalZones > MAX_ZONES_ALL_TRACKS)
    throw new ZoneValidationError('Too many zones in total');

  for (const [i, isUsed] of usedVolumes.entries()) {
    if (!isUsed) throw new ZoneValidationError(`Volume ${i} is unused`);
  }

  function validateVolumes(volumes: Volume[]) {
    for (const [volumeIndex, volume] of volumes.entries()) {
      if (volume.regions.length === 0) {
        throw new ZoneValidationError(`Volume ${volumeIndex} has no regions`);
      }

      validateRegions(volume.regions, volumeIndex);
    }
  }

  function validateRegions(regions: Region[], volumeIndex: number) {
    for (const [regionIndex, region] of regions.entries()) {
      if (region.points.length < 3)
        throw new ZoneValidationError(
          `Volume ${volumeIndex} region ${regionIndex} does not have enough points`
        );

      if (region.points.length > MAX_ZONE_REGION_POINTS)
        throw new ZoneValidationError(
          `Volume ${volumeIndex} region ${regionIndex} has too many points`
        );

      // Using non-strict as JS coerces to value === undefined || value === null
      if (region.bottom == null) {
        throw new ZoneValidationError(
          `Volume ${volumeIndex} region ${regionIndex} has no bottom position`
        );
      }

      if (
        !(region.bottom >= MIN_COORD_FLOAT && region.bottom < MAX_COORD_FLOAT)
      ) {
        throw new ZoneValidationError(
          `Volume ${volumeIndex} region ${regionIndex} bottom is out of bounds`
        );
      }

      if (region.height == null || region.height <= 0) {
        throw new ZoneValidationError(
          `Volume ${volumeIndex} region ${regionIndex} has no height`
        );
      }

      if (region.bottom + region.height > MAX_COORD_FLOAT) {
        throw new ZoneValidationError(
          `Volume ${volumeIndex} region ${regionIndex} is too high`
        );
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
        )
          throw new ZoneValidationError(
            `Volume ${volumeIndex} region ${regionIndex} point ${i} is out of bounds`
          );

        const line1 = Vec.sub(prev1, curr1);
        const line2 = Vec.sub(next1, curr1);

        const d1 = Vec.len(line1);
        const d2 = Vec.len(line2);

        if (d1 < MIN_DIST || d2 < MIN_DIST || d1 <= 0 || d2 <= 0)
          throw new ZoneValidationError(
            `Volume ${volumeIndex} region ${regionIndex} polygon vertices are too close to each other`
          );

        const angle = Math.acos(Vec.dot(line1, line2) / (d1 * d2));

        if (angle < MIN_ANGLE)
          throw new ZoneValidationError(
            `Volume ${volumeIndex} region ${regionIndex} polygon has an angle which is too small`
          );

        if (angle > Math.PI - 0.0001)
          throw new ZoneValidationError(
            `Volume ${volumeIndex} region ${regionIndex} polygon has colinear points`
          );

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
            throw new ZoneValidationError(
              `Volume ${volumeIndex} region ${regionIndex} polygon is self-intersecting`
            );
        }
      }

      if ((region.teleportPos == null) !== (region.teleportYaw == null))
        throw new ZoneValidationError(
          `Volume ${volumeIndex} region ${regionIndex} has a teleport pos or yaw specified but should have both or neither.`
        );
    }
  }

  function validateZone(
    zone: Zone,
    trackName: string,
    zoneName: string,
    volumes: Volume[],
    requiresTele: boolean
  ) {
    if (!zone) throw new ZoneValidationError('Missing zones');

    if (zone.volumeIndex < 0 || zone.volumeIndex >= volumes.length)
      throw new ZoneValidationError(
        `Track ${trackName} ${zoneName} has invalid volume index`
      );

    usedVolumes[zone.volumeIndex] = true;

    if (requiresTele) {
      const zoneRegions = volumes[zone.volumeIndex].regions;
      for (const [regionIndex, region] of zoneRegions.entries()) {
        if (region.teleportPos == null)
          throw new ZoneValidationError(
            `Track ${trackName} ${zoneName} must specify a teleport destination for each Volume region (missing region ${regionIndex})`
          );
        if (region.teleportYaw == null)
          throw new ZoneValidationError(
            `Track ${trackName} ${zoneName} must specify a teleport yaw for each Volume region (missing region ${regionIndex})`
          );
      }
    }

    totalZones++;
  }

  function validateTrack(track: Track, trackName: string, volumes: Volume[]) {
    if (
      !Array.isArray(track.zones.segments) ||
      track.zones.segments.length === 0
    )
      throw new ZoneValidationError(`Track ${trackName} has no segments`);

    if (track.zones.segments.length > MAX_TRACK_SEGMENTS)
      throw new ZoneValidationError(`Track ${trackName} has too many segments`);

    for (const [segmentIndex, segment] of track.zones.segments.entries()) {
      if (!Array.isArray(segment?.checkpoints))
        throw new ZoneValidationError(
          `Track ${trackName} segment ${segmentIndex} has no checkpoints`
        );

      // We don't return the overall zone file currently this copy isn't
      // strictly necessary, as but .shift modifies the underlying array,
      // so safest to copy first just in case we care about final MapZones
      // object in the future.
      const checkpoints = structuredClone(segment.checkpoints);
      const start = checkpoints.shift();

      if (!start)
        throw new ZoneValidationError(
          `Track ${trackName} segment ${segmentIndex} has no start zone`
        );

      validateZone(
        start,
        trackName,
        `segment ${segmentIndex} start zone`,
        volumes,
        true
      );

      // +1 since .shift() removed the start zone, but that zone counts towards
      // the overall limit.
      if (checkpoints.length + 1 > MAX_SEGMENT_CHECKPOINTS)
        throw new ZoneValidationError(
          `Track ${trackName} segment ${segmentIndex} has too many checkpoints`
        );

      for (const checkpoint of checkpoints) {
        validateZone(
          checkpoint,
          trackName,
          `segment ${segmentIndex} checkpoint zone`,
          volumes,
          false
        );
      }
    }

    validateZone(track.zones.end, trackName, 'end zone', volumes, false);
  }
}
