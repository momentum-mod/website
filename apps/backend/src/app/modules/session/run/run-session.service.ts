import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger
} from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import { LeaderboardRun, User } from '@momentum/db';
import {
  ActivityType,
  CompatibleStyles,
  GamemodeStyles,
  KillswitchType,
  runPath,
  RunValidationError,
  RunValidationErrorType,
  Style,
  TrackType,
  XpGain
} from '@momentum/constants';
import { FileStoreService } from '../../filestore/file-store.service';
import { XpSystemsService } from '../../xp-systems/xp-systems.service';
import {
  CompletedRunDto,
  CreateRunSessionDto,
  DtoFactory,
  RunSessionIdDto,
  UpdateRunSessionDto,
  XpGainDto
} from '../../../dto';
import { KillswitchService } from '../../killswitch/killswitch.service';
import { EXTENDED_PRISMA_SERVICE } from '../../database/db.constants';
import {
  ExtendedPrismaService,
  ExtendedPrismaServiceTransaction
} from '../../database/prisma.extension';
import { MapsService } from '../../maps/maps.service';
import {
  CompletedRunSession,
  ProcessedRun,
  RunSession,
  RunSessionTimestamp
} from './run-session.interface';
import { RunProcessor } from './run-processor.class';
import { ValkeyService } from '../../valkey/valkey.service';
import { RunFileStoreService } from '../../filestore/run-file-store.service';
import { LeaderboardRunsDbService } from '../../runs/leaderboard-runs-db.service';

@Injectable()
export class RunSessionService {
  private readonly logger = new Logger(RunSessionService.name);

  constructor(
    @Inject(EXTENDED_PRISMA_SERVICE) private readonly db: ExtendedPrismaService,
    private readonly fileStoreService: RunFileStoreService,
    private readonly valkey: ValkeyService,
    private readonly xpSystems: XpSystemsService,
    private readonly mapsService: MapsService,
    private readonly leaderboardRunsDbService: LeaderboardRunsDbService,
    private readonly killswitch: KillswitchService
  ) {}

  //#region Run Session (game WebSocket)

  /**
   * Start a new session for the user on a leaderboard, clearing any existing
   * session for the same track first.
   */
  async createSession(
    userID: number,
    data: CreateRunSessionDto
  ): Promise<(RunSession & { id: number }) | { error: string }> {
    // When run submission is disabled, refuse to start new sessions
    if (this.killswitch.checkKillswitch(KillswitchType.RUN_SUBMISSION)) {
      this.logger.warn(
        `createSession: blocked by RUN_SUBMISSION killswitch (userID=${userID})`
      );
      return { error: 'Run submission is currently disabled' };
    }

    const leaderboardData = {
      mapID: data.mapID,
      gamemode: data.gamemode,
      trackType: data.trackType,
      trackNum: data.trackNum
    };

    if (!(await this.db.leaderboard.exists({ where: leaderboardData }))) {
      this.logger.warn(
        `createSession: leaderboard not found (userID=${userID}, mapID=${data.mapID}, gamemode=${data.gamemode}, trackType=${data.trackType}, trackNum=${data.trackNum})`
      );
      return { error: 'Leaderboard does not exist' };
    }

    const sessionKey = idKey(userID);
    const sessionIDs = await this.valkey.lrange(sessionKey, 0, -1);
    for (const sessionID of sessionIDs) {
      const session = await this.valkey.hgetall(dataKey(sessionID));
      if (
        session &&
        Number(session.userID) === userID &&
        Number(session.trackType) === data.trackType &&
        Number(session.trackNum) === data.trackNum
      ) {
        await Promise.all([
          this.valkey.lrem(sessionKey, 0, sessionID),
          this.valkey.del(dataKey(sessionID)),
          this.valkey.del(timestampKey(sessionID))
        ]);
      }
    }

    const id = await this.valkey.incr(COUNTER_KEY);
    const createdAt = Date.now();
    const createdAtDate = new Date(createdAt);

    await Promise.all([
      this.valkey.lpush(sessionKey, id),
      this.valkey.hset(dataKey(id), { userID, createdAt, ...leaderboardData }),
      this.valkey.lpush(
        timestampKey(id),
        serializeTimestamp(1, 1, 0, createdAt)
      )
    ]);

    this.logger.log(
      `createSession: created session (sessionID=${id}, userID=${userID}, mapID=${data.mapID})`
    );
    return {
      id,
      userID,
      createdAt: createdAtDate,
      ...leaderboardData,
      timestamps: [
        { majorNum: 1, minorNum: 1, time: 0, createdAt: createdAtDate }
      ]
    };
  }

  /**
   * Append a timestamp/split to an existing session.
   */
  async updateSession(
    userID: number,
    data: UpdateRunSessionDto
  ): Promise<null | { error: string }> {
    const storedUserID = await this.valkey.hget(
      dataKey(data.sessionID),
      'userID'
    );

    if (!storedUserID || Number(storedUserID) !== userID) {
      this.logger.warn(
        `updateSession: invalid session (sessionID=${data.sessionID}, userID=${userID})`
      );
      return { error: 'Invalid session' };
    }

    await this.valkey.lpush(
      timestampKey(data.sessionID),
      serializeTimestamp(data.majorNum, data.minorNum, data.time, Date.now())
    );

    this.logger.log(
      `updateSession: timestamp added (sessionID=${data.sessionID}, userID=${userID}, majorNum=${data.majorNum}, minorNum=${data.minorNum}, time=${data.time})`
    );
    return null;
  }

  /**
   * Discard a session and its data entirely.
   */
  async invalidateSession(
    userID: number,
    data: RunSessionIdDto
  ): Promise<null | { error: string }> {
    const storedUserID = await this.valkey.hget(
      dataKey(data.sessionID),
      'userID'
    );

    if (!storedUserID || Number(storedUserID) !== userID) {
      this.logger.warn(
        `invalidateSession: invalid session (sessionID=${data.sessionID}, userID=${userID})`
      );
      return { error: 'Invalid session' };
    }

    await Promise.all([
      this.valkey.lrem(idKey(userID), 0, data.sessionID),
      this.valkey.del(dataKey(data.sessionID)),
      this.valkey.del(timestampKey(data.sessionID))
    ]);

    this.logger.log(
      `invalidateSession: session deleted (sessionID=${data.sessionID}, userID=${userID})`
    );
    return null;
  }

  /**
   * Mark a session ended and hand ownership of its data to the replay upload
   * (HTTP), which finalises and deletes it.
   */
  async endSession(
    userID: number,
    data: RunSessionIdDto
  ): Promise<null | { error: string }> {
    const storedUserID = await this.valkey.hget(
      dataKey(data.sessionID),
      'userID'
    );

    // This event and the replay upload (HTTP POST /session/run/:id/end) race and
    // can arrive in either order. If the session is already gone the upload won
    // the race and consumed it - that's the expected terminal state, so ack
    // without warning rather than treating it as an invalid session.
    if (!storedUserID) {
      return null;
    }

    if (Number(storedUserID) !== userID) {
      this.logger.warn(
        `endSession: invalid session (sessionID=${data.sessionID}, userID=${userID})`
      );
      return { error: 'Invalid session' };
    }

    // Don't delete the session data/timestamps here: the replay upload still
    // needs them to validate and process the run, and may not have arrived yet.
    // Instead mark the session ended, drop it from the user's active list, and
    // set a TTL so the data is reaped if the upload never arrives (e.g. the
    // client crashed after ending but before uploading). completeSession owns
    // the final deletion once it has processed the run.
    await Promise.all([
      this.valkey.lrem(idKey(userID), 0, data.sessionID),
      this.valkey.hset(dataKey(data.sessionID), 'ended', 1),
      this.valkey.expire(dataKey(data.sessionID), ENDED_SESSION_TTL_SECONDS),
      this.valkey.expire(
        timestampKey(data.sessionID),
        ENDED_SESSION_TTL_SECONDS
      )
    ]);

    this.logger.log(
      `endSession: session ended, awaiting replay upload (sessionID=${data.sessionID}, userID=${userID})`
    );
    return null;
  }

  //#endregion

  //#region Complete Session

  async completeSession(
    userID: number,
    sessionID: number,
    replay?: Buffer
  ): Promise<CompletedRunDto[]> {
    const [storedUserID, storedSession, storedTimestamps] = await Promise.all([
      this.valkey.hget(dataKey(sessionID), 'userID'),
      this.valkey.hgetall(dataKey(sessionID)),
      this.valkey.lrange(timestampKey(sessionID), 0, -1)
    ]);

    if (Sentry.isInitialized()) {
      Sentry.setTag('session_id', sessionID);
    }

    if (
      !storedUserID ||
      !storedSession ||
      !storedTimestamps ||
      Number(storedUserID) !== userID
    ) {
      if (Sentry.isInitialized()) {
        Sentry.getCurrentScope().setLevel('log');
        Sentry.captureException('Invalid session ID on run end');
      }
      throw new BadRequestException('Invalid session');
    }

    const session: RunSession = {
      mapID: Number(storedSession.mapID),
      userID,
      gamemode: Number(storedSession.gamemode),
      trackType: Number(storedSession.trackType),
      trackNum: Number(storedSession.trackNum),
      id: sessionID,
      // `lpush` prepends, so the list comes back newest-first; sort it into
      // chronological order.
      timestamps: storedTimestamps
        .map(deserializeTimestamp)
        .toSorted((a, b) => a.createdAt.getTime() - b.createdAt.getTime()),
      createdAt: new Date(storedSession.createdAt)
    };

    // Check user has read permissions for this map. Someone *could* actually
    // start/update a session on this map through weird API calls, but that'd be
    // completely pointless since we block actual submission here.
    const map = await this.mapsService.getMapAndCheckReadAccess({
      mapID: Number(storedSession.mapID),
      userID,
      include: { currentVersion: true }
    });

    const user = await this.db.user.findUnique({ where: { id: userID } });

    session.mmap = map;
    session.user = user;

    await Promise.all([
      this.valkey.lrem(idKey(userID), 0, sessionID),
      this.valkey.del(dataKey(sessionID)),
      this.valkey.del(timestampKey(sessionID))
    ]);

    const processedRun = RunSessionService.processSubmittedRun(
      replay,
      session as CompletedRunSession,
      user
    );

    const compatibleStyles = CompatibleStyles.get(processedRun.style).filter(
      (style) => GamemodeStyles.get(processedRun.gamemode)?.has(style)
    );

    // Submit runs for all compatible styles
    const allStyles = [processedRun.style, ...compatibleStyles];
    const results = await Promise.all(
      allStyles.map((style) =>
        this.saveSubmittedRun(processedRun, replay, style)
      )
    );

    return results;
  }

  private static processSubmittedRun(
    replay: Buffer,
    session: CompletedRunSession,
    user: User
  ): ProcessedRun {
    try {
      // Make a new run processor instance. This wraps the gritty part of replay
      // parsing then perform a bunch of validations
      const processor = RunProcessor.parse(replay, session, user);

      // Check the session timestamps are in order
      processor.validateSessionTimestamps();

      // Validate replay file header against session data
      processor.validateReplayHeader();

      processor.validateRunSplits();

      return processor.getProcessed();
    } catch (error) {
      if (error instanceof RunValidationError) {
        throw new BadRequestException({
          message: `Run validation failed: ${error.message}`,
          code: error.code
        });
      } else throw error;
    }
  }

  private async saveSubmittedRun(
    submittedRun: ProcessedRun,
    replayBuffer: Buffer,
    style: Style
  ): Promise<CompletedRunDto> {
    const [existingRun] = await this.leaderboardRunsDbService.getRankedRuns({
      mapID: submittedRun.mapID,
      gamemode: submittedRun.gamemode,
      trackType: submittedRun.trackType,
      trackNum: submittedRun.trackNum,
      style: style,
      userIDs: [submittedRun.userID],
      take: 1,
      includeSplits: true
    });

    const isPB = !(existingRun && existingRun.time < submittedRun.time);

    const replayHash = FileStoreService.getHashForBuffer(replayBuffer);
    // We have two quite expensive, independent operations here, including a
    // file store. So we may as well run in parallel and await them both.
    const [{ newPB, xpGain, isWR, lastPB, totalRuns, worldRecord }] =
      await Promise.all([
        this.db.$transaction((tx) =>
          this.updateLeaderboards(
            tx,
            submittedRun,
            style,
            isPB,
            existingRun,
            replayHash
          )
        ),
        isPB
          ? this.updateReplayFiles(
              replayBuffer,
              replayHash,
              existingRun?.replayHash
            )
          : Promise.resolve()
      ]);

    if (isWR) {
      await this.db.activity.create({
        data: {
          type: ActivityType.WR_ACHIEVED,
          userID: submittedRun.userID,
          data: submittedRun.mapID
        }
      });
    } else if (isPB) {
      await this.db.activity.create({
        data: {
          type: ActivityType.PB_ACHIEVED,
          userID: submittedRun.userID,
          data: submittedRun.mapID
        }
      });
    }

    return DtoFactory(CompletedRunDto, {
      time: submittedRun.time,
      style,
      isNewPersonalBest: isPB,
      isNewWorldRecord: isWR,
      xp: xpGain,
      newPersonalBest: newPB,
      lastPersonalBest: lastPB,
      worldRecord,
      totalRuns
    });
  }

  private async updateLeaderboards(
    tx: ExtendedPrismaServiceTransaction,
    submittedRun: ProcessedRun,
    style: Style,
    isPB: boolean,
    existingRun?: LeaderboardRun,
    replayHash?: string
  ): Promise<{
    newPB?: LeaderboardRun;
    lastPB?: LeaderboardRun;
    isWR: boolean;
    worldRecord?: LeaderboardRun;
    totalRuns: number;
    xpGain: XpGainDto;
  }> {
    const leaderboardWhere = {
      mapID: submittedRun.mapID,
      gamemode: submittedRun.gamemode,
      trackType: submittedRun.trackType,
      trackNum: submittedRun.trackNum,
      style: style
    };

    const leaderboard = await tx.leaderboard.findUnique({
      where: { mapID_gamemode_trackType_trackNum_style: leaderboardWhere }
    });

    // Doing XP and stats first, as we do this regardless of if you PBed or not
    const cosXPGain = this.xpSystems.getCosmeticXpForCompletion(
      leaderboard.tier,
      leaderboard.trackType,
      leaderboard.linear,
      isPB
    );

    const userStats = await tx.userStats.findUnique({
      where: { userID: submittedRun.userID }
    });

    if (!userStats)
      throw new InternalServerErrorException('User stats not found');

    const currentLevel = userStats.level;
    const nextLevel = currentLevel + 1;

    // We want a 64 rather than 32 bit int in the DB, but in reality a user
    // should never exceed MAX_SAFE_INTEGER (2^53). Warn us just in case that's
    // ever about to happen.
    const currentCosXp = Number(userStats.cosXP);
    if (currentCosXp >= Number.MAX_SAFE_INTEGER)
      throw new InternalServerErrorException(
        `User ${submittedRun.userID} is exceeding the maximum cosmetic XP a JS number can handle accurately!!`
      );

    let gainedLevels = 0;
    let requiredXP = this.xpSystems.getCosmeticXpForLevel(nextLevel);
    while (
      requiredXP > -1 &&
      Number(userStats.cosXP) + cosXPGain >= requiredXP
    ) {
      gainedLevels++;
      requiredXP = this.xpSystems.getCosmeticXpForLevel(
        nextLevel + gainedLevels
      );
    }

    const xpGain: XpGain = {
      // rankXP: 0,
      cosXP: {
        gainLvl: gainedLevels,
        oldXP: Number(userStats.cosXP),
        gainXP: cosXPGain
      }
    };

    await tx.userStats.update({
      where: { userID: submittedRun.userID },
      data: {
        totalJumps: { increment: submittedRun.splits.trackStats.jumps },
        totalStrafes: { increment: submittedRun.splits.trackStats.strafes },
        level: { increment: gainedLevels },
        cosXP: { increment: cosXPGain },
        runsSubmitted: { increment: 1 },
        mapsCompleted:
          submittedRun.trackType === TrackType.MAIN && !existingRun
            ? { increment: 1 }
            : undefined
      }
    });

    if (submittedRun.trackType === TrackType.MAIN) {
      await tx.mapStats.update({
        where: { mapID: submittedRun.mapID },
        data: {
          completions: { increment: 1 },
          uniqueCompletions: !existingRun ? { increment: 1 } : undefined
        }
      });
    }

    const [existingWorldRecord] =
      await this.leaderboardRunsDbService.getRankedRuns({
        transaction: tx,
        mapID: submittedRun.mapID,
        gamemode: submittedRun.gamemode,
        trackType: submittedRun.trackType,
        trackNum: submittedRun.trackNum,
        style: style,
        skip: 0,
        take: 1,
        includeSplits: true
      });

    const isWR =
      !existingWorldRecord || existingWorldRecord?.time > submittedRun.time;

    // If it's a PB we're be creating or updating a rank, then shifting all the
    // other affected rank
    let totalRuns = await tx.leaderboardRun.count({
      where: leaderboardWhere
    });

    if (!isPB) {
      return {
        xpGain,
        isWR: false,
        totalRuns,
        lastPB: existingRun,
        worldRecord: existingWorldRecord
      };
    }

    // If we don't have an existing run but we're a PB, increment totalRuns
    // now we're about to add a new one.
    if (!existingRun) {
      totalRuns++;
    }

    const pastRun = await this.db.pastRun.create({
      data: {
        userID: submittedRun.userID,
        mapID: submittedRun.mapID,
        gamemode: submittedRun.gamemode,
        trackType: submittedRun.trackType,
        trackNum: submittedRun.trackNum,
        style: style,
        time: submittedRun.time
      }
    });

    // We could use a Prisma upsert here but we already know if the existing
    // rank exists or not
    let newPB: LeaderboardRun & { rank?: number };
    if (existingRun) {
      newPB = await tx.leaderboardRun.update({
        where: {
          userID_gamemode_style_mapID_trackType_trackNum: {
            userID: existingRun.userID,
            mapID: existingRun.mapID,
            gamemode: existingRun.gamemode,
            trackType: existingRun.trackType,
            trackNum: existingRun.trackNum,
            style: style
          }
        },
        data: {
          time: submittedRun.time,
          replayHash,
          splits: submittedRun.splits,
          pastRunID: pastRun.id,
          createdAt: pastRun.createdAt
        }
      });
    } else {
      newPB = await tx.leaderboardRun.create({
        data: {
          userID: submittedRun.userID,
          mapID: submittedRun.mapID,
          gamemode: submittedRun.gamemode,
          trackType: submittedRun.trackType,
          trackNum: submittedRun.trackNum,
          style: style,
          time: submittedRun.time,
          splits: submittedRun.splits,
          replayHash,
          pastRunID: pastRun.id,
          createdAt: pastRun.createdAt
        }
      });
    }

    newPB.rank = await this.leaderboardRunsDbService.getUserRank({
      transaction: tx,
      mapID: submittedRun.mapID,
      gamemode: submittedRun.gamemode,
      trackType: submittedRun.trackType,
      trackNum: submittedRun.trackNum,
      style: style,
      userID: submittedRun.userID
    });

    return {
      xpGain,
      totalRuns,
      newPB,
      lastPB: existingRun,
      isWR,
      worldRecord: isWR ? newPB : existingWorldRecord
    };
  }

  private async updateReplayFiles(
    buffer: Buffer,
    hash: string,
    oldHash?: string
  ): Promise<void> {
    try {
      await this.fileStoreService.storeFile(buffer, runPath(hash));
      // Delete old PB replay if exists
      if (oldHash) await this.fileStoreService.deleteFile(runPath(oldHash));
    } catch {
      throw new RunValidationError(RunValidationErrorType.INTERNAL_ERROR);
    }
  }

  //#endregion
}

//#region Valkey Keys

const COUNTER_KEY = 'runsess:counter';

// How long an ended session's data/timestamps are kept alive waiting for the
// replay upload (HTTP) to arrive and process it, before being reaped. Generous
// enough to cover a slow upload of a large replay on a poor connection.
const ENDED_SESSION_TTL_SECONDS = 5 * 60;

function idKey(userID: number): string {
  return `runsess:id:${userID}`;
}

function dataKey(sessionID: string | number): string {
  return `runsess:dat:${sessionID}`;
}

function timestampKey(sessionID: string | number): string {
  return `runsess:ts:${sessionID}`;
}

function serializeTimestamp(
  majorNum: number,
  minorNum: number,
  time: number,
  createdAt: number
): string {
  return `${majorNum},${minorNum},${time},${createdAt}`;
}

function deserializeTimestamp(str: string): RunSessionTimestamp {
  const [majorNum, minorNum, time, createdAt] = str.split(',');
  return {
    majorNum: Number(majorNum),
    minorNum: Number(minorNum),
    time: Number(time),
    createdAt: new Date(Number(createdAt))
  };
}

//#endregion
