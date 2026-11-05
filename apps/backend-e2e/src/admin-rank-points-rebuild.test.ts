import { after, before, describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { Gamemode, Role, Style } from '@momentum/constants';
import { getRankPoints } from '@momentum/xp-systems';
import { RankingService } from '../../backend/src/app/modules/ranking/ranking.service';
import { RankPointsKeys } from '../../backend/src/app/modules/ranking/rank-points.keys';
import {
  app,
  valkey,
  req,
  db,
  registerE2ETestFile
} from './support/e2e-environment';

describe('Admin', () => {
  registerE2ETestFile();

  describe('admin/rank-points/rebuild', () => {
    describe('POST', () => {
      let adminToken, modToken, u1, u2, map;

      before(async () => {
        [[, adminToken], modToken, u1, u2] = await Promise.all([
          db.createAndLoginUser({ data: { roles: Role.ADMIN } }),
          db.loginNewUser({ data: { roles: Role.MODERATOR } }),
          db.createUser(),
          db.createUser()
        ]);

        map = await db.createMap();
        await db.createLbRun({ map, user: u1, time: 1 });
        await db.createLbRun({ map, user: u2, time: 2 });

        await app.get(RankingService).rebuildAll();
      });

      after(async () => {
        await db.cleanup('pastRun', 'leaderboardRun', 'user', 'mMap');
      });

      it('should rebuild all rank points in the background', async () => {
        // Sneak a run in without queueing it, so only a rebuild picks it up.
        const u3 = await db.createUser();
        await db.createLbRun({ map, user: u3, time: 3 });

        await req.post({
          url: 'admin/rank-points/rebuild',
          status: 202,
          token: adminToken
        });

        // processQueue waits for any in-flight rebuild.
        await app.get(RankingService).processQueue();

        const ladder = await valkey.zrevrange(
          RankPointsKeys.ladder(Gamemode.AHOP, Style.NORMAL),
          0,
          -1,
          'WITHSCORES'
        );
        assert.deepEqual(ladder, [
          u1.id.toString(),
          getRankPoints(1, 3, 1).toString(),
          u2.id.toString(),
          getRankPoints(2, 3, 1).toString(),
          u3.id.toString(),
          getRankPoints(3, 3, 1).toString()
        ]);
      });

      it('should 403 for a moderator', async () => {
        await req.post({
          url: 'admin/rank-points/rebuild',
          status: 403,
          token: modToken
        });
      });

      it('should 401 when no access token is provided', async () => {
        await req.unauthorizedTest('admin/rank-points/rebuild', 'post');
      });
    });
  });
});
