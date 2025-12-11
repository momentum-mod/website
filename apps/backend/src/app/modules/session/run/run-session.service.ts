import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException
} from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import {
  IntNullableFilter,
  Leaderboard,
  LeaderboardRun,
  User
} from '@momentum/db';
import {
  ActivityType,
  COMPATIBLE_STYLES,
  GamemodeStyles,
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
  RunSessionDto,
  UpdateRunSessionDto,
  XpGainDto
} from '../../../dto';
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

@Injectable()
export class RunSessionService {
  constructor(
    @Inject(EXTENDED_PRISMA_SERVICE) private readonly db: ExtendedPrismaService,
    private readonly fileStoreService: RunFileStoreService,
    private readonly valkey: ValkeyService,
    private readonly xpSystems: XpSystemsService,
    private readonly mapsService: MapsService
  ) {}

  //#region Create Session

  async createSession(
    userID: number,
    body: CreateRunSessionDto
  ): Promise<RunSessionDto> {
    const leaderboardData = {
      mapID: body.mapID,
      gamemode: body.gamemode,
      trackNum: body.trackNum,
      trackType: body.trackType
    };

    if (!(await this.db.leaderboard.exists({ where: leaderboardData })))
      throw new BadRequestException('Leaderboard does not exist');

    // User sessions are stored in array under runsess:id:<userID>
    // This should be bounded by the number of segments on the map with the
    // largest number of segments - see below.
    const sessionKey = idKey(userID);
    const sessionsIDs = await this.valkey.lrange(sessionKey, 0, -1);
    for (const sessionID of sessionsIDs) {
      const session = await this.valkey.hgetall(dataKey(sessionID));

      if (
        session &&
        Number(session.userID) === userID &&
        Number(session.trackType) === body.trackType &&
        // Don't delete session for other trackNums, since the run session
        // end for that trackNum is likely to arrive AFTER the start of the
        // session for the next trackNum since contains replay data. Since this
        // isn't limited by map, the number of inactive sessions a user could
        // maliciously created by the map with the largest number of genuine
        // leaderboards which is limited to MAX_TRACK_SEGMENTS, so can't be
        // exploited in a significant way. Still, we probably want to add some
        // pruning logic or something in the future to remove old sessions.
        Number(session.trackNum) === body.trackNum
      ) {
        await Promise.all([
          this.valkey.lrem(idKey(userID), 0, sessionID),
          this.valkey.del(dataKey(sessionID))
        ]);
      }
    }

    const id = await this.valkey.incr(counterKey);
    const createdAt = Date.now();
    const createdAtDate = new Date(createdAt);
    const tsKey = timestampKey(id);

    // Each session has hash of main data under runsess:dat:<sessionID>,
    // and array of timestamps under runsess:ts:<sessionID>, stored as strings
    // in form <majorNum>,<minorNum>,<time>,<createdAt>
    await Promise.all([
      this.valkey.lpush(sessionKey, id),
      this.valkey.hset(dataKey(id), {
        userID,
        createdAt,
        ...leaderboardData
      }),
      this.valkey.lpush(tsKey, serializeTimestamp(1, 1, 0, createdAt))
    ]);

    if (Sentry.isInitialized()) {
      Sentry.setTag('session_id', id);
    }

    return DtoFactory(RunSessionDto, {
      id,
      userID,
      createdAt: createdAtDate,
      ...leaderboardData,
      timestamps: [
        { majorNum: 1, minorNum: 1, time: 0, createdAt: createdAtDate }
      ]
    });
  }

  //#endregion

  //#region Update Session

  async updateSession(
    userID: number,
    sessionID: number,
    { majorNum, minorNum, time }: UpdateRunSessionDto
  ): Promise<void> {
    const storedUserID = await this.valkey.hget(dataKey(sessionID), 'userID');

    if (!storedUserID || Number(storedUserID) !== userID) {
      throw new BadRequestException();
    }

    if (Sentry.isInitialized()) {
      Sentry.setTag('session_id', sessionID);
    }

    await this.valkey.lpush(
      timestampKey(sessionID),
      serializeTimestamp(majorNum, minorNum, time, Date.now())
    );
  }

  //#endregion

  //#region Invalidate Session

  async invalidateSession(userID: number, sessionID: number): Promise<void> {
    const storedUserID = await this.valkey.hget(dataKey(sessionID), 'userID');

    if (!storedUserID || Number(storedUserID) !== userID) {
      throw new BadRequestException();
    }

    if (Sentry.isInitialized()) {
      Sentry.setTag('session_id', sessionID);
    }

    await Promise.all([
      this.valkey.lrem(idKey(userID), 0, sessionID),
      this.valkey.del(dataKey(sessionID)),
      this.valkey.del(timestampKey(sessionID))
    ]);
  }

  //#endregion

  //#region Complete Session

  async completeSession(
    userID: number,
    sessionID: number,
    replay?: Buffer
  ): Promise<CompletedRunDto> {
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
      // Chance these are out of sync from the client, but also Valkey doesn't
      // seem to preserve order anyway.
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

    const compatibleStyles = COMPATIBLE_STYLES[processedRun.style].filter(
      (style) => GamemodeStyles[processedRun.gamemode].includes(style)
    );

    // Submit runs for all compatible styles
    const allStyles = [processedRun.style, ...compatibleStyles];
    const results = await Promise.all(
      allStyles.map((style) =>
        this.saveSubmittedRun(processedRun, replay, style)
      )
    );

    // Return the result for the primary style
    return results[0];
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

  // TODO: I'm not adding full styles support yet as we need to figure out data
  // structure for describing what style also goes on style=0 LB, also with
  // this approach to inserts we're doing until we move not storing `rank`
  // being so spaghetti and slow, so I don't wanna do it for multiple leaderboards.
  // So for now, we always use style=0.
  // But styles implementation should be quite straightforward once below code/db
  // is cleaned up:
  // - Find all compatible styles with the flags pulled from replay header
  //   - (also check for mutually incompatible style flags in there)
  // - Insert runs into leaderboards for all compatible styles
  // - No clue how rank XP assignment works for styles
  private async saveSubmittedRun(
    submittedRun: ProcessedRun,
    replayBuffer: Buffer,
    style: Style
  ): Promise<CompletedRunDto> {
    const existingRun = await this.db.leaderboardRun.findFirst({
      where: {
        mapID: submittedRun.mapID,
        gamemode: submittedRun.gamemode,
        trackType: submittedRun.trackType,
        trackNum: submittedRun.trackNum,
        style: style,
        userID: submittedRun.userID
      },
      include: { leaderboard: true }
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
    isPB: boolean,
    existingRun?: LeaderboardRun & { leaderboard: Leaderboard },
    replayHash?: string
  ): Promise<{
    newPB?: LeaderboardRun;
    lastPB?: LeaderboardRun;
    isWR: boolean;
    worldRecord?: LeaderboardRun;
    totalRuns: number;
    xpGain: XpGainDto;
  }> {
    // Base Where input we'll be using variants of
    const leaderboardWhere = {
      mapID: submittedRun.mapID,
      gamemode: submittedRun.gamemode,
      trackType: submittedRun.trackType,
      trackNum: submittedRun.trackNum,
      style: submittedRun.style
    };

    const leaderboard =
      existingRun?.leaderboard ??
      (await tx.leaderboard.findUnique({
        where: { mapID_gamemode_trackType_trackNum_style: leaderboardWhere }
      }));

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

    // We're a PB, so time to do a million fucking DB writes
    const existingWorldRecord = await tx.leaderboardRun.findFirst({
      where: {
        ...leaderboardWhere,
        rank: 1
      }
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

    const fasterRuns = await tx.leaderboardRun.count({
      where: {
        ...leaderboardWhere,
        time: { lte: submittedRun.time }
      }
    });

    const oldRank = existingRun?.rank;
    const rank = fasterRuns + 1;

    // Rank XP calculations are disabled for now, horrifically slow to do in
    // Postgres, and we don't show it anywhere in UI anyway.
    // const rankXP = this.xpSystems.getRankXpForRank(rank, totalRuns).rankXP;
    // xpGain.rankXP = rankXP;

    // If we only improved our rank the range to update is [newRank,
    // oldRank), otherwise it's everything below
    const rankRangeWhere: IntNullableFilter = existingRun
      ? { gte: rank, lt: oldRank }
      : { gte: rank };

    // For now, we're keeping a specific `rank` column on this table and
    // updating each row. It's relatively slow for very large leaderboards, but
    // tolerable (on my machine, adding a rank 1 run to a table with 50000 runs
    // takes ~900ms to update everything).
    //
    // We could switch to using a window function in the future to skip the
    // update, but then queries deep into a large leaderboard become quite slow
    // (on my machine, fetching 10 rows offset by 40000 into a 50000 run table
    // takes about 300ms). We could also considering adding time + createdAt to
    // our index to allow Postgres to use an index-only scan (potentially *very*
    // fast but haven't benched), but then we'd have to denormalize user data
    // onto this table (gross), or fetch it from a Valkey cache. Valkey cache of
    // users might well happen in the future, so worth considering more then.
    //
    // Also, this approach lets us stick with regular Prisma for now, it
    // produces exactly the right query.

    await tx.leaderboardRun.updateMany({
      where: { ...leaderboardWhere, rank: rankRangeWhere },
      data: { rank: { increment: 1 } }
    });

    const pastRun = await this.db.pastRun.create({
      data: {
        userID: submittedRun.userID,
        mapID: submittedRun.mapID,
        gamemode: submittedRun.gamemode,
        trackType: submittedRun.trackType,
        trackNum: submittedRun.trackNum,
        style: submittedRun.style,
        time: submittedRun.time
      }
    });

    // We could use a Prisma upsert here but we already know if the existing
    // rank exists or not
    let newPB: LeaderboardRun;
    if (existingRun) {
      newPB = await tx.leaderboardRun.update({
        where: {
          userID_gamemode_style_mapID_trackType_trackNum: {
            userID: existingRun.userID,
            mapID: existingRun.mapID,
            gamemode: existingRun.gamemode,
            trackType: existingRun.trackType,
            trackNum: existingRun.trackNum,
            style: existingRun.style
          }
        },
        data: {
          time: submittedRun.time,
          replayHash,
          splits: submittedRun.splits,
          rank,
          pastRunID: pastRun.id,
          createdAt: pastRun.createdAt
        }
      });
    } else {
      newPB = await this.db.leaderboardRun.create({
        data: {
          userID: submittedRun.userID,
          mapID: submittedRun.mapID,
          gamemode: submittedRun.gamemode,
          trackType: submittedRun.trackType,
          trackNum: submittedRun.trackNum,
          style: submittedRun.style,
          time: submittedRun.time,
          splits: submittedRun.splits,
          replayHash,
          rank,
          pastRunID: pastRun.id,
          createdAt: pastRun.createdAt
        }
      });
    }

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

const counterKey = 'runsess:counter';

//#endregion
