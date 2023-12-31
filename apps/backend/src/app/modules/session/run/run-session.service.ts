import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger
} from '@nestjs/common';
import { Leaderboard, LeaderboardRun, Prisma, User } from '@prisma/client';
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
import { CompletedRunSession, ProcessedRun } from './run-session.interface';
import {
  ActivityType,
  runPath,
  RunValidationError,
  RunValidationErrorType,
  TrackType,
  XpGain
} from '@momentum/constants';
import { EXTENDED_PRISMA_SERVICE } from '../../database/db.constants';
import {
  ExtendedPrismaService,
  ExtendedPrismaServiceTransaction
} from '../../database/prisma.extension';
import { MapsService } from '../../maps/maps.service';
import { RunProcessor } from './run-processor.class';
import { JsonValue } from 'type-fest';
import { parallel } from '@momentum/util-fn';

@Injectable()
export class RunSessionService {
  constructor(
    @Inject(EXTENDED_PRISMA_SERVICE) private readonly db: ExtendedPrismaService,
    private readonly fileStoreService: FileStoreService,
    private readonly xpSystems: XpSystemsService,
    private readonly mapsService: MapsService
  ) {}

  private readonly logger = new Logger('Run Session');

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

    if (body.trackType !== TrackType.MAIN && body.segment !== 0)
      throw new BadRequestException('Stage/bonus must be on segment 0');

    if (!(await this.db.leaderboard.exists({ where: leaderboardData })))
      throw new BadRequestException('Leaderboard does not exist');

    // Delete rather than upsert to cascade delete any existing sessions and
    // their timestamps.
    await this.db.runSession.deleteMany({
      where: { userID, ...leaderboardData }
    });

    return DtoFactory(
      RunSessionDto,
      await this.db.runSession.create({
        data: {
          userID,
          ...leaderboardData,
          timestamps: {
            create: {
              // This is for the very rare cases of main track with
              // majorOrdered=false where player doesn't start on the first
              // major CP
              segment: body.segment,
              checkpoint: 0,
              time: 0
            }
          }
        }
      })
    );
  }

  //#endregion

  //#region Update Session

  async updateSession(
    userID: number,
    sessionID: number,
    { segment, checkpoint, time }: UpdateRunSessionDto
  ): Promise<void> {
    // I'm deliberately avoiding exception handling or informative errors here.
    // The game should never send runs in invalidate order so long as the zone
    // file has been validated sufficiently - if db insert fails, it's a major
    // error on our part and we should debug internally; otherwise it's someone
    // with a dodgy client and we shouldn't send them useful error messages.
    const session = await this.db.runSession.findUnique({
      where: { id: sessionID }
    });

    if (!session) throw new BadRequestException();

    if (session.userID !== userID) throw new BadRequestException();

    await this.db.runSessionTimestamp.create({
      data: { sessionID, segment, checkpoint, time }
    });
  }

  //#endregion

  //#region Invalidate Session

  async invalidateSession(userID: number): Promise<void> {
    await this.db.runSession.deleteMany({ where: { userID } });
  }

  //#endregion

  //#region Complete Session

  async completeSession(
    userID: number,
    sessionID: number,
    replay?: Buffer
  ): Promise<CompletedRunDto> {
    const session = await this.db.runSession.findUnique({
      where: { id: sessionID },
      include: {
        timestamps: { orderBy: { createdAt: 'asc' } },
        user: true,
        mmap: true
      }
    });

    // Check user has read permissions for this map. Someone *could* actually
    // start/update a session on this map through weird API calls, but that'd be
    // completely pointless since we block actual submission here.
    await this.mapsService.getMapAndCheckReadAccess({
      mapID: session.mapID,
      userID
    });

    const user = await this.db.user.findUnique({ where: { id: userID } });

    if (!session || session.userID !== userID)
      throw new BadRequestException('Invalid session');

    await this.db.runSession.delete({ where: { id: sessionID } });

    const processedRun = RunSessionService.processSubmittedRun(
      replay,
      session as CompletedRunSession,
      user
    );

    return this.db.$transaction((tx) =>
      this.saveSubmittedRun(tx, processedRun, replay)
    );
  }

  private static processSubmittedRun(
    replay: Buffer,
    session: CompletedRunSession,
    user: User
  ): ProcessedRun {
    // Make a new run processor instance. This is going to store the replay and
    // run data structure, parse the replay file in the buffer, then perform a
    // bunch of validations
    const processor = new RunProcessor(replay, session, user);

    let processedRun: ProcessedRun;
    try {
      // First, check the timestamps are in order
      processor.validateRunSession();

      // Parse the header of the replay file and validate against run data
      processor.processReplayFileHeader();

      // Parse the bulk of the replay, further validations and extracting stats
      processedRun = processor.processReplayFileContents();
    } catch (error) {
      if (error instanceof RunValidationError) {
        // If we hit any errors during validation we combine into bitflags to
        // send back to client
        throw new BadRequestException({
          message: `Run validation failed: ${error.message}`,
          code: error.code
        });
      } else throw error;
    }

    return processedRun;
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
    tx: ExtendedPrismaServiceTransaction,
    submittedRun: ProcessedRun,
    replayBuffer: Buffer
  ): Promise<CompletedRunDto> {
    const existingRun = await tx.leaderboardRun.findFirst({
      where: {
        mapID: submittedRun.mapID,
        gamemode: submittedRun.gamemode,
        trackType: submittedRun.trackType,
        trackNum: submittedRun.trackNum,
        style: 0,
        userID: submittedRun.userID
      },
      include: { leaderboard: true }
    });

    const isPB = !(existingRun && existingRun.time <= submittedRun.time);

    const replayHash = FileStoreService.getHashForBuffer(replayBuffer);

    // We have two quite expensive, independent operations here, including a
    // file store. So we may as well run in parallel and await them both.
    const [{ run, xpGain, isWR }] = await parallel(
      this.updateLeaderboards(tx, submittedRun, isPB, existingRun, replayHash),
      this.updateReplayFiles(replayBuffer, replayHash, existingRun?.replayHash)
    );

    if (isWR) {
      await tx.activity.create({
        data: {
          type: ActivityType.WR_ACHIEVED,
          userID: submittedRun.userID,
          data: submittedRun.mapID
        }
      });
    } else if (isPB) {
      await tx.activity.create({
        data: {
          type: ActivityType.PB_ACHIEVED,
          userID: submittedRun.userID,
          data: submittedRun.mapID
        }
      });
    }

    return DtoFactory(CompletedRunDto, {
      isNewPersonalBest: isPB,
      isNewWorldRecord: isWR,
      run: run,
      xp: xpGain
    });
  }

  private async updateLeaderboards(
    tx: ExtendedPrismaServiceTransaction,
    submittedRun: ProcessedRun,
    isPB: boolean,
    existingRun?: LeaderboardRun & { leaderboard: Leaderboard },
    replayHash?: string
  ): Promise<{ run?: LeaderboardRun; xpGain: XpGainDto; isWR: boolean }> {
    // Base Where input we'll be using variants of
    const leaderboardWhere = {
      mapID: submittedRun.mapID,
      gamemode: submittedRun.gamemode,
      trackType: submittedRun.trackType,
      trackNum: submittedRun.trackNum,
      style: 0
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
      this.logger.error(
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
        totalJumps: { increment: submittedRun.stats.overall.jumps },
        totalStrafes: { increment: submittedRun.stats.overall.strafes },
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

    if (!isPB) {
      return { xpGain, isWR: false };
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
    // If we don't have a rank we increment +1 since we want the total
    // *after* we've added the new run
    let totalRuns = await tx.leaderboardRun.count({
      where: leaderboardWhere
    });
    if (isPB) totalRuns++;

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
    const rankRangeWhere: Prisma.IntNullableFilter = existingRun
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

    await Promise.all(
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
        style: 0,
        flags: submittedRun.flags,
        time: submittedRun.time
      }
    });

    // We could use a Prisma upsert here but we already know if the existing
    // rank exists or not
    let run: LeaderboardRun;
    if (isPB) {
      if (existingRun) {
        run = await tx.leaderboardRun.update({
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
            flags: submittedRun.flags,
            time: submittedRun.time,
            replayHash,
            stats: submittedRun.stats as unknown as JsonValue, // TODO: #855
            rank,
            rankXP,
            pastRunID: pastRun.id,
            createdAt: pastRun.createdAt
          }
        });
      } else {
        run = await this.db.leaderboardRun.create({
          data: {
            userID: submittedRun.userID,
            mapID: submittedRun.mapID,
            gamemode: submittedRun.gamemode,
            trackType: submittedRun.trackType,
            trackNum: submittedRun.trackNum,
            style: 0,
            flags: submittedRun.flags,
            time: submittedRun.time,
            stats: submittedRun.stats as unknown as JsonValue, // TODO: #855
            replayHash,
            rank,
            rankXP,
            pastRunID: pastRun.id,
            createdAt: pastRun.createdAt
          }
        });
      }
    }

    return { run, xpGain, isWR };
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
