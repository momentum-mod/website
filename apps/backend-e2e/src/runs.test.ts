import { after, before, describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { PastRunDto } from '../../backend/src/app/dto';
import { futureDateOffset } from '@momentum/test-utils';
import { MapStatus, Order, RunsGetAllOrder } from '@momentum/constants';
import {
  prisma,
  req,
  db,
  auth,
  registerE2ETestFile
} from './support/e2e-environment';

describe('Runs', () => {
  registerE2ETestFile();

  describe('runs', () => {
    describe('GET', () => {
      let users, token, maps, testingMap;

      before(async () => {
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

      after(async () => {
        await db.cleanup('leaderboardRun', 'pastRun', 'user', 'mMap');
      });

      it('should respond with a list of runs', async () => {
        const {
          body: { data }
        } = await req.get({
          url: 'runs',
          status: 200,
          validatePaged: { type: PastRunDto, count: 5 },
          token
        });

        for (const x of data) assert.ok(Object.hasOwn(x, 'isPB'));
        assert.equal(data.filter((x) => x.isPB === true).length, 2);
        assert.equal(data.filter((x) => x.isPB === false).length, 3);
      });

      it('should respond with a list of runs with take parameter', async () => {
        await req.takeTest({
          url: 'runs',
          validate: PastRunDto,
          token
        });
      });

      it('should respond with a list of runs with skip parameter', async () => {
        await req.skipTest({
          url: 'runs',
          validate: PastRunDto,
          token
        });
      });

      it('should include user data if using the user expand parameter', async () => {
        await req.expandTest({
          url: 'runs',
          expand: 'user',
          validate: PastRunDto,
          paged: true,
          token
        });
      });

      it('should include map data if using the map expand parameter', async () => {
        await req.expandTest({
          url: 'runs',
          expand: 'map',
          validate: PastRunDto,
          paged: true,
          token
        });
      });

      it('should include leaderboardRun data if using the leaderboardRun expand parameter', async () => {
        await req.expandTest({
          url: 'runs',
          expand: 'leaderboardRun',
          validate: PastRunDto,
          paged: true,
          token
        });
      });

      it('should respond with list of runs filtered by mapID parameter', async () => {
        const res = await req.get({
          url: 'runs',
          status: 200,
          query: { mapID: maps[0].id },
          validatePaged: { type: PastRunDto, count: 3 },
          token
        });

        for (const run of res.body.data) assert.equal(run.mapID, maps[0].id);
      });

      it('should be able to fetch non-approved maps if using mapID param', async () => {
        await req.get({
          url: 'runs',
          status: 200,
          query: { mapID: testingMap.id },
          validatePaged: { type: PastRunDto, count: 1 },
          token
        });
      });

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

        for (const run of res.body.data) assert.equal(run.userID, users[0].id);
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
          assert.ok(ids.includes(run.userID.toString()));
      });

      it('should respond with a list of runs filtered by flags', async () => {
        const res = await req.get({
          url: 'runs',
          status: 200,
          query: { flags: 1 },
          validatePaged: { type: PastRunDto, count: 1 },
          token
        });

        assert.partialDeepStrictEqual(res.body.data[0], {
          flags: [1],
          userID: users[0].id,
          mapID: maps[0].id
        });
      });

      it('should respond with a list of runs with the map include', async () => {
        await req.expandTest({
          url: 'runs',
          validate: PastRunDto,
          expand: 'map',
          paged: true,
          token
        });
      });

      it('should respond with a list of runs filtered by partial mapName match', async () => {
        const res = await req.get({
          url: 'runs',
          status: 200,
          query: { mapName: maps[0].name.slice(-3) },
          validatePaged: { type: PastRunDto, count: 3 },
          token
        });

        assert.equal(res.body.data[0].mapID, maps[0].id);
      });

      it('should respond with a list of runs filtered by PBs', async () => {
        await req.get({
          url: 'runs',
          status: 200,
          query: { isPB: true },
          validatePaged: { type: PastRunDto, count: 2 },
          token
        });
      });

      it('should respond with a list of runs filtered by non-PBs', async () => {
        await req.get({
          url: 'runs',
          status: 200,
          query: { isPB: false },
          validatePaged: { type: PastRunDto, count: 3 },
          token
        });
      });

      it('should respond with a list of runs sorted by date', async () => {
        await req.sortByDateTest({
          url: 'runs',
          query: { orderBy: RunsGetAllOrder.DATE },
          validate: PastRunDto,
          token
        });
      });

      it('should respond with a list of runs sorted by time', async () => {
        await req.sortTest({
          url: 'runs',
          query: { orderBy: RunsGetAllOrder.RUN_TIME, order: Order.ASC },
          validate: PastRunDto,
          sortFn: (n1, n2) => n1.ticks - n2.ticks,
          token
        });
      });
    });
  });
});
