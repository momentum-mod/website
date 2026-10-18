// noinspection DuplicatedCode

import { CompletedRunDto } from '../../backend/src/app/dto';
import {
  DbUtil,
  randomHash,
  randomSteamID,
  RequestUtil,
  resetKillswitches,
  RunTester,
  RunTesterProps
} from '@momentum/test-utils';
import {
  ActivityType,
  Gamemode,
  LeaderboardType,
  MapStatus,
  Role,
  RunValidationErrorType,
  Style,
  TrackType
} from '@momentum/constants';
import { PrismaClient, TypedSql } from '@momentum/db';
import { ZonesStubString } from '@momentum/formats/zone';
import {
  setupE2ETestEnvironment,
  teardownE2ETestEnvironment
} from './support/environment';
import * as ReplayFile from '@momentum/formats/replay';
import Valkey from 'iovalkey';

describe('Session', () => {
  let app,
    prisma: PrismaClient,
    req: RequestUtil,
    db: DbUtil,
    map,
    valkey: Valkey;

  beforeAll(async () => {
    const env = await setupE2ETestEnvironment();
    app = env.app;
    prisma = env.prisma;
    valkey = env.valkey;
    req = env.req;
    db = env.db;

    map = await db.createMapWithFullLeaderboards(
      {
        name: ReplayFile.Stubs.ReplayHeaderStub.mapName,
        status: MapStatus.APPROVED
      },
      [Gamemode.AHOP, Gamemode.BHOP]
    );
  });

  afterAll(async () => {
    await db.cleanup('mMap');
    await teardownE2ETestEnvironment(app, prisma);
  });

  // Testing this is HARD. We need a replay that matches our timestamps okay so
  // we're going to be heavily relying on this RunTester class to essentially
  // generate a valid run the API will accept. NOTE: Before anyone gets any
  // clever ideas, this is *not* our anti-cheat. Just because this API will
  // accept some goofy stuff, does not mean the live game will, and trying to
  // use this method on the live API may get you banned!
  describe('session/run/:sessionID/end', () => {
    describe('POST', () => {
      let user, token, defaultTesterProperties, otherUsers;

      beforeEach(async () => {
        // Run submission affects so much with ranks and stuff that's it's
        // easiest to just clear and reset all this after each test.
        [user, token] = await db.createAndLoginGameUser();

        defaultTesterProperties = (): RunTesterProps => ({
          token,
          userID: user.id,
          gamemode: Gamemode.AHOP,
          trackType: TrackType.MAIN,
          trackNum: 1,
          style: Style.NORMAL,
          mapID: map.id,
          mapName: map.name,
          mapHash: map.currentVersion.bspHash,
          steamID: user.steamID,
          playerName: 'Abstract Barry'
        });

        otherUsers = [];
        for (let i = 0; i < 10; i++) {
          const user = await prisma.user.create({
            data: {
              alias: `RunSessions Test User ${i + 1}`,
              steamID: randomSteamID()
            }
          });

          otherUsers.push(user);

          await prisma.leaderboardRun.create({
            data: {
              mmap: { connect: { id: map.id } },
              leaderboard: {
                connect: {
                  mapID_gamemode_trackType_trackNum_style: {
                    mapID: map.id,
                    gamemode: Gamemode.AHOP,
                    trackType: TrackType.MAIN,
                    trackNum: 1,
                    style: Style.NORMAL
                  }
                }
              },
              pastRun: {
                create: {
                  user: { connect: { id: user.id } },
                  mmap: { connect: { id: map.id } },
                  gamemode: Gamemode.AHOP,
                  trackType: TrackType.MAIN,
                  trackNum: 1,
                  style: Style.NORMAL,
                  time: i
                }
              },
              flags: [0],
              replayHash: randomHash(),
              time: i + 0.005,
              splits: {},
              user: { connect: { id: user.id } }
            },
            include: { mmap: true, user: true }
          });
        }
      });

      afterEach(async () => {
        // Gotta do runs first due to Restrict constraint
        await db.cleanup('pastRun', 'leaderboardRun', 'user');

        // So we can screw around with zones in specific tests
        await prisma.mMap.update({
          where: { id: map.id },
          data: {
            currentVersion: {
              update: { zones: ZonesStubString }
            }
          }
        });

        await prisma.mapStats.update({
          where: { mapID: map.id },
          data: { completions: 0, uniqueCompletions: 0 }
        });
      });

      // With the way we're constructed above DB inserts below the existing
      // runs will be 0.01s, 1.01s, 2.01s ... 10.01s, this is ~500ms so will be
      // rank 2.
      const submitRun = (delay?: number) =>
        RunTester.run({
          req,
          valkey,
          props: defaultTesterProperties(),
          segments: [1, 1],
          delay
        });

      const submitWithOverrides = async (overrides: {
        props?: Partial<RunTesterProps>;
        delay?: number;
        beforeSubmit?: (self: RunTester) => void;
        beforeSave?: (self: RunTester) => void;
        writeStats?: boolean;
        writeFrames?: boolean;
      }) => {
        const tester = new RunTester(req, valkey, {
          ...defaultTesterProperties(),
          ...overrides.props
        });

        await tester.startRun();
        await tester.doSegment([1, 1], overrides.delay);

        const { props: _, ...endRunProps } = overrides;
        return tester.endRun(endRunProps);
      };

      const getRuns = () =>
        prisma.$queryRawTyped(
          TypedSql.getLeaderboardRuns(
            map.id,
            Gamemode.AHOP,
            TrackType.MAIN,
            1,
            Style.NORMAL,
            0,
            null
          )
        );

      // Splitting these out in multiple tests. It's slower, but there's so
      // much stuff we want to test here that I want to keep it organised well.
      describe('should process a valid run and ', () => {
        it('should respond with a CompletedRunDto', async () => {
          const res = await submitRun();
          const completedRun = res.body[0];

          expect(res.statusCode).toBe(200);
          expect(completedRun).toBeValidDto(CompletedRunDto);
          expect(completedRun.isNewPersonalBest).toBe(true);
          expect(completedRun.isNewWorldRecord).toBe(false);
          expect(completedRun.totalRuns).toBe(11);
        });

        // Note that now we're using a window function the rank column isn't
        // materialized. These tests is effectively just checking the window
        // function behaves correctly.
        it('should be inserted in leaderboards, shifting other ranks', async () => {
          const ranksBefore = await getRuns();
          expect(ranksBefore).toHaveLength(10);

          await submitRun();

          const ranksAfter = await getRuns();
          expect(ranksAfter).toHaveLength(11);
          expect(ranksAfter.find((rank) => rank.userID === user.id).rank).toBe(
            2
          );

          for (const rankBefore of ranksBefore.filter((rank) => rank.rank > 1))
            expect(
              ranksAfter.find(
                (rankAfter) => rankAfter.userID === rankBefore.userID
              ).rank
            ).toBe(rankBefore.rank + 1);
        });

        it('if has a PB, only shift ranks between the PB and old run', async () => {
          // Update rank 4 run to belong to user1
          await prisma.leaderboardRun.updateMany({
            where: {
              mapID: map.id,
              gamemode: Gamemode.AHOP,
              trackType: TrackType.MAIN,
              trackNum: 1,
              style: Style.NORMAL,
              userID: otherUsers[3].id
            },
            data: { userID: user.id }
          });

          const ranksBefore = await getRuns();
          expect(ranksBefore).toHaveLength(10);

          const res = await submitRun();
          const completedRun = res.body[0];

          expect(res.statusCode).toBe(200);
          expect(completedRun).toBeValidDto(CompletedRunDto);
          expect(completedRun.isNewPersonalBest).toBe(true);
          expect(completedRun.totalRuns).toBe(10);

          const ranksAfter = await getRuns();

          // It should have *updated* our existing rank, so this should still
          // be 10
          expect(ranksAfter).toHaveLength(10);

          // So, it should have shifted rank 2, 3 to rank 3, 4, our rank (4)
          // now becoming 2.
          // prettier-ignore
          expect(ranksBefore.find((rank) => rank.rank === 2).userID).toBe(
                  ranksAfter.find((rank) => rank.rank === 3).userID
          );

          // prettier-ignore
          expect(ranksBefore.find((rank) => rank.rank === 3).userID).toBe(
                  ranksAfter.find((rank) => rank.rank === 4).userID);

          // prettier-ignore
          expect(ranksBefore.find((rank) => rank.rank === 4).userID).toBe(
                  ranksAfter.find((rank) => rank.rank === 2).userID);

          expect(ranksBefore.find((rank) => rank.rank === 4).userID).toBe(
            user.id
          );
        });

        it('should not change ranks or assign rank XP if not a PB', async () => {
          // Update whatever rank + run is rank 1 to belong to user1
          await prisma.leaderboardRun.updateMany({
            where: {
              mapID: map.id,
              gamemode: Gamemode.AHOP,
              trackType: TrackType.MAIN,
              trackNum: 1,
              style: Style.NORMAL,
              userID: otherUsers[0].id
            },
            data: { userID: user.id }
          });

          const ranksBefore = await getRuns();

          expect(ranksBefore).toHaveLength(10);

          const res = await submitRun();
          const completedRun = res.body[0];

          expect(res.statusCode).toBe(200);
          expect(completedRun).toBeValidDto(CompletedRunDto);
          expect(completedRun.isNewPersonalBest).toBe(false);
          // expect(completedRun.xp.rankXP).toBe(0);
          expect(completedRun.totalRuns).toBe(10);

          const ranksAfter = await getRuns();
          expect(ranksBefore).toEqual(ranksAfter);
        });

        it('should assign cosmetic and rank XP for the run', async () => {
          const res = await submitRun();

          const completedRun = res.body[0];

          expect(res.statusCode).toBe(200);
          expect(completedRun).toMatchObject({
            time: expect.any(Number),
            newPersonalBest: { rank: 2 },
            xp: {
              // rankXP: expect.any(Number),
              cosXP: {
                oldXP: 0,
                gainXP: expect.any(Number)
              }
            }
          });
        });

        it('should update completion stats for the map, track and zones', async () => {
          await submitRun(100);
          await submitRun(150);

          // None of the runs we added to the DB at the start of this test
          // actually added stats, so we can just check that completions are 1.
          const mapStats = await prisma.mapStats.findUnique({
            where: { mapID: map.id }
          });
          expect(mapStats.completions).toBe(2);
          expect(mapStats.uniqueCompletions).toBe(1);
        });

        it('should create an activity if the user achieved a PB', async () => {
          await submitRun();

          const numPBs = await prisma.activity.count({
            where: {
              userID: user.id,
              type: ActivityType.PB_ACHIEVED,
              data: map.id
            }
          });

          expect(numPBs).toBe(1);
        });

        it('should create an activity if the user achieved a WR', async () => {
          await db.cleanup('leaderboardRun');

          await submitRun();

          const numWRs = await prisma.activity.count({
            where: {
              userID: user.id,
              type: ActivityType.WR_ACHIEVED,
              data: map.id
            }
          });

          expect(numWRs).toBe(1);
        });
      });

      it('should accept a valid stage run', async () => {
        const res = await RunTester.run({
          req,
          valkey,
          props: {
            ...defaultTesterProperties(),
            trackType: TrackType.STAGE
          },
          segments: [1]
        });

        expect(res.statusCode).toBe(200);
      });

      it('should accept a valid bonus run', async () => {
        const res = await RunTester.run({
          req,
          valkey,
          props: {
            ...defaultTesterProperties(),
            trackType: TrackType.BONUS
          },
          segments: [0]
        });

        expect(res.statusCode).toBe(200);
      });

      it('should reject if there is no body', async () => {
        const res = await submitWithOverrides({
          beforeSubmit: (self) => (self.replayBuffer = Buffer.from(''))
        });

        expect(res.statusCode).toBe(400);
        expect(res.body.code).toBe(RunValidationErrorType.BAD_REPLAY_FILE);
      });

      // Test that permissions checks are getting called
      // Yes, u1 has runs on the map, but we don't actually test for that
      it('should 403 if the user does not have permission to access to the map', async () => {
        await prisma.mMap.update({
          where: { id: map.id },
          data: { status: MapStatus.PRIVATE_TESTING }
        });

        const res = await submitRun();
        expect(res.statusCode).toBe(403);

        await prisma.mMap.update({
          where: { id: map.id },
          data: { status: MapStatus.APPROVED }
        });
      });

      it('should reject if should 401 when no access token is provided', () =>
        req.unauthorizedTest('session/run/1/end', 'post'));

      it('should 503 if the RUN_SUBMISSION killswitch is active', async () => {
        const adminToken = await db.loginNewUser({
          data: { roles: Role.ADMIN }
        });

        await req.patch({
          url: 'admin/killswitch',
          status: 204,
          body: { RUN_SUBMISSION: true },
          token: adminToken
        });

        // The killswitch guard short-circuits before the handler, so the
        // session/replay don't need to be valid to observe the 503.
        await req.postOctetStream({
          url: 'session/run/1/end',
          body: Buffer.alloc(4000),
          status: 503,
          token
        });

        await resetKillswitches(req, adminToken);
      });

      describe('compatible styles', () => {
        let compatMap;

        beforeEach(async () => {
          compatMap = await db.createMap({
            status: MapStatus.APPROVED,
            leaderboards: {
              createMany: {
                data: [
                  {
                    gamemode: Gamemode.BHOP,
                    trackType: TrackType.MAIN,
                    trackNum: 1,
                    style: Style.NORMAL,
                    tier: 1,
                    linear: true,
                    type: LeaderboardType.RANKED
                  },
                  {
                    gamemode: Gamemode.BHOP,
                    trackType: TrackType.MAIN,
                    trackNum: 1,
                    style: Style.W_ONLY,
                    tier: 1,
                    linear: true,
                    type: LeaderboardType.RANKED
                  }
                ]
              }
            }
          });
        });

        it('should return a CompletedRunDto for each compatible style', async () => {
          const res = await RunTester.run({
            req,
            valkey,
            props: {
              token,
              userID: user.id,
              gamemode: Gamemode.BHOP,
              trackType: TrackType.MAIN,
              trackNum: 1,
              style: Style.W_ONLY,
              mapID: compatMap.id,
              mapName: compatMap.name,
              mapHash: compatMap.currentVersion.bspHash,
              steamID: user.steamID,
              playerName: 'Abstract Barry'
            },
            segments: [1, 1]
          });

          expect(res.statusCode).toBe(200);
          expect(res.body).toHaveLength(2);
          expect(res.body).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                style: Style.W_ONLY,
                isNewPersonalBest: true
              }),
              expect.objectContaining({
                style: Style.NORMAL,
                isNewPersonalBest: true
              })
            ])
          );
        });

        it('should create leaderboard entries for both the submitted and compatible styles', async () => {
          await RunTester.run({
            req,
            valkey,
            props: {
              token,
              userID: user.id,
              gamemode: Gamemode.BHOP,
              trackType: TrackType.MAIN,
              trackNum: 1,
              style: Style.W_ONLY,
              mapID: compatMap.id,
              mapName: compatMap.name,
              mapHash: compatMap.currentVersion.bspHash,
              steamID: user.steamID,
              playerName: 'Abstract Barry'
            },
            segments: [1, 1]
          });

          const [wOnlyRun] = await prisma.$queryRawTyped(
            TypedSql.getLeaderboardRuns(
              compatMap.id,
              Gamemode.BHOP,
              TrackType.MAIN,
              1,
              Style.W_ONLY,
              0,
              null
            )
          );

          const [normalRun] = await prisma.$queryRawTyped(
            TypedSql.getLeaderboardRuns(
              compatMap.id,
              Gamemode.BHOP,
              TrackType.MAIN,
              1,
              Style.NORMAL,
              0,
              null
            )
          );

          expect(wOnlyRun).not.toBeNull();
          expect(normalRun).not.toBeNull();
          expect(wOnlyRun.rank).toBe(1);
          expect(normalRun.rank).toBe(1);
        });

        it('a PRO run should also submit a TELEPORT style run', async () => {
          const kztMap = await db.createMap({
            status: MapStatus.APPROVED,
            leaderboards: {
              createMany: {
                data: [
                  {
                    gamemode: Gamemode.CLIMB_KZT,
                    trackType: TrackType.MAIN,
                    trackNum: 1,
                    style: Style.TELEPORT,
                    tier: 1,
                    linear: true,
                    type: LeaderboardType.RANKED
                  },
                  {
                    gamemode: Gamemode.CLIMB_KZT,
                    trackType: TrackType.MAIN,
                    trackNum: 1,
                    style: Style.PRO,
                    tier: 1,
                    linear: true,
                    type: LeaderboardType.RANKED
                  }
                ]
              }
            }
          });

          const res = await RunTester.run({
            req,
            valkey,
            props: {
              token,
              userID: user.id,
              gamemode: Gamemode.CLIMB_KZT,
              trackType: TrackType.MAIN,
              trackNum: 1,
              style: Style.PRO,
              mapID: kztMap.id,
              mapName: kztMap.name,
              mapHash: kztMap.currentVersion.bspHash,
              steamID: user.steamID,
              playerName: 'Abstract Barry'
            },
            segments: [1, 1]
          });

          expect(res.statusCode).toBe(200);
          expect(res.body).toHaveLength(2);
          expect(res.body).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                style: Style.PRO,
                isNewPersonalBest: true
              }),
              expect.objectContaining({
                style: Style.TELEPORT,
                isNewPersonalBest: true
              })
            ])
          );
        });
      });
    });
  });
});
