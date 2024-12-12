import { RunSessionTimestamp, User } from '@prisma/client';
import {
  RunValidationError,
  MapZones,
  RunValidationErrorType as ErrorType,
  Tickrates,
  TrackType,
  Segment,
  RunSplits
} from '@momentum/constants';
import * as ReplayFile from '@momentum/formats/replay';
import { CompletedRunSession, ProcessedRun } from './run-session.interface';
import { approxEq } from '@momentum/util-fn';
import { Logger } from '@nestjs/common';

/**
 * Class for managing the parsing of a replay file and validating it against
 * run data
 */
export class RunProcessor {
  readonly buffer: Buffer;
  readonly session: CompletedRunSession;
  readonly user: User;
  readonly zones: MapZones;
  readonly replayHeader: ReplayFile.ReplayHeader;
  readonly splits: RunSplits;

  static readonly logger = new Logger('Run Processor');

  private constructor(
    buffer: Buffer,
    session: CompletedRunSession,
    user: User
  ) {
    try {
      this.buffer = buffer;
      this.session = session;
      this.user = user;
      this.zones = JSON.parse(session.mmap.currentVersion.zones);
      this.replayHeader = ReplayFile.Reader.readHeader(this.buffer);
      this.splits = ReplayFile.Reader.readRunSplits(this.buffer);
    } catch {
      throw new RunValidationError(ErrorType.BAD_REPLAY_FILE);
    }
  }

  /** @throws {RunValidationError} */
  static parse(buffer: Buffer, session: CompletedRunSession, user: User) {
    return new RunProcessor(buffer, session, user);
  }

  /** @throws {RunValidationError} */
  validateSessionTimestamps() {
    const { timestamps, trackType, trackNum } = this.session;

    // Not giving specific reasons for throwing - if this ever happens they
    // an update timed out, the map zones are buggy, or someone's submitting
    // something nefarious. There's better ways to warn the user if they time
    // out, ideally as soon as it happens. If it's something nefarious don't
    // help them out with detailed errors.
    //
    // Note that timestamps do NOT include hitting the end zone - hitting the
    // end zone calls the /end endpoint with the replay, and we parse the replay
    // header to determine the final time.

    if (timestamps.length === 0) {
      throw new RunValidationError(ErrorType.BAD_TIMESTAMPS);
    }

    // First minorNum is always 1 (a segment start), regardless of track type
    if (timestamps[0].minorNum !== 1) {
      throw new RunValidationError(ErrorType.BAD_TIMESTAMPS);
    }

    // First timeReached should always be 0
    if (timestamps[0].time !== 0) {
      throw new RunValidationError(ErrorType.BAD_TIMESTAMPS);
    }

    for (let i = 1; i < timestamps.length; i++) {
      // Positive time for other timestamps
      if (timestamps[i].time < 0) {
        throw new RunValidationError(ErrorType.BAD_TIMESTAMPS);
      }

      // Check creationDate is always increasing. If equal, zones are probably
      // fucked, throwing here could cause some confusion, but probably best
      // to never allow and should get figured out during map review.
      if (!(timestamps[i].createdAt > timestamps[i - 1].createdAt)) {
        throw new RunValidationError(ErrorType.BAD_TIMESTAMPS);
      }
    }

    // Check for duplicates
    if (
      new Set(
        timestamps.map(
          // Random bitshift to combine segment and checkpoint into single
          // unique number used by Set ctor's uniqueness comparison
          ({ majorNum, minorNum }) => (majorNum << 8) | minorNum
        )
      ).size !== timestamps.length
    ) {
      throw new RunValidationError(ErrorType.BAD_TIMESTAMPS);
    }

    // Stage or bonus runs
    if (trackType !== TrackType.MAIN) {
      // majorNum is always 1 for stages/bonuses
      if (!timestamps.every(({ majorNum }) => majorNum === 1)) {
        throw new RunValidationError(ErrorType.BAD_TIMESTAMPS);
      }

      const segment =
        trackType === TrackType.STAGE
          ? this.zones.tracks.main.zones.segments[trackNum - 1]
          : this.zones.tracks.bonuses[trackNum - 1].zones.segments[0];

      this.validateSegment(segment, timestamps);

      return;
    }

    // Main track runs from here on out.
    // Segments are always ordered and required!
    const { zones } = this.zones.tracks.main;

    // trackNum must always be 1
    if (trackNum !== 1) {
      throw new RunValidationError(ErrorType.BAD_TIMESTAMPS);
    }

    // Check first timestamp is in first segment and last timestamp is in last
    if (
      timestamps[0].majorNum !== 1 ||
      timestamps.at(-1).majorNum !== zones.segments.length
    ) {
      throw new RunValidationError(ErrorType.BAD_TIMESTAMPS);
    }

    // Validate first segment
    // Check ordered, validate segments as we go
    let lastMajor = 1;
    let majorStartIndex = 0;
    timestamps.forEach(({ majorNum }, index) => {
      // Incr til we hit a new major segment
      if (majorNum === lastMajor) {
        return;
      }

      if (majorNum !== lastMajor + 1) {
        throw new RunValidationError(ErrorType.BAD_TIMESTAMPS);
      }

      // Validate the *previous segment* whose timestamps we just traversed
      // entirely
      this.validateSegment(
        zones.segments[lastMajor - 1],
        timestamps.slice(majorStartIndex, index)
      );

      lastMajor = majorNum;
      majorStartIndex = index;
    });

    // Validate last segment
    this.validateSegment(
      zones.segments.at(-1),
      timestamps.slice(majorStartIndex)
    );

    // Check required. Checking and this and that there's no duplicates
    // establishes that every segment has been hit.
    if (
      new Set(timestamps.map(({ majorNum }) => majorNum)).size !==
      zones.segments.length
    ) {
      throw new RunValidationError(ErrorType.BAD_TIMESTAMPS);
    }
  }

  private validateSegment(
    { checkpoints, checkpointsRequired, checkpointsOrdered }: Segment,
    timestamps: RunSessionTimestamp[]
  ) {
    // First minor is always the start zone. It's never possible to skip a
    // start zone.
    if (timestamps[0].minorNum !== 1) {
      throw new RunValidationError(ErrorType.BAD_TIMESTAMPS);
    }

    if (checkpointsOrdered) {
      for (let i = 1; i < timestamps.length; i++) {
        if (timestamps[i].minorNum <= timestamps[i - 1].minorNum) {
          throw new RunValidationError(ErrorType.BAD_TIMESTAMPS);
        }
      }
    }

    let expectedTimestamps = checkpoints.length;
    const isLastSegment =
      timestamps[0].majorNum ===
      Math.max(...timestamps.map(({ majorNum }) => majorNum));

    // If stagesEndAtStageStarts is true then timestamps should contain every
    // minor segment, since the end zone is either the first minor of the next
    // major, or the main track's end zone.
    // If false, the end zone is the final minor seg of the current major seg,
    // so the timestamps should contain every checkpoint except the last, for
    // every stage *except* the last one.
    // Remember, the /end request sent on hitting the end zone doesn't have a
    // timestamp.
    if (
      this.session.trackType === TrackType.STAGE &&
      !this.zones.tracks.main.stagesEndAtStageStarts &&
      !isLastSegment
    ) {
      expectedTimestamps--;
    }

    if (checkpointsRequired && timestamps.length !== expectedTimestamps)
      throw new RunValidationError(ErrorType.BAD_TIMESTAMPS);
  }

  /** @throws {RunValidationError} */
  validateReplayHeader() {
    const { session, replayHeader: header } = this;

    if (header.trackType !== session.trackType)
      throw new RunValidationError(ErrorType.BAD_META);

    if (header.trackNum !== session.trackNum)
      throw new RunValidationError(ErrorType.BAD_META);

    if (header.magic !== ReplayFile.REPLAY_MAGIC)
      throw new RunValidationError(ErrorType.BAD_META);

    if (
      header.mapHash.toUpperCase() !==
      session.mmap.currentVersion.bspHash.toUpperCase()
    )
      throw new RunValidationError(ErrorType.BAD_META);

    if (header.mapName !== session.mmap.name)
      throw new RunValidationError(ErrorType.BAD_META);

    if (header.playerSteamID !== this.user.steamID)
      throw new RunValidationError(ErrorType.BAD_META);

    if (header.gamemode !== session.gamemode)
      throw new RunValidationError(ErrorType.BAD_META);

    if (!approxEq(header.tickInterval, Tickrates.get(session.gamemode)))
      throw new RunValidationError(ErrorType.OUT_OF_SYNC);

    // Note: runTime is in seconds, but in general, this code and tests uses ms
    // everywhere, try to stay consistent and convert any second-based values
    // to ms immediately.
    const headerRunTime = header.runTime * 1000;

    // Header timestamp is unix time in seconds
    const headerTimestamp = Number(header.timestamp) * 1000;
    const now = Date.now();

    const submitDelay = now - headerTimestamp;
    const acceptableSubmitDelay = 10_000 + Math.min(headerRunTime / 60, 20_000);

    if (
      // Negative submit delay could theoretically happen if the run start
      // request arrives late, but end request is on time - allow a 1s margin.
      submitDelay < -1000 ||
      // 10,000 ms (10 seconds) for the timer stage -> end record -> submit,
      // then we add a second for every minute in the replay so longer replays
      // have more time to submit, up to a max of 20,000 ms. These constants are
      // assumed by unit tests, if changing them, change tests to.
      submitDelay > acceptableSubmitDelay ||
      // Timestamp in the future makes no sense.
      headerTimestamp > now
    ) {
      // Curious how often we see this fail, current value may be a bit harsh.
      RunProcessor.logger.warn(
        `Rejecting run with submit delay of ${submitDelay / 1000}s. ` +
          `SessionID: ${this.session.id.toString()}, ` +
          `UserID: ${this.user.id.toString()}, ` +
          `Session start: ${this.session.createdAt.toISOString()}, ` +
          `Now: ${new Date().toISOString()}, ` +
          `Replay run time: ${header.runTime}, ` +
          `Replay timestamp: ${headerTimestamp}, ` +
          `Acceptable submit delay: ${acceptableSubmitDelay}`
      );

      throw new RunValidationError(ErrorType.OUT_OF_SYNC);
    }
  }

  validateRunSplits() {
    const startTime = this.session.createdAt.getTime();

    // Flatten subsegments so for easier comparison against timestamps,
    // calculate majorNum artificially for checking
    const subsegs = this.splits.segments.flatMap(({ subsegments }, index) =>
      subsegments.map((ss) => ({ ...ss, majorNum: index + 1 }))
    );

    if (subsegs.length !== this.session.timestamps.length)
      throw new RunValidationError(ErrorType.OUT_OF_SYNC);

    this.session.timestamps.forEach(
      ({ majorNum, minorNum, createdAt }, tsIndex) => {
        const subseg = subsegs[tsIndex];

        if (
          !subseg ||
          subseg.majorNum !== majorNum ||
          subseg.minorNum !== minorNum
        )
          throw new RunValidationError(ErrorType.OUT_OF_SYNC);

        const sessionTime = createdAt.getTime() - startTime;
        const desync = sessionTime - subseg.timeReached * 1000;
        // Occasionally we get a slight negative desync, probably
        // due to C time() function vs JS Date.now() - allow a 1s margin.
        // Then, allow desync of 5s, max acceptable time between replay split
        // being written, and request hitting out server. Again, hardcoded
        // constant also used by tests, if changing, change tests.
        if (desync < -1000 || desync > 5000)
          throw new RunValidationError(ErrorType.OUT_OF_SYNC);
      }
    );
  }

  getProcessed(): ProcessedRun {
    return {
      userID: this.user.id,
      mapID: this.session.mapID,
      gamemode: this.session.gamemode,
      trackType: this.session.trackType,
      trackNum: this.session.trackNum,
      time: this.replayHeader.runTime,
      splits: this.splits,
      flags: []
    };
  }
}
