// noinspection DuplicatedCode

import { MapType, MapStatus, getDefaultTickRateForMapType } from '@common/enums/map.enum';
import { AuthService } from '@modules/auth/auth.service';
import { PrismaService } from '@modules/repo/prisma.service';
import { RunTester, RunTesterProps } from '../util/run-tester';
import { CompletedRunDto } from '@common/dto/run/completed-run.dto';
import { del, post } from '../util/test-util';
import { RunSessionDto } from '@common/dto/run/run-session.dto';
import { RunSessionTimestampDto } from '@common/dto/run/run-session-timestamp.dto';
import { UserMapRankDto } from '@common/dto/run/user-map-rank.dto';
import { RunDto } from '@common/dto/run/runs.dto';
import { XpSystemsService } from '@modules/xp-systems/xp-systems.service';
import { RunValidationErrorTypes } from '@common/enums/run.enum';

describe('Session', () => {
    let user1,
        user2,
        user2Token,
        user2Session,
        map,
        nonGameAuthUser,
        nonGameAuthToken,
        prisma: PrismaService,
        xpSystems: XpSystemsService;

    beforeEach(async () => {
        prisma = global.prisma;
        xpSystems = global.xpSystems;

        user1 = await prisma.user.create({
            data: { alias: 'Hilary Putnam', steamID: '643563456', userStats: { create: {} } }
        });

        user2 = await prisma.user.create({
            data: { alias: 'Michael Dummett', steamID: '976893546', userStats: { create: {} } }
        });

        nonGameAuthUser = await prisma.user.create({
            data: { alias: 'Robert Brandom', steamID: '5asdf1234124', userStats: { create: {} } }
        });

        map = await prisma.map.create({
            data: {
                name: 'bhop_eazy' + Math.random().toString(36).slice(2),
                statusFlag: MapStatus.APPROVED,
                submitter: { connect: { id: user1.id } },
                type: MapType.BHOP,
                stats: { create: { baseStats: { create: {} } } },
                hash: '07320480e9245c2363d806bc4d1661f8034709b5',
                info: {
                    create: {
                        description: 'mamp',
                        numTracks: 1,
                        creationDate: '2022-07-07T18:33:33.000Z'
                    }
                },
                tracks: {
                    create: {
                        trackNum: 0,
                        numZones: 4,
                        isLinear: false,
                        difficulty: 5,
                        stats: { create: { baseStats: { create: {} } } },
                        zones: {
                            createMany: {
                                data: [{ zoneNum: 0 }, { zoneNum: 1 }, { zoneNum: 2 }, { zoneNum: 3 }, { zoneNum: 4 }]
                            }
                        }
                    }
                }
            },
            include: { tracks: { include: { zones: true } } }
        });

        await Promise.all(
            map.tracks[0].zones.map(async (zone) => {
                await prisma.mapZone.update({
                    where: { id: zone.id },
                    data: { stats: { create: { baseStats: { create: {} } } } }
                });
            })
        );

        await prisma.mapZoneTrigger.createMany({
            data: [
                {
                    zoneID: map.tracks[0].zones[0].id,
                    type: 0,
                    pointsZPos: 64.031197,
                    pointsHeight: 127.763,
                    points: '{"p0": "2720.000 -1856.000","p1": "2560.000 -1856.000","p2": "2560.000 -1600.000","p3": "2720.000 -1600.000"}'
                },
                {
                    zoneID: map.tracks[0].zones[2].id,
                    type: 2,
                    pointsZPos: 64.031197,
                    pointsHeight: 127.867996,
                    points: '{"p0": "2528.000 384.000","p1": "2720.000 384.000","p2": "2720.000 640.000","p3": "2528.000 640.000"}'
                },
                {
                    zoneID: map.tracks[0].zones[3].id,
                    type: 2,
                    pointsZPos: 64.031197,
                    pointsHeight: 127.765999,
                    points: '{"p0": "-480.000 -1600.000","p1": "-288.000 -1600.000","p2": "-288.000 -1856.000","p3": "-480.000 -1856.000"}'
                },
                {
                    zoneID: map.tracks[0].zones[4].id,
                    type: 2,
                    pointsZPos: 64.031197,
                    pointsHeight: 127.780998,
                    points: '{"p0": "2528.000 -992.000","p1": "2720.000 -992.000","p2": "2720.000 -736.000","p3": "2528.000 -736.000"}'
                }
            ]
        });

        await prisma.mapZoneTrigger.create({
            data: {
                zoneID: map.tracks[0].zones[1].id,
                properties: {
                    create: {
                        properties:
                            '{ "speed_limit": 350.000000, "limiting_speed": 1, "start_on_jump": 1, "speed_limit_type": 0 }'
                    }
                },
                type: 1,
                pointsZPos: 64.031197,
                pointsHeight: 128.179993,
                points: '{"p0": "-224.000 -480.000","p1": "-480.000 -480.000","p2": "-480.000 -224.000","p3": "-224.000 -224.000"}'
            }
        });

        user2Session = await prisma.runSession.create({
            data: {
                user: { connect: { id: user2.id } },
                track: { connect: { id: map.tracks[0].id } },
                trackNum: 0,
                zoneNum: 0
            }
        });

        const authService: AuthService = global.auth as AuthService;
        global.accessToken = (await authService.login(user1)).access_token;
        user2Token = (await authService.login(user2)).access_token;
        nonGameAuthToken = (await authService.loginWeb(user2)).accessToken;
    });

    afterEach(async () => {
        const prisma: PrismaService = global.prisma;

        await prisma.user.deleteMany({ where: { id: { in: [user1.id, user2.id, nonGameAuthUser.id] } } });
        await prisma.run.deleteMany({ where: { map: { id: map.id } } });
        await prisma.map.deleteMany({ where: { id: { in: [map.id] } } });
    });

    describe('POST session/run', () => {
        it('should return a valid run run object', async () => {
            const res = await post(`session/run`, 200, { mapID: map.id, trackNum: 0, zoneNum: 0 });

            expect(res.body).toBeValidDto(RunSessionDto);
            expect(res.body).toMatchObject({ trackNum: 0, zoneNum: 0, userID: user1.id });
        });

        it('should 400 if not given a proper body', () => post(`session/run`, 400, null));

        it('should 400 if the map does not have the provided trackNum', () =>
            post(`session/run`, 400, { mapID: map.id, trackNum: 2, zoneNum: 0 }));

        it('should 400 for staged runs UNTIL 0.12.0', () =>
            post(`session/run`, 400, { mapID: map.id, trackNum: 0, zoneNum: 1 }));

        it('should 400 if the map does not exist', () =>
            post(`session/run`, 400, { mapID: 111111111111, trackNum: 0, zoneNum: 0 }));

        it('should respond with 401 when no access token is provided', () =>
            post(`session/run`, 401, { mapID: map.id, trackNum: 0, zoneNum: 0 }, null));

        it('should return 403 if not using a game API key', () =>
            post({
                url: `session/run`,
                status: 403,
                body: { mapID: map.id, trackNum: 0, zoneNum: 0 },
                token: nonGameAuthToken
            }));
    });

    describe('DELETE session/run', () => {
        it('should delete the users run', async () => {
            await del(`session/run`, 204, user2Token);

            expect(
                await (global.prisma as PrismaService).runSession.findFirst({ where: { userID: user2.id } })
            ).toBeNull();
        });

        it('should 400 if the run does not exist', () => del(`session/run`, 400)); // User1 doesn't have an active run

        it('should respond with 401 when no access token is provided', () => del(`session/run`, 401, null));

        it('should return 403 if not using a game API key', () =>
            del({
                url: `session/run`,
                status: 403,
                token: nonGameAuthToken
            }));
    });

    describe('POST session/run/:sessionID', () => {
        it('should update an existing run run with the zone and tick', async () => {
            const res = await post(
                `session/run/${user2Session.id}`,
                200,
                {
                    zoneNum: 2,
                    tick: 510
                },
                user2Token
            );

            expect(res.body).toBeValidDto(RunSessionTimestampDto);
            expect(res.body.sessionID).toBe(user2Session.id.toString());
            expect(res.body.tick).toBe(510);
            expect(res.body.zone).toBe(2);
        });

        it('should 403 if not the owner of the run', () =>
            post(`session/run/${user2Session.id}`, 403, { zoneNum: 2, tick: 510 }));

        it('should 400 if the run does not exist', () =>
            post(`session/run/1234123413253245`, 400, { zoneNum: 2, tick: 510 }));

        // TODO once game auth done
        it('should 403 if not using a game API key', () =>
            post(
                `session/run/${user2Session.id}`,
                403,
                {
                    zoneNum: 2,
                    tick: 510
                },
                nonGameAuthToken
            ));

        // TODO once game auth done
        it('should return 403 if not using a game API key', () =>
            post(`session/run/${user2Session.id}`, 401, null, null));
    });

    // Testing this is HARD. We need a replay that matches our timestamps okay so we're going to be heavily relying on
    // this RunTester class to essentially generate a valid run the API will accept. NOTE: Before anyone gets any clever
    // ideas, this is *not* our anti-cheat. Just because this API will accept some goofy stuff, does not mean the live
    // game will, and trying to use this method on the live API is likely to get you banned!

    // I'm not writing IL tests yet as I'm not completely sure how they're supposed to work and not supported yet ingame.
    // Around 0.12.0 we'll want to write tests for those.
    describe('POST session/run/:sessionID/end', () => {
        const defaultTesterProps = (): RunTesterProps => {
            return {
                zoneNum: 0,
                trackNum: 0,
                runDate: Date.now().toString(),
                runFlags: 0,
                mapID: map.id,
                mapName: map.name,
                mapHash: map.hash,
                steamID: user1.steamID,
                tickRate: getDefaultTickRateForMapType(map.type),
                startTick: 0,
                playerName: 'Abstract Barry'
            };
        };

        // With the way we're constructed above DB inserts below the existing runs will be 0.01s, 1.01s, 2.01s ... 10.01s,
        // this is ~500ms so will be rank 2.
        const submitRun = (delay?: number) => RunTester.run(defaultTesterProps(), 3, delay);

        const submitWithOverrides = async (overrides: {
            props?: Partial<RunTesterProps>;
            delay?: number;
            beforeSubmit?: (self: RunTester) => void;
            beforeSave?: (self: RunTester) => void;
            writeStats?: boolean;
            writeFrames?: boolean;
        }) => {
            const tester = new RunTester({ ...defaultTesterProps(), ...overrides.props });

            await tester.startRun();
            await tester.doZones(3, overrides.delay);

            const { props: _, ...endRunProps } = overrides;
            return tester.endRun(endRunProps);
        };

        // Splitting these out in multiple tests. It's slower, but there's so much stuff we want to test here that I
        // want to keep it organised well. `map` is a different map in the DB each time so these can run parallel fine.
        describe('should process a valid run and ', () => {
            beforeEach(async () =>
                Promise.all(
                    Array.from({ length: 10 }, async (_, i) => {
                        await prisma.userMapRank.create({
                            data: {
                                run: {
                                    create: {
                                        map: { connect: { id: map.id } },
                                        zoneNum: 0,
                                        trackNum: 0,
                                        flags: 0,
                                        ticks: i * 100 + 1,
                                        tickRate: 0.01,
                                        file: '',
                                        hash: '',
                                        time: i + 0.01
                                    }
                                },
                                gameType: MapType.BHOP,
                                user: {
                                    create: {
                                        alias: 'St. Thomas Hairdryer IV',
                                        steamID: Math.random().toString().slice(2, 16)
                                    }
                                },
                                map: { connect: { id: map.id } },
                                zoneNum: 0,
                                trackNum: 0,
                                rank: i + 1
                            }
                        });
                    })
                )
            );

            it('should respond with a CompletedRunDto', async () => {
                const res = await submitRun();

                expect(res.status).toBe(200);
                expect(res.body).toBeValidDto(CompletedRunDto);
                expect(res.body.rank).toBeValidDto(UserMapRankDto);
                expect(res.body.run).toBeValidDto(RunDto);
                expect(res.body.isNewPersonalBest).toBe(true);
                expect(res.body.isNewWorldRecord).toBe(false);
            });

            it('should be inserted in leaderboards, shifting other ranks', async () => {
                const umrsBefore = await prisma.userMapRank.findMany({
                    where: { mapID: map.id, zoneNum: 0, trackNum: 0, gameType: MapType.BHOP, flags: 0 }
                });

                expect(umrsBefore.length).toBe(10);

                await submitRun();

                const umrsAfter = await prisma.userMapRank.findMany({
                    where: { mapID: map.id, zoneNum: 0, trackNum: 0, gameType: MapType.BHOP, flags: 0 }
                });

                expect(umrsAfter.length).toBe(11);
                expect(umrsAfter.find((umr) => umr.userID === user1.id).rank).toBe(2);

                for (const umrBefore of umrsBefore.filter((umr) => umr.rank > 1))
                    expect(umrsAfter.find((umrAfter) => umrAfter.userID === umrBefore.userID).rank).toBe(
                        umrBefore.rank + 1
                    );
            });

            it('if has a PB, only shift ranks between the PB and old run', async () => {
                // Update whatever UMR + run is rank 4 to belong to user1
                const rankToUpdate = await prisma.userMapRank.findFirst({
                    where: { mapID: map.id, rank: 4 },
                    include: { run: true }
                });

                await prisma.userMapRank.update({
                    where: { runID: (rankToUpdate as any).run.id },
                    data: {
                        user: { connect: { id: user1.id } },
                        run: { update: { user: { connect: { id: user1.id } } } }
                    }
                });

                const umrsBefore = await prisma.userMapRank.findMany({
                    where: { mapID: map.id, zoneNum: 0, trackNum: 0, gameType: MapType.BHOP, flags: 0 }
                });

                expect(umrsBefore.length).toBe(10);

                const res = await submitRun();

                expect(res.status).toBe(200);
                expect(res.body).toBeValidDto(CompletedRunDto);
                expect(res.body.isNewPersonalBest).toBe(true);

                const umrsAfter = await prisma.userMapRank.findMany({
                    where: { mapID: map.id, zoneNum: 0, trackNum: 0, gameType: MapType.BHOP, flags: 0 }
                });

                // It should have *updated* our existing UMR, so this should still be 10
                expect(umrsAfter.length).toBe(10);

                // So, it should have shifted rank 2, 3 to rank 3, 4, our rank (4) now becoming 2.
                // prettier-ignore
                expect(umrsBefore.find((umr) => umr.rank == 2).userID).toBe(
                    umrsAfter.find((umr) => umr.rank == 3).userID);

                // prettier-ignore
                expect(umrsBefore.find((umr) => umr.rank == 3).userID).toBe(
                    umrsAfter.find((umr) => umr.rank == 4).userID);

                // prettier-ignore
                expect(umrsBefore.find((umr) => umr.rank == 4).userID).toBe(
                    umrsAfter.find((umr) => umr.rank == 2).userID);

                expect(umrsBefore.find((umr) => umr.rank == 4).userID).toBe(user1.id);
            });

            it('should not change ranks or assign rank XP if not a PB', async () => {
                // Update whatever UMR + run is rank 1 to belong to user1
                const rankToUpdate = await prisma.userMapRank.findFirst({
                    where: { mapID: map.id, rank: 1 },
                    include: { run: true }
                });

                await prisma.userMapRank.update({
                    where: { runID: (rankToUpdate as any).run.id },
                    data: {
                        user: { connect: { id: user1.id } },
                        run: { update: { user: { connect: { id: user1.id } } } }
                    }
                });

                const umrsBefore = await prisma.userMapRank.findMany({
                    where: { mapID: map.id, zoneNum: 0, trackNum: 0, gameType: MapType.BHOP, flags: 0 }
                });

                expect(umrsBefore.length).toBe(10);

                const res = await submitRun();

                expect(res.status).toBe(200);
                expect(res.body).toBeValidDto(CompletedRunDto);
                expect(res.body.isNewPersonalBest).toBe(false);
                expect(res.body.xp.rankXP).toBe(0);

                const umrsAfter = await prisma.userMapRank.findMany({
                    where: { mapID: map.id, zoneNum: 0, trackNum: 0, gameType: MapType.BHOP, flags: 0 }
                });

                expect(umrsBefore).toEqual(umrsAfter);
            });

            it('should assign cosmetic and rank XP for the run', async () => {
                const res = await submitRun();

                expect(res.status).toBe(200);
                expect(res.body.rank.rank).toBe(2);
                expect(res.body.xp.rankXP).toBe(xpSystems.getRankXpForRank(2, 11).rankXP);
                expect(res.body.xp.cosXP.oldXP).toBe(0);
                expect(res.body.xp.cosXP.gainXP).toBe(
                    xpSystems.getCosmeticXpForCompletion(5, true, false, true, false)
                );
            });

            it('should update completion stats for the map, track and zones', async () => {
                await submitRun(10);
                await submitRun(15);

                // Our stats tracking on the old API is very weird, so I'm just checking completions for now.
                // None of the runs we added to the DB at the start of this test actually added stats, so we can
                // just check that completions are 1.
                const mapStats = await prisma.mapStats.findUnique({ where: { mapID: map.id } });
                expect(mapStats.completions).toBe(2);
                expect(mapStats.uniqueCompletions).toBe(1);

                const trackStats = await prisma.mapTrackStats.findUnique({ where: { trackID: map.tracks[0].id } });
                expect(trackStats.completions).toBe(2);
                expect(trackStats.uniqueCompletions).toBe(1);

                const zoneStats = await prisma.mapZoneStats.findMany({
                    where: { zone: { track: { mapID: map.id } } },
                    include: { zone: true }
                });

                for (const zone of zoneStats.filter((zs) => zs.zone.zoneNum !== 0)) {
                    expect(zone.completions).toBe(2);
                    expect(zone.uniqueCompletions).toBe(1);
                }
            });

            // TODO: Test activity creation once that's done!
        });

        describe('should reject if ', () => {
            it('there is no body', async () => {
                const res = await submitWithOverrides({
                    beforeSubmit: (self) => (self.replayFile.buffer = Buffer.from(''))
                });

                expect(res.status).toBe(400);
                expect(res.body.code).toBe(RunValidationErrorTypes.BAD_REPLAY_FILE);
            });

            it('the run does not have the proper number of timestamps', async () => {
                for (const numZones of [2, 4]) {
                    const tester = new RunTester(defaultTesterProps());

                    await tester.startRun();
                    await tester.doZones(numZones);

                    const res = await tester.endRun();

                    expect(res.status).toBe(400);
                    expect(res.body.code).toBe(RunValidationErrorTypes.BAD_TIMESTAMPS);
                }
            });

            it('the run was done out of order', async () => {
                const tester = new RunTester(defaultTesterProps());

                await tester.startRun();

                await tester.doZone();
                tester.currZone += 1;
                await tester.doZone();
                tester.currZone -= 2;
                await tester.doZone();
                const res = await tester.endRun();

                expect(res.status).toBe(400);
                expect(res.body.code).toBe(RunValidationErrorTypes.BAD_TIMESTAMPS);
            });

            it('there was no timestamps for a track with >1 zones', async () => {
                const tester = new RunTester(defaultTesterProps());

                await tester.startRun();
                const res = await tester.endRun();

                expect(res.status).toBe(400);
                expect(res.body.code).toBe(RunValidationErrorTypes.BAD_TIMESTAMPS);
            });

            it('the magic of the replay does not match', async () => {
                const res = await submitWithOverrides({ beforeSave: (self) => (self.replay.magic = 0xbeefcafe) });

                expect(res.status).toBe(400);
                expect(res.body.code).toBe(RunValidationErrorTypes.BAD_META);
            });

            it('the SteamID in the replay does not match the submitter', async () => {
                const res = await submitWithOverrides({ props: { steamID: '11111111111111' } });

                expect(res.status).toBe(400);
                expect(res.body.code).toBe(RunValidationErrorTypes.BAD_META);
            });

            it('the hash of the map stored in the replay does not match the stored hash of the DB map', async () => {
                const res = await submitWithOverrides({ props: { mapHash: 'egg' } });

                expect(res.status).toBe(400);
                expect(res.body.code).toBe(RunValidationErrorTypes.BAD_META);
            });

            it('the name of the map does not match the name of the map in the DB', async () => {
                const res = await submitWithOverrides({ props: { mapName: 'bhop_egg' } });

                expect(res.status).toBe(400);
                expect(res.body.code).toBe(RunValidationErrorTypes.BAD_META);
            });

            it('the run time in ticks is 0', async () => {
                const res = await submitWithOverrides({
                    delay: 0,
                    beforeSave: (self) => {
                        self.replay.header.startTick = 0;
                        self.replay.header.stopTick = 0;
                    }
                });

                expect(res.status).toBe(400);
                expect(res.body.code).toBe(RunValidationErrorTypes.BAD_TIMESTAMPS);
            });

            it('the run time in ticks is negative', async () => {
                const res = await submitWithOverrides({
                    delay: 0,
                    beforeSave: (self) => {
                        self.replay.header.startTick = 1;
                        self.replay.header.stopTick = 0;
                    }
                });

                expect(res.status).toBe(400);
                expect(res.body.code).toBe(RunValidationErrorTypes.BAD_TIMESTAMPS);
            });

            it('the replays track number is invalid for the map', async () => {
                const res = await submitWithOverrides({
                    beforeSave: (self) => {
                        self.replay.header.trackNum = 1;
                    }
                });

                expect(res.status).toBe(400);
                expect(res.body.code).toBe(RunValidationErrorTypes.BAD_META);
            });

            it('the replays zone number is invalid for the map', async () => {
                const res = await submitWithOverrides({
                    beforeSave: (self) => {
                        self.replay.header.zoneNum = 1;
                    }
                });

                expect(res.status).toBe(400);
                expect(res.body.code).toBe(RunValidationErrorTypes.BAD_META);
            });

            it('the run date is in the future', async () => {
                const res = await submitWithOverrides({
                    beforeSave: (self) => (self.replay.header.runDate = (Date.now() + 1000000).toString())
                });

                expect(res.status).toBe(400);
                expect(res.body.code).toBe(RunValidationErrorTypes.OUT_OF_SYNC);
            });

            it('the tickrate is not acceptable', async () => {
                const res = await submitWithOverrides({
                    beforeSave: (self) => (self.replay.header.tickRate = getDefaultTickRateForMapType(map.type) + 0.001)
                });

                expect(res.status).toBe(400);
                expect(res.body.code).toBe(RunValidationErrorTypes.OUT_OF_SYNC);
            });

            it('the run does not fall within the run run timestamps', async () => {
                const res = await submitWithOverrides({
                    beforeSave: (self) => (self.replay.header.stopTick *= 2)
                });

                expect(res.status).toBe(400);
                expect(res.body.code).toBe(RunValidationErrorTypes.OUT_OF_SYNC);
            });

            it('the run does not have stats', async () => {
                const res = await submitWithOverrides({ writeStats: false });

                expect(res.status).toBe(400);
                expect(res.body.code).toBe(RunValidationErrorTypes.BAD_REPLAY_FILE);
            });

            it('the run has no run frames', async () => {
                const res = await submitWithOverrides({ writeFrames: false });

                expect(res.status).toBe(400);
                expect(res.body.code).toBe(RunValidationErrorTypes.BAD_REPLAY_FILE);
            });

            // TODO: This depends if Goc wants to do it https://discord.com/channels/235111289435717633/487354170546978816/1004921906094419978
            // it('the run date is too old (5+ seconds old)', () => {
            //     return;
            // });

            // it('there are timestamps for an IL run', () => {
            //     return;
            // });
        });
    });
});
