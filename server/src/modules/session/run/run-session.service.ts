import { BadRequestException, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { RunSessionCompleted, RunsRepoService } from '../../repo/runs-repo.service';
import { CreateRunSessionDto, RunSessionDto, UpdateRunSessionDto } from '@common/dto/run/run-session.dto';
import { MapsRepoService } from '../../repo/maps-repo.service';
import { RunSessionTimestampDto } from '@common/dto/run/run-session-timestamp.dto';
import { MapTrack, MapZone, MapZoneStats, Prisma, Run, RunSessionTimestamp, User } from '@prisma/client';
import { CompletedRunDto, XpGainDto } from '@common/dto/run/completed-run.dto';
import { UsersRepoService } from '../../repo/users-repo.service';
import { RunProcessor } from './run-processor';
import { FileStoreCloudService } from '../../filestore/file-store-cloud.service';
import { DtoFactory } from '@lib/dto.lib';
import { RunValidationError } from '@common/enums/run.enum';
import { BaseStatsFromGame, ProcessedRun, StatsUpdateReturn } from './run-session.interfaces';
import { XpSystemsService } from '../../xp-systems/xp-systems.service';

@Injectable()
export class RunSessionService {
    constructor(
        private readonly runRepo: RunsRepoService,
        private readonly mapRepo: MapsRepoService,
        private readonly userRepo: UsersRepoService,
        private readonly fileCloudService: FileStoreCloudService,
        private readonly xpSystems: XpSystemsService
    ) {}

    private readonly logger = new Logger('Run Session');

    //#region Create Session

    async createSession(userID: number, body: CreateRunSessionDto): Promise<RunSessionDto> {
        // We do this to block IL/Bonus stuff for now, but there's code all over the place for IL stuff.
        if (body.trackNum !== 0 || body.zoneNum !== 0)
            throw new BadRequestException('IL/Bonus runs are not yet supported');

        await this.runRepo.deleteRunSession({ userID: userID });

        const track = await this.mapRepo.getMapTrack(
            { mapID: body.mapID, trackNum: body.trackNum },
            body.zoneNum > 0 ? { zones: { where: { zoneNum: body.zoneNum } } } : undefined
        );

        if (!track) throw new BadRequestException('Map does not exist or does not contain a track with this trackNum');
        // If zoneNum > 0, check we got an include zone back
        else if (body.zoneNum > 0 && !((track as any)?.zones && (track as any)?.zones.length === 1))
            throw new BadRequestException('Track does not contain a zone with this zoneNum');

        const dbResponse = await this.runRepo.createRunSession({
            user: { connect: { id: userID } },
            track: { connect: { id: track.id } },
            trackNum: body.trackNum,
            zoneNum: body.zoneNum
        });

        return DtoFactory(RunSessionDto, dbResponse);
    }

    //#endregion

    //#region Update Session

    async updateSession(userID: number, sessionID: number, body: UpdateRunSessionDto): Promise<RunSessionTimestampDto> {
        const session = await this.runRepo.getRunSessionUnique(sessionID, {
            timestamps: true,
            track: true
        });

        if (!session) throw new BadRequestException('No run found');

        if (session.userID !== userID) throw new ForbiddenException('Invalid user');

        if (session.zoneNum > 0) throw new BadRequestException('You cannot update an IL run');

        // Currently we don't require all zones in a run be completed, so this is quite a weak check
        // May change in 0.10.0?
        if ((session as any).timestamps.some((ts: RunSessionTimestamp) => ts.zone === body.zoneNum))
            throw new BadRequestException('Timestamp already exists');

        const dbResponse = await this.runRepo.createRunSessionTimestamp({
            session: { connect: { id: sessionID } },
            zone: body.zoneNum,
            tick: body.tick
        });

        return DtoFactory(RunSessionTimestampDto, dbResponse);
    }

    //#endregion

    //#region Invalidate Session

    async invalidateSession(userID: number): Promise<void> {
        try {
            await this.runRepo.deleteRunSessionUnique({ userID: userID });
        } catch {
            throw new BadRequestException('Session does not exist');
        }
    }

    //#endregion

    //#region Complete Session

    async completeSession(userID: number, sessionID: number, replay: Buffer): Promise<CompletedRunDto> {
        const session = await this.runRepo.getRunSessionCompleted(sessionID);

        const user = await this.userRepo.get(userID);

        if (!session || !session.track || !session.track.map) throw new BadRequestException('Invalid run');

        await this.runRepo.deleteRunSessionUnique({ id: sessionID });

        const processedRun = RunSessionService.processSubmittedRun(replay, session, user);

        return await this.saveSubmittedRun(processedRun, session.track, session.track.map.type, replay);
    }

    private static processSubmittedRun(replay: Buffer, session: RunSessionCompleted, user: User): ProcessedRun {
        // Make a new run processor instance. This is going to store the replay and run data structure,
        // parse the replay file in the buffer, then perform a bunch of validations
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
                // If we hit any errors during validation we combine into bitflags to send back to client
                throw new BadRequestException({
                    message: `Run validation failed: ${error.message}`,
                    code: error.code
                });
            } else throw error;
        }

        return processedRun;
    }

    private async saveSubmittedRun(
        submittedRun: ProcessedRun,
        track: MapTrack,
        mapType: number,
        replayBuffer: Buffer
    ): Promise<CompletedRunDto> {
        // We have two quite expensive, independent operations here, including a file store. So we may as well run in
        // parallel and await them both.
        const [statsUpdate, savedRun] = await Promise.all([
            await this.updateStatsAndRanks(submittedRun, track, mapType),
            await this.createAndStoreRun(submittedRun, replayBuffer)
        ]);

        // Now the run is back we can actually update the UMR. We could use a Prisma upsert here but we already know
        // if the existing rank exists or not.
        let mapRank;
        if (statsUpdate.isPersonalBest)
            mapRank = await (statsUpdate.existingRank
                ? this.runRepo.updateUserMapRank(
                      { runID: statsUpdate.existingRank.runID },
                      {
                          run: { connect: { id: savedRun.id } },
                          rank: statsUpdate.umrCreate.rank,
                          rankXP: statsUpdate.umrCreate.rankXP
                      }
                  )
                : this.runRepo.createUserMapRank({
                      ...statsUpdate.umrCreate,
                      run: { connect: { id: savedRun.id } }
                  }));
        // If it's not a PB then existingRank exists
        else mapRank = statsUpdate.existingRank;

        if (statsUpdate.isWorldRecord) {
            // TODO: Call activity service to create WR activity
        } else if (statsUpdate.isPersonalBest) {
            // TODO: Call activity service to create PB activity
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
        submittedRun: ProcessedRun,
        track: MapTrack,
        mapType: number
    ): Promise<StatsUpdateReturn> {
        // Base Where input we'll be using variants of
        const umrWhere = {
            mapID: submittedRun.mapID,
            gameType: mapType,
            flags: submittedRun.flags
        };

        // This gets built up as we go, but can't be updated until we've created the actual Run entry we need it to key into
        let umrCreate: Prisma.UserMapRankCreateWithoutRunInput | null;

        const existingRank = await this.runRepo.getUserMapRank(
            {
                ...umrWhere,
                userID: submittedRun.userID,
                run: {
                    trackNum: submittedRun.trackNum,
                    zoneNum: submittedRun.zoneNum
                }
            },
            { run: true }
        );

        const isPersonalBest = !existingRank || (existingRank && (existingRank as any).run.ticks > submittedRun.ticks);

        let isWorldRecord = false;
        if (isPersonalBest) {
            const existingWorldRecord = await this.runRepo.getUserMapRank(
                {
                    rank: 1,
                    mapID: submittedRun.mapID,
                    run: {
                        trackNum: submittedRun.trackNum,
                        zoneNum: submittedRun.zoneNum
                    },
                    gameType: mapType,
                    flags: submittedRun.flags
                },
                { run: true }
            );

            isWorldRecord = !existingWorldRecord || (existingWorldRecord as any)?.run?.ticks > submittedRun.ticks;
        }

        const existingRun = (existingRank as any)?.run as Run;

        const isTrackRun = submittedRun.zoneNum === 0;
        const isMainTrackRun = submittedRun.trackNum === 0 && isTrackRun;
        const hasCompletedMainTrackBefore = isMainTrackRun && !existingRank;
        const hasCompletedTrackBefore = !!existingRun;
        let hasCompletedZoneBefore = false;

        if (isTrackRun) {
            hasCompletedZoneBefore = hasCompletedTrackBefore;
        } else {
            const existingRunZoneStats = await this.runRepo.getRunZoneStats(
                {
                    zoneNum: submittedRun.zoneNum,
                    run: {
                        mapID: submittedRun.mapID,
                        userID: submittedRun.userID
                    }
                },
                { run: true }
            );

            if (existingRunZoneStats) hasCompletedZoneBefore = true;
        }

        // Now, depending on if we're a singular zone or the whole track, we need to update our stats accordingly
        if (isTrackRun) {
            // It's the entire track. Update the track's stats, each of its zones, and the map's stats as well
            const trackStatsUpdate: Prisma.MapTrackStatsUpdateInput = {
                completions: { increment: 1 },
                baseStats: { update: RunSessionService.makeBaseStatsUpdate(submittedRun.overallStats) }
            };

            if (!hasCompletedTrackBefore) trackStatsUpdate.uniqueCompletions = { increment: 1 };

            await this.mapRepo.updateMapTrackStats({ trackID: track.id }, trackStatsUpdate);

            await Promise.all(
                (track as any).zones
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

                        // TODO_0.12: This logic is wrong, the user might have IL times, gonna have to do a find.
                        if (!hasCompletedZoneBefore) zoneStatsUpdate.uniqueCompletions = { increment: 1 };

                        await this.mapRepo.updateMapZoneStats({ zoneID: zone.id }, zoneStatsUpdate);
                    })
            );

            // Lastly update the map stats as well, if it was the main track
            if (isMainTrackRun) {
                const mapStatsUpdate: Prisma.MapStatsUpdateInput = {
                    completions: { increment: 1 },
                    baseStats: { update: RunSessionService.makeBaseStatsUpdate(submittedRun.overallStats) }
                };

                if (!existingRun) mapStatsUpdate.uniqueCompletions = { increment: 1 };

                await this.mapRepo.updateMapStats(submittedRun.mapID, mapStatsUpdate);
            }
        } else {
            // It's a particular zone, so update just it. The zone's stats should be in the processed run's overallStats
            const zone: MapZoneStats = (track as any).zones.find((zone) => zone.zoneNum === submittedRun.zoneNum);

            const zoneStatsUpdate: Prisma.MapZoneStatsUpdateInput = {
                completions: { increment: 1 },
                baseStats: {
                    update: RunSessionService.makeBaseStatsUpdate(submittedRun.overallStats)
                }
            };

            if (!hasCompletedZoneBefore) zoneStatsUpdate.uniqueCompletions = { increment: 1 };

            await this.mapRepo.updateMapZoneStats({ zoneID: zone.id }, zoneStatsUpdate);
        }

        let rankXP = 0;

        // If it's a PB we're be creating or updating a UMR, then shifting all the other affected UMRs
        if (isPersonalBest) {
            // If we don't have a rank we increment +1 since we want the total *after* we've added the new run
            const totalRuns = (await this.runRepo.countUserMapRank(umrWhere)) + (existingRank ? 0 : 1);
            const fasterRuns = await this.runRepo.countUserMapRank({
                ...umrWhere,
                run: { ticks: { lte: submittedRun.ticks } }
            });

            const oldRank = existingRank?.rank;
            const rank = fasterRuns + 1;
            rankXP = this.xpSystems.getRankXpForRank(rank, totalRuns).rankXP;

            umrCreate = {
                user: { connect: { id: submittedRun.userID } },
                map: { connect: { id: submittedRun.mapID } },
                gameType: mapType,
                flags: submittedRun.flags,
                rank: rank,
                rankXP: rankXP
            };

            // If we only improved our rank the range to update is [newRank, oldRank), otherwise it's everything below
            const rankWhere: Prisma.IntNullableFilter = existingRank ? { gte: rank, lt: oldRank } : { gte: rank };

            const ranks: any = await this.runRepo.getAllUserMapRanks(
                { ...umrWhere, rank: rankWhere },
                { rank: true, userID: true }
            );

            // This is SLOOOOOW. Here's two different methods for doing the updates, they take about
            // 7s and 9s respectively for 10k ranks, far too slow for us. Probably going to use raw queries in the future,
            // may have to come up with some clever DB optimisations.
            // https://discord.com/channels/235111289435717633/487354170546978816/1000450260830793839

            // const t1 = Date.now();

            await Promise.all(
                ranks.map(
                    async (umr) =>
                        await this.runRepo.updateUserMapRanks(
                            {
                                ...umrWhere,
                                userID: umr.userID,
                                run: {
                                    trackNum: submittedRun.trackNum,
                                    zoneNum: submittedRun.zoneNum
                                }
                            },
                            {
                                rank: umr.rank + 1,
                                rankXP: this.xpSystems.getRankXpForRank(umr.rank + 1, totalRuns).rankXP
                            }
                        )
                )
            );

            // await this.runRepo.batchUpdateUserMapRank(
            //     ranks.map((umr) => {
            //         return {
            //             where: {
            //                 mapID_userID_gameType_flags_trackNum_zoneNum: {
            //                     ...umrWhere,
            //                     userID: umr.userID
            //                 }
            //             },
            //             data: {
            //                 rank: umr.rank + 1,
            //                 rankXP: this.xpSystems.getRankXpForRank(umr.rank + 1, totalRuns).rankXP
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

        const userStats = await this.userRepo.getUserStatsUnique({ userID: submittedRun.userID });

        if (!userStats) throw new BadRequestException('User stats not found');

        const currentLevel = userStats.level;
        const nextLevel = currentLevel + 1;

        // We want a 64 rather than 32 bit int in the DB, but in reality a user should never exceed
        // MAX_SAFE_INTEGER (2^53). Warn us just in case that's ever about to happen.
        const currentCosXp = Number(userStats.cosXP);
        if (currentCosXp >= Number.MAX_SAFE_INTEGER)
            this.logger.error(
                `User ${submittedRun.userID} is exceeding the maximum cosmetic XP a JS number can handle accurately!!`
            );

        let gainedLevels = 0;
        let requiredXP = this.xpSystems.getCosmeticXpForLevel(nextLevel);
        while (requiredXP > -1 && Number(userStats.cosXP) + cosXPGain >= requiredXP) {
            gainedLevels++;
            requiredXP = this.xpSystems.getCosmeticXpForLevel(nextLevel + gainedLevels);
        }

        const xpGain: XpGainDto = {
            rankXP: rankXP,
            cosXP: {
                gainLvl: gainedLevels,
                oldXP: Number(userStats.cosXP),
                gainXP: cosXPGain
            }
        };

        await this.userRepo.updateUserStats(
            { userID: submittedRun.userID },
            {
                totalJumps: { increment: submittedRun.overallStats.jumps },
                totalStrafes: { increment: submittedRun.overallStats.strafes },
                level: { increment: gainedLevels },
                cosXP: { increment: cosXPGain },
                runsSubmitted: { increment: 1 },
                mapsCompleted: hasCompletedMainTrackBefore ? { increment: 1 } : undefined
            }
        );

        return {
            isPersonalBest: isPersonalBest,
            isWorldRecord: isWorldRecord,
            existingRank: existingRank,
            umrCreate: umrCreate,
            xp: xpGain
        };
    }

    private async createAndStoreRun(processedRun: ProcessedRun, buffer: Buffer): Promise<Run> {
        const run = await this.runRepo.createRun(
            {
                user: { connect: { id: processedRun.userID } },
                map: { connect: { id: processedRun.mapID } },
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
            { zoneStats: true }
        );

        // We have to loop through each zoneStats to set their baseStats due to Prisma's lack of nested createMany
        // Might as well get our file uploading at the same time...
        await Promise.all([
            (async () => {
                const uploadResult = await this.fileCloudService.storeFileCloud(buffer, 'runs/' + run.id);

                await this.runRepo.updateRun(
                    { id: run.id },
                    {
                        file: uploadResult.fileKey,
                        hash: uploadResult.hash
                    }
                );
            })(),
            ...(run as any).zoneStats.map(
                async (zs) =>
                    await this.runRepo.updateRunZoneStats(
                        { id: zs.id },
                        {
                            baseStats: {
                                create: processedRun.zoneStats.find((przs) => przs.zoneNum === zs.zoneNum).baseStats
                            }
                        }
                    )
            )
        ]);

        return this.runRepo.getRunUnique({ id: run.id }, { overallStats: true, zoneStats: true });
    }

    // The old API performs some averaging here that makes absolutely no sense. Getting it to work would also be a massive
    // Prisma headache (see below comment I wrote before realising I didn't actually have to do this) so I'm just doing
    // something that works with Prisma but also won't be right
    // // The old API uses Sequelize's literal() here to do everything in one query. Because Prisma is a load of shit,
    // // we can't construct partial raw queries, has to be entirely Prisma or entirely raw. So we have to get the existing
    // // data first then transform it in JS, PLUS because of the schema structure to find the baseStats object to SELECT
    // // we have to do a nasty findFirst. This is fucking infuriating but I really don't want to write it raw right now,
    // // after everything is working if this seems slow I'll consider it.
    private static makeBaseStatsUpdate(baseStats: BaseStatsFromGame): Prisma.BaseStatsUpdateInput {
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
