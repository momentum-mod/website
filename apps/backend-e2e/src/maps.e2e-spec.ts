// noinspection DuplicatedCode

import { Config } from '../../backend/src/app/config';
import { MapDto } from '../../backend/src/app/dto';

import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  ActivityType,
  Ban,
  CombinedMapStatuses,
  Gamemode as GM,
  Gamemode,
  MapCreditType,
  MapStatusNew,
  MapSubmissionDate,
  MapSubmissionType,
  MapTestInviteState,
  MIN_PUBLIC_TESTING_DURATION,
  Role,
  TrackType,
  MapZones
} from '@momentum/constants';
import {
  AuthUtil,
  createSha1Hash,
  DbUtil,
  FILES_PATH,
  FileStoreUtil,
  NULL_ID,
  RequestUtil
} from '@momentum/test-utils';
import { PrismaClient } from '@prisma/client';
import Zip from 'adm-zip';
import { Enum } from '@momentum/enum';
import {
  ZonesStub,
  ZonesStubLeaderboards,
  ZoneUtil
} from '@momentum/formats/zone';
import { from } from '@momentum/util-fn';
import {
  setupE2ETestEnvironment,
  teardownE2ETestEnvironment
} from './support/environment';

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
      let u1, u1Token, u2, m1, m2, m3, m4, imageID;

      beforeAll(async () => {
        imageID = db.uuid(); // Gonna use this for *every* image

        [[u1, u1Token], [u2]] = await Promise.all([
          db.createAndLoginUser(),
          db.createAndLoginUser()
        ]);

        [[m1, m2, m3, m4]] = await Promise.all([
          db.createMaps(4, {
            credits: { create: { type: 0, userID: u1.id } },
            images: [imageID]
          }),
          db.createMap({
            status: MapStatusNew.PRIVATE_TESTING,
            images: [imageID]
          }),
          db.createMap({ images: [imageID], status: MapStatusNew.DISABLED }),
          db.createMap({
            status: MapStatusNew.FINAL_APPROVAL,
            images: [imageID]
          }),
          db.createMap({
            status: MapStatusNew.CONTENT_APPROVAL,
            images: [imageID]
          }),
          db.createMap({
            status: MapStatusNew.PUBLIC_TESTING,
            images: [imageID]
          })
        ]);
      });

      afterAll(() => db.cleanup('leaderboardRun', 'pastRun', 'user', 'mMap'));

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
            'hash',
            'downloadURL',
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
          searchString: 'aa',
          searchPropertyName: 'name',
          validate: { type: MapDto, count: 1 }
        });
      });

      it('should respond with filtered map data using the searchStartsWith parameter', async () => {
        m1 = await prisma.mMap.update({
          where: { id: m1.id },
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

      it('should respond with filtered map data based on the supported gamemodes', async () => {
        const gamemode = Gamemode.BHOP;
        const map = await db.createMap({
          leaderboards: {
            create: {
              gamemode: gamemode,
              trackType: TrackType.MAIN,
              trackNum: 0,
              style: 0,
              ranked: true
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

      it('should respond with expanded submitter data using the zones expand parameter', async () => {
        await prisma.mMap.updateMany({ data: { submitterID: u2.id } });

        await req.expandTest({
          url: 'maps',
          expand: 'zones',
          paged: true,
          validate: MapDto,
          token: u1Token
        });
      });

      it('should respond with expanded submitter data using the leaderboards expand parameter', async () => {
        await prisma.mMap.updateMany({ data: { submitterID: u2.id } });

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
        await db.createLbRun({
          map: m1,
          user: u2,
          time: 5,
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
          worldRecords: [
            { rank: 1, gamemode: Gamemode.AHOP, user: { id: u2.id } }
          ]
        });
      });

      it("should respond with the logged in user's PB when using the personalBest expansion", async () => {
        await db.createLbRun({
          map: m1,
          user: u1,
          time: 10,
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
          personalBests: [{ rank: 2, user: { id: u1.id } }]
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
          worldRecords: [{ rank: 1, user: { id: u2.id } }],
          personalBests: [{ rank: 2, user: { id: u1.id } }]
        });
      });

      it('should respond with filtered maps when using the difficultyLow filter', async () => {
        await Promise.all([
          prisma.leaderboard.updateMany({
            where: { mapID: m1.id },
            data: { tier: 1 }
          }),
          prisma.leaderboard.updateMany({
            where: { mapID: m2.id },
            data: { tier: 3 }
          }),
          prisma.leaderboard.updateMany({
            where: { mapID: m3.id },
            data: { tier: 3 }
          }),
          prisma.leaderboard.updateMany({
            where: { mapID: m4.id },
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

      it('should respond with filtered maps when the linear filter', async () => {
        await Promise.all([
          prisma.leaderboard.updateMany({
            where: { mapID: m1.id },
            data: { linear: false }
          }),
          prisma.leaderboard.updateMany({
            where: { mapID: m2.id },
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
        const res = await req.get({
          url: 'maps',
          status: 200,
          query: { difficultyLow: 2, difficultyHigh: 4, linear: false },
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
        nozipBspBuffer,
        bspHash,
        vmfBuffer,
        vmfHash;

      const zones = structuredClone(ZonesStub);

      beforeAll(async () => {
        [user, token] = await db.createAndLoginUser();
        [u2, u3] = await db.createUsers(2);

        bspBuffer = readFileSync(path.join(FILES_PATH, 'map.bsp'));
        bspHash = createSha1Hash(bspBuffer);

        nozipBspBuffer = readFileSync(path.join(FILES_PATH, 'map_nozip.bsp'));

        vmfBuffer = readFileSync(path.join(FILES_PATH, 'map.vmf'));
        vmfHash = createSha1Hash(vmfBuffer);

        createMapObject = {
          name: 'surf_map',
          info: {
            description: 'mamp',
            creationDate: '2022-07-07T18:33:33.000Z'
          },
          submissionType: MapSubmissionType.ORIGINAL,
          placeholders: [{ alias: 'God', type: MapCreditType.AUTHOR }],
          suggestions: [
            {
              trackType: TrackType.MAIN,
              trackNum: 0,
              gamemode: Gamemode.RJ,
              tier: 1,
              ranked: true,
              comment: 'I love you'
            },
            {
              trackType: TrackType.BONUS,
              trackNum: 0,
              gamemode: Gamemode.DEFRAG_CPM,
              tier: 2,
              ranked: false,
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

          createdMap = await prisma.mMap.findUnique({
            where: { id: res.body.id },
            include: {
              info: true,
              stats: true,
              credits: true,
              leaderboards: true,
              submission: { include: { currentVersion: true, versions: true } }
            }
          });
        });

        afterAll(() => db.cleanup('mMap'));

        it('should respond with a MapDto', () => {
          expect(res.body).toBeValidDto(MapDto);
        });

        it('should create a map within the database', () => {
          expect(createdMap).toMatchObject({
            name: 'surf_map',
            status: MapStatusNew.PRIVATE_TESTING,
            submission: {
              type: MapSubmissionType.ORIGINAL,
              placeholders: [{ alias: 'God', type: MapCreditType.AUTHOR }],
              suggestions: [
                {
                  trackType: TrackType.MAIN,
                  trackNum: 0,
                  gamemode: Gamemode.RJ,
                  tier: 1,
                  ranked: true,
                  comment: 'I love you'
                },
                {
                  trackType: TrackType.BONUS,
                  trackNum: 0,
                  gamemode: Gamemode.DEFRAG_CPM,
                  tier: 2,
                  ranked: false,
                  comment: 'comment'
                }
              ],
              dates: [
                {
                  status: MapStatusNew.PRIVATE_TESTING,
                  date: expect.any(String)
                }
              ]
            },
            info: {
              description: 'mamp',
              creationDate: new Date('2022-07-07T18:33:33.000Z')
            },
            submitterID: user.id,
            credits: [
              {
                userID: user.id,
                type: MapCreditType.AUTHOR,
                description: 'Walrus'
              }
            ]
          });

          expect(
            Date.now() - new Date(createdMap.submission.dates[0].date).getTime()
          ).toBeLessThan(1000);
          expect(createdMap.submission.currentVersion.zones).toMatchObject(
            zones
          );
          expect(createdMap.submission.versions[0]).toMatchObject(
            createdMap.submission.currentVersion
          );
          expect(createdMap.submission.versions).toHaveLength(1);
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
            ranked: false,
            tags: []
          }));

          expect(leaderboards).toEqual(expect.arrayContaining(expected));
          expect(leaderboards).toHaveLength(expected.length);
        });

        it('should upload the BSP file', async () => {
          expect(res.body.downloadURL).toBeUndefined();
          const currentVersion = res.body.submission.currentVersion;

          expect(currentVersion.downloadURL.split('/').slice(-2)).toEqual([
            'submissions',
            `${currentVersion.id}.bsp`
          ]);

          const downloadBuffer = await fileStore.downloadHttp(
            currentVersion.downloadURL
          );
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
            Date.now() -
              new Date(
                (res.body.submission.dates as MapSubmissionDate[]).find(
                  ({ status }) => status === MapStatusNew.CONTENT_APPROVAL
                ).date
              ).getTime()
          ).toBeLessThan(1000);
        });

        it('should accept a submission with no placeholders or test invites', async () => {
          const obj = structuredClone(createMapObject);
          delete obj.testInvites;
          delete obj.placeholders;
          await req.postAttach({
            url: 'maps',
            status: 201,
            data: obj,
            files: [
              { file: bspBuffer, field: 'bsp', fileName: 'surf_map.bsp' }
            ],
            token
          });
        });

        it('should accept a submission with placeholders but no credits', async () => {
          // Missing one of credits/placeholders is fine so long as there's one
          // of either.
          const create = structuredClone(createMapObject);
          delete create.credits;
          await req.postAttach({
            url: 'maps',
            status: 201,
            data: create,
            files: [
              { file: bspBuffer, field: 'bsp', fileName: 'surf_map.bsp' }
            ],
            token
          });
        });

        it('should accept a submission with credits but no placeholders', async () => {
          const create = structuredClone(createMapObject);
          delete create.placeholders;
          await req.postAttach({
            url: 'maps',
            status: 201,
            data: create,
            files: [
              { file: bspBuffer, field: 'bsp', fileName: 'surf_map.bsp' }
            ],
            token
          });
        });

        it('should reject a submission with no placeholders or credits', async () => {
          const create = structuredClone(createMapObject);
          delete create.credits;
          delete create.placeholders;
          await req.postAttach({
            url: 'maps',
            status: 400,
            data: create,
            files: [
              { file: bspBuffer, field: 'bsp', fileName: 'surf_map.bsp' }
            ],
            token
          });
        });

        it('should reject a submission with no suggestions', async () => {
          const obj = structuredClone(createMapObject);
          delete obj.suggestions;
          await req.postAttach({
            url: 'maps',
            status: 400,
            data: obj,
            files: [
              { file: bspBuffer, field: 'bsp', fileName: 'surf_map.bsp' }
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

        it('should 400 if a BSP file has invalid header', async () => {
          await req.postAttach({
            url: 'maps',
            status: 400,
            data: createMapObject,
            files: [
              {
                file: Buffer.alloc(100),
                field: 'bsp',
                fileName: 'surf_map.bsp'
              },
              { file: vmfBuffer, field: 'vmfs', fileName: 'surf_map.vmf' }
            ],
            token
          });
        });

        it('should 400 if a BSP file was not compressed', async () => {
          await req.postAttach({
            url: 'maps',
            status: 400,
            data: createMapObject,
            files: [
              { file: nozipBspBuffer, field: 'bsp', fileName: 'surf_map.bsp' },
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

        it('should 400 if the map has invalid zones', async () => {
          const zones = structuredClone(ZonesStub);
          // Silly values that pass class-validator but get caught by zone-validator.ts
          zones.volumes.push({
            regions: [
              {
                points: [
                  [Number.MIN_SAFE_INTEGER ** 4, 4],
                  [4, 4],
                  [4, 4]
                ],
                height: 4444,
                teleportPos: [-4, -4, -4],
                bottom: 100000000000,
                teleportYaw: 4
              }
            ]
          });

          await req.postAttach({
            url: 'maps',
            status: 400,
            data: { ...createMapObject, zones },
            files: [
              { file: bspBuffer, field: 'bsp', fileName: 'surf_map.bsp' },
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
              trackNum: 0,
              trackType: TrackType.MAIN
            },
            {
              gamemode: Gamemode.BHOP,
              trackNum: 0,
              trackType: TrackType.MAIN
            }
          );

          await req.postAttach({
            url: 'maps',
            status: 400,
            data: { ...createMapObject, suggestions: suggs },
            files: [
              { file: bspBuffer, field: 'bsp', fileName: 'surf_map.bsp' },
              { file: vmfBuffer, field: 'vmfs', fileName: 'surf_map.vmf' }
            ],
            token
          });
        });

        it('should 409 if a map with the same name exists', async () => {
          const name = 'ron_weasley';

          await db.createMap({ name });

          await req.postAttach({
            url: 'maps',
            status: 409,
            data: { ...createMapObject, name },
            files: [
              { file: bspBuffer, field: 'bsp', fileName: 'surf_map.bsp' },
              { file: vmfBuffer, field: 'vmfs', fileName: 'surf_map.vmf' }
            ],
            token
          });
        });

        it('should 400 if the zones are too large', async () =>
          req.postAttach({
            url: 'maps',
            status: 400,
            data: {
              ...createMapObject,
              // 10,000 zones :D
              zones: ZoneUtil.generateRandomMapZones(
                100,
                from(100, () => 100),
                0,
                1024 ** 2,
                1024,
                1024
              )
            },
            files: [
              { file: bspBuffer, field: 'bsp', fileName: 'surf_map.bsp' }
            ],
            token
          }));

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
          name: 'my_epic_map',
          submission: {
            create: {
              type: MapSubmissionType.ORIGINAL,
              suggestions: [
                {
                  trackType: TrackType.MAIN,
                  trackNum: 0,
                  gamemode: Gamemode.SURF,
                  tier: 1,
                  ranked: true,
                  comment: 'I will kill again'
                }
              ],
              versions: {
                createMany: {
                  data: [
                    { versionNum: 1, hash: createSha1Hash('bats') },
                    { versionNum: 2, hash: createSha1Hash('wigs') }
                  ]
                }
              },
              dates: [
                { status: MapStatusNew.APPROVED, date: new Date().toJSON() }
              ]
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

        await prisma.mapSubmission.update({
          where: { mapID: map.id },
          data: {
            currentVersion: { connect: { id: map.submission.versions[1].id } }
          }
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

      it('should respond with expanded map data using the zones expand parameter', () =>
        req.expandTest({
          url: `maps/${map.id}`,
          validate: MapDto,
          expand: 'zones',
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
      let u1,
        u1Token,
        u2Token,
        map,
        bspBuffer,
        bspHash,
        vmfBuffer,
        vmfHash,
        leaderboards;

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
      });

      beforeEach(async () => {
        map = await db.createMap(
          {
            name: 'surf_map', // This is actually RJ now. deal with it lol
            submitter: { connect: { id: u1.id } },
            status: MapStatusNew.PRIVATE_TESTING,
            submission: {
              create: {
                type: MapSubmissionType.ORIGINAL,
                suggestions: [
                  {
                    trackType: TrackType.MAIN,
                    trackNum: 0,
                    gamemode: Gamemode.RJ,
                    tier: 10,
                    ranked: true
                  }
                ],
                versions: {
                  create: {
                    zones: ZonesStub,
                    versionNum: 1,
                    hash: createSha1Hash(Buffer.from('hash browns'))
                  }
                },
                dates: [
                  {
                    status: MapStatusNew.PRIVATE_TESTING,
                    date: new Date().toJSON()
                  }
                ]
              }
            }
          },
          true
        );
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
          versions: expect.arrayContaining([
            expect.objectContaining({ versionNum: 1 }),
            expect.objectContaining({ versionNum: 2, changelog })
          ])
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

        const bspDownloadBuffer = await fileStore.downloadHttp(
          currentVersion.downloadURL
        );
        const bspDownloadHash = createSha1Hash(bspDownloadBuffer);

        expect(bspHash).toBe(currentVersion.hash);
        expect(bspDownloadHash).toBe(currentVersion.hash);

        expect(currentVersion.vmfDownloadURL.split('/').slice(-2)).toEqual([
          'submissions',
          `${currentVersion.id}_VMFs.zip`
        ]);

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
            ranked: false,
            ...lb
          }))
        });

        await db.createLbRun({
          map,
          user: u1,
          rank: 1,
          gamemode: Gamemode.RJ,
          trackType: TrackType.MAIN,
          trackNum: 0
        });

        await db.createLbRun({
          map,
          user: u1,
          rank: 1,
          gamemode: Gamemode.CONC,
          trackType: TrackType.BONUS,
          trackNum: 0
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

        // Delete bonus volumes
        newZones.volumes.pop();
        newZones.volumes.pop();

        // New S3 end
        newZones.volumes.push({
          regions: [
            {
              bottom: 0,
              height: 512,
              points: [
                [5120, 0],
                [5120, 256],
                [5632, 512],
                [5632, 0]
              ]
            }
          ]
        });

        // S2 end is now also a start zone so needs this:
        Object.assign(newZones.volumes[4].regions[0], {
          teleportYaw: 0,
          teleportPos: [4352, 256, 0]
        });

        // Major CP for main track
        newZones.tracks.main.zones.segments.push({
          limitStartGroundSpeed: true,
          checkpoints: [{ volumeIndex: 4 }]
        });

        // Main track end is now end of S3
        newZones.tracks.main.zones.end.volumeIndex = 5;

        // Stage 2's end zone becomes S3 start, not the old end zone
        newZones.tracks.stages[1].zones.end.volumeIndex = 4;
        newZones.tracks.stages.push({
          name: 'Stage 3',
          minorRequired: true,
          zones: {
            segments: [
              {
                limitStartGroundSpeed: true,
                checkpoints: [{ volumeIndex: 4 }]
              }
            ],
            end: { volumeIndex: 5 }
          }
        });

        // Nuke the bonus
        newZones.tracks.bonuses = [];

        await req.postAttach({
          url: `maps/${map.id}`,
          status: 201,
          data: { changelog: 'Added Stage 3, removed bonus', zones: newZones },
          files: [
            { file: bspBuffer, field: 'bsp', fileName: 'surf_map.bsp' },
            { file: vmfBuffer, field: 'vmfs', fileName: 'surf_map.vmf' }
          ],
          validate: MapDto,
          token: u1Token
        });

        // prettier-ignore
        const expected = [GM.RJ, GM.SJ, GM.CONC, GM.DEFRAG_CPM, GM.DEFRAG_VQ3]
          .flatMap((gamemode) => [
            { gamemode, trackType: TrackType.MAIN,  trackNum: 0, linear: false },
            { gamemode, trackType: TrackType.STAGE, trackNum: 0, linear: null },
            { gamemode, trackType: TrackType.STAGE, trackNum: 1, linear: null },
            { gamemode, trackType: TrackType.STAGE, trackNum: 2, linear: null }
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

      it('should 400 for bad zones', () =>
        req.postAttach({
          url: `maps/${map.id}`,
          status: 400,
          data: {
            changelog: 'done fucked it',
            zones: {
              ...ZonesStub,
              volumes: [
                ...ZonesStub.volumes,
                {
                  regions: [
                    {
                      bottom: 0,
                      height: 100,
                      points: [
                        [-100000000, 0],
                        [-100000000, 0],
                        [1283764512678, 0.000000001],
                        [5652345234537, 2]
                      ]
                    }
                  ]
                }
              ]
            } as MapZones
          },
          files: [
            { file: bspBuffer, field: 'bsp', fileName: 'surf_map.bsp' },
            { file: vmfBuffer, field: 'vmfs', fileName: 'surf_map.vmf' }
          ],
          token: u1Token
        }));

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

      for (const status of [MapStatusNew.APPROVED, MapStatusNew.DISABLED]) {
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

      it('should wipe leaderboards if resetLeaderboards is true', async () => {
        await prisma.leaderboard.create({
          data: {
            mmap: { connect: { id: map.id } },
            gamemode: Gamemode.AHOP,
            trackType: TrackType.MAIN,
            trackNum: 0,
            style: 0,
            ranked: false,
            runs: {
              create: {
                userID: u1.id,
                time: 1,
                stats: {},
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

        await req.postAttach({
          url: `maps/${map.id}`,
          status: 201,
          data: { changelog: 'all your runs SUCK', resetLeaderboards: true },
          files: [{ file: bspBuffer, field: 'bsp', fileName: 'surf_map.bsp' }],
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
            trackNum: 0,
            style: 0,
            ranked: false,
            runs: {
              create: {
                userID: u1.id,
                time: 1,
                stats: {},
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

        await req.postAttach({
          url: `maps/${map.id}`,
          status: 201,
          data: {
            changelog: 'damn these runs are great. i love you guys',
            resetLeaderboards: false
          },
          files: [{ file: bspBuffer, field: 'bsp', fileName: 'surf_map.bsp' }],
          validate: MapDto,
          token: u1Token
        });

        await req.postAttach({
          url: `maps/${map.id}`,
          status: 201,
          data: { changelog: 'im so happy right now' },
          files: [{ file: bspBuffer, field: 'bsp', fileName: 'surf_map.bsp' }],
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
                dates: [
                  {
                    status: MapStatusNew.APPROVED,
                    date: new Date(Date.now() - 3000)
                  },
                  {
                    status: MapStatusNew.DISABLED,
                    date: new Date(Date.now() - 2000)
                  },
                  {
                    status: MapStatusNew.PRIVATE_TESTING,
                    date: new Date(Date.now() - 1000)
                  }
                ]
              }
            }
          }
        });

        await prisma.leaderboard.create({
          data: {
            mmap: { connect: { id: map.id } },
            gamemode: Gamemode.AHOP,
            trackType: TrackType.MAIN,
            trackNum: 0,
            style: 0,
            ranked: false,
            runs: {
              create: {
                userID: u1.id,
                time: 1,
                stats: {},
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

        await req.postAttach({
          url: `maps/${map.id}`,
          status: 403,
          data: {
            changelog: 'PLEASE let me delete these runs',
            resetLeaderboards: true
          },
          files: [{ file: bspBuffer, field: 'bsp', fileName: 'surf_map.bsp' }],
          token: u1Token
        });

        expect(
          await prisma.leaderboardRun.findMany({
            where: { mapID: map.id }
          })
        ).toHaveLength(1);
      });

      it('should 401 when no access token is provided', () =>
        req.unauthorizedTest('maps/1', 'post'));
    });

    describe('PATCH', () => {
      let user, token, u2, u2Token, adminToken, createMapData;

      beforeAll(async () => {
        [[user, token], [u2, u2Token], adminToken] = await Promise.all([
          db.createAndLoginUser(),
          db.createAndLoginUser(),
          db.loginNewUser({ data: { roles: Role.ADMIN } })
        ]);

        createMapData = {
          name: 'surf_map',
          submitter: { connect: { id: user.id } },
          submission: {
            create: {
              type: MapSubmissionType.ORIGINAL,
              dates: [
                {
                  status: MapStatusNew.PRIVATE_TESTING,
                  date: new Date().toJSON()
                }
              ],
              suggestions: [
                {
                  trackType: TrackType.MAIN,
                  trackNum: 0,
                  gamemode: Gamemode.RJ,
                  tier: 1,
                  ranked: true
                },
                {
                  trackType: TrackType.BONUS,
                  trackNum: 0,
                  gamemode: Gamemode.DEFRAG_CPM,
                  tier: 1,
                  ranked: true
                }
              ],
              versions: {
                create: {
                  zones: ZonesStub,
                  versionNum: 1,
                  hash: createSha1Hash(Buffer.from('shashashs'))
                }
              }
            }
          }
        };
      });

      afterAll(() => db.cleanup('user'));

      afterEach(() => db.cleanup('mMap'));

      for (const status of CombinedMapStatuses.IN_SUBMISSION) {
        it(`should allow the submitter to change most data during ${MapStatusNew[status]}`, async () => {
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
                  trackNum: 0,
                  gamemode: Gamemode.CONC,
                  tier: 1,
                  ranked: true
                },
                {
                  trackType: TrackType.BONUS,
                  trackNum: 0,
                  gamemode: Gamemode.DEFRAG_CPM,
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
                  trackNum: 0,
                  gamemode: Gamemode.CONC,
                  tier: 1,
                  ranked: true
                },
                {
                  trackType: TrackType.BONUS,
                  trackNum: 0,
                  gamemode: Gamemode.DEFRAG_CPM,
                  tier: 1,
                  ranked: true
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
          status: MapStatusNew.APPROVED
        });

        await req.patch({
          url: `maps/${map.id}`,
          status: 403,
          body: { info: { description: 'Fuck ostriches' } },
          token
        });
      });

      it('should always 403 if map is DISABLED', async () => {
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

      const statuses = Enum.values(MapStatusNew);
      // Storing number tuple won't pass .has
      const validChanges = new Set([
        MapStatusNew.PRIVATE_TESTING + ',' + MapStatusNew.CONTENT_APPROVAL,
        MapStatusNew.CONTENT_APPROVAL + ',' + MapStatusNew.PRIVATE_TESTING,
        MapStatusNew.FINAL_APPROVAL + ',' + MapStatusNew.PUBLIC_TESTING
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
                  type: MapSubmissionType.PORT,
                  suggestions: [
                    {
                      trackType: TrackType.MAIN,
                      trackNum: 0,
                      gamemode: Gamemode.CONC,
                      tier: 1,
                      ranked: true
                    },
                    {
                      trackType: TrackType.BONUS,
                      trackNum: 0,
                      gamemode: Gamemode.DEFRAG_CPM,
                      tier: 1,
                      ranked: true
                    }
                  ],
                  dates: [
                    {
                      status: s1,
                      date: new Date().toJSON()
                    }
                  ],
                  versions: {
                    create: {
                      zones: ZonesStub,
                      versionNum: 1,
                      hash: createSha1Hash(Buffer.from('shashashs'))
                    }
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
              dates: [
                {
                  status: MapStatusNew.PUBLIC_TESTING,
                  date: Date.now() - (MIN_PUBLIC_TESTING_DURATION + 1000)
                }
              ],
              type: MapSubmissionType.PORT,
              suggestions: [
                {
                  trackType: TrackType.MAIN,
                  trackNum: 0,
                  gamemode: Gamemode.DEFRAG_CPM,
                  tier: 10,
                  ranked: true
                },
                {
                  trackType: TrackType.BONUS,
                  trackNum: 0,
                  gamemode: Gamemode.DEFRAG_CPM,
                  tier: 1,
                  ranked: true
                }
              ],
              versions: {
                create: {
                  zones: ZonesStub,
                  versionNum: 1,
                  hash: createSha1Hash(Buffer.from('shashashs'))
                }
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

      it('should generate new leaderboards if suggestions change', async () => {
        const map = await db.createMap({
          ...createMapData,
          status: MapStatusNew.PRIVATE_TESTING
        });

        await prisma.leaderboard.createMany({
          data: ZonesStubLeaderboards.map((lb) => ({
            mapID: map.id,
            style: 0,
            ranked: false,
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
                trackNum: 0,
                gamemode: Gamemode.DEFRAG_CPM,
                tier: 10,
                ranked: true
              },
              {
                trackType: TrackType.BONUS,
                trackNum: 0,
                gamemode: Gamemode.DEFRAG_CPM,
                tier: 1,
                ranked: true
              }
            ]
          },
          token
        });

        expect(
          await prisma.leaderboard.findMany({
            where: { mapID: map.id, gamemode: Gamemode.BHOP, style: 0 }
          })
        ).toHaveLength(4);

        expect(
          await prisma.leaderboard.findMany({
            where: { mapID: map.id, gamemode: Gamemode.CONC }
          })
        ).toHaveLength(4);

        // Check existing runs weren't deleted

        expect(
          await prisma.leaderboardRun.findMany({
            where: { mapID: map.id, gamemode: Gamemode.CONC }
          })
        ).toHaveLength(1);
      });

      it('should 400 for invalid suggestions', async () => {
        const map = await db.createMap({
          ...createMapData,
          submitter: { connect: { id: user.id } },
          status: MapStatusNew.PRIVATE_TESTING
        });

        // Lots of checks here but is unit tested, just remove the bonus
        await req.patch({
          url: `maps/${map.id}`,
          status: 204,
          body: {
            suggestions: [
              {
                trackType: TrackType.MAIN,
                trackNum: 0,
                gamemode: Gamemode.DEFRAG_CPM,
                comment: 'FUCK!!!!',
                tier: 10,
                ranked: true
              },
              {
                trackType: TrackType.BONUS,
                trackNum: 0,
                gamemode: Gamemode.DEFRAG_CPM,
                tier: 1,
                ranked: true
              }
            ]
          },
          token
        });
      });

      it('should 400 if suggestions and zones dont match up', async () => {
        const map = await db.createMap({
          ...createMapData,
          status: MapStatusNew.PRIVATE_TESTING,
          submission: {
            create: {
              type: MapSubmissionType.PORT,
              versions: {
                create: {
                  // Has a bonus
                  zones: ZonesStub,
                  versionNum: 1,
                  hash: createSha1Hash(Buffer.from('shashashs'))
                }
              },
              // No bonus, so should fail
              suggestions: [
                {
                  trackType: TrackType.MAIN,
                  trackNum: 0,
                  gamemode: Gamemode.SURF,
                  tier: 10,
                  ranked: true
                }
              ]
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
          token
        }));

      it('should 401 when no access token is provided', () =>
        req.unauthorizedTest('maps/1', 'patch'));
    });
  });

  describe('maps/submissions', () => {
    describe('GET', () => {
      let u1, u1Token, u2, pubMap1, pubMap2, privMap, caMap, faMap;

      beforeAll(async () => {
        [[u1, u1Token], u2] = await Promise.all([
          db.createAndLoginUser(),
          db.createUser()
        ]);

        const submissionCreate = {
          create: {
            type: MapSubmissionType.ORIGINAL,
            dates: [
              {
                status: MapStatusNew.PRIVATE_TESTING,
                date: new Date().toJSON()
              }
            ],
            suggestions: [
              {
                track: 1,
                trackType: TrackType.MAIN,
                trackNum: 0,
                gamemode: Gamemode.CONC,
                tier: 1,
                ranked: true,
                comment: 'My dad made this'
              }
            ],
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
        faMap = await db.createMap({
          status: MapStatusNew.CONTENT_APPROVAL,
          submission: submissionCreate
        });
        caMap = await db.createMap({
          status: MapStatusNew.FINAL_APPROVAL,
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
          for (const prop of [
            'submission',
            'id',
            'name',
            'status',
            'hash',
            'submitterID',
            'createdAt',
            'updatedAt'
          ]) {
            expect(item).toHaveProperty(prop);
          }
          expect(item).not.toHaveProperty('zones');
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
          searchString: 'aa',
          searchPropertyName: 'name',
          validate: { type: MapDto, count: 1 }
        });
      });

      it('should respond with filtered map data using the searchStartsWith parameter', async () => {
        await prisma.mMap.update({
          where: { id: pubMap1.id },
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

      it('should respond with expanded submission versions data using the version expand parameter', async () => {
        const res = await req.expandTest({
          url: 'maps/submissions',
          expand: 'versions',
          expectedPropertyName: 'submission.versions[1]',
          paged: true,
          validate: MapDto,
          token: u1Token
        });

        for (const item of res.body.data) {
          for (const version of item.submission.versions) {
            expect(version).toHaveProperty('id');
            expect(version).toHaveProperty('downloadURL');
            expect(version).toHaveProperty('hash');
            expect(version).toHaveProperty('versionNum');
            expect(version).toHaveProperty('createdAt');
            expect(version).not.toHaveProperty('zones');
            expect(version).not.toHaveProperty('changelog');
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

      it('should include final approval maps for which the user is the submitter', async () => {
        await prisma.mMap.update({
          where: { id: faMap.id },
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
            expect.objectContaining({ id: faMap.id })
          ])
        );

        await prisma.mMap.update({
          where: { id: faMap.id },
          data: { submitter: { disconnect: true } }
        });
      });

      it('should include content approval maps for which the user is the submitter', async () => {
        await prisma.mMap.update({
          where: { id: caMap.id },
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
