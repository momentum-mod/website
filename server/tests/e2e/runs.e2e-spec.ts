// noinspection DuplicatedCode
import * as request from 'supertest';
import { RunDto } from '../../src/common/dto/run/runs.dto';
import { MapType, MapStatus, MapCreditType } from '../../src/common/enums/map.enum';
import { AuthService } from '../../src/modules/auth/auth.service';
import { PrismaService } from '../../src/modules/repo/prisma.service';
import { get, takeTest, skipTest, expandTest } from '../util/test-util';

describe('runs', () => {
    let user1, map1, run1, run2, run3, run4, user2, map2;

    beforeEach(async () => {
        const prisma: PrismaService = global.prisma;

        user1 = await prisma.user.create({
            data: {
                steamID: '113706901137',
                country: 'CA',
                alias: 'Jean Chretien',
                roles: { create: { admin: true } },
                avatar: 'chretien_selfie.png',
                profile: {
                    create: {
                        bio: 'Jean Chretien is a Canadian lawyer and politician who served as the 20th prime minister of Canada from 1993 to 2003.'
                    }
                }
            },
            include: {
                profile: true
            }
        });

        user2 = await prisma.user.create({
            data: {
                steamID: '123654789',
                country: 'CA',
                alias: 'John Laurie',
                roles: { create: { mapper: true } },
                avatar: 'jlau.png',
                profile: {
                    create: {
                        bio: 'Canadian educator and political activist. He espoused Indigenous causes and assisted many Indigenous youth in furthering their education.'
                    }
                }
            },
            include: {
                profile: true
            }
        });

        map1 = await prisma.map.create({
            data: {
                name: 'rj_super_jurf_testing',
                type: MapType.RJ,
                statusFlag: MapStatus.APPROVED,
                submitter: { connect: { id: user1.id } },
                credits: {
                    create: {
                        type: MapCreditType.AUTHOR,
                        user: { connect: { id: user1.id } }
                    }
                },
                info: {
                    create: {
                        description:
                            'This breaking bad themed jurf map is great for fans of the show and fast-paced rocket action alike.',
                        numTracks: 20,
                        creationDate: new Date()
                    }
                }
            }
        });

        map2 = await prisma.map.create({
            data: {
                name: 'surf_epicfun_testingmap',
                type: MapType.SURF,
                statusFlag: MapStatus.APPROVED,
                submitter: { connect: { id: user2.id } },
                credits: {
                    create: {
                        type: MapCreditType.AUTHOR,
                        user: { connect: { id: user2.id } }
                    }
                },
                info: {
                    create: {
                        description:
                            'Momentum Mod is not responsible for any bodily harm that may occur as a result of playing this map.',
                        numTracks: 2,
                        creationDate: new Date()
                    }
                }
            }
        });

        const r1ticks = 113700;
        const r1tickrate = 66.6;
        run1 = await prisma.run.create({
            data: {
                map: { connect: { id: map1.id } },
                user: { connect: { id: user1.id } },
                trackNum: 1,
                zoneNum: 1,
                ticks: r1ticks,
                tickRate: r1tickrate,
                time: r1ticks * r1tickrate,
                flags: 1 << 0,
                file: 'world_record.run',
                hash: '0xdeadbeef',
                rank: {
                    create: {
                        gameType: MapType.RJ,
                        flags: 0,
                        trackNum: 0,
                        zoneNum: 0,
                        rank: 6,
                        map: { connect: { id: map1.id } },
                        user: { connect: { id: user1.id } }
                    }
                },
                overallStats: {
                    create: {
                        jumps: 1
                    }
                },
                zoneStats: {
                    createMany: {
                        data: [{ zoneNum: 1 }, { zoneNum: 2 }]
                    }
                },
                createdAt: new Date('2013-09-05 15:34:00')
            }
        });

        const r2ticks = 692001;
        const r2tickrate = 66.6;
        run2 = await prisma.run.create({
            data: {
                map: { connect: { id: map1.id } },
                user: { connect: { id: user2.id } },
                trackNum: 1,
                zoneNum: 1,
                ticks: 692001,
                tickRate: 66.6,
                time: r2ticks * r2tickrate,
                flags: 1 << 1,
                file: 'jumping.run',
                hash: '0xfacade',
                overallStats: {
                    create: {
                        jumps: 1
                    }
                },
                zoneStats: {
                    createMany: {
                        data: [{ zoneNum: 1 }, { zoneNum: 2 }]
                    }
                },
                createdAt: new Date('2018-10-05 11:37:00')
            }
        });

        const r3ticks = 123456;
        const r3tickrate = 66.6;
        run3 = await prisma.run.create({
            data: {
                map: { connect: { id: map2.id } },
                user: { connect: { id: user1.id } },
                trackNum: 1,
                zoneNum: 1,
                ticks: 123456,
                tickRate: 66.6,
                time: r3ticks * r3tickrate,

                flags: 1 << 4,
                file: 'surfing_fast.run',
                hash: '0x1137',
                overallStats: {
                    create: {
                        jumps: 1
                    }
                },
                zoneStats: {
                    createMany: {
                        data: [{ zoneNum: 1 }, { zoneNum: 2 }]
                    }
                }
            }
        });

        const r4ticks = 123456;
        const r4tickrate = 66.6;
        run4 = await prisma.run.create({
            data: {
                map: { connect: { id: map2.id } },
                user: { connect: { id: user2.id } },
                trackNum: 1,
                zoneNum: 1,
                ticks: 99999,
                tickRate: 66.6,
                time: r4ticks * r4tickrate,
                flags: 1 << 5,
                file: 'surfing_faster.run',
                hash: '0xh4sh',
                rank: {
                    create: {
                        gameType: MapType.RJ,
                        flags: 0,
                        trackNum: 0,
                        zoneNum: 0,
                        rank: 111,
                        map: { connect: { id: map2.id } },
                        user: { connect: { id: user2.id } }
                    }
                },
                overallStats: {
                    create: {
                        jumps: 1
                    }
                },
                zoneStats: {
                    createMany: {
                        data: [{ zoneNum: 1 }, { zoneNum: 2 }]
                    }
                }
            },
            include: {
                overallStats: true,
                zoneStats: true
            }
        });

        const authService: AuthService = global.auth as AuthService;
        global.accessToken = (await authService.login(user1)).access_token;
    });

    afterEach(async () => {
        const prisma: PrismaService = global.prisma;

        await prisma.user.deleteMany({ where: { id: { in: [user1.id, user2.id] } } });
        await prisma.run.deleteMany({ where: { id: { in: [run1.id, run2.id, run3.id, run4.id] } } });
        await prisma.map.deleteMany({ where: { id: { in: [map1.id, map2.id] } } });
    });

    describe('GET /api/v1/runs', () => {
        const expects = (res) => expect(res.body).toBeValidPagedDto(RunDto);

        it('should respond with a list of runs', async () => {
            const res = await get('runs', 200);

            expects(res);

            expect(res.body.totalCount).toBeGreaterThanOrEqual(4);
            expect(res.body.returnCount).toBeGreaterThanOrEqual(4);
        });

        it('should respond with a list of runs with take parameter', () => takeTest('runs', expects));

        it('should respond with a list of runs with skip parameter', () => skipTest('runs', expects));

        it('should respond with list of runs filtered by mapID parameter', async () => {
            const res = await get('runs', 200, { mapID: map1.id });

            expects(res);

            expect(res.body.totalCount).toBe(2);
            expect(res.body.returnCount).toBe(2);
            expect(res.body.response[0].mapID).toBe(map1.id);
        });

        it('should respond with a list of runs filtered by userID parameter', async () => {
            const res = await get('runs', 200, { userID: user1.id });

            expects(res);

            expect(res.body.totalCount).toBe(2);
            expect(res.body.returnCount).toBe(2);
            expect(res.body.response[0].userID).toBe(user1.id);
        });

        it('should respond with a list of runs filtered by a list of user ids', async () => {
            const ids = user1.id + ',' + user2.id;
            const res = await get('runs', 200, { userIDs: ids });

            expects(res);

            expect(res.body.totalCount).toBe(4);
            expect(res.body.returnCount).toBe(4);
            expect(ids).toContain(res.body.response[0].userID.toString());
        });

        it('should respond with a list of runs filtered by flags', async () => {
            const res = await get('runs', 200, { flags: 1 << 5 });

            expects(res);

            expect(res.body.totalCount).toBe(1);
            expect(res.body.response[0].flags).toBe(run4.flags); // This uses strict equality for now, but will change in 0.10.0
        });

        it('should respond with a list of runs with the map include', () => expandTest('runs', expects, 'map', true));

        it('should respond with a list of runs with the rank include', async () => {
            const res = await get('runs', 200, { expand: 'rank' });

            expects(res);

            expect(res.body.totalCount).toBeGreaterThanOrEqual(4);
            expect(res.body.returnCount).toBeGreaterThanOrEqual(4);
            expect(res.body.response.filter((x) => x.hasOwnProperty('rank')).length).toBe(2); // 2 test runs have a rank, so we should see 2 in the response
        });

        it('should respond with a list of runs with the zoneStats include', () =>
            expandTest('runs', expects, 'zoneStats', true));

        it('should respond with a list of runs with the overallStats include', () =>
            expandTest('runs', expects, 'overallStats', true));

        it('should respond with a list of runs with the mapWithInfo include', async () => {
            const res = await get('runs', 200, { expand: 'mapWithInfo' });

            expects(res);

            res.body.response.forEach((x) => expect(x.map).toHaveProperty('info'));
        });

        it('should respond with a list of runs filtered by partial mapName match', async () => {
            const res = await get('runs', 200, { mapName: 'epicf', expand: 'map' });

            expects(res);

            expect(res.body.totalCount).toBe(2);
            expect(res.body.response[0].map.name).toBe(map2.name);
        });

        it('should respond with a list of runs that are personal bests', async () => {
            const res = await get('runs', 200, { isPB: true, expand: 'rank' });

            expects(res);

            expect(res.body.totalCount).toBeGreaterThanOrEqual(2);
            expect(res.body.returnCount).toBeGreaterThanOrEqual(2);
            res.body.response.forEach((x) => {
                expect(x).toHaveProperty('rank');
                expect([run2.id, run3.id]).not.toContain(BigInt(x.id));
            });
        });

        it('should respond with a list of runs sorted by date', async () => {
            const res = await get('runs', 200, { order: 'date' });

            expects(res);

            const sortedRes = [...res.body.response];
            sortedRes.sort((n1, n2) => new Date(n2.createdAt).getTime() - new Date(n1.createdAt).getTime());

            expect(res.body.response).toEqual(sortedRes);
        });

        it('should respond with a list of runs sorted by time', async () => {
            const res = await get('runs', 200, { order: 'time' });

            expects(res);

            const sortedRes = [...res.body.response];
            sortedRes.sort((n1, n2) => n1.ticks - n2.ticks);

            expect(res.body.response).toEqual(sortedRes);
        });

        it('should respond with 401 if no access token is provided', () => get('runs', 401, {}, null));
    });

    describe('GET /api/v1/runs/{runID}', () => {
        const expects = (res: request.Response) => expect(res.body).toBeValidDto(RunDto);
        it('should return a valid run', async () => {
            const res = await get('runs/' + run1.id, 200);

            expects(res);

            expect(res.body.id).toBe(run1.id.toString());
            expect(res.body.mapID).toBe(run1.mapID);
        });

        it('should respond with a run using the overallStats include', () =>
            expandTest('runs/' + run1.id, expects, 'overallStats', false));

        it('should respond with a run using the map include', () =>
            expandTest('runs/' + run1.id, expects, 'map', false));

        it('should respond with a run using the rank include', () =>
            expandTest('runs/' + run1.id, expects, 'rank', false));

        it('should respond with a run using the zoneStats include', () =>
            expandTest('runs/' + run1.id, expects, 'zoneStats', false));

        it('should respond with a run using the mapWithInfo include', async () => {
            const res = await get('runs/' + run1.id, 200, { expand: 'mapWithInfo' });

            expects(res);

            expect(res.body.map).toHaveProperty('info');
        });

        it('should respond with 404 when no run is found', () => get('runs/123456789', 404));

        it('should respond with 401 when no access token is provided', () => get('runs/1', 401, {}, null));
    });
});
