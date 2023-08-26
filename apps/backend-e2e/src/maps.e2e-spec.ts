// noinspection DuplicatedCode

import { readFileSync } from 'node:fs';
import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import {
  AuthUtil,
  createSha1Hash,
  futureDateOffset,
  DbUtil,
  FileStoreUtil,
  FILES_PATH,
  NULL_ID,
  RequestUtil
} from '@momentum/backend/test-utils';
import {
  setupE2ETestEnvironment,
  teardownE2ETestEnvironment
} from './support/environment';
import {
  MapCreditDto,
  MapDto,
  MapImageDto,
  MapInfoDto,
  MapReviewDto,
  MapTrackDto,
  RankDto,
  UserDto
} from '@momentum/backend/dto';
import {
  ActivityType,
  MapCreditType,
  MapStatus,
  Gamemode,
  Role,
  MapStatusNew,
  MapSubmissionType,
  Ban,
  CombinedMapStatuses,
  MapTestingRequestState
} from '@momentum/constants';
import { Config } from '@momentum/backend/config';
// See auth.e2e-spec.ts for justification of this sin
// eslint-disable-next-line @nx/enforce-module-boundaries
import { SteamService } from '../../backend/src/app/modules/steam/steam.service';
import path from 'node:path';
import Zip from 'adm-zip';
import { difference } from 'lodash'; 
import { Enum } from "@momentum/enum";

describe('Maps', () => {
  let app,
    prisma: PrismaClient,
    req: RequestUtil,
    db: DbUtil,
    fileStore: FileStoreUtil,
    auth: AuthUtil;

  beforeAll(async () => {
    const env = await setupE2ETestEnvironment();
    app = env.app;
    prisma = env.prisma;
    req = env.req;
    db = env.db;
    fileStore = env.fileStore;
    auth = env.auth;
  });

  afterAll(() => teardownE2ETestEnvironment(app));

  describe('maps', () => {
    describe('GET', () => {
      let u1, u1Token, u2, m1, m2, m3, m4;

      beforeAll(async () => {
        [[u1, u1Token], [u2]] = await Promise.all([
          db.createAndLoginUser(),
          db.createAndLoginUser()
        ]);

        [[m1, m2, m3, m4]] = await Promise.all([
          db.createMaps(4, {
            credits: { create: { type: 0, userID: u1.id } }
          }),
          db.createMap({ status: MapStatusNew.PRIVATE_TESTING }),
          db.createMap({ status: MapStatusNew.REJECTED }),
          db.createMap({ status: MapStatusNew.DISABLED }),
          db.createMap({ status: MapStatusNew.FINAL_APPROVAL }),
          db.createMap({ status: MapStatusNew.CONTENT_APPROVAL }),
          db.createMap({ status: MapStatusNew.PUBLIC_TESTING })
        ]);
      });

      afterAll(() => db.cleanup('user', 'mMap', 'run'));

      it('should respond with map data', async () => {
        const res = await req.get({
          url: 'maps',
          status: 200,
          validatePaged: { type: MapDto },
          token: u1Token
        });

        for (const item of res.body.data) {
          expect(item).toHaveProperty('mainTrack');
          expect(item).toHaveProperty('info');
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
          expect(item.status).toBe(MapStatusNew.APPROVED);
        }
      });

      it('should be ordered by date', () =>
        req.sortByDateTest({ url: 'maps', validate: MapDto, token: u1Token }));

      it('should respond with filtered map data using the take parameter', () =>
        req.takeTest({ url: 'maps', validate: MapDto, token: u1Token }));

      it('should respond with filtered map data using the skip parameter', () =>
        req.skipTest({ url: 'maps', validate: MapDto, token: u1Token }));

      it('should respond with filtered map data using the search parameter', async () => {
        m2 = await prisma.mMap.update({
          where: { id: m2.id },
          data: { name: 'aaaaa' }
        });

        await req.searchTest({
          url: 'maps',
          token: u1Token,
          searchMethod: 'contains',
          searchString: 'aaaaa',
          searchPropertyName: 'name',
          validate: { type: MapDto, count: 1 }
        });
      });

      it('should respond with filtered map data using the submitter id parameter', async () => {
        await prisma.mMap.update({
          where: { id: m2.id },
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
          id: m2.id
        });
      });

      it('should respond with filtered map data based on the map type', async () => {
        const newType = Gamemode.BHOP;
        await prisma.mMap.update({
          where: { id: m2.id },
          data: { type: newType }
        });

        const res = await req.get({
          url: 'maps',
          status: 200,
          query: { type: newType },
          validatePaged: { type: MapDto, count: 1 },
          token: u1Token
        });

        expect(res.body.data[0].type).toBe(newType);
      });

      it('should respond with expanded map data using the credits expand parameter', async () => {
        await prisma.mapCredit.createMany({
          data: [
            { mapID: m1.id, userID: u2.id, type: MapCreditType.AUTHOR },
            { mapID: m2.id, userID: u2.id, type: MapCreditType.AUTHOR },
            { mapID: m3.id, userID: u2.id, type: MapCreditType.AUTHOR },
            { mapID: m4.id, userID: u2.id, type: MapCreditType.AUTHOR }
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

      it('should respond with expanded map data using the thumbnail expand parameter', () =>
        req.expandTest({
          url: 'maps',
          expand: 'thumbnail',
          paged: true,
          validate: MapDto,
          token: u1Token
        }));

      it('should respond with expanded map data using the images expand parameter', () =>
        req.expandTest({
          url: 'maps',
          expand: 'images',
          paged: true,
          validate: MapDto,
          token: u1Token
        }));

      it('should respond with expanded map data using the stats expand parameter', () =>
        req.expandTest({
          url: 'maps',
          expand: 'stats',
          paged: true,
          validate: MapDto,
          token: u1Token
        }));

      it('should respond with expanded map data using the tracks expand parameter', () =>
        req.expandTest({
          url: 'maps',
          expand: 'tracks',
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

      it("should respond with expanded map data if the map is in the logged in user's library when using the inLibrary expansion", async () => {
        await prisma.mapLibraryEntry.create({
          data: { userID: u1.id, mapID: m1.id }
        });

        await req.expandTest({
          url: 'maps',
          expand: 'inLibrary',
          paged: true,
          validate: MapDto,
          expectedPropertyName: 'libraryEntries',
          token: u1Token,
          some: true
        });
      });

      it("should respond with expanded map data if the map is in the logged in user's library when using the inFavorites expansion", async () => {
        await prisma.mapFavorite.create({
          data: { userID: u1.id, mapID: m1.id }
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
        await db.createRunAndRankForMap({
          map: m1,
          user: u2,
          ticks: 5,
          rank: 1
        });

        const res = await req.get({
          url: 'maps',
          status: 200,
          validatePaged: MapDto,
          query: { expand: 'worldRecord' },
          token: u1Token
        });

        const map = res.body.data.find((map) => map.id === m1.id);
        expect(map).toMatchObject({
          worldRecord: { rank: 1, user: { id: u2.id } }
        });
      });

      it("should respond with the logged in user's PB when using the personalBest expansion", async () => {
        await db.createRunAndRankForMap({
          map: m1,
          user: u1,
          ticks: 10,
          rank: 2
        });

        const res = await req.get({
          url: 'maps',
          status: 200,
          validatePaged: MapDto,
          query: { expand: 'personalBest' },
          token: u1Token
        });

        const map = res.body.data.find((map) => map.id === m1.id);
        expect(map).toMatchObject({
          personalBest: { rank: 2, user: { id: u1.id } }
        });
      });

      it('should respond properly with both personalBest and worldRecord expansions', async () => {
        const res = await req.get({
          url: 'maps',
          status: 200,
          validatePaged: MapDto,
          query: { expand: 'worldRecord,personalBest' },
          token: u1Token
        });

        const map = res.body.data.find((map) => map.id === m1.id);
        expect(map).toMatchObject({
          worldRecord: { rank: 1, user: { id: u2.id } },
          personalBest: { rank: 2, user: { id: u1.id } }
        });
      });

      it('should respond with filtered maps when using the difficultyLow filter', async () => {
        await Promise.all([
          prisma.mMap.update({
            where: { id: m1.id },
            data: { mainTrack: { update: { difficulty: 1 } } }
          }),
          prisma.mMap.update({
            where: { id: m2.id },
            data: { mainTrack: { update: { difficulty: 3 } } }
          }),
          prisma.mMap.update({
            where: { id: m3.id },
            data: { mainTrack: { update: { difficulty: 3 } } }
          }),
          prisma.mMap.update({
            where: { id: m4.id },
            data: { mainTrack: { update: { difficulty: 5 } } }
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

      it('should respond with filtered maps when using the difficultyHigh filter', () =>
        req.get({
          url: 'maps',
          status: 200,
          query: { difficultyHigh: 4 },
          token: u1Token,
          validatePaged: { type: MapDto, count: 3 }
        }));

      it('should respond with filtered maps when using both the difficultyLow and difficultyHigh filter', () =>
        req.get({
          url: 'maps',
          status: 200,
          query: { difficultyLow: 2, difficultyHigh: 4 },
          token: u1Token,
          validatePaged: { type: MapDto, count: 2 }
        }));

      it('should respond with filtered maps when the isLinear filter', async () => {
        await Promise.all([
          prisma.mMap.update({
            where: { id: m1.id },
            data: { mainTrack: { update: { isLinear: false } } }
          }),
          prisma.mMap.update({
            where: { id: m2.id },
            data: { mainTrack: { update: { isLinear: false } } }
          })
        ]);

        const res = await req.get({
          url: 'maps',
          status: 200,
          query: { isLinear: false },
          validatePaged: { type: MapDto, count: 2 },
          token: u1Token
        });

        for (const r of res.body.data) expect(r.mainTrack.isLinear).toBe(false);

        const res2 = await req.get({
          url: 'maps',
          status: 200,
          query: { isLinear: true },
          validatePaged: { type: MapDto, count: 2 },
          token: u1Token
        });

        expect(res2.body.data[0].mainTrack.isLinear).toBe(true);
      });

      it('should respond with filtered maps when using both the difficultyLow, difficultyHigh and isLinear filters', async () => {
        const res = await req.get({
          url: 'maps',
          status: 200,
          query: { difficultyLow: 2, difficultyHigh: 4, isLinear: false },
          token: u1Token
        });

        expect(res.body.totalCount).toBe(1);
        expect(res.body.returnCount).toBe(1);
      });

      it('should 401 when no access token is provided', () =>
        req.unauthorizedTest('maps', 'get'));
    });

    describe('POST', () => {
      let user,
        token,
        createMapObject,
        u2,
        u3,
        bspBuffer,
        bspHash,
        vmfBuffer,
        vmfHash;

      beforeAll(async () => {
        [user, token] = await db.createAndLoginUser();
        [u2, u3] = await db.createUsers(2);

        bspBuffer = readFileSync(path.join(FILES_PATH, 'map.bsp'));
        bspHash = createSha1Hash(bspBuffer);

        vmfBuffer = readFileSync(path.join(FILES_PATH, 'map.vmf'));
        vmfHash = createSha1Hash(vmfBuffer);

        createMapObject = {
          name: 'map',
          fileName: 'surf_map',
          info: {
            description: 'mamp',
            numTracks: 1,
            creationDate: '2022-07-07T18:33:33.000Z'
          },
          submissionType: MapSubmissionType.ORIGINAL,
          placeholders: [{ alias: 'God', type: MapCreditType.AUTHOR }],
          suggestions: [
            {
              track: 1,
              gamemode: Gamemode.SURF,
              tier: 1,
              ranked: true,
              comment: 'I love you'
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
          tracks: Array.from({ length: 2 }, (_, i) => ({
            trackNum: i,
            numZones: 1,
            isLinear: false,
            difficulty: 5,
            zones: Array.from({ length: 10 }, (_, j) => ({
              zoneNum: j,
              triggers: [
                {
                  type: j == 0 ? 1 : j == 1 ? 0 : 2,
                  pointsHeight: 512,
                  pointsZPos: 0,
                  points: { p1: '0', p2: '0' },
                  properties: {
                    properties: {}
                  }
                }
              ]
            }))
          }))
        };
      });

      afterAll(() => {
        db.cleanup('user');
        fileStore.deleteDirectory('submissions');
      });

      describe('should submit a map', () => {
        let res, createdMap;

        beforeAll(async () => {
          res = await req.postAttach({
            url: 'maps',
            status: 201,
            data: createMapObject,
            files: [
              { file: bspBuffer, field: 'bsp', fileName: 'surf_map.bsp' },
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

          createdMap = await prisma.mMap.findFirst({
            include: {
              info: true,
              stats: true,
              credits: true,
              mainTrack: true,
              submission: true,
              tracks: {
                include: {
                  zones: {
                    include: { triggers: { include: { properties: true } } }
                  }
                }
              }
            }
          });
        });

        afterAll(() => db.cleanup('mMap'));

        it('should respond with a MapDto', () => {
          expect(res.body).toBeValidDto(MapDto);
          // Check the whacky JSON parsing stuff works
          const trigger = res.body.tracks[0].zones[0].triggers[0];
          expect(trigger.points).toStrictEqual({ p1: '0', p2: '0' });
          expect(trigger.properties.properties).toStrictEqual({});
        });

        it('should create a map within the database', () => {
          expect(createdMap).toMatchObject({
            name: 'map',
            fileName: 'surf_map',
            status: MapStatusNew.PRIVATE_TESTING,
            submission: {
              type: MapSubmissionType.ORIGINAL,
              placeholders: [{ alias: 'God', type: MapCreditType.AUTHOR }],
              suggestions: [
                {
                  track: 1,
                  gamemode: Gamemode.SURF,
                  tier: 1,
                  ranked: true,
                  comment: 'I love you'
                }
              ]
            },
            info: {
              description: 'mamp',
              numTracks: 1,
              creationDate: new Date('2022-07-07T18:33:33.000Z')
            },
            submitterID: user.id,
            credits: [
              {
                userID: user.id,
                type: MapCreditType.AUTHOR,
                description: 'Walrus'
              }
            ],
            mainTrack: {
              id: createdMap.tracks.find((track) => track.trackNum === 0).id
            }
          });

          expect(createdMap.tracks).toHaveLength(2);
          for (const track of createdMap.tracks) {
            expect(track.trackNum).toBeLessThanOrEqual(1);
            for (const zone of track.zones) {
              expect(zone.zoneNum).toBeLessThanOrEqual(10);
              for (const trigger of zone.triggers) {
                expect(trigger.points).toStrictEqual({ p1: '0', p2: '0' });
                expect(trigger.properties.properties).toStrictEqual({});
              }
            }
          }
        });

        it('should upload the BSP file', async () => {
          expect(res.body.downloadURL).toBeUndefined();
          const currentVersion = res.body.submission.currentVersion;

          expect(currentVersion.downloadURL.split('/').slice(-2)).toEqual([
            'submissions',
            `${currentVersion.id}.bsp`
          ]);

          const downloadBuffer = await axios
            .get(currentVersion.downloadURL, { responseType: 'arraybuffer' })
            .then((res) => Buffer.from(res.data, 'binary'));
          const downloadHash = createSha1Hash(downloadBuffer);

          expect(bspHash).toBe(currentVersion.hash);
          expect(downloadHash).toBe(currentVersion.hash);
        });

        it('should upload the VMF file', async () => {
          const currentVersion = res.body.submission.currentVersion;

          expect(currentVersion.vmfDownloadURL.split('/').slice(-2)).toEqual([
            'submissions',
            `${currentVersion.id}_VMFs.zip`
          ]);

          const downloadBuffer = await axios
            .get(currentVersion.vmfDownloadURL, { responseType: 'arraybuffer' })
            .then((res) => Buffer.from(res.data, 'binary'));

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
          const invites = await prisma.mapTestingRequest.findMany();
          const invitees = invites.map((u) => u.userID);
          expect(invitees).toEqual(expect.arrayContaining([u2.id, u3.id]));
          expect(invitees).toHaveLength(2);
        });
      });

      describe('Permission checks', () => {
        for (const status of CombinedMapStatuses.IN_SUBMISSION) {
          it(`should 403 if the user already has a map in ${MapStatusNew[status]} and is not a MAPPER`, async () => {
            await db.createMap({
              submitter: { connect: { id: user.id } },
              status
            });

            await req.postAttach({
              url: 'maps',
              status: 403,
              data: createMapObject,
              files: [
                { file: bspBuffer, field: 'bsp', fileName: 'surf_map.bsp' },
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
            it(`should allow if the user already has a map in ${MapStatusNew[status]} and is a ${Role[role]}`, async () => {
              await prisma.user.update({
                where: { id: user.id },
                data: { roles: role }
              });

              await db.createMap({
                submitter: { connect: { id: user.id } },
                status
              });

              await req.postAttach({
                url: 'maps',
                status: 201,
                data: createMapObject,
                files: [
                  { file: bspBuffer, field: 'bsp', fileName: 'surf_map.bsp' },
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
        afterEach(() => db.cleanup('mMap'));

        it("should put a map straight in CONTENT_APPROVAL if user doesn't request private testing", async () => {
          const res = await req.postAttach({
            url: 'maps',
            status: 201,
            data: { ...createMapObject, wantsPrivateTesting: false },
            files: [
              { file: bspBuffer, field: 'bsp', fileName: 'surf_map.bsp' },
              { file: vmfBuffer, field: 'vmfs', fileName: 'surf_map.vmf' }
            ],
            token
          });

          expect(res.body.status).toBe(MapStatusNew.CONTENT_APPROVAL);
        });

        it('should 400 if BSP filename does not start with the fileName on the DTO', async () => {
          await req.postAttach({
            url: 'maps',
            status: 400,
            data: createMapObject,
            files: [
              { file: bspBuffer, field: 'bsp', fileName: 'bhop_map.bsp' },
              { file: vmfBuffer, field: 'vmfs', fileName: 'surf_map.vmf' }
            ],
            token
          });
        });

        it('should succeed if BSP filename starts with but does not equal the fileName on the DTO', async () => {
          await req.postAttach({
            url: 'maps',
            status: 201,
            data: createMapObject,
            files: [
              { file: bspBuffer, field: 'bsp', fileName: 'surf_map_a1.bsp' },
              { file: vmfBuffer, field: 'vmfs', fileName: 'surf_map.vmf' }
            ],
            token
          });
        });

        it('should 400 if a BSP filename does not end in .BSP', async () => {
          await req.postAttach({
            url: 'maps',
            status: 400,
            data: createMapObject,
            files: [
              { file: bspBuffer, field: 'bsp', fileName: 'surf_map.zip' },
              { file: vmfBuffer, field: 'vmfs', fileName: 'surf_map.vmf' }
            ],
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

        it("should 400 if BSP file is greater than the config's max bsp file size", async () => {
          await req.postAttach({
            url: 'maps',
            status: 400,
            data: createMapObject,
            files: [
              {
                file: Buffer.alloc(Config.limits.bspSize + 1),
                field: 'bsp',
                fileName: 'surf_map.bsp'
              },
              { file: vmfBuffer, field: 'vmfs', fileName: 'surf_map.vmf' },
              { file: vmfBuffer, field: 'vmfs', fileName: 'surf_map.vmf' }
            ],
            token
          });
        });

        it('should succeed if VMF file is missing', async () =>
          req.postAttach({
            url: 'maps',
            status: 201,
            data: createMapObject,
            files: [
              { file: bspBuffer, field: 'bsp', fileName: 'surf_map.bsp' }
            ],
            token
          }));

        it('should 400 if VMF file is invalid', () =>
          req.postAttach({
            url: 'maps',
            status: 400,
            data: createMapObject,
            files: [
              { file: bspBuffer, field: 'bsp', fileName: 'surf_map.bsp' },
              {
                file: Buffer.from('{' + vmfBuffer.toString()),
                field: 'vmfs',
                fileName: 'surf_map.vmf'
              }
            ],
            token
          }));

        it("should 400 if a VMF file is greater than the config's max vmf file size", () =>
          req.postAttach({
            url: 'maps',
            status: 400,
            data: createMapObject,
            files: [
              { file: bspBuffer, field: 'bsp', fileName: 'surf_map.bsp' },
              {
                file: Buffer.alloc(Config.limits.vmfSize + 1),
                field: 'vmfs',
                fileName: 'surf_map.vmf'
              }
            ],
            token
          }));

        it('should 400 if a VMF filename does not end in .vmf', async () => {
          await req.postAttach({
            url: 'maps',
            status: 400,
            data: createMapObject,
            files: [
              { file: bspBuffer, field: 'bsp', fileName: 'surf_map.bsp' },
              { file: vmfBuffer, field: 'vmfs', fileName: 'surf_map.blend' }
            ],
            token
          });
        });

        // This shouldn't ever really occur - on map approval the user is made a
        // MAPPER or PORTER - but may as well have precise behaviour anyway.
        it('should succeed if the user already has an APPROVED map and is not a mapper', async () => {
          await db.createMap({
            submitter: { connect: { id: user.id } },
            status: MapStatusNew.APPROVED
          });

          await req.postAttach({
            url: 'maps',
            status: 201,
            data: createMapObject,
            files: [
              { file: bspBuffer, field: 'bsp', fileName: 'surf_map.bsp' },
              { file: vmfBuffer, field: 'vmfs', fileName: 'surf_map.vmf' }
            ],
            token
          });

          await prisma.mMap.deleteMany();
        });

        it('should 409 if the user has a MAP_SUBMISSION ban', async () => {
          await prisma.user.update({
            where: { id: user.id },
            data: { bans: Ban.MAP_SUBMISSION }
          });

          await req.postAttach({
            url: 'maps',
            status: 403,
            data: createMapObject,
            files: [
              { file: bspBuffer, field: 'bsp', fileName: 'surf_map.bsp' },
              { file: vmfBuffer, field: 'vmfs', fileName: 'surf_map.vmf' }
            ],
            token
          });

          await prisma.user.update({
            where: { id: user.id },
            data: { bans: 0 }
          });
        });

        it('should 400 if the map does not have any tracks', () =>
          req.postAttach({
            url: 'maps',
            status: 400,
            data: { ...createMapObject, tracks: [] },
            files: [
              { file: bspBuffer, field: 'bsp', fileName: 'surf_map.bsp' },
              { file: vmfBuffer, field: 'vmfs', fileName: 'surf_map.vmf' }
            ],
            token
          }));

        it('should 400 if a map track has less than 2 zones', () =>
          req.postAttach({
            url: 'maps',
            status: 400,
            data: {
              createMapObject,
              tracks: [
                { createMapObject, zones: createMapObject.tracks[0].zones[0] }
              ]
            },
            files: [
              { file: bspBuffer, field: 'bsp', fileName: 'surf_map.bsp' },
              { file: vmfBuffer, field: 'vmfs', fileName: 'surf_map.vmf' }
            ],
            token
          }));

        it('should 409 if a map with the same name exists', async () => {
          const fileName = 'ron_weasley';

          await db.createMap({ fileName });

          await req.postAttach({
            url: 'maps',
            status: 409,
            data: { ...createMapObject, fileName },
            files: [
              { file: bspBuffer, field: 'bsp', fileName: 'surf_map.bsp' },
              { file: vmfBuffer, field: 'vmfs', fileName: 'surf_map.vmf' }
            ],
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
      let u1, u1Token, u2, map;

      beforeAll(
        async () =>
          ([[u1, u1Token], u2, map] = await Promise.all([
            db.createAndLoginUser(),
            db.createUser(),
            db.createMap()
          ]))
      );

      afterAll(() => db.cleanup('user', 'mMap', 'run'));

      it('should respond with map data', () =>
        req.get({
          url: `maps/${map.id}`,
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

      it('should respond with expanded map data using the images expand parameter', () =>
        req.expandTest({
          url: `maps/${map.id}`,
          validate: MapDto,
          expand: 'images',
          token: u1Token
        }));

      it('should respond with expanded map data using the thumbnail expand parameter', () =>
        req.expandTest({
          url: `maps/${map.id}`,
          validate: MapDto,
          expand: 'thumbnail',
          token: u1Token
        }));

      it('should respond with expanded map data using the stats expand info parameter', () =>
        req.expandTest({
          url: `maps/${map.id}`,
          validate: MapDto,
          expand: 'stats',
          token: u1Token
        }));

      it('should respond with expanded map data using the tracks expand info parameter', () =>
        req.expandTest({
          url: `maps/${map.id}`,
          validate: MapDto,
          expand: 'tracks',
          token: u1Token
        }));

      it("should respond with expanded map data if the map is in the logged in user's library when using the inLibrary expansion", async () => {
        await prisma.mapLibraryEntry.create({
          data: { userID: u1.id, mapID: map.id }
        });

        await req.expandTest({
          url: `maps/${map.id}`,
          validate: MapDto,
          expand: 'inLibrary',
          expectedPropertyName: 'libraryEntries',
          token: u1Token
        });
      });

      it("should respond with expanded map data if the map is in the logged in user's library when using the inFavorites expansion", async () => {
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
        await db.createRunAndRankForMap({
          map: map,
          user: u2,
          ticks: 5,
          rank: 1
        });

        const res = await req.get({
          url: `maps/${map.id}`,
          status: 200,
          query: { expand: 'worldRecord' },
          token: u1Token
        });

        expect(res.body).toMatchObject({
          worldRecord: { rank: 1, user: { id: u2.id } }
        });
      });

      it("should respond with the logged in user's PB when using the personalBest expansion", async () => {
        await db.createRunAndRankForMap({
          map: map,
          user: u1,
          ticks: 10,
          rank: 2
        });

        const res = await req.get({
          url: `maps/${map.id}`,
          status: 200,
          query: { expand: 'personalBest' },
          token: u1Token
        });

        expect(res.body).toMatchObject({
          personalBest: { rank: 2, user: { id: u1.id } }
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
          worldRecord: { rank: 1, user: { id: u2.id } },
          personalBest: { rank: 2, user: { id: u1.id } }
        });
      });

      // This test is sufficient to test that getMapAndCheckReadAccess is being
      // called, so we don't need to test the endless variations of states/perms
      // as they're extensively covered by unit tests.
      it('should 403 if the user does not have permission to access to the map', async () => {
        await prisma.mMap.update({
          where: { id: map.id },
          data: { status: MapStatusNew.PRIVATE_TESTING }
        });

        await req.get({
          url: `maps/${map.id}`,
          status: 403,
          token: u1Token
        });

        await prisma.mMap.update({
          where: { id: map.id },
          data: { status: MapStatusNew.APPROVED }
        });
      });

      it('should 404 if the map is not found', () =>
        req.get({ url: `maps/${NULL_ID}`, status: 404, token: u1Token }));

      it('should 401 when no access token is provided', () =>
        req.unauthorizedTest('maps/1', 'get'));
    });

    describe('POST', () => {
      let u1, u1Token, u2Token, map, bspBuffer, bspHash, vmfBuffer, vmfHash;

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

      afterAll(() => {
        db.cleanup('user');
        fileStore.deleteDirectory('submissions');
      });

      beforeEach(async () => {
        const m = await db.createMap({
          name: 'map',
          fileName: 'surf_map',
          submitter: { connect: { id: u1.id } },
          status: MapStatusNew.PRIVATE_TESTING,
          submission: {
            create: {
              type: MapSubmissionType.ORIGINAL,
              suggestions: [
                { track: 1, gamemode: Gamemode.SURF, tier: 10, ranked: true }
              ],
              versions: {
                create: {
                  versionNum: 1,
                  hash: createSha1Hash(Buffer.from('hash browns'))
                }
              }
            }
          }
        });

        map = await prisma.mMap.update({
          where: { id: m.id },
          data: {
            submission: {
              update: {
                currentVersion: { connect: { id: m.submission.versions[0].id } }
              }
            }
          }
        });
      });

      afterEach(() => db.cleanup('mMap'));

      it('should add a new map submission version', async () => {
        const changelog = 'Added walls, floors etc...';
        const res = await req.postAttach({
          url: `maps/${map.id}`,
          status: 201,
          data: { changelog },
          files: [
            { file: bspBuffer, field: 'bsp', fileName: 'surf_map.bsp' },
            { file: vmfBuffer, field: 'vmfs', fileName: 'surf_map.vmf' }
          ],
          validate: MapDto,
          token: u1Token
        });

        expect(res.body.submission).toMatchObject({
          currentVersion: {
            versionNum: 2,
            changelog
          },
          versions: [{ versionNum: 1 }, { versionNum: 2, changelog }]
        });

        const submissionDB = await prisma.mapSubmission.findUnique({
          where: { mapID: map.id },
          include: { currentVersion: true }
        });

        expect(submissionDB.currentVersion.versionNum).toBe(2);
        expect(res.body.submission.currentVersion.id).toBe(
          submissionDB.currentVersion.id
        );
      });

      it('should upload the BSP and VMF files', async () => {
        const res = await req.postAttach({
          url: `maps/${map.id}`,
          status: 201,
          data: { changelog: 'Added lights, spawn entity etc...' },
          files: [
            { file: bspBuffer, field: 'bsp', fileName: 'surf_map.bsp' },
            { file: vmfBuffer, field: 'vmfs', fileName: 'surf_map.vmf' }
          ],
          validate: MapDto,
          token: u1Token
        });

        const currentVersion = res.body.submission.currentVersion;

        expect(currentVersion.downloadURL.split('/').slice(-2)).toEqual([
          'submissions',
          `${currentVersion.id}.bsp`
        ]);

        const bspDownloadBuffer = await axios
          .get(currentVersion.downloadURL, { responseType: 'arraybuffer' })
          .then((res) => Buffer.from(res.data, 'binary'));
        const bspDownloadHash = createSha1Hash(bspDownloadBuffer);

        expect(bspHash).toBe(currentVersion.hash);
        expect(bspDownloadHash).toBe(currentVersion.hash);

        expect(currentVersion.vmfDownloadURL.split('/').slice(-2)).toEqual([
          'submissions',
          `${currentVersion.id}_VMFs.zip`
        ]);

        const vmfDownloadBuffer = await axios
          .get(currentVersion.vmfDownloadURL, { responseType: 'arraybuffer' })
          .then((res) => Buffer.from(res.data, 'binary'));

        const zip = new Zip(vmfDownloadBuffer);

        const extractedVmf = zip.getEntry('surf_map.vmf').getData();
        expect(createSha1Hash(extractedVmf)).toBe(vmfHash);
      });

      it('should 400 if BSP filename does not start with the fileName on the DTO', async () => {
        await req.postAttach({
          url: `maps/${map.id}`,
          status: 400,
          data: { changelog: 'EEEE' },
          files: [
            { file: bspBuffer, field: 'bsp', fileName: 'bhop_map.vmf' },
            { file: vmfBuffer, field: 'vmfs', fileName: 'surf_map.vmf' }
          ],
          token: u1Token
        });
      });

      it('should succeed if BSP filename starts with but does not equal the fileName on the DTO', async () => {
        await req.postAttach({
          url: `maps/${map.id}`,
          status: 201,
          data: { changelog: 'mombo man' },
          files: [
            { file: bspBuffer, field: 'bsp', fileName: 'surf_map_a3.bsp' },
            { file: vmfBuffer, field: 'vmfs', fileName: 'surf_map.vmf' }
          ],
          token: u1Token
        });
      });

      it('should 400 if BSP filename does not end in .bsp', async () => {
        await req.postAttach({
          url: `maps/${map.id}`,
          status: 400,
          data: { changelog: 'dogecoin' },
          files: [
            { file: bspBuffer, field: 'bsp', fileName: 'surf_map.com' },
            { file: vmfBuffer, field: 'vmfs', fileName: 'surf_map.vmf' }
          ],
          token: u1Token
        });
      });

      it('should 404 if the map does not exist', () =>
        req.postAttach({
          url: `maps/${NULL_ID}`,
          status: 404,
          data: { changelog: 'what is this' },
          files: [
            { file: bspBuffer, field: 'bsp', fileName: 'surf_map.bsp' },
            { file: vmfBuffer, field: 'vmfs', fileName: 'surf_map.vmf' }
          ],
          token: u2Token
        }));

      it('should 403 if the user is not the map submitter', () =>
        req.postAttach({
          url: `maps/${map.id}`,
          status: 403,
          data: { changelog: 'let me touch your map' },
          files: [
            { file: bspBuffer, field: 'bsp', fileName: 'surf_map.bsp' },
            { file: vmfBuffer, field: 'vmfs', fileName: 'surf_map.vmf' }
          ],
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
          files: [
            { file: bspBuffer, field: 'bsp', fileName: 'surf_map.bsp' },
            { file: vmfBuffer, field: 'vmfs', fileName: 'surf_map.vmf' }
          ],
          token: u1Token
        });

        await prisma.user.update({
          where: { id: u1.id },
          data: { bans: 0 }
        });
      });

      it('should 400 if BSP file is missing', async () => {
        await req.postAttach({
          url: `maps/${map.id}`,
          status: 400,
          data: { changelog: 'help me' },
          files: [{ file: vmfBuffer, field: 'vmfs', fileName: 'surf_map.vmf' }],
          token: u1Token
        });

        await req.post({
          url: 'maps',
          status: 400,
          body: { changelog: 'im bored' },
          token: u1Token
        });
      });

      it("should 400 if BSP file is greater than the config's max bsp file size", async () => {
        await req.postAttach({
          url: `maps/${map.id}`,
          status: 400,
          data: { changelog: 'so very bored' },
          files: [
            {
              file: Buffer.alloc(Config.limits.bspSize + 1),
              field: 'bsp',
              fileName: 'surf_map.bsp'
            },
            { file: vmfBuffer, field: 'vmfs', fileName: 'surf_map.bsp' },
            { file: vmfBuffer, field: 'vmfs', fileName: 'surf_map.vmf' }
          ],
          token: u1Token
        });
      });

      it('should succeed if VMF file is missing', async () =>
        req.postAttach({
          url: `maps/${map.id}`,
          status: 201,
          data: { changelog: 'who needs tests anyway' },
          files: [{ file: bspBuffer, field: 'bsp', fileName: 'surf_map.bsp' }],
          token: u1Token
        }));

      it('should 400 if VMF file is invalid', () =>
        req.postAttach({
          url: `maps/${map.id}`,
          status: 400,
          data: { changelog: 'just hope it works' },
          files: [
            { file: bspBuffer, field: 'bsp', fileName: 'surf_map.bsp' },
            {
              file: Buffer.from('{' + vmfBuffer.toString()),
              field: 'vmfs',
              fileName: 'surf_map.vmf'
            }
          ],
          token: u1Token
        }));

      it('should 400 if a VMF filename does not end in .vmf', async () => {
        await req.postAttach({
          url: `maps/${map.id}`,
          status: 400,
          data: { changelog: 'shoutout to winrar' },
          files: [
            { file: bspBuffer, field: 'bsp', fileName: 'surf_map.bsp' },
            { file: vmfBuffer, field: 'vmfs', fileName: 'surf_map.rar' }
          ],
          token: u1Token
        });
      });

      it("should 400 if a VMF file is greater than the config's max vmf file size", () =>
        req.postAttach({
          url: `maps/${map.id}`,
          status: 400,
          data: { changelog: 'kill me' },
          files: [
            { file: bspBuffer, field: 'bsp', fileName: 'surf_map.bsp' },
            {
              file: Buffer.alloc(Config.limits.vmfSize + 1),
              field: 'vmfs',
              fileName: 'surf_map.vmf'
            }
          ],
          token: u1Token
        }));

      it('should 400 if the changelog is missing', () =>
        req.postAttach({
          url: `maps/${map.id}`,
          status: 400,
          data: {},
          files: [
            { file: bspBuffer, field: 'bsp', fileName: 'surf_map.bsp' },
            { file: vmfBuffer, field: 'vmfs', fileName: 'surf_map.vmf' }
          ],
          token: u1Token
        }));

      for (const status of [
        MapStatusNew.APPROVED,
        MapStatusNew.DISABLED,
        MapStatusNew.REJECTED
      ]) {
        it(`should 403 if the map status is ${MapStatusNew[status]}`, async () => {
          await prisma.mMap.update({ where: { id: map.id }, data: { status } });

          await req.postAttach({
            url: `maps/${map.id}`,
            status: 403,
            data: { changelog: 'awoooooga' },
            files: [
              { file: bspBuffer, field: 'bsp', fileName: 'surf_map.bsp' }
            ],
            token: u1Token
          });

          await prisma.mMap.update({
            where: { id: map.id },
            data: { status: MapStatusNew.PRIVATE_TESTING }
          });
        });
      }

      it('should 401 when no access token is provided', () =>
        req.unauthorizedTest('maps/1', 'post'));
    });

    describe('PATCH', () => {
      let user, token;

      beforeAll(
        async () =>
          ([user, token] = await db.createAndLoginUser({
            data: { roles: Role.MAPPER }
          }))
      );

      afterAll(() => db.cleanup('user'));

      // TODO: These will need
      // describe('Status changes', () => {
      //   let map;
      //
      //   beforeAll(
      //     async () =>
      //       (map = await db.createMap({
      //         submitter: { connect: { id: user.id } }
      //       }))
      //   );
      //   afterAll(() => db.cleanup('mMap'));
      //
      //   const statuses = Object.values(MapStatus).filter(
      //     (v) => typeof v === 'number'
      //   ) as MapStatus[];
      //   // Storing number tuple won't pass .has
      //   const validChanges = new Set([
      //     MapStatus.NEEDS_REVISION + ',' + MapStatus.READY_FOR_RELEASE
      //   ]);
      //
      //   for (const s1 of statuses) {
      //     for (const s2 of statuses.filter((s) => s !== s1)) {
      //       const shouldPass = validChanges.has(s1 + ',' + s2);
      //
      //       it(`should ${
      //         shouldPass ? '' : 'not '
      //       }allow a mapper to change their map from ${MapStatus[s1]} to ${
      //         MapStatus[s2]
      //       }`, async () => {
      //         await prisma.mMap.update({
      //           where: { id: map.id },
      //           data: { status: s1 }
      //         });
      //
      //         await req.patch({
      //           url: `maps/${map.id}`,
      //           status: shouldPass ? 204 : 403,
      //           body: { status: s2 },
      //           token: token
      //         });
      //       });
      //     }
      //   }
      // });

      describe('Everything else', () => {
        afterEach(() => db.cleanup('mMap', 'activity'));

        it('should allow a mapper set their map status to ready for release', async () => {
          const map = await db.createMap({
            status: MapStatus.NEEDS_REVISION,
            submitter: { connect: { id: user.id } }
          });

          const newStatus = MapStatus.READY_FOR_RELEASE;
          await req.patch({
            url: `maps/${map.id}`,
            status: 204,
            body: { status: newStatus },
            token: token
          });

          const updatedMap = await prisma.mMap.findUnique({
            where: { id: map.id }
          });
          expect(updatedMap.status).toEqual(newStatus);
        });

        it('should return 400 if the status flag is invalid', async () => {
          const map = await db.createMap({
            submitter: { connect: { id: user.id } }
          });

          await req.patch({
            url: `maps/${map.id}`,
            status: 400,
            body: { status: 3000 },
            token: token
          });
        });

        it('should return 403 if the map was not submitted by that user', async () => {
          const map = await db.createMap({ status: MapStatus.NEEDS_REVISION });

          await req.patch({
            url: `maps/${map.id}`,
            status: 403,
            body: { status: MapStatus.READY_FOR_RELEASE },
            token: token
          });
        });

        it('should return 403 if the user does not have the mapper role', async () => {
          const [u2, u2Token] = await db.createAndLoginUser();
          const map2 = await db.createMap({
            submitter: { connect: { id: u2.id } }
          });

          await req.patch({
            url: `maps/${map2.id}`,
            status: 403,
            body: { status: MapStatus.READY_FOR_RELEASE },
            token: u2Token
          });
        });

        it('should 404 when the map is not found', () =>
          req.patch({
            url: `maps/${NULL_ID}`,
            status: 404,
            body: { status: MapStatus.READY_FOR_RELEASE },
            token: token
          }));

        it('should 401 when no access token is provided', () =>
          req.unauthorizedTest('maps/1', 'patch'));
      });
    });
  });

  describe('maps/{mapID}/info', () => {
    describe('GET', () => {
      let token, map;

      beforeAll(
        async () =>
          ([token, map] = await Promise.all([
            db.loginNewUser(),
            db.createMap()
          ]))
      );

      afterAll(() => db.cleanup('user', 'mMap'));

      it('should respond with map info', () =>
        req.get({
          url: `maps/${map.id}/info`,
          status: 200,
          validate: MapInfoDto,
          token: token
        }));

      // Test that permissions checks are getting called
      it('should 403 if the user does not have permission to access to the map', async () => {
        await prisma.mMap.update({
          where: { id: map.id },
          data: { status: MapStatusNew.PRIVATE_TESTING }
        });

        await req.get({
          url: `maps/${map.id}/info`,
          status: 403,
          token: token
        });

        await prisma.mMap.update({
          where: { id: map.id },
          data: { status: MapStatusNew.APPROVED }
        });
      });

      it('should return 404 if the map is not found', () =>
        req.get({ url: `maps/${NULL_ID}/info`, status: 404, token: token }));

      it('should 401 when no access token is provided', () =>
        req.unauthorizedTest('maps/1/info', 'get'));
    });

    describe('PATCH', () => {
      let user, token, map;

      beforeAll(async () => {
        [user, token] = await db.createAndLoginUser({
          data: { roles: Role.MAPPER }
        });
        map = await db.createMap({
          status: MapStatus.NEEDS_REVISION,
          submitter: { connect: { id: user.id } }
        });
      });

      afterAll(() => db.cleanup('user', 'mMap'));

      const infoUpdate = {
        description: 'This map is EXTREME',
        youtubeID: '70vwJy1dQ0c',
        creationDate: new Date('1999-02-06')
      };

      it('should allow the map submitter update the map info', async () => {
        await req.patch({
          url: `maps/${map.id}/info`,
          status: 204,
          body: infoUpdate,
          token: token
        });

        const updatedInfo = await prisma.mapInfo.findUnique({
          where: { mapID: map.id }
        });

        expect(updatedInfo).toMatchObject(infoUpdate);
      });

      it('should 400 if the date is invalid', () =>
        req.patch({
          url: `maps/${map.id}/info`,
          status: 400,
          body: { creationDate: 'its chewsday init' },
          token: token
        }));

      it('should return 400 if the youtube ID is invalid', () =>
        req.patch({
          url: `maps/${map.id}/info`,
          status: 400,
          body: { youtubeID: 'https://www.myspace.com/watch?v=70vwJy1dQ0c' },
          token: token
        }));

      it('should return 400 if no update data is provided', () =>
        req.patch({ url: `maps/${map.id}/info`, status: 400, token: token }));

      it('should return 404 if the map does not exist', () =>
        req.patch({
          url: `maps/${NULL_ID}/info`,
          status: 404,
          body: infoUpdate,
          token: token
        }));

      it('should return 403 if the map was not submitted by that user', async () => {
        const [_, u2Token] = await db.createAndLoginUser({
          data: { roles: Role.MAPPER }
        });

        await req.patch({
          url: `maps/${map.id}/info`,
          status: 403,
          body: infoUpdate,
          token: u2Token
        });
      });

      it('should return 403 if the map is not in NEEDS_REVISION state', async () => {
        const map2 = await db.createMap({
          status: MapStatus.APPROVED,
          submitter: { connect: { id: user.id } }
        });

        await req.patch({
          url: `maps/${map2.id}/info`,
          status: 403,
          body: infoUpdate,
          token: token
        });
      });

      it('should return 403 if the user does not have the mapper role', async () => {
        await prisma.user.update({
          where: { id: user.id },
          data: { roles: 0 }
        });

        await req.patch({
          url: `maps/${map.id}/info`,
          status: 403,
          body: infoUpdate,
          token: token
        });
      });

      it('should 401 when no access token is provided', () =>
        req.unauthorizedTest('maps/1/info', 'patch'));
    });
  });

  describe('maps/{mapID}/credits', () => {
    describe('GET', () => {
      let u1, u1Token, u2, u3Token, map;

      beforeAll(async () => {
        [[u1, u1Token], u2, u3Token] = await Promise.all([
          db.createAndLoginUser(),
          db.createUser(),
          db.loginNewUser()
        ]);
        map = await db.createMap({
          credits: {
            createMany: {
              data: [
                { userID: u1.id, type: MapCreditType.AUTHOR },
                { userID: u2.id, type: MapCreditType.SPECIAL_THANKS }
              ]
            }
          }
        });
      });

      afterAll(() => db.cleanup('user', 'mMap'));

      it('should respond with the specified maps credits', async () => {
        const res = await req.get({
          url: `maps/${map.id}/credits`,
          status: 200,
          token: u1Token
        });

        for (const credit of res.body)
          expect(credit).toBeValidDto(MapCreditDto);
        expect(res.body).toHaveLength(2);
      });

      it('should respond with the specified maps credits with the user expand parameter', async () => {
        const res = await req.get({
          url: `maps/${map.id}/credits`,
          status: 200,
          query: { expand: 'user' },
          token: u1Token
        });

        for (const credit of res.body) {
          expect(credit).toBeValidDto(MapCreditDto);
          expect(credit.user).toBeValidDto(UserDto);
        }
      });

      it('should return an empty array when no map credits found', async () => {
        const map = await db.createMap();

        const res = await req.get({
          url: `maps/${map.id}/credits`,
          status: 200,
          token: u1Token
        });

        expect(res.body).toBeInstanceOf(Array);
        expect(res.body.length).toBe(0);
      });

      // Test that permissions checks are getting called
      it('should 403 if the user does not have permission to access to the map', async () => {
        await prisma.mMap.update({
          where: { id: map.id },
          data: { status: MapStatusNew.PRIVATE_TESTING }
        });

        await req.get({
          url: `maps/${map.id}/credits`,
          status: 403,
          token: u3Token
        });

        await prisma.mMap.update({
          where: { id: map.id },
          data: { status: MapStatusNew.APPROVED }
        });
      });

      it('should return 404 when the map does not exist', () =>
        req.get({
          url: `maps/${NULL_ID}/credits`,
          status: 404,
          token: u1Token
        }));

      it('should 401 when no access token is provided', () =>
        req.unauthorizedTest('maps/1/credits', 'get'));
    });

    describe('PUT', () => {
      let u1,
        u1Token,
        u2,
        u2Token,
        u3,
        u4,
        adminToken,
        modToken,
        map,
        newMapCredit;

      beforeEach(async () => {
        [u1, u1Token] = await db.createAndLoginUser({
          data: { roles: Role.MAPPER }
        });
        [u2, u2Token] = await db.createAndLoginUser({
          data: { roles: Role.MAPPER }
        });
        u3 = await db.createUser();
        u4 = await db.createUser();
        adminToken = await db.loginNewUser({ data: { roles: Role.ADMIN } });
        modToken = await db.loginNewUser({ data: { roles: Role.MODERATOR } });
        map = await db.createMap({
          submitter: { connect: { id: u1.id } },
          status: MapStatus.NEEDS_REVISION
        });
        newMapCredit = [
          {
            type: MapCreditType.AUTHOR,
            userID: u2.id,
            description: 'My hairdresser'
          }
        ];
      });

      afterEach(() => db.cleanup('user', 'mMap'));

      it('should create a map credit', async () => {
        const res = await req.put({
          url: `maps/${map.id}/credits`,
          status: 201,
          body: newMapCredit,
          validateArray: MapCreditDto,
          token: u1Token
        });

        expect(res.body).toMatchObject([
          {
            userID: u2.id,
            mapID: map.id,
            user: { id: u2.id } // Check we include the user
          }
        ]);

        const credit = await prisma.mapCredit.findFirst();
        expect(credit).toMatchObject({ userID: u2.id, mapID: map.id });
      });

      it('should delete an credits for the map not on the new DTO', async () => {
        await prisma.mapCredit.create({
          data: { type: MapCreditType.AUTHOR, userID: u1.id, mapID: map.id }
        });

        await req.put({
          url: `maps/${map.id}/credits`,
          status: 201,
          body: [{ type: MapCreditType.AUTHOR, userID: u2.id }],
          validateArray: MapCreditDto,
          token: u1Token
        });

        const credits = await prisma.mapCredit.findMany();
        expect(credits.length).toBe(1);
        expect(credits[0].userID).toBe(u2.id);
      });

      it('should create multiple map credit and store in order', async () => {
        await req.put({
          url: `maps/${map.id}/credits`,
          status: 201,
          body: [
            { userID: u4.id, type: MapCreditType.AUTHOR },
            { userID: u2.id, type: MapCreditType.AUTHOR },
            {
              userID: u3.id,
              type: MapCreditType.CONTRIBUTOR,
              description: 'Emotional support'
            },
            {
              userID: u1.id,
              type: MapCreditType.CONTRIBUTOR,
              description: 'Physical support'
            }
          ],
          validateArray: MapCreditDto,
          token: u1Token
        });

        const credits = await prisma.mapCredit.findMany();
        expect(credits).toMatchObject([
          { userID: u4.id, mapID: map.id },
          { userID: u2.id, mapID: map.id },
          { userID: u3.id, mapID: map.id },
          { userID: u1.id, mapID: map.id }
        ]);

        const got = await req.get({
          url: `maps/${map.id}/credits`,
          status: 200,
          token: u1Token
        });

        expect(got.body[0].userID).toBe(u4.id);
        expect(got.body[1].userID).toBe(u2.id);
        expect(got.body[2].userID).toBe(u3.id);
        expect(got.body[3].userID).toBe(u1.id);
      });

      // Exact same as above but we swap the order of the body, just to check
      // that that affects what order the results are fetched in
      it('should create multiple map credit and store in order part 2', async () => {
        await req.put({
          url: `maps/${map.id}/credits`,
          status: 201,
          body: [
            { userID: u1.id, type: MapCreditType.AUTHOR },
            { userID: u2.id, type: MapCreditType.AUTHOR },
            {
              userID: u3.id,
              type: MapCreditType.CONTRIBUTOR,
              description: 'Culinary support'
            },
            {
              userID: u4.id,
              type: MapCreditType.CONTRIBUTOR,
              description: 'Legal support'
            }
          ],
          validateArray: MapCreditDto,
          token: u1Token
        });

        const credits = await prisma.mapCredit.findMany();
        expect(credits).toMatchObject([
          { userID: u1.id, mapID: map.id },
          { userID: u2.id, mapID: map.id },
          { userID: u3.id, mapID: map.id },
          { userID: u4.id, mapID: map.id }
        ]);

        const got = await req.get({
          url: `maps/${map.id}/credits`,
          status: 200,
          token: u1Token
        });

        expect(got.body[0].userID).toBe(u1.id);
        expect(got.body[1].userID).toBe(u2.id);
        expect(got.body[2].userID).toBe(u3.id);
        expect(got.body[3].userID).toBe(u4.id);
      });

      it('should 409 if the request contains duplicate credits', async () => {
        await req.put({
          url: `maps/${map.id}/credits`,
          status: 409,
          body: [...newMapCredit, ...newMapCredit],
          token: u1Token
        });
      });

      it('should create an activity if a new author is added', async () => {
        await req.put({
          url: `maps/${map.id}/credits`,
          status: 201,
          body: [{ type: MapCreditType.AUTHOR, userID: u2.id }],
          token: u1Token
        });

        const activity = await prisma.activity.findFirst();
        expect(activity).toMatchObject({
          data: BigInt(map.id),
          userID: u2.id,
          type: ActivityType.MAP_UPLOADED
        });
      });

      it('should remove activity if an author is removed', async () => {
        await prisma.activity.create({
          data: { type: ActivityType.MAP_UPLOADED, data: map.id, userID: u2.id }
        });
        await req.put({
          url: `maps/${map.id}/credits`,
          status: 201,
          body: [{ type: MapCreditType.AUTHOR, userID: u1.id }],
          token: u1Token
        });

        const activity = await prisma.activity.findFirst();
        expect(activity).toMatchObject({
          data: BigInt(map.id),
          userID: u2.id,
          type: ActivityType.MAP_UPLOADED
        });
      });

      it('should allow an admin to create a credit', () =>
        req.put({
          url: `maps/${map.id}/credits`,
          status: 201,
          body: newMapCredit,
          validateArray: MapCreditDto,
          token: adminToken
        }));

      it('should allow an admin to update a credit even if the map is not in the NEEDS_REVISION state', async () => {
        await prisma.mMap.update({
          where: { id: map.id },
          data: { status: MapStatus.APPROVED }
        });

        await req.put({
          url: `maps/${map.id}/credits`,
          status: 201,
          body: newMapCredit,
          validateArray: MapCreditDto,
          token: adminToken
        });

        await prisma.mMap.update({
          where: { id: map.id },
          data: { status: MapStatus.NEEDS_REVISION }
        });
      });

      it('should allow a mod to create a credit', () =>
        req.put({
          url: `maps/${map.id}/credits`,
          status: 201,
          body: newMapCredit,
          validateArray: MapCreditDto,
          token: modToken
        }));

      it('should allow a mod to update the credit even if the map is not in the NEEDS_REVISION state', async () => {
        await prisma.mMap.update({
          where: { id: map.id },
          data: { status: MapStatus.APPROVED }
        });

        await req.put({
          url: `maps/${map.id}/credits`,
          status: 201,
          body: newMapCredit,
          validateArray: MapCreditDto,
          token: modToken
        });

        await prisma.mMap.update({
          where: { id: map.id },
          data: { status: MapStatus.NEEDS_REVISION }
        });
      });

      it('should 404 if the map is not found', () =>
        req.post({
          url: `maps/${NULL_ID}/credits`,
          status: 404,
          body: newMapCredit,
          token: u1Token
        }));

      it('should 403 if the user is not the map submitter', () =>
        req.put({
          url: `maps/${map.id}/credits`,
          status: 403,
          body: newMapCredit,
          token: u2Token
        }));

      it("should 403 if the user doesn't have the mapper role", async () => {
        await prisma.user.update({
          where: { id: u1.id },
          data: { roles: 0 }
        });

        await req.put({
          url: `maps/${map.id}/credits`,
          status: 403,
          body: newMapCredit,
          token: u1Token
        });

        await prisma.user.update({
          where: { id: u1.id },
          data: { roles: Role.MAPPER }
        });
      });

      it('should 403 if the map is not in NEEDS_REVISION state', async () => {
        await prisma.mMap.update({
          where: { id: map.id },
          data: { status: MapStatus.APPROVED }
        });

        await req.put({
          url: `maps/${map.id}/credits`,
          status: 403,
          body: newMapCredit,
          token: u1Token
        });

        await prisma.mMap.update({
          where: { id: map.id },
          data: { status: MapStatus.NEEDS_REVISION }
        });
      });

      it('should 400 if the map credit object is invalid', async () => {
        await req.put({
          url: `maps/${map.id}/credits`,
          status: 400,
          body: { type: -6, userID: u1.id }, // Endpoint only takes arrays!
          token: u1Token
        });

        await req.put({
          url: `maps/${map.id}/credits`,
          status: 400,
          body: [{ type: -6, userID: u1.id }],
          token: u1Token
        });

        await req.put({
          url: `maps/${map.id}/credits`,
          status: 400,
          body: [{ type: MapCreditType.AUTHOR, userID: 'Bono' }],
          token: u1Token
        });
      });

      it('should 400 if a user ID is missing on a credit', () =>
        req.put({
          url: `maps/${map.id}/credits`,
          status: 400,
          body: [{ type: MapCreditType.TESTER }],
          token: u1Token
        }));

      it('should 400 if a type is missing on a credit', () =>
        req.put({
          url: `maps/${map.id}/credits`,
          status: 400,
          body: [{ userID: u2.id }],
          token: u1Token
        }));

      it('should 400 if theres no AUTHOR credits', () =>
        req.put({
          url: `maps/${map.id}/credits`,
          status: 400,
          body: [{ userID: u2.id, type: MapCreditType.TESTER }],
          token: u1Token
        }));

      it('should 400 if the description is too long', () =>
        req.put({
          url: `maps/${map.id}/credits`,
          status: 400,
          body: {
            userID: u2.id,
            type: MapCreditType.AUTHOR,
            description:
              'Momentum Man; The fabled master of every gamemode, with more records than ever seen. Scientist, lover, Source movement legend. But how did he die? Follow in his footsteps, unlock the mystery.'
          },
          token: u1Token
        }));

      it('should 400 if the credited user does not exist', () =>
        req.put({
          url: `maps/${map.id}/credits`,
          status: 400,
          body: { type: MapCreditType.AUTHOR, userID: NULL_ID },
          token: u1Token
        }));

      it('should 401 when no access token is provided', () =>
        req.unauthorizedTest(`maps/${map.id}/credits`, 'put'));
    });
  });

  describe('maps/{mapID}/credits/{userID}', () => {
    describe('GET', () => {
      let user, token, map, u2Token;
      const creditType = MapCreditType.AUTHOR;

      beforeAll(async () => {
        [[user, token], map, u2Token] = await Promise.all([
          db.createAndLoginUser(),
          db.createMap(),
          db.loginNewUser()
        ]);
      });

      afterAll(() => db.cleanup('user', 'mMap'));

      beforeEach(() =>
        prisma.mapCredit.create({
          data: { mapID: map.id, userID: user.id, type: creditType }
        })
      );

      afterEach(() => prisma.mapCredit.deleteMany());

      it('should return the specified map credit', async () => {
        const res = await req.get({
          url: `maps/${map.id}/credits/${user.id}`,
          status: 200,
          validate: MapCreditDto,
          token: token
        });

        expect(res.body).toMatchObject({
          type: creditType,
          userID: user.id,
          mapID: map.id
        });
      });

      it('should return the specified map credit with the user expand parameter', () =>
        req.expandTest({
          url: `maps/${map.id}/credits/${user.id}`,
          expand: 'user',
          validate: MapCreditDto,
          token: token
        }));

      // Test that permissions checks are getting called
      it('should 403 if the user does not have permission to access to the map', async () => {
        await prisma.mMap.update({
          where: { id: map.id },
          data: { status: MapStatusNew.PRIVATE_TESTING }
        });

        await req.get({
          url: `maps/${map.id}/credits/${user.id}`,
          status: 403,
          token: u2Token
        });

        await prisma.mMap.update({
          where: { id: map.id },
          data: { status: MapStatusNew.APPROVED }
        });
      });

      it('should return a 404 if the map is not found', () =>
        req.get({
          url: `maps/${NULL_ID}/credits/${user.id}`,
          status: 404,
          token: token
        }));

      it('should return a 404 if the user is not found', () =>
        req.get({
          url: `maps/${map.id}/credits/${NULL_ID}`,
          status: 404,
          token: token
        }));

      it('should 401 when no access token is provided', () =>
        req.unauthorizedTest(`maps/${map.id}/credits/${user.id}`, 'get'));
    });
  });

  describe('maps/{mapID}/zones', () => {
    describe('GET', () => {
      let token, map;
      beforeAll(
        async () =>
          ([token, map] = await Promise.all([
            db.loginNewUser(),
            db.createMap(
              {},
              {
                zones: {
                  createMany: { data: [{ zoneNum: 0 }, { zoneNum: 1 }] }
                }
              }
            )
          ]))
      );

      afterAll(() => db.cleanup('user', 'mMap'));

      it('should respond with the map zones', async () => {
        const res = await req.get({
          url: `maps/${map.id}/zones`,
          status: 200,
          token: token
        });

        expect(res.body).toHaveLength(1);
        expect(res.body[0]).toBeValidDto(MapTrackDto);
        expect(res.body[0].zones).toHaveLength(2);
      });

      it('should 404 if the map does not exist', () =>
        req.get({ url: `maps/${NULL_ID}/zones`, status: 404, token: token }));

      it('should 401 when no access token is provided', () =>
        req.unauthorizedTest('maps/1/zones', 'get'));
    });
  });

  describe('maps/{mapID}/thumbnail', () => {
    describe('PUT', () => {
      let user, token, map;
      beforeAll(async () => {
        [user, token] = await db.createAndLoginUser({
          data: { roles: Role.MAPPER }
        });
        map = await db.createMap({
          status: MapStatus.NEEDS_REVISION,
          submitter: { connect: { id: user.id } }
        });
      });

      afterAll(() => db.cleanup('user', 'mMap'));

      it('should update the thumbnail for a map', () =>
        req.putAttach({
          url: `maps/${map.id}/thumbnail`,
          status: 204,
          file: 'image_jpg.jpg',
          token: token
        }));

      it('should create a thumbnail if one does not exist already', async () => {
        await prisma.mapImage.deleteMany();

        let map = await prisma.mMap.findFirst();
        expect(map.thumbnailID).toBeNull();

        await req.putAttach({
          url: `maps/${map.id}/thumbnail`,
          status: 204,
          file: 'image_png.png',
          token: token
        });

        map = await prisma.mMap.findFirst();
        expect(map.thumbnailID).toBeDefined();

        for (const size of ['small', 'medium', 'large'])
          expect(
            await fileStore.exists(`img/${map.thumbnailID}-${size}.jpg`)
          ).toBe(true);
      });

      it('should return a 400 if no thumbnail file is provided', () =>
        req.put({
          url: `maps/${map.id}/thumbnail`,
          status: 400,
          token: token
        }));

      it('should 403 if the user is not the submitter of the map', async () => {
        await prisma.mMap.update({
          where: { id: map.id },
          data: { submitter: { create: { alias: 'Ron Weasley' } } }
        });

        await req.putAttach({
          url: `maps/${map.id}/thumbnail`,
          status: 403,
          file: 'image_png.png',
          token: token
        });

        await prisma.mMap.update({
          where: { id: map.id },
          data: { submitterID: user.id }
        });
      });

      it('should 403 if the user is not a mapper', async () => {
        await prisma.user.update({
          where: { id: user.id },
          data: { roles: 0 }
        });

        await req.putAttach({
          url: `maps/${map.id}/thumbnail`,
          status: 403,
          file: 'image_jpg.jpg',
          token: token
        });

        await prisma.user.update({
          where: { id: user.id },
          data: { roles: Role.MAPPER }
        });
      });

      it('should 403 if the map is not in the NEEDS_REVISION state', async () => {
        await prisma.mMap.update({
          where: { id: map.id },
          data: { status: MapStatus.APPROVED }
        });

        await req.putAttach({
          url: `maps/${map.id}/thumbnail`,
          status: 403,
          file: 'image_jpg.jpg',
          token: token
        });

        await prisma.mMap.update({
          where: { id: map.id },
          data: { status: MapStatus.NEEDS_REVISION }
        });
      });

      it('should 401 when no access token is provided', () =>
        req.unauthorizedTest('maps/1/thumbnail', 'put'));
    });
  });

  describe('maps/{mapID}/images', () => {
    describe('GET', () => {
      let token, map;
      beforeAll(async () => {
        [token, map] = await Promise.all([
          db.loginNewUser(),
          db.createMap({ images: { createMany: { data: [{}, {}] } } })
        ]);
      });

      afterAll(() => db.cleanup('user', 'mMap'));

      it('should respond with a list of images', () =>
        req.get({
          url: `maps/${map.id}/images`,
          status: 200,
          validateArray: { type: MapImageDto, length: 2 },
          token: token
        }));

      // Test that permissions checks are getting called
      it('should 403 if the user does not have permission to access to the map', async () => {
        await prisma.mMap.update({
          where: { id: map.id },
          data: { status: MapStatusNew.PRIVATE_TESTING }
        });

        await req.get({
          url: `maps/${map.id}/images`,
          status: 403,
          token: token
        });

        await prisma.mMap.update({
          where: { id: map.id },
          data: { status: MapStatusNew.APPROVED }
        });
      });

      it('should 404 if map does not exist', () =>
        req.get({ url: `maps/${NULL_ID}/images`, status: 404, token: token }));

      it('should 401 when no access token is provided', () =>
        req.unauthorizedTest('maps/1/images', 'get'));
    });

    describe('POST', () => {
      let user, token, map;
      beforeAll(async () => {
        [user, token] = await db.createAndLoginUser({
          data: { roles: Role.MAPPER }
        });
        map = await db.createMap({
          status: MapStatus.NEEDS_REVISION,
          submitter: { connect: { id: user.id } },
          images: {}
        });
      });

      afterAll(() => db.cleanup('user', 'mMap'));

      afterEach(() =>
        Promise.all([
          prisma.mapImage.deleteMany(),
          fileStore.deleteDirectory('img')
        ])
      );

      it('should create a map image for the specified map', async () => {
        const res = await req.postAttach({
          url: `maps/${map.id}/images`,
          status: 201,
          file: 'image_png.png',
          validate: MapImageDto,
          token: token
        });

        const updatedMap = await prisma.mMap.findFirst({
          include: { images: true }
        });
        for (const size of ['small', 'medium', 'large']) {
          expect(res.body[size]).toBeDefined();
          expect(
            await fileStore.exists(`img/${updatedMap.images[0].id}-${size}.jpg`)
          ).toBe(true);
        }
      });

      it('should 409 when the map image limit has been reached', async () => {
        await prisma.mapImage.createMany({
          data: Array.from({ length: 5 }, () => ({ mapID: map.id }))
        });

        await req.postAttach({
          url: `maps/${map.id}/images`,
          status: 409,
          file: 'image_png.png',
          token: token
        });
      });

      it('should 400 if the map image is invalid', () =>
        req.postAttach({
          url: `maps/${map.id}/images`,
          status: 400,
          file: 'map.zon',
          token: token
        }));

      it('should 400 if no file is provided', () =>
        req.post({ url: `maps/${map.id}/images`, status: 400, token: token }));

      it("should 400 when the image file is greater than the config's max image file size", () =>
        req.postAttach({
          url: `maps/${map.id}/images`,
          status: 400,
          file: Buffer.alloc(Config.limits.imageSize + 1),
          token: token
        }));

      it('should 403 if the user is not a mapper', async () => {
        await prisma.user.update({
          where: { id: user.id },
          data: { roles: 0 }
        });

        await req.postAttach({
          url: `maps/${map.id}/images`,
          status: 403,
          file: 'image_jpg.jpg',
          token: token
        });

        await prisma.user.update({
          where: { id: user.id },
          data: { roles: Role.MAPPER }
        });
      });

      it('should 403 if the user is not the submitter of the map', async () => {
        await prisma.mMap.update({
          where: { id: map.id },
          data: { submitter: { create: { alias: 'George Weasley' } } }
        });

        await req.postAttach({
          url: `maps/${map.id}/images`,
          status: 403,
          file: 'image_jpg.jpg',
          token: token
        });

        await prisma.mMap.update({
          where: { id: map.id },
          data: { submitter: { connect: { id: user.id } } }
        });
      });

      it('should 403 if the map is not in the NEEDS_REVISION state', async () => {
        await prisma.mMap.update({
          where: { id: map.id },
          data: { status: MapStatus.APPROVED }
        });

        await req.postAttach({
          url: `maps/${map.id}/images`,
          status: 403,
          file: 'image_jpg.jpg',
          token: token
        });

        await prisma.mMap.update({
          where: { id: map.id },
          data: { status: MapStatus.NEEDS_REVISION }
        });
      });

      it('should 401 when no access token is provided', () =>
        req.unauthorizedTest('maps/1/images', 'post'));
    });
  });

  describe('maps/images/{imgID}', () => {
    describe('GET', () => {
      let token, map;

      beforeAll(
        async () =>
          ([token, map] = await Promise.all([
            db.loginNewUser(),
            db.createMap()
          ]))
      );

      afterAll(() => db.cleanup('user', 'mMap'));

      it('should respond with image info', () =>
        req.get({
          url: `maps/images/${map.images[0].id}`,
          status: 200,
          validate: MapImageDto,
          token: token
        }));

      // Test that permissions checks are getting called
      it('should 403 if the user does not have permission to access to the map', async () => {
        await prisma.mMap.update({
          where: { id: map.id },
          data: { status: MapStatusNew.PRIVATE_TESTING }
        });

        await req.get({
          url: `maps/images/${map.images[0].id}`,
          status: 403,
          token: token
        });

        await prisma.mMap.update({
          where: { id: map.id },
          data: { status: MapStatusNew.APPROVED }
        });
      });

      it('should 404 when the image is not found', () =>
        req.get({ url: `maps/images/${NULL_ID}`, status: 404, token: token }));

      it('should 401 when no access token is provided', () =>
        req.unauthorizedTest('maps/images/1', 'get'));
    });

    describe('PUT', () => {
      let user, token, map, image, hash;
      beforeAll(async () => {
        [user, token] = await db.createAndLoginUser({
          data: { roles: Role.MAPPER }
        });
        map = await db.createMap({
          status: MapStatus.NEEDS_REVISION,
          submitter: { connect: { id: user.id } },
          images: { create: {} }
        });
        image = map.images[0];

        const fileBuffer = readFileSync(__dirname + '/../files/image_jpg.jpg');
        hash = createSha1Hash(fileBuffer);

        for (const size of ['small', 'medium', 'large'])
          await fileStore.add(`img/${image.id}-${size}.jpg`, fileBuffer);
      });

      afterAll(() =>
        Promise.all([
          db.cleanup('user', 'mMap'),
          fileStore.deleteDirectory('img')
        ])
      );

      it('should update the map image', async () => {
        await req.putAttach({
          url: `maps/images/${image.id}`,
          status: 204,
          file: 'image_jpg.jpg',
          token: token
        });

        for (const size of ['small', 'medium', 'large']) {
          expect(await fileStore.exists(`img/${image.id}-${size}.jpg`)).toBe(
            true
          );
          expect(
            await fileStore.checkHash(`img/${image.id}-${size}.jpg`, hash)
          ).toBe(false);
        }
      });

      it('should 404 when the image is not found', () =>
        req.putAttach({
          url: `maps/images/${NULL_ID}`,
          status: 404,
          file: 'image_jpg.jpg',
          token: token
        }));

      it('should 400 when no map image is provided', () =>
        req.put({ url: `maps/images/${image.id}`, status: 400, token: token }));

      it('should 400 if the map image is invalid', () =>
        req.putAttach({
          url: `maps/images/${image.id}`,
          status: 400,
          file: 'map.zon',
          token: token
        }));

      it('should 403 if the user is not a mapper', async () => {
        await prisma.user.update({
          where: { id: user.id },
          data: { roles: 0 }
        });

        await req.putAttach({
          url: `maps/images/${image.id}`,
          status: 403,
          file: 'image_jpg.jpg',
          token: token
        });

        await prisma.user.update({
          where: { id: user.id },
          data: { roles: Role.MAPPER }
        });
      });

      it('should 403 if the user is not the submitter of the map', async () => {
        await prisma.mMap.update({
          where: { id: map.id },
          data: { submitter: { create: { alias: 'Fred Weasley' } } }
        });

        await req.putAttach({
          url: `maps/images/${image.id}`,
          status: 403,
          file: 'image_png.png',
          token: token
        });

        await prisma.mMap.update({
          where: { id: map.id },
          data: { submitter: { connect: { id: user.id } } }
        });
      });

      it('should 403 if the map is not in the NEEDS_REVISION state', async () => {
        await prisma.mMap.update({
          where: { id: map.id },
          data: { status: MapStatus.APPROVED }
        });

        await req.putAttach({
          url: `maps/images/${image.id}`,
          status: 403,
          file: 'image_png.png',
          token: token
        });

        await prisma.mMap.update({
          where: { id: map.id },
          data: { status: MapStatus.NEEDS_REVISION }
        });
      });

      it('should 401 when no access token is provided', () =>
        req.unauthorizedTest('maps/images/1', 'put'));
    });

    describe('DELETE', () => {
      let user, token, map, image;

      beforeAll(async () => {
        [user, token] = await db.createAndLoginUser({
          data: { roles: Role.MAPPER }
        });
        map = await db.createMap({
          status: MapStatus.NEEDS_REVISION,
          submitter: { connect: { id: user.id } },
          images: { create: {} }
        });
        image = map.images[0];

        const fileBuffer = readFileSync(__dirname + '/../files/image_jpg.jpg');
        for (const size of ['small', 'medium', 'large'])
          await fileStore.add(`img/${image.id}-${size}.jpg`, fileBuffer);
      });

      afterAll(async () => {
        await db.cleanup('user', 'mMap', 'run');
        await fileStore.deleteDirectory('img');
      });

      it('should delete the map image', async () => {
        for (const size of ['small', 'medium', 'large'])
          expect(await fileStore.exists(`img/${image.id}-${size}.jpg`)).toBe(
            true
          );

        await req.del({
          url: `maps/images/${image.id}`,
          status: 204,
          token: token
        });

        const updatedMap = await prisma.mMap.findFirst({
          include: { images: true }
        });

        expect(updatedMap.images).toHaveLength(0);

        for (const size of ['small', 'medium', 'large'])
          expect(await fileStore.exists(`img/${image.id}-${size}.jpg`)).toBe(
            false
          );

        // We've just successfully deleted an image and want to have one for
        // the remaining tests (though they don't actually need the files to
        // exist in the bucket). So create a new image for the remaining ones.
        // Much faster than `beforeEach`ing everything.
        image = await prisma.mapImage.create({ data: { mapID: map.id } });
      });

      it('should 404 when the image is not found', () =>
        req.del({ url: `maps/images/${NULL_ID}`, status: 404, token: token }));

      it('should 403 if the user is not a mapper', async () => {
        await prisma.user.update({
          where: { id: user.id },
          data: { roles: 0 }
        });

        await req.del({
          url: `maps/images/${image.id}`,
          status: 403,
          token: token
        });

        await prisma.user.update({
          where: { id: user.id },
          data: { roles: Role.MAPPER }
        });
      });

      it('should 403 if the user is not the submitter of the map', async () => {
        await prisma.mMap.update({
          where: { id: map.id },
          data: { submitter: { create: { alias: 'Bill Weasley' } } }
        });

        await req.del({
          url: `maps/images/${image.id}`,
          status: 403,
          token: token
        });

        await prisma.mMap.update({
          where: { id: map.id },
          data: { submitter: { connect: { id: user.id } } }
        });
      });

      it('should 403 if the map is not in the NEEDS_REVISION state', async () => {
        await prisma.mMap.update({
          where: { id: map.id },
          data: { status: MapStatus.APPROVED }
        });

        await req.del({
          url: `maps/images/${image.id}`,
          status: 403,
          token: token
        });

        await prisma.mMap.update({
          where: { id: map.id },
          data: { status: MapStatus.NEEDS_REVISION }
        });
      });

      it('should 401 when no access token is provided', () =>
        req.unauthorizedTest('maps/images/1', 'del'));
    });
  });

  describe('maps/{mapID}/ranks', () => {
    describe('GET', () => {
      let u1, u1Token, u2, u3, map;
      beforeAll(async () => {
        [[u1, u1Token], u2, u3, map] = await Promise.all([
          db.createAndLoginUser(),
          db.createUser(),
          db.createUser(),
          db.createMap()
        ]);
        await Promise.all([
          db.createRunAndRankForMap({
            map: map,
            user: u1,
            rank: 1,
            ticks: 10,
            flags: 1,
            createdAt: futureDateOffset(3)
          }),
          db.createRunAndRankForMap({
            map: map,
            user: u2,
            rank: 2,
            ticks: 20,
            flags: 1,
            createdAt: futureDateOffset(2)
          }),
          db.createRunAndRankForMap({
            map: map,
            user: u3,
            rank: 3,
            ticks: 30,
            flags: 2,
            createdAt: futureDateOffset(1)
          })
        ]);
      });

      afterAll(() => db.cleanup('user', 'mMap', 'run'));

      it("should return a list of a map's ranks", () =>
        req.get({
          url: `maps/${map.id}/ranks`,
          status: 200,
          validatePaged: { type: RankDto, count: 3 },
          token: u1Token
        }));

      it('should return only runs for a single player when given the query param playerID', async () => {
        const res = await req.get({
          url: `maps/${map.id}/ranks`,
          status: 200,
          query: { playerID: u2.id },
          validatePaged: { type: RankDto, count: 1 },
          token: u1Token
        });

        expect(res.body.data[0]).toMatchObject({
          mapID: map.id,
          userID: u2.id,
          flags: 1,
          rank: 2
        });
      });

      it('should return only runs for a set of players when given the query param playerIDs', async () => {
        const res = await req.get({
          url: `maps/${map.id}/ranks`,
          status: 200,
          query: { playerIDs: `${u1.id},${u2.id}` },
          validatePaged: { type: RankDto, count: 2 },
          token: u1Token
        });

        for (const rank of res.body.data)
          expect([u1.id, u2.id]).toContain(rank.userID);
      });

      it('should return only runs with specific flags when given the query param flags', async () => {
        const res = await req.get({
          url: `maps/${map.id}/ranks`,
          status: 200,
          query: { flags: 1 },
          validatePaged: { type: RankDto, count: 2 },
          token: u1Token
        });

        for (const rank of res.body.data)
          expect([u1.id, u2.id]).toContain(rank.userID);
      });

      it('should order the list by date when given the query param orderByDate', () =>
        req.sortByDateTest({
          url: `maps/${map.id}/ranks`,
          query: { orderByDate: true },
          validate: RankDto,
          token: u1Token
        }));

      it('should be ordered by rank by default', () =>
        req.sortTest({
          url: `maps/${map.id}/ranks`,
          validate: RankDto,
          sortFn: (a, b) => a.time - b.time,
          token: u1Token
        }));

      it('should respond with filtered map data using the skip parameter', () =>
        req.skipTest({
          url: `maps/${map.id}/ranks`,
          validate: RankDto,
          token: u1Token
        }));

      it('should respond with filtered map data using the take parameter', () =>
        req.takeTest({
          url: `maps/${map.id}/ranks`,
          validate: RankDto,
          token: u1Token
        }));

      // Test that permissions checks are getting called
      // Yes, u1 has runs on the map, but we don't actually test for that
      it('should 403 if the user does not have permission to access to the map', async () => {
        await prisma.mMap.update({
          where: { id: map.id },
          data: { status: MapStatusNew.PRIVATE_TESTING }
        });

        await req.get({
          url: `maps/${map.id}/ranks`,
          status: 403,
          token: u1Token
        });

        await prisma.mMap.update({
          where: { id: map.id },
          data: { status: MapStatusNew.APPROVED }
        });
      });

      it('should return 404 for a nonexistent map', () =>
        req.get({ url: `maps/${NULL_ID}/ranks`, status: 404, token: u1Token }));

      it('should 401 when no access token is provided', () =>
        req.unauthorizedTest('maps/1/ranks', 'get'));
    });
  });

  describe('maps/{mapID}/ranks/{rankNumber}', () => {
    describe('GET', () => {
      let user, token, map;

      beforeAll(
        async () =>
          ([[user, token], map] = await Promise.all([
            db.createAndLoginUser(),
            prisma.mMap.create({
              data: {
                name: 'surf_ronweasley',
                status: MapStatus.APPROVED,
                tracks: {
                  createMany: {
                    data: [
                      {
                        trackNum: 0,
                        numZones: 2,
                        isLinear: true,
                        difficulty: 1
                      },
                      {
                        trackNum: 1,
                        numZones: 1,
                        isLinear: false,
                        difficulty: 2
                      }
                    ]
                  }
                }
              }
            })
          ]))
      );

      afterAll(() => db.cleanup('user', 'mMap'));
      afterEach(() => db.cleanup('run'));

      it('should return the rank info for the rank and map specified', async () => {
        await db.createRunAndRankForMap({
          map: map,
          user: user,
          rank: 1,
          ticks: 1
        });

        const res = await req.get({
          url: `maps/${map.id}/ranks/1`,
          status: 200,
          validate: RankDto,
          token: token
        });

        expect(res.body).toMatchObject({
          rank: 1,
          mapID: map.id,
          userID: user.id
        });

        const run2 = await db.createRunAndRankForMap({
          map: map,
          rank: 2,
          ticks: 2
        });

        const res2 = await req.get({
          url: `maps/${map.id}/ranks/2`,
          status: 200,
          validate: RankDto,
          token: token
        });

        expect(res2.body).toMatchObject({
          rank: 2,
          mapID: map.id,
          userID: run2.user.id
        });
      });

      it('should return the rank info for the rank and map and flags specified', async () => {
        await db.createRunAndRankForMap({
          map: map,
          user: user,
          rank: 1,
          ticks: 1,
          flags: 0
        });
        const flagRun = await db.createRunAndRankForMap({
          map: map,
          rank: 1,
          ticks: 1,
          flags: 1
        });

        const res = await req.get({
          url: `maps/${map.id}/ranks/1`,
          status: 200,
          validate: RankDto,
          query: { flags: 1 },
          token: token
        });

        // Check that we actually get the run with the special flags back, not
        // `user`'s run with flags: 0
        expect(res.body).toMatchObject({
          rank: 1,
          flags: 1,
          mapID: map.id,
          userID: flagRun.user.id,
          runID: Number(flagRun.id)
        });
      });

      it('should return the rank info for the rank and map and trackNum specified', async () => {
        await db.createRunAndRankForMap({
          map: map,
          user: user,
          rank: 1,
          ticks: 1,
          trackNum: 0
        });
        const trackNumRun = await db.createRunAndRankForMap({
          map: map,
          rank: 1,
          ticks: 1,
          trackNum: 1
        });

        const res = await req.get({
          url: `maps/${map.id}/ranks/1`,
          status: 200,
          validate: RankDto,
          query: { trackNum: 1 },
          token: token
        });

        expect(res.body).toMatchObject({
          rank: 1,
          trackNum: 1,
          mapID: map.id,
          userID: trackNumRun.user.id,
          runID: Number(trackNumRun.id)
        });
      });

      it('should return the rank info for the rank and map and zoneNum specified', async () => {
        await db.createRunAndRankForMap({
          map: map,
          user: user,
          rank: 1,
          ticks: 1,
          zoneNum: 0
        });
        const zoneNum = await db.createRunAndRankForMap({
          map: map,
          rank: 1,
          ticks: 1,
          zoneNum: 1
        });

        const res = await req.get({
          url: `maps/${map.id}/ranks/1`,
          status: 200,
          validate: RankDto,
          query: { zoneNum: 1 },
          token: token
        });

        expect(res.body).toMatchObject({
          rank: 1,
          zoneNum: 1,
          mapID: map.id,
          userID: zoneNum.user.id,
          runID: Number(zoneNum.id)
        });
      });

      // Test that permissions checks are getting called
      it('should 403 if the user does not have permission to access to the map', async () => {
        await prisma.mMap.update({
          where: { id: map.id },
          data: { status: MapStatusNew.PRIVATE_TESTING }
        });

        await req.get({
          url: `maps/${map.id}/ranks/1`,
          status: 403,
          token: token
        });

        await prisma.mMap.update({
          where: { id: map.id },
          data: { status: MapStatusNew.APPROVED }
        });
      });

      it('should 404 for a nonexistent map', () =>
        req.get({ url: `maps/${NULL_ID}/ranks/1`, status: 404, token: token }));

      it('should 404 for a nonexistent rank', () =>
        req.get({
          url: `maps/${map.id}/ranks/${NULL_ID}`,
          status: 404,
          token: token
        }));

      it('should 401 when no access token is provided', () =>
        req.unauthorizedTest('maps/1/ranks/1', 'get'));
    });
  });

  describe('maps/{mapID}/ranks/around', () => {
    describe('GET', () => {
      let map, user7Token, runs;

      beforeAll(async () => {
        map = await db.createMap();
        runs = await Promise.all(
          Array.from({ length: 12 }, (_, i) =>
            db.createRunAndRankForMap({
              map: map,
              rank: i + 1,
              ticks: (i + 1) * 100
            })
          )
        );
        user7Token = auth.login(runs[6].user);
      });

      afterAll(() => db.cleanup('user', 'mMap', 'run'));

      it('should return a list of ranks around your rank', async () => {
        const res = await req.get({
          url: `maps/${map.id}/ranks/around`,
          status: 200,
          token: user7Token,
          validatePaged: { type: RankDto, count: 11 }
        });

        // We're calling as user 7, so we expect ranks 2-6, our rank, then 8-12
        let rankIndex = 2;
        for (const rank of res.body.data) {
          expect(rank).toBeValidDto(RankDto);
          expect(rank.rank).toBe(rankIndex);
          rankIndex++;
        }
        // Last tested was 12, then incremented once more, should be sitting on
        // 13.
        expect(rankIndex).toBe(13);
      });

      // Test that permissions checks are getting called
      it('should 403 if the user does not have permission to access to the map', async () => {
        await prisma.mMap.update({
          where: { id: map.id },
          data: { status: MapStatusNew.PRIVATE_TESTING }
        });

        await req.get({
          url: `maps/${map.id}/ranks/around`,
          status: 403,
          token: user7Token
        });

        await prisma.mMap.update({
          where: { id: map.id },
          data: { status: MapStatusNew.APPROVED }
        });
      });

      it('should return 404 for a nonexistent map', () =>
        req.get({
          url: `maps/${NULL_ID}/ranks/around`,
          status: 404,
          token: user7Token
        }));

      it("should return 400 if rankNum isn't a number or around or friends", () =>
        req.get({
          url: `maps/${map.id}/ranks/abcd`,
          status: 400,
          token: user7Token
        }));

      it('should 401 when no access token is provided', () =>
        req.unauthorizedTest('maps/1/ranks/around', 'get'));
    });
  });

  describe('maps/{mapID}/ranks/friends', () => {
    describe('GET', () => {
      const mockSteamIDs = [1n, 2n, 3n, 4n, 5n, 6n, 7n, 8n, 9n, 10n] as const;
      let map, user, token, steamService: SteamService;

      beforeAll(async () => {
        steamService = app.get(SteamService);
        [[user, token], map] = await Promise.all([
          db.createAndLoginUser(),
          db.createMap()
        ]);
        const friends = await Promise.all(
          mockSteamIDs.map((steamID) => db.createUser({ data: { steamID } }))
        );

        // Make our user rank 1, friends have subsequent ranks 2-11.
        for (const [i, user] of friends.entries())
          await db.createRunAndRankForMap({
            map: map,
            user: user,
            rank: i + 2,
            ticks: (i + 2) * 1000
          });

        await db.createRunAndRankForMap({
          user: user,
          map: map,
          ticks: 1,
          rank: 1
        });
      });

      it("should return a list of the user's Steam friend's ranks", async () => {
        // Obviously our test users aren't real Steam users, so we can't use their API. So just mock the API call.
        jest.spyOn(steamService, 'getSteamFriends').mockResolvedValueOnce(
          mockSteamIDs.map((id) => ({
            steamid: id.toString(),
            relationship: 'friend',
            friend_since: 0
          }))
        );

        const res = await req.get({
          url: `maps/${map.id}/ranks/friends`,
          status: 200,
          token,
          validatePaged: { type: RankDto, count: 10 }
        });

        for (const rank of res.body.data)
          expect(mockSteamIDs).toContain(BigInt(rank.user.steamID));
      });

      it('should 418 if the user has no Steam friends', async () => {
        jest.spyOn(steamService, 'getSteamFriends').mockResolvedValueOnce([]);

        return req.get({
          url: `maps/${map.id}/ranks/friends`,
          status: 418,
          token
        });
      });

      // Test that permissions checks are getting called
      it('should 403 if the user does not have permission to access to the map', async () => {
        await prisma.mMap.update({
          where: { id: map.id },
          data: { status: MapStatusNew.PRIVATE_TESTING }
        });

        await req.get({
          url: `maps/${map.id}/ranks/friends`,
          status: 403,
          token
        });

        await prisma.mMap.update({
          where: { id: map.id },
          data: { status: MapStatusNew.APPROVED }
        });
      });

      it('should return 404 for a nonexistent map', () =>
        req.get({
          url: `maps/${NULL_ID}/ranks/friends`,
          status: 404,
          token
        }));

      it('should 401 when no access token is provided', () =>
        req.unauthorizedTest('maps/1/ranks/friends', 'get'));

      afterAll(() => db.cleanup('user', 'mMap', 'run'));
    });
  });

  describe('maps/{mapID}/reviews', () => {
    describe('GET', () => {
      let u1, u1Token, u2, u2Token, map, reviewOfficial, reviewUnofficial;
      beforeAll(async () => {
        [[u1, u1Token], [u2, u2Token]] = await Promise.all([
          db.createAndLoginUser({ data: { roles: Role.MAPPER } }),
          db.createAndLoginUser({ data: { roles: Role.REVIEWER } })
        ]);

        map = await db.createMap({
          status: MapStatusNew.PUBLIC_TESTING,
          submitter: { connect: { id: u1.id } }
        });

        // official review
        reviewOfficial = await prisma.mapReview.create({
          data: {
            mainText: 'Great map!',
            suggestions: [
              {
                track: 1,
                gamemode: Gamemode.SURF,
                tier: 2,
                comment: 'What',
                gameplayRating: 5
              }
            ],
            mmap: { connect: { id: map.id } },
            reviewer: { connect: { id: u2.id } },
            resolved: true
          }
        });

        // unofficial review
        reviewUnofficial = await prisma.mapReview.create({
          data: {
            mainText: 'Wow, what a shit map.',
            suggestions: [
              {
                track: 1,
                gamemode: Gamemode.SURF,
                tier: 9,
                comment: 'The second ramp gave me cholera',
                gameplayRating: 1
              }
            ],
            mmap: { connect: { id: map.id } },
            reviewer: { connect: { id: u1.id } },
            resolved: true
          }
        });
      });

      afterAll(() => db.cleanup('mMap', 'user'));

      it('should return all reviews associated to the given map', async () => {
        const response = await req.get({
          url: `maps/${map.id}/reviews`,
          status: 200,
          validatePaged: { type: MapReviewDto, count: 2 },
          token: u1Token
        });
        expect(response.body.data[0]).toMatchObject({
          mainText: 'Great map!',
          mapID: map.id
        });
      });

      it('should return the reviews associated to the given map expanding the map information', async () => {
        await req.expandTest({
          url: `maps/${map.id}/reviews`,
          token: u1Token,
          expand: 'map',
          validate: MapReviewDto,
          paged: true,
          expectedPropertyName: 'map'
        });
      });

      it('should return the reviews associated to the given map expanding the author information', async () => {
        await req.expandTest({
          url: `maps/${map.id}/reviews`,
          token: u1Token,
          expand: 'reviewer',
          validate: MapReviewDto,
          paged: true,
          expectedPropertyName: 'reviewer'
        });
      });

      it('should return the official reviews associated to the given map', async () => {
        const response = await req.get({
          url: `maps/${map.id}/reviews`,
          status: 200,
          validatePaged: { type: MapReviewDto, count: 1 },
          query: { official: true },
          token: u1Token
        });
        expect(response.body.data[0]).toMatchObject({
          mainText: reviewOfficial.mainText,
          mapID: reviewOfficial.mapID
        });
      });

      it('should return the unofficial reviews associated to the given map', async () => {
        const response = await req.get({
          url: `maps/${map.id}/reviews`,
          status: 200,
          validatePaged: { type: MapReviewDto, count: 1 },
          query: { official: false },
          token: u2Token
        });
        expect(response.body.data[0]).toMatchObject({
          mainText: reviewUnofficial.mainText,
          mapID: reviewUnofficial.mapID
        });
      });

      it('should return the official reviews including reviewers', async () => {
        const response = await req.get({
          url: `maps/${map.id}/reviews`,
          status: 200,
          validatePaged: { type: MapReviewDto, count: 1 },
          query: { official: true, expand: 'reviewer' },
          token: u1Token
        });
        expect(response.body.data[0]).toHaveProperty('reviewer');
        expect(response.body.data[0]).toMatchObject({
          mainText: reviewOfficial.mainText,
          mapID: reviewOfficial.mapID
        });
      });

      // Test that permissions checks are getting called
      it('should 403 if the user does not have permission to access to the map', async () => {
        await prisma.mMap.update({
          where: { id: map.id },
          data: { status: MapStatusNew.PRIVATE_TESTING }
        });

        await req.get({
          url: `maps/${map.id}/reviews`,
          status: 403,
          token: u2Token
        });

        await prisma.mMap.update({
          where: { id: map.id },
          data: { status: MapStatusNew.APPROVED }
        });
      });

      it('should return 404 for a nonexistent map', () =>
        req.get({
          url: `maps/${NULL_ID}/reviews`,
          status: 404,
          token: u1Token
        }));

      it('should 401 when no access token is provided', () =>
        req.unauthorizedTest('maps/1/reviews', 'get'));
    });
  });

  describe('maps/{mapID}/testRequest', () => {
    describe('PUT', () => {
      let u1, u1Token, u2, u2Token, u3, u4, map;
      beforeEach(async () => {
        [[u1, u1Token], [u2, u2Token], u3, u4] = await Promise.all([
          db.createAndLoginUser(),
          db.createAndLoginUser(),
          db.createUser(),
          db.createUser()
        ]);

        map = await db.createMap({
          status: MapStatusNew.PRIVATE_TESTING,
          submitter: { connect: { id: u1.id } }
        });
      });

      afterEach(() => db.cleanup('mMap', 'user'));

      it('should create MapTestingRequests', async () => {
        await req.put({
          url: `maps/${map.id}/testRequest`,
          status: 204,
          body: { userIDs: [u2.id, u3.id, u4.id] },
          token: u1Token
        });

        const createdRequests = await prisma.mapTestingRequest.findMany();
        expect(createdRequests).toMatchObject([
          { userID: u2.id, state: MapTestingRequestState.UNREAD },
          { userID: u3.id, state: MapTestingRequestState.UNREAD },
          { userID: u4.id, state: MapTestingRequestState.UNREAD }
        ]);
      });

      it('should remove any MapTestingRequests not on the userID', async () => {
        await prisma.mapTestingRequest.create({
          data: {
            mapID: map.id,
            userID: u2.id,
            state: MapTestingRequestState.ACCEPTED
          }
        });

        await req.put({
          url: `maps/${map.id}/testRequest`,
          status: 204,
          body: { userIDs: [u3.id] },
          token: u1Token
        });

        const createdRequests = await prisma.mapTestingRequest.findMany();
        expect(createdRequests).toMatchObject([
          { userID: u3.id, state: MapTestingRequestState.UNREAD }
        ]);
      });

      it('should remove all MapTestingRequests for an empty array', async () => {
        await prisma.mapTestingRequest.create({
          data: {
            mapID: map.id,
            userID: u2.id,
            state: MapTestingRequestState.ACCEPTED
          }
        });

        await req.put({
          url: `maps/${map.id}/testRequest`,
          status: 204,
          body: { userIDs: [] },
          token: u1Token
        });

        const createdRequests = await prisma.mapTestingRequest.findMany();
        expect(createdRequests.length).toBe(0);
      });

      it('should leave any existing MapTestingRequests contained in the userIDs unaffected', async () => {
        await prisma.mapTestingRequest.createMany({
          data: [
            {
              mapID: map.id,
              userID: u2.id,
              state: MapTestingRequestState.DECLINED
            },
            {
              mapID: map.id,
              userID: u3.id,
              state: MapTestingRequestState.ACCEPTED
            }
          ]
        });

        await req.put({
          url: `maps/${map.id}/testRequest`,
          status: 204,
          body: { userIDs: [u3.id, u4.id] },
          token: u1Token
        });

        const createdRequests = await prisma.mapTestingRequest.findMany();
        expect(createdRequests).toMatchObject([
          { userID: u3.id, state: MapTestingRequestState.ACCEPTED },
          { userID: u4.id, state: MapTestingRequestState.UNREAD }
        ]);
      });

      it('should 404 in the map does not exist', () =>
        req.put({
          url: `maps/${NULL_ID}/testRequest`,
          status: 404,
          body: { userIDs: [] },
          token: u1Token
        }));

      it('should 400 if userIDs array is missing', () =>
        req.put({
          url: `maps/${map.id}/testRequest`,
          status: 400,
          body: {},
          token: u1Token
        }));

      it('should 403 if the user is not the submitter of the map', () =>
        req.put({
          url: `maps/${map.id}/testRequest`,
          status: 403,
          body: { userIDs: [u3.id] },
          token: u2Token
        }));

      it('should 400 if the userIDs contains an ID that does not exist', () =>
        req.put({
          url: `maps/${map.id}/testRequest`,
          status: 400,
          body: { userIDs: [NULL_ID] },
          token: u1Token
        }));

      for (const status of difference(Enum.values(MapStatusNew), [
        MapStatusNew.PRIVATE_TESTING
      ]))
        it(`should 403 if the map is in ${MapStatusNew[status]}`, async () => {
          await prisma.mMap.update({
            where: { id: map.id },
            data: { status }
          });

          await req.put({
            url: `maps/${map.id}/testRequest`,
            status: 403,
            body: { userIDs: [u3.id] },
            token: u1Token
          });
        });

      it('should 401 when no access token is provided', () =>
        req.unauthorizedTest(`maps/${map.id}/testRequest`, 'put'));
    });
  });

  describe('maps/{mapID}/reviews/{reviewID}', () => {
    describe('GET', () => {
      let u1, u2, u2Token, map, review;
      beforeAll(async () => {
        [u1, [u2, u2Token]] = await Promise.all([
          db.createUser({ data: { roles: Role.MAPPER } }),
          db.createAndLoginUser({ data: { roles: Role.REVIEWER } })
        ]);

        map = await db.createMap({
          status: MapStatusNew.PUBLIC_TESTING,
          submitter: { connect: { id: u1.id } }
        });

        review = await prisma.mapReview.create({
          data: {
            mainText:
              'Sync speedshot into sync speedshot, what substance did you take mapper?!?!',
            suggestions: [
              {
                track: 1,
                gamemode: Gamemode.RJ,
                tier: 2,
                comment: 'True',
                gameplayRating: 1
              }
            ],
            mmap: { connect: { id: map.id } },
            reviewer: { connect: { id: u2.id } },
            resolved: false
          }
        });
      });

      afterAll(() => db.cleanup('mMap', 'user'));

      it('should return the requested review', async () => {
        const response = await req.get({
          url: `maps/${map.id}/reviews/${review.id}`,
          status: 200,
          validate: MapReviewDto,
          token: u2Token
        });
        expect(response.body).toMatchObject({
          mainText: review.mainText,
          mapID: map.id,
          id: review.id
        });
      });

      it('should return the requested review including author information', async () => {
        await req.expandTest({
          url: `maps/${map.id}/reviews/${review.id}`,
          token: u2Token,
          expand: 'reviewer',
          validate: MapReviewDto
        });
      });

      it('should return the requested review including map information', async () => {
        await req.expandTest({
          url: `maps/${map.id}/reviews/${review.id}`,
          token: u2Token,
          expand: 'map',
          validate: MapReviewDto
        });
      });

      // Test that permissions checks are getting called
      it('should 403 if the user does not have permission to access to the map', async () => {
        await prisma.mMap.update({
          where: { id: map.id },
          data: { status: MapStatusNew.PRIVATE_TESTING }
        });

        await req.get({
          url: `maps/${map.id}/reviews/${review.id}`,
          status: 403,
          token: u2Token
        });

        await prisma.mMap.update({
          where: { id: map.id },
          data: { status: MapStatusNew.APPROVED }
        });
      });

      it('should return 404 for a nonexistent map', () =>
        req.get({
          url: `maps/${NULL_ID}/reviews/${review.id}`,
          status: 404,
          token: u2Token
        }));

      it('should return 404 for a nonexistent review', () =>
        req.get({
          url: `maps/${map.id}/reviews/${NULL_ID}`,
          status: 404,
          token: u2Token
        }));

      it('should 401 when no access token is provided', () =>
        req.unauthorizedTest('maps/1/reviews/1', 'get'));
    });
    describe('DELETE', () => {
      let u1, u1Token, u2, u2Token, modToken, adminToken, map, review;

      beforeEach(async () => {
        [[u1, u1Token], [u2, u2Token], modToken, adminToken] =
          await Promise.all([
            db.createAndLoginUser({ data: { roles: Role.MAPPER } }),
            db.createAndLoginUser(),
            db.loginNewUser({ data: { roles: Role.MODERATOR } }),
            db.loginNewUser({ data: { roles: Role.ADMIN } })
          ]);

        map = await db.createMap({
          status: MapStatusNew.APPROVED,
          submitter: { connect: { id: u1.id } }
        });

        review = await prisma.mapReview.create({
          data: {
            mainText: 'This map was E Z',
            suggestions: [
              {
                track: 1,
                gamemode: Gamemode.SURF,
                tier: 1,
                comment: 'I surfed this backwards',
                gameplayRating: 10
              }
            ],
            mmap: { connect: { id: map.id } },
            reviewer: { connect: { id: u2.id } },
            resolved: true
          }
        });
      });

      afterEach(() => db.cleanup('mMap', 'user'));

      it('should return 404 for trying to delete a nonexistent review for a map', () =>
        req.del({
          url: `maps/${map.id}/reviews/${NULL_ID}`,
          status: 404,
          token: u2Token
        }));

      it('should return 403 for when the user is not the author of the review', () =>
        req.del({
          url: `maps/${map.id}/reviews/${review.id}`,
          status: 403,
          token: u1Token
        }));

      it('should return 204 when a user deletes their review', async () =>
        await req.del({
          url: `maps/${map.id}/reviews/${review.id}`,
          status: 204,
          token: u2Token
        }));

      it('should return 204 when a mod deletes a review', async () =>
        await req.del({
          url: `maps/${map.id}/reviews/${review.id}`,
          status: 204,
          token: modToken
        }));

      it('should return 204 when an admin deletes a review', async () =>
        await req.del({
          url: `maps/${map.id}/reviews/${review.id}`,
          status: 204,
          token: adminToken
        }));
    });
  });
});
