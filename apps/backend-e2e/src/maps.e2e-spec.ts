// noinspection DuplicatedCode

import { Config } from '../../backend/src/app/config';
import { MapDto } from '../../backend/src/app/dto';
import { MAPLIST_UPDATE_JOB_NAME } from '../../backend/src/app/modules/maps/map-list.service';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  ActivityType,
  Ban,
  MapStatuses,
  Gamemode,
  MapCreditType,
  MapStatus,
  MapSubmissionDate,
  MapSubmissionType,
  MapTestInviteState,
  MIN_PUBLIC_TESTING_DURATION,
  NotificationType,
  Role,
  TrackType,
  LeaderboardType,
  FlatMapList,
  GamemodeCategory,
  MAX_OPEN_MAP_SUBMISSIONS,
  MapTag,
  MapSortType,
  runPath,
  bspPath,
  vmfsPath,
  imgSmallPath,
  imgMediumPath,
  imgLargePath,
  imgXlPath,
  MAX_MAPPER_OPEN_MAP_SUBMISSIONS
} from '@momentum/constants';
import {
  createSha1Hash,
  DbUtil,
  FILES_PATH,
  FileStoreUtil,
  mockDiscordService,
  NULL_ID,
  RequestUtil,
  resetKillswitches
} from '@momentum/test-utils';
import { MapVersion, MMap, Prisma, PrismaClient, User } from '@momentum/db';
import Zip from 'adm-zip';
import * as Enum from '@momentum/enum';
import {
  generateRandomMapZones,
  ZonesStub,
  ZonesStubLeaderboards,
  ZonesStubString,
  ZoneStubCompatGamemodes
} from '@momentum/formats/zone';
import { arrayFrom } from '@momentum/util-fn';
import {
  setupE2ETestEnvironment,
  teardownE2ETestEnvironment
} from './support/environment';
import * as rxjs from 'rxjs';
import { SchedulerRegistry } from '@nestjs/schedule';
import { Routes } from 'discord.js';
import { DbService } from '../../../apps/backend/src/app/modules/database/db.service';
import { EXTENDED_PRISMA_SERVICE } from '../../../apps/backend/src/app/modules/database/db.constants';

describe('Maps', () => {
  let app,
    prisma: PrismaClient,
    req: RequestUtil,
    db: DbUtil,
    fileStore: FileStoreUtil,
    checkScheduledMapListUpdates: () => Promise<void>;

  beforeAll(async () => {
    const env = await setupE2ETestEnvironment();
    app = env.app;
    prisma = env.prisma;
    req = env.req;
    db = env.db;
    fileStore = env.fileStore;
    const registry = env.app.get(SchedulerRegistry);
    checkScheduledMapListUpdates = registry.getCronJob(
      MAPLIST_UPDATE_JOB_NAME
    ).fireOnTick;
  });

  afterAll(() => teardownE2ETestEnvironment(app, prisma));

  async function uploadBspToPreSignedUrl(bspBuffer: Buffer, token: string) {
    const preSignedUrlRes = await req.get({
      url: 'maps/getMapUploadUrl',
      query: {
        fileSize: bspBuffer.length
      },
      status: 200,
      token
    });

    await fileStore.putToPreSignedUrl(preSignedUrlRes.body.url, bspBuffer);
  }

  describe('maps', () => {
    describe('GET', () => {
      let u1: User,
        u1Token: string,
        u2: User,
        mEarth,
        mWater,
        mAir,
        mBeansOnToast,
        // mPrivate,
        // mDisabled,
        // mFinal,
        // mContent,
        // mPubTest,
        imageID: string;

      beforeEach(async () => {
        imageID = db.uuid(); // Gonna use this for *every* image

        [[u1, u1Token], [u2]] = await Promise.all([
          db.createAndLoginUser(),
          db.createAndLoginUser()
        ]);

        [
          mEarth,
          mWater,
          mAir,
          mBeansOnToast
          // mPrivate,
          // mDisabled,
          // mFinal,
          // mContent,
          // mPubTest
        ] = await Promise.all([
          db.createMap({
            name: 'earth',
            status: MapStatus.APPROVED,
            credits: { create: { type: 0, userID: u1.id } },
            images: [imageID]
          }),
          db.createMap({
            name: 'water',
            status: MapStatus.APPROVED,
            credits: { create: { type: 0, userID: u1.id } },
            images: [imageID]
          }),
          db.createMap({
            name: 'air',
            status: MapStatus.APPROVED,
            credits: { create: { type: 0, userID: u1.id } },
            images: [imageID]
          }),
          db.createMap({
            name: 'beans_on_toast',
            status: MapStatus.APPROVED,
            credits: { create: { type: 0, userID: u1.id } },
            images: [imageID]
          }),
          db.createMap({
            status: MapStatus.PRIVATE_TESTING,
            images: [imageID]
          }),
          db.createMap({
            images: [imageID],
            status: MapStatus.DISABLED
          }),
          db.createMap({
            status: MapStatus.FINAL_APPROVAL,
            images: [imageID]
          }),
          db.createMap({
            status: MapStatus.CONTENT_APPROVAL,
            images: [imageID]
          }),
          db.createMap({
            status: MapStatus.PUBLIC_TESTING,
            images: [imageID]
          })
        ]);
      });

      afterEach(() => db.cleanup('leaderboardRun', 'pastRun', 'user', 'mMap'));

      it('should respond with map data', async () => {
        const res = await req.get({
          url: 'maps',
          status: 200,
          validatePaged: { type: MapDto },
          token: u1Token
        });

        for (const item of res.body.data) {
          for (const prop of [
            'id',
            'name',
            'status',
            'submitterID',
            'createdAt',
            'updatedAt'
          ]) {
            const match = {
              small: expect.stringContaining(`${imageID}-small.jpg`),
              medium: expect.stringContaining(`${imageID}-medium.jpg`),
              large: expect.stringContaining(`${imageID}-large.jpg`),
              xl: expect.stringContaining(`${imageID}-xl.jpg`)
            };
            expect(item).toHaveProperty(prop);
            expect(item.images).toMatchObject([match]);
            expect(item.thumbnail).toMatchObject(match);
          }
          expect(item).not.toHaveProperty('zones');
        }
      });

      it('should only include APPROVED maps', async () => {
        const res = await req.get({
          url: 'maps',
          status: 200,
          validatePaged: { type: MapDto, count: 4 },
          token: u1Token
        });

        for (const item of res.body.data) {
          expect(item.status).toBe(MapStatus.APPROVED);
        }
      });

      it('should be ordered by date', () =>
        req.sortByDateTest({ url: 'maps', validate: MapDto, token: u1Token }));

      it('should respond with filtered map data using the take parameter', () =>
        req.takeTest({ url: 'maps', validate: MapDto, token: u1Token }));

      it('should respond with filtered map data using the skip parameter', () =>
        req.skipTest({ url: 'maps', validate: MapDto, token: u1Token }));

      it('should respond with filtered map data using the search parameter', async () => {
        mWater = await prisma.mMap.update({
          where: { id: mWater.id },
          data: { name: 'aaaaa' }
        });

        await req.searchTest({
          url: 'maps',
          token: u1Token,
          searchMethod: 'contains',
          searchString: 'aa',
          searchPropertyName: 'name',
          validate: { type: MapDto, count: 1 }
        });
      });

      it('should respond with filtered map data using the searchStartsWith parameter', async () => {
        mEarth = await prisma.mMap.update({
          where: { id: mEarth.id },
          data: { name: 'surf_bbbbb' }
        });

        await req.searchTest({
          url: 'maps',
          token: u1Token,
          searchMethod: 'startsWith',
          searchString: 'surf_bb',
          searchPropertyName: 'name',
          searchQueryName: 'searchStartsWith',
          validate: { type: MapDto, count: 1 }
        });
      });

      it('should respond with filtered map data using the submitter id parameter', async () => {
        await prisma.mMap.update({
          where: { id: mWater.id },
          data: { submitterID: u1.id }
        });

        const res = await req.get({
          url: 'maps',
          status: 200,
          query: { submitterID: u1.id },
          validatePaged: { type: MapDto, count: 1 },
          token: u1Token
        });

        expect(res.body.data[0]).toMatchObject({
          submitterID: u1.id,
          id: mWater.id
        });
      });

      it('should respond with filtered map data based on the creditID parameter', async () => {
        const newUser = await db.createUser();

        const newCredit = await prisma.mapCredit.update({
          where: {
            mapID_userID: { mapID: mEarth.id, userID: u1.id },
            type: MapCreditType.AUTHOR
          },
          data: { user: { connect: newUser } }
        });

        const res = await req.get({
          url: 'maps',
          status: 200,
          query: {
            creditID: newUser.id,
            creditType: MapCreditType.AUTHOR,
            expand: 'credits'
          },
          validatePaged: { type: MapDto, count: 1 },
          token: u1Token
        });

        expect(res.body.data[0]).toMatchObject({
          id: mEarth.id,
          credits: [newCredit]
        });

        await prisma.user.delete({ where: { id: newUser.id } });
      });

      it('should 400 if creditID or creditType parameter is used but not the other', async () => {
        await req.get({
          url: 'maps',
          status: 400,
          query: {
            creditID: u1.id
          },
          token: u1Token
        });

        await req.get({
          url: 'maps',
          status: 400,
          query: {
            creditType: MapCreditType.AUTHOR
          },
          token: u1Token
        });
      });

      it('should respond with filtered map data based on the supported gamemodes', async () => {
        const gamemode = Gamemode.BHOP;
        const map = await db.createMap({
          leaderboards: {
            create: {
              gamemode,
              trackType: TrackType.MAIN,
              trackNum: 1,
              style: 0,
              type: LeaderboardType.RANKED
            }
          }
        });

        // Create a map with a hidden leaderboard in the one we're searching
        // to test we don't receive it
        await db.createMap({
          leaderboards: {
            createMany: {
              data: [
                {
                  gamemode,
                  trackType: TrackType.MAIN,
                  trackNum: 1,
                  style: 0,
                  type: LeaderboardType.HIDDEN
                },
                {
                  gamemode: Gamemode.RJ,
                  trackType: TrackType.MAIN,
                  trackNum: 1,
                  style: 0,
                  type: LeaderboardType.RANKED
                }
              ]
            }
          }
        });

        await req.get({
          url: 'maps',
          status: 200,
          query: { gamemode: gamemode },
          validatePaged: { type: MapDto, count: 1 },
          token: u1Token
        });

        await prisma.mMap.delete({ where: { id: map.id } });
      });

      it('should respond with expanded submitter data using the currentVersion expand parameter', () =>
        req.expandTest({
          url: 'maps',
          expand: 'currentVersion',
          paged: true,
          validate: MapDto,
          token: u1Token
        }));

      it('should respond with expanded submitter data using the currentVersionWithZones expand parameter', () =>
        req.expandTest({
          url: 'maps',
          expand: 'currentVersionWithZones',
          paged: true,
          validate: MapDto,
          expectedPropertyName: 'currentVersion.zones',
          token: u1Token
        }));

      it('should respond with expanded submitter data using the versions expand parameter', () =>
        req.expandTest({
          url: 'maps',
          expand: 'versions',
          // Nested submitter should be included with versions.
          expectedPropertyName: 'versions[0].submitter',
          paged: true,
          validate: MapDto,
          token: u1Token
        }));

      it('should respond with expanded submitter data using the versionsWithZones expand parameter', () =>
        req.expandTest({
          url: 'maps',
          expand: 'versionsWithZones',
          expectedPropertyName: 'versions[0].zones',
          paged: true,
          validate: MapDto,
          token: u1Token
        }));

      it('should respond with expanded submitter data using the leaderboards expand parameter', () =>
        req.expandTest({
          url: 'maps',
          expand: 'leaderboards',
          paged: true,
          validate: MapDto,
          token: u1Token
        }));

      it('should respond with expanded map data using the credits expand parameter', async () => {
        await prisma.mapCredit.createMany({
          data: [
            { mapID: mEarth.id, userID: u2.id, type: MapCreditType.AUTHOR },
            { mapID: mWater.id, userID: u2.id, type: MapCreditType.AUTHOR },
            { mapID: mAir.id, userID: u2.id, type: MapCreditType.AUTHOR },
            {
              mapID: mBeansOnToast.id,
              userID: u2.id,
              type: MapCreditType.AUTHOR
            }
          ]
        });

        await req.expandTest({
          url: 'maps',
          expand: 'credits',
          expectedPropertyName: 'credits[0].user', // This should always include user as well
          paged: true,
          validate: MapDto,
          token: u1Token
        });
      });

      it('should respond with expanded submitter data using the submitter expand parameter', async () => {
        await prisma.mMap.updateMany({ data: { submitterID: u2.id } });

        await req.expandTest({
          url: 'maps',
          expand: 'submitter',
          paged: true,
          validate: MapDto,
          token: u1Token
        });
      });

      it('should respond with expanded map data using the stats expand parameter', () =>
        req.expandTest({
          url: 'maps',
          expand: 'stats',
          paged: true,
          validate: MapDto,
          token: u1Token
        }));

      it('should respond with expanded map data using the info expand parameter', () =>
        req.expandTest({
          url: 'maps',
          expand: 'info',
          paged: true,
          validate: MapDto,
          token: u1Token
        }));

      it("should respond with expanded map data if the map is in the logged in user's favorites when using the inFavorites expansion", async () => {
        await prisma.mapFavorite.create({
          data: { userID: u1.id, mapID: mEarth.id }
        });

        await req.expandTest({
          url: 'maps',
          expand: 'inFavorites',
          paged: true,
          validate: MapDto,
          expectedPropertyName: 'favorites',
          token: u1Token,
          some: true
        });
      });

      it("should respond with the map's WR when using the worldRecord expansion", async () => {
        await db.createLbRun({ map: mEarth, user: u2, time: 5, rank: 1 });

        const res = await req.get({
          url: 'maps',
          status: 200,
          validatePaged: MapDto,
          query: { expand: 'worldRecord' },
          token: u1Token
        });

        const map = res.body.data.find((map) => map.id === mEarth.id);
        expect(map).toMatchObject({
          worldRecords: [
            { rank: 1, gamemode: Gamemode.AHOP, user: { id: u2.id } }
          ]
        });
      });

      it("should respond with the logged in user's PB when using the personalBest expansion", async () => {
        await db.createLbRun({ map: mEarth, user: u2, time: 5, rank: 1 });
        await db.createLbRun({ map: mEarth, user: u1, time: 10, rank: 2 });

        const res = await req.get({
          url: 'maps',
          status: 200,
          validatePaged: MapDto,
          query: { expand: 'personalBest' },
          token: u1Token
        });

        const map = res.body.data.find((map) => map.id === mEarth.id);
        expect(map).toMatchObject({
          personalBests: [{ rank: 2, user: { id: u1.id } }]
        });
      });

      it('should respond properly with both personalBest and worldRecord expansions', async () => {
        await db.createLbRun({ map: mEarth, user: u2, time: 5, rank: 1 });
        await db.createLbRun({ map: mEarth, user: u1, time: 10, rank: 2 });

        const res = await req.get({
          url: 'maps',
          status: 200,
          validatePaged: MapDto,
          query: { expand: 'worldRecord,personalBest' },
          token: u1Token
        });

        const map = res.body.data.find((map) => map.id === mEarth.id);
        expect(map).toMatchObject({
          worldRecords: [{ rank: 1, user: { id: u2.id } }],
          personalBests: [{ rank: 2, user: { id: u1.id } }]
        });
      });

      it('should respond with filtered maps when using the difficultyLow filter', async () => {
        await Promise.all([
          prisma.leaderboard.updateMany({
            where: { mapID: mEarth.id },
            data: { tier: 1 }
          }),
          prisma.leaderboard.updateMany({
            where: { mapID: mWater.id },
            data: { tier: 3 }
          }),
          prisma.leaderboard.updateMany({
            where: { mapID: mAir.id },
            data: { tier: 3 }
          }),
          prisma.leaderboard.updateMany({
            where: { mapID: mBeansOnToast.id },
            data: { tier: 5 }
          })
        ]);

        await req.get({
          url: 'maps',
          status: 200,
          query: { difficultyLow: 2 },
          token: u1Token,
          validatePaged: { type: MapDto, count: 3 }
        });
      });

      it('should respond with filtered maps when using the difficultyHigh filter', async () => {
        await Promise.all([
          prisma.leaderboard.updateMany({
            where: { mapID: mEarth.id },
            data: { tier: 1 }
          }),
          prisma.leaderboard.updateMany({
            where: { mapID: mWater.id },
            data: { tier: 3 }
          }),
          prisma.leaderboard.updateMany({
            where: { mapID: mAir.id },
            data: { tier: 3 }
          }),
          prisma.leaderboard.updateMany({
            where: { mapID: mBeansOnToast.id },
            data: { tier: 5 }
          })
        ]);

        await req.get({
          url: 'maps',
          status: 200,
          query: { difficultyHigh: 4 },
          token: u1Token,
          validatePaged: { type: MapDto, count: 3 }
        });
      });

      it('should respond with filtered maps when using both the difficultyLow and difficultyHigh filter', async () => {
        await Promise.all([
          prisma.leaderboard.updateMany({
            where: { mapID: mEarth.id },
            data: { tier: 1 }
          }),
          prisma.leaderboard.updateMany({
            where: { mapID: mWater.id },
            data: { tier: 3 }
          }),
          prisma.leaderboard.updateMany({
            where: { mapID: mAir.id },
            data: { tier: 3 }
          }),
          prisma.leaderboard.updateMany({
            where: { mapID: mBeansOnToast.id },
            data: { tier: 5 }
          })
        ]);
        await req.get({
          url: 'maps',
          status: 200,
          query: { difficultyLow: 2, difficultyHigh: 4 },
          token: u1Token,
          validatePaged: { type: MapDto, count: 2 }
        });
      });

      it('should respond with filtered maps when using the linear filter', async () => {
        await Promise.all([
          prisma.leaderboard.updateMany({
            where: { mapID: mEarth.id },
            data: { linear: false }
          }),
          prisma.leaderboard.updateMany({
            where: { mapID: mWater.id },
            data: { linear: false }
          })
        ]);

        const res = await req.get({
          url: 'maps',
          status: 200,
          query: { linear: false, expand: 'leaderboards' },
          validatePaged: { type: MapDto, count: 2 },
          token: u1Token
        });

        for (const r of res.body.data)
          for (const l of r.leaderboards) expect(l.linear).toBe(false);

        const res2 = await req.get({
          url: 'maps',
          status: 200,
          query: { linear: true, expand: 'leaderboards' },
          validatePaged: { type: MapDto, count: 2 },
          token: u1Token
        });

        for (const r of res2.body.data)
          for (const l of r.leaderboards) expect(l.linear).toBe(true);
      });

      it('should respond with filtered maps when using both the difficultyLow, difficultyHigh and linear filters', async () => {
        await Promise.all([
          prisma.leaderboard.updateMany({
            where: { mapID: mEarth.id },
            data: { tier: 1 }
          }),
          prisma.leaderboard.updateMany({
            where: { mapID: mWater.id },
            data: { tier: 3 }
          }),
          prisma.leaderboard.updateMany({
            where: { mapID: mAir.id },
            data: { tier: 3 }
          }),
          prisma.leaderboard.updateMany({
            where: { mapID: mBeansOnToast.id },
            data: { tier: 5 }
          })
        ]);

        await Promise.all([
          prisma.leaderboard.updateMany({
            where: { mapID: mEarth.id },
            data: { linear: false }
          }),
          prisma.leaderboard.updateMany({
            where: { mapID: mWater.id },
            data: { linear: false }
          })
        ]);

        const res = await req.get({
          url: 'maps',
          status: 200,
          query: { difficultyLow: 2, difficultyHigh: 4, linear: false },
          token: u1Token
        });

        expect(res.body.totalCount).toBe(1);
        expect(res.body.returnCount).toBe(1);
      });

      it('should respond with maps with a PB when using the PB filter', async () => {
        await prisma.leaderboard.create({
          data: {
            mapID: mEarth.id,
            gamemode: Gamemode.RJ,
            type: LeaderboardType.RANKED,
            trackType: TrackType.MAIN,
            trackNum: 1,
            style: 0,
            runs: { create: { userID: u1.id, rank: 1, time: 1, splits: {} } }
          }
        });

        await prisma.leaderboard.create({
          data: {
            mapID: mWater.id,
            gamemode: Gamemode.SJ,
            type: LeaderboardType.RANKED,
            trackType: TrackType.MAIN,
            trackNum: 1,
            style: 0,
            runs: { create: { userID: u1.id, rank: 1, time: 1, splits: {} } }
          }
        });

        const res = await req.get({
          url: 'maps',
          status: 200,
          query: { PB: true },
          validatePaged: { type: MapDto, count: 2 },
          token: u1Token
        });

        expect(res.body.data.map(({ id }) => id)).toMatchObject(
          expect.arrayContaining([mEarth.id, mWater.id])
        );

        const res2 = await req.get({
          url: 'maps',
          status: 200,
          query: { PB: false },
          validatePaged: { type: MapDto, count: 2 },
          token: u1Token
        });

        expect(res2.body.data.map(({ id }) => id)).toMatchObject(
          expect.arrayContaining([mAir.id, mBeansOnToast.id])
        );
      });

      it('should respond with maps with a PB on a specific gamemode when given a gamemode and the PB filter', async () => {
        await prisma.leaderboard.create({
          data: {
            mapID: mEarth.id,
            gamemode: Gamemode.RJ,
            type: LeaderboardType.RANKED,
            trackType: TrackType.MAIN,
            trackNum: 1,
            style: 0,
            runs: { create: { userID: u1.id, rank: 1, time: 1, splits: {} } }
          }
        });

        await prisma.leaderboard.create({
          data: {
            mapID: mWater.id,
            gamemode: Gamemode.SJ,
            type: LeaderboardType.RANKED,
            trackType: TrackType.MAIN,
            trackNum: 1,
            style: 0,
            runs: { create: { userID: u1.id, rank: 1, time: 1, splits: {} } }
          }
        });

        const res = await req.get({
          url: 'maps',
          status: 200,
          query: { PB: true, gamemode: Gamemode.RJ },
          validatePaged: { type: MapDto, count: 1 },
          token: u1Token
        });

        expect(res.body.data[0].id).toBe(mEarth.id);
      });

      it('should respond with favorited maps when using the favorites filter', async () => {
        await prisma.mapFavorite.create({
          data: { userID: u1.id, mapID: mEarth.id }
        });

        const res = await req.get({
          url: 'maps',
          status: 200,
          query: { favorite: true },
          validatePaged: { type: MapDto, count: 1 },
          token: u1Token
        });

        expect(res.body.data[0].id).toBe(mEarth.id);

        await req.get({
          url: 'maps',
          status: 200,
          query: { favorite: false },
          validatePaged: { type: MapDto, count: 3 },
          token: u1Token
        });
      });

      it('should respond with unranked maps when using the leaderboardType filter', async () => {
        await prisma.leaderboard.create({
          data: {
            mapID: mBeansOnToast.id,
            gamemode: Gamemode.DEFRAG_VQ3,
            type: LeaderboardType.UNRANKED,
            trackType: TrackType.MAIN,
            trackNum: 1,
            style: 0
          }
        });

        await req.get({
          url: 'maps',
          status: 200,
          query: {
            gamemode: Gamemode.DEFRAG_VQ3,
            leaderboardType: LeaderboardType.UNRANKED
          },
          validatePaged: { type: MapDto, count: 1 },
          token: u1Token
        });
      });

      it('should respond with maps based on tagsWithQualifiers filter', async () => {
        const upsertLb = async (mapID: number) => {
          await prisma.leaderboard.upsert({
            where: {
              mapID_gamemode_trackType_trackNum_style: {
                mapID: mapID,
                gamemode: Gamemode.AHOP,
                trackType: TrackType.MAIN,
                trackNum: 1,
                style: 0
              }
            },
            update: {
              tags: [] // Has to exist or query will fail.
            },
            create: {
              mapID: mapID,
              gamemode: Gamemode.AHOP,
              type: LeaderboardType.RANKED,
              trackType: TrackType.MAIN,
              trackNum: 1,
              style: 0,
              tags: [] // Has to exist or query will fail.
            }
          });
        };

        await Promise.all([
          upsertLb(mEarth.id),
          upsertLb(mWater.id),
          upsertLb(mAir.id),
          upsertLb(mBeansOnToast.id)
        ]);

        await prisma.leaderboard.updateMany({
          where: {
            mapID: mEarth.id,
            gamemode: Gamemode.AHOP
          },
          data: {
            tags: [MapTag.HL2, MapTag.Speed_Control, MapTag.Bhop]
          }
        });

        // Should ignore tagsWithQualifiers if array exists but is empty.
        await req.get({
          url: 'maps',
          status: 200,
          query: {
            gamemode: Gamemode.AHOP,
            tagsWithQualifiers: []
          },
          validatePaged: { type: MapDto, count: 4 },
          token: u1Token
        });

        // Only include maps with at least one of the given tags.
        await req.get({
          url: 'maps',
          status: 200,
          query: {
            gamemode: Gamemode.AHOP,
            tagsWithQualifiers: [
              MapTag.Air_Jump.toString() + ';1',
              MapTag.HL2.toString() + ';1',
              MapTag.Surf.toString() + ';1'
            ]
          },
          validatePaged: { type: MapDto, count: 1 },
          token: u1Token
        });

        // Get all Ahop maps without HL2 tag.
        await req.get({
          url: 'maps',
          status: 200,
          query: {
            gamemode: Gamemode.AHOP,
            tagsWithQualifiers: [MapTag.HL2.toString() + ';0']
          },
          validatePaged: { type: MapDto, count: 3 },
          token: u1Token
        });
      });

      it('should 400 if tags filter is used without a gamemode', async () => {
        await req.get({
          url: 'maps',
          status: 400,
          query: {
            tagsWithQualifiers: [MapTag.HL2.toString() + ';1']
          },
          token: u1Token
        });
      });

      it('should respond with maps in reverse alphabetical order when in sortType query', async () => {
        const res = await req.get({
          url: 'maps',
          status: 200,
          query: { sortType: MapSortType.ALPHABETICAL_REVERSE },
          validatePaged: { type: MapDto, count: 4 },
          token: u1Token
        });

        expect(res.body.data[0].name).toBe(mWater.name);
        expect(res.body.data[1].name).toBe(mEarth.name);
        expect(res.body.data[2].name).toBe(mBeansOnToast.name);
        expect(res.body.data[3].name).toBe(mAir.name);
      });
    });

    describe('POST', () => {
      let user: User,
        token: string,
        createMapObject,
        u2: User,
        u3: User,
        bspBuffer: Buffer,
        nozipBspBuffer: Buffer,
        bspHash: string,
        vmfBuffer: Buffer,
        vmfHash: string,
        mapperToken: string,
        adminToken: string;

      const zones = structuredClone(ZonesStub);

      beforeAll(async () => {
        [user, token] = await db.createAndLoginUser();
        [u2, u3] = await db.createUsers(2);
        mapperToken = await db.loginNewUser({
          data: { roles: Role.MAPPER }
        });
        adminToken = await db.loginNewUser({
          data: { roles: Role.ADMIN }
        });

        bspBuffer = readFileSync(path.join(FILES_PATH, 'map.bsp'));
        bspHash = createSha1Hash(bspBuffer);

        nozipBspBuffer = readFileSync(path.join(FILES_PATH, 'map_nozip.bsp'));

        vmfBuffer = readFileSync(path.join(FILES_PATH, 'map.vmf'));
        vmfHash = createSha1Hash(vmfBuffer);

        createMapObject = {
          name: 'surf_map',
          info: {
            description: 'mampmampmampmampmampmampmampmamp',
            creationDate: '2022-07-07T18:33:33.000Z'
          },
          submissionType: MapSubmissionType.ORIGINAL,
          placeholders: [{ alias: 'God', type: MapCreditType.AUTHOR }],
          suggestions: [
            {
              trackType: TrackType.MAIN,
              trackNum: 1,
              gamemode: Gamemode.SURF,
              tier: 1,
              type: LeaderboardType.RANKED,
              comment: 'I love you',
              tags: [MapTag.Unit]
            },
            {
              trackType: TrackType.BONUS,
              trackNum: 1,
              gamemode: Gamemode.AHOP,
              tier: 2,
              type: LeaderboardType.RANKED,
              comment: 'comment'
            }
          ],
          wantsPrivateTesting: true,
          testInvites: [u2.id, u3.id],
          credits: [
            {
              userID: user.id,
              type: MapCreditType.AUTHOR,
              description: 'Walrus'
            }
          ],
          zones
        };
      });

      afterAll(async () => {
        await db.cleanup('user', 'mMap');
        await fileStore.deleteDirectory('submissions');
        await fileStore.deleteDirectory('maplist');
        await fileStore.deleteDirectory('upload_tmp');
      });

      describe('should submit a map', () => {
        let res, createdMap;

        beforeAll(async () => {
          await uploadBspToPreSignedUrl(bspBuffer, token);

          res = await req.postAttach({
            url: 'maps',
            data: createMapObject,
            files: [
              {
                file: vmfBuffer,
                field: 'vmfs',
                fileName: 'surf_map_main.vmf'
              },
              {
                file: vmfBuffer,
                field: 'vmfs',
                fileName: 'surf_map_instance.vmf'
              }
            ],
            token
          });

          createdMap = await prisma.mMap.findUnique({
            where: { id: res.body.id },
            include: {
              info: true,
              stats: true,
              credits: true,
              leaderboards: true,
              currentVersion: true,
              versions: true,
              submission: {
                include: {
                  dates: { orderBy: { date: 'asc' }, include: { user: true } }
                }
              },
              reviewStats: true
            }
          });
        });

        afterAll(() =>
          Promise.all([
            db.cleanup('mMap'),
            fileStore.deleteDirectory('maplist')
          ])
        );

        it('should respond with a MapDto', () => {
          expect(res.body).toBeValidDto(MapDto);
        });

        it('should create a map within the database', () => {
          expect(createdMap).toMatchObject({
            name: 'surf_map',
            status: MapStatus.PRIVATE_TESTING,
            submission: {
              type: MapSubmissionType.ORIGINAL,
              placeholders: [{ alias: 'God', type: MapCreditType.AUTHOR }],
              suggestions: [
                {
                  trackType: TrackType.MAIN,
                  trackNum: 1,
                  gamemode: Gamemode.SURF,
                  tier: 1,
                  type: LeaderboardType.RANKED,
                  comment: 'I love you',
                  tags: [MapTag.Unit]
                },
                {
                  trackType: TrackType.BONUS,
                  trackNum: 1,
                  gamemode: Gamemode.AHOP,
                  tier: 2,
                  type: LeaderboardType.RANKED,
                  comment: 'comment'
                }
              ],
              dates: [
                {
                  status: MapStatus.PRIVATE_TESTING,
                  date: expect.any(Date)
                }
              ]
            },
            info: {
              description: 'mampmampmampmampmampmampmampmamp',
              creationDate: new Date('2022-07-07T00:00:00.000Z')
            },
            submitterID: user.id,
            credits: [
              {
                userID: user.id,
                type: MapCreditType.AUTHOR,
                description: 'Walrus'
              }
            ],
            reviewStats: {}
          });

          expect(
            Date.now() - new Date(createdMap.submission.dates[0].date).getTime()
          ).toBeLessThan(1000);
          expect(JSON.parse(createdMap.currentVersion.zones)).toMatchObject(
            zones
          );
          expect(createdMap.currentVersion.submitterID).toBe(user.id);
          expect(createdMap.versions[0]).toMatchObject(
            createdMap.currentVersion
          );
          expect(createdMap.versions).toHaveLength(1);
        });

        it('should create a ton of leaderboards', async () => {
          const leaderboards = await prisma.leaderboard.findMany({
            where: { mapID: createdMap.id }
          });

          const expected = ZonesStubLeaderboards.map((x) => ({
            ...x,
            mapID: createdMap.id,
            style: 0,
            tier: null,
            type: LeaderboardType.IN_SUBMISSION,
            tags: []
          }));

          expect(leaderboards).toEqual(expect.arrayContaining(expected));
          expect(leaderboards).toHaveLength(expected.length);
        });

        it('should upload the BSP file', async () => {
          expect(res.body.downloadURL).toBeUndefined();
          const currentVersion = res.body.currentVersion;

          expect(currentVersion.downloadURL.split('/').slice(-2)).toEqual([
            'maps',
            `${createdMap.currentVersion.bspDownloadId}.bsp`
          ]);

          const downloadBuffer = await fileStore.downloadHttp(
            currentVersion.downloadURL
          );
          const downloadHash = createSha1Hash(downloadBuffer);

          expect(bspHash).toBe(currentVersion.bspHash);
          expect(downloadHash).toBe(currentVersion.bspHash);
        });

        it('should upload the VMF file', async () => {
          const currentVersion = res.body.currentVersion;

          expect(currentVersion.vmfDownloadURL.split('/').slice(-2)).toEqual([
            'maps',
            `${createdMap.currentVersion.vmfDownloadId}_VMFs.zip`
          ]);

          const downloadBuffer = await fileStore.downloadHttp(
            currentVersion.vmfDownloadURL
          );

          const zip = new Zip(downloadBuffer);

          const extractedVmf = zip.getEntry('surf_map_main.vmf').getData();
          expect(createSha1Hash(extractedVmf)).toBe(vmfHash);
        });

        it('should create map uploaded activities for the map authors', async () => {
          const activity = await prisma.activity.findFirst();

          expect(activity.type).toBe(ActivityType.MAP_UPLOADED);
          expect(activity.data).toBe(BigInt(createdMap.id));
        });

        it('should create map review invites for the invitees', async () => {
          const invites = await prisma.mapTestInvite.findMany();
          const invitees = invites.map((u) => u.userID);
          expect(invitees).toEqual(expect.arrayContaining([u2.id, u3.id]));
          expect(invitees).toHaveLength(2);
        });

        it('should 503 if killswitch guard is active', async () => {
          await req.patch({
            url: 'admin/killswitch',
            status: 204,
            body: {
              MAP_SUBMISSION: true
            },
            token: adminToken
          });

          await db.createMap({
            submitter: { connect: { id: user.id } },
            status: MapStatuses.IN_SUBMISSION[1]
          });

          await req.postAttach({
            url: 'maps',
            data: createMapObject,
            files: [
              { file: bspBuffer, field: 'bsp', fileName: 'surf_map.bsp' },
              { file: vmfBuffer, field: 'vmfs', fileName: 'surf_map.vmf' }
            ],
            token: adminToken
          });

          await req.patch({
            url: 'admin/killswitch',
            status: 204,
            body: {
              NEW_SIGNUPS: false,
              RUN_SUBMISSION: false,
              MAP_SUBMISSION: false,
              MAP_REVIEWS: false
            },
            token: adminToken
          });
        });
      });

      describe('Permission checks', () => {
        for (const status of MapStatuses.IN_SUBMISSION) {
          it(`should 403 if the user already has a map in ${MapStatus[status]} and is not a MAPPER`, async () => {
            await db.createMap({
              submitter: { connect: { id: user.id } },
              status
            });

            await uploadBspToPreSignedUrl(bspBuffer, token);

            await req.postAttach({
              url: 'maps',
              status: 403,
              data: createMapObject,
              files: [
                { file: vmfBuffer, field: 'vmfs', fileName: 'surf_map.vmf' }
              ],
              token
            });

            await prisma.mMap.deleteMany();
          });

          for (const role of [
            Role.MAPPER,
            Role.PORTER,
            Role.REVIEWER,
            Role.MODERATOR,
            Role.ADMIN
          ]) {
            it(`should allow if the user already has a map in ${MapStatus[status]} and is a ${Role[role]}`, async () => {
              await prisma.user.update({
                where: { id: user.id },
                data: { roles: role }
              });

              await db.createMap({
                submitter: { connect: { id: user.id } },
                status
              });

              await uploadBspToPreSignedUrl(bspBuffer, token);

              await req.postAttach({
                url: 'maps',
                status: 201,
                data: createMapObject,
                files: [
                  { file: vmfBuffer, field: 'vmfs', fileName: 'surf_map.vmf' }
                ],
                token
              });

              await prisma.user.update({
                where: { id: user.id },
                data: { roles: 0 }
              });

              await prisma.mMap.deleteMany();
            });
          }
        }
      });

      describe('Other tests', () => {
        afterEach(() =>
          Promise.all([
            db.cleanup('mMap'),
            fileStore.deleteDirectory('upload_tmp')
          ])
        );

        it("should put a map straight in CONTENT_APPROVAL if user doesn't request private testing", async () => {
          await uploadBspToPreSignedUrl(bspBuffer, token);

          const res = await req.postAttach({
            url: 'maps',
            status: 201,
            data: { ...createMapObject, wantsPrivateTesting: false },
            files: [
              { file: vmfBuffer, field: 'vmfs', fileName: 'surf_map.vmf' }
            ],
            token
          });

          expect(res.body.status).toBe(MapStatus.CONTENT_APPROVAL);

          expect(
            Date.now() -
              new Date(
                (res.body.submission.dates as MapSubmissionDate[]).find(
                  ({ status }) => status === MapStatus.CONTENT_APPROVAL
                ).date
              ).getTime()
          ).toBeLessThan(1000);
        });

        it('should accept a submission with no placeholders or test invites', async () => {
          const obj = structuredClone(createMapObject);
          delete obj.testInvites;
          delete obj.placeholders;

          await uploadBspToPreSignedUrl(bspBuffer, token);

          await req.postAttach({
            url: 'maps',
            status: 201,
            data: obj,
            token
          });
        });

        it('should accept a submission with placeholders but no credits', async () => {
          // Missing one of credits/placeholders is fine so long as there's one
          // of either.
          const create = structuredClone(createMapObject);
          delete create.credits;

          await uploadBspToPreSignedUrl(bspBuffer, token);

          await req.postAttach({
            url: 'maps',
            status: 201,
            data: create,
            token
          });
        });

        it('should accept a submission with credits but no placeholders', async () => {
          const create = structuredClone(createMapObject);
          delete create.placeholders;

          await uploadBspToPreSignedUrl(bspBuffer, token);

          await req.postAttach({
            url: 'maps',
            status: 201,
            data: create,
            token
          });
        });

        it('should reject a submission with no placeholders or credits', async () => {
          const create = structuredClone(createMapObject);
          delete create.credits;
          delete create.placeholders;

          await uploadBspToPreSignedUrl(bspBuffer, token);

          await req.postAttach({
            url: 'maps',
            status: 400,
            data: create,
            token
          });
        });

        it('should accept a submission with placeholders as 1-character aliases', async () => {
          const create = structuredClone(createMapObject);
          delete create.credits;
          create.placeholders = [
            { alias: 'a', type: MapCreditType.AUTHOR },
            { alias: 'b', type: MapCreditType.CONTRIBUTOR },
            { alias: 'c', type: MapCreditType.TESTER },
            { alias: 'd', type: MapCreditType.SPECIAL_THANKS }
          ];

          await uploadBspToPreSignedUrl(bspBuffer, token);

          await req.postAttach({
            url: 'maps',
            status: 201,
            data: create,
            token
          });
        });

        it('should reject a submission with no suggestions', async () => {
          const obj = structuredClone(createMapObject);
          delete obj.suggestions;

          await uploadBspToPreSignedUrl(bspBuffer, token);

          await req.postAttach({
            url: 'maps',
            status: 400,
            data: obj,
            token
          });
        });

        it('should 400 if BSP file is missing', async () => {
          await req.postAttach({
            url: 'maps',
            status: 400,
            data: createMapObject,
            files: [
              { file: vmfBuffer, field: 'vmfs', fileName: 'surf_map.vmf' }
            ],
            token
          });

          await req.post({
            url: 'maps',
            status: 400,
            body: createMapObject,
            token
          });
        });

        it('should 400 if a BSP file has invalid header', async () => {
          await uploadBspToPreSignedUrl(Buffer.alloc(100), token);

          await req.postAttach({
            url: 'maps',
            status: 400,
            data: createMapObject,
            files: [
              { file: vmfBuffer, field: 'vmfs', fileName: 'surf_map.vmf' }
            ],
            token
          });
        });

        it('should 400 if a BSP file was not compressed', async () => {
          await uploadBspToPreSignedUrl(nozipBspBuffer, token);

          await req.postAttach({
            url: 'maps',
            status: 400,
            data: createMapObject,
            files: [
              { file: vmfBuffer, field: 'vmfs', fileName: 'surf_map.vmf' }
            ],
            token
          });
        });

        it('should 409 if map with BSP hash already used by other map gets submitted', async () => {
          await uploadBspToPreSignedUrl(bspBuffer, mapperToken);

          await req.postAttach({
            url: 'maps',
            status: 201,
            data: createMapObject,
            files: [
              { file: vmfBuffer, field: 'vmfs', fileName: 'surf_map.vmf' }
            ],
            token: mapperToken
          });

          const createOther = structuredClone(createMapObject);
          // Already 409s on same map name before hash check is done, so change it.
          createOther.name = 'surf_best';

          await uploadBspToPreSignedUrl(bspBuffer, mapperToken);

          await req.postAttach({
            url: 'maps',
            status: 409,
            data: createOther,
            files: [
              { file: vmfBuffer, field: 'vmfs', fileName: 'surf_map.vmf' }
            ],
            token: mapperToken
          });
        });

        it('should succeed if VMF file is missing', async () => {
          await uploadBspToPreSignedUrl(bspBuffer, token);

          await req.postAttach({
            url: 'maps',
            status: 201,
            data: createMapObject,
            token
          });
        });

        it('should 400 if VMF file is invalid', async () => {
          await uploadBspToPreSignedUrl(bspBuffer, token);

          await req.postAttach({
            url: 'maps',
            status: 400,
            data: createMapObject,
            files: [
              {
                file: Buffer.from('{' + vmfBuffer.toString()),
                field: 'vmfs',
                fileName: 'surf_map.vmf'
              }
            ],
            token
          });
        });

        it("should 400 if a VMF file is greater than the config's max vmf file size", async () => {
          await uploadBspToPreSignedUrl(bspBuffer, token);

          await req.postAttach({
            url: 'maps',
            status: 400,
            data: createMapObject,
            files: [
              {
                file: Buffer.alloc(Config.limits.vmfSize + 1),
                field: 'vmfs',
                fileName: 'surf_map.vmf'
              }
            ],
            token
          });
        });

        it('should 400 if a VMF filename does not end in .vmf', async () => {
          await uploadBspToPreSignedUrl(bspBuffer, token);

          await req.postAttach({
            url: 'maps',
            status: 400,
            data: createMapObject,
            files: [
              { file: vmfBuffer, field: 'vmfs', fileName: 'surf_map.blend' }
            ],
            token
          });
        });

        it('should 403 for if the user is not a mapper and has a map in submission', async () => {
          await db.createMap({
            submitter: { connect: { id: user.id } },
            status: MapStatus.PRIVATE_TESTING
          });

          await uploadBspToPreSignedUrl(bspBuffer, token);

          await req.postAttach({
            url: 'maps',
            status: 403,
            data: createMapObject,
            files: [
              { file: vmfBuffer, field: 'vmfs', fileName: 'surf_map.vmf' }
            ],
            token
          });
        });

        it('should not 403 for if the user is a mapper and has a map in submission', async () => {
          await db.createMap({
            submitter: { connect: { id: user.id } },
            status: MapStatus.PRIVATE_TESTING
          });

          await prisma.user.update({
            where: { id: user.id },
            data: { roles: Role.MAPPER }
          });

          await uploadBspToPreSignedUrl(bspBuffer, token);

          await req.postAttach({
            url: 'maps',
            status: 201,
            data: createMapObject,
            files: [
              { file: vmfBuffer, field: 'vmfs', fileName: 'surf_map.vmf' }
            ],
            token
          });
        });

        it('should 403 if the user has MAX_OPEN_MAP_SUBMISSIONS maps in submission and is not mapper', async () => {
          await prisma.user.update({
            where: { id: user.id },
            data: { roles: 0 }
          });

          await uploadBspToPreSignedUrl(bspBuffer, token);

          const dbService: DbService = app.get(EXTENDED_PRISMA_SERVICE);
          jest
            .spyOn(dbService.mMap, 'count')
            .mockResolvedValueOnce(MAX_OPEN_MAP_SUBMISSIONS);

          await req.postAttach({
            url: 'maps',
            status: 403,
            data: createMapObject,
            files: [
              { file: vmfBuffer, field: 'vmfs', fileName: 'surf_map.vmf' }
            ],
            token
          });
        });

        it('should 403 if the user has MAX_MAPPER_OPEN_MAP_SUBMISSIONS maps in submission and is mapper', async () => {
          await prisma.user.update({
            where: { id: user.id },
            data: { roles: Role.MAPPER }
          });

          await uploadBspToPreSignedUrl(bspBuffer, token);

          // I know we shouldn't really do this, but creating 100
          // maps for testing it's count limit takes too much time
          const dbService: DbService = app.get(EXTENDED_PRISMA_SERVICE);
          jest
            .spyOn(dbService.mMap, 'count')
            .mockResolvedValueOnce(MAX_MAPPER_OPEN_MAP_SUBMISSIONS);

          await req.postAttach({
            url: 'maps',
            status: 403,
            data: createMapObject,
            files: [
              { file: vmfBuffer, field: 'vmfs', fileName: 'surf_map.vmf' }
            ],
            token
          });
        });

        it('should 403 if the user has a MAP_SUBMISSION ban', async () => {
          await prisma.user.update({
            where: { id: user.id },
            data: { bans: Ban.MAP_SUBMISSION }
          });

          await req.postAttach({
            url: 'maps',
            status: 403,
            data: createMapObject,
            files: [
              { file: vmfBuffer, field: 'vmfs', fileName: 'surf_map.vmf' }
            ],
            token
          });

          await prisma.user.update({
            where: { id: user.id },
            data: { bans: 0 }
          });
        });

        it('should 400 if the map has invalid zones', async () => {
          const zones = structuredClone(ZonesStub);
          // Silly values that pass class-validator but get caught by zone-validator.ts
          zones.tracks.main.zones.segments[0].checkpoints.push({
            regions: [
              {
                points: [
                  [Number.MIN_SAFE_INTEGER ** 4, 4],
                  [4, 4],
                  [4, 4]
                ],
                height: 4444,
                teleDestPos: [-4, -4, -4],
                teleDestYaw: 4,
                bottom: 100000000000
              }
            ]
          });

          await uploadBspToPreSignedUrl(bspBuffer, token);

          await req.postAttach({
            url: 'maps',
            status: 400,
            data: { ...createMapObject, zones },
            files: [
              { file: vmfBuffer, field: 'vmfs', fileName: 'surf_map.vmf' }
            ],
            token
          });
        });

        it('should 400 if the map has invalid suggestions', async () => {
          const suggs = structuredClone(createMapObject.suggestions);

          suggs[0].type = LeaderboardType.IN_SUBMISSION;

          await uploadBspToPreSignedUrl(bspBuffer, token);

          await req.postAttach({
            url: 'maps',
            status: 400,
            data: { ...createMapObject, suggestions: suggs },
            files: [
              { file: vmfBuffer, field: 'vmfs', fileName: 'surf_map.vmf' }
            ],
            token
          });

          suggs[0].type = LeaderboardType.HIDDEN;

          await uploadBspToPreSignedUrl(bspBuffer, token);

          await req.postAttach({
            url: 'maps',
            status: 400,
            data: { ...createMapObject, suggestions: suggs },
            files: [
              { file: vmfBuffer, field: 'vmfs', fileName: 'surf_map.vmf' }
            ],
            token
          });
        });

        it('should 400 if the map has conflicting suggestions', async () => {
          const suggs = structuredClone(createMapObject.suggestions);

          suggs.push(
            {
              gamemode: Gamemode.SURF,
              trackNum: 1,
              trackType: TrackType.MAIN
            },
            {
              gamemode: Gamemode.BHOP,
              trackNum: 1,
              trackType: TrackType.MAIN
            }
          );

          await uploadBspToPreSignedUrl(bspBuffer, token);

          await req.postAttach({
            url: 'maps',
            status: 400,
            data: { ...createMapObject, suggestions: suggs },
            files: [
              { file: vmfBuffer, field: 'vmfs', fileName: 'surf_map.vmf' }
            ],
            token
          });
        });

        it('should 409 if a map with the same name exists', async () => {
          const name = 'ron_weasley';

          await db.createMap({ name });

          await uploadBspToPreSignedUrl(bspBuffer, token);

          await req.postAttach({
            url: 'maps',
            status: 409,
            data: { ...createMapObject, name },
            files: [
              { file: vmfBuffer, field: 'vmfs', fileName: 'surf_map.vmf' }
            ],
            token
          });
        });

        it('should 400 if the zones are too large', async () => {
          await uploadBspToPreSignedUrl(bspBuffer, token);

          await req.postAttach({
            url: 'maps',
            status: 400,
            data: {
              ...createMapObject,
              // 10,000 zones :D
              zones: generateRandomMapZones(
                100,
                arrayFrom(100, () => 100),
                [0],
                1024 ** 2,
                1024,
                1024
              )
            },
            token
          });
        });

        it('should 401 when no access token is provided', () =>
          req.unauthorizedTest('maps', 'post'));
      });
    });
  });

  describe('maps/{mapID}', () => {
    describe('GET', () => {
      let u1: User, u1Token: string, u2: User, map;

      beforeAll(async () => {
        [[u1, u1Token], u2] = await Promise.all([
          db.createAndLoginUser(),
          db.createUser()
        ]);

        map = await db.createMap({
          name: 'my_epic_map',
          versions: {
            createMany: {
              data: [
                {
                  versionNum: 1,
                  bspHash: createSha1Hash('bats'),
                  submitterID: u1.id
                },
                {
                  versionNum: 2,
                  bspHash: createSha1Hash('wigs'),
                  submitterID: u1.id
                }
              ]
            }
          },
          submission: {
            create: {
              type: MapSubmissionType.ORIGINAL,
              suggestions: [
                {
                  trackType: TrackType.MAIN,
                  trackNum: 1,
                  gamemode: Gamemode.SURF,
                  tier: 1,
                  type: LeaderboardType.RANKED,
                  comment: 'I will kill again'
                }
              ],
              dates: {
                create: [
                  {
                    status: MapStatus.APPROVED,
                    date: new Date(),
                    user: { connect: { id: u1.id } }
                  }
                ]
              }
            }
          },
          reviews: {
            create: {
              reviewer: { connect: { id: u2.id } },
              mainText: 'No! No!!'
            }
          },
          testInvites: {
            create: { userID: u2.id, state: MapTestInviteState.ACCEPTED }
          }
        });

        await prisma.mMap.update({
          where: { id: map.id },
          data: { currentVersion: { connect: { id: map.versions[1].id } } }
        });
      });

      afterAll(() => db.cleanup('leaderboardRun', 'pastRun', 'user', 'mMap'));

      it('should respond with map data', async () => {
        const res = await req.get({
          url: `maps/${map.id}`,
          status: 200,
          validate: MapDto,
          token: u1Token
        });

        expect(res.body).not.toHaveProperty('zones');
      });

      it('should search by name when passed a string', () =>
        req.get({
          url: 'maps/my_epic_map',
          status: 200,
          validate: MapDto,
          token: u1Token
        }));

      it('should respond with expanded map data using the credits expand parameter', async () => {
        await prisma.mapCredit.create({
          data: { mapID: map.id, userID: u2.id, type: MapCreditType.AUTHOR }
        });

        await req.expandTest({
          url: `maps/${map.id}`,
          validate: MapDto,
          expand: 'credits',
          expectedPropertyName: 'credits[0].user',
          token: u1Token
        });
      });

      it('should respond with expanded map data using the info expand parameter', () =>
        req.expandTest({
          url: `maps/${map.id}`,
          validate: MapDto,
          expand: 'info',
          token: u1Token
        }));

      it('should respond with expanded map data using the submitter expand parameter', async () => {
        await prisma.mMap.update({
          where: { id: map.id },
          data: { submitterID: u2.id }
        });

        await req.expandTest({
          url: `maps/${map.id}`,
          validate: MapDto,
          expand: 'submitter',
          token: u1Token
        });
      });

      it('should respond with expanded map data using the submission expand parameter', () =>
        req.expandTest({
          url: `maps/${map.id}`,
          validate: MapDto,
          expand: 'submission',
          // Nested dates and author should be included with submission.
          expectedPropertyName: 'submission.dates[0].user',
          token: u1Token
        }));

      it('should respond with expanded map data using the stats expand parameter', () =>
        req.expandTest({
          url: `maps/${map.id}`,
          validate: MapDto,
          expand: 'stats',
          token: u1Token
        }));

      it('should respond with expanded map data using the leaderboards expand parameter', () =>
        req.expandTest({
          url: `maps/${map.id}`,
          validate: MapDto,
          expand: 'leaderboards',
          token: u1Token
        }));

      it('should respond with expanded map data using the currentVersion expand parameter', () =>
        req.expandTest({
          url: `maps/${map.id}`,
          validate: MapDto,
          expand: 'currentVersion',
          token: u1Token
        }));

      it('should respond with expanded map data using the testInvites expand parameter', () =>
        req.expandTest({
          url: `maps/${map.id}`,
          validate: MapDto,
          expand: 'testInvites',
          expectedPropertyName: 'testInvites[0].user',
          token: u1Token
        }));

      it("should respond with expanded map data if the map is in the logged in user's favorites when using the inFavorites expansion", async () => {
        await prisma.mapFavorite.create({
          data: { userID: u1.id, mapID: map.id }
        });

        await req.expandTest({
          url: `maps/${map.id}`,
          validate: MapDto,
          expand: 'inFavorites',
          expectedPropertyName: 'favorites',
          token: u1Token
        });
      });

      it("should respond with the map's WR when using the worldRecord expansion", async () => {
        await db.createLbRun({
          map: map,
          user: u2,
          time: 5,
          rank: 1
        });

        const res = await req.get({
          url: `maps/${map.id}`,
          status: 200,
          query: { expand: 'worldRecord' },
          token: u1Token
        });

        expect(res.body).toMatchObject({
          worldRecords: [{ rank: 1, user: { id: u2.id } }]
        });
      });

      it("should respond with the logged in user's PB when using the personalBest expansion", async () => {
        await db.createLbRun({
          map: map,
          user: u1,
          time: 10,
          rank: 2
        });

        const res = await req.get({
          url: `maps/${map.id}`,
          status: 200,
          query: { expand: 'personalBest' },
          token: u1Token
        });

        expect(res.body).toMatchObject({
          personalBests: [{ rank: 2, user: { id: u1.id } }]
        });
      });

      it('should respond properly with both personalBest and worldRecord expansions', async () => {
        const res = await req.get({
          url: `maps/${map.id}`,
          status: 200,
          query: { expand: 'worldRecord,personalBest' },
          token: u1Token
        });

        expect(res.body).toMatchObject({
          worldRecords: [{ rank: 1, user: { id: u2.id } }],
          personalBests: [{ rank: 2, user: { id: u1.id } }]
        });
      });

      it('should respond with expanded map data using the submission expand parameter', () =>
        req.expandTest({
          url: `maps/${map.id}`,
          validate: MapDto,
          expand: 'submission',
          token: u1Token
        }));

      it('should respond with expanded map data using the versions expand parameter', () =>
        req.expandTest({
          url: `maps/${map.id}`,
          validate: MapDto,
          expand: 'versions',
          // Nested submitter should be included with versions.
          expectedPropertyName: 'versions[1].submitter',
          token: u1Token
        }));

      it('should respond with expanded map data using the versionsWithZones expand parameter', () =>
        req.expandTest({
          url: `maps/${map.id}`,
          validate: MapDto,
          expand: 'versionsWithZones',
          expectedPropertyName: 'versions[1].zones',
          token: u1Token
        }));

      it('should respond with expanded map data using the currentVersion expand parameter', () =>
        req.expandTest({
          url: `maps/${map.id}`,
          validate: MapDto,
          expand: 'currentVersion',
          expectedPropertyName: 'currentVersion',
          token: u1Token
        }));

      it('should respond with expanded map data using the currentVersionWithZones expand parameter', () =>
        req.expandTest({
          url: `maps/${map.id}`,
          validate: MapDto,
          expand: 'currentVersionWithZones',
          expectedPropertyName: 'currentVersion.zones',
          token: u1Token
        }));

      // This test is sufficient to test that getMapAndCheckReadAccess is being
      // called, so we don't need to test the endless variations of states/perms
      // as they're extensively covered by unit tests.
      it('should 403 if the user does not have permission to access to the map', async () => {
        await prisma.mMap.update({
          where: { id: map.id },
          data: { status: MapStatus.PRIVATE_TESTING }
        });

        await req.get({
          url: `maps/${map.id}`,
          status: 403,
          token: u1Token
        });

        await prisma.mMap.update({
          where: { id: map.id },
          data: { status: MapStatus.APPROVED }
        });
      });

      it('should 400 if map id is bigger then max 32-bit integer', () =>
        req.get({ url: `maps/${2 ** 31}`, status: 400, token: u1Token }));

      it('should 404 if the map is not found', () =>
        req.get({ url: `maps/${NULL_ID}`, status: 404, token: u1Token }));
    });

    describe('POST', () => {
      let u1: User,
        u1Token: string,
        u2Token: string,
        createInput: Partial<Prisma.MMapCreateInput>,
        map,
        bspBuffer: Buffer,
        bspHash: string,
        vmfBuffer: Buffer,
        vmfHash: string;

      beforeAll(async () => {
        [[u1, u1Token], u2Token] = await Promise.all([
          db.createAndLoginUser(),
          db.loginNewUser()
        ]);

        bspBuffer = readFileSync(path.join(FILES_PATH, 'map.bsp'));
        bspHash = createSha1Hash(bspBuffer);

        vmfBuffer = readFileSync(path.join(FILES_PATH, 'map.vmf'));
        vmfHash = createSha1Hash(vmfBuffer);
      });

      afterAll(async () => {
        await db.cleanup('user');
        await fileStore.deleteDirectory('submissions');
        await fileStore.deleteDirectory('upload_tmp');
      });

      beforeEach(async () => {
        createInput = {
          name: 'surf_map',
          submitter: { connect: { id: u1.id } },
          status: MapStatus.PRIVATE_TESTING,
          versions: {
            create: {
              zones: ZonesStubString,
              versionNum: 1,
              bspHash: createSha1Hash(bspBuffer),
              submitter: { connect: { id: u1.id } }
            }
          },
          submission: {
            create: {
              type: MapSubmissionType.ORIGINAL,
              suggestions: [
                {
                  trackType: TrackType.MAIN,
                  trackNum: 1,
                  gamemode: Gamemode.SURF,
                  tier: 10,
                  type: LeaderboardType.RANKED
                }
              ],
              dates: {
                create: [
                  {
                    status: MapStatus.PRIVATE_TESTING,
                    date: new Date(),
                    user: { connect: { id: u1.id } }
                  }
                ]
              }
            }
          }
        };

        map = await db.createMap(createInput, true);
      });

      afterEach(() =>
        Promise.all([
          db.cleanup('mMap'),
          fileStore.deleteDirectory('maplist'),
          fileStore.deleteDirectory('upload_tmp')
        ])
      );

      it('should add a new map version', async () => {
        const changelog = 'Added walls, floors etc...';
        await uploadBspToPreSignedUrl(bspBuffer, u1Token);

        const res = await req.postAttach({
          url: `maps/${map.id}`,
          status: 201,
          data: { changelog, hasBSP: true },
          files: [{ file: vmfBuffer, field: 'vmfs', fileName: 'surf_map.vmf' }],
          validate: MapDto,
          token: u1Token
        });

        expect(res.body).toMatchObject({
          currentVersion: {
            versionNum: 2,
            submitterID: u1.id,
            changelog
          },
          versions: expect.arrayContaining([
            expect.objectContaining({ versionNum: 1 }),
            expect.objectContaining({
              versionNum: 2,
              changelog,
              submitterID: u1.id
            })
          ])
        });

        const mapDB = await prisma.mMap.findUnique({
          where: { id: map.id },
          include: { currentVersion: true }
        });

        expect(mapDB.currentVersion.versionNum).toBe(2);
        expect(res.body.currentVersion.id).toBe(mapDB.currentVersion.id);
      });

      it('should upload the BSP and VMF files', async () => {
        const { currentVersion: oldVersion } = await prisma.mMap.findUnique({
          where: { id: map.id },
          include: { currentVersion: true }
        });

        await uploadBspToPreSignedUrl(bspBuffer, u1Token);

        const res = await req.postAttach({
          url: `maps/${map.id}`,
          status: 201,
          data: {
            changelog: 'Added lights, spawn entity etc...',
            hasBSP: true
          },
          files: [{ file: vmfBuffer, field: 'vmfs', fileName: 'surf_map.vmf' }],
          validate: MapDto,
          token: u1Token
        });

        const currentVersion = res.body.currentVersion;
        const newMap = await prisma.mMap.findUnique({
          where: { id: map.id },
          include: { currentVersion: true }
        });

        expect(currentVersion.downloadURL.split('/').slice(-2)).toEqual([
          'maps',
          `${newMap.currentVersion.bspDownloadId}.bsp`
        ]);
        expect(newMap.currentVersion.bspDownloadId).not.toEqual(
          oldVersion.bspDownloadId
        );

        const bspDownloadBuffer = await fileStore.downloadHttp(
          currentVersion.downloadURL
        );
        const bspDownloadHash = createSha1Hash(bspDownloadBuffer);

        expect(bspHash).toBe(currentVersion.bspHash);
        expect(bspDownloadHash).toBe(currentVersion.bspHash);

        expect(currentVersion.vmfDownloadURL.split('/').slice(-2)).toEqual([
          'maps',
          `${newMap.currentVersion.vmfDownloadId}_VMFs.zip`
        ]);
        expect(newMap.currentVersion.vmfDownloadId).not.toEqual(
          oldVersion.vmfDownloadId
        );

        const vmfDownloadBuffer = await fileStore.downloadHttp(
          currentVersion.vmfDownloadURL
        );

        const zip = new Zip(vmfDownloadBuffer);

        const extractedVmf = zip.getEntry('surf_map.vmf').getData();
        expect(createSha1Hash(extractedVmf)).toBe(vmfHash);
      });

      it('should generate new leaderboards for new zones', async () => {
        await prisma.leaderboard.createMany({
          data: ZonesStubLeaderboards.map((lb) => ({
            mapID: map.id,
            style: 0,
            type: LeaderboardType.IN_SUBMISSION,
            ...lb
          }))
        });

        await db.createLbRun({
          map,
          user: u1,
          rank: 1,
          gamemode: Gamemode.RJ,
          trackType: TrackType.MAIN,
          trackNum: 1
        });

        await db.createLbRun({
          map,
          user: u1,
          rank: 1,
          gamemode: Gamemode.CONC,
          trackType: TrackType.BONUS,
          trackNum: 1
        });

        expect(
          await prisma.leaderboardRun.findMany({
            where: { mapID: map.id, gamemode: Gamemode.RJ }
          })
        ).toHaveLength(1);

        expect(
          await prisma.leaderboardRun.findMany({
            where: { mapID: map.id, gamemode: Gamemode.CONC }
          })
        ).toHaveLength(1);

        // Add a third major CP, setting end zone to end of major CP 3 - a
        // mapper could very realistically do this!
        // Then we're gonna delete the bonus. Should get new leaderboard for
        // stage 3, and bonus leaderboards and runs should be deleted.

        const newZones = structuredClone(ZonesStub);

        // Add 3rd major CP
        newZones.tracks.main.zones.segments.push({
          cancel: [],
          checkpointsRequired: true,
          checkpointsOrdered: true,
          limitStartGroundSpeed: true,
          checkpoints: [
            structuredClone(
              newZones.tracks.main.zones.segments[0].checkpoints[0]
            )
          ]
        });

        // Nuke the bonus
        newZones.tracks.bonuses = [];

        await uploadBspToPreSignedUrl(bspBuffer, u1Token);

        await req.postAttach({
          url: `maps/${map.id}`,
          status: 201,
          data: {
            changelog: 'Added Stage 3, removed bonus',
            zones: newZones,
            hasBSP: true
          },
          files: [{ file: vmfBuffer, field: 'vmfs', fileName: 'surf_map.vmf' }],
          validate: MapDto,
          token: u1Token
        });

        const expected = ZoneStubCompatGamemodes.flatMap((gamemode) => [
          { gamemode, trackType: TrackType.MAIN, trackNum: 1, linear: false },
          { gamemode, trackType: TrackType.STAGE, trackNum: 1, linear: null },
          { gamemode, trackType: TrackType.STAGE, trackNum: 2, linear: null },
          { gamemode, trackType: TrackType.STAGE, trackNum: 3, linear: null }
        ]);

        const leaderboards = await prisma.leaderboard.findMany({
          where: { mapID: map.id },
          select: {
            gamemode: true,
            trackType: true,
            trackNum: true,
            linear: true
          }
        });

        expect(leaderboards).toEqual(expect.arrayContaining(expected));
        expect(leaderboards).toHaveLength(expected.length);

        expect(
          await prisma.leaderboardRun.findMany({
            where: { mapID: map.id, gamemode: Gamemode.RJ }
          })
        ).toHaveLength(1);

        expect(
          await prisma.leaderboardRun.findMany({
            where: { mapID: map.id, gamemode: Gamemode.CONC }
          })
        ).toHaveLength(0);
      });

      it('should 503 if killswitch guard is active for maps/{mapID}', async () => {
        const adminToken = await db.loginNewUser({
          data: { roles: Role.ADMIN }
        });

        const changelog = 'Will delete map';

        await req.patch({
          url: 'admin/killswitch',
          status: 204,
          body: {
            MAP_SUBMISSION: true
          },
          token: adminToken
        });

        await req.postAttach({
          url: `maps/${map.id}`,
          status: 503,
          data: { changelog, hasBSP: true },
          files: [{ file: vmfBuffer, field: 'vmfs', fileName: 'surf_map.vmf' }],
          token: u1Token
        });

        await resetKillswitches(req, adminToken);
      });

      it('should not update the map list version for private submissions', async () => {
        const oldListVersion = await req.get({
          url: 'maps/maplistversion',
          status: 200,
          token: u1Token
        });

        await uploadBspToPreSignedUrl(bspBuffer, u1Token);

        await req.postAttach({
          url: `maps/${map.id}`,
          status: 201,
          data: { changelog: 'haha i am making ur thing update', hasBSP: true },
          files: [{ file: vmfBuffer, field: 'vmfs', fileName: 'surf_map.vmf' }],
          token: u1Token
        });

        await checkScheduledMapListUpdates();

        const newListVersion = await req.get({
          url: 'maps/maplistversion',
          status: 200,
          token: u1Token
        });

        expect(newListVersion.body.approved).toBe(oldListVersion.body.approved);
        expect(newListVersion.body.submissions).toBe(
          oldListVersion.body.submissions
        );
      });

      it('should update the map list version for submissions for a public map', async () => {
        await prisma.mMap.update({
          where: { id: map.id },
          data: { status: MapStatus.PUBLIC_TESTING }
        });

        const oldListVersion = await req.get({
          url: 'maps/maplistversion',
          status: 200,
          token: u1Token
        });

        await uploadBspToPreSignedUrl(bspBuffer, u1Token);

        await req.postAttach({
          url: `maps/${map.id}`,
          status: 201,
          data: { changelog: 'haha i am making ur thing update', hasBSP: true },
          files: [{ file: vmfBuffer, field: 'vmfs', fileName: 'surf_map.vmf' }],
          token: u1Token
        });

        await checkScheduledMapListUpdates();

        const newListVersion = await req.get({
          url: 'maps/maplistversion',
          status: 200,
          token: u1Token
        });

        expect(newListVersion.body.approved).toBe(oldListVersion.body.approved);
        expect(newListVersion.body.submissions).toBe(
          oldListVersion.body.submissions + 1
        );

        const { ident, numMaps, data } = await fileStore.getMapListVersion(
          FlatMapList.SUBMISSION,
          newListVersion.body.submissions
        );
        expect(ident).toBe('MSML');
        expect(numMaps).toBe(1);
        expect(data).toHaveLength(1);
        expect(data[0].id).toBe(map.id);
        expect(data[0]).not.toHaveProperty('zones');
      });

      it('should 400 for bad zones', async () => {
        await uploadBspToPreSignedUrl(bspBuffer, u1Token);

        const zones = structuredClone(ZonesStub);
        zones.tracks.main.zones.segments[0].checkpoints[0].regions[0].points = [
          [0, 0],
          [1, 0],
          [0, 1],
          [1, 1]
        ];
        await req.postAttach({
          url: `maps/${map.id}`,
          status: 400,
          data: {
            changelog: 'done fucked it',
            zones,
            hasBSP: true
          },
          files: [{ file: vmfBuffer, field: 'vmfs', fileName: 'surf_map.vmf' }],
          token: u1Token
        });
      });

      it('should 404 if the map does not exist', () =>
        req.postAttach({
          url: `maps/${NULL_ID}`,
          status: 404,
          data: { changelog: 'what is this' },
          files: [{ file: vmfBuffer, field: 'vmfs', fileName: 'surf_map.vmf' }],
          token: u2Token
        }));

      it('should 403 if the user is not the map submitter', () =>
        req.postAttach({
          url: `maps/${map.id}`,
          status: 403,
          data: { changelog: 'let me touch your map' },
          files: [{ file: vmfBuffer, field: 'vmfs', fileName: 'surf_map.vmf' }],
          token: u2Token
        }));

      it('should 403 if the user has a MAP_SUBMISSION ban', async () => {
        await prisma.user.update({
          where: { id: u1.id },
          data: { bans: Ban.MAP_SUBMISSION }
        });

        await req.postAttach({
          url: `maps/${map.id}`,
          status: 403,
          data: { changelog: 'guhhh' },
          files: [{ file: vmfBuffer, field: 'vmfs', fileName: 'surf_map.vmf' }],
          token: u1Token
        });

        await prisma.user.update({
          where: { id: u1.id },
          data: { bans: 0 }
        });
      });

      it('should succeed if only the VMF file is provided', async () => {
        const { currentVersion: oldVersion } = await prisma.mMap.findUnique({
          where: { id: map.id },
          include: { currentVersion: true }
        });

        await req.postAttach({
          url: `maps/${map.id}`,
          status: 201,
          data: { changelog: 'who needs tests anyway' },
          files: [{ file: vmfBuffer, field: 'vmfs', fileName: 'surf_map.vmf' }],
          token: u1Token
        });

        const { currentVersion: newVersion } = await prisma.mMap.findUnique({
          where: { id: map.id },
          include: { currentVersion: true }
        });

        expect(oldVersion.bspDownloadId).toEqual(newVersion.bspDownloadId);
        expect(oldVersion.vmfDownloadId).not.toEqual(newVersion.vmfDownloadId);
      });

      it('should succeed if only the BSP file is provided', async () => {
        const { currentVersion: oldVersion } = await prisma.mMap.findUnique({
          where: { id: map.id },
          include: { currentVersion: true }
        });

        await uploadBspToPreSignedUrl(bspBuffer, u1Token);

        await req.postAttach({
          url: `maps/${map.id}`,
          status: 201,
          data: { changelog: 'who needs tests anyway', hasBSP: true },
          token: u1Token
        });

        const { currentVersion: newVersion } = await prisma.mMap.findUnique({
          where: { id: map.id },
          include: { currentVersion: true }
        });

        expect(oldVersion.bspDownloadId).not.toEqual(newVersion.bspDownloadId);
        expect(newVersion.vmfDownloadId).toBeFalsy();
      });

      it('should succeed if only zones are provided', async () => {
        const { currentVersion: oldVersion } = await prisma.mMap.findUnique({
          where: { id: map.id },
          include: { currentVersion: true }
        });

        await req.postAttach({
          url: `maps/${map.id}`,
          status: 201,
          data: {
            changelog: 'Mlem',
            zones: structuredClone(ZonesStub)
          },
          validate: MapDto,
          token: u1Token
        });

        const { currentVersion: newVersion } = await prisma.mMap.findUnique({
          where: { id: map.id },
          include: { currentVersion: true }
        });

        expect(oldVersion.bspDownloadId).toEqual(newVersion.bspDownloadId);
        expect(oldVersion.vmfDownloadId).toEqual(newVersion.vmfDownloadId);
      });

      it('should allow updating zones when in testing and was approved', async () => {
        await prisma.mMap.update({
          where: { id: map.id },
          data: {
            status: MapStatus.PUBLIC_TESTING,
            info: { update: { approvedDate: new Date() } }
          }
        });

        const zones = structuredClone(ZonesStub);
        zones.tracks.main.zones.segments[0].name = 'Bob';

        await req.postAttach({
          url: `maps/${map.id}`,
          status: 201,
          data: {
            changelog: 'This is one is going to the moon',
            zones
          },
          validate: MapDto,
          token: u1Token
        });
      });

      it('should not allow updating zones that create leaderboards when in testing and was approved', async () => {
        await prisma.mMap.update({
          where: { id: map.id },
          data: {
            status: MapStatus.PUBLIC_TESTING,
            info: { update: { approvedDate: new Date() } }
          }
        });

        const zones = structuredClone(ZonesStub);
        zones.tracks.bonuses.push(zones.tracks.bonuses[0]);

        await req.postAttach({
          url: `maps/${map.id}`,
          status: 400,
          data: {
            changelog: 'New bonus aha',
            zones
          },
          token: u1Token
        });
      });

      it('should 400 if VMF file is invalid', async () => {
        await uploadBspToPreSignedUrl(bspBuffer, u1Token);

        await req.postAttach({
          url: `maps/${map.id}`,
          status: 400,
          data: { changelog: 'just hope it works', hasBSP: true },
          files: [
            {
              file: Buffer.from('{' + vmfBuffer.toString()),
              field: 'vmfs',
              fileName: 'surf_map.vmf'
            }
          ],
          token: u1Token
        });
      });

      it('should 400 if VMF file is invalid and BSP file is missing', async () => {
        await req.postAttach({
          url: `maps/${map.id}`,
          status: 400,
          data: { changelog: 'just hope it works' },
          files: [
            {
              file: Buffer.from('{' + vmfBuffer.toString()),
              field: 'vmfs',
              fileName: 'surf_map.vmf'
            }
          ],
          token: u1Token
        });
      });

      it('should 400 if neither VMF nor BSP nor zones are provided', async () => {
        await req.postAttach({
          url: `maps/${map.id}`,
          status: 400,
          data: { changelog: 'just hope it works' },
          token: u1Token
        });
      });

      it('should 400 if a VMF filename does not end in .vmf', async () => {
        await uploadBspToPreSignedUrl(bspBuffer, u1Token);

        await req.postAttach({
          url: `maps/${map.id}`,
          status: 400,
          data: { changelog: 'shoutout to winrar', hasBSP: true },
          files: [{ file: vmfBuffer, field: 'vmfs', fileName: 'surf_map.rar' }],
          token: u1Token
        });
      });

      it("should 400 if a VMF file is greater than the config's max vmf file size", async () => {
        await uploadBspToPreSignedUrl(bspBuffer, u1Token);

        await req.postAttach({
          url: `maps/${map.id}`,
          status: 400,
          data: { changelog: 'kill me' },
          files: [
            {
              file: Buffer.alloc(Config.limits.vmfSize + 1),
              field: 'vmfs',
              fileName: 'surf_map.vmf'
            }
          ],
          token: u1Token
        });
      });

      it('should 400 if the changelog is missing', async () => {
        await uploadBspToPreSignedUrl(bspBuffer, u1Token);

        await req.postAttach({
          url: `maps/${map.id}`,
          status: 400,
          data: { hasBSP: true },
          files: [{ file: vmfBuffer, field: 'vmfs', fileName: 'surf_map.vmf' }],
          token: u1Token
        });
      });

      it('should ignore BSP file if flag is not set', async () => {
        await uploadBspToPreSignedUrl(bspBuffer.subarray(0, -5), u1Token);

        const oldMap = await prisma.mMap.findUnique({
          where: { id: map.id },
          include: { currentVersion: true }
        });

        await req.postAttach({
          url: `maps/${map.id}`,
          status: 201,
          data: { changelog: 'there is no BSP in this one' },
          files: [{ file: vmfBuffer, field: 'vmfs', fileName: 'surf_map.vmf' }],
          token: u1Token
        });

        const newMap = await prisma.mMap.findUnique({
          where: { id: map.id },
          include: { currentVersion: true }
        });

        expect(oldMap.currentVersion.bspHash).toEqual(
          newMap.currentVersion.bspHash
        );
        expect(oldMap.currentVersion.bspDownloadId).toEqual(
          newMap.currentVersion.bspDownloadId
        );
      });

      it('should 400 if flag is set but BSP was not submitted', async () => {
        const [file] = await fileStore.list(`upload_tmp/${u1.id}`);
        if (file) {
          await fileStore.delete(file);
        }

        await req.postAttach({
          url: `maps/${map.id}`,
          status: 400,
          data: {
            changelog: 'there is no BSP in this one either',
            hasBSP: true
          },
          files: [{ file: vmfBuffer, field: 'vmfs', fileName: 'surf_map.vmf' }],
          token: u1Token
        });
      });

      it('should 409 if map with BSP hash already used by other map gets submitted', async () => {
        const createInput2 = structuredClone(createInput);
        // Pass unique name invariant.
        createInput2.name = 'surf_best';
        // Pretend that previous BSP version is actually unique.
        const map2 = await db.createMap(createInput2, true);

        await uploadBspToPreSignedUrl(bspBuffer, u1Token);

        await req.postAttach({
          url: `maps/${map2.id}`,
          status: 409,
          data: { changelog: 'totally original BSP i swear', hasBSP: true },
          token: u1Token
        });
      });

      for (const status of [MapStatus.APPROVED, MapStatus.DISABLED]) {
        it(`should 403 if the map status is ${MapStatus[status]}`, async () => {
          await prisma.mMap.update({ where: { id: map.id }, data: { status } });

          await req.postAttach({
            url: `maps/${map.id}`,
            status: 403,
            data: { changelog: 'awoooooga' },
            token: u1Token
          });

          await prisma.mMap.update({
            where: { id: map.id },
            data: { status: MapStatus.PRIVATE_TESTING }
          });
        });
      }

      it('should wipe leaderboards if resetLeaderboards is true', async () => {
        await prisma.leaderboard.create({
          data: {
            mmap: { connect: { id: map.id } },
            gamemode: Gamemode.AHOP,
            trackType: TrackType.MAIN,
            trackNum: 1,
            style: 0,
            type: LeaderboardType.IN_SUBMISSION,
            runs: {
              create: {
                userID: u1.id,
                time: 1,
                splits: {},
                rank: 1
              }
            }
          }
        });

        expect(
          await prisma.leaderboardRun.findMany({
            where: { mapID: map.id }
          })
        ).toHaveLength(1);

        await uploadBspToPreSignedUrl(bspBuffer, u1Token);

        await req.postAttach({
          url: `maps/${map.id}`,
          status: 201,
          data: {
            changelog: 'all your runs SUCK',
            resetLeaderboards: true,
            hasBSP: true
          },
          validate: MapDto,
          token: u1Token
        });

        expect(
          await prisma.leaderboardRun.findMany({
            where: { mapID: map.id }
          })
        ).toHaveLength(0);
      });

      it('should wipe leaderboards if resetLeaderboards is false or undefined', async () => {
        await prisma.leaderboard.create({
          data: {
            mmap: { connect: { id: map.id } },
            gamemode: Gamemode.RJ,
            trackType: TrackType.MAIN,
            trackNum: 1,
            style: 0,
            type: LeaderboardType.IN_SUBMISSION,
            runs: {
              create: {
                userID: u1.id,
                time: 1,
                splits: {},
                rank: 1
              }
            }
          }
        });

        expect(
          await prisma.leaderboardRun.findMany({
            where: { mapID: map.id }
          })
        ).toHaveLength(1);

        await uploadBspToPreSignedUrl(bspBuffer, u1Token);

        await req.postAttach({
          url: `maps/${map.id}`,
          status: 201,
          data: {
            changelog: 'damn these runs are great. i love you guys',
            resetLeaderboards: false,
            hasBSP: true
          },
          validate: MapDto,
          token: u1Token
        });

        await uploadBspToPreSignedUrl(bspBuffer, u1Token);

        await req.postAttach({
          url: `maps/${map.id}`,
          status: 201,
          data: { changelog: 'im so happy right now', hasBSP: true },
          validate: MapDto,
          token: u1Token
        });

        expect(
          await prisma.leaderboardRun.findMany({
            where: { mapID: map.id }
          })
        ).toHaveLength(1);
      });

      it('should block resetting leaderboards if the map has previously been approved', async () => {
        await prisma.mMap.update({
          where: { id: map.id },
          data: {
            submission: {
              update: {
                type: MapSubmissionType.ORIGINAL,
                dates: {
                  create: [
                    {
                      status: MapStatus.APPROVED,
                      date: new Date(Date.now() - 3000),
                      user: { connect: { id: u1.id } }
                    },
                    {
                      status: MapStatus.DISABLED,
                      date: new Date(Date.now() - 2000),
                      user: { connect: { id: u1.id } }
                    },
                    {
                      status: MapStatus.PRIVATE_TESTING,
                      date: new Date(Date.now() - 1000),
                      user: { connect: { id: u1.id } }
                    }
                  ]
                }
              }
            },
            info: {
              update: {
                data: {
                  approvedDate: new Date(Date.now() - 3000)
                }
              }
            }
          }
        });

        await prisma.leaderboard.create({
          data: {
            mmap: { connect: { id: map.id } },
            gamemode: Gamemode.AHOP,
            trackType: TrackType.MAIN,
            trackNum: 1,
            style: 0,
            type: LeaderboardType.IN_SUBMISSION,
            runs: {
              create: {
                userID: u1.id,
                time: 1,
                splits: {},
                rank: 1
              }
            }
          }
        });

        expect(
          await prisma.leaderboardRun.findMany({
            where: { mapID: map.id }
          })
        ).toHaveLength(1);

        await uploadBspToPreSignedUrl(bspBuffer, u1Token);

        await req.postAttach({
          url: `maps/${map.id}`,
          status: 403,
          data: {
            changelog: 'PLEASE let me delete these runs',
            resetLeaderboards: true,
            hasBSP: true
          },
          token: u1Token
        });

        expect(
          await prisma.leaderboardRun.findMany({
            where: { mapID: map.id }
          })
        ).toHaveLength(1);
      });

      it('should 400 if map id is bigger then max 32-bit integer', () =>
        req.post({ url: `maps/${2 ** 31}`, status: 400, token: u1Token }));

      it('should 401 when no access token is provided', () =>
        req.unauthorizedTest('maps/1', 'post'));
    });

    describe('PATCH', () => {
      let user: User,
        token: string,
        u2: User,
        u2Token: string,
        adminToken: string,
        mod: User,
        modToken: string;
      let createMapData = undefined satisfies Partial<Prisma.MMapCreateInput>;

      beforeAll(async () => {
        [[user, token], [u2, u2Token], adminToken, [mod, modToken]] =
          await Promise.all([
            db.createAndLoginUser(),
            db.createAndLoginUser(),
            db.loginNewUser({ data: { roles: Role.ADMIN } }),
            db.createAndLoginUser({ data: { roles: Role.MODERATOR } })
          ]);

        createMapData = {
          name: 'surf_map',
          submitter: { connect: { id: user.id } },
          submission: {
            create: {
              type: MapSubmissionType.ORIGINAL,
              dates: {
                create: [
                  {
                    status: MapStatus.PRIVATE_TESTING,
                    date: new Date(),
                    user: { connect: { id: user.id } }
                  }
                ]
              },
              suggestions: [
                {
                  trackType: TrackType.MAIN,
                  trackNum: 1,
                  gamemode: Gamemode.RJ,
                  tier: 1,
                  type: LeaderboardType.RANKED,
                  tags: [MapTag.Sync]
                },
                {
                  trackType: TrackType.BONUS,
                  trackNum: 1,
                  gamemode: Gamemode.DEFRAG_CPM,
                  tier: 1,
                  type: LeaderboardType.UNRANKED
                }
              ]
            }
          },
          versions: {
            create: {
              zones: ZonesStubString,
              versionNum: 1,
              bspHash: createSha1Hash(Buffer.from('shashashs')),
              submitter: { connect: { id: user.id } }
            }
          },
          leaderboards: { createMany: { data: [] } },
          reviews: {
            createMany: {
              // Create approving review by default so can enter FA
              data: [{ mainText: 'good', approves: true, reviewerID: u2.id }]
            }
          }
        };
      });

      afterAll(() => db.cleanup('user'));

      afterEach(() =>
        Promise.all([db.cleanup('mMap'), fileStore.deleteDirectory('maplist')])
      );

      for (const status of MapStatuses.IN_SUBMISSION) {
        it(`should allow the submitter to change most data during ${MapStatus[status]}`, async () => {
          const map = await db.createMap({ ...createMapData, status });

          await req.patch({
            url: `maps/${map.id}`,
            status: 204,
            body: {
              name: 'surf_ostrich',
              submissionType: MapSubmissionType.PORT,
              info: {
                description:
                  'Ostriches are large flightless birds. They are the heaviest living birds, and lay the largest eggs of any living land animal.',
                youtubeID: '8k-zNGuiatA'
              },
              suggestions: [
                {
                  trackType: TrackType.MAIN,
                  trackNum: 1,
                  gamemode: Gamemode.CONC,
                  tier: 1,
                  type: LeaderboardType.RANKED,
                  tags: [MapTag.Juggle]
                },
                {
                  trackType: TrackType.BONUS,
                  trackNum: 1,
                  gamemode: Gamemode.DEFRAG_CPM,
                  tier: 1,
                  type: LeaderboardType.UNRANKED
                }
              ],
              placeholders: [{ type: MapCreditType.CONTRIBUTOR, alias: 'eee' }]
            },
            token
          });

          const updatedMap = await prisma.mMap.findUnique({
            where: { id: map.id },
            include: { info: true, submission: true }
          });

          expect(updatedMap).toMatchObject({
            name: 'surf_ostrich',
            info: {
              description:
                'Ostriches are large flightless birds. They are the heaviest living birds, and lay the largest eggs of any living land animal.',
              youtubeID: '8k-zNGuiatA'
            },
            submission: {
              type: MapSubmissionType.PORT,
              suggestions: [
                {
                  trackType: TrackType.MAIN,
                  trackNum: 1,
                  gamemode: Gamemode.CONC,
                  tier: 1,
                  type: LeaderboardType.RANKED,
                  tags: [MapTag.Juggle]
                },
                {
                  trackType: TrackType.BONUS,
                  trackNum: 1,
                  gamemode: Gamemode.DEFRAG_CPM,
                  tier: 1,
                  type: LeaderboardType.UNRANKED
                }
              ],
              placeholders: [{ type: MapCreditType.CONTRIBUTOR, alias: 'eee' }]
            }
          });
        });
      }

      it('should always 403 if map is APPROVED', async () => {
        const map = await db.createMap({
          ...createMapData,
          status: MapStatus.APPROVED,
          info: {
            create: {
              creationDate: new Date(),
              description: 'Maps have a minimum description length now!!',
              approvedDate: new Date()
            }
          }
        });

        await req.patch({
          url: `maps/${map.id}`,
          status: 403,
          body: {
            info: {
              description: 'Fuck ostriches fuck ostriches fuck ostriches'
            }
          },
          token
        });
      });

      it('should always 403 if map is DISABLED', async () => {
        const map = await db.createMap({
          ...createMapData,
          status: MapStatus.DISABLED
        });

        await req.patch({
          url: `maps/${map.id}`,
          status: 403,
          body: { info: { youtubeID: 'rq9WnDq0ap8' } },
          token
        });
      });

      const statuses = Enum.values(MapStatus);
      // Storing number tuple won't pass .has
      const validChanges = new Set([
        MapStatus.PRIVATE_TESTING + ',' + MapStatus.CONTENT_APPROVAL,
        MapStatus.CONTENT_APPROVAL + ',' + MapStatus.PRIVATE_TESTING,
        MapStatus.FINAL_APPROVAL + ',' + MapStatus.PUBLIC_TESTING
      ]);

      for (const s1 of statuses) {
        for (const s2 of statuses.filter((s) => s !== s1)) {
          const shouldPass = validChanges.has(s1 + ',' + s2);

          it(`should ${
            shouldPass ? '' : 'not '
          }allow a user to change their map from ${MapStatus[s1]} to ${
            MapStatus[s2]
          }`, async () => {
            const map = await db.createMap({
              ...createMapData,
              status: s1,
              submission: {
                create: {
                  type: MapSubmissionType.PORT,
                  suggestions: [
                    {
                      trackType: TrackType.MAIN,
                      trackNum: 1,
                      gamemode: Gamemode.CONC,
                      tier: 1,
                      rtype: LeaderboardType.RANKED
                    },
                    {
                      trackType: TrackType.BONUS,
                      trackNum: 1,
                      gamemode: Gamemode.DEFRAG_CPM,
                      tier: 1,
                      type: LeaderboardType.RANKED
                    }
                  ],
                  dates: {
                    create: [
                      {
                        status: s1,
                        date: new Date(),
                        user: { connect: { id: user.id } }
                      }
                    ]
                  }
                }
              },
              versions: {
                create: {
                  zones: ZonesStubString,
                  versionNum: 1,
                  bspHash: createSha1Hash(Buffer.from('shashashs')),
                  submitter: { connect: { id: user.id } }
                }
              }
            });

            await req.patch({
              url: `maps/${map.id}`,
              status: shouldPass ? 204 : 403,
              body: { status: s2 },
              token
            });

            if (shouldPass) {
              const updatedMap = await prisma.mMap.findUnique({
                where: { id: map.id }
              });
              expect(updatedMap.status).toBe(s2);
            }
          });
        }
      }

      it('should delete pending test requests and their notifications changing from PRIVATE_TESTING to CONTENT_APPROVAL', async () => {
        const map = await db.createMap({
          ...createMapData,
          status: MapStatus.PRIVATE_TESTING,
          testInvites: {
            createMany: {
              data: [
                {
                  userID: u2.id,
                  state: MapTestInviteState.UNREAD
                },
                {
                  userID: mod.id,
                  state: MapTestInviteState.ACCEPTED
                }
              ]
            }
          }
        });
        await prisma.notification.create({
          data: {
            notifiedUserID: u2.id,
            type: NotificationType.MAP_TESTING_INVITE,
            mapID: map.id,
            userID: map.submitterID
          }
        });
        await req.patch({
          url: `maps/${map.id}`,
          status: 204,
          body: { status: MapStatus.CONTENT_APPROVAL },
          token
        });
        const notifs = await prisma.notification.findMany({
          where: {
            type: NotificationType.MAP_TESTING_INVITE,
            mapID: map.id
          }
        });
        expect(notifs).toHaveLength(0);
        const updatedMap = await prisma.mMap.findUnique({
          where: { id: map.id },
          include: { testInvites: true }
        });
        expect(updatedMap.testInvites).toMatchObject([
          { userID: mod.id, state: MapTestInviteState.ACCEPTED }
        ]);
      });

      it("should allow a user to change to their map from PUBLIC_TESTING to FINAL_APPROVAL if it's been in testing for required time period", async () => {
        const map = await db.createMap({
          ...createMapData,
          status: MapStatus.PUBLIC_TESTING,
          submission: {
            create: {
              dates: {
                create: [
                  {
                    status: MapStatus.PUBLIC_TESTING,
                    date: new Date(
                      Date.now() - (MIN_PUBLIC_TESTING_DURATION + 1000)
                    ),
                    user: { connect: { id: user.id } }
                  }
                ]
              },
              type: MapSubmissionType.PORT,
              suggestions: [
                {
                  trackType: TrackType.MAIN,
                  trackNum: 1,
                  gamemode: Gamemode.DEFRAG_CPM,
                  tier: 10,
                  type: LeaderboardType.RANKED
                },
                {
                  trackType: TrackType.BONUS,
                  trackNum: 1,
                  gamemode: Gamemode.DEFRAG_CPM,
                  tier: 1,
                  type: LeaderboardType.RANKED
                }
              ]
            }
          },
          versions: {
            create: {
              zones: ZonesStubString,
              versionNum: 1,
              bspHash: createSha1Hash(Buffer.from('shashashs')),
              submitter: { connect: { id: user.id } }
            }
          }
        });

        await req.patch({
          url: `maps/${map.id}`,
          status: 204,
          body: { status: MapStatus.FINAL_APPROVAL },
          token
        });

        const updatedMap = await prisma.mMap.findUnique({
          where: { id: map.id }
        });
        expect(updatedMap.status).toBe(MapStatus.FINAL_APPROVAL);
      });

      it("should not allow a user to change to their map from PUBLIC_TESTING to FINAL_APPROVAL if it's not been in testing for required time period", async () => {
        const map = await db.createMap({
          ...createMapData,
          status: MapStatus.PUBLIC_TESTING,
          submission: {
            create: {
              dates: {
                create: [
                  {
                    status: MapStatus.PUBLIC_TESTING,
                    date: new Date(Date.now() - 1000),
                    user: { connect: { id: user.id } }
                  }
                ]
              },
              type: MapSubmissionType.PORT,
              suggestions: [
                {
                  trackType: TrackType.MAIN,
                  trackNum: 1,
                  gamemode: Gamemode.DEFRAG_CPM,
                  tier: 10,
                  type: LeaderboardType.RANKED
                },
                {
                  trackType: TrackType.BONUS,
                  trackNum: 1,
                  gamemode: Gamemode.DEFRAG_CPM,
                  tier: 1,
                  type: LeaderboardType.RANKED
                }
              ]
            }
          },
          versions: {
            create: {
              zones: ZonesStubString,
              versionNum: 1,
              bspHash: createSha1Hash(Buffer.from('shashashs')),
              submitter: { connect: { id: user.id } }
            }
          }
        });

        await req.patch({
          url: `maps/${map.id}`,
          status: 403,
          body: { status: MapStatus.FINAL_APPROVAL },
          token
        });
      });

      it("should allow a mod to change to their map from PUBLIC_TESTING to FINAL_APPROVAL if it's not been in testing for required time period", async () => {
        const map = await db.createMap({
          ...createMapData,
          status: MapStatus.PUBLIC_TESTING,
          submitter: { connect: { id: mod.id } },
          submission: {
            create: {
              dates: {
                create: [
                  {
                    status: MapStatus.PUBLIC_TESTING,
                    date: new Date(Date.now() - 1000),
                    user: { connect: { id: mod.id } }
                  }
                ]
              },
              type: MapSubmissionType.PORT,
              suggestions: [
                {
                  trackType: TrackType.MAIN,
                  trackNum: 1,
                  gamemode: Gamemode.DEFRAG_CPM,
                  tier: 10,
                  type: LeaderboardType.RANKED
                },
                {
                  trackType: TrackType.BONUS,
                  trackNum: 1,
                  gamemode: Gamemode.DEFRAG_CPM,
                  tier: 1,
                  type: LeaderboardType.RANKED
                }
              ]
            }
          },
          versions: {
            create: {
              zones: ZonesStubString,
              versionNum: 1,
              bspHash: createSha1Hash(Buffer.from('shashashs')),
              submitter: { connect: { id: user.id } }
            }
          }
        });

        await req.patch({
          url: `maps/${map.id}`,
          status: 204,
          body: { status: MapStatus.FINAL_APPROVAL },
          token: modToken
        });
      });

      it('should allow changing from PUBLIC_TESTING to FINAL_APPROVAL if it has a resolved review', async () => {
        const map = await db.createMap({
          ...createMapData,
          status: MapStatus.PUBLIC_TESTING,
          submission: {
            create: {
              dates: {
                create: [
                  {
                    status: MapStatus.PUBLIC_TESTING,
                    date: new Date(
                      Date.now() - (MIN_PUBLIC_TESTING_DURATION + 1000)
                    ),
                    user: { connect: { id: user.id } }
                  }
                ]
              },
              type: MapSubmissionType.PORT,
              suggestions: [
                {
                  trackType: TrackType.MAIN,
                  trackNum: 1,
                  gamemode: Gamemode.DEFRAG_CPM,
                  tier: 10,
                  type: LeaderboardType.RANKED
                },
                {
                  trackType: TrackType.BONUS,
                  trackNum: 1,
                  gamemode: Gamemode.DEFRAG_CPM,
                  tier: 1,
                  type: LeaderboardType.RANKED
                }
              ]
            }
          }
        });

        await prisma.mapReview.create({
          data: {
            mapID: map.id,
            reviewerID: mod.id,
            mainText: 'help me',
            resolved: true
          }
        });

        await req.patch({
          url: `maps/${map.id}`,
          status: 204,
          body: { status: MapStatus.FINAL_APPROVAL },
          token
        });
      });

      it('should allow changing from PUBLIC_TESTING to FINAL_APPROVAL if it has a neutral review', async () => {
        const data = structuredClone(createMapData);

        data.submission.create.dates.create.push({
          status: MapStatus.PUBLIC_TESTING,
          date: new Date(Date.now() - (MIN_PUBLIC_TESTING_DURATION + 1000)),
          user: { connect: { id: user.id } }
        });

        const map = await db.createMap({
          ...data,
          status: MapStatus.PUBLIC_TESTING
        });

        await prisma.mapReview.create({
          data: {
            mapID: map.id,
            reviewerID: mod.id,
            mainText: 'where am i',
            resolved: null
          }
        });

        await req.patch({
          url: `maps/${map.id}`,
          status: 204,
          body: { status: MapStatus.FINAL_APPROVAL },
          token
        });
      });

      it('should not allow changing from PUBLIC_TESTING to FINAL_APPROVAL if it has unresolved reviews', async () => {
        const data = structuredClone(createMapData);
        data.submission.create.dates.create.push({
          status: MapStatus.PUBLIC_TESTING,
          date: new Date(Date.now() - (MIN_PUBLIC_TESTING_DURATION + 1000)),
          user: { connect: { id: user.id } }
        });

        const map = await db.createMap({
          ...data,
          status: MapStatus.PUBLIC_TESTING
        });

        await prisma.mapReview.create({
          data: {
            mapID: map.id,
            reviewerID: mod.id,
            mainText: 'theres a bomb in my car',
            resolved: false
          }
        });

        await req.patch({
          url: `maps/${map.id}`,
          status: 403,
          body: { status: MapStatus.FINAL_APPROVAL },
          token
        });
      });

      it("should not allow changing from PUBLIC_TESTING to FINAL_APPROVAL if map doesn't have at least one approving review", async () => {
        const data = structuredClone(createMapData);
        data.status = MapStatus.PUBLIC_TESTING;
        data.reviews = { createMany: { data: [] } };
        data.submission.create.dates.create.push({
          status: MapStatus.PUBLIC_TESTING,
          date: new Date(Date.now() - (MIN_PUBLIC_TESTING_DURATION + 1000)),
          user: { connect: { id: user.id } }
        });

        const map = await db.createMap(data);

        await req.patch({
          url: `maps/${map.id}`,
          status: 403,
          body: { status: MapStatus.FINAL_APPROVAL },
          token
        });
      });

      it("should allow changing from PUBLIC_TESTING to FINAL_APPROVAL if map doesn't have at least one approving review if submitter is a mod", async () => {
        const data = structuredClone(createMapData);
        data.status = MapStatus.PUBLIC_TESTING;
        data.reviews = { createMany: { data: [] } };
        data.submitter = { connect: { id: mod.id } };
        data.submission.create.dates.create.push({
          status: MapStatus.PUBLIC_TESTING,
          date: new Date(Date.now() - (MIN_PUBLIC_TESTING_DURATION + 1000)),
          user: { connect: { id: user.id } }
        });

        const map = await db.createMap(data);

        await req.patch({
          url: `maps/${map.id}`,
          status: 204,
          body: { status: MapStatus.FINAL_APPROVAL },
          token: modToken
        });
      });

      it('should generate new leaderboards if suggestions change', async () => {
        const map = await db.createMap({
          ...createMapData,
          status: MapStatus.PRIVATE_TESTING
        });

        await prisma.leaderboard.createMany({
          data: ZonesStubLeaderboards.map((lb) => ({
            mapID: map.id,
            style: 0,
            type: LeaderboardType.IN_SUBMISSION,
            ...lb
          }))
        });

        await db.createLbRun({
          map,
          user,
          rank: 1,
          gamemode: Gamemode.CONC,
          trackType: TrackType.MAIN
        });

        // Map starts with main track leaderboards for modes compat with RJ
        // (not bhop), main track suggestion changes to CPM Defrag,
        // which *does* support bhop, check leaderboards are created.
        // Bonus is CPM, so we should have 1 LB before, 4 after.

        expect(
          await prisma.leaderboard.findMany({
            where: { mapID: map.id, gamemode: Gamemode.BHOP, style: 0 }
          })
        ).toHaveLength(1);

        // Conc LBs shouldn't change

        expect(
          await prisma.leaderboard.findMany({
            where: { mapID: map.id, gamemode: Gamemode.CONC }
          })
        ).toHaveLength(4);

        await req.patch({
          url: `maps/${map.id}`,
          status: 204,
          body: {
            info: {
              youtubeID: 'Ea992vtCqTs'
            },
            suggestions: [
              {
                trackType: TrackType.MAIN,
                trackNum: 1,
                gamemode: Gamemode.DEFRAG_CPM,
                tier: 10,
                type: LeaderboardType.RANKED
              },
              {
                trackType: TrackType.BONUS,
                trackNum: 1,
                gamemode: Gamemode.DEFRAG_CPM,
                tier: 1,
                type: LeaderboardType.RANKED
              }
            ]
          },
          token
        });

        expect(
          await prisma.leaderboard.findMany({
            where: {
              mapID: map.id,
              gamemode: Gamemode.BHOP,
              style: 0,
              type: LeaderboardType.IN_SUBMISSION
            }
          })
        ).toHaveLength(4);

        expect(
          await prisma.leaderboard.findMany({
            where: {
              mapID: map.id,
              gamemode: Gamemode.CONC,
              style: 0,
              type: LeaderboardType.IN_SUBMISSION
            }
          })
        ).toHaveLength(4);

        // Check existing runs weren't deleted

        expect(
          await prisma.leaderboardRun.findMany({
            where: { mapID: map.id, gamemode: Gamemode.CONC }
          })
        ).toHaveLength(1);
      });

      it('should not allow updating live leaderabords even when in testing', async () => {
        const map = await db.createMap({
          ...createMapData,
          status: MapStatus.PUBLIC_TESTING
        });

        await req.patch({
          url: `maps/${map.id}`,
          status: 403,
          body: {
            leaderboards: [
              {
                trackType: TrackType.MAIN,
                trackNum: 1,
                gamemode: Gamemode.RJ,
                tier: 1,
                type: LeaderboardType.RANKED
              }
            ]
          },
          token
        });
      });

      it('should update the map list version for submissions', async () => {
        const oldListVersion = await req.get({
          url: 'maps/maplistversion',
          status: 200,
          token
        });

        const map = await db.createMap({
          ...createMapData,
          status: MapStatus.PRIVATE_TESTING
        });

        await req.patch({
          url: `maps/${map.id}`,
          status: 204,
          body: { status: MapStatus.CONTENT_APPROVAL },
          token
        });

        await checkScheduledMapListUpdates();

        const newListVersion = await req.get({
          url: 'maps/maplistversion',
          status: 200,
          token
        });

        expect(newListVersion.body.approved).toBe(oldListVersion.body.approved);
        expect(newListVersion.body.submissions).toBe(
          oldListVersion.body.submissions + 1
        );
      });

      it('should not update the map list version if the status doesnt change', async () => {
        const oldListVersion = await req.get({
          url: 'maps/maplistversion',
          status: 200,
          token
        });

        const map = await db.createMap({
          ...createMapData,
          status: MapStatus.PRIVATE_TESTING
        });

        await req.patch({
          url: `maps/${map.id}`,
          status: 204,
          body: {
            status: MapStatus.PRIVATE_TESTING,
            info: {
              youtubeID: '64X4cuAR2fI'
            }
          },
          token
        });

        await checkScheduledMapListUpdates();

        const newListVersion = await req.get({
          url: 'maps/maplistversion',
          status: 200,
          token
        });

        expect(newListVersion.body.approved).toBe(oldListVersion.body.approved);
        expect(newListVersion.body.submissions).toBe(
          oldListVersion.body.submissions
        );
      });

      it('should 400 for invalid suggestions', async () => {
        const map = await db.createMap({
          ...createMapData,
          submitter: { connect: { id: user.id } },
          status: MapStatus.PRIVATE_TESTING
        });

        // Lots of checks here but is unit tested, just remove the bonus
        await req.patch({
          url: `maps/${map.id}`,
          status: 400,
          body: {
            suggestions: [
              {
                trackType: TrackType.MAIN,
                trackNum: 1,
                gamemode: Gamemode.DEFRAG_CPM,
                comment: 'FUCK!!!!',
                tier: 10,
                type: LeaderboardType.RANKED
              }
            ]
          },
          token
        });

        await req.patch({
          url: `maps/${map.id}`,
          status: 400,
          body: {
            suggestions: [
              {
                trackType: TrackType.MAIN,
                trackNum: 1,
                gamemode: Gamemode.DEFRAG_CPM,
                comment: 'FUCK!!!!',
                tier: 10,
                type: LeaderboardType.HIDDEN
              },
              {
                trackType: TrackType.BONUS,
                trackNum: 1,
                gamemode: Gamemode.DEFRAG_CPM,
                tier: 1,
                type: LeaderboardType.IN_SUBMISSION
              }
            ]
          },
          token
        });
      });

      it('should 400 if suggestions and zones dont match up', async () => {
        const map = await db.createMap({
          ...createMapData,
          status: MapStatus.PRIVATE_TESTING,
          submission: {
            create: {
              type: MapSubmissionType.PORT,
              // No bonus, so should fail
              suggestions: [
                {
                  trackType: TrackType.MAIN,
                  trackNum: 1,
                  gamemode: Gamemode.SURF,
                  tier: 10,
                  type: LeaderboardType.RANKED
                }
              ]
            }
          },
          versions: {
            create: {
              // Has a bonus
              zones: ZonesStubString,
              versionNum: 1,
              bspHash: createSha1Hash(Buffer.from('shashashs')),
              submitter: { connect: { id: user.id } }
            }
          }
        });

        // Try change literally anything, it should 400.
        await req.patch({
          url: `maps/${map.id}`,
          status: 400,
          body: { submission: MapSubmissionType.ORIGINAL },
          token
        });
      });

      it('should return 400 if the status flag is invalid', async () => {
        const map = await db.createMap({
          submitter: { connect: { id: user.id } }
        });

        await req.patch({
          url: `maps/${map.id}`,
          status: 400,
          body: { status: 3000 },
          token
        });
      });

      it('should return 403 if the map was not submitted by that user', async () => {
        const map = await db.createMap({
          status: MapStatus.PRIVATE_TESTING
        });

        await req.patch({
          url: `maps/${map.id}`,
          status: 403,
          body: { status: MapStatus.CONTENT_APPROVAL },
          token: u2Token
        });
      });

      it('should return 403 if the map was not submitted by that user even for an admin', async () => {
        const map = await db.createMap({
          status: MapStatus.PRIVATE_TESTING
        });

        await req.patch({
          url: `maps/${map.id}`,
          status: 403,
          body: { status: MapStatus.CONTENT_APPROVAL },
          token: adminToken
        });
      });

      it('should 404 when the map is not found', () =>
        req.patch({
          url: `maps/${NULL_ID}`,
          status: 404,
          body: { status: MapStatus.CONTENT_APPROVAL },
          token
        }));

      it('should 401 when no access token is provided', () =>
        req.unauthorizedTest('maps/1', 'patch'));
    });

    describe('DELETE', () => {
      let user: User,
        token: string,
        map: MMap & {
          currentVersion: MapVersion;
        };

      beforeAll(async () => {
        [user, token] = await db.createAndLoginUser();
      });

      beforeEach(async () => {
        map = await db.createMap({
          name: 'surf_man',
          status: MapStatus.CONTENT_APPROVAL,
          submitter: { connect: { id: user.id } },
          versions: {
            create: {
              zones: ZonesStubString,
              versionNum: 1,
              bspDownloadId: db.uuid(),
              vmfDownloadId: db.uuid(),
              bspHash: createSha1Hash(Buffer.from('shashashs')),
              submitter: { connect: { id: user.id } }
            }
          }
        });
      });

      afterEach(() =>
        Promise.all([
          db.cleanup('mMap', 'leaderboardRun'),
          fileStore.deleteDirectory('/maplist')
        ])
      );

      afterAll(() => db.cleanup('leaderboardRun', 'user', 'mMap'));

      it('should successfully delete a map and all related stored data if map is in submission', async () => {
        const imgID = db.uuid();
        await prisma.mMap.update({
          where: { id: map.id },
          data: { images: [imgID] }
        });

        await fileStore.add(
          bspPath(map.currentVersion.bspDownloadId),
          readFileSync(__dirname + '/../files/map.bsp')
        );

        await fileStore.add(
          vmfsPath(map.currentVersion.vmfDownloadId),
          Buffer.from('bup')
        );

        for (const sizePath of [
          imgSmallPath,
          imgMediumPath,
          imgLargePath,
          imgXlPath
        ]) {
          await fileStore.add(
            sizePath(imgID),
            readFileSync(__dirname + '/../files/image_jpg.jpg')
          );
        }

        for (const sizePath of [
          imgSmallPath,
          imgMediumPath,
          imgLargePath,
          imgXlPath
        ]) {
          expect(await fileStore.exists(sizePath(imgID))).toBeTruthy();
        }

        const run = await db.createLbRun({
          map: map,
          user,
          time: 1,
          rank: 1
        });
        await fileStore.add(runPath(run.replayHash), Buffer.alloc(123));

        await req.del({
          url: `maps/${map.id}`,
          status: 204,
          token
        });

        const updated = await prisma.mMap.findFirst({
          where: { id: map.id }
        });
        const versions = await prisma.mapVersion.findMany({
          where: { mapID: map.id }
        });

        expect(updated).toBeNull();
        expect(versions).toHaveLength(0);
        expect(
          await fileStore.exists(bspPath(map.currentVersion.bspDownloadId))
        ).toBeFalsy();
        expect(
          await fileStore.exists(vmfsPath(map.currentVersion.vmfDownloadId))
        ).toBeFalsy();

        const relatedRuns = await prisma.leaderboardRun.findMany({
          where: { mapID: map.id }
        });
        expect(relatedRuns).toHaveLength(0);
        expect(await fileStore.exists(runPath(run.replayHash))).toBeFalsy();

        for (const sizePath of [
          imgSmallPath,
          imgMediumPath,
          imgLargePath,
          imgXlPath
        ]) {
          expect(await fileStore.exists(sizePath(imgID))).toBeFalsy();
        }
      });

      it('should update the map list version', async () => {
        await checkScheduledMapListUpdates();

        const oldVersion = await req.get({
          url: 'maps/maplistversion',
          status: 200,
          token
        });

        await req.del({
          url: `maps/${map.id}`,
          status: 204,
          token
        });

        await checkScheduledMapListUpdates();

        const newVersion = await req.get({
          url: 'maps/maplistversion',
          status: 200,
          token
        });

        expect(newVersion.body.submissions).toBe(
          oldVersion.body.submissions + 1
        );
        expect(newVersion.body.approved).toBe(oldVersion.body.approved);

        const { ident, numMaps, data } = await fileStore.getMapListVersion(
          FlatMapList.SUBMISSION,
          newVersion.body.submissions
        );
        expect(ident).toBe('MSML');
        expect(numMaps).toBe(0);
        expect(data).toHaveLength(0);
      });

      it('should 403 if map is approved', async () => {
        await prisma.mMap.update({
          where: { id: map.id },
          data: {
            status: MapStatus.APPROVED,
            info: { update: { approvedDate: new Date() } }
          }
        });

        await req.del({
          url: `maps/${map.id}`,
          status: 403,
          token
        });
      });

      it('should 403 if map was ever approved', async () => {
        await prisma.mapInfo.update({
          where: { mapID: map.id },
          data: { approvedDate: new Date() }
        });

        await req.del({
          url: `maps/${map.id}`,
          status: 403,
          token
        });
      });

      it('should 403 if user is not a submitter of the map', async () => {
        const u1Token = await db.loginNewUser();

        await req.del({
          url: `maps/${map.id}`,
          status: 403,
          token: u1Token
        });
      });

      it('should 404 when the map is not found', () =>
        req.del({
          url: `maps/${NULL_ID}`,
          status: 404,
          token
        }));

      it('should 401 when no access token is provided', () =>
        req.unauthorizedTest('maps/1', 'del'));
    });
  });

  describe('maps/submissions', () => {
    describe('GET', () => {
      let u1: User,
        u1Token: string,
        u2: User,
        pubMap1,
        pubMap2,
        privMap,
        caMap,
        faMap,
        mapCreate: Partial<Prisma.MMapCreateInput>;

      beforeAll(async () => {
        [[u1, u1Token], u2] = await Promise.all([
          db.createAndLoginUser(),
          db.createUser()
        ]);

        mapCreate = {
          submission: {
            create: {
              type: MapSubmissionType.ORIGINAL,
              dates: {
                create: [
                  {
                    status: MapStatus.PRIVATE_TESTING,
                    date: new Date(),
                    user: { connect: { id: u1.id } }
                  }
                ]
              },
              suggestions: [
                {
                  track: 1,
                  trackType: TrackType.MAIN,
                  trackNum: 1,
                  gamemode: Gamemode.CONC,
                  tier: 1,
                  type: LeaderboardType.RANKED,
                  comment: 'My dad made this'
                }
              ]
            }
          },
          versions: {
            createMany: {
              data: [
                {
                  versionNum: 1,
                  bspHash: createSha1Hash('dogs'),
                  submitterID: u1.id
                },
                {
                  versionNum: 2,
                  bspHash: createSha1Hash('elves'),
                  submitterID: u1.id
                }
              ]
            }
          }
        };

        await db.createMap({ status: MapStatus.APPROVED });
        pubMap1 = await db.createMap({
          status: MapStatus.PUBLIC_TESTING,
          ...mapCreate,
          reviews: {
            create: {
              mainText: 'Appalling',
              reviewer: { connect: { id: u2.id } }
            }
          }
        });
        pubMap2 = await db.createMap({
          status: MapStatus.PUBLIC_TESTING,
          ...mapCreate
        });
        privMap = await db.createMap({
          status: MapStatus.PRIVATE_TESTING,
          ...mapCreate
        });
        faMap = await db.createMap({
          status: MapStatus.FINAL_APPROVAL,
          ...mapCreate
        });
        caMap = await db.createMap({
          status: MapStatus.CONTENT_APPROVAL,
          ...mapCreate
        });

        await Promise.all(
          [pubMap1, pubMap2, privMap].map((map) =>
            prisma.mMap.update({
              where: { id: map.id },
              data: { currentVersion: { connect: { id: map.versions[1].id } } }
            })
          )
        );
      });

      afterAll(() => db.cleanup('pastRun', 'leaderboardRun', 'user', 'mMap'));
      afterEach(() => db.cleanup('mapTestInvite', 'mapCredit'));

      it('should respond with map data', async () => {
        const res = await req.get({
          url: 'maps/submissions',
          status: 200,
          validatePaged: { type: MapDto },
          token: u1Token
        });

        for (const item of res.body.data) {
          [
            'submission',
            'id',
            'name',
            'status',
            'submitterID',
            'createdAt',
            'updatedAt'
          ].forEach((prop) => expect(item).toHaveProperty(prop));
        }
      });

      it('should be ordered by date', () =>
        req.sortByDateTest({
          url: 'maps/submissions',
          validate: MapDto,
          token: u1Token
        }));

      it('should respond with filtered map data using the take parameter', () =>
        req.takeTest({
          url: 'maps/submissions',
          validate: MapDto,
          token: u1Token
        }));

      it('should respond with filtered map data using the skip parameter', () =>
        req.skipTest({
          url: 'maps/submissions',
          validate: MapDto,
          token: u1Token
        }));

      it('should respond with filtered map data using the search parameter', async () => {
        const map = await db.createMap({
          name: 'ahop_asdf',
          status: MapStatus.PUBLIC_TESTING,
          ...mapCreate
        });

        await prisma.mMap.update({
          where: { id: map.id },
          data: { name: 'aaaaa' }
        });

        await req.searchTest({
          url: 'maps/submissions',
          token: u1Token,
          searchMethod: 'contains',
          searchString: 'aa',
          searchPropertyName: 'name',
          validate: { type: MapDto, count: 1 }
        });

        await prisma.mMap.delete({
          where: { id: map.id }
        });
      });

      it('should respond with filtered map data using the searchStartsWith parameter', async () => {
        const map = await db.createMap({
          name: 'surf_the_dog',
          status: MapStatus.PUBLIC_TESTING,
          ...mapCreate
        });

        await prisma.mMap.update({
          where: { id: map.id },
          data: { name: 'bingus' }
        });

        await req.searchTest({
          url: 'maps/submissions',
          token: u1Token,
          searchMethod: 'startsWith',
          searchString: 'bingu',
          searchPropertyName: 'name',
          searchQueryName: 'searchStartsWith',
          validate: { type: MapDto, count: 1 }
        });

        await prisma.mMap.delete({
          where: { id: map.id }
        });
      });

      it('should respond with filtered map data using the submitter id parameter', async () => {
        await prisma.mMap.update({
          where: { id: pubMap1.id },
          data: { submitterID: u2.id }
        });

        const res = await req.get({
          url: 'maps/submissions',
          status: 200,
          query: { submitterID: u2.id },
          validatePaged: { type: MapDto, count: 1 },
          token: u1Token
        });

        expect(res.body.data[0]).toMatchObject({
          submitterID: u2.id,
          id: pubMap1.id
        });

        await prisma.mMap.update({
          where: { id: pubMap1.id },
          data: { submitterID: null }
        });
      });

      it('should respond with expanded current version data using the currentVersion expand parameter', () =>
        req.expandTest({
          url: 'maps/submissions',
          expand: 'currentVersion',
          paged: true,
          validate: MapDto,
          token: u1Token
        }));

      it('should respond with expanded current version data using the currentVersionWithZones expand parameter', () =>
        req.expandTest({
          url: 'maps/submissions',
          expand: 'currentVersionWithZones',
          expectedPropertyName: 'currentVersion.zones',
          paged: true,
          validate: MapDto,
          token: u1Token
        }));

      it('should respond with expanded versions data using the version expand parameter', async () => {
        const res = await req.expandTest({
          url: 'maps/submissions',
          expand: 'versions',
          expectedPropertyName: 'versions[1]',
          paged: true,
          validate: MapDto,
          token: u1Token
        });

        for (const item of res.body.data) {
          for (const version of item.versions) {
            expect(version).toHaveProperty('id');
            expect(version).toHaveProperty('downloadURL');
            expect(version).toHaveProperty('bspHash');
            expect(version).toHaveProperty('zoneHash');
            expect(version).toHaveProperty('versionNum');
            expect(version).toHaveProperty('createdAt');
            expect(version).toHaveProperty('changelog');
            expect(version).not.toHaveProperty('zones');
          }
        }
      });

      it('should respond with expanded versions data using the versionsWithZones expand parameter', async () => {
        const res = await req.expandTest({
          url: 'maps/submissions',
          expand: 'versionsWithZones',
          expectedPropertyName: 'versions[1]',
          paged: true,
          validate: MapDto,
          token: u1Token
        });

        for (const item of res.body.data) {
          for (const version of item.versions) {
            expect(version).toHaveProperty('id');
            expect(version).toHaveProperty('downloadURL');
            expect(version).toHaveProperty('bspHash');
            expect(version).toHaveProperty('zoneHash');
            expect(version).toHaveProperty('versionNum');
            expect(version).toHaveProperty('createdAt');
            expect(version).toHaveProperty('changelog');
            expect(version).toHaveProperty('zones');
          }
        }
      });

      it('should respond with expanded review data using the reviews expand parameter', () =>
        req.expandTest({
          url: 'maps/submissions',
          expand: 'reviews',
          paged: true,
          some: true,
          validate: MapDto,
          token: u1Token
        }));

      it('should respond with expanded map data using the credits expand parameter', async () => {
        await prisma.mapCredit.createMany({
          data: [
            { mapID: pubMap1.id, userID: u2.id, type: MapCreditType.AUTHOR }
          ]
        });

        await req.expandTest({
          url: 'maps/submissions',
          expand: 'credits',
          expectedPropertyName: 'credits[0].user', // This should always include user as well
          paged: true,
          some: true,
          validate: MapDto,
          token: u1Token
        });

        await db.cleanup('mapCredit');
      });

      it('should respond with expanded submitter data using the submitter expand parameter', async () => {
        await prisma.mMap.update({
          where: { id: pubMap1.id },
          data: { submitterID: u2.id }
        });

        await req.expandTest({
          url: 'maps/submissions',
          expand: 'submitter',
          paged: true,
          validate: MapDto,
          token: u1Token
        });

        await prisma.mMap.update({
          where: { id: pubMap1.id },
          data: { submitterID: null }
        });
      });

      it('should respond with expanded map data using the stats expand parameter', () =>
        req.expandTest({
          url: 'maps/submissions',
          expand: 'stats',
          paged: true,
          validate: MapDto,
          token: u1Token
        }));

      it('should respond with expanded map data using the info expand parameter', () =>
        req.expandTest({
          url: 'maps/submissions',
          expand: 'info',
          paged: true,
          validate: MapDto,
          token: u1Token
        }));

      it("should respond with expanded map data if the map is in the logged in user's favorites when using the inFavorites expansion", async () => {
        await prisma.mapFavorite.create({
          data: { userID: u1.id, mapID: pubMap1.id }
        });

        await req.expandTest({
          url: 'maps/submissions',
          expand: 'inFavorites',
          paged: true,
          validate: MapDto,
          expectedPropertyName: 'favorites',
          token: u1Token,
          some: true
        });
      });

      it("should respond with the map's WR when using the worldRecord expansion", async () => {
        await db.createLbRun({
          map: pubMap1,
          user: u2,
          time: 5,
          rank: 1
        });

        const res = await req.get({
          url: 'maps/submissions',
          status: 200,
          validatePaged: MapDto,
          query: { expand: 'worldRecord' },
          token: u1Token
        });

        const map = res.body.data.find((map) => map.id === pubMap1.id);
        expect(map).toMatchObject({
          worldRecords: [{ rank: 1, user: { id: u2.id } }]
        });
      });

      it("should respond with the logged in user's PB when using the personalBest expansion", async () => {
        await db.createLbRun({
          map: pubMap1,
          user: u1,
          time: 10,
          rank: 2
        });

        const res = await req.get({
          url: 'maps/submissions',
          status: 200,
          validatePaged: MapDto,
          query: { expand: 'personalBest' },
          token: u1Token
        });

        const map = res.body.data.find((map) => map.id === pubMap1.id);
        expect(map).toMatchObject({
          personalBests: [{ rank: 2, user: { id: u1.id } }]
        });
      });

      it('should respond properly with both personalBest and worldRecord expansions', async () => {
        const res = await req.get({
          url: 'maps/submissions',
          status: 200,
          validatePaged: MapDto,
          query: { expand: 'worldRecord,personalBest' },
          token: u1Token
        });

        const map = res.body.data.find((map) => map.id === pubMap1.id);
        expect(map).toMatchObject({
          worldRecords: [{ rank: 1, user: { id: u2.id } }],
          personalBests: [{ rank: 2, user: { id: u1.id } }]
        });

        await db.cleanup('leaderboardRun');
      });

      it('should respond with only pub and fa maps if the user has no special relations', async () => {
        const res = await req.get({
          url: 'maps/submissions',
          status: 200,
          validatePaged: { type: MapDto, count: 3 },
          token: u1Token
        });

        expect(res.body.data).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ id: pubMap1.id }),
            expect.objectContaining({ id: pubMap2.id }),
            expect.objectContaining({ id: faMap.id })
          ])
        );
      });

      it('should include private testing maps for which the user has an accepted invite', async () => {
        await prisma.mapTestInvite.create({
          data: {
            userID: u1.id,
            mapID: privMap.id,
            state: MapTestInviteState.ACCEPTED
          }
        });

        const res = await req.get({
          url: 'maps/submissions',
          status: 200,
          validatePaged: { type: MapDto, count: 4 },
          token: u1Token
        });

        expect(res.body.data).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ id: pubMap1.id }),
            expect.objectContaining({ id: pubMap2.id }),
            expect.objectContaining({ id: faMap.id }),
            expect.objectContaining({ id: privMap.id })
          ])
        );
      });

      it('should not include a private testing map if the user has an declined invite', async () => {
        await prisma.mapTestInvite.create({
          data: {
            userID: u1.id,
            mapID: privMap.id,
            state: MapTestInviteState.DECLINED
          }
        });

        const res = await req.get({
          url: 'maps/submissions',
          status: 200,
          validatePaged: { type: MapDto, count: 3 },
          token: u1Token
        });

        expect(res.body.data).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ id: pubMap1.id }),
            expect.objectContaining({ id: pubMap2.id }),
            expect.objectContaining({ id: faMap.id })
          ])
        );
      });

      it('should include private testing maps for which the user is in the credits', async () => {
        await prisma.mapCredit.create({
          data: {
            userID: u1.id,
            mapID: privMap.id,
            type: MapCreditType.TESTER
          }
        });

        const res = await req.get({
          url: 'maps/submissions',
          status: 200,
          validatePaged: { type: MapDto, count: 4 },
          token: u1Token
        });

        expect(res.body.data).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ id: pubMap1.id }),
            expect.objectContaining({ id: pubMap2.id }),
            expect.objectContaining({ id: faMap.id }),
            expect.objectContaining({ id: privMap.id })
          ])
        );
      });

      it('should include private testing maps for which the user is the submitter', async () => {
        await prisma.mMap.update({
          where: { id: privMap.id },
          data: { submitter: { connect: { id: u1.id } } }
        });

        const res = await req.get({
          url: 'maps/submissions',
          status: 200,
          validatePaged: { type: MapDto, count: 4 },
          token: u1Token
        });

        expect(res.body.data).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ id: pubMap1.id }),
            expect.objectContaining({ id: pubMap2.id }),
            expect.objectContaining({ id: faMap.id }),
            expect.objectContaining({ id: privMap.id })
          ])
        );

        await prisma.mMap.update({
          where: { id: privMap.id },
          data: { submitter: { disconnect: true } }
        });
      });

      it('should include content approval maps for which the user has an accepted invite', async () => {
        await prisma.mapTestInvite.create({
          data: {
            userID: u1.id,
            mapID: caMap.id,
            state: MapTestInviteState.ACCEPTED
          }
        });

        const res = await req.get({
          url: 'maps/submissions',
          status: 200,
          validatePaged: { type: MapDto, count: 4 },
          token: u1Token
        });

        expect(res.body.data).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ id: pubMap1.id }),
            expect.objectContaining({ id: pubMap2.id }),
            expect.objectContaining({ id: faMap.id }),
            expect.objectContaining({ id: caMap.id })
          ])
        );
      });

      it('should not include content approval maps if the user has an declined invite', async () => {
        await prisma.mapTestInvite.create({
          data: {
            userID: u1.id,
            mapID: caMap.id,
            state: MapTestInviteState.DECLINED
          }
        });

        const res = await req.get({
          url: 'maps/submissions',
          status: 200,
          validatePaged: { type: MapDto, count: 3 },
          token: u1Token
        });

        expect(res.body.data).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ id: pubMap1.id }),
            expect.objectContaining({ id: pubMap2.id }),
            expect.objectContaining({ id: faMap.id })
          ])
        );
      });

      it('should include content approval maps for which the user is in the credits', async () => {
        await prisma.mapCredit.create({
          data: {
            userID: u1.id,
            mapID: caMap.id,
            type: MapCreditType.TESTER
          }
        });

        const res = await req.get({
          url: 'maps/submissions',
          status: 200,
          validatePaged: { type: MapDto, count: 4 },
          token: u1Token
        });

        expect(res.body.data).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ id: pubMap1.id }),
            expect.objectContaining({ id: pubMap2.id }),
            expect.objectContaining({ id: faMap.id }),
            expect.objectContaining({ id: caMap.id })
          ])
        );
      });

      it('should include content approval maps for which the user is the submitter', async () => {
        await prisma.mMap.update({
          where: { id: caMap.id },
          data: { submitter: { connect: { id: u1.id } } }
        });

        const res = await req.get({
          url: 'maps/submissions',
          status: 200,
          validatePaged: { type: MapDto, count: 4 },
          token: u1Token
        });

        expect(res.body.data).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ id: pubMap1.id }),
            expect.objectContaining({ id: pubMap2.id }),
            expect.objectContaining({ id: faMap.id }),
            expect.objectContaining({ id: caMap.id })
          ])
        );

        await prisma.mMap.update({
          where: { id: caMap.id },
          data: { submitter: { disconnect: true } }
        });
      });

      it('should filter by public maps when given the public filter', async () => {
        const res = await req.get({
          url: 'maps/submissions',
          status: 200,
          query: { filter: MapStatus.PUBLIC_TESTING },
          validatePaged: { type: MapDto, count: 2 },
          token: u1Token
        });

        expect(res.body.data).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ id: pubMap1.id }),
            expect.objectContaining({ id: pubMap2.id })
          ])
        );
      });

      it('should filter by private maps when given the private filter', async () => {
        await prisma.mapTestInvite.create({
          data: {
            mapID: privMap.id,
            userID: u1.id,
            state: MapTestInviteState.ACCEPTED
          }
        });

        const res = await req.get({
          url: 'maps/submissions',
          status: 200,
          query: { filter: MapStatus.PRIVATE_TESTING },
          validatePaged: { type: MapDto, count: 1 },
          token: u1Token
        });

        expect(res.body.data[0]).toEqual(
          expect.objectContaining({ id: privMap.id })
        );
      });

      it('should filter by content approval maps when given the content approval filter', async () => {
        await prisma.user.update({
          where: { id: u1.id },
          data: { roles: Role.REVIEWER }
        });

        const res = await req.get({
          url: 'maps/submissions',
          status: 200,
          query: { filter: MapStatus.CONTENT_APPROVAL },
          validatePaged: { type: MapDto, count: 1 },
          token: u1Token
        });

        expect(res.body.data[0]).toEqual(
          expect.objectContaining({ id: caMap.id })
        );

        await prisma.user.update({
          where: { id: u1.id },
          data: { roles: 0 }
        });
      });

      it('should filter by final approval maps when given the final approval filter', async () => {
        const res = await req.get({
          url: 'maps/submissions',
          status: 200,
          query: { filter: MapStatus.FINAL_APPROVAL },
          validatePaged: { type: MapDto, count: 1 },
          token: u1Token
        });

        expect(res.body.data[0]).toEqual(
          expect.objectContaining({ id: faMap.id })
        );
      });

      it('should filter by approving reviews when given hasApprovingReview filter', async () => {
        await req.get({
          url: 'maps/submissions',
          status: 200,
          query: { hasApprovingReview: true },
          validatePaged: { type: MapDto, count: 0 },
          token: u1Token
        });

        await prisma.mapReviewStats.update({
          where: { mapID: pubMap1.id },
          data: { approvals: 2, total: { increment: 2 } }
        });

        await req.get({
          url: 'maps/submissions',
          status: 200,
          query: { hasApprovingReview: true },
          validatePaged: { type: MapDto, count: 1 },
          token: u1Token
        });

        await req.get({
          url: 'maps/submissions',
          status: 200,
          query: { hasApprovingReview: false },
          validatePaged: { type: MapDto, count: 2 },
          token: u1Token
        });

        // Cleanup
        await prisma.mapReviewStats.update({
          where: { mapID: pubMap1.id },
          data: { approvals: 0, total: { decrement: 2 } }
        });
      });

      it('should limit -1 take to 100 for non-reviewers', async () => {
        // Magic number sorry, if additional maps are added above in setup
        // this'll break.
        const newMaps = await db
          .createMaps(98, {
            status: MapStatus.PUBLIC_TESTING
          })
          .then((maps) => maps.map((m) => m.id));

        await req.get({
          url: 'maps/submissions',
          status: 200,
          query: { take: -1 },
          validatePaged: { type: MapDto, returnCount: 100, totalCount: 101 },
          token: u1Token
        });

        await prisma.mMap.deleteMany({ where: { id: { in: newMaps } } });
      });

      it('should not limit -1 take reviewers', async () => {
        await prisma.user.update({
          where: { id: u1.id },
          data: { roles: Role.REVIEWER }
        });

        const newMaps = await db
          .createMaps(97, {
            status: MapStatus.PUBLIC_TESTING
          })
          .then((maps) => maps.map((m) => m.id));

        await req.get({
          url: 'maps/submissions',
          status: 200,
          query: { take: -1 },
          validatePaged: { type: MapDto, returnCount: 101, totalCount: 101 },
          token: u1Token
        });

        await prisma.mMap.deleteMany({ where: { id: { in: newMaps } } });
        await prisma.user.update({
          where: { id: u1.id },
          data: { roles: 0 }
        });
      });

      it('should 401 when no access token is provided', () =>
        req.unauthorizedTest('maps/submissions', 'get'));
    });
  });

  describe('maps/getMapUploadUrl', () => {
    describe('GET', () => {
      let user, token;
      beforeAll(async () => {
        [user, token] = await db.createAndLoginUser();
      });

      afterAll(() => fileStore.deleteDirectory('upload_tmp'));

      it('should create pre-signed url for file in upload_tmp directory', async () => {
        const fileBuf = crypto.randomBytes(10);

        const preSignedUrlRes = await req.get({
          url: 'maps/getMapUploadUrl',
          query: {
            fileSize: fileBuf.length
          },
          status: 200,
          token
        });

        await fileStore.putToPreSignedUrl(preSignedUrlRes.body.url, fileBuf);

        const userIDObjects = await fileStore.list(`upload_tmp/${user.id}`);
        expect(userIDObjects.length).toBe(1);

        const storedObject = await fileStore.get(userIDObjects[0]);
        expect(storedObject).toEqual(fileBuf);
      });

      it('should delete old file when new url created', async () => {
        await req.get({
          url: 'maps/getMapUploadUrl',
          query: {
            fileSize: 10
          },
          status: 200,
          token
        });

        const userIDObjects = await fileStore.list(`upload_tmp/${user.id}`);
        expect(userIDObjects.length).toBe(0);
      });

      it('should 400 for too big files', () =>
        req.get({
          url: 'maps/getMapUploadUrl',
          query: {
            fileSize: Config.limits.bspSize + 1
          },
          status: 400,
          token
        }));

      it('should 400 if file size is not specified', () =>
        req.get({
          url: 'maps/getMapUploadUrl',
          status: 400,
          token
        }));

      it('should delete old file with next request errored', async () => {
        const fileBuf = crypto.randomBytes(10);

        const preSignedUrlRes = await req.get({
          url: 'maps/getMapUploadUrl',
          query: {
            fileSize: fileBuf.length
          },
          status: 200,
          token
        });

        await fileStore.putToPreSignedUrl(preSignedUrlRes.body.url, fileBuf);

        await req.get({
          url: 'maps/getMapUploadUrl',
          status: 400,
          token
        });

        const userIDObjects = await fileStore.list(`upload_tmp/${user.id}`);
        expect(userIDObjects.length).toBe(0);
      });

      it('should 401 when no access token is provided', () =>
        req.unauthorizedTest('maps/getMapUploadUrl', 'get'));
    });
  });

  describe('Discord notifications', () => {
    let user: User,
      token: string,
      adminToken: string,
      createMapData,
      bspBuffer: Buffer,
      restPostMock: jest.SpyInstance,
      restPostObservable: rxjs.Subject<void>;

    beforeAll(async () => {
      [[user, token], adminToken] = await Promise.all([
        db.createAndLoginUser(),
        db.loginNewUser({ data: { roles: Role.ADMIN } })
      ]);

      createMapData = {
        name: 'surf_map',
        submitter: { connect: { id: user.id } },
        credits: {
          create: {
            type: MapCreditType.AUTHOR,
            user: { connect: { id: user.id } }
          }
        },
        submission: {
          create: {
            placeholders: [
              { type: MapCreditType.AUTHOR, alias: 'The Map Author' }
            ],
            type: MapSubmissionType.ORIGINAL,
            dates: {
              create: [
                {
                  status: MapStatus.PRIVATE_TESTING,
                  date: new Date(),
                  user: { connect: { id: user.id } }
                }
              ]
            },
            suggestions: [
              {
                trackType: TrackType.MAIN,
                trackNum: 1,
                gamemode: Gamemode.RJ,
                tier: 1,
                type: LeaderboardType.RANKED,
                tags: [MapTag.Sync]
              },
              {
                trackType: TrackType.BONUS,
                trackNum: 1,
                gamemode: Gamemode.DEFRAG_CPM,
                tier: 1,
                type: LeaderboardType.UNRANKED
              }
            ]
          }
        },
        versions: {
          create: {
            zones: ZonesStubString,
            versionNum: 1,
            bspHash: createSha1Hash(Buffer.from('shashashs')),
            submitter: { connect: { id: user.id } }
          }
        },
        leaderboards: { createMany: { data: [] } }
      };

      bspBuffer = readFileSync(path.join(FILES_PATH, 'map.bsp'));

      const discordMock = await mockDiscordService(app);
      restPostMock = discordMock.restPostMock;
      restPostObservable = discordMock.restPostObservable;
    });

    afterAll(() => jest.restoreAllMocks());

    afterEach(() =>
      Promise.all([db.cleanup('mMap'), restPostMock.mockClear()])
    );

    it('should send discord notification when map gets submitted to content approval', async () => {
      await uploadBspToPreSignedUrl(bspBuffer, token);

      await req.postAttach({
        url: 'maps',
        status: 201,
        data: {
          name: 'surf_map',
          info: {
            description: 'mampmampmampmampmampmampmampmamp',
            creationDate: '2022-07-07T18:33:33.000Z'
          },
          submissionType: MapSubmissionType.ORIGINAL,
          placeholders: [
            { alias: 'The Map Author', type: MapCreditType.AUTHOR }
          ],
          suggestions: [
            {
              trackType: TrackType.MAIN,
              trackNum: 1,
              gamemode: Gamemode.SURF,
              tier: 1,
              type: LeaderboardType.RANKED
            },
            {
              trackType: TrackType.BONUS,
              trackNum: 1,
              gamemode: Gamemode.DEFRAG_CPM,
              tier: 1,
              type: LeaderboardType.UNRANKED
            }
          ],
          wantsPrivateTesting: false,
          credits: [
            {
              userID: user.id,
              type: MapCreditType.AUTHOR
            }
          ],
          zones: structuredClone(ZonesStub)
        },
        token
      });

      if (restPostMock.mock.calls.length !== 1) {
        await rxjs.firstValueFrom(restPostObservable);
      }

      const requestBody = restPostMock.mock.lastCall[1];

      const embed = requestBody.body.embeds[0];

      expect(embed.title).toBe(createMapData.name);
      expect(embed.description).toBe(
        `By ${[user.alias, 'The Map Author']
          .sort()
          .map((a) => `**${a}**`)
          .join(', ')}`
      );
    });
    it('should send discord notification when map moves to content approval', async () => {
      const map = await db.createMap({
        ...createMapData,
        status: MapStatus.PRIVATE_TESTING
      });

      await req.patch({
        url: `maps/${map.id}`,
        status: 204,
        body: {
          status: MapStatus.CONTENT_APPROVAL
        },
        token
      });

      if (restPostMock.mock.calls.length !== 1) {
        await rxjs.firstValueFrom(restPostObservable);
      }

      const requestBody = restPostMock.mock.lastCall[1];

      const embed = requestBody.body.embeds[0];

      expect(embed.title).toBe(map.name);
      expect(embed.description).toBe(
        `By ${[user.alias, 'The Map Author']
          .sort()
          .map((a) => `**${a}**`)
          .join(', ')}`
      );
    });

    it('should send discord notification when map is in public testing', async () => {
      const map = await db.createMap({
        ...createMapData,
        status: MapStatus.FINAL_APPROVAL
      });

      await req.patch({
        url: `maps/${map.id}`,
        status: 204,
        body: {
          status: MapStatus.PUBLIC_TESTING
        },
        token
      });
      while (restPostMock.mock.calls.length !== 2) {
        await rxjs.firstValueFrom(restPostObservable);
      }

      const requestBody = restPostMock.mock.lastCall[1];
      expect(requestBody.body.content).toContain('123/9121003'); // guild id/message id, see test util discord.util.ts

      const embed = requestBody.body.embeds[0];

      expect(embed.title).toBe(map.name);
      expect(embed.description).toBe(
        `By ${[user.alias, 'The Map Author']
          .sort()
          .map((a) => `**${a}**`)
          .join(', ')}`
      );
    });

    it('should send discord notification when map has been approved', async () => {
      const map = await db.createMap({
        ...createMapData,
        status: MapStatus.FINAL_APPROVAL,
        credits: {
          create: {
            type: MapCreditType.AUTHOR,
            user: { connect: { id: user.id } }
          }
        }
      });

      await req.patch({
        url: `admin/maps/${map.id}`,
        status: 204,
        body: {
          status: MapStatus.APPROVED,
          finalLeaderboards: [
            {
              trackType: TrackType.MAIN,
              trackNum: 1,
              gamemode: Gamemode.RJ,
              tier: 1,
              type: LeaderboardType.RANKED
            },
            {
              trackType: TrackType.BONUS,
              trackNum: 1,
              gamemode: Gamemode.DEFRAG_CPM,
              tier: 1,
              type: LeaderboardType.UNRANKED
            }
          ]
        },
        token: adminToken
      });
      if (restPostMock.mock.calls.length !== 1) {
        await rxjs.firstValueFrom(restPostObservable);
      }

      const requestBody = restPostMock.mock.lastCall[1];
      const embed = requestBody.body.embeds[0];

      expect(embed.title).toBe(map.name);
      expect(embed.description).toBe(
        `By ${[user.alias, 'The Map Author']
          .sort()
          .map((a) => `**${a}**`)
          .join(', ')}`
      );
    });

    it('should send multiple discord notifications for different gamemode categories', async () => {
      const map = await db.createMap({
        ...createMapData,
        status: MapStatus.FINAL_APPROVAL,
        submission: {
          create: {
            ...createMapData.submission.create,
            suggestions: [
              {
                trackType: TrackType.MAIN,
                trackNum: 1,
                gamemode: Gamemode.RJ,
                tier: 1,
                type: LeaderboardType.RANKED
              },
              {
                trackType: TrackType.MAIN,
                trackNum: 1,
                gamemode: Gamemode.CONC,
                tier: 1,
                type: LeaderboardType.UNRANKED
              },
              {
                trackType: TrackType.BONUS,
                trackNum: 1,
                gamemode: Gamemode.DEFRAG_CPM,
                tier: 1,
                type: LeaderboardType.UNRANKED
              }
            ]
          }
        }
      });

      await req.patch({
        url: `admin/maps/${map.id}`,
        status: 204,
        body: {
          status: MapStatus.APPROVED,
          finalLeaderboards: [
            {
              trackType: TrackType.MAIN,
              trackNum: 1,
              gamemode: Gamemode.RJ,
              tier: 1,
              type: LeaderboardType.RANKED
            },
            {
              trackType: TrackType.MAIN,
              trackNum: 1,
              gamemode: Gamemode.CONC,
              tier: 1,
              type: LeaderboardType.UNRANKED
            },
            {
              trackType: TrackType.BONUS,
              trackNum: 1,
              gamemode: Gamemode.DEFRAG_CPM,
              tier: 1,
              type: LeaderboardType.UNRANKED
            }
          ]
        },
        token: adminToken
      });

      while (restPostMock.mock.calls.length !== 2) {
        await rxjs.firstValueFrom(restPostObservable);
      }

      const requestUrls = restPostMock.mock.calls.map((call) => call[0]);
      expect(requestUrls.sort()).toEqual(
        [GamemodeCategory.RJ, GamemodeCategory.CONC].map((gc) =>
          Routes.channelMessages(gc.toString())
        )
      );

      const requestBody = restPostMock.mock.lastCall[1];
      const embed = requestBody.body.embeds[0];

      expect(embed.title).toBe(map.name);
      expect(embed.description).toBe(
        `By ${[user.alias, 'The Map Author']
          .sort()
          .map((a) => `**${a}**`)
          .join(', ')}`
      );
    });
  });
});
