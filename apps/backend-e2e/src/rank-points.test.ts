import { after, afterEach, before, beforeEach, describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { matchesPartial } from '@momentum/test-utils';
import {
  Gamemode,
  LeaderboardIdentifier,
  LeaderboardType,
  MapStatus,
  Role,
  Style,
  TrackType
} from '@momentum/constants';
import { getRankPoints, getTrackWeight } from '@momentum/xp-systems';
import { LeaderboardRunDto } from '../../backend/src/app/dto';
import { RankingService } from '../../backend/src/app/modules/ranking/ranking.service';
import { RankPointsKeys } from '../../backend/src/app/modules/ranking/rank-points.keys';
import {
  app,
  prisma,
  valkey,
  req,
  db,
  registerE2ETestFile
} from './support/e2e-environment';

describe('Rank points', () => {
  registerE2ETestFile();

  const ahopMain = (mapID: number): LeaderboardIdentifier => ({
    mapID,
    gamemode: Gamemode.AHOP,
    trackType: TrackType.MAIN,
    trackNum: 1,
    style: Style.NORMAL
  });

  const getLadder = async () => {
    const entries = await valkey.zrevrange(
      RankPointsKeys.ladder(Gamemode.AHOP, Style.NORMAL),
      0,
      -1,
      'WITHSCORES'
    );
    const ladder = new Map<number, number>();
    for (let i = 0; i < entries.length; i += 2)
      ladder.set(Number(entries[i]), Number(entries[i + 1]));
    return ladder;
  };

  describe('on map leaderboards', () => {
    let u1, u2, u3, token, map1, map2;

    before(async () => {
      [u1, u2, [u3, token]] = await Promise.all([
        db.createUser(),
        db.createUser(),
        db.createAndLoginUser()
      ]);

      // map1 is tier 1 with 3 runs, map2 is tier 3 with 1 run.
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

    it('should include points on runs on a ranked leaderboard', async () => {
      const res = await req.get({
        url: `maps/${map1.id}/leaderboard`,
        query: { gamemode: Gamemode.AHOP },
        status: 200,
        validatePaged: { type: LeaderboardRunDto, count: 3 },
        token
      });

      assert.ok(
        matchesPartial(res.body.data, [
          { rank: 1, points: getRankPoints(1, 3, 1) },
          { rank: 2, points: getRankPoints(2, 3, 1) },
          { rank: 3, points: getRankPoints(3, 3, 1) }
        ])
      );
    });

    it('should not include points on runs on an unranked leaderboard', async () => {
      const res = await req.get({
        url: `maps/${map1.id}/leaderboard`,
        query: { gamemode: Gamemode.SJ },
        status: 200,
        validatePaged: { type: LeaderboardRunDto, count: 1 },
        token
      });

      assert.equal(res.body.data[0].points, undefined);
    });

    it('should include points on a single run', async () => {
      const res = await req.get({
        url: `maps/${map2.id}/leaderboard/run`,
        query: { gamemode: Gamemode.AHOP, userID: u2.id },
        status: 200,
        validate: LeaderboardRunDto,
        token
      });

      assert.equal(res.body.points, getRankPoints(1, 1, 3));
    });
  });

  describe('updates', () => {
    let ranking: RankingService, adminToken, u1, u2, map;

    beforeEach(async () => {
      ranking = app.get(RankingService);
      [[, adminToken], u1, u2] = await Promise.all([
        db.createAndLoginUser({ data: { roles: Role.ADMIN } }),
        db.createUser(),
        db.createUser()
      ]);

      map = await db.createMap();
      await db.createLbRun({ map, user: u1, time: 1 });
      await db.createLbRun({ map, user: u2, time: 2 });

      await ranking.rebuildAll();

      assert.deepEqual(
        await getLadder(),
        new Map([
          [u1.id, getRankPoints(1, 2, 1)],
          [u2.id, getRankPoints(2, 2, 1)]
        ])
      );
    });

    afterEach(async () => {
      await db.cleanup('pastRun', 'leaderboardRun', 'user', 'mMap');
    });

    it('should recompute a leaderboard after an admin deletes a run', async () => {
      await req.post({
        url: 'admin/delete-run',
        body: { mapID: map.id, gamemode: Gamemode.AHOP, userID: u1.id },
        status: 204,
        token: adminToken
      });

      assert.equal(await ranking.processQueue(), 1);

      // u1 is gone, u2 is now a solo world record.
      assert.deepEqual(
        await getLadder(),
        new Map([[u2.id, getRankPoints(1, 1, 1)]])
      );
    });

    it('should recompute every leaderboard a user was on after an admin purges their runs', async () => {
      const map2 = await db.createMap();
      await db.createLbRun({ map: map2, user: u1, time: 1 });
      await db.createLbRun({ map: map2, user: u2, time: 2 });
      await ranking.rebuildAll();

      await req.post({
        url: `admin/delete-runs/${u2.id}`,
        body: { reason: 'cheating' },
        status: 204,
        token: adminToken
      });

      assert.equal(await ranking.processQueue(), 2);

      assert.deepEqual(
        await getLadder(),
        new Map([[u1.id, getRankPoints(1, 1, 1) * 2]])
      );
    });

    it('should remove a leaderboard from the ladder when it becomes unranked', async () => {
      await prisma.leaderboard.update({
        where: { mapID_gamemode_trackType_trackNum_style: ahopMain(map.id) },
        data: { type: LeaderboardType.UNRANKED }
      });

      await ranking.queueMapUpdates(map.id);
      assert.equal(await ranking.processQueue(), 1);

      assert.deepEqual(await getLadder(), new Map());
      assert.equal(
        await valkey.exists(RankPointsKeys.track(ahopMain(map.id))),
        0
      );
    });

    it('should recompute a leaderboard when its tier changes', async () => {
      await prisma.leaderboard.update({
        where: { mapID_gamemode_trackType_trackNum_style: ahopMain(map.id) },
        data: { tier: 5 }
      });

      await ranking.queueMapUpdates(map.id);
      assert.equal(await ranking.processQueue(), 1);

      assert.deepEqual(
        await getLadder(),
        new Map([
          [u1.id, getRankPoints(1, 2, 5)],
          [u2.id, getRankPoints(2, 2, 5)]
        ])
      );
    });

    it('should remove a map from the ladder when an admin disables it', async () => {
      await req.patch({
        url: `admin/maps/${map.id}`,
        body: { status: MapStatus.DISABLED },
        status: 204,
        token: adminToken
      });

      assert.equal(await ranking.processQueue(), 1);

      assert.deepEqual(await getLadder(), new Map());
    });

    it('should remove a map from the ladder when an admin deletes it', async () => {
      await req.del({
        url: `admin/maps/${map.id}`,
        status: 204,
        token: adminToken
      });

      assert.equal(await ranking.processQueue(), 1);

      assert.deepEqual(await getLadder(), new Map());
      assert.equal(
        await valkey.exists(RankPointsKeys.track(ahopMain(map.id))),
        0
      );
    });

    it('should process queued leaderboards in batches across ladders', async () => {
      // A second gamemode ladder on the same map.
      await prisma.leaderboard.create({
        data: {
          mapID: map.id,
          gamemode: Gamemode.SJ,
          trackType: TrackType.MAIN,
          trackNum: 1,
          style: Style.NORMAL,
          tier: 2,
          linear: true,
          type: LeaderboardType.RANKED
        }
      });
      await db.createLbRun({ map, user: u2, time: 1, gamemode: Gamemode.SJ });

      await ranking.queueMapUpdates(map.id);
      assert.equal(await ranking.processQueue(), 2);

      assert.equal(
        await valkey.zscore(
          RankPointsKeys.ladder(Gamemode.SJ, Style.NORMAL),
          u2.id.toString()
        ),
        getRankPoints(1, 1, 2).toString()
      );
      // AHOP ladder unchanged
      assert.deepEqual(
        await getLadder(),
        new Map([
          [u1.id, getRankPoints(1, 2, 1)],
          [u2.id, getRankPoints(2, 2, 1)]
        ])
      );
    });

    it('should do nothing when the queue is empty', async () => {
      assert.equal(await ranking.processQueue(), 0);
    });
  });

  describe('stages and bonuses', () => {
    // A tier 4 map with 3 stages and 2 bonuses (tier 2, one unranked, so the
    // ranked one gets the whole bonus share).
    let ranking: RankingService, a, b, map;

    const lb = (
      trackType: TrackType,
      trackNum: number
    ): LeaderboardIdentifier => ({
      mapID: map.id,
      gamemode: Gamemode.AHOP,
      trackType,
      trackNum,
      style: Style.NORMAL
    });

    before(async () => {
      ranking = app.get(RankingService);
      [a, b] = await Promise.all([db.createUser(), db.createUser()]);
      map = await db.createMap();
      await prisma.leaderboard.update({
        where: { mapID_gamemode_trackType_trackNum_style: ahopMain(map.id) },
        data: { tier: 4 }
      });

      await prisma.leaderboard.createMany({
        data: [
          // Stages get no tier of their own in real data. Give these a tier
          // anyway to check it's ignored in favour of the main track's.
          ...[1, 2, 3].map((trackNum) => ({
            ...lb(TrackType.STAGE, trackNum),
            tier: 1,
            type: LeaderboardType.RANKED
          })),
          {
            ...lb(TrackType.BONUS, 1),
            tier: 2,
            linear: true,
            type: LeaderboardType.RANKED
          },
          {
            ...lb(TrackType.BONUS, 2),
            tier: 2,
            linear: true,
            type: LeaderboardType.UNRANKED
          }
        ]
      });

      await db.createLbRun({ map, user: a, time: 1 });
      await db.createLbRun({ map, user: b, time: 2 });
      for (const [user, trackType, trackNum, time] of [
        [a, TrackType.STAGE, 1, 1],
        [b, TrackType.STAGE, 1, 2],
        [b, TrackType.STAGE, 2, 1],
        [a, TrackType.BONUS, 1, 1],
        [b, TrackType.BONUS, 2, 1]
      ] as const) {
        await db.createLbRun({ map, user, time, trackType, trackNum });
      }

      await ranking.rebuildAll();
    });

    after(async () => {
      await db.cleanup('pastRun', 'leaderboardRun', 'user', 'mMap');
    });

    it("should add weighted stage and bonus points to the main track's", async () => {
      // 3 stages share half the main track's value, scored at the main
      // track's tier. The one ranked bonus gets the whole quarter, at its own.
      const stage = getTrackWeight(TrackType.STAGE, 3);
      const bonus = getTrackWeight(TrackType.BONUS, 1);
      assert.ok(Math.abs(stage - 0.5 / 3) < 1e-9);
      assert.equal(bonus, 0.25);

      assert.deepEqual(
        await getLadder(),
        new Map([
          [
            a.id,
            getRankPoints(1, 2, 4) +
              getRankPoints(1, 2, 4, stage) +
              getRankPoints(1, 1, 2, bonus)
          ],
          [
            b.id,
            getRankPoints(2, 2, 4) +
              getRankPoints(2, 2, 4, stage) +
              getRankPoints(1, 1, 4, stage)
            // Nothing for b's bonus 2 run, it's unranked.
          ]
        ])
      );
    });

    it('should show stage and bonus points on runs', async () => {
      const res = await req.get({
        url: `maps/${map.id}/leaderboard`,
        query: {
          gamemode: Gamemode.AHOP,
          trackType: TrackType.STAGE,
          trackNum: 1
        },
        status: 200,
        validatePaged: { type: LeaderboardRunDto, count: 2 }
      });

      const stage = getTrackWeight(TrackType.STAGE, 3);
      assert.ok(
        matchesPartial(res.body.data, [
          { userID: a.id, points: getRankPoints(1, 2, 4, stage) },
          { userID: b.id, points: getRankPoints(2, 2, 4, stage) }
        ])
      );
    });

    it("should give stage runs on a user's profile their main track's tier", async () => {
      const res = await req.get({
        url: `users/${b.id}/runs`,
        query: { trackType: TrackType.STAGE },
        status: 200,
        validatePaged: { type: LeaderboardRunDto, count: 2 }
      });

      for (const run of res.body.data) {
        assert.equal(run.leaderboard.tier, 4);
      }
    });

    it('should not include points on runs on an unranked bonus', async () => {
      const res = await req.get({
        url: `maps/${map.id}/leaderboard`,
        query: {
          gamemode: Gamemode.AHOP,
          trackType: TrackType.BONUS,
          trackNum: 2
        },
        status: 200,
        validatePaged: { type: LeaderboardRunDto, count: 1 }
      });

      assert.equal(res.body.data[0].userID, b.id);
      assert.equal(res.body.data[0].points, undefined);
    });

    it('should resplit bonus points when a bonus becomes ranked or unranked', async () => {
      const setBonus2Type = async (type: LeaderboardType) => {
        await prisma.leaderboard.update({
          where: {
            mapID_gamemode_trackType_trackNum_style: lb(TrackType.BONUS, 2)
          },
          data: { type }
        });
        // As the admin map update does after any leaderboard change.
        await ranking.queueMapUpdates(map.id);
        await ranking.processQueue();
      };
      const bonusPoints = async (userID: number, trackNum: number) =>
        (
          await ranking.getTrackPoints(lb(TrackType.BONUS, trackNum), [userID])
        )[0];

      // Both ranked: they split the bonus share.
      await setBonus2Type(LeaderboardType.RANKED);
      const half = getTrackWeight(TrackType.BONUS, 2);
      assert.equal(await bonusPoints(a.id, 1), getRankPoints(1, 1, 2, half));
      assert.equal(await bonusPoints(b.id, 2), getRankPoints(1, 1, 2, half));

      // Unranked again: bonus 1 gets it all back, bonus 2 pays nothing.
      await setBonus2Type(LeaderboardType.UNRANKED);
      const whole = getTrackWeight(TrackType.BONUS, 1);
      assert.equal(await bonusPoints(a.id, 1), getRankPoints(1, 1, 2, whole));
      assert.equal(await bonusPoints(b.id, 2), undefined);
    });

    it('should reweight the remaining stages when a stage is removed', async () => {
      const removed = lb(TrackType.STAGE, 3);
      await prisma.leaderboard.delete({
        where: { mapID_gamemode_trackType_trackNum_style: removed }
      });

      await ranking.queueMapUpdates(map.id);
      // Removed leaderboards are no longer found, so queue it directly as
      // the version upload flow does.
      await ranking.queueLeaderboardUpdates([removed]);
      await ranking.processQueue();

      const stage = getTrackWeight(TrackType.STAGE, 2);
      assert.equal(
        (await getLadder()).get(b.id),
        getRankPoints(2, 2, 4) +
          getRankPoints(2, 2, 4, stage) +
          getRankPoints(1, 1, 4, stage)
      );
    });
  });
});
