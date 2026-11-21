import { after, before, describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { matchesPartial, NULL_ID } from '@momentum/test-utils';
import {
  Gamemode,
  LeaderboardType,
  Style,
  TrackType
} from '@momentum/constants';
import { getRankPoints } from '@momentum/xp-systems';
import { UserRankDto } from '../../backend/src/app/dto';
import { RankingService } from '../../backend/src/app/modules/ranking/ranking.service';
import {
  app,
  prisma,
  req,
  db,
  registerE2ETestFile
} from './support/e2e-environment';

describe('Users', () => {
  registerE2ETestFile();

  describe('users/{userID}/ranks', () => {
    describe('GET', () => {
      let u1, u2, u3, map1, map2;

      // map1 is tier 1 with 3 runs, map2 is tier 3 with 2 runs.
      const map1Points = (rank: number) => getRankPoints(rank, 3, 1);
      const map2Points = (rank: number) => getRankPoints(rank, 2, 3);
      const totals = () =>
        new Map([
          [u1.id, map1Points(1)],
          [u2.id, map1Points(2) + map2Points(1)],
          [u3.id, map1Points(3) + map2Points(2)]
        ]);

      before(async () => {
        [u1, u2, u3] = await Promise.all([
          db.createUser(),
          db.createUser(),
          db.createUser()
        ]);

        map1 = await db.createMap();
        map2 = await db.createMap({
          leaderboards: {
            create: {
              gamemode: Gamemode.AHOP,
              trackType: TrackType.MAIN,
              trackNum: 1,
              style: Style.NORMAL,
              tier: 3,
              linear: true,
              type: LeaderboardType.RANKED
            }
          }
        });

        await prisma.leaderboard.create({
          data: {
            mapID: map1.id,
            gamemode: Gamemode.SJ,
            trackType: TrackType.MAIN,
            trackNum: 1,
            style: Style.NORMAL,
            tier: 1,
            linear: true,
            type: LeaderboardType.UNRANKED
          }
        });

        await db.createLbRun({ map: map1, user: u1, time: 1 });
        await db.createLbRun({ map: map1, user: u2, time: 2 });
        await db.createLbRun({ map: map1, user: u3, time: 3 });
        await db.createLbRun({ map: map2, user: u2, time: 1 });
        await db.createLbRun({ map: map2, user: u3, time: 2 });
        await db.createLbRun({
          map: map1,
          user: u3,
          time: 1,
          gamemode: Gamemode.SJ
        });

        await app.get(RankingService).rebuildAll();
      });

      after(async () => {
        await db.cleanup('pastRun', 'leaderboardRun', 'user', 'mMap');
      });

      it("should return the user's rank and points on each ladder they are on", async () => {
        const res = await req.get({
          url: `users/${u2.id}/ranks`,
          status: 200,
          validateArray: { type: UserRankDto, length: 1 }
        });

        const points = totals().get(u2.id);
        const rank =
          [...totals().values()].filter((total) => total > points).length + 1;
        assert.ok(
          matchesPartial(res.body[0], {
            gamemode: Gamemode.AHOP,
            style: Style.NORMAL,
            rank,
            points,
            totalPlayers: 3
          })
        );
      });

      it('should not include ladders the user only has unranked runs on', async () => {
        const res = await req.get({
          url: `users/${u3.id}/ranks`,
          status: 200,
          validateArray: UserRankDto
        });

        assert.equal(
          res.body.find(({ gamemode }) => gamemode === Gamemode.SJ),
          undefined
        );
      });

      it('should return an empty array for a user with no points', async () => {
        const [user] = await db.createAndLoginUser();
        const res = await req.get({
          url: `users/${user.id}/ranks`,
          status: 200
        });
        assert.deepEqual(res.body, []);
      });

      it('should 404 for a nonexistent user', async () => {
        await req.get({ url: `users/${NULL_ID}/ranks`, status: 404 });
      });
    });
  });
});
