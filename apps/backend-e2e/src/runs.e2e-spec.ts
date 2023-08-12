// noinspection DuplicatedCode

import { Config } from '@momentum/backend/config';
import { RunDto } from '@momentum/backend/dto';
import {
  AuthUtil,
  dateOffset,
  DbUtil,
  NULL_ID,
  RequestUtil
} from '@momentum/backend/test-utils';
import { PrismaClient } from '@prisma/client';
import {
  setupE2ETestEnvironment,
  teardownE2ETestEnvironment
} from './support/environment';

describe('Runs', () => {
  let app, prisma: PrismaClient, req: RequestUtil, db: DbUtil, auth: AuthUtil;

  beforeAll(async () => {
    const env = await setupE2ETestEnvironment();
    app = env.app;
    prisma = env.prisma;
    req = env.req;
    db = env.db;
    auth = env.auth;
  });

  afterAll(() => teardownE2ETestEnvironment(app));

  describe('runs', () => {
    describe('GET', () => {
      let users, token, maps;

      beforeAll(async () => {
        [users, maps] = await Promise.all([
          db.createUsers(2),
          db.createMaps(2)
        ]);
        token = auth.login(users[0]);

        await Promise.all([
          db.createRunAndRankForMap({
            map: maps[0],
            user: users[0],
            createdAt: dateOffset(-4),
            flags: 1
          }),
          db.createRun({
            map: maps[0],
            user: users[1],
            createdAt: dateOffset(-3)
          }),
          db.createRunAndRankForMap({
            map: maps[1],
            user: users[0],
            createdAt: dateOffset(-2)
          }),
          db.createRun({
            map: maps[1],
            user: users[1],
            createdAt: dateOffset(-1)
          })
        ]);
      });

      afterAll(() => db.cleanup('user', 'mMap', 'run'));

      it('should respond with a list of runs', async () => {
        const res = await req.get({
          url: 'runs',
          status: 200,
          validatePaged: { type: RunDto, count: 4 },
          token: token
        });

        for (const run of res.body.data) expect(run).toHaveProperty('user');
      });

      it('should respond with a list of runs with take parameter', () =>
        req.takeTest({ url: 'runs', validate: RunDto, token: token }));

      it('should respond with a list of runs with skip parameter', () =>
        req.skipTest({ url: 'runs', validate: RunDto, token: token }));

      it('should respond with list of runs filtered by mapID parameter', async () => {
        const res = await req.get({
          url: 'runs',
          status: 200,
          query: { mapID: maps[0].id },
          validatePaged: { type: RunDto, count: 2 },
          token: token
        });

        for (const run of res.body.data) expect(run.mapID).toBe(maps[0].id);
      });

      it('should respond with a list of runs filtered by userID parameter', async () => {
        const res = await req.get({
          url: 'runs',
          status: 200,
          query: { userID: users[0].id },
          validatePaged: { type: RunDto, count: 2 },
          token: token
        });

        for (const run of res.body.data) expect(run.userID).toBe(users[0].id);
      });

      it('should respond with a list of runs filtered by a list of user ids', async () => {
        const ids = `${users[0].id},${users[1].id}`;
        const res = await req.get({
          url: 'runs',
          status: 200,
          query: { userIDs: ids },
          validatePaged: { type: RunDto, count: 4 },
          token: token
        });

        for (const run of res.body.data)
          expect(ids).toContain(run.userID.toString());
      });

      it('should respond with a list of runs filtered by flags', async () => {
        const res = await req.get({
          url: 'runs',
          status: 200,
          query: { flags: 1 },
          validatePaged: { type: RunDto, count: 1 },
          token: token
        });

        expect(res.body.data[0]).toMatchObject({
          flags: 1,
          userID: users[0].id,
          mapID: maps[0].id
        });
      });

      it('should respond with a list of runs with the map include', () =>
        req.expandTest({
          url: 'runs',
          validate: RunDto,
          expand: 'map',
          paged: true,
          token: token
        }));

      it('should respond with a list of runs with the rank include', async () => {
        const res = await req.get({
          url: 'runs',
          status: 200,
          query: { expand: 'rank' },
          validatePaged: { type: RunDto, count: 4 },
          token: token
        });

        expect(res.body.data.filter((x) => x.rank !== null).length).toBe(2);
      });

      it('should respond with a list of runs with the zoneStats include', () =>
        req.expandTest({
          url: 'runs',
          validate: RunDto,
          expand: 'zoneStats',
          paged: true,
          token: token
        }));

      it('should respond with a list of runs with the overallStats include', () =>
        req.expandTest({
          url: 'runs',
          validate: RunDto,
          expand: 'overallStats',
          paged: true,
          token: token
        }));

      it('should respond with a list of runs with the mapWithInfo include', async () => {
        const res = await req.get({
          url: 'runs',
          status: 200,
          query: { expand: 'mapWithInfo' },
          validatePaged: { type: RunDto, count: 4 },
          token: token
        });

        for (const run of res.body.data) expect(run.map).toHaveProperty('info');
      });

      it('should respond with a list of runs filtered by partial mapName match', async () => {
        const res = await req.get({
          url: 'runs',
          status: 200,
          query: { mapName: maps[0].name.slice(-3) },
          validatePaged: { type: RunDto, count: 2 },
          token: token
        });

        expect(res.body.data[0].mapID).toBe(maps[0].id);
      });

      it('should respond with a list of runs that are personal bests', async () => {
        const res = await req.get({
          url: 'runs',
          status: 200,
          query: { isPB: true, expand: 'rank' },
          validatePaged: { type: RunDto, count: 2 },
          token: token
        });

        for (const run of res.body.data) expect(run).toHaveProperty('rank');
      });

      it('should respond with a list of runs sorted by date', () =>
        req.sortByDateTest({
          url: 'runs',
          query: { order: 'date' },
          validate: RunDto,
          token: token
        }));

      it('should respond with a list of runs sorted by time', () =>
        req.sortTest({
          url: 'runs',
          query: { order: 'date' },
          validate: RunDto,
          sortFn: (n1, n2) => n1.ticks - n2.ticks,
          token: token
        }));

      it('should 401 when no access token is provided', () =>
        req.unauthorizedTest('runs', 'get'));
    });
  });

  describe('runs/{runID}', () => {
    describe('GET', () => {
      let user, token, map, run;

      beforeAll(async () => {
        run = await db.createRunAndRankForMap({
          map: map,
          rank: 1,
          user: user,
          ticks: 1
        });
        user = run.user;
        map = run.map;
        token = auth.login(user);
      });

      afterAll(() =>
        Promise.all([
          prisma.user.deleteMany(),
          prisma.mMap.deleteMany(),
          prisma.run.deleteMany()
        ])
      );

      it('should return a valid run', () =>
        req.get({
          url: 'runs/' + run.id,
          status: 200,
          validate: RunDto,
          token: token
        }));

      it('should respond with a run using the overallStats include', () =>
        req.expandTest({
          url: 'runs/' + run.id,
          validate: RunDto,
          expand: 'overallStats',
          token: token
        }));

      it('should respond with a run using the map include', () =>
        req.expandTest({
          url: 'runs/' + run.id,
          validate: RunDto,
          expand: 'map',
          token: token
        }));

      it('should respond with a run using the rank include', () =>
        req.expandTest({
          url: 'runs/' + run.id,
          validate: RunDto,
          expand: 'rank',
          token: token
        }));

      it('should respond with a run using the zoneStats include', () =>
        req.expandTest({
          url: 'runs/' + run.id,
          validate: RunDto,
          expand: 'zoneStats',
          token: token
        }));

      it('should respond with a run using the mapWithInfo include', async () => {
        const res = await req.get({
          url: 'runs/' + run.id,
          status: 200,
          query: { expand: 'mapWithInfo' },
          validate: RunDto,
          token: token
        });

        expect(res.body.map).toHaveProperty('info');
      });

      it('should 404 when no run is found', () =>
        req.get({ url: `runs/${NULL_ID}`, status: 404, token: token }));

      it('should 401 when no access token is provided', () =>
        req.unauthorizedTest('runs/1', 'get'));
    });
  });

  describe('runs/{runID}/download', () => {
    describe('GET', () => {
      let user, token, map, run;

      beforeAll(async () => {
        run = await db.createRunAndRankForMap({
          map: map,
          rank: 1,
          user: user,
          ticks: 1,
          file: 'dogathan_large.png'
        });
        user = run.user;
        map = run.map;
        token = auth.login(user);
      });

      afterAll(() => db.cleanup('user', 'mMap', 'run'));

      it('should redirect to the download url of the run', async () => {
        const res = await req.get({
          url: `runs/${run.id}/download`,
          status: 302,
          token: token
        });

        expect(res.headers.location).toEqual(
          `${Config.storage.endpointUrl}/${Config.storage.bucketName}/${run.file}`
        );
      });

      it('should 404 when no run is found', () =>
        req.get({
          url: `runs/${NULL_ID}/download`,
          status: 404,
          token: token
        }));

      it('should 401 when no access token is provided', () =>
        req.unauthorizedTest('runs/1/download', 'get'));
    });
  });
});
