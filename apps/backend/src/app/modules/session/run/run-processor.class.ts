import { MMap, RunSessionTimestamp, User } from '@prisma/client';
import {
  RunValidationError,
  Gamemode,
  MapZones,
  RunValidationErrorType as ErrorType,
  Tickrates,
  TrackType
} from '@momentum/constants';
import { CompletedRunSession, ProcessedRun } from './run-session.interface';
import { Replay, ReplayFileReader } from '@momentum/formats';

/**
 * Class for managing the parsing of a replay file and validating it against
 * run data
 */
export class RunProcessor {
  replayFile: ReplayFileReader;
  replay: Replay;
  timestamps: RunSessionTimestamp[];
  map: MMap;
  zones: MapZones;
  gamemode: Gamemode;
  userID: number;
  steamID: bigint;
  trackType: TrackType;
  trackNum: number;
  startTime: number;

  constructor(buffer: Buffer, session: CompletedRunSession, user: User) {
    this.replayFile = new ReplayFileReader(buffer);
    this.gamemode = session.gamemode;
    this.trackType = session.trackType;
    this.trackNum = session.trackNum;
    this.startTime = session.createdAt.getTime();
    this.timestamps = session.timestamps;
    this.map = session.mmap;
    this.zones = session.mmap.zones as unknown as MapZones; // TODO: #855
    this.userID = user.id;
    this.steamID = user.steamID;
  }

  validateRunSession() {
    // Not giving specific reasons for throwing - if this ever happens they
    // an update timed out, the map zones are buggy, or someone's submitting
    // something nefarious. There's better ways to warn the user if they time
    // out, ideally as soon as it happens. If it's something nefarious don't
    // help them out with detailed errors.
    const err = new RunValidationError(ErrorType.BAD_TIMESTAMPS);

    // Stage or bonus run
    if (this.trackType !== TrackType.MAIN) {
      if (this.timestamps.length === 0) return;

      const { minorRequired, zones } =
        this.trackType === TrackType.STAGE
          ? this.zones.tracks.stages[this.trackNum]
          : this.zones.tracks.bonuses[this.trackNum];

      let prevCP = -1;
      for (const timestamp of this.timestamps) {
        // Stagees/bonuses only have single segment entries
        if (timestamp.segment !== 0) throw err;

        // Stages/bonuses are only minor CPs so always ordered
        if (minorRequired) {
          if (timestamp.checkpoint !== prevCP + 1) throw err;
        } else {
          if (timestamp.checkpoint <= prevCP) throw err;
        }
        prevCP = timestamp.checkpoint;
      }

      // Check that you didn't skip the last minor checkpoint
      if (minorRequired && prevCP !== zones.segments[0].checkpoints.length - 1)
        throw err;

      return;
    }

    // Main track run
    const { majorOrdered, minorRequired, zones } = this.zones.tracks.main;

    let prevTime = -1,
      prevSeg = -1,
      prevCP = -1;
    const completedMajorCPs = [];

    // Timestamps are ordered oldest-first
    for (const timestamp of this.timestamps) {
      // Check time is always increasing
      if (timestamp.time <= prevTime) throw err;
      prevTime = timestamp.time;
      // In same segment
      if (timestamp.segment === prevSeg) {
        // Does this checkpoint actually exist?
        if (
          timestamp.checkpoint >
          zones.segments[timestamp.segment].checkpoints.length
        )
          throw err;

        // Minor checkpoints are always ordered. So if minorRequired is true
        // this checkpoint must be the one after the previous one, otherwise it
        // must just be in increasing order.
        if (minorRequired) {
          if (timestamp.checkpoint !== prevCP + 1) throw err;
        } else {
          if (timestamp.checkpoint <= prevCP) throw err;
        }
        prevCP = timestamp.checkpoint;
      }
      // In a new segment
      else {
        // So we should be in start
        if (timestamp.checkpoint !== 0) throw err;

        // Has already entered this CP before (game shouldn't send a timestamp
        // if this happens)
        if (completedMajorCPs.includes(timestamp.segment)) throw err;

        // Check that you didn't skip the last minor checkpoint of last segment,
        // if minorRequired is true. Minor CPs are also ordered, so this should
        // be final item in the array
        if (
          prevSeg !== -1 &&
          minorRequired &&
          prevCP !== zones.segments[prevSeg].checkpoints.length - 1
        )
          throw err;

        if (majorOrdered && !(timestamp.segment === prevSeg + 1)) throw err;

        prevCP = 0; // == timestamp.checkpoint
        if (prevSeg !== -1) completedMajorCPs.push(prevSeg);
        prevSeg = timestamp.segment;
      }
    }

    // Hitting end zone completels final major CP, but /end request doesn't
    // create a timestamp.
    completedMajorCPs.push(prevSeg);

    // Check ever major CPs was hit
    if (completedMajorCPs.length !== zones.segments.length) throw err;
  }

  processReplayFileHeader() {
    try {
      this.replay = {
        ...this.replayFile.readHeader(),
        overallStats: null,
        zoneStats: [],
        frames: []
      };
    } catch {
      throw new RunValidationError(ErrorType.BAD_REPLAY_FILE);
    }
    this.validateReplayHeader();
  }

  private validateReplayHeader() {
    const ticks = this.replay.header.stopTick - this.replay.header.startTick;
    const nowDate = Date.now();
    const sessionDiff = nowDate - this.startTime;
    const runTime = ticks * this.replay.header.tickRate;
    const epsilon = 0.000001;

    // Old api performs this check (https://github.com/momentum-mod/website/blob/369072802447e91cfdd7637a5e66fd9faa109a0c/server/src/models/run.js#L128)
    // but, if it fails, sends it back to the client for some reason. Do we
    // want to start invalidating if this fails?
    /*
        // 5 seconds for the stop tick -> end record -> submit, then we add a second for every minute in the replay
        // so longer replays have more time to submit, up to a max of 10 seconds
        const runToSessionDiff = Math.abs(sessionDiff - runTime * 1000.0) / 1000.0;
        const sesCheck = runToSessionDiff < 5.0 + Math.min(Math.floor(runTime / 60.0), 10.0);
        if (!sesCheck) {

        }
         */

    // prettier-ignore
    this.validate([
      [this.replayFile.isOK,                                  ErrorType.BAD_REPLAY_FILE],
      [this.trackNum === this.replay.header.trackNum,         ErrorType.BAD_META],
      [this.replay.magic === 0x524D4F4D,                      ErrorType.BAD_META],
      [this.replay.header.steamID === this.steamID,           ErrorType.BAD_META],
      [this.replay.header.mapHash === this.map.hash,          ErrorType.BAD_META],
      [this.replay.header.mapName === this.map.name,          ErrorType.BAD_META],
      [ticks > 0,                                             ErrorType.BAD_TIMESTAMPS],
      // TODO: Dunno what's going on with these yet
      // [this.replay.header.trackNum === this.trackNum,         ErrorType.BAD_META],
      // [this.replay.header.runFlags === 0,                     ErrorType.BAD_META], // Remove after runFlags are added
      // [this.replay.header.zoneNum === this.trackType,           ErrorType.BAD_META],
      [!Number.isNaN(Number(this.replay.header.runDate)),     ErrorType.BAD_REPLAY_FILE],
      [Number(this.replay.header.runDate) <= nowDate,         ErrorType.OUT_OF_SYNC],
      [Math.abs(this.replay.header.tickRate
        - Tickrates.get(this.gamemode))
        < epsilon,                                            ErrorType.OUT_OF_SYNC],
      [runTime * 1000 <= sessionDiff,                         ErrorType.OUT_OF_SYNC],
    ]);
  }

  processReplayFileContents(): ProcessedRun {
    const ticks = this.replay.header.stopTick - this.replay.header.startTick;

    const overallStats = {
        jumps: 0,
        strafes: 0,
        avgStrafeSync: 0,
        avgStrafeSync2: 0,
        enterTime: 0,
        totalTime: 0,
        velAvg3D: 0,
        velAvg2D: 0,
        velMax3D: 0,
        velMax2D: 0,
        velEnter3D: 0,
        velEnter2D: 0,
        velExit3D: 0,
        velExit2D: 0
      },
      zoneStats = [];
    // TODO: Don't know how replays are changing for 0.10.0 zoneNum -> segment/cp change.
    // Leave out all stats processing for now. Not sure if we'll even parse these
    // in Node in the future.
    // try {
    //   [overallStats, zoneStats] = this.replayFile.readStats(
    //     this.replay.header.zoneNum === 0,
    //     this.replay.header.tickRate
    //   );
    // } catch {
    //   throw new RunValidationError(ErrorType.BAD_REPLAY_FILE);
    // }
    //
    // // prettier-ignore
    // this.validate([
    //   [overallStats?.jumps < ticks,     ErrorType.FUCKY_BEHAVIOUR],
    //   [overallStats?.strafes < ticks,   ErrorType.FUCKY_BEHAVIOUR]
    // ]);
    //
    // this.replay.overallStats = overallStats;
    // this.replay.zoneStats = zoneStats;
    //
    // try {
    //   this.replayFile.readFrames(this.replay.header.stopTick);
    // } catch {
    //   throw new RunValidationError(ErrorType.BAD_REPLAY_FILE);
    // }

    const time = ticks * this.replay.header.tickRate;

    return {
      mapID: this.map.id,
      userID: this.userID,
      trackNum: this.replay.header.trackNum,
      time: time,
      flags: this.replay.header.runFlags,
      gamemode: this.gamemode,
      trackType: this.trackType, // TODO: Isn't stored in replay yet
      stats: { overall: overallStats, zones: zoneStats }
    };
  }

  private validate(validations: [boolean, ErrorType][]): void {
    for (const [passed, errorType] of validations) {
      if (!passed) throw new RunValidationError(errorType);
    }
  }
}
