import { RunProcessor } from './run-processor.class';
import {
  Gamemode,
  RunValidationError,
  TrackType,
  RunValidationErrorType as ErrorType,
  BonusTrack,
  Segment,
  RunSplits,
  MapZones
} from '@momentum/constants';
import * as ReplayFile from '@momentum/formats/replay';
import { User } from '@prisma/client';
import { ZonesStub } from '@momentum/formats/zone';
import { ReplayHeader } from '@momentum/formats/replay';
import { CompletedRunSession } from './run-session.interface';
import { PartialDeep } from 'type-fest';
import deepmerge from '@fastify/deepmerge';

describe('RunProcessor', () => {
  const BASE_TIME = ReplayFile.Stubs.BaseTime;

  beforeAll(() => {
    jest.useFakeTimers();
  });

  beforeEach(() => {
    jest.setSystemTime(BASE_TIME);
  });

  const DefaultSession: CompletedRunSession = {
    gamemode: Gamemode.BHOP,
    trackType: TrackType.MAIN,
    trackNum: 1,
    createdAt: new Date(ReplayFile.Stubs.BaseTime),
    timestamps: [],
    mapID: 1,
    userID: 1,
    id: 1n,
    mmap: {
      id: 1,
      name: 'bhop_map',
      currentVersion: {
        zones: JSON.stringify(ZonesStub),
        bspHash: 'A'.repeat(40)
      }
    } as any,
    user: { id: 1, steamID: 1n } as any
  };

  const DefaultUser: User = { id: 1, steamID: 1n } as any;
  const DefaultReplayHeader = ReplayFile.Stubs.ReplayHeaderStub;
  const DefaultSplits = ReplayFile.Stubs.RunSplitsStub;

  interface ProcessorOverrides {
    header?: Partial<ReplayHeader>;
    splits?: Partial<RunSplits>;
    session?: PartialDeep<CompletedRunSession, { recurseIntoArrays: true }>;
    user?: PartialDeep<User>;
    zones?: MapZones;
  }

  function createProcessor({
    header,
    splits,
    session,
    user,
    zones
  }: ProcessorOverrides = {}) {
    const buffer = Buffer.alloc(400000);
    const merge = deepmerge({ all: true });

    ReplayFile.Writer.writeHeader(
      merge(DefaultReplayHeader, header ?? {}) as ReplayHeader,
      buffer
    );
    ReplayFile.Writer.writeRunSplits(
      merge(DefaultSplits, splits ?? {}) as RunSplits,
      buffer
    );

    const mergedSession = merge(
      DefaultSession,
      session ?? {}
    ) as CompletedRunSession;
    if (zones) {
      mergedSession.mmap.currentVersion.zones = JSON.stringify(zones);
    }

    return RunProcessor.parse(
      buffer,
      mergedSession,
      merge(DefaultUser, user ?? {}) as User
    );
  }

  /** @returns createdAt time */
  function cat(time: number): Date {
    return new Date(ReplayFile.Stubs.BaseTime + time);
  }

  // prettier-ignore
  describe('validateRunSession', () => {
    function expectPass(args: ProcessorOverrides = {}) {
      expect(() =>
        createProcessor(args).validateSessionTimestamps()
      ).not.toThrow();
    }

    function expectFail(args: ProcessorOverrides = {}) {
      expect(() => createProcessor(args).validateSessionTimestamps()).toThrow(
        new RunValidationError(ErrorType.BAD_TIMESTAMPS)
      );
    }

    describe('main track', () => {
      it('should not throw for valid timestamps', () => {
        expectPass({
          session: {
            timestamps: [
              { createdAt: cat(0),    time: 0,    majorNum: 1, minorNum: 1 },
              { createdAt: cat(1000), time: 1000, majorNum: 1, minorNum: 2 },
              { createdAt: cat(2000), time: 1000, majorNum: 2, minorNum: 1 },
              { createdAt: cat(3000), time: 1000, majorNum: 2, minorNum: 2 }
            ]
          }
        });
      });

      it('should throw for empty timestamps', () => {
        expectFail({});
      });

      it('should throw if first timestamp does not have a time value of 0', () => {
        expectFail({
          session: {
            timestamps: [
              { createdAt: cat(0),    time: 1,    majorNum: 1, minorNum: 1 },
              { createdAt: cat(1000), time: 1000, majorNum: 1, minorNum: 2 },
              { createdAt: cat(2000), time: 1000, majorNum: 2, minorNum: 1 },
              { createdAt: cat(3000), time: 1000, majorNum: 2, minorNum: 2 }
            ]
          }
        });
      })

      it('should throw if trackNum is not 1', () => {
        expectFail({
          session: {
            trackNum: 2,
            timestamps: [
              { createdAt: cat(0),    time: 0,    majorNum: 1, minorNum: 1 },
              { createdAt: cat(1000), time: 1000, majorNum: 1, minorNum: 2 },
              { createdAt: cat(2000), time: 1000, majorNum: 2, minorNum: 1 },
              { createdAt: cat(3000), time: 1000, majorNum: 2, minorNum: 2 }
            ]
          }
        });

        expectFail({
          session: {
            trackNum: 0,
            timestamps: [
              { createdAt: cat(0),    time: 0,    majorNum: 1, minorNum: 1 },
              { createdAt: cat(1000), time: 1000, majorNum: 1, minorNum: 2 },
              { createdAt: cat(2000), time: 1000, majorNum: 2, minorNum: 1 },
              { createdAt: cat(3000), time: 1000, majorNum: 2, minorNum: 2 }
            ]
          }
        });
      });

      it('should throw for non-increasing timestamps', () => {
        expectFail({
          session: {
            timestamps: [
              { createdAt: cat(0),    time: 0,    majorNum: 1, minorNum: 1 },
              { createdAt: cat(2000), time: 1000, majorNum: 1, minorNum: 2 },
              { createdAt: cat(1000), time: 1000, majorNum: 2, minorNum: 1 },
              { createdAt: cat(3000), time: 1000, majorNum: 2, minorNum: 2 }
            ]
          }
        });
      });

      it('should throw for duplicate timestamps', () => {
        expectFail({
          session: {
            timestamps: [
              { createdAt: cat(0),    time: 0,    majorNum: 0, minorNum: 0 },
              { createdAt: cat(1000), time: 1000, majorNum: 0, minorNum: 1 },
              { createdAt: cat(2000), time: 1000, majorNum: 1, minorNum: 0 },
              { createdAt: cat(2100), time: 1000, majorNum: 1, minorNum: 0 },
              { createdAt: cat(3000), time: 1000, majorNum: 1, minorNum: 1 }
            ]
          }
        });
      });

      it('should throw for missing segments', () => {
        const zones = structuredClone(ZonesStub);
        zones.tracks.main.zones.segments.push(
          zones.tracks.main.zones.segments[0]
        );

        expectFail({
          session: {
            timestamps: [
              { createdAt: cat(0),    time: 0,    majorNum: 1, minorNum: 1 },
              { createdAt: cat(1000), time: 1000, majorNum: 1, minorNum: 2 },
              { createdAt: cat(2000), time: 1000, majorNum: 2, minorNum: 1 },
              { createdAt: cat(3000), time: 1000, majorNum: 2, minorNum: 2 }
            ]
          },
          zones
        });
      });

      it('should throw for missing timestamps on segments with checkpointsRequired = true', () => {
        const zones = structuredClone(ZonesStub);
        zones.tracks.main.zones.segments.forEach(
          (zone) => (zone.checkpointsRequired = true)
        );

        expectFail({
          session: {
            timestamps: [
              { createdAt: cat(0),    time: 0,    majorNum: 1, minorNum: 1 },
              { createdAt: cat(1000), time: 1000, majorNum: 2, minorNum: 1 },
              { createdAt: cat(2000), time: 1000, majorNum: 2, minorNum: 2 }
            ]
          },
          zones
        });

        expectFail({
          session: {
            timestamps: [
              { createdAt: cat(0),    time: 1000, majorNum: 1, minorNum: 2 },
              { createdAt: cat(1000), time: 1000, majorNum: 2, minorNum: 1 },
              { createdAt: cat(2000), time: 1000, majorNum: 2, minorNum: 2 }
            ]
          },
          zones
        });

        expectFail({
          session: {
            timestamps: [
              { createdAt: cat(0),    time: 0,    majorNum: 1, minorNum: 1 },
              { createdAt: cat(1000), time: 1000, majorNum: 1, minorNum: 2 }
            ]
          },
          zones
        });
      });

      it('should not throw for missing timestamps with checkpointsRequired = false', () => {
        const zones = structuredClone(ZonesStub);
        zones.tracks.main.zones.segments.forEach(
          (zone) => (zone.checkpointsRequired = false)
        );

        expectPass({
          session: {
            timestamps: [
              { createdAt: cat(0),    time: 0,    majorNum: 1, minorNum: 1 },
              { createdAt: cat(1000), time: 1000, majorNum: 2, minorNum: 1 },
              { createdAt: cat(2000), time: 1000, majorNum: 2, minorNum: 2 }
            ]
          },
          zones
        });
      });

      it('should throw if missing timestamp for a start zone even if checkpointsRequired = false', () => {
        const zones = structuredClone(ZonesStub);
        zones.tracks.main.zones.segments.forEach(
          (zone) => (zone.checkpointsRequired = false)
        );

        expectFail({
          session: {
            timestamps: [
              // First checkpoint is *always* the start, must always hit it
              { createdAt: cat(0),    time: 0,    majorNum: 1, minorNum: 2 },
              { createdAt: cat(1000), time: 1000, majorNum: 2, minorNum: 1 },
              { createdAt: cat(2000), time: 1000, majorNum: 2, minorNum: 2 }
            ]
          },
          zones
        });

        expectFail({
          session: {
            timestamps: [
              { createdAt: cat(0),    time: 0,    majorNum: 1, minorNum: 1 },
              { createdAt: cat(1000), time: 1000, majorNum: 1, minorNum: 2 },
              { createdAt: cat(2000), time: 1000, majorNum: 2, minorNum: 2 }
            ]
          },
          zones
        });
      });

      it('should throw for unordered checkpoints when checkpointOrdered = true', () => {
        const zones = structuredClone(ZonesStub);
        const segment = zones.tracks.main.zones.segments[0];
        segment.checkpoints.push(segment.checkpoints[1]);
        segment.checkpointsOrdered = true;

        expectFail({
          session: {
            timestamps: [
              { createdAt: cat(0),    time: 0,    majorNum: 1, minorNum: 1 },
              { createdAt: cat(1000), time: 1000, majorNum: 1, minorNum: 3 },
              { createdAt: cat(1500), time: 1000, majorNum: 1, minorNum: 2 },
              { createdAt: cat(2000), time: 1000, majorNum: 2, minorNum: 1 },
              { createdAt: cat(3000), time: 1000, majorNum: 2, minorNum: 2 }
            ]
          },
          zones
        });
      });

      it('should not throw for unordered checkpoints when checkpointOrdered = false', () => {
        const zones = structuredClone(ZonesStub);
        const segment = zones.tracks.main.zones.segments[0];
        segment.checkpoints.push(segment.checkpoints[1]);
        segment.checkpointsOrdered = false;

        expectPass({
          session: {
            timestamps: [
              { createdAt: cat(0),    time: 0,    majorNum: 1, minorNum: 1 },
              { createdAt: cat(1000), time: 1000, majorNum: 1, minorNum: 3 },
              { createdAt: cat(1500), time: 1000, majorNum: 1, minorNum: 2 },
              { createdAt: cat(2000), time: 1000, majorNum: 2, minorNum: 1 },
              { createdAt: cat(3000), time: 1000, majorNum: 2, minorNum: 2 }
            ]
          },
          zones
        });
      });
    });

    describe('stages', () => {
      it('should not throw for valid timestamps', () => {
        expectPass({
          session: {
            trackType: TrackType.STAGE,
            timestamps: [
              { createdAt: cat(0),    time: 0,    majorNum: 1, minorNum: 1 },
              { createdAt: cat(1000), time: 1000, majorNum: 1, minorNum: 2 }
            ]
          }
        });
      });

      it('should throw if trackNum does not match timestamp segment', () => {
        expectFail({
          session: {
            trackType: TrackType.STAGE,
            timestamps: [
              { time: 0, majorNum: 1, minorNum: 0 },
              { time: 10000, majorNum: 1, minorNum: 1 }
            ]
          }
        });
      });

      it('should throw for missing start zone even when checkpointsRequired = false', () => {
        const zones = structuredClone(ZonesStub);
        zones.tracks.main.zones.segments[0].checkpointsRequired = false;

        expectFail({
          session: {
            trackType: TrackType.STAGE,
            timestamps: [{ time: 10000, majorNum: 0, minorNum: 1 }]
          },
          zones
        });
      });

      it('should throw for missing timestamps when checkpointsRequired = true', () => {
        const zones = structuredClone(ZonesStub);
        zones.tracks.main.zones.segments[0].checkpointsRequired = true;

        expectFail({
          session: {
            trackType: TrackType.STAGE,
            timestamps: [{ time: 0, majorNum: 0, minorNum: 0 }]
          },
          zones
        });
      });

      it('should expect 1 less timestamps than checkpoints if checkpointsRequired = true and stagesEndAtStageStarts = false', () => {
        const zones = structuredClone(ZonesStub);
        const track = zones.tracks.main;
        track.zones.segments[0].checkpointsRequired = true;
        track.stagesEndAtStageStarts = true;

        expectPass({
          session: {
            trackType: TrackType.STAGE,
            timestamps: [
              { time: 0, majorNum: 0, minorNum: 0 },
              { time: 10000, majorNum: 0, minorNum: 1 }
            ]
          },
          zones
        });

        expectFail({
          session: {
            trackType: TrackType.STAGE,
            timestamps: [{ time: 0, majorNum: 0, minorNum: 0 }]
          },
          zones
        });

        track.stagesEndAtStageStarts = false;

        expectFail({
          session: {
            trackType: TrackType.STAGE,
            timestamps: [
              { time: 0, majorNum: 0, minorNum: 0 },
              { time: 10000, majorNum: 0, minorNum: 1 }
            ]
          },
          zones
        });

        expectPass({
          session: {
            trackType: TrackType.STAGE,
            timestamps: [{ time: 0, majorNum: 0, minorNum: 0 }]
          },
          zones
        });
      });

      it('should not throw for missing timestamps when checkpointsRequired = false', () => {
        const zones = structuredClone(ZonesStub);
        zones.tracks.main.zones.segments[0].checkpointsRequired = false;

        expectPass({
          session: {
            trackType: TrackType.STAGE,
            timestamps: [{ time: 0, majorNum: 0, minorNum: 0 }]
          },
          zones
        });
      });

      it('should throw for unordered timestamps if checkpointsOrdered = true', () => {
        const zones = structuredClone(ZonesStub);
        const segment = zones.tracks.main.zones.segments[0];

        segment.checkpointsOrdered = true;
        segment.checkpoints.push(segment.checkpoints[1]);

        expectFail({
          session: {
            trackType: TrackType.STAGE,
            timestamps: [
              { time: 0, majorNum: 0, minorNum: 0 },
              { time: 10000, majorNum: 0, minorNum: 2 },
              { time: 15000, majorNum: 0, minorNum: 1 }
            ]
          },
          zones
        });
      });

      it('should not throw for unordered timestamps if checkpointsOrdered = false', () => {
        const zones = structuredClone(ZonesStub);
        const segment = zones.tracks.main.zones.segments[0];

        segment.checkpointsOrdered = false;
        segment.checkpoints.push(segment.checkpoints[1]);

        expectPass({
          session: {
            trackType: TrackType.STAGE,
            timestamps: [
              { time: 0, majorNum: 0, minorNum: 0 },
              { time: 10000, majorNum: 0, minorNum: 2 },
              { time: 1500000, majorNum: 0, minorNum: 1 }
            ]
          },
          zones
        });
      });
    });

    describe('bonuses', () => {
      let zones: MapZones;
      let bonus: BonusTrack;
      let segment: Segment;

      beforeEach(() => {
        zones = structuredClone(ZonesStub);
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
          session: {
            trackType: TrackType.BONUS,
            trackNum: 1,
            timestamps: [
              { time: 0, majorNum: 0, minorNum: 0 },
              { time: 10000, majorNum: 0, minorNum: 1 },
              { time: 20000, majorNum: 0, minorNum: 2 }
            ]
          },
          zones
        });
      });

      it('should throw if trackNum does not match timestamp segment', () => {
        expectFail({
          session: {
            trackType: TrackType.BONUS,
            trackNum: 2,
            timestamps: [
              { time: 0, majorNum: 0, minorNum: 0 },
              { time: 10000, majorNum: 0, minorNum: 1 },
              { time: 20000, majorNum: 0, minorNum: 2 }
            ]
          },
          zones
        });
      });

      it('should throw for missing start zone even when checkpointsRequired = false', () => {
        segment.checkpointsRequired = false;

        expectFail({
          session: {
            trackType: TrackType.BONUS,
            timestamps: [
              { time: 10000, majorNum: 0, minorNum: 1 },
              { time: 20000, majorNum: 0, minorNum: 2 }
            ]
          },
          zones
        });
      });

      it('should throw for missing timestamps when checkpointsRequired = true', () => {
        segment.checkpointsRequired = true;

        expectFail({
          session: {
            trackType: TrackType.BONUS,
            timestamps: [
              { time: 0, majorNum: 0, minorNum: 0 },
              { time: 20000, majorNum: 0, minorNum: 2 }
            ]
          },
          zones
        });
      });

      it('should not throw for missing timestamps when checkpointsRequired = false', () => {
        segment.checkpointsRequired = false;

        expectPass({
          session: {
            trackType: TrackType.BONUS,
            timestamps: [
              { time: 0, majorNum: 0, minorNum: 0 },
              { time: 20000, majorNum: 0, minorNum: 2 }
            ]
          },
          zones
        });
      });

      it('should throw for unordered timestamps if checkpointsOrdered = true', () => {
        segment.checkpointsOrdered = true;

        expectFail({
          session: {
            trackType: TrackType.BONUS,
            timestamps: [
              { time: 0, majorNum: 0, minorNum: 0 },
              { time: 10000, majorNum: 0, minorNum: 2 },
              { time: 15000, majorNum: 0, minorNum: 1 }
            ]
          },
          zones
        });
      });

      it('should not throw for unordered timestamps if checkpointsOrdered = false', () => {
        segment.checkpointsOrdered = false;

        expectPass({
          session: {
            trackType: TrackType.BONUS,
            timestamps: [
              { time: 0, majorNum: 0, minorNum: 0 },
              { time: 10000, majorNum: 0, minorNum: 2 },
              { time: 1500000, majorNum: 0, minorNum: 1 }
            ]
          },
          zones
        });
      });
    });
  });

  describe('validateReplayHeader', () => {
    let processor: RunProcessor;
    const timestamps = [
      { time: 0, majorNum: 0, minorNum: 0 },
      { time: 10000, majorNum: 0, minorNum: 1 },
      { time: 20000, majorNum: 1, minorNum: 0 },
      { time: 30000, majorNum: 1, minorNum: 1 }
    ];
    const runTime = ReplayFile.Stubs.ReplayHeaderStub.runTime * 1000;

    function expectPass() {
      expect(() => processor.validateReplayHeader()).not.toThrow();
    }

    function expectFail(error: ErrorType) {
      expect(() => processor.validateReplayHeader()).toThrow(
        new RunValidationError(error)
      );
    }

    it('should not throw for a valid header and run time', () => {
      processor = createProcessor({ session: { timestamps } });

      jest.advanceTimersByTime(runTime);

      expectPass();
    });

    it('should throw if run time is out of sync', () => {
      // Run time is 40s, we're at 0s - should throw
      processor = createProcessor({ session: { timestamps } });
      expectFail(ErrorType.OUT_OF_SYNC);

      // Appropriate time has passed - should not throw
      jest.advanceTimersByTime(runTime);
      processor = createProcessor({ session: { timestamps } });
      expectPass();

      // Now we're too far into future - should throw
      jest.advanceTimersByTime(runTime);
      expectFail(ErrorType.OUT_OF_SYNC);
    });

    // Super precise tests - these will break if acceptableSubmitDelay
    // constants are changed!
    it('should throw if run time is out of sync - submitDelay < -1', () => {
      processor = createProcessor({ session: { timestamps } });

      // Slightly too early
      jest.advanceTimersByTime(runTime - 1100);
      expectFail(ErrorType.OUT_OF_SYNC);

      // Just over
      jest.advanceTimersByTime(1100);
      expectPass();
    });

    it('should throw if run time is out of sync - submitDelay > acceptableSubmitDelay', () => {
      processor = createProcessor({
        session: { timestamps },
        // Hack to get timestamp check to pass
        header: {
          timestamp: BigInt(ReplayFile.Stubs.BaseTime + runTime + 10600)
        }
      });

      // Acceptable submit delay is 10s + 1s for every minute, run time is 40s
      // so acceptable delay is 10s + 40 / 60 = 10s + 0.666...s = 10.666...s
      jest.advanceTimersByTime(runTime + 10000 + 600);
      expectPass();

      // Just over the max
      jest.advanceTimersByTime(67);
      expectFail(ErrorType.OUT_OF_SYNC);
    });

    it('should throw if header timestamp is too far in the past', () => {
      processor = createProcessor({
        session: { timestamps },
        header: {
          timestamp: BigInt(ReplayFile.Stubs.BaseTime + runTime - 1001)
        }
      });

      jest.advanceTimersByTime(runTime);

      expectFail(ErrorType.OUT_OF_SYNC);
    });

    it('should throw if header timestamp is in the future', () => {
      processor = createProcessor({
        session: { timestamps },
        header: {
          timestamp: BigInt(ReplayFile.Stubs.BaseTime + runTime + 100)
        }
      });

      jest.advanceTimersByTime(runTime);

      expectFail(ErrorType.OUT_OF_SYNC);
    });

    it('should throw for mismatching trackType', () => {
      processor = createProcessor({
        session: { timestamps },
        header: { trackType: TrackType.STAGE }
      });

      jest.advanceTimersByTime(runTime);

      expectFail(ErrorType.BAD_META);

      processor = createProcessor({
        session: { timestamps, trackType: TrackType.STAGE }
      });

      jest.advanceTimersByTime(runTime);

      expectFail(ErrorType.BAD_META);
    });

    it('should throw for mismatching trackNum', () => {
      processor = createProcessor({
        session: { timestamps },
        header: { trackNum: 2 }
      });

      jest.advanceTimersByTime(runTime);

      expectFail(ErrorType.BAD_META);

      processor = createProcessor({
        session: { timestamps, trackNum: 2 }
      });

      jest.advanceTimersByTime(runTime);

      expectFail(ErrorType.BAD_META);
    });

    it('should throw for bad magic', () => {
      processor = createProcessor({
        session: { timestamps },
        header: { magic: 0 }
      });

      jest.advanceTimersByTime(runTime);

      expectFail(ErrorType.BAD_META);
    });

    it('should throw for mismatching map hash', () => {
      processor = createProcessor({
        session: { timestamps },
        header: { mapHash: 'B'.repeat(40) }
      });

      jest.advanceTimersByTime(runTime);

      expectFail(ErrorType.BAD_META);
    });

    it('should throw for mismatching map name', () => {
      processor = createProcessor({
        session: { timestamps },
        header: { mapName: 'bhop_map2' }
      });

      jest.advanceTimersByTime(runTime);

      expectFail(ErrorType.BAD_META);
    });

    it('should throw for mismatching steamID', () => {
      processor = createProcessor({
        session: { timestamps },
        header: { playerSteamID: 2n }
      });

      jest.advanceTimersByTime(runTime);

      expectFail(ErrorType.BAD_META);
    });

    it('should throw for mismatching gamemode', () => {
      processor = createProcessor({
        session: { timestamps },
        header: { gamemode: Gamemode.SURF }
      });

      jest.advanceTimersByTime(runTime);

      expectFail(ErrorType.BAD_META);
    });

    it('should throw for mismatching tick interval', () => {
      processor = createProcessor({
        session: { timestamps },
        header: { tickInterval: 0.015 }
      });

      jest.advanceTimersByTime(runTime);

      expectFail(ErrorType.OUT_OF_SYNC);
    });
  });

  describe('validateRunSplits', () => {
    let processor: RunProcessor;

    function expectPass() {
      expect(() => processor.validateRunSplits()).not.toThrow();
    }

    function expectFail() {
      expect(() => processor.validateRunSplits()).toThrow(
        new RunValidationError(ErrorType.OUT_OF_SYNC)
      );
    }

    it('should not throw for a valid splits', () => {
      processor = createProcessor({
        session: {
          timestamps: [
            { time: 0, majorNum: 0, minorNum: 0, createdAt: cat(0) },
            { time: 10000, majorNum: 0, minorNum: 1, createdAt: cat(10000) },
            { time: 20000, majorNum: 1, minorNum: 0, createdAt: cat(20000) },
            { time: 30000, majorNum: 1, minorNum: 1, createdAt: cat(30000) }
          ]
        }
      });

      expectPass();
    });

    it('should throw for missing timestamps', () => {
      processor = createProcessor();

      expectFail();
    });

    it('should throw for wrong number of timestamps', () => {
      processor = createProcessor({
        session: {
          timestamps: [
            { time: 0, majorNum: 0, minorNum: 0, createdAt: cat(0) },
            { time: 10000, majorNum: 0, minorNum: 1, createdAt: cat(10000) },
            { time: 20000, majorNum: 1, minorNum: 0, createdAt: cat(20000) }
          ]
        }
      });

      expectFail();
    });

    it('should throw for out of sync splits - negative desync', () => {
      // Throws for any negative desync
      processor = createProcessor({
        session: {
          timestamps: [
            { time: 0, majorNum: 0, minorNum: 0, createdAt: cat(0) },
            { time: 10000, majorNum: 0, minorNum: 1, createdAt: cat(9999) },
            { time: 20000, majorNum: 1, minorNum: 0, createdAt: cat(20000) },
            { time: 30000, majorNum: 1, minorNum: 1, createdAt: cat(30000) }
          ]
        }
      });

      expectFail();
    });

    it('should not throw for out of sync splits - acceptable positive desync', () => {
      processor = createProcessor({
        session: {
          timestamps: [
            { time: 0, majorNum: 0, minorNum: 0, createdAt: cat(0) },
            { time: 10000, majorNum: 0, minorNum: 1, createdAt: cat(14900) },
            { time: 20000, majorNum: 1, minorNum: 0, createdAt: cat(20000) },
            { time: 30000, majorNum: 1, minorNum: 1, createdAt: cat(30000) }
          ]
        }
      });

      expectPass();
    });

    it('should throw for out of sync splits - unacceptable positive desync', () => {
      processor = createProcessor({
        session: {
          timestamps: [
            { time: 0, majorNum: 0, minorNum: 0, createdAt: cat(0) },
            { time: 15000, majorNum: 0, minorNum: 1, createdAt: cat(15001) },
            { time: 20000, majorNum: 1, minorNum: 0, createdAt: cat(20000) },
            { time: 30000, majorNum: 1, minorNum: 1, createdAt: cat(30000) }
          ]
        }
      });

      expectFail();
    });
  });
});
