import {
  CompletedRunDto,
  RankDto,
  RunDto,
  RunSessionDto,
  RunSessionTimestampDto
} from '@momentum/backend/dto';
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
  MapType,
  RunValidationErrorType,
  Tickrates
} from '@momentum/constants';
import { PrismaClient } from '@prisma/client';
import {
  setupE2ETestEnvironment,
  teardownE2ETestEnvironment
} from './support/environment';

describe('Session', () => {
  let app, prisma: PrismaClient, req: RequestUtil, db: DbUtil, map;

  beforeAll(async () => {
    const env = await setupE2ETestEnvironment();
    app = env.app;
    prisma = env.prisma;
    req = env.req;
    db = env.db;

    // We can use this same map for all the run session testing. Suites just create their own users and runs.
    map = await db.createMap(
      { name: 'bhop_eazy', type: MapType.BHOP },
      {
        trackNum: 0,
        numZones: 4,
        isLinear: false,
        difficulty: 1,
        zones: {
          createMany: {
            data: [
              { zoneNum: 0 },
              { zoneNum: 1 },
              { zoneNum: 2 },
              { zoneNum: 3 },
              { zoneNum: 4 }
            ]
          }
        },
        stats: { create: { baseStats: { create: {} } } }
      }
    );

    await Promise.all(
      map.mainTrack.zones.map(async (zone) => {
        await prisma.mapZone.update({
          where: { id: zone.id },
          data: { stats: { create: { baseStats: { create: {} } } } }
        });
      })
    );

    await prisma.mapZoneTrigger.createMany({
      data: [
        {
          zoneID: map.mainTrack.zones[0].id,
          type: 0,
          pointsZPos: 64,
          pointsHeight: 128,
          points:
            '{"p0": "2720 -1856","p1": "2560 -1856","p2": "2560 -1600","p3": "2720 -1600"}'
        },
        {
          zoneID: map.mainTrack.zones[2].id,
          type: 2,
          pointsZPos: 64,
          pointsHeight: 128,
          points:
            '{"p0": "2528 384","p1": "2720 384","p2": "2720 640","p3": "2528 640"}'
        },
        {
          zoneID: map.mainTrack.zones[3].id,
          type: 2,
          pointsZPos: 6,
          pointsHeight: 128,
          points:
            '{"p0": "-480 -1600","p1": "-288 -1600","p2": "-288 -1856","p3": "-480 -1856"}'
        },
        {
          zoneID: map.mainTrack.zones[4].id,
          type: 2,
          pointsZPos: 64,
          pointsHeight: 128,
          points:
            '{"p0": "2528 -992","p1": "2720 -992","p2": "2720 -736","p3": "2528 -736"}'
        }
      ]
    });

    await prisma.mapZoneTrigger.create({
      data: {
        zoneID: map.mainTrack.zones[1].id,
        properties: {
          create: {
            properties:
              '{ "speed_limit": 350000, "limiting_speed": 1, "start_on_jump": 1, "speed_limit_type": 0 }'
          }
        },
        type: 1,
        pointsZPos: 64,
        pointsHeight: 128,
        points:
          '{"p0": "-224 -480","p1": "-480 -480","p2": "-480 -224","p3": "-224 -224"}'
      }
    });
  });

  afterAll(async () => {
    await db.cleanup('map');
    await teardownE2ETestEnvironment(app);
  });

  describe('session/run', () => {
    describe('POST', () => {
      let user, token;

      beforeAll(
        async () => ([user, token] = await db.createAndLoginGameUser())
      );

      afterAll(() => db.cleanup('user', 'run'));

      it('should return a valid run DTO', async () => {
        const res = await req.post({
          url: 'session/run',
          status: 200,
          token: token,
          body: { mapID: map.id, trackNum: 0, zoneNum: 0 }
        });

        expect(res.body).toBeValidDto(RunSessionDto);
        expect(res.body).toMatchObject({
          trackNum: 0,
          zoneNum: 0,
          userID: user.id
        });
      });

      it('should 400 if not given a proper body', () =>
        req.post({
          url: 'session/run',
          status: 400,
          token: token
        }));

      it('should 400 if the map does not have the provided trackNum', () =>
        req.post({
          url: 'session/run',
          status: 400,
          body: { mapID: map.id, trackNum: 2, zoneNum: 0 },
          token: token
        }));

      it('should 400 for staged runs UNTIL 0.12.0', () =>
        req.post({
          url: 'session/run',
          status: 400,
          body: { mapID: map.id, trackNum: 0, zoneNum: 1 },
          token: token
        }));

      it('should 400 if the map does not exist', () =>
        req.post({
          url: 'session/run',
          status: 400,
          body: { mapID: NULL_ID, trackNum: 0, zoneNum: 0 },
          token: token
        }));

      it('should 401 when no access token is provided', () =>
        req.post({
          url: 'session/run',
          status: 401,
          body: { mapID: map.id, trackNum: 0, zoneNum: 0 }
        }));

      it('should return 403 if not using a game API key', async () => {
        const nonGameToken = await db.loginNewUser();

        await req.post({
          url: 'session/run',
          status: 403,
          body: { mapID: map.id, trackNum: 0, zoneNum: 0 },
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
            trackID: map.mainTrack.id,
            trackNum: 0,
            zoneNum: 0
          }
        });
      });

      afterAll(() => db.cleanup('user', 'run'));

      it('should delete the users run', async () => {
        await req.del({ url: 'session/run', status: 204, token: token });

        expect(await prisma.runSession.findFirst()).toBeNull();
      });

      it('should 400 if the run does not exist', () =>
        // Just repeat last test
        req.del({ url: 'session/run', status: 400, token: token }));

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
            trackID: map.mainTrack.id,
            trackNum: 0,
            zoneNum: 0
          }
        });
      });

      afterAll(() => db.cleanup('user', 'run'));

      it('should update an existing run with the zone and tick', async () => {
        const res = await req.post({
          url: `session/run/${session.id}`,
          status: 200,
          body: { zoneNum: 2, tick: 510 },
          validate: RunSessionTimestampDto,
          token: token
        });

        expect(res.body).toMatchObject({
          sessionID: Number(session.id),
          tick: 510,
          zone: 2
        });
      });

      it('should 403 if not the owner of the run', async () => {
        const u2Token = await db.loginNewGameUser();

        await req.post({
          url: `session/run/${session.id}`,
          status: 403,
          body: { zoneNum: 2, tick: 510 },
          token: u2Token
        });
      });

      it('should 400 if the run does not exist', () =>
        req.post({
          url: `session/run/${NULL_ID}`,
          status: 400,
          body: { zoneNum: 2, tick: 510 },
          token: token
        }));

      it('should 403 if not using a game API key', async () => {
        const nonGameToken = await db.loginNewUser();

        await req.post({
          url: `session/run/${session.id}`,
          status: 403,
          body: { zoneNum: 2, tick: 510 },
          token: nonGameToken
        });
      });

      it('should 401 when no access token is provided', () =>
        req.unauthorizedTest('session/run/1', 'post'));
    });
  });

  // Testing this is HARD. We need a replay that matches our timestamps okay so we're going to be heavily relying on
  // this RunTester class to essentially generate a valid run the API will accept. NOTE: Before anyone gets any clever
  // ideas, this is *not* our anti-cheat. Just because this API will accept some goofy stuff, does not mean the live
  // game will, and trying to use this method on the live API may get you banned!

  // I'm not writing IL tests yet as I'm not completely sure how they're supposed to work and not supported yet ingame.
  // Around 0.12.0 we'll want to write tests for those.
  describe('session/run/:sessionID/end', () => {
    describe('POST', () => {
      let user, token, defaultTesterProperties;

      beforeEach(async () => {
        // Run submission affects so much with ranks and stuff that's it's easiest to just clear and reset
        // all this after each test.
        [user, token] = await db.createAndLoginGameUser();

        await prisma.runSession.create({
          data: {
            userID: user.id,
            trackID: map.mainTrack.id,
            trackNum: 0,
            zoneNum: 0
          }
        });

        defaultTesterProperties = (): RunTesterProps => ({
          token: token,
          zoneNum: 0,
          trackNum: 0,
          runDate: Date.now().toString(),
          runFlags: 0,
          mapID: map.id,
          mapName: map.name,
          mapHash: map.hash,
          steamID: user.steamID,
          tickRate: Tickrates[map.type],
          startTick: 0,
          playerName: 'Abstract Barry'
        });

        await Promise.all(
          Array.from({ length: 10 }, (_, i) =>
            prisma.rank.create({
              data: {
                run: {
                  create: {
                    map: { connect: { id: map.id } },
                    zoneNum: 0,
                    trackNum: 0,
                    flags: 0,
                    ticks: i * 500 + 1,
                    tickRate: 0.005, // Silly tickrate, but lets tester run super fast
                    file: '',
                    hash: randomHash(),
                    time: i + 0.005,
                    overallStats: { create: { jumps: 1 } }
                  }
                },
                gameType: MapType.BHOP,
                user: {
                  create: {
                    alias: `RunSessions Test User ${i + 1}`,
                    steamID: randomSteamID()
                  }
                },
                map: { connect: { id: map.id } },
                rank: i + 1
              },
              include: { run: true, map: true, user: true }
            })
          )
        );
      });

      afterEach(async () => {
        await prisma.run.deleteMany();
        await prisma.user.deleteMany();
        await prisma.mapStats.update({
          where: { mapID: map.id },
          data: { completions: 0, uniqueCompletions: 0 }
        });
        await prisma.mapTrackStats.update({
          where: { trackID: map.mainTrack.id },
          data: { completions: 0, uniqueCompletions: 0 }
        });
        await prisma.mapZoneStats.updateMany({
          where: { zone: { track: { mapID: map.id } } },
          data: { completions: 0, uniqueCompletions: 0 }
        });
      });

      // With the way we're constructed above DB inserts below the existing runs will be 0.01s, 1.01s, 2.01s ... 10.01s,
      // this is ~500ms so will be rank 2.
      const submitRun = (delay?: number) =>
        RunTester.run(req, defaultTesterProperties(), 3, delay);

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
        await tester.doZones(3, overrides.delay);

        const { props: _, ...endRunProps } = overrides;
        return tester.endRun(endRunProps);
      };

      // Splitting these out in multiple tests. It's slower, but there's so much stuff we want to test here that I
      // want to keep it organised well.
      describe('should process a valid run and ', () => {
        it('should respond with a CompletedRunDto', async () => {
          const res = await submitRun();

          expect(res.statusCode).toBe(200);
          expect(res.body).toBeValidDto(CompletedRunDto);
          expect(res.body.rank).toBeValidDto(RankDto);
          expect(res.body.run).toBeValidDto(RunDto);
          expect(res.body.isNewPersonalBest).toBe(true);
          expect(res.body.isNewWorldRecord).toBe(false);
        });

        it('should be inserted in leaderboards, shifting other ranks', async () => {
          const ranksBefore = await prisma.rank.findMany({
            where: {
              mapID: map.id,
              run: { zoneNum: 0, trackNum: 0 },
              gameType: MapType.BHOP,
              flags: 0
            }
          });

          expect(ranksBefore.length).toBe(10);

          await submitRun();

          const ranksAfter = await prisma.rank.findMany({
            where: {
              mapID: map.id,
              run: { zoneNum: 0, trackNum: 0 },
              gameType: MapType.BHOP,
              flags: 0
            }
          });

          expect(ranksAfter.length).toBe(11);
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
          const rankToUpdate = await prisma.rank.findFirst({
            where: { mapID: map.id, rank: 4 },
            include: { run: true }
          });

          await prisma.rank.update({
            where: { runID: rankToUpdate.run.id },
            data: {
              user: { connect: { id: user.id } },
              run: { update: { user: { connect: { id: user.id } } } }
            }
          });

          const ranksBefore = await prisma.rank.findMany({
            where: {
              mapID: map.id,
              run: { zoneNum: 0, trackNum: 0 },
              gameType: MapType.BHOP,
              flags: 0
            }
          });

          expect(ranksBefore.length).toBe(10);

          const res = await submitRun();

          expect(res.statusCode).toBe(200);
          expect(res.body).toBeValidDto(CompletedRunDto);
          expect(res.body.isNewPersonalBest).toBe(true);

          const ranksAfter = await prisma.rank.findMany({
            where: {
              mapID: map.id,
              run: { zoneNum: 0, trackNum: 0 },
              gameType: MapType.BHOP,
              flags: 0
            }
          });

          // It should have *updated* our existing rank, so this should still be 10
          expect(ranksAfter.length).toBe(10);

          // So, it should have shifted rank 2, 3 to rank 3, 4, our rank (4) now becoming 2.
          // prettier-ignore
          expect(ranksBefore.find((rank) => rank.rank === 2).userID).toBe(
                            ranksAfter.find((rank) => rank.rank === 3).userID);

          // prettier-ignore
          expect(ranksBefore.find((rank) => rank.rank === 3).userID).toBe(
                            ranksAfter.find((rank) => rank.rank === 4).userID);

          // prettier-ignore
          expect(ranksBefore.find((rank) => rank.rank === 4).userID).toBe(
                            ranksAfter.find((rank) => rank.rank === 2).userID);

          expect(ranksBefore.find((rank) => rank.rank == 4).userID).toBe(
            user.id
          );
        });

        it('should not change ranks or assign rank XP if not a PB', async () => {
          // Update whatever rank + run is rank 1 to belong to user1
          const rankToUpdate = await prisma.rank.findFirst({
            where: { mapID: map.id, rank: 1 },
            include: { run: true }
          });

          await prisma.rank.update({
            where: { runID: rankToUpdate.run.id },
            data: {
              user: { connect: { id: user.id } },
              run: { update: { user: { connect: { id: user.id } } } }
            }
          });

          const ranksBefore = await prisma.rank.findMany({
            where: {
              mapID: map.id,
              run: { zoneNum: 0, trackNum: 0 },
              gameType: MapType.BHOP,
              flags: 0
            }
          });

          expect(ranksBefore.length).toBe(10);

          const res = await submitRun();

          expect(res.statusCode).toBe(200);
          expect(res.body).toBeValidDto(CompletedRunDto);
          expect(res.body.isNewPersonalBest).toBe(false);
          expect(res.body.xp.rankXP).toBe(0);

          const ranksAfter = await prisma.rank.findMany({
            where: {
              mapID: map.id,
              run: { zoneNum: 0, trackNum: 0 },
              gameType: MapType.BHOP,
              flags: 0
            }
          });

          expect(ranksBefore).toEqual(ranksAfter);
        });

        it('should assign cosmetic and rank XP for the run', async () => {
          const res = await submitRun();

          expect(res.statusCode).toBe(200);
          expect(res.body).toMatchObject({
            rank: { rank: 2 },
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

          // Our stats tracking on the old API is very weird, so I'm just checking completions for now.
          // None of the runs we added to the DB at the start of this test actually added stats, so we can
          // just check that completions are 1.
          const mapStats = await prisma.mapStats.findUnique({
            where: { mapID: map.id }
          });
          expect(mapStats.completions).toBe(2);
          expect(mapStats.uniqueCompletions).toBe(1);

          const trackStats = await prisma.mapTrackStats.findUnique({
            where: { trackID: map.mainTrack.id }
          });
          expect(trackStats.completions).toBe(2);
          expect(trackStats.uniqueCompletions).toBe(1);

          const zoneStats = await prisma.mapZoneStats.findMany({
            where: { zone: { track: { mapID: map.id } } },
            include: { zone: true }
          });

          for (const zone of zoneStats.filter((zs) => zs.zone.zoneNum !== 0)) {
            expect(zone.completions).toBe(2);
            expect(zone.uniqueCompletions).toBe(1);
          }
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
          await prisma.rank.deleteMany();
          await prisma.run.deleteMany();
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

      describe('should reject if ', () => {
        it('there is no body', async () => {
          const res = await submitWithOverrides({
            beforeSubmit: (self) => (self.replayFile.buffer = Buffer.from(''))
          });

          expect(res.statusCode).toBe(400);
          expect(res.body.code).toBe(RunValidationErrorType.BAD_REPLAY_FILE);
        });

        it('the run does not have the proper number of timestamps', async () => {
          for (const numZones of [2, 4]) {
            const tester = new RunTester(req, defaultTesterProperties());

            await tester.startRun();
            await tester.doZones(numZones);

            const res = await tester.endRun();

            expect(res.statusCode).toBe(400);
            expect(res.body.code).toBe(RunValidationErrorType.BAD_TIMESTAMPS);
          }
        });

        it('the run was done out of order', async () => {
          const tester = new RunTester(req, defaultTesterProperties());

          await tester.startRun();

          await tester.doZone();
          tester.currZone += 1;
          await tester.doZone();
          tester.currZone -= 2;
          await tester.doZone();
          const res = await tester.endRun();

          expect(res.statusCode).toBe(400);
          expect(res.body.code).toBe(RunValidationErrorType.BAD_TIMESTAMPS);
        });

        it('there was no timestamps for a track with >1 zones', async () => {
          const tester = new RunTester(req, defaultTesterProperties());

          await tester.startRun();
          const res = await tester.endRun();

          expect(res.statusCode).toBe(400);
          expect(res.body.code).toBe(RunValidationErrorType.BAD_TIMESTAMPS);
        });

        it('the magic of the replay does not match', async () => {
          const res = await submitWithOverrides({
            beforeSave: (self) => (self.replay.magic = 0xbeefcafe)
          });

          expect(res.statusCode).toBe(400);
          expect(res.body.code).toBe(RunValidationErrorType.BAD_META);
        });

        it('the SteamID in the replay does not match the submitter', async () => {
          const res = await submitWithOverrides({
            props: { steamID: randomSteamID() }
          });

          expect(res.statusCode).toBe(400);
          expect(res.body.code).toBe(RunValidationErrorType.BAD_META);
        });

        it('the hash of the map stored in the replay does not match the stored hash of the DB map', async () => {
          const res = await submitWithOverrides({
            props: { mapHash: randomHash() }
          });

          expect(res.statusCode).toBe(400);
          expect(res.body.code).toBe(RunValidationErrorType.BAD_META);
        });

        it('the name of the map does not match the name of the map in the DB', async () => {
          const res = await submitWithOverrides({
            props: { mapName: 'bhop_egg' }
          });

          expect(res.statusCode).toBe(400);
          expect(res.body.code).toBe(RunValidationErrorType.BAD_META);
        });

        it('the run time in ticks is 0', async () => {
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

        it('the run time in ticks is negative', async () => {
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

        it('the replays track number is invalid for the map', async () => {
          const res = await submitWithOverrides({
            beforeSave: (self) => {
              self.replay.header.trackNum = 1;
            }
          });

          expect(res.statusCode).toBe(400);
          expect(res.body.code).toBe(RunValidationErrorType.BAD_META);
        });

        it('the replays zone number is invalid for the map', async () => {
          const res = await submitWithOverrides({
            beforeSave: (self) => {
              self.replay.header.zoneNum = 1;
            }
          });

          expect(res.statusCode).toBe(400);
          expect(res.body.code).toBe(RunValidationErrorType.BAD_META);
        });

        it('the run date is in the future', async () => {
          const res = await submitWithOverrides({
            beforeSave: (self) =>
              (self.replay.header.runDate = (Date.now() + 1000000).toString())
          });

          expect(res.statusCode).toBe(400);
          expect(res.body.code).toBe(RunValidationErrorType.OUT_OF_SYNC);
        });

        it('the tickrate is not acceptable', async () => {
          const res = await submitWithOverrides({
            beforeSave: (self) =>
              (self.replay.header.tickRate = Tickrates[map.type] + 0.001)
          });

          expect(res.statusCode).toBe(400);
          expect(res.body.code).toBe(RunValidationErrorType.OUT_OF_SYNC);
        });

        it('the run does not fall within the run run timestamps', async () => {
          const res = await submitWithOverrides({
            beforeSave: (self) => (self.replay.header.stopTick *= 2)
          });

          expect(res.statusCode).toBe(400);
          expect(res.body.code).toBe(RunValidationErrorType.OUT_OF_SYNC);
        });

        it('the run does not have stats', async () => {
          const res = await submitWithOverrides({ writeStats: false });

          expect(res.statusCode).toBe(400);
          expect(res.body.code).toBe(RunValidationErrorType.BAD_REPLAY_FILE);
        });

        it('the run has no run frames', async () => {
          const res = await submitWithOverrides({ writeFrames: false });

          expect(res.statusCode).toBe(400);
          expect(res.body.code).toBe(RunValidationErrorType.BAD_REPLAY_FILE);
        });

        it('should 401 when no access token is provided', () =>
          req.unauthorizedTest('session/run/1/end', 'post'));
      });
    });
  });
});
