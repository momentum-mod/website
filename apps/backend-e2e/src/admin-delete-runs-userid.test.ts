import { after, before, describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import {
  AdminActivityType,
  Gamemode,
  Role,
  TrackType,
  Style
} from '@momentum/constants';
import {
  prisma,
  req,
  db,
  fileStore,
  registerE2ETestFile
} from './support/e2e-environment';

describe('Admin', () => {
  registerE2ETestFile();

  describe('admin/delete-runs/:userID', () => {
    describe('POST', () => {
      let admin, adminToken, modToken, run1, run2, user;

      before(async () => {
        [admin, adminToken] = await db.createAndLoginUser({
          data: { roles: Role.ADMIN }
        });
        modToken = await db.loginNewUser({ data: { roles: Role.MODERATOR } });
        user = await db.createUser();

        run1 = await db.createLbRun({
          user,
          gamemode: Gamemode.RJ,
          trackType: TrackType.MAIN,
          trackNum: 1,
          style: Style.NORMAL,
          time: 1000
        });

        run2 = await db.createLbRun({
          user,
          gamemode: Gamemode.RJ,
          trackType: TrackType.MAIN,
          trackNum: 1,
          style: Style.NORMAL,
          time: 900
        });
      });

      after(async () => {
        await db.cleanup('pastRun', 'leaderboardRun', 'user', 'mMap');
      });

      it("should allow an admin to purge a user's leaderboard runs", async () => {
        const oldPath1 = `runs/${run1.replayHash}`;
        const oldPath2 = `runs/${run2.replayHash}`;
        const newPath1 = `deletedruns/${run1.userID}-${run1.mapID}-${run1.gamemode}-${run1.trackType}-${run1.trackNum}-${run1.style}`;
        const newPath2 = `deletedruns/${run2.userID}-${run2.mapID}-${run2.gamemode}-${run2.trackType}-${run2.trackNum}-${run2.style}`;

        await fileStore.add(oldPath1, Buffer.alloc(256));
        await fileStore.add(oldPath2, Buffer.alloc(256));

        assert.equal(await fileStore.exists(oldPath1), true);
        assert.equal(await fileStore.exists(oldPath2), true);
        assert.equal(await fileStore.exists(newPath1), false);
        assert.equal(await fileStore.exists(newPath2), false);

        await req.post({
          url: `admin/delete-runs/${user.id}`,
          body: { reason: 'going too fast' },
          status: 204,
          token: adminToken
        });

        const runsAfter = await prisma.leaderboardRun.findMany({
          where: { userID: user.id }
        });
        assert.equal(runsAfter.length, 0);

        assert.equal(await fileStore.exists(oldPath1), false);
        assert.equal(await fileStore.exists(oldPath2), false);
        assert.equal(await fileStore.exists(newPath1), true);
        assert.equal(await fileStore.exists(newPath2), true);

        const adminActivity = await prisma.adminActivity.findFirst();
        assert.partialDeepStrictEqual(adminActivity, {
          type: AdminActivityType.RUNS_PURGED,
          userID: admin.id,
          target: BigInt(user.id),
          comment: 'going too fast'
        });
      });

      it("should allow a moderator to purge a user's leaderboard runs", async () => {
        await db.createLbRun({
          user,
          gamemode: Gamemode.RJ,
          trackType: TrackType.MAIN,
          trackNum: 1,
          style: Style.NORMAL,
          time: 1000
        });

        await req.post({
          url: `admin/delete-runs/${user.id}`,
          body: { reason: 'im an evil mod' },
          status: 204,
          token: modToken
        });
      });

      it('should return 404 if the user does not exist', async () => {
        await req.post({
          url: `admin/delete-runs/${user.id}`,
          body: { reason: 'who is this' },
          status: 404,
          token: adminToken
        });
      });

      it('should 401 when no access token is provided', async () => {
        await req.unauthorizedTest(`admin/delete-runs/${user.id}`, 'post');
      });
    });
  });
});
