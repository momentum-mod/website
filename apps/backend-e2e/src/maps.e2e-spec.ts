// noinspection DuplicatedCode

import { readFileSync } from 'node:fs';
import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import {
  AuthUtil,
  createSha1Hash,
  dateOffset,
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
  MapTrackDto,
  RankDto,
  RunDto,
  UserDto
} from '@momentum/backend/dto';
import {
  ActivityType,
  MapCreditType,
  MapStatus,
  MapType,
  Role
} from '@momentum/constants';
import { Config } from '@momentum/backend/config';
// See auth.e2e-spec.ts for justification of this sin
// eslint-disable-next-line @nx/enforce-module-boundaries
import { SteamService } from '../../backend/src/app/modules/steam/steam.service';
import path from 'node:path';

describe('Maps', () => {
  let app,
    prisma: PrismaClient,
    req: RequestUtil,
    db: DbUtil,
    fs: FileStoreUtil,
    auth: AuthUtil;

  beforeAll(async () => {
    const env = await setupE2ETestEnvironment();
    app = env.app;
    prisma = env.prisma;
    req = env.req;
    db = env.db;
    fs = env.fs;
    auth = env.auth;
    fs = env.fs;
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

        [m1, m2, m3, m4] = await db.createMaps(4, {
          credits: { create: { type: 0, userID: u1.id } }
        });
      });

      afterAll(() => db.cleanup('user', 'map', 'run'));

      it('should respond with map data', async () => {
        const res = await req.get({
          url: 'maps',
          status: 200,
          validatePaged: { type: MapDto, count: 4 },
          token: u1Token
        });

        for (const item of res.body.data) {
          expect(item).toHaveProperty('mainTrack');
          expect(item).toHaveProperty('info');
        }
      });

      it('should be ordered by date', () =>
        req.sortByDateTest({ url: 'maps', validate: MapDto, token: u1Token }));

      it('should respond with filtered map data using the take parameter', () =>
        req.takeTest({ url: 'maps', validate: MapDto, token: u1Token }));

      it('should respond with filtered map data using the skip parameter', () =>
        req.skipTest({ url: 'maps', validate: MapDto, token: u1Token }));

      it('should respond with filtered map data using the search parameter', async () => {
        m2 = await prisma.map.update({
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
        await prisma.map.update({
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
        const newType = MapType.BHOP;
        await prisma.map.update({
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
        await prisma.map.updateMany({ data: { submitterID: u2.id } });

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

      it('should respond with expanded map data using the tracks info parameter', () =>
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
          prisma.map.update({
            where: { id: m1.id },
            data: { mainTrack: { update: { difficulty: 1 } } }
          }),
          prisma.map.update({
            where: { id: m2.id },
            data: { mainTrack: { update: { difficulty: 3 } } }
          }),
          prisma.map.update({
            where: { id: m3.id },
            data: { mainTrack: { update: { difficulty: 3 } } }
          }),
          prisma.map.update({
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
          prisma.map.update({
            where: { id: m1.id },
            data: { mainTrack: { update: { isLinear: false } } }
          }),
          prisma.map.update({
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
      let user, token, createMapObject;

      beforeAll(async () => {
        [user, token] = await db.createAndLoginUser({
          data: { roles: Role.MAPPER }
        });

        createMapObject = {
          name: 'test_map',
          type: MapType.SURF,
          info: {
            description: 'mamp',
            numTracks: 1,
            creationDate: '2022-07-07T18:33:33.000Z'
          },
          credits: [{ userID: user.id, type: MapCreditType.AUTHOR }],
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

      afterEach(() => db.cleanup('map'));
      afterAll(() => db.cleanup('user'));

      describe('should create a new map', () => {
        let res, createdMap;

        beforeAll(async () => {
          res = await req.post({
            url: 'maps',
            status: 201,
            body: createMapObject,
            token: token
          });
          createdMap = await prisma.map.findFirst({
            include: {
              info: true,
              stats: true,
              credits: true,
              mainTrack: true,
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

        it('should respond with a MapDto', () => {
          expect(res.body).toBeValidDto(MapDto);
          // Check the whacky JSON parsing stuff works
          const trigger = res.body.tracks[0].zones[0].triggers[0];
          expect(trigger.points).toStrictEqual({ p1: '0', p2: '0' });
          expect(trigger.properties.properties).toStrictEqual({});
        });

        it('should create a map within the database', () => {
          expect(createdMap.name).toBe('test_map');
          expect(createdMap.info.description).toBe('mamp');
          expect(createdMap.info.numTracks).toBe(1);
          expect(createdMap.info.creationDate.toJSON()).toBe(
            '2022-07-07T18:33:33.000Z'
          );
          expect(createdMap.submitterID).toBe(user.id);
          expect(createdMap.credits[0].userID).toBe(user.id);
          expect(createdMap.credits[0].type).toBe(MapCreditType.AUTHOR);
          expect(createdMap.tracks).toHaveLength(2);
          expect(createdMap.mainTrack.id).toBe(
            createdMap.tracks.find((track) => track.trackNum === 0).id
          );

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

        it('should create map uploaded activities for the map authors', async () => {
          const activity = await prisma.activity.findFirst();

          expect(activity.type).toBe(ActivityType.MAP_UPLOADED);
          expect(activity.data).toBe(BigInt(createdMap.id));
        });

        it('set the Location property in the response header on creation', async () => {
          expect(res.headers.location).toBe(
            `api/v1/maps/${createdMap.id}/upload`
          );
        });
      });

      it('should 400 if the map does not have any tracks', () =>
        req.post({
          url: 'maps',
          status: 400,
          body: { ...createMapObject, tracks: [] },
          token: token
        }));

      it('should 400 if a map track has less than 2 zones', () =>
        req.post({
          url: 'maps',
          status: 400,
          body: {
            createMapObject,
            tracks: [
              { createMapObject, zones: createMapObject.tracks[0].zones[0] }
            ]
          },
          token: token
        }));

      it('should 409 if a map with the same name exists', async () => {
        const name = 'ron_weasley';

        await db.createMap({ name: name });

        await req.post({
          url: 'maps',
          status: 409,
          body: { ...createMapObject, name: name },
          token: token
        });
      });

      it('should 409 if the submitter has reached the pending map limit', async () => {
        await db.createMaps(Config.limits.pendingMaps, {
          status: MapStatus.PENDING,
          submitter: { connect: { id: user.id } }
        });

        await req.post({
          url: 'maps',
          status: 409,
          body: createMapObject,
          token: token
        });
      });

      it('should 403 when the user does not have the mapper role', async () => {
        await prisma.user.update({
          where: { id: user.id },
          data: { roles: 0 }
        });

        await req.post({
          url: 'maps',
          status: 403,
          body: createMapObject,
          token: token
        });
      });

      it('should 401 when no access token is provided', () =>
        req.unauthorizedTest('maps', 'post'));
    });
  });

  describe('maps/{mapID}/upload', () => {
    let u1, u1Token, u2Token, map;

    beforeAll(async () => {
      [[u1, u1Token], u2Token] = await Promise.all([
        db.createAndLoginUser({ data: { roles: Role.MAPPER } }),
        db.loginNewUser()
      ]);
      map = await db.createMap({
        status: MapStatus.NEEDS_REVISION,
        submitter: { connect: { id: u1.id } }
      });
    });

    afterAll(() => db.cleanup('user', 'map'));

    describe('GET', () => {
      it('should set the response header location to the map upload endpoint', async () => {
        const res = await req.get({
          url: `maps/${map.id}/upload`,
          status: 204,
          token: u1Token
        });

        expect(res.headers.location).toBe(`api/v1/maps/${map.id}/upload`);
      });

      it('should 403 when the submitterID does not match the userID', async () => {
        const u2Token = await db.loginNewUser();

        await req.get({
          url: `maps/${map.id}/upload`,
          status: 403,
          token: u2Token
        });
      });

      it('should 403 when the map is not accepting uploads', async () => {
        await prisma.map.update({
          where: { id: map.id },
          data: { status: MapStatus.REJECTED }
        });

        await req.get({
          url: `maps/${map.id}/upload`,
          status: 403,
          token: u2Token
        });

        await prisma.map.update({
          where: { id: map.id },
          data: { status: MapStatus.NEEDS_REVISION }
        });
      });

      it('should 401 when no access token is provided', () =>
        req.unauthorizedTest('maps/1/upload', 'get'));
    });

    describe('POST', () => {
      it('should upload the map file', async () => {
        const inBuffer = readFileSync(path.join(FILES_PATH, 'map.bsp'));
        const inHash = createSha1Hash(inBuffer);

        const res = await req.postAttach({
          url: `maps/${map.id}/upload`,
          status: 201,
          file: inBuffer,
          token: u1Token
        });

        const url: string = res.body.downloadURL;
        expect(url.split('/').at(-1)).toBe(res.body.name + '.bsp');

        const outBuffer = await axios
          .get(url, { responseType: 'arraybuffer' })
          .then((res) => Buffer.from(res.data, 'binary'));
        const outHash = createSha1Hash(outBuffer);

        expect(inHash).toBe(res.body.hash);
        expect(outHash).toBe(res.body.hash);

        await fs.delete(`maps/${map.name}.bsp`);
      });

      it('should 400 when no map file is provided', () =>
        req.post({
          url: `maps/${map.id}/upload`,
          status: 400,
          token: u1Token
        }));

      it("should 400 when the map file is greater than the config's max map file size", () =>
        req.postAttach({
          url: `maps/${map.id}/upload`,
          status: 400,
          file: Buffer.alloc(Config.limits.mapSize + 1),
          token: u1Token
        }));

      it('should 403 when the submitterID does not match the userID', () =>
        req.postAttach({
          url: `maps/${map.id}/upload`,
          status: 403,
          file: 'map.bsp',
          token: u2Token
        }));

      it('should 403 when the map is not accepting uploads', async () => {
        await prisma.map.update({
          where: { id: map.id },
          data: { status: MapStatus.REJECTED }
        });

        await req.postAttach({
          url: `maps/${map.id}/upload`,
          status: 403,
          file: 'map.bsp',
          token: u1Token
        });
      });

      it('should 401 when no access token is provided', () =>
        req.unauthorizedTest('maps/1/upload', 'post'));
    });
  });

  describe('The Big Chungie Create, Upload then Download Test', () => {
    afterAll(() => db.cleanup('user', 'map'));

    it('should successfully create a map, upload it to the returned location, then download it', async () => {
      const [user, token] = await db.createAndLoginUser({
        data: { roles: Role.MAPPER }
      });

      const res = await req.post({
        url: 'maps',
        status: 201,
        body: {
          name: 'test_map',
          type: MapType.SURF,
          info: {
            description: 'mamp',
            numTracks: 1,
            creationDate: '2022-07-07T18:33:33.000Z'
          },
          credits: [{ userID: user.id, type: MapCreditType.AUTHOR }],
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
                    properties: '{}'
                  }
                }
              ]
            }))
          }))
        },
        token: token
      });

      const inBuffer = readFileSync(__dirname + '/../files/map.bsp');
      const inHash = createSha1Hash(inBuffer);

      const uploadURL = res.headers.location as string;

      const res2 = await req.postAttach({
        url: uploadURL,
        skipApiPrefix: true,
        status: 201,
        file: 'map.bsp',
        token: token
      });

      const outBuffer = await axios
        .get(res2.body.downloadURL, { responseType: 'arraybuffer' })
        .then((res) => Buffer.from(res.data, 'binary'));
      const outHash = createSha1Hash(outBuffer);

      expect(inHash).toBe(outHash);

      await fs.delete('maps/test_map.bsp');
    });
  });

  describe('maps/{mapID}/download', () => {
    describe('GET', () => {
      let token, map, file;

      beforeAll(
        async () =>
          ([token, map] = await Promise.all([
            db.loginNewUser(),
            db.createMap()
          ]))
      );

      afterAll(() => db.cleanup('user', 'map'));

      describe('should download a map', () => {
        it("should respond with the map's BSP file", async () => {
          const key = `maps/${map.name}.bsp`;
          file = readFileSync(__dirname + '/../files/map.bsp');

          await fs.add(key, file);

          const res = await req.get({
            url: `maps/${map.id}/download`,
            status: 200,
            token: token,
            contentType: 'octet-stream'
          });

          const inHash = createSha1Hash(file);
          const outHash = createSha1Hash(res.rawPayload);
          expect(inHash).toEqual(outHash);

          await fs.delete(key);
        });

        it('should update the map download stats', async () => {
          const stats = await prisma.mapStats.findFirst({
            where: { mapID: map.id }
          });

          expect(stats.downloads).toBe(1);
        });
      });

      it("should 404 when the map's BSP file is not found", async () => {
        const map2 = await db.createMap();

        await req.get({
          url: `maps/${map2.id}/download`,
          status: 404,
          token: token,
          contentType: 'json'
        });
      });

      it('should 404 when the map is not found', () =>
        req.get({
          url: `maps/${NULL_ID}/download`,
          status: 404,
          token: token,
          contentType: 'json'
        }));

      it('should 401 when no access token is provided', () =>
        req.unauthorizedTest('maps/1/download', 'get'));
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

      afterAll(() => db.cleanup('user', 'map', 'run'));

      it('should respond with map data', () =>
        req.get({
          url: `maps/${map.id}`,
          status: 200,
          validate: MapDto,
          token: u1Token
        }));

      it('should respond with expanded map data using the credits expand parameter', async () => {
        await prisma.mapCredit.create({
          data: { mapID: map.id, userID: u1.id, type: MapCreditType.AUTHOR }
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
        await prisma.map.update({
          where: { id: map.id },
          data: { submitterID: u1.id }
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

      it('should 404 if the map is not found', () =>
        req.get({ url: `maps/${NULL_ID}`, status: 404, token: u1Token }));

      it('should 401 when no access token is provided', () =>
        req.unauthorizedTest('maps/1', 'get'));
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

      describe('Status changes', () => {
        let map;

        beforeAll(
          async () =>
            (map = await db.createMap({
              submitter: { connect: { id: user.id } }
            }))
        );
        afterAll(() => db.cleanup('map'));

        const statuses = Object.values(MapStatus).filter(
          (v) => typeof v === 'number'
        ) as MapStatus[];
        // Storing number tuple won't pass .has
        const validChanges = new Set([
          MapStatus.NEEDS_REVISION + ',' + MapStatus.READY_FOR_RELEASE
        ]);

        for (const s1 of statuses) {
          for (const s2 of statuses.filter((s) => s !== s1)) {
            const shouldPass = validChanges.has(s1 + ',' + s2);

            it(`should ${
              shouldPass ? '' : 'not '
            }allow a mapper to change their map from ${MapStatus[s1]} to ${
              MapStatus[s2]
            }`, async () => {
              await prisma.map.update({
                where: { id: map.id },
                data: { status: s1 }
              });

              await req.patch({
                url: `maps/${map.id}`,
                status: shouldPass ? 204 : 403,
                body: { status: s2 },
                token: token
              });
            });
          }
        }
      });

      describe('Everything else', () => {
        afterEach(() => db.cleanup('map', 'activity'));

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

          const updatedMap = await prisma.map.findUnique({
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

      afterAll(() => db.cleanup('user', 'map'));

      it('should respond with map info', () =>
        req.get({
          url: `maps/${map.id}/info`,
          status: 200,
          validate: MapInfoDto,
          token: token
        }));

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

      afterAll(() => db.cleanup('user', 'map'));

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
      let u1, u1Token, u2, map;

      beforeAll(async () => {
        [[u1, u1Token], u2] = await Promise.all([
          db.createAndLoginUser(),
          db.createUser()
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

      afterAll(() => db.cleanup('user', 'map'));

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

      it('should return 404 when the map does not exist', () =>
        req.get({
          url: `maps/${NULL_ID}/credits`,
          status: 404,
          token: u1Token
        }));

      it('should 401 when no access token is provided', () =>
        req.unauthorizedTest('maps/1/credits', 'get'));
    });

    describe('POST', () => {
      let u1, u1Token, u2, u2Token, adminToken, modToken, map, newMapCredit;

      beforeEach(async () => {
        [[u1, u1Token], [u2, u2Token], adminToken, modToken] =
          await Promise.all([
            db.createAndLoginUser({ data: { roles: Role.MAPPER } }),
            db.createAndLoginUser({ data: { roles: Role.MAPPER } }),
            db.loginNewUser({ data: { roles: Role.ADMIN } }),
            db.loginNewUser({ data: { roles: Role.MODERATOR } })
          ]);
        map = await db.createMap({
          submitter: { connect: { id: u1.id } },
          status: MapStatus.NEEDS_REVISION
        });
        newMapCredit = { type: MapCreditType.SPECIAL_THANKS, userID: u2.id };
      });

      afterEach(() => db.cleanup('user', 'map'));

      it('should create a map credit for the specified map', async () => {
        await req.post({
          url: `maps/${map.id}/credits`,
          status: 201,
          body: newMapCredit,
          validate: MapCreditDto,
          token: u1Token
        });

        const credit = await prisma.mapCredit.findFirst();
        expect(credit).toMatchObject({ userID: u2.id, mapID: map.id });
      });

      it('should 409 if the map credit already exists', async () => {
        // Just do it twice
        await req.post({
          url: `maps/${map.id}/credits`,
          status: 201,
          body: newMapCredit,
          token: u1Token
        });

        await req.post({
          url: `maps/${map.id}/credits`,
          status: 409,
          body: newMapCredit,
          token: u1Token
        });
      });

      it('should create an activity if a new author is added', async () => {
        await req.post({
          url: `maps/${map.id}/credits`,
          status: 201,
          body: { type: MapCreditType.AUTHOR, userID: u2.id },
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
        req.post({
          url: `maps/${map.id}/credits`,
          status: 201,
          body: newMapCredit,
          validate: MapCreditDto,
          token: adminToken
        }));

      it('should allow an admin to update a create even if the map is not in the NEEDS_REVISION state', async () => {
        await prisma.map.update({
          where: { id: map.id },
          data: { status: MapStatus.APPROVED }
        });

        await req.post({
          url: `maps/${map.id}/credits`,
          status: 201,
          body: newMapCredit,
          validate: MapCreditDto,
          token: adminToken
        });

        await prisma.map.update({
          where: { id: map.id },
          data: { status: MapStatus.NEEDS_REVISION }
        });
      });

      it('should allow a mod to create a credit', () =>
        req.post({
          url: `maps/${map.id}/credits`,
          status: 201,
          body: newMapCredit,
          validate: MapCreditDto,
          token: modToken
        }));

      it('should allow a mod to update the credit even if the map is not in the NEEDS_REVISION state', async () => {
        await prisma.map.update({
          where: { id: map.id },
          data: { status: MapStatus.APPROVED }
        });

        await req.post({
          url: `maps/${map.id}/credits`,
          status: 201,
          body: newMapCredit,
          validate: MapCreditDto,
          token: modToken
        });

        await prisma.map.update({
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
        req.post({
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

        await req.post({
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
        await prisma.map.update({
          where: { id: map.id },
          data: { status: MapStatus.APPROVED }
        });

        await req.post({
          url: `maps/${map.id}/credits`,
          status: 403,
          body: newMapCredit,
          token: u1Token
        });

        await prisma.map.update({
          where: { id: map.id },
          data: { status: MapStatus.NEEDS_REVISION }
        });
      });

      it('should 400 if the map credit object is invalid', () =>
        req.post({
          url: `maps/${map.id}/credits`,
          status: 400,
          body: { type: -6 },
          token: u1Token
        }));

      it('should 400 if the user ID is missing', () =>
        req.post({
          url: `maps/${map.id}/credits`,
          status: 400,
          body: { type: MapCreditType.TESTER },
          token: u1Token
        }));

      it('should 400 if the type is missing', () =>
        req.post({
          url: `maps/${map.id}/credits`,
          status: 400,
          body: { userID: u2.id },
          token: u1Token
        }));

      it('should 400 if the credited user does not exist', () =>
        req.post({
          url: `maps/${map.id}/credits`,
          status: 400,
          body: { type: MapCreditType.TESTER, userID: NULL_ID },
          token: u1Token
        }));

      it('should 401 when no access token is provided', () =>
        req.unauthorizedTest('maps/1/credits', 'post'));
    });
  });

  describe('maps/credits/{mapCreditID}', () => {
    describe('GET', () => {
      let user, token, map, credit;
      const creditType = MapCreditType.AUTHOR;

      beforeAll(async () => {
        [[user, token], map] = await Promise.all([
          db.createAndLoginUser(),
          db.createMap()
        ]);
        credit = await prisma.mapCredit.create({
          data: { mapID: map.id, userID: user.id, type: creditType }
        });
      });

      afterAll(() => db.cleanup('user', 'map'));

      beforeEach(
        async () =>
          (credit = await prisma.mapCredit.create({
            data: { mapID: map.id, userID: user.id, type: creditType }
          }))
      );

      afterEach(() => prisma.mapCredit.deleteMany());

      it('should return the specified map credit', async () => {
        const res = await req.get({
          url: `maps/credits/${credit.id}`,
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
          url: `maps/credits/${credit.id}`,
          expand: 'user',
          validate: MapCreditDto,
          token: token
        }));

      it('should return a 404 if the map credit is not found', () =>
        req.get({ url: `maps/credits/${NULL_ID}`, status: 404, token: token }));

      it('should 401 when no access token is provided', () =>
        req.unauthorizedTest('maps/credits/1', 'get'));
    });

    describe('PATCH', () => {
      let u1, u1Token, u2, u2Token, adminToken, modToken, map, credit, _;

      beforeAll(async () => {
        [[u1, u1Token], [u2, u2Token], adminToken, modToken] =
          await Promise.all([
            db.createAndLoginUser({ data: { roles: Role.MAPPER } }),
            db.createAndLoginUser({ data: { roles: Role.MAPPER } }),
            db.loginNewUser({ data: { roles: Role.ADMIN } }),
            db.loginNewUser({ data: { roles: Role.MODERATOR } })
          ]);

        map = await db.createMap({
          status: MapStatus.NEEDS_REVISION,
          submitter: { connect: { id: u1.id } }
        });
      });

      afterAll(() => db.cleanup('user', 'map'));

      beforeEach(
        async () =>
          (credit = await prisma.mapCredit.create({
            data: { mapID: map.id, userID: u1.id, type: MapCreditType.AUTHOR }
          }))
      );

      afterEach(() => prisma.mapCredit.deleteMany());

      it("should update the specified map credit's user and type", async () => {
        await req.patch({
          url: `maps/credits/${credit.id}`,
          status: 204,
          body: { userID: u2.id, type: MapCreditType.COAUTHOR },
          token: u1Token
        });

        const updatedCredit = await prisma.mapCredit.findUnique({
          where: { id: credit.id }
        });
        expect(updatedCredit).toMatchObject({
          userID: u2.id,
          type: MapCreditType.COAUTHOR
        });
      });

      it("should just update the specified map credit's type", () =>
        req.patch({
          url: `maps/credits/${credit.id}`,
          status: 204,
          body: { type: MapCreditType.SPECIAL_THANKS },
          token: u1Token
        }));

      it("should just update the specified map credit's user", () =>
        req.patch({
          url: `maps/credits/${credit.id}`,
          status: 204,
          body: { userID: u1.id },
          token: u1Token
        }));

      it('should allow an admin to update the credit', () =>
        req.patch({
          url: `maps/credits/${credit.id}`,
          status: 204,
          body: { type: MapCreditType.COAUTHOR },
          token: adminToken
        }));

      it('should allow an admin to update the credit even if the map is not in the NEEDS_REVISION state', async () => {
        await prisma.map.update({
          where: { id: map.id },
          data: { status: MapStatus.APPROVED }
        });

        await req.patch({
          url: `maps/credits/${credit.id}`,
          status: 204,
          body: { type: MapCreditType.COAUTHOR },
          token: adminToken
        });

        await prisma.map.update({
          where: { id: map.id },
          data: { status: MapStatus.NEEDS_REVISION }
        });
      });

      it('should allow a mod to update the credit', () =>
        req.patch({
          url: `maps/credits/${credit.id}`,
          status: 204,
          body: { type: MapCreditType.COAUTHOR },
          token: modToken
        }));

      it('should allow a mod to update the credit even if the map is not in the NEEDS_REVISION state', async () => {
        await prisma.map.update({
          where: { id: map.id },
          data: { status: MapStatus.APPROVED }
        });

        await req.patch({
          url: `maps/credits/${credit.id}`,
          status: 204,
          body: { type: MapCreditType.COAUTHOR },
          token: modToken
        });

        await prisma.map.update({
          where: { id: map.id },
          data: { status: MapStatus.NEEDS_REVISION }
        });
      });

      it('should return 403 if the map was not submitted by that user', () =>
        req.patch({
          url: `maps/credits/${credit.id}`,
          status: 403,
          body: { type: MapCreditType.COAUTHOR },
          token: u2Token
        }));

      it('should return 404 if the map credit was not found', () =>
        req.patch({
          url: `maps/credits/${NULL_ID}`,
          status: 404,
          body: { type: MapCreditType.COAUTHOR },
          token: u1Token
        }));

      it('should 400 when the map credit type is invalid', () =>
        req.patch({
          url: `maps/credits/${credit.id}`,
          status: 400,
          body: { type: 'Author' },
          token: u1Token
        }));

      it('should 400 when the map credit user is invalid', () =>
        req.patch({
          url: `maps/credits/${credit.id}`,
          status: 400,
          body: { userID: 'Momentum Man' },
          token: u1Token
        }));

      it('should 400 when no update data is provided', () =>
        req.patch({
          url: `maps/credits/${credit.id}`,
          status: 400,
          token: u1Token
        }));

      it('should 403 if the map is not in NEEDS_REVISION state', async () => {
        await prisma.map.update({
          where: { id: map.id },
          data: { status: MapStatus.APPROVED }
        });

        await req.patch({
          url: `maps/credits/${credit.id}`,
          status: 403,
          body: { type: MapCreditType.COAUTHOR },
          token: u1Token
        });

        await prisma.map.update({
          where: { id: map.id },
          data: { status: MapStatus.NEEDS_REVISION }
        });
      });

      it('should 403 if the user does not have the mapper role', async () => {
        await prisma.user.update({
          where: { id: u1.id },
          data: { roles: 0 }
        });

        await req.patch({
          url: `maps/credits/${credit.id}`,
          status: 403,
          body: { type: MapCreditType.COAUTHOR },
          token: u1Token
        });

        await prisma.user.update({
          where: { id: u1.id },
          data: { roles: Role.MAPPER }
        });
      });

      it('should 400 if the credited user does not exist', () =>
        req.patch({
          url: `maps/credits/${credit.id}`,
          status: 400,
          body: { userID: NULL_ID },
          token: u1Token
        }));

      it("should update the activities when an author credit's user is changed", async () => {
        await prisma.activity.deleteMany();

        await prisma.activity.create({
          data: { type: ActivityType.MAP_UPLOADED, userID: u1.id, data: map.id }
        });

        await req.patch({
          url: `maps/credits/${credit.id}`,
          status: 204,
          body: { userID: u2.id },
          token: u1Token
        });

        const originalActivity = await prisma.activity.findFirst({
          where: { userID: u1.id, type: ActivityType.MAP_UPLOADED }
        });
        const newActivity = await prisma.activity.findFirst({
          where: { userID: u2.id, type: ActivityType.MAP_UPLOADED }
        });
        expect(originalActivity).toBeNull();
        expect(newActivity).toMatchObject({
          userID: u2.id,
          type: ActivityType.MAP_UPLOADED
        });
      });

      it("should update the activities when an author credit's type is changed", async () => {
        await prisma.activity.deleteMany();

        await prisma.activity.create({
          data: { type: ActivityType.MAP_UPLOADED, userID: u1.id, data: map.id }
        });

        await req.patch({
          url: `maps/credits/${credit.id}`,
          status: 204,
          body: { type: MapCreditType.COAUTHOR },
          token: u1Token
        });

        const originalActivity = await prisma.activity.findFirst({
          where: { userID: u1.id, type: ActivityType.MAP_UPLOADED }
        });
        expect(originalActivity).toBeNull();
      });

      it('should 409 if the user tries to update a credit to be identical to another credit', async () => {
        await prisma.mapCredit.create({
          data: { mapID: map.id, userID: u2.id, type: MapCreditType.COAUTHOR }
        });

        await req.patch({
          url: `maps/credits/${credit.id}`,
          status: 409,
          body: { userID: u2.id, type: MapCreditType.COAUTHOR },
          token: u1Token
        });
      });

      it('should 401 when no access token is provided', () =>
        req.unauthorizedTest('maps/credits/1', 'patch'));
    });

    describe('DELETE', () => {
      let u1, u1Token, u2Token, map, credit, adminToken, modToken;

      beforeAll(async () => {
        [[u1, u1Token], u2Token, adminToken, modToken] = await Promise.all([
          db.createAndLoginUser({ data: { roles: Role.MAPPER } }),
          db.loginNewUser({ data: { roles: Role.MAPPER } }),
          db.loginNewUser({ data: { roles: Role.ADMIN } }),
          db.loginNewUser({ data: { roles: Role.MODERATOR } })
        ]);

        map = await db.createMap({
          status: MapStatus.NEEDS_REVISION,
          submitter: { connect: { id: u1.id } }
        });
      });

      afterAll(() => db.cleanup('user', 'map'));

      beforeEach(
        async () =>
          (credit = await prisma.mapCredit.create({
            data: { mapID: map.id, userID: u1.id, type: MapCreditType.AUTHOR }
          }))
      );

      afterEach(() => prisma.mapCredit.deleteMany());

      it('should delete the specified map credit', async () => {
        await req.del({
          url: `maps/credits/${credit.id}`,
          status: 204,
          token: u1Token
        });

        const deletedCredit = await prisma.mapCredit.findFirst();
        expect(deletedCredit).toBeNull();
      });

      it('should remove the activity when an author credit is deleted', async () => {
        await prisma.activity.create({
          data: { type: ActivityType.MAP_UPLOADED, userID: u1.id, data: map.id }
        });

        await req.del({
          url: `maps/credits/${credit.id}`,
          status: 204,
          token: u1Token
        });

        const activity = await prisma.activity.findFirst();
        expect(activity).toBeNull();
      });

      it('should allow an admin to delete the credit', () =>
        req.del({
          url: `maps/credits/${credit.id}`,
          status: 204,
          token: adminToken
        }));

      it('should allow an admin to delete the credit even if the map is not in the NEEDS_REVISION state', async () => {
        await prisma.map.update({
          where: { id: map.id },
          data: { status: MapStatus.APPROVED }
        });

        await req.del({
          url: `maps/credits/${credit.id}`,
          status: 204,
          token: adminToken
        });

        await prisma.map.update({
          where: { id: map.id },
          data: { status: MapStatus.NEEDS_REVISION }
        });
      });

      it('should allow a mod to delete the credit', () =>
        req.del({
          url: `maps/credits/${credit.id}`,
          status: 204,
          token: modToken
        }));

      it('should allow a mod to delete the credit even if the map is not in the NEEDS_REVISION state', async () => {
        await prisma.map.update({
          where: { id: map.id },
          data: { status: MapStatus.APPROVED }
        });

        await req.del({
          url: `maps/credits/${credit.id}`,
          status: 204,
          token: modToken
        });

        await prisma.map.update({
          where: { id: map.id },
          data: { status: MapStatus.NEEDS_REVISION }
        });
      });

      it('should return 403 if the map was not submitted by that user', () =>
        req.del({
          url: `maps/credits/${credit.id}`,
          status: 403,
          token: u2Token
        }));

      it('should return 403 if the map is not in NEEDS_REVISION state', async () => {
        await prisma.map.update({
          where: { id: map.id },
          data: { status: MapStatus.APPROVED }
        });

        await req.del({
          url: `maps/credits/${credit.id}`,
          status: 403,
          token: u1Token
        });

        await prisma.map.update({
          where: { id: map.id },
          data: { status: MapStatus.NEEDS_REVISION }
        });
      });

      it('should return 403 if the user does not have the mapper role', async () => {
        await prisma.user.update({
          where: { id: u1.id },
          data: { roles: 0 }
        });

        await req.del({
          url: `maps/credits/${credit.id}`,
          status: 403,
          token: u1Token
        });

        await prisma.user.update({
          where: { id: u1.id },
          data: { roles: Role.MAPPER }
        });
      });

      it('should return 404 if the map credit was not found', () =>
        req.del({
          url: `maps/credits/${NULL_ID}`,
          status: 404,
          token: u1Token
        }));

      it('should 401 when no access token is provided', () =>
        req.unauthorizedTest('maps/credits/1', 'del'));
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

      afterAll(() => db.cleanup('user', 'map'));

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

      afterAll(() => db.cleanup('user', 'map'));

      it('should update the thumbnail for a map', () =>
        req.putAttach({
          url: `maps/${map.id}/thumbnail`,
          status: 204,
          file: 'image_jpg.jpg',
          token: token
        }));

      it('should create a thumbnail if one does not exist already', async () => {
        await prisma.mapImage.deleteMany();

        let map = await prisma.map.findFirst();
        expect(map.thumbnailID).toBeNull();

        await req.putAttach({
          url: `maps/${map.id}/thumbnail`,
          status: 204,
          file: 'image_png.png',
          token: token
        });

        map = await prisma.map.findFirst();
        expect(map.thumbnailID).toBeDefined();

        for (const size of ['small', 'medium', 'large'])
          expect(await fs.exists(`img/${map.thumbnailID}-${size}.jpg`)).toBe(
            true
          );
      });

      it('should return a 400 if no thumbnail file is provided', () =>
        req.put({
          url: `maps/${map.id}/thumbnail`,
          status: 400,
          token: token
        }));

      it('should 403 if the user is not the submitter of the map', async () => {
        await prisma.map.update({
          where: { id: map.id },
          data: { submitter: { create: { alias: 'Ron Weasley' } } }
        });

        await req.putAttach({
          url: `maps/${map.id}/thumbnail`,
          status: 403,
          file: 'image_png.png',
          token: token
        });

        await prisma.map.update({
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
        await prisma.map.update({
          where: { id: map.id },
          data: { status: MapStatus.APPROVED }
        });

        await req.putAttach({
          url: `maps/${map.id}/thumbnail`,
          status: 403,
          file: 'image_jpg.jpg',
          token: token
        });

        await prisma.map.update({
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
          db.createMap({
            images: {
              createMany: {
                data: [{}, {}]
              }
            }
          })
        ]);
      });

      afterAll(() => db.cleanup('user', 'map'));

      it('should respond with a list of images', () =>
        req.get({
          url: `maps/${map.id}/images`,
          status: 200,
          validateArray: { type: MapImageDto, length: 2 },
          token: token
        }));

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

      afterAll(() => db.cleanup('user', 'map'));

      afterEach(() =>
        Promise.all([prisma.mapImage.deleteMany(), fs.deleteDirectory('img')])
      );

      it('should create a map image for the specified map', async () => {
        const res = await req.postAttach({
          url: `maps/${map.id}/images`,
          status: 201,
          file: 'image_png.png',
          validate: MapImageDto,
          token: token
        });

        const updatedMap = await prisma.map.findFirst({
          include: { images: true }
        });
        for (const size of ['small', 'medium', 'large']) {
          expect(res.body[size]).toBeDefined();
          expect(
            await fs.exists(`img/${updatedMap.images[0].id}-${size}.jpg`)
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
          url: `maps/${map.id}/upload`,
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
        await prisma.map.update({
          where: { id: map.id },
          data: { submitter: { create: { alias: 'George Weasley' } } }
        });

        await req.postAttach({
          url: `maps/${map.id}/images`,
          status: 403,
          file: 'image_jpg.jpg',
          token: token
        });

        await prisma.map.update({
          where: { id: map.id },
          data: { submitter: { connect: { id: user.id } } }
        });
      });

      it('should 403 if the map is not in the NEEDS_REVISION state', async () => {
        await prisma.map.update({
          where: { id: map.id },
          data: { status: MapStatus.APPROVED }
        });

        await req.postAttach({
          url: `maps/${map.id}/images`,
          status: 403,
          file: 'image_jpg.jpg',
          token: token
        });

        await prisma.map.update({
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

      afterAll(() => db.cleanup('user', 'map'));

      it('should respond with image info', () =>
        req.get({
          url: `maps/images/${map.images[0].id}`,
          status: 200,
          validate: MapImageDto,
          token: token
        }));

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
          await fs.add(`img/${image.id}-${size}.jpg`, fileBuffer);
      });

      afterAll(() =>
        Promise.all([db.cleanup('user', 'map'), fs.deleteDirectory('img')])
      );

      it('should update the map image', async () => {
        await req.putAttach({
          url: `maps/images/${image.id}`,
          status: 204,
          file: 'image_jpg.jpg',
          token: token
        });

        for (const size of ['small', 'medium', 'large']) {
          expect(await fs.exists(`img/${image.id}-${size}.jpg`)).toBe(true);
          expect(await fs.checkHash(`img/${image.id}-${size}.jpg`, hash)).toBe(
            false
          );
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
        await prisma.map.update({
          where: { id: map.id },
          data: { submitter: { create: { alias: 'Fred Weasley' } } }
        });

        await req.putAttach({
          url: `maps/images/${image.id}`,
          status: 403,
          file: 'image_png.png',
          token: token
        });

        await prisma.map.update({
          where: { id: map.id },
          data: { submitter: { connect: { id: user.id } } }
        });
      });

      it('should 403 if the map is not in the NEEDS_REVISION state', async () => {
        await prisma.map.update({
          where: { id: map.id },
          data: { status: MapStatus.APPROVED }
        });

        await req.putAttach({
          url: `maps/images/${image.id}`,
          status: 403,
          file: 'image_png.png',
          token: token
        });

        await prisma.map.update({
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
          await fs.add(`img/${image.id}-${size}.jpg`, fileBuffer);
      });

      afterAll(async () => {
        await db.cleanup('user', 'map', 'run');
        await fs.deleteDirectory('img');
      });

      it('should delete the map image', async () => {
        for (const size of ['small', 'medium', 'large'])
          expect(await fs.exists(`img/${image.id}-${size}.jpg`)).toBe(true);

        await req.del({
          url: `maps/images/${image.id}`,
          status: 204,
          token: token
        });

        const updatedMap = await prisma.map.findFirst({
          include: { images: true }
        });

        expect(updatedMap.images).toHaveLength(0);

        for (const size of ['small', 'medium', 'large'])
          expect(await fs.exists(`img/${image.id}-${size}.jpg`)).toBe(false);

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
        await prisma.map.update({
          where: { id: map.id },
          data: { submitter: { create: { alias: 'Bill Weasley' } } }
        });

        await req.del({
          url: `maps/images/${image.id}`,
          status: 403,
          token: token
        });

        await prisma.map.update({
          where: { id: map.id },
          data: { submitter: { connect: { id: user.id } } }
        });
      });

      it('should 403 if the map is not in the NEEDS_REVISION state', async () => {
        await prisma.map.update({
          where: { id: map.id },
          data: { status: MapStatus.APPROVED }
        });

        await req.del({
          url: `maps/images/${image.id}`,
          status: 403,
          token: token
        });

        await prisma.map.update({
          where: { id: map.id },
          data: { status: MapStatus.NEEDS_REVISION }
        });
      });

      it('should 401 when no access token is provided', () =>
        req.unauthorizedTest('maps/images/1', 'del'));
    });
  });

  describe('maps/{mapID}/runs', () => {
    describe('GET', () => {
      let u1, u1Token, u2, u3, map, nonPbRun;
      beforeAll(async () => {
        [[u1, u1Token], u2, u3, map] = await Promise.all([
          db.createAndLoginUser(),
          db.createUser(),
          db.createUser(),
          db.createMap()
        ]);
        // Flags are weird currently, seems like they're supposed to be
        // bitflags but aren't treated as that, probably changing in 0.10.0.
        await Promise.all([
          db.createRunAndRankForMap({
            map: map,
            user: u1,
            rank: 1,
            ticks: 10,
            flags: 1,
            createdAt: dateOffset(3)
          }),
          db.createRunAndRankForMap({
            map: map,
            user: u2,
            rank: 3,
            ticks: 20,
            flags: 1,
            createdAt: dateOffset(2)
          }),
          db.createRunAndRankForMap({
            map: map,
            user: u3,
            rank: 2,
            ticks: 30,
            flags: 2,
            createdAt: dateOffset(1)
          }),
          (nonPbRun = await db.createRun({
            map: map,
            user: u1,
            ticks: 40,
            flags: 1,
            createdAt: dateOffset(0)
          }))
        ]);
      });

      afterAll(() => db.cleanup('user', 'map', 'run'));

      it('should return run files for the specified map', () =>
        req.get({
          url: `maps/${map.id}/runs`,
          status: 200,
          validatePaged: { type: RunDto, count: 4 },
          token: u1Token
        }));

      it('should respond with filtered map data using the take parameter', () =>
        req.takeTest({
          url: `maps/${map.id}/runs`,
          validate: RunDto,
          token: u1Token
        }));

      it('should respond with filtered map data using the skip parameter', () =>
        req.skipTest({
          url: `maps/${map.id}/runs`,
          validate: RunDto,
          token: u1Token
        }));

      it('should respond with a list of runs filtered by userID parameter', async () => {
        const res = await req.get({
          url: `maps/${map.id}/runs`,
          status: 200,
          query: { userID: u2.id },
          validatePaged: { type: RunDto, count: 1 },
          token: u1Token
        });

        expect(res.body.data[0].userID).toBe(u2.id);
      });

      it('should respond with a list of runs filtered by a list of user ids', () =>
        req.get({
          url: `maps/${map.id}/runs`,
          status: 200,
          query: { userIDs: `${u2.id},${u3.id}` },
          validatePaged: { type: RunDto, count: 2 },
          token: u1Token
        }));

      it('should respond with a list of runs filtered by flags', async () =>
        req.get({
          url: `maps/${map.id}/runs`,
          status: 200,
          query: { flags: 1 },
          validatePaged: { type: RunDto, count: 3 },
          token: u1Token
        }));

      it('should respond with a list of runs with the map include', () =>
        req.expandTest({
          url: `maps/${map.id}/runs`,
          validate: RunDto,
          expand: 'map',
          paged: true,
          token: u1Token
        }));

      it('should respond with a list of runs with the rank include', () =>
        req.expandTest({
          url: `maps/${map.id}/runs`,
          validate: RunDto,
          expand: 'rank',
          paged: true,
          token: u1Token,
          filter: (x) => x.id !== Number(nonPbRun.id)
        }));

      it('should respond with a list of runs with the zoneStats include', () =>
        req.expandTest({
          url: `maps/${map.id}/runs`,
          validate: RunDto,
          expand: 'zoneStats',
          paged: true,
          token: u1Token
        }));

      it('should respond with a list of runs with the overallStats include', () =>
        req.expandTest({
          url: `maps/${map.id}/runs`,
          validate: RunDto,
          expand: 'overallStats',
          paged: true,
          token: u1Token
        }));

      it('should respond with a list of runs with the mapWithInfo include', async () => {
        const res = await req.get({
          url: `maps/${map.id}/runs`,
          status: 200,
          validatePaged: RunDto,
          query: { expand: 'mapWithInfo' },
          token: u1Token
        });

        for (const x of res.body.data) expect(x.map).toHaveProperty('info');
      });

      it('should respond with a list of runs that are personal bests', () =>
        req.get({
          url: `maps/${map.id}/runs`,
          status: 200,
          query: { isPB: true, expand: 'rank' },
          validatePaged: { type: RunDto, totalCount: 3, returnCount: 3 },
          token: u1Token
        }));

      it('should respond with a list of runs sorted by date', () =>
        req.sortByDateTest({
          url: `maps/${map.id}/runs`,
          query: { order: 'date' },
          validate: RunDto,
          token: u1Token
        }));

      it('should respond with a list of runs sorted by time', () =>
        req.sortTest({
          url: `maps/${map.id}/runs`,
          query: { order: 'time' },
          sortFn: (n1, n2) => n1.ticks - n2.ticks,
          validate: RunDto,
          token: u1Token
        }));

      it('should 401 when no access token is provided', () =>
        req.unauthorizedTest('maps/1/runs', 'get'));
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
            createdAt: dateOffset(3)
          }),
          db.createRunAndRankForMap({
            map: map,
            user: u2,
            rank: 2,
            ticks: 20,
            flags: 1,
            createdAt: dateOffset(2)
          }),
          db.createRunAndRankForMap({
            map: map,
            user: u3,
            rank: 3,
            ticks: 30,
            flags: 2,
            createdAt: dateOffset(1)
          })
        ]);
      });

      afterAll(() => db.cleanup('user', 'map', 'run'));

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
            prisma.map.create({
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

      afterAll(() => db.cleanup('user', 'map'));
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

      afterAll(() => db.cleanup('user', 'map', 'run'));

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
        await Promise.all([
          friends.map((user, i) =>
            db.createRunAndRankForMap({
              map: map,
              user: user,
              rank: i + 2,
              ticks: (i + 2) * 1000
            })
          ),
          db.createRunAndRankForMap({ user: user, map: map, ticks: 1, rank: 1 })
        ]);
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
          token: token,
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
          token: token
        });
      });

      it('should return 404 for a nonexistent map', () =>
        req.get({
          url: `maps/${NULL_ID}/ranks/friends`,
          status: 404,
          token: token
        }));

      it('should 401 when no access token is provided', () =>
        req.unauthorizedTest('maps/1/ranks/friends', 'get'));

      afterAll(() => db.cleanup('user', 'map', 'run'));
    });
  });
});
