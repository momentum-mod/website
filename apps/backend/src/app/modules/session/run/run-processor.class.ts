import { User } from '@momentum/db';
import { Logger } from '@nestjs/common';
import * as Sentry from '@sentry/node';
import {
  MapZones,
  RunValidationError,
  RunValidationErrorType as ErrorType,
  Segment,
  TickIntervals,
  TrackType
} from '@momentum/constants';
import * as ReplayFile from '@momentum/formats/replay';
import {
  CompletedRunSession,
  ProcessedRun,
  RunSessionTimestamp,
  Splits
} from './run-session.interface';
import { findWithIndex } from '@momentum/util-fn';

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
  readonly splits: Splits;

  // Could pull out to config file/env if needed
  static readonly Constants = {
    // 10 seconds for the timer stage -> end record -> submit,
    // then we add a second for every minute in the replay so longer replays
    // have more time to submit, up to a max of 30s.
    // Allowed time diff between recording finish and backend validation reached
    AllowedSubmitDelayBase: 30_000,
    AllowedSubmitDelayIncrement: 5000,
    AllowedSubmitDelayMax: 120_000,

    // Allowed time diff between split time and backend timestamp created
    AllowedTimestampDelay: 20000
  };

  static readonly Logger = new Logger('RunProcessor');

  private constructor(
    buffer: Buffer,
    session: CompletedRunSession,
    user: User
  ) {
    this.buffer = buffer;
    this.session = session;
    this.user = user;
    try {
      this.zones = JSON.parse(session.mmap.currentVersion.zones);
      this.replayHeader = ReplayFile.Reader.readHeader(this.buffer);
      this.splits = ReplayFile.Reader.readRunSplits(this.buffer) as Splits;
    } catch (error) {
      this.reject(ErrorType.BAD_REPLAY_FILE, error);
    }
  }

  /** @throws {RunValidationError} */
  static parse(buffer: Buffer, session: CompletedRunSession, user: User) {
    return new RunProcessor(buffer, session, user);
  }

  /** @throws {RunValidationError} */
  validateSessionTimestamps() {
    const { timestamps, trackType, trackNum } = this.session;

    // Note that we don't require timestamps be ordered due to possibly
    // unreliable networking, but we *do* require all timestamps to have been
    // received by the time the /end endpoint has been called and the replay
    // file is fully uploaded.
    // Also note that timestamps do NOT include hitting the end zone - hitting
    // the end zone calls the /end endpoint with the replay, and we parse the
    // replay header to determine the final time.

    // Sort to make sure in right order if we received out-of-sync.
    timestamps.sort((a, b) =>
      a.majorNum === b.majorNum
        ? a.minorNum - b.minorNum
        : a.majorNum - b.majorNum
    );

    if (timestamps.length === 0) {
      this.reject(ErrorType.BAD_TIMESTAMPS, 'timestamps length == 0');
    }

    // First minorNum is always 1 (a segment start), regardless of track type
    if (timestamps[0].minorNum !== 1) {
      this.reject(ErrorType.BAD_TIMESTAMPS, 'first minorNum != 1');
    }

    // First time should always be 0
    if (timestamps[0].time !== 0) {
      this.reject(ErrorType.BAD_TIMESTAMPS, 'first timestamp.time != 0');
    }

    // We could perform checks on the .time field here, but it's equivalent
    // to runsplits.timeReached checks later on, easier to do there.

    // Check for duplicates
    if (
      new Set(
        timestamps.map(({ majorNum, minorNum }) => (majorNum << 8) | minorNum)
      ).size !== timestamps.length
    ) {
      this.reject(ErrorType.BAD_TIMESTAMPS, 'duplicate timestamps');
    }

    // Stage or bonus runs
    if (trackType !== TrackType.MAIN) {
      // majorNum is always 1 for stages/bonuses
      if (!timestamps.every(({ majorNum }) => majorNum === 1)) {
        this.reject(
          ErrorType.BAD_TIMESTAMPS,
          'majorNum != 1 for stage or bonus'
        );
      }

      let segment: Segment | undefined;
      if (trackType === TrackType.STAGE) {
        segment = this.zones.tracks.main.zones.segments[trackNum - 1];
      } else if (this.zones.tracks.bonuses[trackNum - 1]?.defragModifiers) {
        segment = this.zones.tracks.main.zones.segments[0];
      } else {
        segment = this.zones.tracks.bonuses[trackNum - 1]?.zones?.segments?.[0];
      }

      if (!segment) {
        this.reject(
          ErrorType.BAD_TIMESTAMPS,
          'no segment for stage or bonus track'
        );
      }

      this.validateSegment(segment, timestamps);
      return;
    }

    // Main track runs from here on out.
    // Segments are always ordered and required!
    const { zones } = this.zones.tracks.main;

    // trackNum must always be 1
    if (trackNum !== 1) {
      this.reject(ErrorType.BAD_TIMESTAMPS, 'trackNum != 1 for main track');
    }

    // Check first timestamp is in first segment and last timestamp is in last
    if (timestamps[0].majorNum !== 1) {
      this.reject(ErrorType.BAD_TIMESTAMPS, 'first timestamp majorNum != 1');
    }

    if (timestamps.at(-1).majorNum !== zones.segments.length) {
      this.reject(ErrorType.BAD_TIMESTAMPS, 'last timestamp majorNum != last');
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
        this.reject(ErrorType.BAD_TIMESTAMPS, 'majorNum != lastMajor + 1');
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
      this.reject(ErrorType.BAD_TIMESTAMPS, 'num majorNums != num segments');
    }
  }

  private validateSegment(
    { checkpoints, checkpointsRequired, checkpointsOrdered }: Segment,
    timestamps: RunSessionTimestamp[]
  ) {
    // First minor is always the start zone. It's never possible to skip a
    // start zone.
    if (timestamps[0].minorNum !== 1) {
      this.reject(ErrorType.BAD_TIMESTAMPS, 'segment first minorNum != 1', {
        checkpoints,
        timestamps
      });
    }

    // Must have time if checkpointsOrdered. The timestamps themselves *could*
    // have been out-of-order originally, but have been sorted above, so the
    // client-reported time value should always be incrementing.
    if (checkpointsOrdered) {
      for (let i = 1; i < timestamps.length; i++) {
        if (timestamps[i].time <= timestamps[i - 1].time) {
          this.reject(
            ErrorType.BAD_TIMESTAMPS,
            'ordered segment timestamps not ordered',
            { timestamps }
          );
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
          this.reject(
            ErrorType.BAD_TIMESTAMPS,
            'stage timestamps != checkpoints for SEASS or last stage',
            { timestamps, checkpoints, isLastSegment }
          );
        }
      } else {
        if (timestamps.length !== checkpoints.length - 1) {
          this.reject(
            ErrorType.BAD_TIMESTAMPS,
            'stage timestamps != checkpoints for !SEASS',
            { timestamps, checkpoints }
          );
        }
      }
    } else {
      if (timestamps.length !== checkpoints.length) {
        this.reject(
          ErrorType.BAD_TIMESTAMPS,
          'main/bonus timestamps != checkpoints',
          { timestamps, checkpoints }
        );
      }
    }
  }

  /** @throws {RunValidationError} */
  validateReplayHeader() {
    const { session, replayHeader: header, user } = this;

    if (header.trackType !== session.trackType) {
      this.reject(ErrorType.BAD_META, 'header.trackType != session.trackType');
    }

    if (header.trackNum !== session.trackNum) {
      this.reject(ErrorType.BAD_META, 'header.trackNum != session.trackNum');
    }

    if (header.magic !== ReplayFile.REPLAY_MAGIC) {
      this.reject(ErrorType.BAD_META, 'header.magic != REPLAY_MAGIC');
    }

    if (
      header.mapHash.toUpperCase() !==
      session.mmap.currentVersion.bspHash.toUpperCase()
    ) {
      this.reject(ErrorType.BAD_META, 'header.mapHash != our bspHash');
    }

    if (header.mapName !== session.mmap.name) {
      this.reject(ErrorType.BAD_META, 'header.mapName != our mapName');
    }

    if (header.playerSteamID !== user.steamID) {
      this.reject(ErrorType.BAD_META, 'header.playerSteamID != user.steamID');
    }

    if (header.gamemode !== session.gamemode) {
      this.reject(ErrorType.BAD_META, 'header.gamemode != session.gamemode');
    }

    if (header.tickInterval !== TickIntervals.get(session.gamemode)) {
      this.reject(
        ErrorType.OUT_OF_SYNC,
        'header.tickInterval != gamemode tick interval'
      );
    }

    const {
      AllowedSubmitDelayBase,
      AllowedSubmitDelayIncrement,
      AllowedSubmitDelayMax,
      AllowedTimestampDelay
    } = RunProcessor.Constants;

    const headerRunTime = header.runTime * 1000; // Duration of the run (double, in seconds!)

    const sessionStart = session.createdAt.getTime();
    const sessionEnd = Date.now();
    const sessionLength = sessionEnd - sessionStart;

    // Check timestamps match up with replay start and end times
    // We'd like to be able to do checks using header.timestamp but this is
    // derived from the client's system time, which staging has shown can be
    // over a minute out of sync with us.
    // So only these are variables known to us:
    //   v sessionStart (session.createdAt)
    // v start on client (unknown)                                   v now (Date.now)
    // |---------------------------------------|---------------------|
    // <--------------------------------------><---------------------|
    //           ^ headerRunTime (from header)           ^ submitDelay (derived)

    // This is slightly smaller than it should be, since there's a delay between
    // client starting run and us logging session start.
    const submitDelay = sessionLength - headerRunTime;

    // There's a *chance* that session start takes longer to process than
    // /end call reaching here, so testing headerRunTime against sessionLength
    // could in very rare cases fail. Being fairly generous here, and just
    // checking that if it is over, it's by at most one AllowedTimestampDelay.
    if (headerRunTime > sessionLength + AllowedTimestampDelay) {
      this.reject(
        ErrorType.OUT_OF_SYNC,
        'headerRunTime > sessionLength + AllowedTimestampDelay',
        {
          sessionStart,
          sessionEnd,
          sessionLength,
          submitDelay,
          headerRunTime,
          AllowedTimestampDelay,
          headerTimestamp: header.timestamp
        }
      );
    }

    const allowedSubmitDelay =
      AllowedSubmitDelayBase +
      Math.min(
        (AllowedSubmitDelayIncrement * headerRunTime) / 60_000,
        AllowedSubmitDelayMax
      );

    if (submitDelay > allowedSubmitDelay) {
      this.reject(ErrorType.OUT_OF_SYNC, 'submitDelay > allowedSubmitDelay', {
        sessionStart,
        sessionEnd,
        sessionLength,
        submitDelay,
        headerTimestamp: header.timestamp,
        allowedSubmitDelay,
        AllowedSubmitDelayBase,
        AllowedSubmitDelayIncrement,
        AllowedSubmitDelayMax
      });
    }
  }

  validateRunSplits() {
    // Flatten subsegments so for easier comparison against timestamps,
    // calculate majorNum artificially for checking
    const subsegs = this.splits.segments?.flatMap(({ subsegments }, index) =>
      subsegments.map((ss) => ({ ...ss, majorNum: index + 1 }))
    );

    if (subsegs.length !== this.session.timestamps.length) {
      this.reject(ErrorType.OUT_OF_SYNC, 'num subsegments != num timestamps', {
        subsegs
      });
    }

    subsegs.forEach((subseg) => {
      // Timestamps are *probably* ordered, but may not be with spotty internet
      const [ts, tsIdx] = findWithIndex(
        this.session.timestamps,
        ({ majorNum, minorNum }) =>
          majorNum === subseg.majorNum && minorNum === subseg.minorNum
      );

      if (!ts) {
        this.reject(ErrorType.OUT_OF_SYNC, 'missing timestamp for subseg', {
          subseg
        });
      }

      if (tsIdx === 0) return;

      const lastTs = this.session.timestamps[tsIdx - 1];
      const tsDiff = ts.createdAt.getTime() - lastTs.createdAt.getTime();

      const lastSubseg = subsegs.find(
        ({ majorNum, minorNum }) =>
          majorNum === lastTs.majorNum && minorNum === lastTs.minorNum
      );
      const subsegDiff = (subseg.timeReached - lastSubseg.timeReached) * 1000;
      const timestampDelay = tsDiff - subsegDiff;

      const { AllowedTimestampDelay } = RunProcessor.Constants;

      // Timestamps *could* be out of order, in which case timestampDelay would
      // be negative. Just doing an absolute comparison.
      if (Math.abs(timestampDelay) > AllowedTimestampDelay) {
        this.reject(
          ErrorType.OUT_OF_SYNC,
          'abs(timestampDelay) > AllowedTimestampDelay',
          {
            subseg,
            lastSubseg,
            ts,
            lastTs,
            subsegDiff,
            timestampDelay,
            AllowedTimestampDelay
          }
        );
      }
    });
  }

  getProcessed(): ProcessedRun {
    return {
      userID: this.user.id,
      mapID: this.session.mapID,
      gamemode: this.session.gamemode,
      trackType: this.session.trackType,
      trackNum: this.session.trackNum,
      style: this.replayHeader.style,
      time: this.replayHeader.runTime,
      splits: this.splits
    };
  }

  /**
   * Log detailed rejection reason, send client a relatively generic error back.
   */
  private reject(
    errorType: ErrorType,
    conditionOrError: string | Error,
    vars?: Record<string, any>
  ) {
    const info = {
      session: this.session,
      replayHeader: this.replayHeader,
      splits: this.splits,
      errorType,
      [conditionOrError instanceof Error ? 'error' : 'failedCondition']:
        conditionOrError,
      vars
    };

    RunProcessor.Logger.log({ user: this.user, info });

    if (Sentry.isInitialized()) {
      Sentry.setContext('Run Info', info);
      Sentry.setUser(this.user);
      Sentry.getCurrentScope().setLevel('log');
      Sentry.captureException('Rejected run submission');
    }

    throw new RunValidationError(errorType);
  }
}
