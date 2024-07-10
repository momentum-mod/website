import { MMap, RunSessionTimestamp, User } from '@prisma/client';
import {
  RunValidationError,
  Gamemode,
  MapZones,
  RunValidationErrorType as ErrorType,
  Tickrates,
  TrackType,
  Segment
} from '@momentum/constants';
import { Replay, ReplayFileReader } from '@momentum/formats/replay';
import { CompletedRunSession, ProcessedRun } from './run-session.interface';

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

  validateTimestamps() {
    // Not giving specific reasons for throwing - if this ever happens they
    // an update timed out, the map zones are buggy, or someone's submitting
    // something nefarious. There's better ways to warn the user if they time
    // out, ideally as soon as it happens. If it's something nefarious don't
    // help them out with detailed errors.
    //
    // Note that that currently, the timestamps do NOT include hitting the end
    // zone. The game is stupid and can't send a multipart form, and needs to
    // send areplay file, so we determine the final time by parsing the replay,
    // rather than a timestamp. This will probably change in the future!

    if (this.timestamps.length === 0) {
      throw new RunValidationError(ErrorType.BAD_TIMESTAMPS);
    }

    // Check time is always increasing
    for (let i = 1; i < this.timestamps.length; i++) {
      if (this.timestamps[i].time < this.timestamps[i - 1].time) {
        throw new RunValidationError(ErrorType.BAD_TIMESTAMPS);
      }
    }

    // Check for duplicates
    if (
      new Set(
        this.timestamps.map(
          // Random bitshift to combine segment and checkpoint into single
          // unique number used by Set ctor's uniqueness comparison
          ({ segment, checkpoint }) => (segment << 8) | checkpoint
        )
      ).size !== this.timestamps.length
    ) {
      throw new RunValidationError(ErrorType.BAD_TIMESTAMPS);
    }

    // TODO: Ltos of -1s reqired in idnexes when changing trackNum to start at 1!
    // Stage or bonus runs
    if (this.trackType !== TrackType.MAIN) {
      // Only one segment, and must match trackType
      if (
        !this.timestamps.every(
          ({ segment }) => segment === this.trackNum /* - 1 */
        )
      ) {
        throw new RunValidationError(ErrorType.BAD_TIMESTAMPS);
      }

      const segment =
        this.trackType === TrackType.STAGE
          ? this.zones.tracks.main.zones.segments[this.trackNum /* - 1 */]
          : this.zones.tracks.bonuses[this.trackNum /* - 1 */].zones
              .segments[0];

      this.validateSegment(segment, this.timestamps);

      return;
    }

    // Main track runs from here on out.
    // Segments are always ordered and required!
    const { zones } = this.zones.tracks.main;

    // trackNum must always be 0 /* 1 */
    if (this.trackNum !== 0 /* 1 */) {
      throw new RunValidationError(ErrorType.BAD_TIMESTAMPS);
    }

    // Check first timestamp is in first segment and last timestamp is in last
    if (
      this.timestamps[0].segment !== 0 ||
      this.timestamps.at(-1).segment !== zones.segments.length - 1
    ) {
      throw new RunValidationError(ErrorType.BAD_TIMESTAMPS);
    }

    // Check ordered, validate segments as we go
    let lastSegment = 0;
    let segmentStartIndex = 0;
    for (const [index, { segment }] of this.timestamps.entries()) {
      if (segment === lastSegment) {
        continue;
      }

      if (segment !== lastSegment + 1) {
        throw new RunValidationError(ErrorType.BAD_TIMESTAMPS);
      }

      this.validateSegment(
        zones.segments[lastSegment],
        this.timestamps.slice(segmentStartIndex, index)
      );

      lastSegment = segment;
      segmentStartIndex = index;
    }

    // Validate last segment
    this.validateSegment(
      zones.segments.at(-1),
      this.timestamps.slice(segmentStartIndex)
    );

    // Check required. Checking and this and that there's no duplicates
    // establishes that every segment has been hit.
    if (
      new Set(this.timestamps.map(({ segment }) => segment)).size !==
      zones.segments.length
    ) {
      throw new RunValidationError(ErrorType.BAD_TIMESTAMPS);
    }
  }

  private validateSegment(
    { checkpoints, checkpointsRequired, checkpointsOrdered }: Segment,
    timestamps: RunSessionTimestamp[]
  ) {
    // First checkpoint is always the start zone. It's never possible to skip a
    // start zone.
    if (timestamps[0].checkpoint !== 0) {
      throw new RunValidationError(ErrorType.BAD_TIMESTAMPS);
    }

    if (checkpointsOrdered) {
      for (let i = 1; i < timestamps.length; i++) {
        if (timestamps[i].checkpoint <= timestamps[i - 1].checkpoint) {
          throw new RunValidationError(ErrorType.BAD_TIMESTAMPS);
        }
      }
    }

    let expectedTimestamps = checkpoints.length;

    // If stagesEndAtStageStarts is true then then timestamps should
    // contain every checkpoint, since the end zone is either the first cp
    // of the next segment, or the main track's end zone.
    // If false, the end zone is the final checkpoint of the current segment,
    // so the timestamps should contain every checkpoint except the last.
    // Remember, the /end request sent on hitting the end zone doesn't have a
    // timestamp.
    if (
      this.trackType === TrackType.STAGE &&
      !this.zones.tracks.main.stagesEndAtStageStarts
    )
      expectedTimestamps -= 1;

    if (checkpointsRequired && timestamps.length !== expectedTimestamps)
      throw new RunValidationError(ErrorType.BAD_TIMESTAMPS);
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
      flags: [this.replay.header.runFlags],
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
