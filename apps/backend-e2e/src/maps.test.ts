import { after, afterEach, before, beforeEach, describe, it } from 'node:test';
import {
  any,
  arrayContaining,
  assertValidDto,
  createSha1Hash,
  FILES_PATH,
  matchesPartial,
  randomString,
  spyOnNestedMethod,
  stringContaining
} from '@momentum/test-utils';
import * as assert from 'node:assert/strict';
import { Config } from '../../backend/src/app/config';
import { MapDto } from '../../backend/src/app/dto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  ActivityType,
  Ban,
  MapStatuses,
  Gamemode,
  MapCreditType,
  MapStatus,
  MapSubmissionDate,
  MapSubmissionType,
  Role,
  TrackType,
  LeaderboardType,
  MAX_OPEN_MAP_SUBMISSIONS,
  MapTag,
  MapSortType,
  MAX_MAPPER_OPEN_MAP_SUBMISSIONS,
  MAX_CREDITS_EXCEPT_TESTERS,
  Style
} from '@momentum/constants';
import { User } from '@momentum/db';
import Zip from 'adm-zip';
import {
  generateRandomMapZones,
  ZonesStub,
  ZonesStubLeaderboards
} from '@momentum/formats/zone';
import { arrayFrom } from '@momentum/util-fn';
import { DbService } from '../../../apps/backend/src/app/modules/database/db.service';
import { EXTENDED_PRISMA_SERVICE } from '../../../apps/backend/src/app/modules/database/db.constants';
import {
  app,
  prisma,
  req,
  db,
  fileStore,
  registerE2ETestFile
} from './support/e2e-environment';

describe('Maps', () => {
  registerE2ETestFile();

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

      afterEach(async () => {
        await db.cleanup('leaderboardRun', 'pastRun', 'user', 'mMap');
      });

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
              small: stringContaining(`${imageID}-small.jpg`),
              medium: stringContaining(`${imageID}-medium.jpg`),
              large: stringContaining(`${imageID}-large.jpg`),
              xl: stringContaining(`${imageID}-xl.jpg`)
            };
            assert.ok(Object.hasOwn(item, prop));
            assert.ok(matchesPartial(item.images, [match]));
            assert.ok(matchesPartial(item.thumbnail, match));
          }
          assert.ok(!Object.hasOwn(item, 'zones'));
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
          assert.equal(item.status, MapStatus.APPROVED);
        }
      });

      it('should be ordered by date', async () => {
        await req.sortByDateTest({
          url: 'maps',
          validate: MapDto,
          token: u1Token
        });
      });

      it('should respond with filtered map data using the take parameter', async () => {
        await req.takeTest({ url: 'maps', validate: MapDto, token: u1Token });
      });

      it('should respond with filtered map data using the skip parameter', async () => {
        await req.skipTest({ url: 'maps', validate: MapDto, token: u1Token });
      });

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

        assert.partialDeepStrictEqual(res.body.data[0], {
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

        assert.partialDeepStrictEqual(res.body.data[0], {
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
              style: Style.NORMAL,
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
                  style: Style.NORMAL,
                  type: LeaderboardType.HIDDEN
                },
                {
                  gamemode: Gamemode.RJ,
                  trackType: TrackType.MAIN,
                  trackNum: 1,
                  style: Style.NORMAL,
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

      it('should respond with expanded submitter data using the currentVersion expand parameter', async () => {
        await req.expandTest({
          url: 'maps',
          expand: 'currentVersion',
          paged: true,
          validate: MapDto,
          token: u1Token
        });
      });

      it('should respond with expanded submitter data using the currentVersionWithZones expand parameter', async () => {
        await req.expandTest({
          url: 'maps',
          expand: 'currentVersionWithZones',
          paged: true,
          validate: MapDto,
          expectedPropertyName: 'currentVersion.zones',
          token: u1Token
        });
      });

      it('should respond with expanded submitter data using the versions expand parameter', async () => {
        await req.expandTest({
          url: 'maps',
          expand: 'versions',
          // Nested submitter should be included with versions.
          expectedPropertyName: 'versions[0].submitter',
          paged: true,
          validate: MapDto,
          token: u1Token
        });
      });

      it('should respond with expanded submitter data using the versionsWithZones expand parameter', async () => {
        await req.expandTest({
          url: 'maps',
          expand: 'versionsWithZones',
          expectedPropertyName: 'versions[0].zones',
          paged: true,
          validate: MapDto,
          token: u1Token
        });
      });

      it('should respond with expanded submitter data using the leaderboards expand parameter', async () => {
        await req.expandTest({
          url: 'maps',
          expand: 'leaderboards',
          paged: true,
          validate: MapDto,
          token: u1Token
        });
      });

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

      it('should respond with expanded map data using the stats expand parameter', async () => {
        await req.expandTest({
          url: 'maps',
          expand: 'stats',
          paged: true,
          validate: MapDto,
          token: u1Token
        });
      });

      it('should respond with expanded map data using the info expand parameter', async () => {
        await req.expandTest({
          url: 'maps',
          expand: 'info',
          paged: true,
          validate: MapDto,
          token: u1Token
        });
      });

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

        await req.get({
          url: 'maps',
          status: 200,
          query: { difficultyLow: 3, difficultyHigh: 5 },
          token: u1Token,
          validatePaged: { type: MapDto, count: 3 }
        });

        await req.get({
          url: 'maps',
          status: 200,
          query: { difficultyLow: 3, difficultyHigh: 3 },
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
          for (const l of r.leaderboards) assert.equal(l.linear, false);

        const res2 = await req.get({
          url: 'maps',
          status: 200,
          query: { linear: true, expand: 'leaderboards' },
          validatePaged: { type: MapDto, count: 2 },
          token: u1Token
        });

        for (const r of res2.body.data)
          for (const l of r.leaderboards) assert.equal(l.linear, true);
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

        assert.equal(res.body.totalCount, 1);
        assert.equal(res.body.returnCount, 1);
      });

      it('should respond with maps with a PB when using the PB filter', async () => {
        await prisma.leaderboard.create({
          data: {
            mapID: mEarth.id,
            gamemode: Gamemode.RJ,
            type: LeaderboardType.RANKED,
            trackType: TrackType.MAIN,
            trackNum: 1,
            style: Style.NORMAL,
            runs: { create: { userID: u1.id, time: 1, splits: {} } }
          }
        });

        await prisma.leaderboard.create({
          data: {
            mapID: mWater.id,
            gamemode: Gamemode.SJ,
            type: LeaderboardType.RANKED,
            trackType: TrackType.MAIN,
            trackNum: 1,
            style: Style.NORMAL,
            runs: { create: { userID: u1.id, time: 1, splits: {} } }
          }
        });

        const res = await req.get({
          url: 'maps',
          status: 200,
          query: { PB: true },
          validatePaged: { type: MapDto, count: 2 },
          token: u1Token
        });

        assert.ok(
          matchesPartial(
            res.body.data.map(({ id }) => id),
            arrayContaining([mEarth.id, mWater.id])
          )
        );

        const res2 = await req.get({
          url: 'maps',
          status: 200,
          query: { PB: false },
          validatePaged: { type: MapDto, count: 2 },
          token: u1Token
        });

        assert.ok(
          matchesPartial(
            res2.body.data.map(({ id }) => id),
            arrayContaining([mAir.id, mBeansOnToast.id])
          )
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
            style: Style.NORMAL,
            runs: { create: { userID: u1.id, time: 1, splits: {} } }
          }
        });

        await prisma.leaderboard.create({
          data: {
            mapID: mWater.id,
            gamemode: Gamemode.SJ,
            type: LeaderboardType.RANKED,
            trackType: TrackType.MAIN,
            trackNum: 1,
            style: Style.NORMAL,
            runs: { create: { userID: u1.id, time: 1, splits: {} } }
          }
        });

        const res = await req.get({
          url: 'maps',
          status: 200,
          query: { PB: true, gamemode: Gamemode.RJ },
          validatePaged: { type: MapDto, count: 1 },
          token: u1Token
        });

        assert.equal(res.body.data[0].id, mEarth.id);
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

        assert.equal(res.body.data[0].id, mEarth.id);

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
            style: Style.NORMAL
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
                style: Style.NORMAL
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
              style: Style.NORMAL,
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

        assert.equal(res.body.data[0].name, mWater.name);
        assert.equal(res.body.data[1].name, mEarth.name);
        assert.equal(res.body.data[2].name, mBeansOnToast.name);
        assert.equal(res.body.data[3].name, mAir.name);
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

      before(async () => {
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

      after(async () => {
        await db.cleanup('user', 'mMap');
        await fileStore.deleteDirectory('submissions');
        await fileStore.deleteDirectory('maplist');
        await fileStore.deleteDirectory('upload_tmp');
      });

      describe('should submit a map', () => {
        let res, createdMap;

        before(async () => {
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

        after(async () => {
          await Promise.all([
            db.cleanup('mMap'),
            fileStore.deleteDirectory('maplist')
          ]);
        });

        it('should respond with a MapDto', () => {
          assertValidDto(res.body, MapDto);
        });

        it('should create a map within the database', () => {
          assert.ok(
            matchesPartial(createdMap, {
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
                    date: any(Date)
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
            })
          );

          assert.ok(
            Date.now() -
              new Date(createdMap.submission.dates[0].date).getTime() <
              1000
          );
          assert.partialDeepStrictEqual(
            JSON.parse(createdMap.currentVersion.zones),
            zones
          );
          assert.equal(createdMap.currentVersion.submitterID, user.id);
          assert.partialDeepStrictEqual(
            createdMap.versions[0],
            createdMap.currentVersion
          );
          assert.equal(createdMap.versions.length, 1);
        });

        it('should create a ton of leaderboards', async () => {
          const leaderboards = await prisma.leaderboard.findMany({
            where: { mapID: createdMap.id }
          });

          const expected = ZonesStubLeaderboards.map((x) => ({
            ...x,
            mapID: createdMap.id,
            style: x.style,
            tier: null,
            type: LeaderboardType.IN_SUBMISSION,
            tags: []
          }));

          assert.ok(matchesPartial(leaderboards, arrayContaining(expected)));
          assert.equal(leaderboards.length, expected.length);
        });

        it('should upload the BSP file', async () => {
          assert.equal(res.body.downloadURL, undefined);
          const currentVersion = res.body.currentVersion;

          assert.deepEqual(currentVersion.downloadURL.split('/').slice(-2), [
            'maps',
            `${createdMap.currentVersion.bspDownloadId}.bsp`
          ]);

          const downloadBuffer = await fileStore.downloadHttp(
            currentVersion.downloadURL
          );
          const downloadHash = createSha1Hash(downloadBuffer);

          assert.equal(bspHash, currentVersion.bspHash);
          assert.equal(downloadHash, currentVersion.bspHash);
        });

        it('should upload the VMF file', async () => {
          const currentVersion = res.body.currentVersion;

          assert.deepEqual(currentVersion.vmfDownloadURL.split('/').slice(-2), [
            'maps',
            `${createdMap.currentVersion.vmfDownloadId}_VMFs.zip`
          ]);

          const downloadBuffer = await fileStore.downloadHttp(
            currentVersion.vmfDownloadURL
          );

          const zip = new Zip(downloadBuffer);

          const extractedVmf = zip.getEntry('surf_map_main.vmf').getData();
          assert.equal(createSha1Hash(extractedVmf), vmfHash);
        });

        it('should create map uploaded activities for the map authors', async () => {
          const activity = await prisma.activity.findFirst();

          assert.equal(activity.type, ActivityType.MAP_UPLOADED);
          assert.equal(activity.data, BigInt(createdMap.id));
        });

        it('should create map review invites for the invitees', async () => {
          const invites = await prisma.mapTestInvite.findMany();
          const invitees = invites.map((u) => u.userID);
          assert.ok(matchesPartial(invitees, arrayContaining([u2.id, u3.id])));
          assert.equal(invitees.length, 2);
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
        afterEach(async () => {
          await Promise.all([
            db.cleanup('mMap'),
            fileStore.deleteDirectory('upload_tmp')
          ]);
        });

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

          assert.equal(res.body.status, MapStatus.CONTENT_APPROVAL);

          assert.ok(
            Date.now() -
              new Date(
                (res.body.submission.dates as MapSubmissionDate[]).find(
                  ({ status }) => status === MapStatus.CONTENT_APPROVAL
                ).date
              ).getTime() <
              1000
          );
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

        for (const type of [
          MapCreditType.AUTHOR,
          MapCreditType.CONTRIBUTOR,
          MapCreditType.SPECIAL_THANKS
        ]) {
          it(`should reject a submission with more than ${MAX_CREDITS_EXCEPT_TESTERS} ${MapCreditType[type]} credits or placeholders`, async () => {
            const create = structuredClone(createMapObject);
            create.placeholders = arrayFrom(MAX_CREDITS_EXCEPT_TESTERS, () => ({
              alias: randomString(),
              type
            }));

            create.credits = [
              ...create.credits,
              {
                userID: u2.id,
                type: type,
                description: 'Walrus 2'
              }
            ];

            await uploadBspToPreSignedUrl(bspBuffer, token);

            await req.postAttach({
              url: 'maps',
              status: 400,
              data: create,
              token
            });
          });
        }

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

        it('should 403 if the user has MAX_OPEN_MAP_SUBMISSIONS maps in submission and is not mapper', async (t) => {
          await prisma.user.update({
            where: { id: user.id },
            data: { roles: 0 }
          });

          await uploadBspToPreSignedUrl(bspBuffer, token);

          const dbService: DbService = app.get(EXTENDED_PRISMA_SERVICE);
          const countMock = spyOnNestedMethod(t, dbService, 'mMap', 'count');
          countMock.mock.mockImplementationOnce(
            async () => MAX_OPEN_MAP_SUBMISSIONS
          );

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

        it('should 403 if the user has MAX_MAPPER_OPEN_MAP_SUBMISSIONS maps in submission and is mapper', async (t) => {
          await prisma.user.update({
            where: { id: user.id },
            data: { roles: Role.MAPPER }
          });

          await uploadBspToPreSignedUrl(bspBuffer, token);

          const dbService: DbService = app.get(EXTENDED_PRISMA_SERVICE);
          const countMock = spyOnNestedMethod(t, dbService, 'mMap', 'count');
          countMock.mock.mockImplementationOnce(
            async () => MAX_MAPPER_OPEN_MAP_SUBMISSIONS
          );

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

        it('should 401 when no access token is provided', async () => {
          await req.unauthorizedTest('maps', 'post');
        });
      });
    });
  });
});
