// noinspection DuplicatedCode

import {
  LeaderboardRunDto,
  RankEntryDto,
  UserRankDto
} from '../../backend/src/app/dto';
import { RankingService } from '../../backend/src/app/modules/ranking/ranking.service';
import { RankPointsKeys } from '../../backend/src/app/modules/ranking/rank-points.keys';
import {
  Gamemode,
  LeaderboardIdentifier,
  LeaderboardType,
  MapStatus,
  Role,
  Style,
  TrackType
} from '@momentum/constants';
import { getRankPoints } from '@momentum/xp-systems';
import {
  DbUtil,
  E2ETestMMap,
  NULL_ID,
  RequestUtil
} from '@momentum/test-utils';
import { PrismaClient, User } from '@momentum/db';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import Valkey from 'iovalkey';
import {
  setupE2ETestEnvironment,
  teardownE2ETestEnvironment
} from './support/environment';

describe('Ranks', () => {
  let app: NestFastifyApplication,
    prisma: PrismaClient,
    req: RequestUtil,
    db: DbUtil,
    valkey: Valkey,
    ranking: RankingService;

  beforeAll(async () => {
    const env = await setupE2ETestEnvironment();
    app = env.app;
    prisma = env.prisma;
    req = env.req;
    db = env.db;
    valkey = env.valkey;
    ranking = app.get(RankingService);
  });

  afterAll(() => teardownE2ETestEnvironment(app, prisma));

  const ahopMain = (mapID: number): LeaderboardIdentifier => ({
    mapID,
    gamemode: Gamemode.AHOP,
    trackType: TrackType.MAIN,
    trackNum: 1,
    style: Style.NORMAL
  });

  const ahopLadder = RankPointsKeys.ladder(Gamemode.AHOP, Style.NORMAL);

  describe('reads', () => {
    let u1: User,
      u2: User,
      u3: User,
      u3Token: string,
      noRunsToken: string,
      map1: E2ETestMMap,
      map2: E2ETestMMap;

    // map1 is tier 1 with 3 runs, map2 is tier 3 with 2 runs.
    const map1Points = (rank: number) => getRankPoints(rank, 3, 1);
    const map2Points = (rank: number) => getRankPoints(rank, 2, 3);
    const totals = () =>
      new Map([
        [u1.id, map1Points(1)],
        [u2.id, map1Points(2) + map2Points(1)],
        [u3.id, map1Points(3) + map2Points(2)]
      ]);
    const expectedLadder = () =>
      [...totals().entries()]
        .sort(([, a], [, b]) => b - a)
        .map(([userID, points], i) => ({ rank: i + 1, userID, points }));

    beforeAll(async () => {
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

      await ranking.rebuildAll();
    });

    afterAll(() => db.cleanup('pastRun', 'leaderboardRun', 'user', 'mMap'));

    describe('ranks/{gamemode}', () => {
      describe('GET', () => {
        it('should return the ladder ordered by points, summing only ranked main tracks', async () => {
          const res = await req.get({
            url: `ranks/${Gamemode.AHOP}`,
            status: 200,
            validatePaged: { type: RankEntryDto, count: 3 }
          });

          expect(res.body.data).toMatchObject(expectedLadder());
          expect(res.body.data[0].user).toMatchObject({
            id: res.body.data[0].userID
          });
        });

        it('should paginate', async () => {
          const res = await req.get({
            url: `ranks/${Gamemode.AHOP}`,
            query: { skip: 1, take: 1 },
            status: 200,
            validatePaged: { type: RankEntryDto, returnCount: 1, totalCount: 3 }
          });

          expect(res.body.data[0]).toMatchObject(expectedLadder()[1]);
        });

        it('should return the page around the logged in user with the around filter', async () => {
          const res = await req.get({
            url: `ranks/${Gamemode.AHOP}`,
            query: { filter: 'around', take: 1 },
            status: 200,
            token: u3Token,
            validatePaged: { type: RankEntryDto, returnCount: 1, totalCount: 3 }
          });

          expect(res.body.data[0]).toMatchObject(
            expectedLadder().find(({ userID }) => userID === u3.id)
          );
        });

        it('should 401 for the around filter when not logged in', () =>
          req.get({
            url: `ranks/${Gamemode.AHOP}`,
            query: { filter: 'around' },
            status: 401
          }));

        it('should 410 for the around filter when the user has no rank', () =>
          req.get({
            url: `ranks/${Gamemode.AHOP}`,
            query: { filter: 'around' },
            status: 410,
            token: noRunsToken
          }));

        it('should return an empty ladder for a style with no ranked runs', () =>
          req.get({
            url: `ranks/${Gamemode.AHOP}`,
            query: { style: Style.SIDEWAYS },
            status: 200,
            validatePaged: { type: RankEntryDto, count: 0 }
          }));

        it('should return an empty ladder for a gamemode with only unranked runs', () =>
          req.get({
            url: `ranks/${Gamemode.SJ}`,
            status: 200,
            validatePaged: { type: RankEntryDto, count: 0 }
          }));

        it('should 400 for an invalid gamemode', async () => {
          await req.get({ url: 'ranks/999', status: 400 });
          await req.get({ url: 'ranks/surf', status: 400 });
        });
      });
    });

    describe('users/{userID}/ranks', () => {
      describe('GET', () => {
        it("should return the user's rank and points on each ladder they are on", async () => {
          const res = await req.get({
            url: `users/${u2.id}/ranks`,
            status: 200,
            validateArray: { type: UserRankDto, length: 1 }
          });

          expect(res.body[0]).toMatchObject({
            gamemode: Gamemode.AHOP,
            style: Style.NORMAL,
            rank: expectedLadder().find(({ userID }) => userID === u2.id).rank,
            points: totals().get(u2.id),
            totalPlayers: 3
          });
        });

        it('should not include ladders the user only has unranked runs on', async () => {
          const res = await req.get({
            url: `users/${u3.id}/ranks`,
            status: 200,
            validateArray: UserRankDto
          });

          expect(
            res.body.find(({ gamemode }) => gamemode === Gamemode.SJ)
          ).toBeUndefined();
        });

        it('should return an empty array for a user with no points', async () => {
          const [user] = await db.createAndLoginUser();
          const res = await req.get({
            url: `users/${user.id}/ranks`,
            status: 200
          });
          expect(res.body).toEqual([]);
        });

        it('should 404 for a nonexistent user', () =>
          req.get({ url: `users/${NULL_ID}/ranks`, status: 404 }));
      });
    });

    describe('users/{userID}/runs', () => {
      describe('GET', () => {
        it("should return the user's runs with rank, total runs and points", async () => {
          const res = await req.get({
            url: `users/${u3.id}/runs`,
            status: 200,
            validatePaged: { type: LeaderboardRunDto, count: 3 }
          });

          expect(res.body.data).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                mapID: map1.id,
                gamemode: Gamemode.AHOP,
                rank: 3,
                totalRuns: 3,
                points: map1Points(3),
                map: expect.objectContaining({ id: map1.id, name: map1.name }),
                leaderboard: expect.objectContaining({ tier: 1 })
              }),
              expect.objectContaining({
                mapID: map2.id,
                gamemode: Gamemode.AHOP,
                rank: 2,
                totalRuns: 2,
                points: map2Points(2),
                leaderboard: expect.objectContaining({ tier: 3 })
              }),
              expect.objectContaining({
                mapID: map1.id,
                gamemode: Gamemode.SJ,
                rank: 1,
                totalRuns: 1
              })
            ])
          );

          // Unranked leaderboards don't award points.
          const sjRun = res.body.data.find(
            ({ gamemode }) => gamemode === Gamemode.SJ
          );
          expect(sjRun.points).toBeUndefined();
        });

        it('should filter by leaderboard type', async () => {
          const res = await req.get({
            url: `users/${u3.id}/runs`,
            query: { leaderboardType: LeaderboardType.RANKED },
            status: 200,
            validatePaged: { type: LeaderboardRunDto, count: 2 }
          });

          expect(
            res.body.data.every(({ gamemode }) => gamemode === Gamemode.AHOP)
          ).toBe(true);
        });

        it('should filter by gamemode', () =>
          req.get({
            url: `users/${u3.id}/runs`,
            query: { gamemode: Gamemode.SJ },
            status: 200,
            validatePaged: { type: LeaderboardRunDto, count: 1 }
          }));

        it('should filter by track type', () =>
          req.get({
            url: `users/${u1.id}/runs`,
            query: { trackType: TrackType.BONUS },
            status: 200,
            validatePaged: { type: LeaderboardRunDto, count: 1 }
          }));

        it('should paginate', () =>
          req.get({
            url: `users/${u3.id}/runs`,
            query: { skip: 1, take: 1 },
            status: 200,
            validatePaged: {
              type: LeaderboardRunDto,
              returnCount: 1,
              totalCount: 3
            }
          }));

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

          expect(
            res.body.data.find(({ mapID }) => mapID === testingMap.id)
          ).toBeUndefined();
        });

        it('should 404 for a nonexistent user', () =>
          req.get({ url: `users/${NULL_ID}/runs`, status: 404 }));
      });
    });

    describe('maps/{mapID}/leaderboard', () => {
      describe('GET', () => {
        it('should include points on runs on a ranked leaderboard', async () => {
          const res = await req.get({
            url: `maps/${map1.id}/leaderboard`,
            query: { gamemode: Gamemode.AHOP },
            status: 200,
            validatePaged: { type: LeaderboardRunDto, count: 3 },
            token: u3Token
          });

          expect(res.body.data).toMatchObject([
            { rank: 1, points: map1Points(1) },
            { rank: 2, points: map1Points(2) },
            { rank: 3, points: map1Points(3) }
          ]);
        });

        it('should not include points on runs on an unranked leaderboard', async () => {
          const res = await req.get({
            url: `maps/${map1.id}/leaderboard`,
            query: { gamemode: Gamemode.SJ },
            status: 200,
            validatePaged: { type: LeaderboardRunDto, count: 1 },
            token: u3Token
          });

          expect(res.body.data[0].points).toBeUndefined();
        });

        it('should include points on a single run', async () => {
          const res = await req.get({
            url: `maps/${map2.id}/leaderboard/run`,
            query: { gamemode: Gamemode.AHOP, userID: u2.id },
            status: 200,
            validate: LeaderboardRunDto,
            token: u3Token
          });

          expect(res.body.points).toBe(map2Points(1));
        });
      });
    });
  });

  describe('updates', () => {
    let adminToken: string,
      modToken: string,
      u1: User,
      u2: User,
      map: E2ETestMMap;

    const getLadder = async () => {
      const entries = await valkey.zrevrange(ahopLadder, 0, -1, 'WITHSCORES');
      const ladder = new Map<number, number>();
      for (let i = 0; i < entries.length; i += 2)
        ladder.set(Number(entries[i]), Number(entries[i + 1]));
      return ladder;
    };

    beforeEach(async () => {
      [[, adminToken], modToken, u1, u2] = await Promise.all([
        db.createAndLoginUser({ data: { roles: Role.ADMIN } }),
        db.loginNewUser({ data: { roles: Role.MODERATOR } }),
        db.createUser(),
        db.createUser()
      ]);

      map = await db.createMap();
      await db.createLbRun({ map, user: u1, time: 1 });
      await db.createLbRun({ map, user: u2, time: 2 });

      await ranking.rebuildAll();

      expect(await getLadder()).toEqual(
        new Map([
          [u1.id, getRankPoints(1, 2, 1)],
          [u2.id, getRankPoints(2, 2, 1)]
        ])
      );
    });

    afterEach(() => db.cleanup('pastRun', 'leaderboardRun', 'user', 'mMap'));

    it('should recompute a leaderboard after an admin deletes a run', async () => {
      await req.post({
        url: 'admin/delete-run',
        body: { mapID: map.id, gamemode: Gamemode.AHOP, userID: u1.id },
        status: 204,
        token: adminToken
      });

      expect(await ranking.processQueue()).toBe(1);

      // u1 is gone, u2 is now a solo world record.
      expect(await getLadder()).toEqual(
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

      expect(await ranking.processQueue()).toBe(2);

      expect(await getLadder()).toEqual(
        new Map([[u1.id, getRankPoints(1, 1, 1) * 2]])
      );
    });

    it('should remove a leaderboard from the ladder when it becomes unranked', async () => {
      await prisma.leaderboard.update({
        where: { mapID_gamemode_trackType_trackNum_style: ahopMain(map.id) },
        data: { type: LeaderboardType.UNRANKED }
      });

      await ranking.queueMapUpdates(map.id);
      expect(await ranking.processQueue()).toBe(1);

      expect(await getLadder()).toEqual(new Map());
      expect(await valkey.exists(RankPointsKeys.track(ahopMain(map.id)))).toBe(
        0
      );
    });

    it('should recompute a leaderboard when its tier changes', async () => {
      await prisma.leaderboard.update({
        where: { mapID_gamemode_trackType_trackNum_style: ahopMain(map.id) },
        data: { tier: 5 }
      });

      await ranking.queueMapUpdates(map.id);
      expect(await ranking.processQueue()).toBe(1);

      expect(await getLadder()).toEqual(
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

      expect(await ranking.processQueue()).toBe(1);

      expect(await getLadder()).toEqual(new Map());
    });

    it('should remove a map from the ladder when an admin deletes it', async () => {
      await req.del({
        url: `admin/maps/${map.id}`,
        status: 204,
        token: adminToken
      });

      expect(await ranking.processQueue()).toBe(1);

      expect(await getLadder()).toEqual(new Map());
      expect(await valkey.exists(RankPointsKeys.track(ahopMain(map.id)))).toBe(
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
      expect(await ranking.processQueue()).toBe(2);

      expect(
        await valkey.zscore(
          RankPointsKeys.ladder(Gamemode.SJ, Style.NORMAL),
          u2.id.toString()
        )
      ).toBe(getRankPoints(1, 1, 2).toString());
      // AHOP ladder unchanged
      expect(await getLadder()).toEqual(
        new Map([
          [u1.id, getRankPoints(1, 2, 1)],
          [u2.id, getRankPoints(2, 2, 1)]
        ])
      );
    });

    it('should do nothing when the queue is empty', async () => {
      expect(await ranking.processQueue()).toBe(0);
    });

    describe('admin/rank-points/rebuild', () => {
      describe('POST', () => {
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
          await ranking.processQueue();

          expect(await getLadder()).toEqual(
            new Map([
              [u1.id, getRankPoints(1, 3, 1)],
              [u2.id, getRankPoints(2, 3, 1)],
              [u3.id, getRankPoints(3, 3, 1)]
            ])
          );
        });

        it('should 403 for a moderator', () =>
          req.post({
            url: 'admin/rank-points/rebuild',
            status: 403,
            token: modToken
          }));

        it('should 401 when no access token is provided', () =>
          req.unauthorizedTest('admin/rank-points/rebuild', 'post'));
      });
    });
  });
});
