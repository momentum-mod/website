import { after, before, describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import {
  arrayContaining,
  matchesPartial,
  NULL_ID,
  objectContaining
} from '@momentum/test-utils';
import {
  Gamemode,
  LeaderboardType,
  MapStatus,
  Style,
  TrackType
} from '@momentum/constants';
import { getRankPoints } from '@momentum/xp-systems';
import { LeaderboardRunDto } from '../../backend/src/app/dto';
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

  describe('users/{userID}/runs', () => {
    describe('GET', () => {
      let u1, u2, u3, map1, map2;

      before(async () => {
        [u1, u2, u3] = await Promise.all([
          db.createUser(),
          db.createUser(),
          db.createUser()
        ]);

        // map1 is tier 1 with 3 runs, map2 is tier 3 with 2 runs.
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
        await db.createLbRun({
          map: map1,
          user: u1,
          time: 1,
          trackType: TrackType.BONUS,
          trackNum: 1
        });

        await app.get(RankingService).rebuildAll();
      });

      after(async () => {
        await db.cleanup('pastRun', 'leaderboardRun', 'user', 'mMap');
      });

      it("should return the user's runs with rank, total runs and points", async () => {
        const res = await req.get({
          url: `users/${u3.id}/runs`,
          status: 200,
          validatePaged: { type: LeaderboardRunDto, count: 3 }
        });

        assert.ok(
          matchesPartial(
            res.body.data,
            arrayContaining([
              objectContaining({
                mapID: map1.id,
                gamemode: Gamemode.AHOP,
                rank: 3,
                totalRuns: 3,
                points: getRankPoints(3, 3, 1),
                map: objectContaining({ id: map1.id, name: map1.name }),
                leaderboard: objectContaining({ tier: 1 })
              }),
              objectContaining({
                mapID: map2.id,
                gamemode: Gamemode.AHOP,
                rank: 2,
                totalRuns: 2,
                points: getRankPoints(2, 2, 3),
                leaderboard: objectContaining({ tier: 3 })
              }),
              objectContaining({
                mapID: map1.id,
                gamemode: Gamemode.SJ,
                rank: 1,
                totalRuns: 1
              })
            ])
          )
        );

        // Unranked leaderboards don't award points.
        const sjRun = res.body.data.find(
          ({ gamemode }) => gamemode === Gamemode.SJ
        );
        assert.equal(sjRun.points, undefined);
      });

      it('should filter by leaderboard type', async () => {
        const res = await req.get({
          url: `users/${u3.id}/runs`,
          query: { leaderboardType: LeaderboardType.RANKED },
          status: 200,
          validatePaged: { type: LeaderboardRunDto, count: 2 }
        });

        assert.ok(
          res.body.data.every(({ gamemode }) => gamemode === Gamemode.AHOP)
        );
      });

      it('should filter by gamemode', async () => {
        await req.get({
          url: `users/${u3.id}/runs`,
          query: { gamemode: Gamemode.SJ },
          status: 200,
          validatePaged: { type: LeaderboardRunDto, count: 1 }
        });
      });

      it('should filter by track type', async () => {
        await req.get({
          url: `users/${u1.id}/runs`,
          query: { trackType: TrackType.BONUS },
          status: 200,
          validatePaged: { type: LeaderboardRunDto, count: 1 }
        });
      });

      it('should paginate', async () => {
        await req.get({
          url: `users/${u3.id}/runs`,
          query: { skip: 1, take: 1 },
          status: 200,
          validatePaged: {
            type: LeaderboardRunDto,
            returnCount: 1,
            totalCount: 3
          }
        });
      });

      it('should not include runs on maps that are not approved', async () => {
        const testingMap = await db.createMap({
          status: MapStatus.PUBLIC_TESTING
        });
        await db.createLbRun({ map: testingMap, user: u1, time: 1 });

        const res = await req.get({
          url: `users/${u1.id}/runs`,
          status: 200,
          validatePaged: LeaderboardRunDto
        });

        assert.equal(
          res.body.data.find(({ mapID }) => mapID === testingMap.id),
          undefined
        );
      });

      it('should 404 for a nonexistent user', async () => {
        await req.get({ url: `users/${NULL_ID}/runs`, status: 404 });
      });
    });
  });
});
