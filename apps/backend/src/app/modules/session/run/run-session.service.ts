import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger
} from '@nestjs/common';
import {
  MapTrack,
  MapZone,
  Prisma,
  Run,
  RunSessionTimestamp,
  User
} from '@prisma/client';
import { RunProcessor } from './run-processor';
import { FileStoreCloudService } from '../../filestore/file-store-cloud.service';
import { XpSystemsService } from '../../xp-systems/xp-systems.service';
import {
  CompletedRunDto,
  CreateRunSessionDto,
  DtoFactory,
  RunSessionDto,
  RunSessionTimestampDto,
  UpdateRunSessionDto,
  XpGainDto
} from '@momentum/backend/dto';
import {
  CompletedRunSession,
  ProcessedRun,
  RUN_SESSION_COMPLETED_INCLUDE,
  StatsUpdateReturn
} from './run-session.interface';
import { ActivityType, RunValidationError } from '@momentum/constants';
import { BaseStats } from '@momentum/replay';
import { EXTENDED_PRISMA_SERVICE } from '../../database/db.constants';
import {
  ExtendedPrismaService,
  ExtendedPrismaServiceTransaction
} from '../../database/prisma.extension';

@Injectable()
export class RunSessionService {
  constructor(
    @Inject(EXTENDED_PRISMA_SERVICE) private readonly db: ExtendedPrismaService,
    private readonly fileCloudService: FileStoreCloudService,
    private readonly xpSystems: XpSystemsService
  ) {}

  private readonly logger = new Logger('Run Session');

  //#region Create Session

  async createSession(
    userID: number,
    body: CreateRunSessionDto
  ): Promise<RunSessionDto> {
    // We do this to block IL/Bonus stuff for now, but there's code all over
    // the place for IL stuff.
    if (body.trackNum !== 0 || body.zoneNum !== 0)
      throw new BadRequestException('IL/Bonus runs are not yet supported');

    await this.db.runSession.deleteMany({ where: { userID } });

    const track = await this.db.mapTrack.findFirst({
      where: { mapID: body.mapID, trackNum: body.trackNum },
      include:
        body.zoneNum > 0
          ? { zones: { where: { zoneNum: body.zoneNum } } }
          : undefined
    });

    if (!track)
      throw new BadRequestException(
        'Map does not exist or does not contain a track with this trackNum'
      );
    // If zoneNum > 0, check we got an include zone back
    else if (body.zoneNum > 0 && !(track?.zones && track?.zones.length === 1))
      throw new BadRequestException(
        'Track does not contain a zone with this zoneNum'
      );

    const dbResponse = await this.db.runSession.create({
      data: {
        user: { connect: { id: userID } },
        track: { connect: { id: track.id } },
        trackNum: body.trackNum,
        zoneNum: body.zoneNum
      }
    });

    return DtoFactory(RunSessionDto, dbResponse);
  }

  //#endregion

  //#region Update Session

  async updateSession(
    userID: number,
    sessionID: number,
    body: UpdateRunSessionDto
  ): Promise<RunSessionTimestampDto> {
    const session = await this.db.runSession.findUnique({
      where: { id: sessionID },
      include: {
        timestamps: true,
        track: true
      }
    });

    if (!session) throw new BadRequestException('No run found');

    if (session.userID !== userID) throw new ForbiddenException('Invalid user');

    if (session.zoneNum > 0)
      throw new BadRequestException('You cannot update an IL run');

    // Currently we don't require all zones in a run be completed, so this is
    // quite a weak check May change in 0.10.0?
    if (
      session.timestamps.some(
        (ts: RunSessionTimestamp) => ts.zone === body.zoneNum
      )
    )
      throw new BadRequestException('Timestamp already exists');

    const dbResponse = await this.db.runSessionTimestamp.create({
      data: {
        session: { connect: { id: sessionID } },
        zone: body.zoneNum,
        tick: body.tick
      }
    });

    return DtoFactory(RunSessionTimestampDto, dbResponse);
  }

  //#endregion

  //#region Invalidate Session

  async invalidateSession(userID: number): Promise<void> {
    try {
      await this.db.runSession.delete({ where: { userID } });
    } catch {
      throw new BadRequestException('Session does not exist');
    }
  }

  //#endregion

  //#region Complete Session

  async completeSession(
    userID: number,
    sessionID: number,
    replay: Buffer
  ): Promise<CompletedRunDto> {
    const session = await this.db.runSession.findUnique({
      where: { id: sessionID },
      include: RUN_SESSION_COMPLETED_INCLUDE
    });

    const user = await this.db.user.findUnique({ where: { id: userID } });

    if (!session || !session.track || !session.track.mmap)
      throw new BadRequestException('Invalid run');

    await this.db.runSession.delete({ where: { id: sessionID } });

    const processedRun = RunSessionService.processSubmittedRun(
      replay,
      session as CompletedRunSession,
      user
    );

    return this.db.$transaction((tx) =>
      this.saveSubmittedRun(
        tx,
        processedRun,
        session.track,
        session.track.mmap.type,
        replay
      )
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

  private async saveSubmittedRun(
    tx: ExtendedPrismaServiceTransaction,
    submittedRun: ProcessedRun,
    track: MapTrack & { zones: MapZone[] },
    mapType: number,
    replayBuffer: Buffer
  ): Promise<CompletedRunDto> {
    // We have two quite expensive, independent operations here, including a
    // file store. So we may as well run in parallel and await them both.
    const [statsUpdate, savedRun] = await Promise.all([
      await this.updateStatsAndRanks(tx, submittedRun, track, mapType),
      await this.createAndStoreRun(tx, submittedRun, replayBuffer)
    ]);

    // Now the run is back we can actually update the rank. We could use a
    // Prisma upsert here but we already know if the existing rank exists or
    // not.
    let mapRank;
    if (statsUpdate.isPersonalBest)
      mapRank = await (statsUpdate.existingRank
        ? tx.rank.update({
            where: { runID: statsUpdate.existingRank.runID },
            data: {
              run: { connect: { id: savedRun.id } },
              rank: statsUpdate.rankCreate.rank,
              rankXP: statsUpdate.rankCreate.rankXP
            }
          })
        : tx.rank.create({
            data: {
              ...statsUpdate.rankCreate,
              run: { connect: { id: savedRun.id } }
            }
          }));
    // If it's not a PB then existingRank exists
    else mapRank = statsUpdate.existingRank;

    if (statsUpdate.isWorldRecord) {
      await tx.activity.create({
        data: {
          type: ActivityType.WR_ACHIEVED,
          userID: submittedRun.userID,
          data: submittedRun.mapID
        }
      });
    } else if (statsUpdate.isPersonalBest) {
      await tx.activity.create({
        data: {
          type: ActivityType.PB_ACHIEVED,
          userID: submittedRun.userID,
          data: submittedRun.mapID
        }
      });
    }

    return DtoFactory(CompletedRunDto, {
      isNewPersonalBest: statsUpdate.isPersonalBest,
      isNewWorldRecord: statsUpdate.isWorldRecord,

      run: savedRun,
      rank: mapRank,
      xp: statsUpdate.xp
    });
  }

  private async updateStatsAndRanks(
    tx: ExtendedPrismaServiceTransaction,
    submittedRun: ProcessedRun,
    track: MapTrack & { zones: MapZone[] },
    mapType: number
  ): Promise<StatsUpdateReturn> {
    // Base Where input we'll be using variants of
    const rankWhere = {
      mapID: submittedRun.mapID,
      gameType: mapType,
      flags: submittedRun.flags
    };

    // This gets built up as we go, but can't be updated until we've created
    // the actual Run entry we need it to key into
    let rankCreate: Prisma.RankCreateWithoutRunInput | undefined;

    const existingRank = await tx.rank.findFirst({
      where: {
        ...rankWhere,
        userID: submittedRun.userID,
        run: {
          trackNum: submittedRun.trackNum,
          zoneNum: submittedRun.zoneNum
        }
      },
      include: { run: true }
    });

    const isPersonalBest =
      !existingRank ||
      (existingRank && existingRank.run.ticks > submittedRun.ticks);

    let isWorldRecord = false;
    if (isPersonalBest) {
      const existingWorldRecord = await tx.rank.findFirst({
        where: {
          rank: 1,
          mapID: submittedRun.mapID,
          run: {
            trackNum: submittedRun.trackNum,
            zoneNum: submittedRun.zoneNum
          },
          gameType: mapType,
          flags: submittedRun.flags
        },
        include: { run: true }
      });

      isWorldRecord =
        !existingWorldRecord ||
        existingWorldRecord?.run?.ticks > submittedRun.ticks;
    }

    const existingRun = existingRank?.run as Run;

    const isTrackRun = submittedRun.zoneNum === 0;
    const isMainTrackRun = submittedRun.trackNum === 0 && isTrackRun;
    const hasCompletedMainTrackBefore = isMainTrackRun && !existingRank;
    const hasCompletedTrackBefore = !!existingRun;
    let hasCompletedZoneBefore = false;

    if (isTrackRun) {
      hasCompletedZoneBefore = hasCompletedTrackBefore;
    } else {
      const existingRunZoneStats = await tx.runZoneStats.findFirst({
        where: {
          zoneNum: submittedRun.zoneNum,
          run: {
            mapID: submittedRun.mapID,
            userID: submittedRun.userID
          }
        },
        include: { run: true }
      });

      if (existingRunZoneStats) hasCompletedZoneBefore = true;
    }

    // Now, depending on if we're a singular zone or the whole track, we need
    // to update our stats accordingly
    if (isTrackRun) {
      // It's the entire track. Update the track's stats, each of its zones,
      // and the map's stats as well
      const trackStatsUpdate: Prisma.MapTrackStatsUpdateInput = {
        completions: { increment: 1 },
        baseStats: {
          update: RunSessionService.makeBaseStatsUpdate(
            submittedRun.overallStats
          )
        }
      };

      if (!hasCompletedTrackBefore)
        trackStatsUpdate.uniqueCompletions = { increment: 1 };

      await tx.mapTrackStats.update({
        where: { trackID: track.id },
        data: trackStatsUpdate
      });

      await Promise.all(
        track.zones
          .filter((zone) => zone.zoneNum !== 0) // Start zone doesn't get stats
          .map(async (zone: MapZone) => {
            const zoneStatsUpdate: Prisma.MapZoneStatsUpdateInput = {
              completions: { increment: 1 },
              baseStats: {
                update: RunSessionService.makeBaseStatsUpdate(
                  submittedRun.zoneStats[zone.zoneNum - 1].baseStats
                )
              }
            };

            // TODO_0.12: This logic is wrong, the user might have IL times,
            // gonna have to do a find.
            if (!hasCompletedZoneBefore)
              zoneStatsUpdate.uniqueCompletions = { increment: 1 };

            await tx.mapZoneStats.update({
              where: { zoneID: zone.id },
              data: zoneStatsUpdate
            });
          })
      );

      // Lastly update the map stats as well, if it was the main track
      if (isMainTrackRun) {
        const mapStatsUpdate: Prisma.MapStatsUpdateInput = {
          completions: { increment: 1 },
          baseStats: {
            update: RunSessionService.makeBaseStatsUpdate(
              submittedRun.overallStats
            )
          }
        };

        if (!existingRun) mapStatsUpdate.uniqueCompletions = { increment: 1 };

        await tx.mapStats.update({
          where: { mapID: submittedRun.mapID },
          data: mapStatsUpdate
        });
      }
    } else {
      // It's a particular zone, so update just it. The zone's stats should be
      // in the processed run's overallStats
      const zone: MapZone = track.zones.find(
        (zone) => zone.zoneNum === submittedRun.zoneNum
      );

      const zoneStatsUpdate: Prisma.MapZoneStatsUpdateInput = {
        completions: { increment: 1 },
        baseStats: {
          update: RunSessionService.makeBaseStatsUpdate(
            submittedRun.overallStats
          )
        }
      };

      if (!hasCompletedZoneBefore)
        zoneStatsUpdate.uniqueCompletions = { increment: 1 };

      await tx.mapZoneStats.update({
        where: { zoneID: zone.id },
        data: zoneStatsUpdate
      });
    }

    let rankXP = 0;

    // If it's a PB we're be creating or updating a rank, then shifting all the
    // other affected rank
    if (isPersonalBest) {
      // If we don't have a rank we increment +1 since we want the total
      // *after* we've added the new run
      let totalRuns = await tx.rank.count({ where: rankWhere });
      if (!existingRank) totalRuns++;

      const fasterRuns = await tx.rank.count({
        where: {
          ...rankWhere,
          run: { ticks: { lte: submittedRun.ticks } }
        }
      });

      const oldRank = existingRank?.rank;
      const rank = fasterRuns + 1;
      rankXP = this.xpSystems.getRankXpForRank(rank, totalRuns).rankXP;

      rankCreate = {
        user: { connect: { id: submittedRun.userID } },
        mmap: { connect: { id: submittedRun.mapID } },
        gameType: mapType,
        flags: submittedRun.flags,
        rank: rank,
        rankXP: rankXP
      };

      // If we only improved our rank the range to update is [newRank,
      // oldRank), otherwise it's everything below
      const rankRangeWhere: Prisma.IntNullableFilter = existingRank
        ? { gte: rank, lt: oldRank }
        : { gte: rank };

      const ranks = await tx.rank.findMany({
        where: { ...rankWhere, rank: rankRangeWhere },
        select: {
          rank: true,
          userID: true
        }
      });

      // This is SLOOOOOW. Here's two different methods for doing the updates,
      // they take about 7s and 9s respectively for 10k ranks, far too slow for
      // us. Probably going to use raw queries in the future, may have to come
      // up with some clever DB optimisations. https://discord.com/channels/235111289435717633/487354170546978816/1000450260830793839

      // const t1 = Date.now();

      await Promise.all(
        ranks.map((rank) =>
          tx.rank.updateMany({
            where: {
              ...rankWhere,
              userID: rank.userID,
              run: {
                trackNum: submittedRun.trackNum,
                zoneNum: submittedRun.zoneNum
              }
            },
            data: {
              rank: rank.rank + 1,
              rankXP: this.xpSystems.getRankXpForRank(rank.rank + 1, totalRuns)
                .rankXP
            }
          })
        )
      );

      // await this.runRepo.batchUpdateRank(
      //     ranks.map((rank) => {
      //         return {
      //             where: {
      //                 mapID_userID_gameType_flags_trackNum_zoneNum: {
      //                     ...rankWhere,
      //                     userID: rank.userID
      //                 }
      //             },
      //             data: {
      //                 rank: rank.rank + 1,
      //                 rankXP: this.xpSystems.getRankXpForRank(rank.rank + 1, totalRuns).rankXP
      //             }
      //         };
      //     })
      // );

      // const t2 = Date.now();
      // console.log(`Ranks shift took ${t2 - t1}ms`);
    }

    const cosXPGain = this.xpSystems.getCosmeticXpForCompletion(
      track.difficulty,
      track.isLinear,
      track.trackNum > 0,
      isTrackRun ? !hasCompletedTrackBefore : !hasCompletedZoneBefore,
      submittedRun.zoneNum > 0
    );

    const userStats = await tx.userStats.findUnique({
      where: { userID: submittedRun.userID }
    });

    if (!userStats) throw new BadRequestException('User stats not found');

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

    const xpGain: XpGainDto = {
      rankXP: rankXP,
      cosXP: {
        gainLvl: gainedLevels,
        oldXP: Number(userStats.cosXP),
        gainXP: cosXPGain
      }
    };

    await tx.userStats.update({
      where: { userID: submittedRun.userID },
      data: {
        totalJumps: { increment: submittedRun.overallStats.jumps },
        totalStrafes: { increment: submittedRun.overallStats.strafes },
        level: { increment: gainedLevels },
        cosXP: { increment: cosXPGain },
        runsSubmitted: { increment: 1 },
        mapsCompleted: hasCompletedMainTrackBefore
          ? { increment: 1 }
          : undefined
      }
    });

    return {
      isPersonalBest: isPersonalBest,
      isWorldRecord: isWorldRecord,
      existingRank: existingRank,
      rankCreate: rankCreate,
      xp: xpGain
    };
  }

  private async createAndStoreRun(
    tx: ExtendedPrismaServiceTransaction,
    processedRun: ProcessedRun,
    buffer: Buffer
  ): Promise<Run> {
    const run = await tx.run.create({
      data: {
        user: { connect: { id: processedRun.userID } },
        mmap: { connect: { id: processedRun.mapID } },
        trackNum: processedRun.trackNum,
        zoneNum: processedRun.zoneNum,
        ticks: processedRun.ticks,
        tickRate: processedRun.tickRate,
        time: processedRun.time,
        flags: processedRun.flags,
        overallStats: { create: processedRun.overallStats },
        zoneStats: {
          createMany: {
            data: processedRun.zoneStats.map((zs) => {
              return {
                zoneNum: zs.zoneNum
              };
            })
          }
        },
        file: '', // Init these as empty, we'll be updating once uploaded. We want to ID of this Run to use as filename.
        hash: ''
      },
      include: { zoneStats: true }
    });

    // We have to loop through each zoneStats to set their baseStats due to
    // Prisma's lack of nested createMany Might as well get our file uploading
    // at the same time...
    await Promise.all([
      (async () => {
        const uploadResult = await this.fileCloudService.storeFileCloud(
          buffer,
          'runs/' + run.id
        );

        await tx.run.update({
          where: { id: run.id },
          data: {
            file: uploadResult.fileKey,
            hash: uploadResult.hash
          }
        });
      })(),
      // TODO: Pointless?
      ...run.zoneStats.map((zs) =>
        tx.runZoneStats.update({
          where: { id: zs.id },
          data: {
            baseStats: {
              create: processedRun.zoneStats.find(
                (przs) => przs.zoneNum === zs.zoneNum
              ).baseStats
            }
          }
        })
      )
    ]);

    return tx.run.findUnique({
      where: { id: run.id },
      include: { overallStats: true, zoneStats: true }
    });
  }

  // The old API performs some averaging here that makes absolutely no sense. Getting it to work would also be a massive
  // Prisma headache (see below comment I wrote before realising I didn't actually have to do this) so I'm just doing
  // something that works with Prisma but also won't be right
  // // The old API uses Sequelize's literal() here to do everything in one query. Because Prisma is a load of shit,
  // // we can't construct partial raw queries, has to be entirely Prisma or entirely raw. So we have to get the existing
  // // data first then transform it in JS, PLUS because of the schema structure to find the baseStats object to SELECT
  // // we have to do a nasty findFirst. This is fucking infuriating but I really don't want to write it raw right now,
  // // after everything is working if this seems slow I'll consider it.
  private static makeBaseStatsUpdate(
    baseStats: BaseStats
  ): Prisma.BaseStatsUpdateInput {
    return {
      jumps: { increment: baseStats.jumps },
      strafes: { increment: baseStats.strafes },
      totalTime: { increment: baseStats.totalTime },
      avgStrafeSync: { increment: baseStats.avgStrafeSync },
      avgStrafeSync2: { increment: baseStats.avgStrafeSync2 },
      enterTime: { increment: baseStats.enterTime },
      velAvg3D: { increment: baseStats.velAvg3D },
      velAvg2D: { increment: baseStats.velAvg2D },
      velMax3D: { increment: baseStats.velMax3D },
      velMax2D: { increment: baseStats.velMax2D },
      velEnter3D: { increment: baseStats.velEnter3D },
      velEnter2D: { increment: baseStats.velEnter2D },
      velExit3D: { increment: baseStats.velExit3D },
      velExit2D: { increment: baseStats.velExit2D }
    };
  }

  //#endregion
}
