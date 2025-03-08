// noinspection DuplicatedCode

import { CompletedRunDto, RunSessionDto } from '../../backend/src/app/dto';

import {
  DbUtil,
  NULL_ID,
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
  MapStatus,
  Role,
  RunValidationErrorType,
  TrackType
} from '@momentum/constants';
import { PrismaClient } from '@prisma/client';
import { ZonesStubString } from '@momentum/formats/zone';
import {
  setupE2ETestEnvironment,
  teardownE2ETestEnvironment
} from './support/environment';
import { arrayFrom } from '@momentum/util-fn';
import * as ReplayFile from '@momentum/formats/replay';

describe('Session', () => {
  let app, prisma: PrismaClient, req: RequestUtil, db: DbUtil, map;

  beforeAll(async () => {
    const env = await setupE2ETestEnvironment();
    app = env.app;
    prisma = env.prisma;
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

  describe('session/run', () => {
    describe('POST', () => {
      let user, token;

      beforeEach(
        async () => ([user, token] = await db.createAndLoginGameUser())
      );

      afterEach(() => db.cleanup('user'));

      it('should return a valid run DTO', async () => {
        for (const [trackType, trackNum] of [
          [TrackType.MAIN, 1],
          [TrackType.STAGE, 1],
          [TrackType.STAGE, 2],
          [TrackType.BONUS, 1]
        ]) {
          const res = await req.post({
            url: 'session/run',
            status: 200,
            token,
            body: {
              mapID: map.id,
              gamemode: Gamemode.AHOP,
              trackType,
              trackNum
            }
          });

          expect(res.body).toBeValidDto(RunSessionDto);
          expect(res.body.userID).toBe(user.id);
        }
      });

      it('should delete any sessions not matching the given mapID or gamemode', async () => {
        const otherMap = await db.createMapWithFullLeaderboards(
          {
            name: 'bhop_hello_panzer',
            status: MapStatus.APPROVED
          },
          [Gamemode.AHOP, Gamemode.BHOP]
        );

        // Diff map, same gamemode - should die
        await prisma.runSession.create({
          data: {
            userID: user.id,
            mapID: otherMap.id,
            gamemode: Gamemode.AHOP,
            trackType: TrackType.MAIN,
            trackNum: 1
          }
        });

        // Same map, diff gamemode - should die
        await prisma.runSession.create({
          data: {
            userID: user.id,
            mapID: map.id,
            gamemode: Gamemode.BHOP,
            trackType: TrackType.MAIN,
            trackNum: 1
          }
        });

        // Same map, same gamemode, just different trackType - should live!
        await prisma.runSession.create({
          data: {
            userID: user.id,
            mapID: map.id,
            gamemode: Gamemode.AHOP,
            trackType: TrackType.MAIN,
            trackNum: 1
          }
        });

        await req.post({
          url: 'session/run',
          status: 200,
          token,
          body: {
            mapID: map.id,
            gamemode: Gamemode.AHOP,
            trackType: TrackType.STAGE,
            trackNum: 1
          }
        });

        const sessions = await prisma.runSession.findMany();
        expect(sessions).toHaveLength(2);
        expect(sessions).toMatchObject([
          expect.objectContaining({
            userID: user.id,
            mapID: map.id,
            trackType: TrackType.MAIN,
            gamemode: Gamemode.AHOP,
            trackNum: 1
          }),
          expect.objectContaining({
            userID: user.id,
            mapID: map.id,
            trackType: TrackType.STAGE,
            gamemode: Gamemode.AHOP,
            trackNum: 1
          })
        ]);
      });

      it('should 400 if not given a proper body', () =>
        req.post({
          url: 'session/run',
          status: 400,
          token
        }));

      it('should 400 if the map does not have leaderboards for given trackType/Num', async () => {
        for (const [trackType, trackNum] of [
          [TrackType.MAIN, 0],
          [TrackType.MAIN, 2],
          [TrackType.STAGE, 0],
          [TrackType.STAGE, 3],
          [TrackType.BONUS, 0],
          [TrackType.BONUS, 2]
        ]) {
          await req.post({
            url: 'session/run',
            status: 400,
            body: {
              mapID: map.id,
              gamemode: Gamemode.AHOP,
              trackType,
              trackNum
            },
            token
          });
        }
      });

      it('should 400 if the map does not exist', () =>
        req.post({
          url: 'session/run',
          status: 400,
          body: {
            mapID: NULL_ID,
            trackType: TrackType.MAIN,
            trackNum: 1,
            gamemode: Gamemode.AHOP
          },
          token
        }));

      it("should 400 if the map doesn't have a leaderboard for the provided gamemode", () =>
        req.post({
          url: 'session/run',
          status: 400,
          body: {
            mapID: NULL_ID,
            trackType: TrackType.MAIN,
            trackNum: 1,
            gamemode: Gamemode.BHOP
          },
          token
        }));

      it('should 401 when no access token is provided', () =>
        req.post({
          url: 'session/run',
          status: 401,
          body: {
            mapID: map.id,
            gamemode: Gamemode.AHOP,
            trackType: TrackType.MAIN,
            trackNum: 1
          }
        }));

      it('should return 403 if not using a game API key', async () => {
        const nonGameToken = await db.loginNewUser();

        await req.post({
          url: 'session/run',
          status: 403,
          body: {
            mapID: map.id,
            gamemode: Gamemode.AHOP,
            trackType: TrackType.MAIN,
            trackNum: 1
          },
          token: nonGameToken
        });
      });

      it('should 401 when no access token is provided', () =>
        req.unauthorizedTest('session/run', 'post'));

      it('should 503 if killswitch guard is active', async () => {
        const adminToken = await db.loginNewUser({
          data: { roles: Role.ADMIN }
        });

        await req.patch({
          url: 'admin/killswitch',
          status: 204,
          body: {
            RUN_SUBMISSION: true
          },
          token: adminToken
        });

        await req.post({
          url: 'session/run',
          status: 503,
          token
        });

        await resetKillswitches(req, adminToken);
      });
    });

    describe('DELETE', () => {
      let u1, u1Token, u2Token, s1, s2;

      beforeEach(async () => {
        [u1, u1Token] = await db.createAndLoginGameUser();
        u2Token = await db.loginNewGameUser();

        s1 = await prisma.runSession.create({
          data: {
            userID: u1.id,
            gamemode: Gamemode.AHOP,
            trackType: TrackType.MAIN,
            trackNum: 1,
            mapID: map.id
          }
        });

        s2 = await prisma.runSession.create({
          data: {
            userID: u1.id,
            gamemode: Gamemode.AHOP,
            trackType: TrackType.STAGE,
            trackNum: 1,
            mapID: map.id
          }
        });
      });

      afterEach(() => db.cleanup('user'));

      it('should delete the run session', async () => {
        await req.del({
          url: `session/run/${s1.id}`,
          status: 204,
          token: u1Token
        });

        expect(await prisma.runSession.findMany()).toMatchObject([s2]);
      });

      it("should 400 if session doesn't exist", async () => {
        await req.del({
          url: `session/run/${NULL_ID}`,
          status: 400,
          token: u1Token
        });
      });

      it('should 503 if killswitch guard is active for session/run', async () => {
        const adminToken = await db.loginNewUser({
          data: { roles: Role.ADMIN }
        });

        await req.patch({
          url: 'admin/killswitch',
          status: 204,
          body: {
            RUN_SUBMISSION: true
          },
          token: adminToken
        });

        await req.post({
          url: 'session/run',
          status: 503,
          token: u1Token
        });

        await resetKillswitches(req, adminToken);
      });

      it('should 400 if trying to delete a session belonging to another user', async () => {
        await req.del({
          url: `session/run/${s1.id}`,
          status: 400,
          token: u2Token
        });
      });

      it('should return 403 if not using a game API key', async () => {
        const nonGameToken = await db.loginNewUser();

        await req.del({
          url: `session/run/${s1.id}`,
          status: 403,
          token: nonGameToken
        });
      });

      it('should 401 when no access token is provided', () =>
        req.unauthorizedTest(`session/run/${s1.id}`, 'del'));
    });
  });

  describe('session/run/:sessionID', () => {
    describe('POST', () => {
      let user, token, session;

      beforeAll(async () => {
        [user, token] = await db.createAndLoginGameUser();
        session = await prisma.runSession.create({
          data: {
            userID: user.id,
            mapID: map.id,
            trackType: TrackType.MAIN,
            gamemode: Gamemode.AHOP,
            trackNum: 1
          }
        });
      });

      afterAll(() => db.cleanup('user'));

      it('should update an existing run with the zone and tick', async () => {
        await req.post({
          url: `session/run/${session.id}`,
          status: 204,
          body: { majorNum: 1, minorNum: 2, time: 510 },
          token
        });

        const timestamps = await prisma.runSessionTimestamp.findMany({
          orderBy: { createdAt: 'asc' }
        });
        expect(timestamps[0]).toMatchObject({
          majorNum: 1,
          minorNum: 2,
          time: 510,
          sessionID: session.id
        });
      });

      it('should 403 if not the owner of the run', async () => {
        const u2Token = await db.loginNewGameUser();

        await req.post({
          url: `session/run/${session.id}`,
          status: 400,
          body: { majorNum: 1, minorNum: 2, time: 510 },
          token: u2Token
        });
      });

      it('should 400 if the run does not exist', () =>
        req.post({
          url: `session/run/${NULL_ID}`,
          status: 400,
          body: { majorNum: 1, minorNum: 2, time: 510 },
          token
        }));

      it('should 403 if not using a game API key', async () => {
        const nonGameToken = await db.loginNewUser();

        await req.post({
          url: `session/run/${session.id}`,
          status: 403,
          body: { majorNum: 1, minorNum: 2, time: 510 },
          token: nonGameToken
        });
      });

      it('should 401 when no access token is provided', () =>
        req.unauthorizedTest('session/run/1', 'post'));
    });
  });

  // Testing this is HARD. We need a replay that matches our timestamps okay so
  // we're going to be heavily relying on this RunTester class to essentially
  // generate a valid run the API will accept. NOTE: Before anyone gets any
  // clever ideas, this is *not* our anti-cheat. Just because this API will
  // accept some goofy stuff, does not mean the live game will, and trying to
  // use this method on the live API may get you banned!
  describe('session/run/:sessionID/end', () => {
    describe('POST', () => {
      let user, token, defaultTesterProperties;

      beforeEach(async () => {
        // Run submission affects so much with ranks and stuff that's it's
        // easiest to just clear and reset all this after each test.
        [user, token] = await db.createAndLoginGameUser();

        await prisma.runSession.create({
          data: {
            userID: user.id,
            mapID: map.id,
            gamemode: Gamemode.AHOP,
            trackType: TrackType.MAIN,
            trackNum: 1
          }
        });

        defaultTesterProperties = (): RunTesterProps => ({
          token,
          gamemode: Gamemode.AHOP,
          trackType: TrackType.MAIN,
          trackNum: 1,
          mapID: map.id,
          mapName: map.name,
          mapHash: map.currentVersion.bspHash,
          steamID: user.steamID,
          playerName: 'Abstract Barry'
        });

        await Promise.all(
          arrayFrom(10, (i) =>
            prisma.user
              .create({
                data: {
                  alias: `RunSessions Test User ${i + 1}`,
                  steamID: randomSteamID()
                }
              })
              .then((user) =>
                prisma.leaderboardRun.create({
                  data: {
                    mmap: { connect: { id: map.id } },
                    leaderboard: {
                      connect: {
                        mapID_gamemode_trackType_trackNum_style: {
                          mapID: map.id,
                          gamemode: Gamemode.AHOP,
                          trackType: TrackType.MAIN,
                          trackNum: 1,
                          style: 0
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
                        style: 0,
                        time: i
                      }
                    },
                    flags: [0],
                    replayHash: randomHash(),
                    time: i + 0.005,
                    splits: {},
                    user: { connect: { id: user.id } },
                    rank: i + 1
                  },
                  include: { mmap: true, user: true }
                })
              )
          )
        );
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
        const tester = new RunTester(req, {
          ...defaultTesterProperties(),
          ...overrides.props
        });

        await tester.startRun();
        await tester.doSegment([1, 1], overrides.delay);

        const { props: _, ...endRunProps } = overrides;
        return tester.endRun(endRunProps);
      };

      // Splitting these out in multiple tests. It's slower, but there's so
      // much stuff we want to test here that I want to keep it organised well.
      describe('should process a valid run and ', () => {
        it('should respond with a CompletedRunDto', async () => {
          const res = await submitRun();

          expect(res.statusCode).toBe(200);
          expect(res.body).toBeValidDto(CompletedRunDto);
          expect(res.body.isNewPersonalBest).toBe(true);
          expect(res.body.isNewWorldRecord).toBe(false);
        });

        it('should be inserted in leaderboards, shifting other ranks', async () => {
          const ranksBefore = await prisma.leaderboardRun.findMany({
            where: {
              mapID: map.id,
              gamemode: Gamemode.AHOP,
              trackType: TrackType.MAIN,
              trackNum: 1,
              style: 0
            }
          });

          expect(ranksBefore).toHaveLength(10);

          await submitRun();

          const ranksAfter = await prisma.leaderboardRun.findMany({
            where: {
              mapID: map.id,
              gamemode: Gamemode.AHOP,
              trackType: TrackType.MAIN,
              trackNum: 1,
              style: 0
            }
          });

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
          // Update whatever rank + run is rank 4 to belong to user1
          await prisma.leaderboardRun.updateMany({
            where: {
              mapID: map.id,
              gamemode: Gamemode.AHOP,
              trackType: TrackType.MAIN,
              trackNum: 1,
              style: 0,
              rank: 4
            },
            data: { userID: user.id }
          });

          const ranksBefore = await prisma.leaderboardRun.findMany({
            where: {
              mapID: map.id,
              gamemode: Gamemode.AHOP,
              trackType: TrackType.MAIN,
              trackNum: 1,
              style: 0
            }
          });

          expect(ranksBefore).toHaveLength(10);

          const res = await submitRun();

          expect(res.statusCode).toBe(200);
          expect(res.body).toBeValidDto(CompletedRunDto);
          expect(res.body.isNewPersonalBest).toBe(true);

          const ranksAfter = await prisma.leaderboardRun.findMany({
            where: {
              mapID: map.id,
              gamemode: Gamemode.AHOP,
              trackType: TrackType.MAIN,
              trackNum: 1,
              style: 0
            }
          });

          // It should have *updated* our existing rank, so this should still
          // be 10
          expect(ranksAfter).toHaveLength(10);

          // So, it should have shifted rank 2, 3 to rank 3, 4, our rank (4)
          // now becoming 2. prettier-ignore
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
              style: 0,
              rank: 1
            },
            data: { userID: user.id }
          });

          const ranksBefore = await prisma.leaderboardRun.findMany({
            where: {
              mapID: map.id,
              gamemode: Gamemode.AHOP,
              trackType: TrackType.MAIN,
              trackNum: 1,
              style: 0
            }
          });

          expect(ranksBefore).toHaveLength(10);

          const res = await submitRun();

          expect(res.statusCode).toBe(200);
          expect(res.body).toBeValidDto(CompletedRunDto);
          expect(res.body.isNewPersonalBest).toBe(false);
          expect(res.body.xp.rankXP).toBe(0);

          const ranksAfter = await prisma.leaderboardRun.findMany({
            where: {
              mapID: map.id,
              gamemode: Gamemode.AHOP,
              trackType: TrackType.MAIN,
              trackNum: 1,
              style: 0
            }
          });

          expect(ranksBefore).toEqual(ranksAfter);
        });

        it('should assign cosmetic and rank XP for the run', async () => {
          const res = await submitRun();

          expect(res.statusCode).toBe(200);
          expect(res.body).toMatchObject({
            run: { rank: 2 },
            xp: {
              rankXP: expect.any(Number),
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
    });
  });
});
