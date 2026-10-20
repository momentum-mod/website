import { after, afterEach, before, beforeEach, describe, it } from 'node:test';
import { E2ETestMMap, NULL_ID } from '@momentum/test-utils';
import * as assert from 'node:assert/strict';
import {
  AdminActivityType,
  Gamemode,
  MapStatus,
  Role,
  runPath,
  TrackType
} from '@momentum/constants';
import { LeaderboardRun, TypedSql, User } from '@momentum/db';
import {
  prisma,
  req,
  db,
  fileStore,
  registerE2ETestFile
} from './support/e2e-environment';

describe('Admin', () => {
  registerE2ETestFile();

  describe('admin/delete-run', () => {
    describe('POST', () => {
      let admin: User,
        mod: User,
        u1: User,
        adminToken: string,
        modToken: string,
        map: E2ETestMMap,
        run: LeaderboardRun;

      const getRuns = () =>
        prisma.$queryRawTyped(
          TypedSql.getLeaderboardRuns(
            map.id,
            Gamemode.AHOP,
            TrackType.MAIN,
            1,
            0,
            0,
            null
          )
        );

      before(async () => {
        [[admin, adminToken], [mod, modToken], u1] = await Promise.all([
          db.createAndLoginUser({ data: { roles: Role.ADMIN } }),
          db.createAndLoginUser({ data: { roles: Role.MODERATOR } }),
          db.createUser()
        ]);

        map = await db.createMap({ status: MapStatus.APPROVED });
      });

      after(async () => {
        await db.cleanup('user', 'mMap', 'leaderboardRun');
      });

      beforeEach(async () => {
        run = await db.createLbRun({
          map,
          user: u1,
          time: 1
        });

        await db.createLbRun({
          map,
          user: admin,
          time: 2
        });

        await fileStore.add(runPath(run.replayHash), Buffer.alloc(256));
      });

      afterEach(async () => {
        await Promise.all([
          db.cleanup('pastRun', 'leaderboardRun'),
          fileStore.deleteDirectory('deletedruns'),
          fileStore.deleteDirectory('runs')
        ]);
      });

      it('should allow an admin to delete a leaderboard run', async () => {
        const runsBefore = await getRuns();
        assert.equal(runsBefore.length, 2);
        assert.partialDeepStrictEqual(runsBefore, [
          { userID: u1.id, rank: 1 },
          { userID: admin.id, rank: 2 }
        ]);

        const oldPath = `runs/${run.replayHash}`;
        const newPath = `deletedruns/${run.userID}-${run.mapID}-${run.gamemode}-${run.trackType}-${run.trackNum}-${run.style}`;
        assert.equal(await fileStore.exists(oldPath), true);
        assert.equal(await fileStore.exists(newPath), false);

        await req.post({
          url: 'admin/delete-run',
          body: {
            mapID: run.mapID,
            gamemode: run.gamemode,
            trackType: run.trackType,
            trackNum: run.trackNum,
            style: run.style,
            userID: run.userID,
            reason: 'hello'
          },
          status: 204,
          token: adminToken
        });

        const runsAfter = await getRuns();
        assert.equal(runsAfter.length, 1);
        assert.partialDeepStrictEqual(runsAfter[0], {
          userID: admin.id,
          rank: 1
        });

        assert.equal(await fileStore.exists(oldPath), false);
        assert.equal(await fileStore.exists(newPath), true);

        const adminActivity = await prisma.adminActivity.findFirst();
        assert.partialDeepStrictEqual(adminActivity, {
          type: AdminActivityType.RUN_DELETED,
          userID: admin.id,
          target: BigInt(u1.id),
          oldData: {
            mapID: run.mapID,
            gamemode: run.gamemode,
            trackType: run.trackType,
            trackNum: run.trackNum,
            style: run.style,
            userID: run.userID
          },
          comment: 'hello'
        });
      });

      it('should allow a mod to delete a leaderboard run and archive the replay', async () => {
        await req.post({
          url: 'admin/delete-run',
          body: {
            mapID: run.mapID,
            gamemode: run.gamemode,
            trackType: run.trackType,
            trackNum: run.trackNum,
            style: run.style,
            userID: run.userID
          },
          status: 204,
          token: modToken
        });
      });

      it('should return 404 if the map does not exist', async () => {
        await req.post({
          url: 'admin/delete-run',
          body: {
            mapID: NULL_ID,
            gamemode: run.gamemode,
            trackType: run.trackType,
            trackNum: run.trackNum,
            style: run.style,
            userID: run.userID
          },
          status: 404,
          token: adminToken
        });
      });

      it('should return 404 if the run does not exist', async () => {
        await req.post({
          url: 'admin/delete-run',
          body: {
            mapID: run.mapID,
            gamemode: run.gamemode,
            trackType: run.trackType,
            trackNum: run.trackNum,
            style: run.style,
            userID: mod.id
          },
          status: 404,
          token: adminToken
        });
      });

      it('should 401 when no access token is provided', async () => {
        await req.unauthorizedTest('admin/delete-run', 'post');
      });
    });
  });
});
