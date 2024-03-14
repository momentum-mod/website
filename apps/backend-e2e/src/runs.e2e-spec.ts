// noinspection DuplicatedCode

import { PastRunDto } from '../../backend/src/app/dto';

import {
  AuthUtil,
  futureDateOffset,
  DbUtil,
  NULL_ID,
  RequestUtil
} from '@momentum/test-utils';
import { PrismaClient } from '@prisma/client';
import { MapStatus, Order, RunsGetAllOrder } from '@momentum/constants';
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
      let users, token, maps, testingMap;

      beforeAll(async () => {
        [users, maps, testingMap] = await Promise.all([
          db.createUsers(2),
          db.createMaps(2),
          db.createMap({ status: MapStatus.PUBLIC_TESTING })
        ]);
        token = auth.login(users[0]);

        await db.createPastRun({
          createLbRun: true,
          lbRank: 1,
          map: maps[0],
          user: users[0],
          createdAt: futureDateOffset(4),
          time: 1,
          flags: [1]
        });

        await db.createPastRun({
          createLbRun: true,
          lbRank: 2,
          map: maps[0],
          user: users[1],
          createdAt: futureDateOffset(3),
          time: 2
        });

        await db.createPastRun({
          createLbRun: false,
          map: maps[0],
          user: users[1],
          createdAt: futureDateOffset(2),
          time: 3
        });

        await db.createPastRun({
          map: maps[1],
          user: users[0],
          createdAt: futureDateOffset(2),
          time: 1
        });

        await db.createPastRun({
          map: maps[1],
          user: users[1],
          createdAt: futureDateOffset(1),
          time: 2
        });

        await db.createPastRun({
          map: testingMap,
          user: users[1],
          createdAt: futureDateOffset(1),
          time: 2
        });
      });

      afterAll(() => db.cleanup('leaderboardRun', 'pastRun', 'user', 'mMap'));

      it('should respond with a list of runs', async () => {
        const {
          body: { data }
        } = await req.get({
          url: 'runs',
          status: 200,
          validatePaged: { type: PastRunDto, count: 5 },
          token
        });

        for (const x of data) expect(x).toHaveProperty('isPB');
        expect(data.filter((x) => x.isPB === true)).toHaveLength(2);
        expect(data.filter((x) => x.isPB === false)).toHaveLength(3);
      });

      it('should respond with a list of runs with take parameter', () =>
        req.takeTest({
          url: 'runs',
          validate: PastRunDto,
          token
        }));

      it('should respond with a list of runs with skip parameter', () =>
        req.skipTest({
          url: 'runs',
          validate: PastRunDto,
          token
        }));

      it('should include user data if using the user expand parameter', () =>
        req.expandTest({
          url: 'runs',
          expand: 'user',
          validate: PastRunDto,
          paged: true,
          token
        }));

      it('should include map data if using the map expand parameter', () =>
        req.expandTest({
          url: 'runs',
          expand: 'map',
          validate: PastRunDto,
          paged: true,
          token
        }));

      it('should include leaderboardRun data if using the leaderboardRun expand parameter', () =>
        req.expandTest({
          url: 'runs',
          expand: 'leaderboardRun',
          validate: PastRunDto,
          paged: true,
          token
        }));

      it('should respond with list of runs filtered by mapID parameter', async () => {
        const res = await req.get({
          url: 'runs',
          status: 200,
          query: { mapID: maps[0].id },
          validatePaged: { type: PastRunDto, count: 3 },
          token
        });

        for (const run of res.body.data) expect(run.mapID).toBe(maps[0].id);
      });

      it('should be able to fetch non-approved maps if using mapID param', async () =>
        req.get({
          url: 'runs',
          status: 200,
          query: { mapID: testingMap.id },
          validatePaged: { type: PastRunDto, count: 1 },
          token
        }));

      it("should refuse to return non-approved maps the user can't access", async () => {
        await prisma.mMap.update({
          where: { id: testingMap.id },
          data: { status: MapStatus.PRIVATE_TESTING }
        });

        await req.get({
          url: 'runs',
          status: 403,
          query: { mapID: testingMap.id },
          token
        });

        await prisma.mMap.update({
          where: { id: testingMap.id },
          data: { status: MapStatus.PUBLIC_TESTING }
        });
      });

      it('should respond with a list of runs filtered by userID parameter', async () => {
        const res = await req.get({
          url: 'runs',
          status: 200,
          query: { userID: users[0].id },
          validatePaged: { type: PastRunDto, count: 2 },
          token
        });

        for (const run of res.body.data) expect(run.userID).toBe(users[0].id);
      });

      it('should respond with a list of runs filtered by a list of user ids', async () => {
        const ids = `${users[0].id}`;
        const res = await req.get({
          url: 'runs',
          status: 200,
          query: { userIDs: ids },
          validatePaged: { type: PastRunDto, count: 2 },
          token
        });

        for (const run of res.body.data)
          expect(ids).toContain(run.userID.toString());
      });

      it('should respond with a list of runs filtered by flags', async () => {
        const res = await req.get({
          url: 'runs',
          status: 200,
          query: { flags: 1 },
          validatePaged: { type: PastRunDto, count: 1 },
          token
        });

        expect(res.body.data[0]).toMatchObject({
          flags: [1],
          userID: users[0].id,
          mapID: maps[0].id
        });
      });

      it('should respond with a list of runs with the map include', () =>
        req.expandTest({
          url: 'runs',
          validate: PastRunDto,
          expand: 'map',
          paged: true,
          token
        }));

      it('should respond with a list of runs filtered by partial mapName match', async () => {
        const res = await req.get({
          url: 'runs',
          status: 200,
          query: { mapName: maps[0].name.slice(-3) },
          validatePaged: { type: PastRunDto, count: 3 },
          token
        });

        expect(res.body.data[0].mapID).toBe(maps[0].id);
      });

      it('should respond with a list of runs filtered by PBs', async () =>
        req.get({
          url: 'runs',
          status: 200,
          query: { isPB: true },
          validatePaged: { type: PastRunDto, count: 2 },
          token
        }));

      it('should respond with a list of runs filtered by non-PBs', async () =>
        req.get({
          url: 'runs',
          status: 200,
          query: { isPB: false },
          validatePaged: { type: PastRunDto, count: 3 },
          token
        }));

      it('should respond with a list of runs sorted by date', () =>
        req.sortByDateTest({
          url: 'runs',
          query: { orderBy: RunsGetAllOrder.DATE },
          validate: PastRunDto,
          token
        }));

      it('should respond with a list of runs sorted by time', () =>
        req.sortTest({
          url: 'runs',
          query: { orderBy: RunsGetAllOrder.RUN_TIME, order: Order.ASC },
          validate: PastRunDto,
          sortFn: (n1, n2) => n1.ticks - n2.ticks,
          token
        }));

      it('should 401 when no access token is provided', () =>
        req.unauthorizedTest('runs', 'get'));
    });
  });

  describe('runs/{runID}', () => {
    describe('GET', () => {
      let user, token, map, run1, run2;

      beforeAll(async () => {
        run1 = await db.createPastRun({
          time: 1,
          createLbRun: true,
          lbRank: 1
        });

        user = run1.user;
        map = run1.mmap;

        run2 = await db.createPastRun({
          map: map,
          user: user,
          time: 2
        });
        token = auth.login(user);
      });

      afterAll(() => db.cleanup('leaderboardRun', 'pastRun', 'mMap', 'user'));

      it('should return a valid run', async () => {
        const res = await req.get({
          url: `runs/${run1.id}`,
          status: 200,
          validate: PastRunDto,
          token
        });
      });

      it('should include whether the run is a PB', async () => {
        const res = await req.get({
          url: `runs/${run1.id}`,
          status: 200,
          validate: PastRunDto,
          token
        });

        expect(res.body.isPB).toBe(true);

        const res2 = await req.get({
          url: `runs/${run2.id}`,
          status: 200,
          validate: PastRunDto,
          token
        });

        expect(res2.body.isPB).toBe(false);
      });

      it('should respond with a run using the user include', () =>
        req.expandTest({
          url: `runs/${run1.id}`,
          validate: PastRunDto,
          expand: 'user',
          token
        }));

      it('should respond with a run using the map include', () =>
        req.expandTest({
          url: `runs/${run1.id}`,
          validate: PastRunDto,
          expand: 'map',
          token
        }));

      it('should respond with a run using the leaderboardRun include', () =>
        req.expandTest({
          url: `runs/${run1.id}`,
          validate: PastRunDto,
          expand: 'leaderboardRun',
          token
        }));

      it("should refuse to return non-approved maps the user can't access", async () => {
        await prisma.mMap.update({
          where: { id: map.id },
          data: { status: MapStatus.PRIVATE_TESTING }
        });

        await req.get({
          url: `runs/${run1.id}`,
          status: 403,
          token
        });

        await prisma.mMap.update({
          where: { id: map.id },
          data: { status: MapStatus.PUBLIC_TESTING }
        });
      });

      it('should 404 when no run is found', () =>
        req.get({ url: `runs/${NULL_ID}`, status: 404, token }));

      it('should 401 when no access token is provided', () =>
        req.unauthorizedTest('runs/1', 'get'));
    });
  });
});
