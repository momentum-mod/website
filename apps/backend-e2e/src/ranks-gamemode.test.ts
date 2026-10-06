import { after, before, describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { matchesPartial } from '@momentum/test-utils';
import {
  Gamemode,
  LeaderboardType,
  Style,
  TrackType
} from '@momentum/constants';
import { getRankPoints } from '@momentum/xp-systems';
import { RankEntryDto } from '../../backend/src/app/dto';
import { RankingService } from '../../backend/src/app/modules/ranking/ranking.service';
import {
  app,
  prisma,
  req,
  db,
  registerE2ETestFile
} from './support/e2e-environment';

describe('Ranks', () => {
  registerE2ETestFile();

  describe('ranks/{gamemode}', () => {
    describe('GET', () => {
      let u1, u2, u3, u3Token, noRunsToken, map1, map2;

      // map1 is tier 1 with 3 runs, map2 is tier 3 with 2 runs.
      const map1Points = (rank: number) => getRankPoints(rank, 3, 1);
      const map2Points = (rank: number) => getRankPoints(rank, 2, 3);
      const expectedLadder = () =>
        [
          [u1.id, map1Points(1)],
          [u2.id, map1Points(2) + map2Points(1)],
          [u3.id, map1Points(3) + map2Points(2)]
        ]
          .sort(([, a], [, b]) => b - a)
          .map(([userID, points], i) => ({ rank: i + 1, userID, points }));

      before(async () => {
        [u1, u2, [u3, u3Token], noRunsToken] = await Promise.all([
          db.createUser(),
          db.createUser(),
          db.createAndLoginUser(),
          db.loginNewUser()
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

        // An unranked leaderboard, and a bonus track, neither of which should
        // award points.
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

      it('should return the ladder ordered by points, summing only ranked main tracks', async () => {
        const res = await req.get({
          url: `ranks/${Gamemode.AHOP}`,
          status: 200,
          validatePaged: { type: RankEntryDto, count: 3 }
        });

        assert.ok(matchesPartial(res.body.data, expectedLadder()));
        assert.equal(res.body.data[0].user.id, res.body.data[0].userID);
      });

      it('should paginate', async () => {
        const res = await req.get({
          url: `ranks/${Gamemode.AHOP}`,
          query: { skip: 1, take: 1 },
          status: 200,
          validatePaged: { type: RankEntryDto, returnCount: 1, totalCount: 3 }
        });

        assert.ok(matchesPartial(res.body.data[0], expectedLadder()[1]));
      });

      it('should return the page around the logged in user with the around filter', async () => {
        const res = await req.get({
          url: `ranks/${Gamemode.AHOP}`,
          query: { filter: 'around', take: 1 },
          status: 200,
          token: u3Token,
          validatePaged: { type: RankEntryDto, returnCount: 1, totalCount: 3 }
        });

        assert.ok(
          matchesPartial(
            res.body.data[0],
            expectedLadder().find(({ userID }) => userID === u3.id)
          )
        );
      });

      it('should 401 for the around filter when not logged in', async () => {
        await req.get({
          url: `ranks/${Gamemode.AHOP}`,
          query: { filter: 'around' },
          status: 401
        });
      });

      it('should 410 for the around filter when the user has no rank', async () => {
        await req.get({
          url: `ranks/${Gamemode.AHOP}`,
          query: { filter: 'around' },
          status: 410,
          token: noRunsToken
        });
      });

      it('should return an empty ladder for a style with no ranked runs', async () => {
        await req.get({
          url: `ranks/${Gamemode.AHOP}`,
          query: { style: Style.SIDEWAYS },
          status: 200,
          validatePaged: { type: RankEntryDto, count: 0 }
        });
      });

      it('should return an empty ladder for a gamemode with only unranked runs', async () => {
        await req.get({
          url: `ranks/${Gamemode.SJ}`,
          status: 200,
          validatePaged: { type: RankEntryDto, count: 0 }
        });
      });

      it('should 400 for an invalid gamemode', async () => {
        await req.get({ url: 'ranks/999', status: 400 });
        await req.get({ url: 'ranks/surf', status: 400 });
      });
    });
  });
});
