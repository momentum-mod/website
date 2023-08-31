// noinspection DuplicatedCode

import { readFileSync } from 'node:fs';
import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import {
  AuthUtil,
  createSha1Hash,
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
import { MapDto } from '@momentum/backend/dto';
import {
  ActivityType,
  MapCreditType,
  Gamemode,
  Role,
  MapStatusNew,
  MapSubmissionType,
  Ban,
  CombinedMapStatuses,
  MapTestingRequestState,
  MIN_PUBLIC_TESTING_DURATION
} from '@momentum/constants';
import { Config } from '@momentum/backend/config';
import path from 'node:path';
import Zip from 'adm-zip';
import { Enum } from '@momentum/enum';
import { difference } from '@momentum/util-fn';

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

        for (const item of res.body.data)
          expect(item).toHaveProperty('mainTrack');
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

      it("should respond with expanded map data if the map is in the logged in user's favorites when using the inFavorites expansion", async () => {
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
              ],
              dates: { submitted: expect.any(String) }
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

          expect(
            Date.now() -
              new Date(createdMap.submission.dates.submitted).getTime()
          ).toBeLessThan(1000);
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

          expect(
            Date.now() - new Date(res.body.submission.dates.submitted).getTime()
          ).toBeLessThan(1000);
          expect(
            Date.now() -
              new Date(res.body.submission.dates.contentApproval).getTime()
          ).toBeLessThan(1000);
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

        it('should 400 if the name does not contain the fileName', async () => {
          await req.postAttach({
            url: 'maps',
            status: 400,
            data: {
              ...createMapObject,
              fileName: 'ron_weasley',
              name: 'hagrid'
            },
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

      beforeAll(async () => {
        [[u1, u1Token], u2] = await Promise.all([
          db.createAndLoginUser(),
          db.createUser()
        ]);

        map = await db.createMap({
          submission: {
            create: {
              type: MapSubmissionType.ORIGINAL,
              suggestions: {
                track: 1,
                gamemode: Gamemode.SURF,
                tier: 1,
                ranked: true,
                comment: 'I will kill again'
              },
              versions: {
                createMany: {
                  data: [
                    { versionNum: 1, hash: createSha1Hash('bats') },
                    { versionNum: 2, hash: createSha1Hash('wigs') }
                  ]
                }
              }
            }
          },
          reviews: {
            create: {
              reviewer: { connect: { id: u2.id } },
              mainText: 'No! No!!'
            }
          }
        });

        await prisma.mapSubmission.update({
          where: { mapID: map.id },
          data: {
            currentVersion: { connect: { id: map.submission.versions[1].id } }
          }
        });
      });

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

      it('should respond with expanded map data using the submission expand parameter', () =>
        req.expandTest({
          url: `maps/${map.id}`,
          validate: MapDto,
          expand: 'submission',
          token: u1Token
        }));

      it('should respond with expanded map data using the reviews expand parameter', () =>
        req.expandTest({
          url: `maps/${map.id}`,
          validate: MapDto,
          expand: 'reviews',
          token: u1Token
        }));

      it('should respond with expanded map data using the versions expand parameter', () =>
        req.expandTest({
          url: `maps/${map.id}`,
          validate: MapDto,
          expand: 'versions',
          expectedPropertyName: 'submission.versions[1]',
          token: u1Token
        }));

      // This map is APPROVED but has a currentVersion, which will usually
      // be removed when a map gets approval. We only really need to test
      // that the expand works however - is the user has read access to the map,
      // they can access submission/submission versions/reviews if they exist.
      it('should respond with expanded map data using the currentVersion expand parameter', () =>
        req.expandTest({
          url: `maps/${map.id}`,
          validate: MapDto,
          expand: 'currentVersion',
          expectedPropertyName: 'submission.currentVersion',
          token: u1Token
        }));

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
      let user, token, u2, u2Token, adminToken, map, createMapData;

      beforeAll(async () => {
        [[user, token], [u2, u2Token], adminToken] = await Promise.all([
          db.createAndLoginUser(),
          db.createAndLoginUser(),
          db.loginNewUser({ data: { roles: Role.ADMIN } })
        ]);

        createMapData = {
          name: 'map',
          fileName: 'surf_map',
          submitter: { connect: { id: user.id } },
          submission: {
            create: {
              type: MapSubmissionType.ORIGINAL,
              dates: { submitted: new Date().toJSON() },
              suggestions: {
                track: 1,
                gamemode: Gamemode.SURF,
                tier: 1,
                ranked: true
              }
            }
          }
        };
      });

      afterAll(() => db.cleanup('user', 'mMap'));

      afterEach(() => db.cleanup('mMap'));

      for (const status of CombinedMapStatuses.IN_SUBMISSION) {
        it(`should allow the submitter to change most data during ${MapStatusNew[status]}`, async () => {
          const map = await db.createMap({ ...createMapData, status });

          await req.patch({
            url: `maps/${map.id}`,
            status: 204,
            body: {
              fileName: 'surf_ostrich',
              name: 'ostrich',
              info: {
                description:
                  'Ostriches are large flightless birds. They are the heaviest living birds, and lay the largest eggs of any living land animal.',
                youtubeID: 'rq9WnDq0ap8'
              },
              suggestions: [
                {
                  track: 1,
                  gamemode: Gamemode.CONC,
                  tier: 1,
                  ranked: true
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
            name: 'ostrich',
            fileName: 'surf_ostrich',
            info: {
              description:
                'Ostriches are large flightless birds. They are the heaviest living birds, and lay the largest eggs of any living land animal.',
              youtubeID: 'rq9WnDq0ap8'
            },
            submission: {
              suggestions: [
                {
                  track: 1,
                  gamemode: Gamemode.CONC,
                  tier: 1,
                  ranked: true
                }
              ],
              placeholders: [{ type: MapCreditType.CONTRIBUTOR, alias: 'eee' }]
            }
          });
        });
      }

      it('should only allow updating minor info once APPROVED', async () => {
        const map = await db.createMap({
          ...createMapData,
          status: MapStatusNew.APPROVED
        });

        await req.patch({
          url: `maps/${map.id}`,
          status: 204,
          body: {
            info: {
              description:
                'Ostriches are large flightless birds. They are the heaviest living birds, and lay the largest eggs of any living land animal.',
              youtubeID: 'rq9WnDq0ap8'
            }
          },
          token
        });

        await req.patch({
          url: `maps/${map.id}`,
          status: 403,
          body: { fileName: 'eeeee' },
          token
        });
      });

      it('should always 409 if map is DISABLED', async () => {
        const map = await db.createMap({
          ...createMapData,
          status: MapStatusNew.DISABLED
        });

        await req.patch({
          url: `maps/${map.id}`,
          status: 403,
          body: { info: { youtubeID: 'rq9WnDq0ap8' } },
          token
        });
      });

      it('should always 409 if map is REJECTED', async () => {
        const map = await db.createMap({
          ...createMapData,
          status: MapStatusNew.REJECTED
        });

        await req.patch({
          url: `maps/${map.id}`,
          status: 403,
          body: { info: { youtubeID: 'rq9WnDq0ap8' } },
          token
        });
      });

      const statuses = Enum.values(MapStatusNew);
      // Storing number tuple won't pass .has
      const validChanges = new Set([
        MapStatusNew.PRIVATE_TESTING + ',' + MapStatusNew.CONTENT_APPROVAL
      ]);

      for (const s1 of statuses) {
        for (const s2 of statuses.filter((s) => s !== s1)) {
          const shouldPass = validChanges.has(s1 + ',' + s2);

          it(`should ${
            shouldPass ? '' : 'not '
          }allow a user to change their map from ${MapStatusNew[s1]} to ${
            MapStatusNew[s2]
          }`, async () => {
            const map = await db.createMap({
              ...createMapData,
              status: s1,
              submission: {
                create: {
                  dates: { submission: Date.now(), publicTesting: Date.now() },
                  type: MapSubmissionType.PORT,
                  suggestions: {
                    track: 1,
                    gamemode: Gamemode.SURF,
                    tier: 10,
                    ranked: true
                  }
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

      it("should allow a user to change to their map from PUBLIC_TESTING to FINAL_APPROVAL if it's been in testing for required time period", async () => {
        const map = await db.createMap({
          ...createMapData,
          status: MapStatusNew.PUBLIC_TESTING,
          submission: {
            create: {
              dates: {
                publicTesting: Date.now() - (MIN_PUBLIC_TESTING_DURATION + 1000)
              },
              type: MapSubmissionType.PORT,
              suggestions: {
                track: 1,
                gamemode: Gamemode.SURF,
                tier: 10,
                ranked: true
              }
            }
          }
        });

        await req.patch({
          url: `maps/${map.id}`,
          status: 204,
          body: { status: MapStatusNew.FINAL_APPROVAL },
          token
        });

        const updatedMap = await prisma.mMap.findUnique({
          where: { id: map.id }
        });
        expect(updatedMap.status).toBe(MapStatusNew.FINAL_APPROVAL);
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
        const map = await db.createMap({
          status: MapStatusNew.PRIVATE_TESTING
        });

        await req.patch({
          url: `maps/${map.id}`,
          status: 403,
          body: { status: MapStatusNew.CONTENT_APPROVAL },
          token: u2Token
        });
      });

      it('should return 403 if the map was not submitted by that user even for an admin', async () => {
        const map = await db.createMap({
          status: MapStatusNew.PRIVATE_TESTING
        });

        await req.patch({
          url: `maps/${map.id}`,
          status: 403,
          body: { status: MapStatusNew.CONTENT_APPROVAL },
          token: adminToken
        });
      });

      it('should 404 when the map is not found', () =>
        req.patch({
          url: `maps/${NULL_ID}`,
          status: 404,
          body: { status: MapStatusNew.CONTENT_APPROVAL },
          token: token
        }));

      it('should 401 when no access token is provided', () =>
        req.unauthorizedTest('maps/1', 'patch'));
    });
  });

  describe('maps/submissions', () => {
    describe('GET', () => {
      let u1, u1Token, u2, pubMap1, pubMap2, privMap;

      beforeAll(async () => {
        [[u1, u1Token], u2] = await Promise.all([
          db.createAndLoginUser(),
          db.createUser()
        ]);

        const submissionCreate = {
          create: {
            type: MapSubmissionType.ORIGINAL,
            suggestions: {
              track: 1,
              gamemode: Gamemode.CONC,
              tier: 1,
              ranked: true,
              comment: 'My dad made this'
            },
            versions: {
              createMany: {
                data: [
                  { versionNum: 1, hash: createSha1Hash('dogs') },
                  { versionNum: 2, hash: createSha1Hash('elves') }
                ]
              }
            }
          }
        };
        await db.createMap({ status: MapStatusNew.APPROVED });
        pubMap1 = await db.createMap({
          status: MapStatusNew.PUBLIC_TESTING,
          submission: submissionCreate,
          reviews: {
            create: {
              mainText: 'Appalling',
              reviewer: { connect: { id: u2.id } }
            }
          }
        });
        pubMap2 = await db.createMap({
          status: MapStatusNew.PUBLIC_TESTING,
          submission: submissionCreate
        });
        privMap = await db.createMap({
          status: MapStatusNew.PRIVATE_TESTING,
          submission: submissionCreate
        });

        await Promise.all(
          [pubMap1, pubMap2, privMap].map((map) =>
            prisma.mapSubmission.update({
              where: { mapID: map.id },
              data: {
                currentVersion: {
                  connect: { id: map.submission.versions[1].id }
                }
              }
            })
          )
        );
      });

      afterAll(() => db.cleanup('user', 'mMap', 'run'));
      afterEach(() => db.cleanup('mapTestingRequest', 'mapCredit'));

      it('should respond with map data', async () => {
        const res = await req.get({
          url: 'maps/submissions',
          status: 200,
          validatePaged: { type: MapDto },
          token: u1Token
        });

        for (const item of res.body.data) {
          expect(item).toHaveProperty('mainTrack');
          expect(item).toHaveProperty('submission');
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
        await prisma.mMap.update({
          where: { id: pubMap1.id },
          data: { name: 'aaaaa' }
        });

        await req.searchTest({
          url: 'maps/submissions',
          token: u1Token,
          searchMethod: 'contains',
          searchString: 'aaaaa',
          searchPropertyName: 'name',
          validate: { type: MapDto, count: 1 }
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

      it('should respond with expanded current submission version data using the currentVersion expand parameter', () =>
        req.expandTest({
          url: 'maps/submissions',
          expand: 'currentVersion',
          expectedPropertyName: 'submission.currentVersion',
          paged: true,
          validate: MapDto,
          token: u1Token
        }));

      it('should respond with expanded submission versions data using the version expand parameter', () =>
        req.expandTest({
          url: 'maps/submissions',
          expand: 'versions',
          expectedPropertyName: 'submission.versions[1]',
          paged: true,
          validate: MapDto,
          token: u1Token
        }));

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

      it('should respond with expanded map data using the thumbnail expand parameter', () =>
        req.expandTest({
          url: 'maps/submissions',
          expand: 'thumbnail',
          paged: true,
          validate: MapDto,
          token: u1Token
        }));

      it('should respond with expanded map data using the images expand parameter', () =>
        req.expandTest({
          url: 'maps/submissions',
          expand: 'images',
          paged: true,
          validate: MapDto,
          token: u1Token
        }));

      it('should respond with expanded map data using the stats expand parameter', () =>
        req.expandTest({
          url: 'maps/submissions',
          expand: 'stats',
          paged: true,
          validate: MapDto,
          token: u1Token
        }));

      it('should respond with expanded map data using the tracks expand parameter', () =>
        req.expandTest({
          url: 'maps/submissions',
          expand: 'tracks',
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

      it("should respond with expanded map data if the map is in the logged in user's favorites when using the inFavorites expansion", async () => {
        await prisma.mapLibraryEntry.create({
          data: { userID: u1.id, mapID: pubMap1.id }
        });

        await req.expandTest({
          url: 'maps/submissions',
          expand: 'inLibrary',
          paged: true,
          validate: MapDto,
          expectedPropertyName: 'libraryEntries',
          token: u1Token,
          some: true
        });
      });

      it("should respond with the map's WR when using the worldRecord expansion", async () => {
        await db.createRunAndRankForMap({
          map: pubMap1,
          user: u2,
          ticks: 5,
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
          worldRecord: { rank: 1, user: { id: u2.id } }
        });
      });

      it("should respond with the logged in user's PB when using the personalBest expansion", async () => {
        await db.createRunAndRankForMap({
          map: pubMap1,
          user: u1,
          ticks: 10,
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
          personalBest: { rank: 2, user: { id: u1.id } }
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
          worldRecord: { rank: 1, user: { id: u2.id } },
          personalBest: { rank: 2, user: { id: u1.id } }
        });

        await db.cleanup('run');
      });

      it('should respond with only public testing maps if the user has no special relations', async () => {
        const res = await req.get({
          url: 'maps/submissions',
          status: 200,
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

      it('should include private testing maps for which the user has an accepted invite', async () => {
        await prisma.mapTestingRequest.create({
          data: {
            userID: u1.id,
            mapID: privMap.id,
            state: MapTestingRequestState.ACCEPTED
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
            expect.objectContaining({ id: privMap.id })
          ])
        );
      });

      it('should not include a private testing map if the user has an declined invite', async () => {
        await prisma.mapTestingRequest.create({
          data: {
            userID: u1.id,
            mapID: privMap.id,
            state: MapTestingRequestState.DECLINED
          }
        });

        const res = await req.get({
          url: 'maps/submissions',
          status: 200,
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
          validatePaged: { type: MapDto, count: 3 },
          token: u1Token
        });

        expect(res.body.data).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ id: pubMap1.id }),
            expect.objectContaining({ id: pubMap2.id }),
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
          validatePaged: { type: MapDto, count: 3 },
          token: u1Token
        });

        expect(res.body.data).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ id: pubMap1.id }),
            expect.objectContaining({ id: pubMap2.id }),
            expect.objectContaining({ id: privMap.id })
          ])
        );

        await prisma.mMap.update({
          where: { id: privMap.id },
          data: { submitter: { disconnect: true } }
        });
      });

      it('should filter by public maps when given the public filter', async () => {
        const res = await req.get({
          url: 'maps/submissions',
          status: 200,
          query: { filter: MapStatusNew.PUBLIC_TESTING },
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
        await prisma.mapTestingRequest.create({
          data: {
            mapID: privMap.id,
            userID: u1.id,
            state: MapTestingRequestState.ACCEPTED
          }
        });

        const res = await req.get({
          url: 'maps/submissions',
          status: 200,
          query: { filter: MapStatusNew.PRIVATE_TESTING },
          validatePaged: { type: MapDto, count: 1 },
          token: u1Token
        });

        expect(res.body.data[0]).toEqual(
          expect.objectContaining({ id: privMap.id })
        );
      });

      it('should 401 when no access token is provided', () =>
        req.unauthorizedTest('maps/submissions', 'get'));
    });
  });
});
