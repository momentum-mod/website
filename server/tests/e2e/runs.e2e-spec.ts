import { RunDto } from '@common/dto/run/run.dto';
import { PrismaService } from '@modules/repo/prisma.service';
import { get } from '../util/request-handlers.util';
import {
    expandTest,
    skipTest,
    sortByDateTest,
    sortTest,
    takeTest,
    unauthorizedTest
} from '@tests/util/generic-e2e-tests.util';
import { Config } from '@config/config';
import { createRun, createRunAndUmrForMap, createMaps, createUsers, dateOffset, NULL_ID } from '@tests/util/db.util';
import { login } from '@tests/util/auth.util';

const prisma: PrismaService = global.prisma;

describe('Runs', () => {
    afterAll(async () => {
        if ((await prisma.map.findFirst()) || (await prisma.user.findFirst()) || (await prisma.run.findFirst())) {
            1;
        }
    });
    describe('runs', () => {
        describe('GET', () => {
            let users, token, maps;

            beforeAll(async () => {
                [users, maps] = await Promise.all([createUsers(2), createMaps(2)]);
                token = await login(users[0]);

                await Promise.all([
                    createRunAndUmrForMap({ map: maps[0], user: users[0], createdAt: dateOffset(-4), flags: 1 }),
                    createRun({ map: maps[0], user: users[1], createdAt: dateOffset(-3) }),
                    createRunAndUmrForMap({ map: maps[1], user: users[0], createdAt: dateOffset(-2) }),
                    createRun({ map: maps[1], user: users[1], createdAt: dateOffset(-1) })
                ]);
            });

            afterAll(() => Promise.all([prisma.user.deleteMany(), prisma.map.deleteMany(), prisma.run.deleteMany()]));

            it('should respond with a list of runs', async () => {
                const res = await get({
                    url: 'runs',
                    status: 200,
                    validatePaged: { type: RunDto, count: 4 },
                    token: token
                });

                for (const run of res.body.response) expect(run).toHaveProperty('user');
            });

            it('should respond with a list of runs with take parameter', () =>
                takeTest({ url: 'runs', validate: RunDto, token: token }));

            it('should respond with a list of runs with skip parameter', () =>
                skipTest({ url: 'runs', validate: RunDto, token: token }));

            it('should respond with list of runs filtered by mapID parameter', async () => {
                const res = await get({
                    url: 'runs',
                    status: 200,
                    query: { mapID: maps[0].id },
                    validatePaged: { type: RunDto, count: 2 },
                    token: token
                });

                for (const run of res.body.response) expect(run.mapID).toBe(maps[0].id);
            });

            it('should respond with a list of runs filtered by userID parameter', async () => {
                const res = await get({
                    url: 'runs',
                    status: 200,
                    query: { userID: users[0].id },
                    validatePaged: { type: RunDto, count: 2 },
                    token: token
                });

                for (const run of res.body.response) expect(run.userID).toBe(users[0].id);
            });

            it('should respond with a list of runs filtered by a list of user ids', async () => {
                const ids = `${users[0].id},${users[1].id}`;
                const res = await get({
                    url: 'runs',
                    status: 200,
                    query: { userIDs: ids },
                    validatePaged: { type: RunDto, count: 4 },
                    token: token
                });

                for (const run of res.body.response) expect(ids).toContain(run.userID.toString());
            });

            it('should respond with a list of runs filtered by flags', async () => {
                const res = await get({
                    url: 'runs',
                    status: 200,
                    query: { flags: 1 },
                    validatePaged: { type: RunDto, count: 1 },
                    token: token
                });

                expect(res.body.response[0]).toMatchObject({ flags: 1, userID: users[0].id, mapID: maps[0].id });
            });

            it('should respond with a list of runs with the map include', () =>
                expandTest({ url: 'runs', validate: RunDto, expand: 'map', paged: true, token: token }));

            it('should respond with a list of runs with the rank include', async () => {
                const res = await get({
                    url: 'runs',
                    status: 200,
                    query: { expand: 'rank' },
                    validatePaged: { type: RunDto, count: 4 },
                    token: token
                });

                expect(res.body.response.filter((x) => x.rank !== null).length).toBe(2);
            });

            it('should respond with a list of runs with the zoneStats include', () =>
                expandTest({ url: 'runs', validate: RunDto, expand: 'zoneStats', paged: true, token: token }));

            it('should respond with a list of runs with the overallStats include', () =>
                expandTest({ url: 'runs', validate: RunDto, expand: 'overallStats', paged: true, token: token }));

            it('should respond with a list of runs with the mapWithInfo include', async () => {
                const res = await get({
                    url: 'runs',
                    status: 200,
                    query: { expand: 'mapWithInfo' },
                    validatePaged: { type: RunDto, count: 4 },
                    token: token
                });

                for (const run of res.body.response) expect(run.map).toHaveProperty('info');
            });

            it('should respond with a list of runs filtered by partial mapName match', async () => {
                const res = await get({
                    url: 'runs',
                    status: 200,
                    query: { mapName: maps[0].name.slice(-3) },
                    validatePaged: { type: RunDto, count: 1 },
                    token: token
                });

                expect(res.body.response[0].mapID).toBe(maps[1].id);
            });

            it('should respond with a list of runs that are personal bests', async () => {
                const res = await get({
                    url: 'runs',
                    status: 200,
                    query: { isPB: true, expand: 'rank' },
                    validatePaged: { type: RunDto, count: 2 },
                    token: token
                });

                for (const run of res.body.response) expect(run).toHaveProperty('rank');
            });

            it('should respond with a list of runs sorted by date', () =>
                sortByDateTest({ url: 'runs', query: { order: 'date' }, validate: RunDto, token: token }));

            it('should respond with a list of runs sorted by time', () =>
                sortTest({
                    url: 'runs',
                    query: { order: 'date' },
                    validate: RunDto,
                    sortFn: (n1, n2) => n1.ticks - n2.ticks,
                    token: token
                }));

            unauthorizedTest('runs', get);
        });
    });

    describe('runs/{runID}', () => {
        describe('GET', () => {
            let user, token, map, run;

            beforeAll(async () => {
                run = await createRunAndUmrForMap({ map: map, rank: 1, user: user, ticks: 1 });
                user = run.user;
                map = run.map;
                token = await login(user);
            });

            afterAll(() => Promise.all([prisma.user.deleteMany(), prisma.map.deleteMany(), prisma.run.deleteMany()]));

            it('should return a valid run', () =>
                get({ url: 'runs/' + run.id, status: 200, validate: RunDto, token: token }));

            it('should respond with a run using the overallStats include', () =>
                expandTest({ url: 'runs/' + run.id, validate: RunDto, expand: 'overallStats', token: token }));

            it('should respond with a run using the map include', () =>
                expandTest({ url: 'runs/' + run.id, validate: RunDto, expand: 'map', token: token }));

            it('should respond with a run using the rank include', () =>
                expandTest({ url: 'runs/' + run.id, validate: RunDto, expand: 'rank', token: token }));

            it('should respond with a run using the zoneStats include', () =>
                expandTest({ url: 'runs/' + run.id, validate: RunDto, expand: 'zoneStats', token: token }));

            it('should respond with a run using the mapWithInfo include', async () => {
                const res = await get({
                    url: 'runs/' + run.id,
                    status: 200,
                    query: { expand: 'mapWithInfo' },
                    validate: RunDto,
                    token: token
                });

                expect(res.body.map).toHaveProperty('info');
            });

            it('should 404 when no run is found', () => get({ url: `runs/${NULL_ID}`, status: 404, token: token }));

            unauthorizedTest('runs/1', get);
        });
    });

    describe('runs/{runID}/download', () => {
        describe('GET', () => {
            let user, token, map, run;

            beforeAll(async () => {
                run = await createRunAndUmrForMap({ map: map, rank: 1, user: user, ticks: 1 });
                user = run.user;
                map = run.map;
                token = await login(user);
            });

            afterAll(() => Promise.all([prisma.user.deleteMany(), prisma.map.deleteMany(), prisma.run.deleteMany()]));

            it('should redirect to the download url of the run', async () => {
                const res = await get({
                    url: `runs/${run.id}/download`,
                    status: 302,
                    token: token,
                    contentType: 'json'
                });

                //LEGACY why are there logs here
                //CHECK I have 0 idea how it manages to find a file
                expect(res.header.location).toEqual(`${Config.url.cdn}/${Config.storage.bucketName}/${run.file}`);
            });

            it('should 404 when no run is found', () =>
                get({ url: `runs/${NULL_ID}/download`, status: 404, token: token }));

            unauthorizedTest('runs/1/download', get);
        });
    });
});
