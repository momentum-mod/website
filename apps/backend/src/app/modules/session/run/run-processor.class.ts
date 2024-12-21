import { RunSessionTimestamp, User } from '@prisma/client';
import {
  MapZones,
  RunValidationError,
  RunValidationErrorType as ErrorType,
  Segment,
  TickIntervals,
  TrackType,
  RunSplits
} from '@momentum/constants';
import * as ReplayFile from '@momentum/formats/replay';
import { CompletedRunSession, ProcessedRun } from './run-session.interface';

/**
 * Class for managing the parsing of a replay file and validating it against
 * run data
 *
 * I'm tempted to add a more advanced logging system into this that captures
 * exact values that cause run rejection, but code gets complicated, feels like
 * to much work for my current PR. Also not sure whether we should write a bunch
 * to plaintext logs in that case, or send to Sentry.
 */
export class RunProcessor {
  readonly buffer: Buffer;
  readonly session: CompletedRunSession;
  readonly user: User;
  readonly zones: MapZones;
  readonly replayHeader: ReplayFile.ReplayHeader;
  readonly splits: RunSplits.Splits;

  // Could pull out to config file/env if needed
  static readonly Constants = {
    // 10 seconds for the timer stage -> end record -> submit,
    // then we add a second for every minute in the replay so longer replays
    // have more time to submit, up to a max of 30s.
    // Allowed time diff between recording finish and backend validation reached
    AllowedSubmitDelayBase: 10_000,
    AllowedSubmitDelayIncrement: 1000,
    AllowedSubmitDelayMax: 30_000,

    // Allowed time diff between split time and backend timestamp created
    AllowedTimestampDelay: 5000
  };

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

    // First time should always be 0
    if (timestamps[0].time !== 0) {
      throw new RunValidationError(ErrorType.BAD_TIMESTAMPS);
    }

    // We could perform checks on the .time field here, but it's equivalent
    // to runsplits.timeReaches checks later on, easier to do there.

    // Check for duplicates
    if (
      new Set(
        timestamps.map(({ majorNum, minorNum }) => (majorNum << 8) | minorNum)
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

    // Must have incrementing order if checkpointsOrdered
    if (checkpointsOrdered) {
      for (let i = 1; i < timestamps.length; i++) {
        if (timestamps[i].minorNum <= timestamps[i - 1].minorNum) {
          throw new RunValidationError(ErrorType.BAD_TIMESTAMPS);
        }
      }
    }

    // If stagesEndAtStageStarts is true, end zones for stages are the first
    // checkpoint of the next segment for non-final stages, or the end zone of
    // the main track for the final stage. Therefore the number of timestamps
    // should equal the number of checkpoints.
    //
    // If stagesEndAtStageStarts is false, then final checkpoint of the segment
    // is the end zone, so we don't see a timestamp for it, *unless* it's the
    // final segment, in which case it uses the main track's end zone.
    //
    // Main track or bonus track runs always have a dedicated end zone.
    // Remember, in all cases the /end request sent on hitting the end zone
    // doesn't generate a timestamp.
    if (!checkpointsRequired) return;

    if (this.session.trackType === TrackType.STAGE) {
      const isLastSegment =
        this.session.trackNum === this.zones.tracks.main.zones.segments.length;

      if (this.zones.tracks.main.stagesEndAtStageStarts || isLastSegment) {
        if (timestamps.length !== checkpoints.length) {
          throw new RunValidationError(ErrorType.BAD_TIMESTAMPS);
        }
      } else {
        if (timestamps.length !== checkpoints.length - 1) {
          throw new RunValidationError(ErrorType.BAD_TIMESTAMPS);
        }
      }
    } else {
      if (timestamps.length !== checkpoints.length) {
        throw new RunValidationError(ErrorType.BAD_TIMESTAMPS);
      }
    }
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

    if (header.tickInterval !== TickIntervals.get(session.gamemode))
      throw new RunValidationError(ErrorType.OUT_OF_SYNC);

    const {
      AllowedSubmitDelayBase,
      AllowedSubmitDelayIncrement,
      AllowedSubmitDelayMax,
      AllowedTimestampDelay
    } = RunProcessor.Constants;

    // Check timestamps match up with replay start and end times
    //
    //   v sessionStart
    // v runStart                              v header.timestamp    v now
    // |---------------------------------------|---------------------|
    // <--------------------------------------><--------------------->
    //                    ^ headerRunTime                ^ submitDelay

    // Duration of the run (double, in seconds!)
    const headerRunTime = header.runTime * 1000;

    // When the run was started according to replay file
    const runStart = header.timestamp - headerRunTime;

    // When backend says run started
    const sessionStart = this.session.createdAt.getTime();

    const now = Date.now();

    const submitDelay = now - header.timestamp;
    const allowedSubmitDelay =
      AllowedSubmitDelayBase +
      Math.min(
        (AllowedSubmitDelayIncrement * headerRunTime) / 60_000,
        AllowedSubmitDelayMax
      );

    const startDelay = sessionStart - runStart;

    if (
      submitDelay < 0 ||
      submitDelay > allowedSubmitDelay ||
      startDelay < 0 ||
      startDelay > AllowedTimestampDelay
    ) {
      throw new RunValidationError(ErrorType.OUT_OF_SYNC);
    }
  }

  validateRunSplits() {
    // Flatten subsegments so for easier comparison against timestamps,
    // calculate majorNum artificially for checking
    const subsegs = this.splits.segments?.flatMap(({ subsegments }, index) =>
      subsegments.map((ss) => ({ ...ss, majorNum: index + 1 }))
    );

    if (subsegs.length !== this.session.timestamps.length)
      throw new RunValidationError(ErrorType.OUT_OF_SYNC);

    subsegs.forEach((subseg) => {
      // Timestamps are *probably* ordered, but may not be with spotty internet
      const timestamp = this.session.timestamps.find(
        ({ majorNum, minorNum }) =>
          majorNum === subseg.majorNum && minorNum === subseg.minorNum
      );

      if (!timestamp) {
        throw new RunValidationError(ErrorType.BAD_TIMESTAMPS);
      }

      const replayStartTime =
        this.replayHeader.timestamp - this.replayHeader.runTime * 1000;
      const unixTimeReached = replayStartTime + subseg.timeReached * 1000;

      const timestampDelay = timestamp.createdAt.getTime() - unixTimeReached;

      if (
        timestampDelay > RunProcessor.Constants.AllowedTimestampDelay ||
        timestampDelay < 0
      )
        throw new RunValidationError(ErrorType.OUT_OF_SYNC);
    });
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
