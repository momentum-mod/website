import * as assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import {
  BonusTrack,
  MapZones,
  Segment,
  Vector2D,
  Zone
} from '@momentum/constants';
import {
  BabyZonesStub,
  CURRENT_ZONE_FORMAT_VERSION,
  MAX_BONUS_TRACKS,
  MAX_COORD_FLOAT,
  MAX_REGIONS,
  MAX_SEGMENT_CHECKPOINTS,
  MAX_TRACK_SEGMENTS,
  MAX_ZONE_REGION_POINTS,
  MIN_COORD_FLOAT,
  validateZoneFile,
  ZonesStub
} from './';
import { arrayFrom } from '@momentum/util-fn';

const messageIncludes = (message: string) => (error: Error) =>
  error.message.includes(message);
const messageMatches = (pattern: RegExp) => (error: Error) =>
  pattern.test(error.message);

describe('validateZoneFile', () => {
  let input: MapZones;

  beforeEach(() => {
    // This object contrains a fairly complex zone, see zones.stub.ts
    input = structuredClone(ZonesStub);
  });

  describe('main bit', () => {
    it('should pass for a valid zone file', () => {
      assert.doesNotThrow(() => validateZoneFile(input));
      assert.doesNotThrow(() => validateZoneFile(BabyZonesStub));
    });

    it('should throw if missing input data', () => {
      input = undefined;

      assert.throws(
        () => validateZoneFile(input),
        messageIncludes('Bad input data')
      );
    });

    it('should throw if tracks are missing', () => {
      input.tracks = undefined;

      assert.throws(
        () => validateZoneFile(input),
        messageIncludes('Missing tracks')
      );
    });

    it('should throw if main track is missing', () => {
      input.tracks.main = undefined;

      assert.throws(
        () => validateZoneFile(input),
        messageIncludes('Missing main track')
      );
    });

    it('should throw if formatVersion is not CURRENT_ZONE_FORMAT_VERSION', () => {
      input.formatVersion = CURRENT_ZONE_FORMAT_VERSION + 1;

      assert.throws(
        () => validateZoneFile(input),
        messageIncludes('Bad format version')
      );
    });

    it('should throw if map has too many bonuses', () => {
      const bonus = input.tracks.bonuses[0];
      input.tracks.bonuses = arrayFrom(MAX_BONUS_TRACKS + 1).fill(
        bonus
      ) as BonusTrack[];

      assert.throws(
        () => validateZoneFile(input),
        messageIncludes('Too many bonus tracks')
      );
    });

    it('should throw if a bonus track has multiple segments', () => {
      input.tracks.bonuses[0].zones.segments.push(
        input.tracks.bonuses[0].zones.segments[0]
      );

      assert.throws(
        () => validateZoneFile(input),
        messageIncludes('Bonus 1 track must have a single segment')
      );
    });

    it('should throw if too many overall zones', () => {
      const segment = input.tracks.main.zones.segments[0];
      const checkpoint = segment.checkpoints[0];
      const bonus = input.tracks.bonuses[0];
      checkpoint.regions = [checkpoint.regions[0]];
      segment.cancel = [];
      input.tracks.bonuses = [];
      input.tracks.main.stagesEndAtStageStarts = true;
      input.tracks.main.zones.segments = arrayFrom(MAX_TRACK_SEGMENTS).map(
        () => ({
          ...segment,
          checkpoints: [checkpoint]
        })
      ) as Segment[];

      assert.doesNotThrow(() => validateZoneFile(input));

      input.tracks.bonuses = [bonus];

      segment.checkpoints = arrayFrom(MAX_REGIONS).map(() => ({
        ...checkpoint
      }));
      input.tracks.main.zones.segments = [segment];

      assert.throws(
        () => validateZoneFile(input),
        messageIncludes('Too many regions in total')
      );
    });

    it('should throw if too many cancel zone regions', () => {
      const segment = input.tracks.main.zones.segments[0];
      const checkpoint = segment.checkpoints[0];

      input.tracks.bonuses = [];
      input.tracks.main.stagesEndAtStageStarts = true;
      input.tracks.main.zones.segments = [
        {
          ...segment,
          checkpoints: [checkpoint],
          cancel: arrayFrom(100, () => checkpoint)
        }
      ] as Segment[];

      assert.doesNotThrow(() => validateZoneFile(input));

      input.tracks.main.zones.segments[0].cancel = arrayFrom(
        1000,
        () => checkpoint
      );

      assert.throws(
        () => validateZoneFile(input),
        messageIncludes('Too many regions in total')
      );
    });

    it('should throw if the main track has stagesEndAtStageStarts false and a non-final segment has only 1 checkpoint', () => {
      input.tracks.main.stagesEndAtStageStarts = true;
      const segment = input.tracks.main.zones.segments[0];
      const cp1 = segment.checkpoints[0];
      const cp2 = segment.checkpoints[1];

      segment.checkpoints = [cp1];
      assert.doesNotThrow(() => validateZoneFile(input));

      input.tracks.main.stagesEndAtStageStarts = false;
      assert.throws(
        () => validateZoneFile(input),
        messageMatches(
          /^Stage 1 does not have a checkpoint to use as a stage track end/
        )
      );

      segment.checkpoints = [cp1, cp2];
      assert.doesNotThrow(() => validateZoneFile(input));
    });

    it('should throw if the main track has stagesEndAtStageStarts false and checkpointsOrdered false', () => {
      input.tracks.main.stagesEndAtStageStarts = false;
      input.tracks.main.zones.segments[0].checkpointsOrdered = false;

      assert.throws(
        () => validateZoneFile(input),
        messageMatches(/^Stage 1 wants to use/)
      );
    });

    it('should throw if a bonus track has both zones and defragModifiers', () => {
      input.tracks.main.zones.segments = [input.tracks.main.zones.segments[0]];
      input.tracks.bonuses[0].defragModifiers = 1;

      assert.throws(
        () => validateZoneFile(input),
        messageIncludes(
          'Bonus 1 track must specify exactly one of zones or defragModifiers'
        )
      );

      delete input.tracks.bonuses[0].zones;
      assert.doesNotThrow(() => validateZoneFile(input));
    });

    it('should throw if a bonus track has multiple segments', () => {
      input.tracks.bonuses[0].zones.segments.push(
        input.tracks.bonuses[0].zones.segments[0]
      );

      assert.throws(
        () => validateZoneFile(input),
        messageIncludes('Bonus 1 track must have a single segment')
      );
    });

    it('should throw if a bonus track has defragModifiers but the main track has more than one segment', () => {
      input.tracks.bonuses[0].defragModifiers = 1;
      delete input.tracks.bonuses[0].zones;

      assert.throws(
        () => validateZoneFile(input),
        messageMatches(/^Bonus 1 track is a Defrag modifier bonus but/)
      );
    });
  });

  describe('regions', () => {
    it('should throw if a volume has no regions', () => {
      input.tracks.main.zones.segments[0].checkpoints[0].regions = [];

      assert.throws(
        () => validateZoneFile(input),
        messageIncludes('Track Main segment 1 start zone has no regions')
      );
    });

    it('should throw if a region has less than 3 points', () => {
      input.tracks.main.zones.segments[0].checkpoints[0].regions[0].points = [
        [0, 0],
        [0, 512]
      ];

      assert.throws(
        () => validateZoneFile(input),
        messageIncludes(
          'Track Main segment 1 start zone region 0 does not have enough points'
        )
      );
    });

    it('should throw if a region has more than MAX_ZONE_REGION_POINTS points', () => {
      input.tracks.main.zones.segments[0].checkpoints[0].regions[0].points =
        arrayFrom(MAX_ZONE_REGION_POINTS + 1).fill([0, 0]) as Vector2D[]; // Would also fail angle checks but this throws first

      assert.throws(
        () => validateZoneFile(input),
        messageIncludes(
          'Track Main segment 1 start zone region 0 has too many points'
        )
      );
    });

    it('should throw if a regions point are not a 2-tuple', () => {
      input.tracks.main.zones.segments[0].checkpoints[0].regions[0].points[0] =
        [0, 0, 0] as any;

      assert.throws(
        () => validateZoneFile(input),
        messageIncludes(
          'Track Main segment 1 start zone region 0 point 0 is not a 2-tuple'
        )
      );

      input.tracks.main.zones.segments[0].checkpoints[0].regions[0].points[0] =
        [0, 'i can hear the voice of God'] as any;

      assert.throws(
        () => validateZoneFile(input),
        messageIncludes(
          'Track Main segment 1 start zone region 0 point 0 is not a 2-tuple'
        )
      );
    });

    it('should throw if a region has no bottom position', () => {
      input.tracks.main.zones.segments[0].checkpoints[0].regions[0].bottom =
        undefined;
      assert.throws(
        () => validateZoneFile(input),
        messageIncludes(
          'Track Main segment 1 start zone region 0 has no bottom position'
        )
      );
    });

    it("should throw if a region's bottom is out of bounds", () => {
      // "dude that guy's bottoming is OUT OF BOUNDS"
      input.tracks.main.zones.segments[0].checkpoints[0].regions[0].bottom =
        MIN_COORD_FLOAT - 1;

      assert.throws(
        () => validateZoneFile(input),
        messageIncludes(
          'Track Main segment 1 start zone region 0 bottom is out of bounds'
        )
      );

      input.tracks.main.zones.segments[0].checkpoints[0].regions[0].bottom =
        MAX_COORD_FLOAT + 1;

      assert.throws(
        () => validateZoneFile(input),
        messageIncludes(
          'Track Main segment 1 start zone region 0 bottom is out of bounds'
        )
      );
    });

    it('should throw if a region has no height', () => {
      input.tracks.main.zones.segments[0].checkpoints[0].regions[0].height =
        undefined;

      assert.throws(
        () => validateZoneFile(input),
        messageIncludes(
          'Track Main segment 1 start zone region 0 has no height'
        )
      );

      input.tracks.main.zones.segments[0].checkpoints[0].regions[0].height = 0;

      assert.throws(
        () => validateZoneFile(input),
        messageIncludes(
          'Track Main segment 1 start zone region 0 has no height'
        )
      );
    });

    it('should throw if a region is too high', () => {
      input.tracks.main.zones.segments[0].checkpoints[0].regions[0].height =
        MAX_COORD_FLOAT * 2 + 1;

      assert.throws(
        () => validateZoneFile(input),
        messageIncludes('Track Main segment 1 start zone region 0 is too high')
      );
    });

    it('should throw if a region has an out of bounds point', () => {
      input.tracks.main.zones.segments[0].checkpoints[0].regions[0].points[0][0] =
        MAX_COORD_FLOAT + 1;

      assert.throws(
        () => validateZoneFile(input),
        messageIncludes(
          'Track Main segment 1 start zone region 0 point 0 is out of bounds'
        )
      );
    });

    it('should throw if a region has vertices too close together', () => {
      // points[0] = [0, 0], points[1] = [0, 512], so change the 512 to something small
      input.tracks.main.zones.segments[0].checkpoints[0].regions[0].points[1][1] = 1;

      assert.throws(
        () => validateZoneFile(input),
        messageIncludes(
          'Track Main segment 1 start zone region 0 polygon vertices are too close to each other'
        )
      );
    });

    it('should throw if a region has an angle that is too small', () => {
      // turn region into a triangle
      input.tracks.main.zones.segments[0].checkpoints[0].regions[0].points.pop();

      // points[0] = [0, 0], points[1] = [0, 512], points[2] = [512, 0]
      // min angle is 15deg (pi/12) so set to length < 512 * tan(pi/12) = 137.1899...
      input.tracks.main.zones.segments[0].checkpoints[0].regions[0].points[2][0] = 137.1;

      assert.throws(
        () => validateZoneFile(input),
        messageIncludes(
          'Track Main segment 1 start zone region 0 polygon has an angle which is too small'
        )
      );
      input.tracks.main.zones.segments[0].checkpoints[0].regions[0].points[2][0] = 137.2;

      assert.doesNotThrow(() => validateZoneFile(input));
    });

    it('should throw if a region has an angle has colinear points', () => {
      // Only case this hits is colinearity so put one point[2] on line between
      // point[1] and point[3]
      input.tracks.main.zones.segments[0].checkpoints[0].regions[0].points[2] =
        [256, 256];

      assert.throws(
        () => validateZoneFile(input),
        messageIncludes(
          'Track Main segment 1 start zone region 0 polygon has colinear points'
        )
      );
    });

    it('should throw if a region has an self-intersections', () => {
      // This is a hideous hourglass thing
      input.tracks.main.zones.segments[0].checkpoints[0].regions.push({
        ...input.tracks.main.zones.segments[0].checkpoints[0].regions[0],
        points: [
          [0, 0],
          [0, 512],
          [512, 0],
          [512, 512]
        ]
      });

      assert.throws(
        () => validateZoneFile(input),
        messageIncludes(
          'Track Main segment 1 start zone region 1 polygon is self-intersecting'
        )
      );

      input.tracks.main.zones.segments[0].checkpoints[0].regions[1].points = [
        [0, 0],
        [0, 100],
        [100, 100],
        [100, -100],
        [-100, -100],
        [-100, 200],
        [200, 200],
        [200, 0]
      ];

      assert.throws(
        () => validateZoneFile(input),
        messageIncludes(
          'Track Main segment 1 start zone region 1 polygon is self-intersecting'
        )
      );

      input.tracks.main.zones.segments[0].checkpoints[0].regions[1].points = [
        [0, 0],
        [0, 100],
        [100, 100],
        [100, -100],
        [-100, -100],
        [-100, 200],
        [200, 200],
        [200, 0],
        [150, 0],
        [150, 150],
        [-50, 150],
        [-50, 0]
      ];

      assert.doesNotThrow(() => validateZoneFile(input));
    });

    it('should throw if a region has both a targetname and position destination', () => {
      input.tracks.main.zones.segments[0].checkpoints[0].regions[0].teleDestPos =
        [0, 0, 0];
      input.tracks.main.zones.segments[0].checkpoints[0].regions[0].teleDestTargetname =
        'tele_dest';

      assert.throws(
        () => validateZoneFile(input),
        messageIncludes(
          'Track Main segment 1 start zone region 0 must not specify both a targetname-based and a custom position-based destination'
        )
      );
    });

    it('should throw if a teledestpos is given by no yaw', () => {
      input.tracks.main.zones.segments[0].checkpoints[0].regions[0].teleDestPos =
        [0, 0, 0];
      input.tracks.main.zones.segments[0].checkpoints[0].regions[0].teleDestYaw =
        undefined;

      assert.throws(
        () => validateZoneFile(input),
        messageIncludes(
          'Track Main segment 1 start zone region 0 must specify teleDestYaw if teleDestPos is specified'
        )
      );
    });

    it('should throw if teledestpos is not a tuple of numbers', () => {
      input.tracks.main.zones.segments[0].checkpoints[0].regions[0].teleDestPos =
        [0, 0, 'sausage' as any];

      assert.throws(
        () => validateZoneFile(input),
        messageIncludes(
          'Track Main segment 1 start zone region 0 teleDestPos must be a 3-tuple of numbers'
        )
      );
    });

    it('should throw if teledestyaw is not a number', () => {
      input.tracks.main.zones.segments[0].checkpoints[0].regions[0].teleDestYaw =
        'haggis' as any;

      assert.throws(
        () => validateZoneFile(input),
        messageIncludes(
          'Track Main segment 1 start zone region 0 teleDestYaw must be a number'
        )
      );
    });

    it('should throw if requirestele is true and neither target nor pos is set', () => {
      input.tracks.main.zones.segments[0].checkpoints[0].regions[0].teleDestPos =
        undefined;
      input.tracks.main.zones.segments[0].checkpoints[0].regions[0].teleDestTargetname =
        undefined;

      assert.throws(
        () => validateZoneFile(input),
        messageIncludes(
          'Track Main segment 1 start zone region 0 must specify either a targetname-based or a custom position-based destination'
        )
      );
    });

    it('should not throw if requiretele is false and neither target nor pos is set', () => {
      input.tracks.main.zones.segments[0].checkpoints[1].regions[0].teleDestPos =
        undefined;
      input.tracks.main.zones.segments[0].checkpoints[1].regions[0].teleDestTargetname =
        undefined;

      assert.doesNotThrow(() => validateZoneFile(input));
    });
  });

  describe('tracks', () => {
    it('should throw if a track has no segments', () => {
      input.tracks.main.zones.segments = [];

      assert.throws(
        () => validateZoneFile(input),
        messageIncludes('The Main track has no segments')
      );
    });

    // Actually impossible to reach this, since only main tracks can have
    // segments, and the MAX_REGIONS check will catch it first.
    it.skip('should throw if a track has too many segments', () => {});

    it('should throw if a segment has no checkpoints', () => {
      input.tracks.main.zones.segments[0].checkpoints = undefined;

      assert.throws(
        () => validateZoneFile(input),
        messageIncludes('Track Main segment 1 has no checkpoints')
      );
    });

    it('should throw if a segment has no start zone', () => {
      input.tracks.main.zones.segments[0].checkpoints = [];

      assert.throws(
        () => validateZoneFile(input),
        messageIncludes('Track Main segment 1 has no start zone')
      );
    });

    it('should throw if a segment has too many checkpoints', () => {
      const checkpoint = input.tracks.main.zones.segments[0].checkpoints[1];
      input.tracks.main.zones.segments[0].checkpoints = [
        input.tracks.main.zones.segments[0].checkpoints[0],
        ...(arrayFrom(MAX_SEGMENT_CHECKPOINTS + 1).fill(checkpoint) as Zone[])
      ];

      assert.throws(
        () => validateZoneFile(input),
        messageIncludes('Track Main segment 1 has too many checkpoints')
      );
    });
  });

  describe('zones', () => {
    it('should throw if a start zone has a no teleport destination and yaw or targetname', () => {
      // Isn't possible to test pos/yaw individual - one being missed but not
      // other will fail a region check, which runs prior.
      const region =
        input.tracks.main.zones.segments[0].checkpoints[0].regions[0];
      region.teleDestPos = undefined;
      region.teleDestYaw = undefined;
      region.teleDestTargetname = undefined;

      assert.throws(
        () => validateZoneFile(input),
        messageIncludes(
          'Track Main segment 1 start zone region 0 must specify either a targetname-based or a custom position-based destination'
        )
      );
    });

    it('should not throw if a minor CP zone has a no teleport destination or yaw', () => {
      const region =
        input.tracks.main.zones.segments[0].checkpoints[1].regions[0];
      region.teleDestYaw = undefined;
      region.teleDestPos = undefined;
      region.teleDestTargetname = undefined;

      assert.doesNotThrow(() => validateZoneFile(input));
    });

    it('should not throw if an end zone has a no teleport destination or yaw', () => {
      const region = input.tracks.main.zones.end.regions[0];
      region.teleDestYaw = undefined;
      region.teleDestPos = undefined;
      region.teleDestTargetname = undefined;

      assert.doesNotThrow(() => validateZoneFile(input));
    });
  });
});
