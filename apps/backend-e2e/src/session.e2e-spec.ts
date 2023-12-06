// noinspection DuplicatedCode

import { CompletedRunDto, RunSessionDto } from '@momentum/backend/dto';
import {
  DbUtil,
  NULL_ID,
  randomHash,
  randomSteamID,
  RequestUtil,
  RunTester,
  RunTesterProps
} from '@momentum/backend/test-utils';
import {
  ActivityType,
  Gamemode,
  MapStatusNew,
  RunValidationErrorType,
  Tickrates,
  TrackType
} from '@momentum/constants';
import { PrismaClient } from '@prisma/client';
import {
  setupE2ETestEnvironment,
  teardownE2ETestEnvironment
} from './support/environment';
import { ZonesStub } from '@momentum/formats/zone';
import { JsonValue } from 'type-fest';

describe('Session', () => {
  let app, prisma: PrismaClient, req: RequestUtil, db: DbUtil, map;

  beforeAll(async () => {
    const env = await setupE2ETestEnvironment();
    app = env.app;
    prisma = env.prisma;
    req = env.req;
    db = env.db;

    map = await db.createMapWithFullLeaderboards({
      name: 'ahop_eazy',
      status: MapStatusNew.APPROVED
    });
  });

  afterAll(async () => {
    await db.cleanup('mMap');
    await teardownE2ETestEnvironment(app);
  });

  describe('session/run', () => {
    describe('POST', () => {
      let user, token;

      beforeAll(
        async () => ([user, token] = await db.createAndLoginGameUser())
      );

      afterAll(() => db.cleanup('user'));

      it('should return a valid run DTO', async () => {
        for (const [trackType, trackNum] of [
          [TrackType.MAIN, 0],
          [TrackType.STAGE, 0],
          [TrackType.STAGE, 1],
          [TrackType.BONUS, 0]
        ]) {
          const res = await req.post({
            url: 'session/run',
            status: 200,
            token,
            body: {
              mapID: map.id,
              gamemode: Gamemode.AHOP,
              trackType,
              trackNum,
              segment: 0
            }
          });

          expect(res.body).toBeValidDto(RunSessionDto);
          expect(res.body.userID).toBe(user.id);
        }
      });

      it('should 400 if not given a proper body', () =>
        req.post({
          url: 'session/run',
          status: 400,
          token
        }));

      it('should 400 if the map does not have leaderboards for given trackType/Num', async () => {
        for (const [trackType, trackNum] of [
          [TrackType.MAIN, 1],
          [TrackType.STAGE, 2],
          [TrackType.BONUS, 1]
        ]) {
          await req.post({
            url: 'session/run',
            status: 400,
            body: {
              mapID: map.id,
              gamemode: Gamemode.AHOP,
              trackType,
              trackNum,
              segment: 0
            },
            token
          });
        }
      });

      it('should 400 for a stage or bonus with segment != 0', async () => {
        await req.post({
          url: 'session/run',
          status: 400,
          body: {
            mapID: map.id,
            gamemode: Gamemode.AHOP,
            trackType: TrackType.STAGE,
            trackNum: 0,
            segment: 1
          },
          token
        });

        await req.post({
          url: 'session/run',
          status: 400,
          body: {
            mapID: map.id,
            gamemode: Gamemode.AHOP,
            trackType: TrackType.BONUS,
            trackNum: 0,
            segment: 1
          },
          token
        });
      });

      it('should 400 if the map does not exist', () =>
        req.post({
          url: 'session/run',
          status: 400,
          body: {
            mapID: NULL_ID,
            trackType: TrackType.MAIN,
            trackNum: 0,
            gamemode: Gamemode.AHOP,
            segment: 0
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
            trackNum: 0,
            gamemode: Gamemode.BHOP,
            segment: 0
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
            trackNum: 0,
            segment: 0
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
            trackNum: 0,
            segment: 0,
            checkpoint: 0
          },
          token: nonGameToken
        });
      });

      it('should 401 when no access token is provided', () =>
        req.unauthorizedTest('session/run', 'post'));
    });

    describe('DELETE', () => {
      let user, token;

      beforeAll(async () => {
        [user, token] = await db.createAndLoginGameUser();

        await prisma.runSession.create({
          data: {
            userID: user.id,
            gamemode: Gamemode.AHOP,
            trackType: TrackType.MAIN,
            trackNum: 0,
            mapID: map.id
          }
        });

        await prisma.runSession.create({
          data: {
            userID: user.id,
            gamemode: Gamemode.AHOP,
            trackType: TrackType.STAGE,
            trackNum: 0,
            mapID: map.id
          }
        });
      });

      afterAll(() => db.cleanup('user'));

      it('should delete the users run session', async () => {
        await req.del({ url: 'session/run', status: 204, token });

        expect(await prisma.runSession.findFirst()).toBeNull();
      });

      it('should 401 when no access token is provided', () =>
        req.del({ url: 'session/run', status: 401 }));

      it('should return 403 if not using a game API key', async () => {
        const nonGameToken = await db.loginNewUser();

        await req.del({ url: 'session/run', status: 403, token: nonGameToken });
      });

      it('should 401 when no access token is provided', () =>
        req.unauthorizedTest('session/run', 'del'));
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
            trackNum: 0
          }
        });
      });

      afterAll(() => db.cleanup('user'));

      it('should update an existing run with the zone and tick', async () => {
        await req.post({
          url: `session/run/${session.id}`,
          status: 204,
          body: { segment: 0, checkpoint: 1, time: 510 },
          token
        });

        const timestamps = await prisma.runSessionTimestamp.findMany({
          orderBy: { createdAt: 'asc' }
        });
        expect(timestamps[0]).toMatchObject({
          segment: 0,
          checkpoint: 1,
          time: 510,
          sessionID: session.id
        });
      });

      it('should 403 if not the owner of the run', async () => {
        const u2Token = await db.loginNewGameUser();

        await req.post({
          url: `session/run/${session.id}`,
          status: 400,
          body: { segment: 0, checkpoint: 1, time: 510 },
          token: u2Token
        });
      });

      it('should 400 if the run does not exist', () =>
        req.post({
          url: `session/run/${NULL_ID}`,
          status: 400,
          body: { segment: 0, checkpoint: 1, time: 510 },
          token
        }));

      it('should 403 if not using a game API key', async () => {
        const nonGameToken = await db.loginNewUser();

        await req.post({
          url: `session/run/${session.id}`,
          status: 403,
          body: { segment: 0, checkpoint: 1, time: 510 },
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
            trackNum: 0
          }
        });

        defaultTesterProperties = (): RunTesterProps => ({
          token,
          gamemode: Gamemode.AHOP,
          trackType: TrackType.MAIN,
          trackNum: 0,
          runDate: Date.now().toString(),
          runFlags: 0,
          mapID: map.id,
          mapName: map.name,
          mapHash: map.hash,
          steamID: user.steamID,
          tickRate: Tickrates.get(map.type),
          startTick: 0,
          playerName: 'Abstract Barry'
        });

        await Promise.all(
          Array.from({ length: 10 }, (_, i) =>
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
                          trackNum: 0,
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
                        trackNum: 0,
                        style: 0,
                        time: i
                      }
                    },
                    flags: [0],
                    replayHash: randomHash(),
                    time: i + 0.005,
                    stats: { create: { overall: { jumps: 1 } } },
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
          data: { zones: ZonesStub as unknown as JsonValue }
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
          zones: [1, 1],
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
        await tester.doZones([1, 1], overrides.delay);

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
              trackNum: 0,
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
              trackNum: 0,
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
              trackNum: 0,
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
              trackNum: 0,
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
              trackNum: 0,
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
              trackNum: 0,
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
              trackNum: 0,
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
              trackNum: 0,
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
          zones: [1]
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
          zones: [0]
        });

        expect(res.statusCode).toBe(200);
      });

      it('should reject if there is no body', async () => {
        const res = await submitWithOverrides({
          beforeSubmit: (self) => (self.replayFile.buffer = Buffer.from(''))
        });

        expect(res.statusCode).toBe(400);
        expect(res.body.code).toBe(RunValidationErrorType.BAD_REPLAY_FILE);
      });

      // Test that permissions checks are getting called
      // Yes, u1 has runs on the map, but we don't actually test for that
      it('should 403 if the user does not have permission to access to the map', async () => {
        await prisma.mMap.update({
          where: { id: map.id },
          data: { status: MapStatusNew.PRIVATE_TESTING }
        });

        const res = await submitRun();
        expect(res.statusCode).toBe(403);

        await prisma.mMap.update({
          where: { id: map.id },
          data: { status: MapStatusNew.APPROVED }
        });
      });

      it('should reject if the run does not have the proper number of timestamps', async () => {
        for (const zones of [
          [0, 1], // Misses first CP of first segment
          [2, 1], // Does an extra CP in first segment
          [0],
          []
        ]) {
          const tester = new RunTester(req, defaultTesterProperties());

          await tester.startRun();
          await tester.doZones(zones);

          const res = await tester.endRun();

          expect(res.statusCode).toBe(400);
          expect(res.body.code).toBe(RunValidationErrorType.BAD_TIMESTAMPS);
        }
      });

      it('should reject if the run misses a start zone', async () => {
        const tester = new RunTester(req, defaultTesterProperties());

        await tester.startRun();
        await tester.doCP();
        await tester.startSegment({ setCP: 1 });

        const res = await tester.endRun();

        expect(res.statusCode).toBe(400);
        expect(res.body.code).toBe(RunValidationErrorType.BAD_TIMESTAMPS);
      });

      const orderedZones = structuredClone(ZonesStub);
      orderedZones.tracks.main.majorOrdered = true;
      const unorderedZones = structuredClone(ZonesStub);
      unorderedZones.tracks.main.majorOrdered = false;

      it('should accept if major checkpoints are out of order and majorOrdered is false', async () => {
        await prisma.mMap.update({
          where: { id: map.id },
          data: { zones: unorderedZones as unknown as JsonValue }
        });

        const tester = new RunTester(req, defaultTesterProperties());

        await tester.startRun({ startSeg: 1 });
        await tester.doCP();
        await tester.startSegment({ setSeg: 0 });
        await tester.doCP();

        const res = await tester.endRun();

        expect(res.statusCode).toBe(200);
      });

      it('should reject if major checkpoints are out of order and majorOrdered is true', async () => {
        await prisma.mMap.update({
          where: { id: map.id },
          data: { zones: orderedZones as unknown as JsonValue }
        });

        const tester = new RunTester(req, defaultTesterProperties());

        await tester.startRun({ startSeg: 1 });
        await tester.doCP();
        await tester.startSegment({ setSeg: 0 });
        await tester.doCP();

        const res = await tester.endRun();

        expect(res.statusCode).toBe(400);
        expect(res.body.code).toBe(RunValidationErrorType.BAD_TIMESTAMPS);
      });

      const requiredZones = structuredClone(ZonesStub);
      orderedZones.tracks.main.minorRequired = true;
      orderedZones.tracks.stages[0].minorRequired = true;
      orderedZones.tracks.bonuses[0].minorRequired = true;
      const unrequiredZones = structuredClone(ZonesStub);
      unrequiredZones.tracks.main.minorRequired = false;
      unrequiredZones.tracks.stages[0].minorRequired = false;
      unrequiredZones.tracks.bonuses[0].minorRequired = false;

      it('should accept if a minor checkpoint is missed and minorRequired is false', async () => {
        await prisma.mMap.update({
          where: { id: map.id },
          data: { zones: unrequiredZones as unknown as JsonValue }
        });

        const tester = new RunTester(req, defaultTesterProperties());

        await tester.startRun();
        await tester.startSegment();
        await tester.doCP();

        const res = await tester.endRun();

        expect(res.statusCode).toBe(200);

        const tester2 = new RunTester(req, {
          ...defaultTesterProperties(),
          trackType: TrackType.STAGE
        });
        await tester2.startRun();
        const res2 = await tester2.endRun();
        expect(res2.statusCode).toBe(200);

        const tester3 = new RunTester(req, {
          ...defaultTesterProperties(),
          trackType: TrackType.BONUS
        });
        await tester3.startRun();
        const res3 = await tester3.endRun();
        expect(res3.statusCode).toBe(200);
      });

      it('should reject if a minor checkpoint is missed and minorRequired is true', async () => {
        await prisma.mMap.update({
          where: { id: map.id },
          data: { zones: requiredZones as unknown as JsonValue }
        });

        const tester = new RunTester(req, defaultTesterProperties());

        await tester.startRun();
        await tester.startSegment();
        await tester.doCP();
        const res = await tester.endRun();

        expect(res.statusCode).toBe(400);
        expect(res.body.code).toBe(RunValidationErrorType.BAD_TIMESTAMPS);

        const tester2 = new RunTester(req, {
          ...defaultTesterProperties(),
          trackType: TrackType.STAGE
        });

        await tester2.startRun();
        const res2 = await tester2.endRun();

        expect(res2.statusCode).toBe(400);
        expect(res2.body.code).toBe(RunValidationErrorType.BAD_TIMESTAMPS);
      });

      it('should reject if the magic of the replay does not match', async () => {
        const res = await submitWithOverrides({
          beforeSave: (self) => (self.replay.magic = 0xbeefcafe)
        });

        expect(res.statusCode).toBe(400);
        expect(res.body.code).toBe(RunValidationErrorType.BAD_META);
      });

      it('should reject if the SteamID in the replay does not match the submitter', async () => {
        const res = await submitWithOverrides({
          props: { steamID: randomSteamID() }
        });

        expect(res.statusCode).toBe(400);
        expect(res.body.code).toBe(RunValidationErrorType.BAD_META);
      });

      it('should reject if the hash of the map stored in the replay does not match the stored hash of the DB map', async () => {
        const res = await submitWithOverrides({
          props: { mapHash: randomHash() }
        });

        expect(res.statusCode).toBe(400);
        expect(res.body.code).toBe(RunValidationErrorType.BAD_META);
      });

      it('should reject if the name of the map does not match the name of the map in the DB', async () => {
        const res = await submitWithOverrides({
          props: { mapName: 'ahop_egg' }
        });

        expect(res.statusCode).toBe(400);
        expect(res.body.code).toBe(RunValidationErrorType.BAD_META);
      });

      it('should reject if the run time in ticks is 0', async () => {
        const res = await submitWithOverrides({
          delay: 0,
          beforeSave: (self) => {
            self.replay.header.startTick = 0;
            self.replay.header.stopTick = 0;
          }
        });

        expect(res.statusCode).toBe(400);
        expect(res.body.code).toBe(RunValidationErrorType.BAD_TIMESTAMPS);
      });

      it('should reject if the run time in ticks is negative', async () => {
        const res = await submitWithOverrides({
          delay: 0,
          beforeSave: (self) => {
            self.replay.header.startTick = 1;
            self.replay.header.stopTick = 0;
          }
        });

        expect(res.statusCode).toBe(400);
        expect(res.body.code).toBe(RunValidationErrorType.BAD_TIMESTAMPS);
      });

      // it("the replays track number doesn't match timestamps", async () => {
      //   const res = await submitWithOverrides({
      //     beforeSave: (self) => {
      //       self.replay.header.trackNum = 1;
      //     }
      //   });
      //
      //   expect(res.statusCode).toBe(400);
      //   expect(res.body.code).toBe(RunValidationErrorType.BAD_META);
      // });
      //
      // it('the replays zone number is invalid for the map', async () => {
      //   const res = await submitWithOverrides({
      //     beforeSave: (self) => {
      //       self.replay.header.zoneNum = 1;
      //     }
      //   });
      //
      //   expect(res.statusCode).toBe(400);
      //   expect(res.body.code).toBe(RunValidationErrorType.BAD_META);
      // });

      it('should reject if the run date is in the future', async () => {
        const res = await submitWithOverrides({
          beforeSave: (self) =>
            (self.replay.header.runDate = (Date.now() + 1000000).toString())
        });

        expect(res.statusCode).toBe(400);
        expect(res.body.code).toBe(RunValidationErrorType.OUT_OF_SYNC);
      });

      it('should reject if the tickrate is not acceptable', async () => {
        const res = await submitWithOverrides({
          beforeSave: (self) =>
            (self.replay.header.tickRate = Tickrates.get(map.type) + 0.001)
        });

        expect(res.statusCode).toBe(400);
        expect(res.body.code).toBe(RunValidationErrorType.OUT_OF_SYNC);
      });

      it('should reject if the run does not fall within the run timestamps', async () => {
        const res = await submitWithOverrides({
          beforeSave: (self) => (self.replay.header.stopTick *= 2)
        });

        expect(res.statusCode).toBe(400);
        expect(res.body.code).toBe(RunValidationErrorType.OUT_OF_SYNC);
      });

      // it('the run does not have stats', async () => {
      //   const res = await submitWithOverrides({ writeStats: false });
      //
      //   expect(res.statusCode).toBe(400);
      //   expect(res.body.code).toBe(RunValidationErrorType.BAD_REPLAY_FILE);
      // });
      //
      // it('the run has no run frames', async () => {
      //   const res = await submitWithOverrides({ writeFrames: false });
      //
      //   expect(res.statusCode).toBe(400);
      //   expect(res.body.code).toBe(RunValidationErrorType.BAD_REPLAY_FILE);
      // });

      it('should reject if should 401 when no access token is provided', () =>
        req.unauthorizedTest('session/run/1/end', 'post'));
    });
  });
});
