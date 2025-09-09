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
  runPath,
  RunValidationError,
  RunValidationErrorType,
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
  SessionID
} from './run-session.interface';
import { RunProcessor } from './run-processor.class';

@Injectable()
export class RunSessionService {
  constructor(
    @Inject(EXTENDED_PRISMA_SERVICE) private readonly db: ExtendedPrismaService,
    private readonly fileStoreService: FileStoreService,
    private readonly xpSystems: XpSystemsService,
    private readonly mapsService: MapsService
  ) {}

  private sessions = new Map<SessionID, RunSession>();
  private sessionCounter = 1;

  //#region Create Session

  async createSession(
    userID: number,
    body: CreateRunSessionDto
  ): Promise<RunSessionDto> {
    const leaderboardData = {
      mapID: body.mapID,
      gamemode: body.gamemode,
      trackNum: body.trackNum,
      trackType: body.trackType,
      style: body.style
    };

    if (!(await this.db.leaderboard.exists({ where: leaderboardData })))
      throw new BadRequestException('Leaderboard does not exist');

    // Delete any existing sessions for this user on the same track type - the
    // only way you can have multiple sessions is doing main and stage tracks
    // at the same time.
    //
    // This is potentially quite slow for large numbers of sessions; we could
    // maintain a second map of userIDs pointing to array of session IDs as well
    // but not worth the complexity right now, let's do something like that when
    // moving to Redis in the future.
    for (const [key, value] of this.sessions.entries()) {
      if (
        value.userID === userID &&
        value.trackType === body.trackType &&
        // Don't delete session for other trackNums, since the run session
        // end for that trackNum is likely to arrive AFTER the start of the
        // session for the next trackNum since contains replay data. Since this
        // isn't limited by map, the number of inactive sessions a user could
        // maliciously created by the map with the largest number of genuine
        // leaderboards which is limited to MAX_TRACK_SEGMENTS, so can't be
        // exploited in a significant way. Still, we probably want to add some
        // pruning logic or something in the future to remove old sessions,
        // can wait til we do Redis.
        value.trackNum === body.trackNum
      ) {
        this.sessions.delete(key);
      }
    }

    const id = this.sessionCounter++;
    const createdAt = new Date();
    const session: RunSession = {
      id,
      userID,
      createdAt,
      ...leaderboardData,
      timestamps: [{ majorNum: 1, minorNum: 1, time: 0, createdAt }]
    };

    this.sessions.set(id, session);

    if (Sentry.isInitialized()) {
      Sentry.setTag('session_id', id);
    }

    return DtoFactory(RunSessionDto, session);
  }

  //#endregion

  //#region Update Session

  updateSession(
    userID: number,
    sessionID: number,
    { majorNum, minorNum, time }: UpdateRunSessionDto
  ): void {
    const session = this.sessions.get(sessionID);

    if (!session) throw new BadRequestException();
    if (session.userID !== userID) throw new BadRequestException();

    if (Sentry.isInitialized()) {
      Sentry.setTag('session_id', sessionID);
    }

    session.timestamps.push({
      majorNum,
      minorNum,
      time,
      createdAt: new Date()
    });
  }

  //#endregion

  //#region Invalidate Session

  invalidateSession(userID: number, sessionID: number): void {
    const session = this.sessions.get(sessionID);

    if (!session || session.userID !== userID) throw new BadRequestException();

    if (Sentry.isInitialized()) {
      Sentry.setTag('session_id', sessionID);
    }

    this.sessions.delete(sessionID);
  }

  //#endregion

  //#region Complete Session

  async completeSession(
    userID: number,
    sessionID: number,
    replay?: Buffer
  ): Promise<CompletedRunDto> {
    const session = this.sessions.get(sessionID) as CompletedRunSession;

    if (Sentry.isInitialized()) {
      Sentry.setTag('session_id', sessionID);
    }

    if (!session || session.userID !== userID) {
      if (Sentry.isInitialized()) {
        Sentry.getCurrentScope().setLevel('log');
        Sentry.captureException('Invalid session ID on run end');
      }
      throw new BadRequestException('Invalid session');
    }

    session.timestamps.sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    );

    // Check user has read permissions for this map. Someone *could* actually
    // start/update a session on this map through weird API calls, but that'd be
    // completely pointless since we block actual submission here.
    const map = await this.mapsService.getMapAndCheckReadAccess({
      mapID: session.mapID,
      userID,
      include: { currentVersion: true }
    });

    const user = await this.db.user.findUnique({ where: { id: userID } });

    session.mmap = map;
    session.user = user;

    this.sessions.delete(sessionID);

    const processedRun = RunSessionService.processSubmittedRun(
      replay,
      session as CompletedRunSession,
      user
    );

    return this.saveSubmittedRun(processedRun, replay);
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
    replayBuffer: Buffer
  ): Promise<CompletedRunDto> {
    const existingRun = await this.db.leaderboardRun.findFirst({
      where: {
        mapID: submittedRun.mapID,
        gamemode: submittedRun.gamemode,
        trackType: submittedRun.trackType,
        trackNum: submittedRun.trackNum,
        style: submittedRun.style,
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
      rankXP: 0,
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
    const rankXP = this.xpSystems.getRankXpForRank(rank, totalRuns).rankXP;
    xpGain.rankXP = rankXP;

    // If we only improved our rank the range to update is [newRank,
    // oldRank), otherwise it's everything below
    const rankRangeWhere: IntNullableFilter = existingRun
      ? { gte: rank, lt: oldRank }
      : { gte: rank };

    const ranks = await tx.leaderboardRun.findMany({
      where: { ...leaderboardWhere, rank: rankRangeWhere },
      select: { rank: true, userID: true }
    });

    // This is SLOOOOOW. Here's two different methods for doing the updates,
    // they take about 7s and 9s respectively for 10k ranks, far too slow for
    // us. Probably going to use raw queries in the future, may have to come
    // up with some clever DB optimisations. https://discord.com/channels/235111289435717633/487354170546978816/1000450260830793839

    // const t1 = Date.now();

    await this.db.$transaction(
      ranks.map((rank) =>
        tx.leaderboardRun.updateMany({
          where: { ...leaderboardWhere, userID: rank.userID },
          data: {
            rank: rank.rank + 1,
            rankXP: this.xpSystems.getRankXpForRank(rank.rank + 1, totalRuns)
              .rankXP
          }
        })
      )
    );

    // const t2 = Date.now();
    // console.log(`Ranks shift took ${t2 - t1}ms`);

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
          rankXP,
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
          rankXP,
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
