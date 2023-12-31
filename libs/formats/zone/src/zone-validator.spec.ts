import { MapZones, Segment, Track, Vector2D, Zone } from '@momentum/constants';
import {
  BabyZonesStub,
  CURRENT_ZONE_FORMAT_VERSION,
  MAX_BONUS_TRACKS,
  MAX_COORD_FLOAT,
  MAX_SEGMENT_CHECKPOINTS,
  MAX_STAGE_TRACKS,
  MAX_TRACK_SEGMENTS,
  MAX_ZONE_REGION_POINTS,
  MIN_COORD_FLOAT,
  validateZoneFile,
  ZonesStub
} from './';

describe('validateZoneFile', () => {
  let input: MapZones;

  beforeEach(() => {
    // For this stub, there's just a main track, with start zone using vol 0,
    // cp 1 using vol 2, end using vol 3.
    input = structuredClone(ZonesStub);
  });

  describe('main bit', () => {
    it('should pass for a valid zone file', () => {
      expect(() => validateZoneFile(input)).not.toThrow();
      expect(() => validateZoneFile(BabyZonesStub)).not.toThrow();
    });

    it('should throw if missing input data', () => {
      input = undefined;

      expect(() => validateZoneFile(input)).toThrow('Bad input data');
    });

    it('should throw if tracks are missing', () => {
      input.tracks = undefined;

      expect(() => validateZoneFile(input)).toThrow('Missing tracks');
    });

    it('should throw if volumes are missing', () => {
      input.volumes = undefined;

      expect(() => validateZoneFile(input)).toThrow('Missing volumes');
    });

    it('should throw if formatVersion is not CURRENT_ZONE_FORMAT_VERSION', () => {
      input.formatVersion = CURRENT_ZONE_FORMAT_VERSION + 1;

      expect(() => validateZoneFile(input)).toThrow('Bad format version');
    });

    // This isn't actually possible to hit with current constants as you'll
    // always either hit "Track Main has too many segments" or "number of stage
    // tracks must match the number of main track segments" first
    it.skip('should throw if map has too many stages', () => {
      const stage = structuredClone(input.tracks.stages[0]);
      input.tracks.stages = Array.from({ length: MAX_STAGE_TRACKS + 1 }).fill(
        stage
      ) as Track[];

      expect(() => validateZoneFile(input)).toThrow('Too many stage tracks');
    });

    it('should throw if different number of stages as main track segments', () => {
      input.tracks.stages.push(input.tracks.stages[0]);

      expect(() => validateZoneFile(input)).toThrow(
        'The number of stage tracks must match the number of main track segments'
      );

      input.tracks.stages = [input.tracks.stages[0]];

      expect(() => validateZoneFile(input)).toThrow(
        'The number of stage tracks must match the number of main track segments'
      );
    });

    it('should throw if a linear map has any stages', () => {
      input.tracks.main.zones.segments = [input.tracks.main.zones.segments[0]];

      expect(() => validateZoneFile(input)).toThrow(
        'A map with a linear main track cannot have any stage stacks'
      );
    });

    it('should throw if a staged track has multiple segments', () => {
      input.tracks.stages[0].zones.segments.push(
        input.tracks.stages[1].zones.segments[0]
      );

      expect(() => validateZoneFile(input)).toThrow(
        'Stage 1 track must have a single segment'
      );
    });

    it('should throw if map has too many bonuses', () => {
      const bonus = structuredClone(input.tracks.bonuses[0]);
      input.tracks.bonuses = Array.from({ length: MAX_BONUS_TRACKS + 1 }).fill(
        bonus
      ) as Track[];

      expect(() => validateZoneFile(input)).toThrow('Too many bonus tracks');
    });

    it('should throw if a bonus track has multiple segments', () => {
      input.tracks.bonuses[0].zones.segments.push(
        input.tracks.bonuses[0].zones.segments[0]
      );

      expect(() => validateZoneFile(input)).toThrow(
        'Bonus 1 track must have a single segment'
      );
    });

    it('should throw if too many overall tracks', () => {
      const segment = structuredClone(input.tracks.main.zones.segments[0]);
      const checkpoint = segment.checkpoints[0];

      input.tracks.main.zones.segments = Array.from({
        length: MAX_TRACK_SEGMENTS - 1
      }).fill({
        limitGroundSpeed: false,
        checkpoints: Array.from({
          length: MAX_SEGMENT_CHECKPOINTS - 1
        }).fill(checkpoint)
      }) as Segment[];

      input.tracks.stages = Array.from({
        length: MAX_TRACK_SEGMENTS - 1
      }).fill({
        majorOrdered: true,
        minorRequired: true,
        zones: {
          segments: [
            {
              limitStartGroundSpeed: true,
              checkpoints: [checkpoint]
            }
          ],
          end: { volumeIndex: 0 }
        }
      }) as Track[];

      expect(() => validateZoneFile(input)).toThrow('Too many zones in total');
    });

    it('should throw if a volume is unused', () => {
      input.volumes.push({
        regions: [
          {
            height: 256,
            bottom: 0,
            points: [
              [0, 0],
              [3000, 0],
              [3000, 3000]
            ]
          }
        ]
      });

      expect(() => validateZoneFile(input)).toThrow('Volume 7 is unused');
    });
  });

  describe('regions', () => {
    it('should throw if a volume has no regions', () => {
      input.volumes[0].regions = [];

      expect(() => validateZoneFile(input)).toThrow('Volume 0 has no regions');
    });

    it('should throw if a region has less than 3 points', () => {
      input.volumes[0].regions[0].points = [
        [0, 0],
        [0, 512]
      ];

      expect(() => validateZoneFile(input)).toThrow(
        'Volume 0 region 0 does not have enough points'
      );
    });

    it('should throw if a region has more than MAX_ZONE_REGION_POINTS points', () => {
      input.volumes[0].regions[0].points = Array.from({
        length: MAX_ZONE_REGION_POINTS + 1
      }).fill([0, 0]) as Vector2D[]; // Would also fail angle checks but this throws first

      expect(() => validateZoneFile(input)).toThrow(
        'Volume 0 region 0 has too many points'
      );
    });

    it('should throw if a region has no bottom position', () => {
      input.volumes[0].regions[0].bottom = undefined;
      expect(() => validateZoneFile(input)).toThrow(
        'Volume 0 region 0 has no bottom position'
      );
    });

    it("should throw if a region's bottom is out of bounds", () => {
      // "dude that guy's bottoming is OUT OF BOUNDS"
      input.volumes[0].regions[0].bottom = MIN_COORD_FLOAT - 1;

      expect(() => validateZoneFile(input)).toThrow(
        'Volume 0 region 0 bottom is out of bounds'
      );

      input.volumes[0].regions[0].bottom = MAX_COORD_FLOAT + 1;

      expect(() => validateZoneFile(input)).toThrow(
        'Volume 0 region 0 bottom is out of bounds'
      );
    });

    it('should throw if a region has no height', () => {
      input.volumes[0].regions[0].height = undefined;

      expect(() => validateZoneFile(input)).toThrow(
        'Volume 0 region 0 has no height'
      );

      input.volumes[0].regions[0].height = 0;

      expect(() => validateZoneFile(input)).toThrow(
        'Volume 0 region 0 has no height'
      );
    });

    it('should throw if a region is too high', () => {
      input.volumes[0].regions[0].height = MAX_COORD_FLOAT * 2 + 1;

      expect(() => validateZoneFile(input)).toThrow(
        'Volume 0 region 0 is too high'
      );
    });

    it('should throw if a region has an out of bounds point', () => {
      input.volumes[0].regions[0].points[0][0] = MAX_COORD_FLOAT + 1;

      expect(() => validateZoneFile(input)).toThrow(
        'Volume 0 region 0 point 0 is out of bounds'
      );
    });

    it('should throw if a region has vertices too close together', () => {
      // points[0] = [0, 0], points[1] = [0, 512], so change the 512 to something small
      input.volumes[0].regions[0].points[1][1] = 1;

      expect(() => validateZoneFile(input)).toThrow(
        'Volume 0 region 0 polygon vertices are too close to each other'
      );
    });

    it('should throw if a region has an angle that is too small', () => {
      // turn region into a triangle
      input.volumes[0].regions[0].points.pop();

      // points[0] = [0, 0], points[1] = [0, 512], points[2] = [512, 0]
      // min angle is 15deg (pi/12) so set to length < 512 * tan(pi/12) = 137.1899...
      input.volumes[0].regions[0].points[2][0] = 137.1;

      expect(() => validateZoneFile(input)).toThrow(
        'Volume 0 region 0 polygon has an angle which is too small'
      );
      input.volumes[0].regions[0].points[2][0] = 137.2;

      expect(() => validateZoneFile(input)).not.toThrow();
    });

    it('should throw if a region has an angle has colinear points', () => {
      // Only case this hits is colinearity so put one point[2] on line between
      // point[1] and point[3]
      input.volumes[0].regions[0].points[2] = [256, 256];

      expect(() => validateZoneFile(input)).toThrow(
        'Volume 0 region 0 polygon has colinear points'
      );
    });

    it('should throw if a region has an self-intersections', () => {
      // This is a hideous hourglass thing
      input.volumes[0].regions.push({
        ...input.volumes[0].regions[0],
        points: [
          [0, 0],
          [0, 512],
          [512, 0],
          [512, 512]
        ]
      });

      expect(() => validateZoneFile(input)).toThrow(
        'Volume 0 region 1 polygon is self-intersecting'
      );

      input.volumes[0].regions[1].points = [
        [0, 0],
        [0, 100],
        [100, 100],
        [100, -100],
        [-100, -100],
        [-100, 200],
        [200, 200],
        [200, 0]
      ];

      expect(() => validateZoneFile(input)).toThrow(
        'Volume 0 region 1 polygon is self-intersecting'
      );

      input.volumes[0].regions[1].points = [
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

      expect(() => validateZoneFile(input)).not.toThrow();
    });
  });

  describe('tracks', () => {
    it('should throw if a track has no segments', () => {
      input.tracks.main.zones.segments = [];

      expect(() => validateZoneFile(input)).toThrow(
        'Track Main has no segments'
      );
    });

    it('should throw if a track has too many segments', () => {
      const segment = structuredClone(input.tracks.main.zones.segments[0]);

      input.tracks.main.zones.segments = Array.from({
        length: MAX_TRACK_SEGMENTS + 1
      }).fill(segment) as Segment[];

      expect(() => validateZoneFile(input)).toThrow(
        'Track Main has too many segments'
      );
    });

    it('should throw if a segment has no checkpoints', () => {
      input.tracks.main.zones.segments[0].checkpoints = undefined;

      expect(() => validateZoneFile(input)).toThrow(
        'Track Main segment 0 has no checkpoints'
      );
    });

    it('should throw if a segment has no start zone', () => {
      input.tracks.main.zones.segments[0].checkpoints = [];

      expect(() => validateZoneFile(input)).toThrow(
        'Track Main segment 0 has no start zone'
      );
    });

    it('should throw if a segment has too many checkpoints', () => {
      const checkpoint = structuredClone(
        input.tracks.main.zones.segments[0].checkpoints[1]
      );
      input.tracks.main.zones.segments[0].checkpoints = [
        input.tracks.main.zones.segments[0].checkpoints[0],
        ...(Array.from({
          length: MAX_SEGMENT_CHECKPOINTS + 1
        }).fill(checkpoint) as Zone[])
      ];

      expect(() => validateZoneFile(input)).toThrow(
        'Track Main segment 0 has too many checkpoints'
      );
    });
  });

  describe('zones', () => {
    it('should throw if a zone has an invalid volume index', () => {
      input.tracks.main.zones.segments[0].checkpoints[0].volumeIndex = 7;

      expect(() => validateZoneFile(input)).toThrow(
        'Track Main segment 0 start zone has invalid volume index'
      );
    });

    it('should throw if a start zone has a no teleport destination or yaw', () => {
      // Isn't possible to test pos/yaw individual - one being missed but not
      // other will fail a region check, which runs prior.
      input.volumes[0].regions[0].teleportPos = undefined;
      input.volumes[0].regions[0].teleportYaw = undefined;

      expect(() => validateZoneFile(input)).toThrow(
        'Track Main segment 0 start zone must specify a teleport destination for each Volume region (missing region 0)'
      );
    });

    it('should not throw if a minor CP zone has a no teleport destination or yaw', () => {
      input.volumes[1].regions[0].teleportPos = undefined;
      input.volumes[1].regions[0].teleportYaw = undefined;

      expect(() => validateZoneFile(input)).not.toThrow();
    });

    it('should not throw if an end zone has a no teleport destination or yaw', () => {
      input.volumes[4].regions[0].teleportPos = undefined;
      input.volumes[4].regions[0].teleportYaw = undefined;

      expect(() => validateZoneFile(input)).not.toThrow();
    });
  });
});
