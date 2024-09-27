import { RunProcessor } from './run-processor.class';
import {
  Gamemode,
  RunValidationError,
  TrackType,
  RunValidationErrorType as ErrorType,
  MapZones,
  BonusTrack,
  Segment
} from '@momentum/constants';
import { RunSessionTimestamp } from '@prisma/client';
import { ZonesStub } from '@momentum/formats/zone';

describe('RunProcessor', () => {
  let zones: MapZones;
  beforeEach(() => {
    zones = structuredClone(ZonesStub);
  });

  const createProcessor = ({
    mapZones = zones,
    timestamps = [] as Array<Partial<RunSessionTimestamp>>,
    trackType = TrackType.MAIN,
    trackNum = 1,
    mapHash = '0'.repeat(40),
    mapName = 'GREGG_WALLACES_WORLD_OF_FUN',
    startTime = Date.now() - 100000
  }) =>
    new RunProcessor(
      Buffer.alloc(0),
      {
        gamemode: Gamemode.AHOP,
        trackType,
        trackNum,
        createdAt: new Date(startTime),
        timestamps: timestamps as any,
        mapID: 1,
        userID: 1,
        id: 1n,
        mmap: {
          id: 1,
          name: mapName,
          currentVersion: { zones: JSON.stringify(mapZones), bspHash: mapHash }
        } as any,
        user: { id: 1, steamID: 1n } as any
      },
      { id: 1, steamID: 1n } as any
    );

  type ProcessorArgs = Parameters<typeof createProcessor>[0];

  const expectPass = (args: ProcessorArgs) => {
    expect(() => createProcessor(args).validateTimestamps()).not.toThrow();
  };

  const expectFail = (args: ProcessorArgs) => {
    expect(() => createProcessor(args).validateTimestamps()).toThrow(
      new RunValidationError(ErrorType.BAD_TIMESTAMPS)
    );
  };

  describe('validateRunSession', () => {
    describe('main track', () => {
      it('should not throw for valid timestamps', () => {
        expectPass({
          timestamps: [
            { time: 100, segment: 0, checkpoint: 0 },
            { time: 200, segment: 0, checkpoint: 1 },
            { time: 300, segment: 1, checkpoint: 0 },
            { time: 400, segment: 1, checkpoint: 1 }
          ]
        });
      });

      it('should throw for empty timestamps', () => {
        expectFail({});
      });

      it('should throw if trackNum is not 1', () => {
        expectFail({
          trackNum: 2,
          timestamps: [
            { time: 100, segment: 0, checkpoint: 0 },
            { time: 200, segment: 0, checkpoint: 1 },
            { time: 300, segment: 1, checkpoint: 0 },
            { time: 400, segment: 1, checkpoint: 1 }
          ]
        });

        expectFail({
          trackNum: 0,
          timestamps: [
            { time: 100, segment: 0, checkpoint: 0 },
            { time: 200, segment: 0, checkpoint: 1 },
            { time: 300, segment: 1, checkpoint: 0 },
            { time: 400, segment: 1, checkpoint: 1 }
          ]
        });
      });

      it('should throw for non-increasing timestamps', () => {
        expectFail({
          timestamps: [
            { time: 200 /* <- out of order */, segment: 0, checkpoint: 0 },
            { time: 100 /* <- out of order */, segment: 0, checkpoint: 1 },
            { time: 300, segment: 1, checkpoint: 0 },
            { time: 400, segment: 1, checkpoint: 1 }
          ]
        });
      });

      it('should throw for duplicate timestamps', () => {
        expectFail({
          timestamps: [
            { time: 100, segment: 0, checkpoint: 0 },
            { time: 200, segment: 0, checkpoint: 1 },
            { time: 300, segment: 1, checkpoint: 0 },
            { time: 301, segment: 1, checkpoint: 0 },
            { time: 400, segment: 1, checkpoint: 1 }
          ]
        });
      });

      it('should throw for missing segments', () => {
        zones.tracks.main.zones.segments.push(
          zones.tracks.main.zones.segments[0]
        );

        expectFail({
          timestamps: [
            { time: 100, segment: 0, checkpoint: 0 },
            { time: 200, segment: 0, checkpoint: 1 },
            { time: 300, segment: 1, checkpoint: 0 },
            { time: 400, segment: 1, checkpoint: 1 }
          ]
        });
      });

      it('should throw for missing timestamps on segments with checkpointsRequired = true', () => {
        zones.tracks.main.zones.segments.forEach(
          (zone) => (zone.checkpointsRequired = true)
        );

        expectFail({
          timestamps: [
            { time: 100, segment: 0, checkpoint: 0 },
            { time: 300, segment: 1, checkpoint: 0 },
            { time: 400, segment: 1, checkpoint: 1 }
          ]
        });

        expectFail({
          timestamps: [
            { time: 200, segment: 0, checkpoint: 1 },
            { time: 300, segment: 1, checkpoint: 0 },
            { time: 400, segment: 1, checkpoint: 1 }
          ]
        });

        expectFail({
          timestamps: [
            { time: 100, segment: 0, checkpoint: 0 },
            { time: 100, segment: 0, checkpoint: 1 }
          ]
        });
      });

      it('should not throw for missing timestamps with checkpointsRequired = false', () => {
        zones.tracks.main.zones.segments.forEach(
          (zone) => (zone.checkpointsRequired = false)
        );

        expectPass({
          timestamps: [
            { time: 100, segment: 0, checkpoint: 0 },
            { time: 300, segment: 1, checkpoint: 0 },
            { time: 400, segment: 1, checkpoint: 1 }
          ]
        });
      });

      it('should throw if missing timestamp for a start zone even if checkpointsRequired = false', () => {
        zones.tracks.main.zones.segments.forEach(
          (zone) => (zone.checkpointsRequired = false)
        );

        expectFail({
          timestamps: [
            // First checkpoint is *always* the start, must always hit it
            { time: 200, segment: 0, checkpoint: 1 },
            { time: 300, segment: 1, checkpoint: 0 },
            { time: 400, segment: 1, checkpoint: 1 }
          ]
        });

        expectFail({
          timestamps: [
            { time: 100, segment: 0, checkpoint: 0 },
            { time: 200, segment: 0, checkpoint: 1 },
            { time: 400, segment: 1, checkpoint: 1 }
          ]
        });
      });

      it('should throw for unordered checkpoints when checkpointOrdered = true', () => {
        const segment = zones.tracks.main.zones.segments[0];
        segment.checkpoints.push(segment.checkpoints[1]);
        segment.checkpointsOrdered = true;

        expectFail({
          timestamps: [
            { time: 100, segment: 0, checkpoint: 0 },
            { time: 200, segment: 0, checkpoint: 2 },
            { time: 250, segment: 0, checkpoint: 1 },
            { time: 300, segment: 1, checkpoint: 0 },
            { time: 400, segment: 1, checkpoint: 1 }
          ]
        });
      });

      it('should not throw for unordered checkpoints when checkpointOrdered = false', () => {
        const segment = zones.tracks.main.zones.segments[0];
        segment.checkpoints.push(segment.checkpoints[1]);
        segment.checkpointsOrdered = false;

        expectPass({
          timestamps: [
            { time: 100, segment: 0, checkpoint: 0 },
            { time: 200, segment: 0, checkpoint: 2 },
            { time: 250, segment: 0, checkpoint: 1 },
            { time: 300, segment: 1, checkpoint: 0 },
            { time: 400, segment: 1, checkpoint: 1 }
          ]
        });
      });
    });

    describe('stages', () => {
      it('should not throw for valid timestamps', () => {
        expectPass({
          trackType: TrackType.STAGE,
          timestamps: [
            { time: 100, segment: 0, checkpoint: 0 },
            { time: 200, segment: 0, checkpoint: 1 }
          ]
        });
      });

      it('should throw if trackNum does not match timestamp segment', () => {
        expectFail({
          trackType: TrackType.STAGE,
          timestamps: [
            { time: 100, segment: 1, checkpoint: 0 },
            { time: 200, segment: 1, checkpoint: 1 }
          ]
        });
      });

      it('should throw for missing start zone even when checkpointsRequired = false', () => {
        zones.tracks.main.zones.segments[0].checkpointsRequired = false;

        expectFail({
          trackType: TrackType.STAGE,
          timestamps: [{ time: 200, segment: 0, checkpoint: 1 }]
        });
      });

      it('should throw for missing timestamps when checkpointsRequired = true', () => {
        zones.tracks.main.zones.segments[0].checkpointsRequired = true;

        expectFail({
          trackType: TrackType.STAGE,
          timestamps: [{ time: 100, segment: 0, checkpoint: 0 }]
        });
      });

      it('should expect 1 less timestamps than checkpoints if checkpointsRequired = true and stagesEndAtStageStarts = false', () => {
        const track = zones.tracks.main;
        track.zones.segments[0].checkpointsRequired = true;
        track.stagesEndAtStageStarts = true;

        expectPass({
          trackType: TrackType.STAGE,
          timestamps: [
            { time: 100, segment: 0, checkpoint: 0 },
            { time: 200, segment: 0, checkpoint: 1 }
          ]
        });

        expectFail({
          trackType: TrackType.STAGE,
          timestamps: [{ time: 100, segment: 0, checkpoint: 0 }]
        });

        track.stagesEndAtStageStarts = false;

        expectFail({
          trackType: TrackType.STAGE,
          timestamps: [
            { time: 100, segment: 0, checkpoint: 0 },
            { time: 200, segment: 0, checkpoint: 1 }
          ]
        });

        expectPass({
          trackType: TrackType.STAGE,
          timestamps: [{ time: 100, segment: 0, checkpoint: 0 }]
        });
      });

      it('should not throw for missing timestamps when checkpointsRequired = false', () => {
        zones.tracks.main.zones.segments[0].checkpointsRequired = false;

        expectPass({
          trackType: TrackType.STAGE,
          timestamps: [{ time: 100, segment: 0, checkpoint: 0 }]
        });
      });

      it('should throw for unordered timestamps if checkpointsOrdered = true', () => {
        const segment = zones.tracks.main.zones.segments[0];

        segment.checkpointsOrdered = true;
        segment.checkpoints.push(segment.checkpoints[1]);

        expectFail({
          trackType: TrackType.STAGE,
          timestamps: [
            { time: 100, segment: 0, checkpoint: 0 },
            { time: 200, segment: 0, checkpoint: 2 },
            { time: 250, segment: 0, checkpoint: 1 }
          ]
        });
      });

      it('should not throw for unordered timestamps if checkpointsOrdered = false', () => {
        const segment = zones.tracks.main.zones.segments[0];

        segment.checkpointsOrdered = false;
        segment.checkpoints.push(segment.checkpoints[1]);

        expectPass({
          trackType: TrackType.STAGE,
          timestamps: [
            { time: 100, segment: 0, checkpoint: 0 },
            { time: 200, segment: 0, checkpoint: 2 },
            { time: 250, segment: 0, checkpoint: 1 }
          ]
        });
      });
    });

    describe('bonuses', () => {
      let bonus: BonusTrack;
      let segment: Segment;

      beforeEach(() => {
        bonus = zones.tracks.bonuses[0];
        segment = bonus.zones.segments[0];

        // ZonesStub bonus only has 1 CP then an end zone, cba to add more since
        // it might break other stuff.
        segment.checkpoints.push(
          segment.checkpoints[0],
          segment.checkpoints[0]
        );
      });

      it('should not throw for valid timestamps', () => {
        expectPass({
          trackType: TrackType.BONUS,
          trackNum: 1,
          timestamps: [
            { time: 100, segment: 0, checkpoint: 0 },
            { time: 200, segment: 0, checkpoint: 1 },
            { time: 300, segment: 0, checkpoint: 2 }
          ]
        });
      });

      it('should throw if trackNum does not match timestamp segment', () => {
        expectFail({
          trackType: TrackType.BONUS,
          trackNum: 2,
          timestamps: [
            { time: 100, segment: 0, checkpoint: 0 },
            { time: 200, segment: 0, checkpoint: 1 },
            { time: 300, segment: 0, checkpoint: 2 }
          ]
        });
      });

      it('should throw for missing start zone even when checkpointsRequired = false', () => {
        segment.checkpointsRequired = false;

        expectFail({
          trackType: TrackType.BONUS,
          timestamps: [
            { time: 200, segment: 0, checkpoint: 1 },
            { time: 300, segment: 0, checkpoint: 2 }
          ]
        });
      });

      it('should throw for missing timestamps when checkpointsRequired = true', () => {
        segment.checkpointsRequired = true;

        expectFail({
          trackType: TrackType.BONUS,
          timestamps: [
            { time: 100, segment: 0, checkpoint: 0 },
            { time: 300, segment: 0, checkpoint: 2 }
          ]
        });
      });

      it('should not throw for missing timestamps when checkpointsRequired = false', () => {
        segment.checkpointsRequired = false;

        expectPass({
          trackType: TrackType.BONUS,
          timestamps: [
            { time: 100, segment: 0, checkpoint: 0 },
            { time: 300, segment: 0, checkpoint: 2 }
          ]
        });
      });

      it('should throw for unordered timestamps if checkpointsOrdered = true', () => {
        segment.checkpointsOrdered = true;

        expectFail({
          trackType: TrackType.BONUS,
          timestamps: [
            { time: 100, segment: 0, checkpoint: 0 },
            { time: 200, segment: 0, checkpoint: 2 },
            { time: 250, segment: 0, checkpoint: 1 }
          ]
        });
      });

      it('should not throw for unordered timestamps if checkpointsOrdered = false', () => {
        segment.checkpointsOrdered = false;

        expectPass({
          trackType: TrackType.BONUS,
          timestamps: [
            { time: 100, segment: 0, checkpoint: 0 },
            { time: 200, segment: 0, checkpoint: 2 },
            { time: 250, segment: 0, checkpoint: 1 }
          ]
        });
      });
    });
  });
});
