// noinspection DuplicatedCode
import * as request from 'supertest';
import { RunDto } from '@common/dto/run/run.dto';
import { PrismaService } from '@modules/repo/prisma.service';
import { get } from '../util/request-handlers.util';
import { expandTest, skipTest, takeTest } from '@tests/util/generic-e2e-tests.util';
import { Config } from '@config/config';
import {
    createAndLoginUser,
    createUser,
    createMap,
    createMaps,
    createRun,
    createRunAndUmrForMap
} from '@tests/util/db.util';

//TODO globally make sure that all variables are in the right scope (perhaps shift to it instead of describe)

describe('Runs', () => {
    let prisma: PrismaService;
    const r1ticks = 75724;
    const r1tickrate = 100;

    beforeEach(async () => {
        prisma = global.prisma;
    });

    describe('/api/runs', () => {
        describe('GET', () => {
            let u1, u1Token, u2, m1, m2, r1, r2, r3, r4;

            beforeAll(async () => {
                [[u1, u1Token], u2, [m1, m2]] = await Promise.all([createAndLoginUser(), createUser(), createMaps(2)]);

                //TODO create all the runs, perhaps move some to specific it, makes sure to create with Umr
                r1 = createRunAndUmrForMap({
                    map: m1,
                    rank: 6,
                    user: u1,
                    ticks: r1ticks * r1tickrate,
                    flags: 1 << 0,
                    createdAt: new Date('2013-09-05 15:34:00'),
                    trackNum: 1,
                    zoneNum: 1
                });
            });

            afterAll(() => Promise.all([prisma.user.deleteMany(), prisma.map.deleteMany(), prisma.run.deleteMany()]));

            const expects = (res) => expect(res.body).toBeValidPagedDto(RunDto);

            it('should respond with a list of runs', async () => {
                const res = await get({
                    url: 'runs',
                    status: 200,
                    token: u1Token
                });

                expects(res);

                expect(res.body.totalCount).toBeGreaterThanOrEqual(4);
                expect(res.body.returnCount).toBeGreaterThanOrEqual(4);
            });

            it('should respond with a list of runs with take parameter', () =>
                takeTest({
                    url: 'runs',
                    test: expects,
                    token: u1Token
                }));

            it('should respond with a list of runs with skip parameter', () =>
                skipTest({
                    url: 'runs',
                    test: expects,
                    token: u1Token
                }));

            it('should respond with list of runs filtered by mapID parameter', async () => {
                const res = await get({
                    url: 'runs',
                    status: 200,
                    query: { mapID: m1.id },
                    token: u1Token
                });

                expects(res);

                expect(res.body.totalCount).toBe(2);
                expect(res.body.returnCount).toBe(2);
                expect(res.body.response[0].mapID).toBe(m1.id);
            });

            it('should respond with a list of runs filtered by userID parameter', async () => {
                const res = await get({
                    url: 'runs',
                    status: 200,
                    query: { userID: u1.id },
                    token: u1Token
                });

                expects(res);

                expect(res.body.totalCount).toBe(2);
                expect(res.body.returnCount).toBe(2);
                expect(res.body.response[0].userID).toBe(u1.id);
            });

            it('should respond with a list of runs filtered by a list of user ids', async () => {
                const ids = u1.id + ',' + u2.id;
                const res = await get({
                    url: 'runs',
                    status: 200,
                    query: { userIDs: ids },
                    token: u1Token
                });

                expects(res);

                expect(res.body.totalCount).toBe(4);
                expect(res.body.returnCount).toBe(4);
                expect(ids).toContain(res.body.response[0].userID.toString());
            });

            it('should respond with a list of runs filtered by flags', async () => {
                const res = await get({
                    url: 'runs',
                    status: 200,
                    query: { flags: 1 << 5 },
                    token: u1Token
                });

                expects(res);

                expect(res.body.totalCount).toBe(1);
                expect(res.body.response[0].flags).toBe(run4.flags); // This uses strict equality for now, but will change in 0.10.0
            });

            it('should respond with a list of runs with the map include', () =>
                expandTest({
                    url: 'runs',
                    test: expects,
                    expand: 'map',
                    paged: true,
                    token: u1Token
                }));

            it('should respond with a list of runs with the rank include', async () => {
                const res = await get({
                    url: 'runs',
                    status: 200,
                    query: { expand: 'rank' },
                    token: u1Token
                });

                expects(res);

                expect(res.body.totalCount).toBeGreaterThanOrEqual(4);
                expect(res.body.returnCount).toBeGreaterThanOrEqual(4);
                expect(res.body.response.filter((x) => Object.hasOwn(x, 'rank')).length).toBe(4); // 4 test runs have a rank, so we should see 2 in the response
            });

            it('should respond with a list of runs with the zoneStats include', () =>
                expandTest({
                    url: 'runs',
                    test: expects,
                    expand: 'zoneStats',
                    paged: true,
                    token: u1Token
                }));

            it('should respond with a list of runs with the overallStats include', () =>
                expandTest({
                    url: 'runs',
                    test: expects,
                    expand: 'overallStats',
                    paged: true,
                    token: u1Token
                }));

            it('should respond with a list of runs with the mapWithInfo include', async () => {
                const res = await get({
                    url: 'runs',
                    status: 200,
                    query: { expand: 'mapWithInfo' },
                    token: u1Token
                });

                expects(res);

                for (const x of res.body.response) expect(x.map).toHaveProperty('info');
            });

            it('should respond with a list of runs filtered by partial mapName match', async () => {
                const res = await get({
                    url: 'runs',
                    status: 200,
                    query: { mapName: 'epicf', expand: 'map' },
                    token: u1Token
                });

                expects(res);

                expect(res.body.totalCount).toBe(2);
                expect(res.body.response[0].map.name).toBe(m2.name);
            });

            it('should respond with a list of runs that are personal bests', async () => {
                const res = await get({
                    url: 'runs',
                    status: 200,
                    query: { isPB: true, expand: 'rank' },
                    token: u1Token
                });

                expects(res);

                expect(res.body.totalCount).toBeGreaterThanOrEqual(2);
                expect(res.body.returnCount).toBeGreaterThanOrEqual(2);
                for (const x of res.body.response) {
                    expect(x).toHaveProperty('rank');
                    expect([run2.id, run3.id]).not.toContain(BigInt(x.id));
                }
            });

            it('should respond with a list of runs sorted by date', async () => {
                const res = await get({
                    url: 'runs',
                    status: 200,
                    query: { order: 'date' },
                    token: u1Token
                });

                expects(res);

                const sortedRes = [...res.body.response];
                sortedRes.sort((n1, n2) => new Date(n2.createdAt).getTime() - new Date(n1.createdAt).getTime());

                expect(res.body.response).toEqual(sortedRes);
            });

            it('should respond with a list of runs sorted by time', async () => {
                const res = await get({
                    url: 'runs',
                    status: 200,
                    query: { order: 'time' },
                    token: u1Token
                });

                expects(res);

                const sortedRes = [...res.body.response];
                sortedRes.sort((n1, n2) => n1.ticks - n2.ticks);

                expect(res.body.response).toEqual(sortedRes);
            });

            it('should 401 if no access token is provided', () =>
                get({
                    url: 'runs',
                    status: 401
                }));
        });
    });

    describe('/api/runs/{runID}', () => {
        describe('GET', () => {
            let u1, u1Token, m1, r1;

            beforeAll(async () => {
                [[u1, u1Token], m1] = await Promise.all([createAndLoginUser(), createMap()]);
                r1 = createRun({
                    map: m1,
                    user: u1,
                    ticks: r1ticks * r1tickrate,
                    flags: 1 << 0,
                    createdAt: new Date('2013-09-05 15:34:00'),
                    trackNum: 1,
                    zoneNum: 1
                });
            });

            afterAll(() => Promise.all([prisma.user.deleteMany(), prisma.map.deleteMany(), prisma.run.deleteMany()]));

            const expects = (res: request.Response) => expect(res.body).toBeValidDto(RunDto);
            it('should return a valid run', async () => {
                const res = await get({
                    url: 'runs/' + r1.id,
                    status: 200,
                    token: u1Token
                });

                expects(res);

                expect(res.body.id).toBe(Number(r1.id));
                expect(res.body.mapID).toBe(r1.mapID);
            });

            it('should respond with a run using the overallStats include', () =>
                expandTest({
                    url: 'runs/' + r1.id,
                    test: expects,
                    expand: 'overallStats',
                    token: u1Token
                }));

            it('should respond with a run using the map include', () =>
                expandTest({
                    url: 'runs/' + r1.id,
                    test: expects,
                    expand: 'map',
                    token: u1Token
                }));

            it('should respond with a run using the rank include', () =>
                expandTest({
                    url: 'runs/' + r1.id,
                    test: expects,
                    expand: 'rank',
                    token: u1Token
                }));

            it('should respond with a run using the zoneStats include', () =>
                expandTest({
                    url: 'runs/' + r1.id,
                    test: expects,
                    expand: 'zoneStats',
                    token: u1Token
                }));

            it('should respond with a run using the mapWithInfo include', async () => {
                const res = await get({
                    url: 'runs/' + r1.id,
                    status: 200,
                    query: { expand: 'mapWithInfo' },
                    token: u1Token
                });

                expects(res);

                expect(res.body.map).toHaveProperty('info');
            });

            it('should 404 when no run is found', () =>
                get({
                    url: 'runs/123456789',
                    status: 404,
                    token: u1Token
                }));

            it('should 401 when no access token is provided', () =>
                get({
                    url: 'runs/1',
                    status: 401
                }));
        });
    });

    describe('/api/runs/{runID}/download', () => {
        describe('GET', () => {
            let u1, u1Token, m1, r1;

            beforeAll(async () => {
                [[u1, u1Token], m1] = await Promise.all([createAndLoginUser(), createMap()]);
                r1 = createRun({
                    map: m1,
                    user: u1,
                    ticks: r1ticks * r1tickrate,
                    flags: 1 << 0,
                    createdAt: new Date('2013-09-05 15:34:00'),
                    trackNum: 1,
                    zoneNum: 1
                });
                //TODO make the run file uploading work
            });

            afterAll(() => Promise.all([prisma.user.deleteMany(), prisma.map.deleteMany(), prisma.run.deleteMany()]));

            it('should redirect to the download url of the run', async () => {
                const res = await get({
                    url: `runs/${r1.id}/download`,
                    status: 302,
                    token: u1Token,
                    contentType: null
                });

                //TODO potentially change this
                console.log(`${Config.url.cdn}/${Config.storage.bucketName}/${r1.file}`);
                expect(res.header.location).toEqual(`${Config.url.cdn}/${Config.storage.bucketName}/${r1.file}`);
                console.log(res.header.location);
            });

            it('should 404 when no run is found', () =>
                get({
                    url: 'runs/1191137119/download',
                    status: 404,
                    token: u1Token
                }));

            it('should 401 when no access token is provided', () =>
                get({
                    url: `runs/${r1.id}/download`,
                    status: 401
                }));
        });
    });
});
