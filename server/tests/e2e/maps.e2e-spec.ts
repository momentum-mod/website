import { readFileSync } from 'node:fs';
import { PrismaService } from '@modules/repo/prisma.service';
import { MapStatus, MapCreditType, MapType } from '@common/enums/map.enum';
import { MapDto } from '@common/dto/map/map.dto';
import { del, get, getNoContent, patch, post, postAttach, put, putAttach } from '../util/request-handlers.util';
import { MapInfoDto } from '@common/dto/map/map-info.dto';
import { MapCreditDto } from '@common/dto/map/map-credit.dto';
import { RunDto } from '@common/dto/run/run.dto';
import { UserMapRankDto } from '@common/dto/run/user-map-rank.dto';
import { ActivityTypes } from '@common/enums/activity.enum';
import axios from 'axios';
import { UserDto } from '@common/dto/user/user.dto';
import { MapTrackDto } from '@common/dto/map/map-track.dto';
import {
    expandTest,
    searchTest,
    skipTest,
    sortByDateTest,
    sortTest,
    takeTest,
    unauthorizedTest
} from '@tests/util/generic-e2e-tests.util';
import { MapImageDto } from '@common/dto/map/map-image.dto';
import {
    createAndLoginUser,
    dateOffset,
    createMap,
    createMaps,
    createRun,
    createRunAndUmrForMap,
    createUser,
    loginNewUser,
    NULL_ID,
    cleanup
} from '@tests/util/db.util';
import { FileStoreHandler } from '@tests/util/s3.util';
import { createSha1Hash } from '@tests/util/crypto.util';
import { login } from '@tests/util/auth.util';

const prisma: PrismaService = global.prisma;
const fileStore = new FileStoreHandler();

describe('Maps', () => {
    describe('maps', () => {
        describe('GET', () => {
            let u1, u1Token, u2, m1, m2, m3, m4;

            beforeAll(
                async () =>
                    ([[u1, u1Token], [u2], [m1, m2, m3, m4]] = await Promise.all([
                        createAndLoginUser(),
                        createAndLoginUser(),
                        createMaps(4)
                    ]))
            );

            afterAll(() => cleanup('user', 'map', 'run'));

            it('should respond with map data', async () => {
                const res = await get({
                    url: 'maps',
                    status: 200,
                    validatePaged: { type: MapDto, count: 4 },
                    token: u1Token
                });

                for (const item of res.body.response) {
                    expect(item).toHaveProperty('mainTrack');
                    expect(item).toHaveProperty('info');
                }
            });

            it('should be ordered by date', () => sortByDateTest({ url: 'maps', validate: MapDto, token: u1Token }));

            it('should respond with filtered map data using the take parameter', () =>
                takeTest({ url: 'maps', validate: MapDto, token: u1Token }));

            it('should respond with filtered map data using the skip parameter', () =>
                skipTest({ url: 'maps', validate: MapDto, token: u1Token }));

            it('should respond with filtered map data using the search parameter', async () => {
                m2 = await prisma.map.update({ where: { id: m2.id }, data: { name: 'aaaaa' } });

                await searchTest({
                    url: 'maps',
                    token: u1Token,
                    searchMethod: 'contains',
                    searchString: 'aaaaa',
                    searchPropertyName: 'name',
                    validate: { type: MapDto, count: 1 }
                });
            });

            it('should respond with filtered map data using the submitter id parameter', async () => {
                await prisma.map.update({ where: { id: m2.id }, data: { submitterID: u1.id } });

                const res = await get({
                    url: 'maps',
                    status: 200,
                    query: { submitterID: u1.id },
                    validatePaged: { type: MapDto, count: 1 },
                    token: u1Token
                });

                expect(res.body.response[0]).toMatchObject({ submitterID: u1.id, id: m2.id });
            });

            it('should respond with filtered map data based on the map type', async () => {
                const newType = MapType.BHOP;
                await prisma.map.update({ where: { id: m2.id }, data: { type: newType } });

                const res = await get({
                    url: 'maps',
                    status: 200,
                    query: { type: newType },
                    validatePaged: { type: MapDto, count: 1 },
                    token: u1Token
                });

                expect(res.body.response[0].type).toBe(newType);
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

                await expandTest({ url: 'maps', expand: 'credits', paged: true, validate: MapDto, token: u1Token });
            });

            it('should respond with expanded map data using the thumbnail expand parameter', () =>
                expandTest({ url: 'maps', expand: 'thumbnail', paged: true, validate: MapDto, token: u1Token }));

            it("should respond with expanded map data if the map is in the logged in user's library when using the inLibrary expansion", async () => {
                await prisma.mapLibraryEntry.create({ data: { userID: u1.id, mapID: m1.id } });

                await expandTest({
                    url: 'maps',
                    expand: 'inLibrary',
                    paged: true,
                    validate: MapDto,
                    expectedPropertyName: 'libraryEntries',
                    token: u1Token
                });
            });

            it("should respond with expanded map data if the map is in the logged in user's library when using the inFavorites expansion", async () => {
                await prisma.mapFavorite.create({ data: { userID: u1.id, mapID: m1.id } });

                await expandTest({
                    url: 'maps',
                    expand: 'inFavorites',
                    paged: true,
                    validate: MapDto,
                    expectedPropertyName: 'favorites',
                    token: u1Token
                });
            });

            it("should respond with the map's WR when using the worldRecord expansion", async () => {
                await createRunAndUmrForMap({ map: m1, user: u2, ticks: 5, rank: 1 });

                const res = await get({
                    url: 'maps',
                    status: 200,
                    validatePaged: MapDto,
                    query: { expand: 'worldRecord' },
                    token: u1Token
                });

                const map = res.body.response.find((map) => map.id === m1.id);
                expect(map).toMatchObject({ worldRecord: { rank: 1, user: { id: u2.id } } });
            });

            it("should respond with the logged in user's PB when using the personalBest expansion", async () => {
                await createRunAndUmrForMap({ map: m1, user: u1, ticks: 10, rank: 2 });

                const res = await get({
                    url: 'maps',
                    status: 200,
                    validatePaged: MapDto,
                    query: { expand: 'personalBest' },
                    token: u1Token
                });

                const map = res.body.response.find((map) => map.id === m1.id);
                expect(map).toMatchObject({ personalBest: { rank: 2, user: { id: u1.id } } });
            });

            it('should respond properly with both personalBest and worldRecord expansions', async () => {
                const res = await get({
                    url: 'maps',
                    status: 200,
                    validatePaged: MapDto,
                    query: { expand: 'worldRecord,personalBest' },
                    token: u1Token
                });

                const map = res.body.response.find((map) => map.id === m1.id);
                expect(map).toMatchObject({
                    worldRecord: { rank: 1, user: { id: u2.id } },
                    personalBest: { rank: 2, user: { id: u1.id } }
                });
            });

            it('should respond with filtered maps when using the difficultyLow filter', async () => {
                await Promise.all([
                    prisma.map.update({ where: { id: m1.id }, data: { mainTrack: { update: { difficulty: 1 } } } }),
                    prisma.map.update({ where: { id: m2.id }, data: { mainTrack: { update: { difficulty: 3 } } } }),
                    prisma.map.update({ where: { id: m3.id }, data: { mainTrack: { update: { difficulty: 3 } } } }),
                    prisma.map.update({ where: { id: m4.id }, data: { mainTrack: { update: { difficulty: 5 } } } })
                ]);

                await get({
                    url: 'maps',
                    status: 200,
                    query: { difficultyLow: 2 },
                    token: u1Token,
                    validatePaged: { type: MapDto, count: 3 }
                });
            });

            it('should respond with filtered maps when using the difficultyHigh filter', () =>
                get({
                    url: 'maps',
                    status: 200,
                    query: { difficultyHigh: 4 },
                    token: u1Token,
                    validatePaged: { type: MapDto, count: 3 }
                }));

            it('should respond with filtered maps when using both the difficultyLow and difficultyHigh filter', () =>
                get({
                    url: 'maps',
                    status: 200,
                    query: { difficultyLow: 2, difficultyHigh: 4 },
                    token: u1Token,
                    validatePaged: { type: MapDto, count: 2 }
                }));

            it('should respond with filtered maps when the isLinear filter', async () => {
                await Promise.all([
                    prisma.map.update({ where: { id: m1.id }, data: { mainTrack: { update: { isLinear: false } } } }),
                    prisma.map.update({ where: { id: m2.id }, data: { mainTrack: { update: { isLinear: false } } } })
                ]);

                const res = await get({
                    url: 'maps',
                    status: 200,
                    query: { isLinear: false },
                    validatePaged: { type: MapDto, count: 2 },
                    token: u1Token
                });

                for (const r of res.body.response) expect(r.mainTrack.isLinear).toBe(false);

                const res2 = await get({
                    url: 'maps',
                    status: 200,
                    query: { isLinear: true },
                    validatePaged: { type: MapDto, count: 2 },
                    token: u1Token
                });

                expect(res2.body.response[0].mainTrack.isLinear).toBe(true);
            });

            it('should respond with filtered maps when using both the difficultyLow, difficultyHigh and isLinear filters', async () => {
                const res = await get({
                    url: 'maps',
                    status: 200,
                    query: { difficultyLow: 2, difficultyHigh: 4, isLinear: false },
                    token: u1Token
                });

                expect(res.body.totalCount).toBe(1);
                expect(res.body.returnCount).toBe(1);
            });

            unauthorizedTest('maps', get);
        });

        describe('POST', () => {
            let user, token, createMapObject;

            beforeAll(async () => {
                [user, token] = await createAndLoginUser({ data: { roles: { create: { mapper: true } } } });

                createMapObject = {
                    name: 'test_map',
                    type: MapType.SURF,
                    info: { description: 'mamp', numTracks: 1, creationDate: '2022-07-07T18:33:33.000Z' },
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
                                    points: '{"p1": "0", "p2": "0"}',
                                    properties: {
                                        properties: '{}'
                                    }
                                }
                            ]
                        }))
                    }))
                };
            });

            afterEach(() => () => cleanup('map'));
            afterAll(() => () => cleanup('user'));

            describe('should create a new map', () => {
                let res, createdMap;

                beforeAll(async () => {
                    res = await post({ url: 'maps', status: 204, body: createMapObject, token: token });
                    createdMap = await prisma.map.findFirst({
                        include: {
                            info: true,
                            stats: true,
                            credits: true,
                            mainTrack: true,
                            tracks: { include: { zones: { include: { triggers: { include: { properties: true } } } } } }
                        }
                    });
                });

                it('should create a map within the database', () => {
                    expect(createdMap.name).toBe('test_map');
                    expect(createdMap.info.description).toBe('mamp');
                    expect(createdMap.info.numTracks).toBe(1);
                    expect(createdMap.info.creationDate.toJSON()).toBe('2022-07-07T18:33:33.000Z');
                    expect(createdMap.submitterID).toBe(user.id);
                    expect(createdMap.credits[0].userID).toBe(user.id);
                    expect(createdMap.credits[0].type).toBe(MapCreditType.AUTHOR);
                    expect(createdMap.tracks).toHaveLength(2);
                    expect(createdMap.mainTrack.id).toBe(createdMap.tracks.find((track) => track.trackNum === 0).id);

                    for (const track of createdMap.tracks) {
                        expect(track.trackNum).toBeLessThanOrEqual(1);
                        for (const zone of track.zones) {
                            expect(zone.zoneNum).toBeLessThanOrEqual(10);
                            for (const trigger of zone.triggers) {
                                expect(trigger.points).toBe('{"p1": "0", "p2": "0"}');
                                expect(trigger.properties.properties).toBe('{}');
                            }
                        }
                    }
                });

                it('should create map uploaded activities for the map authors', async () => {
                    const activity = await prisma.activity.findFirst();

                    expect(activity.type).toBe(ActivityTypes.MAP_UPLOADED);
                    expect(activity.data).toBe(BigInt(createdMap.id));
                });

                it('set the Location property in the response header on creation', async () => {
                    expect(res.get('Location')).toBe(`api/v1/maps/${createdMap.id}/upload`);
                });
            });

            it('should 400 if the map does not have any tracks', () =>
                post({ url: 'maps', status: 400, body: { ...createMapObject, tracks: [] }, token: token }));

            it('should 400 if a map track has less than 2 zones', () =>
                post({
                    url: 'maps',
                    status: 400,
                    body: { createMapObject, tracks: [{ createMapObject, zones: createMapObject.tracks[0].zones[0] }] },
                    token: token
                }));

            it('should 409 if a map with the same name exists', async () => {
                const name = 'ron_weasley';

                await createMap({ name: name });

                await post({ url: 'maps', status: 409, body: { ...createMapObject, name: name }, token: token });
            });

            it('should 409 if the submitter already have 5 or more pending maps', async () => {
                await createMaps(5, { statusFlag: MapStatus.PENDING, submitter: { connect: { id: user.id } } });

                await post({ url: 'maps', status: 409, body: createMapObject, token: token });
            });

            it('should 403 when the user does not have the mapper role', async () => {
                await prisma.user.update({ where: { id: user.id }, data: { roles: { update: { mapper: false } } } });

                await post({ url: 'maps', status: 403, body: createMapObject, token: token });
            });

            unauthorizedTest('maps', post);
        });
    });

    describe('maps/{mapID}/upload', () => {
        let u1, u1Token, u2Token, map;

        beforeAll(async () => {
            [[u1, u1Token], u2Token] = await Promise.all([
                createAndLoginUser({ data: { roles: { create: { mapper: true } } } }),
                loginNewUser()
            ]);
            map = await createMap({ statusFlag: MapStatus.NEEDS_REVISION, submitter: { connect: { id: u1.id } } });
        });

        afterAll(() => cleanup('user', 'map'));

        describe('GET', () => {
            it('should set the response header location to the map upload endpoint', async () => {
                const res = await getNoContent({ url: `maps/${map.id}/upload`, status: 204, token: u1Token });

                expect(res.get('Location')).toBe(`api/v1/maps/${map.id}/upload`);
            });

            it('should 403 when the submitterID does not match the userID', async () => {
                const u2Token = await loginNewUser();

                await get({ url: `maps/${map.id}/upload`, status: 403, token: u2Token });
            });

            it('should 403 when the map is not accepting uploads', async () => {
                await prisma.map.update({ where: { id: map.id }, data: { statusFlag: MapStatus.REJECTED } });

                await get({ url: `maps/${map.id}/upload`, status: 403, token: u2Token });

                await prisma.map.update({ where: { id: map.id }, data: { statusFlag: MapStatus.NEEDS_REVISION } });
            });

            unauthorizedTest('maps/1/upload', get);
        });

        describe('POST', () => {
            it('should upload the map file', async () => {
                const inBuffer = readFileSync('./tests/files/map.bsp');
                const inHash = createSha1Hash(inBuffer);

                const res = await postAttach({
                    url: `maps/${map.id}/upload`,
                    status: 201,
                    file: 'map.bsp',
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

                await fileStore.delete(`maps/${map.name}.bsp`);
            });

            it('should 400 when no map file is provided', () =>
                post({ url: `maps/${map.id}/upload`, status: 400, token: u1Token }));

            it('should 403 when the submitterID does not match the userID', () =>
                postAttach({ url: `maps/${map.id}/upload`, status: 403, file: 'map.bsp', token: u2Token }));

            it('should 403 when the map is not accepting uploads', async () => {
                await prisma.map.update({ where: { id: map.id }, data: { statusFlag: MapStatus.REJECTED } });

                await postAttach({
                    url: `maps/${map.id}/upload`,
                    status: 403,
                    file: 'map.bsp',
                    token: u1Token
                });
            });

            unauthorizedTest('maps/1/upload', post);
        });
    });

    describe('The Big Chungie Create, Upload then Download Test', () => {
        afterAll(() => cleanup('user', 'map'));

        it('should successfully create a map, upload it to the returned location, then download it', async () => {
            const [user, token] = await createAndLoginUser({ data: { roles: { create: { mapper: true } } } });

            const res = await post({
                url: 'maps',
                status: 204,
                body: {
                    name: 'test_map',
                    type: MapType.SURF,
                    info: { description: 'mamp', numTracks: 1, creationDate: '2022-07-07T18:33:33.000Z' },
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
                                    points: '{"p1": "0", "p2": "0"}',
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

            const uploadURL = res.get('Location').replace('api/v1/', '');

            const res2 = await postAttach({ url: uploadURL, status: 201, file: 'map.bsp', token: token });

            const outBuffer = await axios
                .get(res2.body.downloadURL, { responseType: 'arraybuffer' })
                .then((res) => Buffer.from(res.data, 'binary'));
            const outHash = createSha1Hash(outBuffer);

            expect(inHash).toBe(outHash);

            await fileStore.delete('maps/test_map.bsp');
        });
    });

    describe('maps/{mapID}/download', () => {
        describe('GET', () => {
            let token, map, file;

            beforeAll(async () => ([token, map] = await Promise.all([loginNewUser(), createMap()])));

            afterAll(() => cleanup('user', 'map'));

            describe('should download a map', () => {
                it("should respond with the map's BSP file", async () => {
                    const key = `maps/${map.name}.bsp`;
                    file = readFileSync(__dirname + '/../files/map.bsp');

                    await fileStore.add(key, file);

                    const res = await get({
                        url: `maps/${map.id}/download`,
                        status: 200,
                        token: token,
                        contentType: 'octet-stream'
                    });

                    const inHash = createSha1Hash(file);
                    const outHash = createSha1Hash(res.body);
                    expect(inHash).toEqual(outHash);

                    await fileStore.delete(key);
                });

                it('should update the map download stats', async () => {
                    const stats = await prisma.mapStats.findFirst({ where: { mapID: map.id } });

                    expect(stats.downloads).toBe(1);
                });
            });

            it("should 404 when the map's BSP file is not found", async () => {
                const map2 = await createMap();

                await get({
                    url: `maps/${map2.id}/download`,
                    status: 404,
                    token: token,
                    contentType: 'json'
                });
            });

            it('should 404 when the map is not found', () =>
                get({
                    url: `maps/${NULL_ID}/download`,
                    status: 404,
                    token: token,
                    contentType: 'json'
                }));

            unauthorizedTest('maps/1/download', get);
        });
    });

    describe('maps/{mapID}', () => {
        describe('GET', () => {
            let u1, u1Token, u2, map;

            beforeAll(
                async () =>
                    ([[u1, u1Token], u2, map] = await Promise.all([createAndLoginUser(), createUser(), createMap()]))
            );

            afterAll(() => cleanup('user', 'map', 'run'));

            it('should respond with map data', () =>
                get({ url: `maps/${map.id}`, status: 200, validate: MapDto, token: u1Token }));

            it('should respond with expanded map data using the credits expand parameter', async () => {
                await prisma.mapCredit.create({ data: { mapID: map.id, userID: u1.id, type: MapCreditType.AUTHOR } });

                await expandTest({ url: `maps/${map.id}`, validate: MapDto, expand: 'credits', token: u1Token });
            });

            it('should respond with expanded map data using the info expand parameter', () =>
                expandTest({ url: `maps/${map.id}`, validate: MapDto, expand: 'info', token: u1Token }));

            it('should respond with expanded map data using the submitter expand parameter', async () => {
                await prisma.map.update({ where: { id: map.id }, data: { submitterID: u1.id } });

                await expandTest({ url: `maps/${map.id}`, validate: MapDto, expand: 'submitter', token: u1Token });
            });

            it('should respond with expanded map data using the images expand parameter', () =>
                expandTest({ url: `maps/${map.id}`, validate: MapDto, expand: 'images', token: u1Token }));

            it('should respond with expanded map data using the thumbnail expand parameter', () =>
                expandTest({ url: `maps/${map.id}`, validate: MapDto, expand: 'thumbnail', token: u1Token }));

            it('should respond with expanded map data using the stats expand info parameter', () =>
                expandTest({ url: `maps/${map.id}`, validate: MapDto, expand: 'stats', token: u1Token }));

            it('should respond with expanded map data using the tracks expand info parameter', () =>
                expandTest({ url: `maps/${map.id}`, validate: MapDto, expand: 'tracks', token: u1Token }));

            it("should respond with expanded map data if the map is in the logged in user's library when using the inLibrary expansion", async () => {
                await prisma.mapLibraryEntry.create({ data: { userID: u1.id, mapID: map.id } });

                await expandTest({
                    url: `maps/${map.id}`,
                    validate: MapDto,
                    expand: 'inLibrary',
                    expectedPropertyName: 'libraryEntries',
                    token: u1Token
                });
            });

            it("should respond with expanded map data if the map is in the logged in user's library when using the inFavorites expansion", async () => {
                await prisma.mapFavorite.create({ data: { userID: u1.id, mapID: map.id } });

                await expandTest({
                    url: `maps/${map.id}`,
                    validate: MapDto,
                    expand: 'inFavorites',
                    expectedPropertyName: 'favorites',
                    token: u1Token
                });
            });

            it("should respond with the map's WR when using the worldRecord expansion", async () => {
                await createRunAndUmrForMap({ map: map, user: u2, ticks: 5, rank: 1 });

                const res = await get({
                    url: `maps/${map.id}`,
                    status: 200,
                    query: { expand: 'worldRecord' },
                    token: u1Token
                });

                expect(res.body).toMatchObject({ worldRecord: { rank: 1, user: { id: u2.id } } });
            });

            it("should respond with the logged in user's PB when using the personalBest expansion", async () => {
                await createRunAndUmrForMap({ map: map, user: u1, ticks: 10, rank: 2 });

                const res = await get({
                    url: `maps/${map.id}`,
                    status: 200,
                    query: { expand: 'personalBest' },
                    token: u1Token
                });

                expect(res.body).toMatchObject({ personalBest: { rank: 2, user: { id: u1.id } } });
            });

            it('should respond properly with both personalBest and worldRecord expansions', async () => {
                const res = await get({
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
                get({ url: `maps/${NULL_ID}`, status: 404, token: u1Token }));

            unauthorizedTest('maps/1', get);
        });

        describe('PATCH', () => {
            let user, token;

            beforeAll(
                async () =>
                    ([user, token] = await createAndLoginUser({ data: { roles: { create: { mapper: true } } } }))
            );

            afterAll(() => cleanup('user'));
            afterEach(() => cleanup('map', 'activity'));

            it('should allow a mapper set their map status', async () => {
                const map = await createMap({
                    statusFlag: MapStatus.NEEDS_REVISION,
                    submitter: { connect: { id: user.id } }
                });

                const newStatus = MapStatus.READY_FOR_RELEASE;
                await patch({ url: `maps/${map.id}`, status: 204, body: { statusFlag: newStatus }, token: token });

                const updatedMap = await prisma.map.findUnique({ where: { id: map.id } });
                expect(updatedMap.statusFlag).toEqual(newStatus);
            });

            it('should create activities if the map was approved', async () => {
                const map = await createMap({
                    statusFlag: MapStatus.PENDING,
                    submitter: { connect: { id: user.id } },
                    credits: { create: { type: MapCreditType.AUTHOR, userID: user.id } }
                });

                await patch({
                    url: `maps/${map.id}`,
                    status: 204,
                    body: { statusFlag: MapStatus.APPROVED },
                    token: token
                });

                const activities = await prisma.activity.findFirst();

                expect(activities).toMatchObject({
                    type: ActivityTypes.MAP_APPROVED,
                    userID: user.id,
                    data: BigInt(map.id)
                });
            });

            it('should return 400 if the status flag is invalid', async () => {
                const map = await createMap({ submitter: { connect: { id: user.id } } });

                await patch({ url: `maps/${map.id}`, status: 400, body: { statusFlag: 3000 }, token: token });
            });

            it("should return 400 if the map's status is rejected", async () => {
                const map = await createMap({
                    statusFlag: MapStatus.REJECTED,
                    submitter: { connect: { id: user.id } }
                });

                await patch({
                    url: `maps/${map.id}`,
                    status: 400,
                    body: { statusFlag: MapStatus.READY_FOR_RELEASE },
                    token: token
                });
            });

            it('should return 403 if the map was not submitted by that user', async () => {
                const map = await createMap({ statusFlag: MapStatus.NEEDS_REVISION });

                await patch({
                    url: `maps/${map.id}`,
                    status: 403,
                    body: { statusFlag: MapStatus.READY_FOR_RELEASE },
                    token: token
                });
            });

            it('should return 403 if the user does not have the mapper role', async () => {
                const [u2, u2Token] = await createAndLoginUser();
                const map2 = await createMap({ submitter: { connect: { id: u2.id } } });

                await patch({
                    url: `maps/${map2.id}`,
                    status: 403,
                    body: { statusFlag: MapStatus.READY_FOR_RELEASE },
                    token: u2Token
                });
            });

            it('should 404 when the map is not found', () =>
                patch({
                    url: `maps/${NULL_ID}`,
                    status: 404,
                    body: { statusFlag: MapStatus.READY_FOR_RELEASE },
                    token: token
                }));

            unauthorizedTest('maps/1', patch);
        });
    });

    describe('maps/{mapID}/info', () => {
        describe('GET', () => {
            let token, map;

            beforeAll(async () => ([token, map] = await Promise.all([loginNewUser(), createMap()])));

            afterAll(() => cleanup('user', 'map'));

            it('should respond with map info', () =>
                get({ url: `maps/${map.id}/info`, status: 200, validate: MapInfoDto, token: token }));

            it('should return 404 if the map is not found', () =>
                get({ url: `maps/${NULL_ID}/info`, status: 404, token: token }));

            unauthorizedTest('maps/1/info', get);
        });

        describe('PATCH', () => {
            let user, token, map;

            beforeAll(async () => {
                [user, token] = await createAndLoginUser({ data: { roles: { create: { mapper: true } } } });
                map = await createMap({
                    statusFlag: MapStatus.NEEDS_REVISION,
                    submitter: { connect: { id: user.id } }
                });
            });

            afterAll(() => cleanup('user', 'map'));

            const infoUpdate = {
                description: 'This map is EXTREME',
                youtubeID: '70vwJy1dQ0c',
                creationDate: new Date('1999-02-06')
            };

            it('should allow the map submitter update the map info', async () => {
                await patch({ url: `maps/${map.id}/info`, status: 204, body: infoUpdate, token: token });

                const updatedInfo = await prisma.mapInfo.findUnique({ where: { mapID: map.id } });

                expect(updatedInfo).toMatchObject(infoUpdate);
            });

            it('should 400 if the date is invalid', () =>
                patch({
                    url: `maps/${map.id}/info`,
                    status: 400,
                    body: { creationDate: 'its chewsday init' },
                    token: token
                }));

            it('should return 400 if the youtube ID is invalid', () =>
                patch({
                    url: `maps/${map.id}/info`,
                    status: 400,
                    body: { youtubeID: 'https://www.myspace.com/watch?v=70vwJy1dQ0c' },
                    token: token
                }));

            it('should return 400 if no update data is provided', () =>
                patch({ url: `maps/${map.id}/info`, status: 400, token: token }));

            it('should return 404 if the map does not exist', () =>
                patch({ url: `maps/${NULL_ID}/info`, status: 404, body: infoUpdate, token: token }));

            it('should return 403 if the map was not submitted by that user', async () => {
                const [_, u2Token] = await createAndLoginUser({ data: { roles: { create: { mapper: true } } } });

                await patch({ url: `maps/${map.id}/info`, status: 403, body: infoUpdate, token: u2Token });
            });

            it('should return 403 if the map is not in NEEDS_REVISION state', async () => {
                const map2 = await createMap({
                    statusFlag: MapStatus.APPROVED,
                    submitter: { connect: { id: user.id } }
                });

                await patch({ url: `maps/${map2.id}/info`, status: 403, body: infoUpdate, token: token });
            });

            it('should return 403 if the user does not have the mapper role', async () => {
                await prisma.user.update({ where: { id: user.id }, data: { roles: { update: { mapper: false } } } });

                await patch({ url: `maps/${map.id}/info`, status: 403, body: infoUpdate, token: token });
            });

            unauthorizedTest('maps/1/info', patch);
        });
    });

    describe('maps/{mapID}/credits', () => {
        describe('GET', () => {
            let u1, u1Token, u2, map;

            beforeAll(async () => {
                [[u1, u1Token], u2] = await Promise.all([createAndLoginUser(), createUser()]);
                map = await createMap({
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

            afterAll(() => cleanup('user', 'map'));

            it('should respond with the specified maps credits', async () => {
                const res = await get({ url: `maps/${map.id}/credits`, status: 200, token: u1Token });

                for (const credit of res.body) expect(credit).toBeValidDto(MapCreditDto);
                expect(res.body).toHaveLength(2);
            });

            it('should respond with the specified maps credits with the user expand parameter', async () => {
                const res = await get({
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

            it('should return 404 when no map credits found', async () => {
                const map = await createMap();

                await get({ url: `maps/${map.id}/credits`, status: 404, token: u1Token });
            });

            it('should return 404 when the map does not exist', () =>
                get({ url: `maps/${NULL_ID}/credits`, status: 404, token: u1Token }));

            unauthorizedTest('maps/1/credits', get);
        });

        describe('POST', () => {
            let u1, u1Token, u2, u2Token, map, newMapCredit;

            beforeAll(async () => {
                [[u1, u1Token], [u2, u2Token]] = await Promise.all([
                    createAndLoginUser({ data: { roles: { create: { mapper: true } } } }),
                    createAndLoginUser({ data: { roles: { create: { mapper: true } } } })
                ]);
                map = await createMap({ submitter: { connect: { id: u1.id } }, statusFlag: MapStatus.NEEDS_REVISION });
                newMapCredit = { type: MapCreditType.SPECIAL_THANKS, userID: u2.id };
            });

            afterAll(() => cleanup('user', 'map'));

            it('should create a map credit for the specified map', async () => {
                await post({
                    url: `maps/${map.id}/credits`,
                    status: 201,
                    body: newMapCredit,
                    validate: MapCreditDto,
                    token: u1Token
                });

                const credit = await prisma.mapCredit.findFirst();
                expect(credit).toMatchObject({ userID: u2.id, mapID: map.id });
            });

            it('should 409 if the map credit already exists', () =>
                // Just repeat the exact same request as above
                post({
                    url: `maps/${map.id}/credits`,
                    status: 409,
                    body: newMapCredit,
                    token: u1Token
                }));

            it('should create an activity if a new author is added', async () => {
                await post({
                    url: `maps/${map.id}/credits`,
                    status: 201,
                    body: { type: MapCreditType.AUTHOR, userID: u2.id },
                    token: u1Token
                });

                const activity = await prisma.activity.findFirst();
                expect(activity).toMatchObject({
                    data: BigInt(map.id),
                    userID: u2.id,
                    type: ActivityTypes.MAP_UPLOADED
                });
            });

            it('should 404 if the map is not found', () =>
                post({ url: `maps/${NULL_ID}/credits`, status: 404, body: newMapCredit, token: u1Token }));

            it('should 403 if the user is not the map submitter', () =>
                post({ url: `maps/${map.id}/credits`, status: 403, body: newMapCredit, token: u2Token }));

            it("should 403 if the user doesn't have the mapper role", async () => {
                await prisma.roles.update({ where: { userID: u1.id }, data: { mapper: false } });

                await post({
                    url: `maps/${map.id}/credits`,
                    status: 403,
                    body: newMapCredit,
                    token: u1Token
                });

                await prisma.roles.update({ where: { userID: u1.id }, data: { mapper: true } });
            });

            it('should 403 if the map is not in NEEDS_REVISION state', async () => {
                await prisma.map.update({ where: { id: map.id }, data: { statusFlag: MapStatus.APPROVED } });

                await post({ url: `maps/${map.id}/credits`, status: 403, body: newMapCredit, token: u1Token });

                await prisma.map.update({ where: { id: map.id }, data: { statusFlag: MapStatus.NEEDS_REVISION } });
            });

            it('should 400 if the map credit object is invalid', () =>
                post({ url: `maps/${map.id}/credits`, status: 400, body: { type: -6 }, token: u1Token }));

            it('should 400 if the user ID is missing', () =>
                post({
                    url: `maps/${map.id}/credits`,
                    status: 400,
                    body: { type: MapCreditType.TESTER },
                    token: u1Token
                }));

            it('should 400 if the type is missing', () =>
                post({ url: `maps/${map.id}/credits`, status: 400, body: { userID: u2.id }, token: u1Token }));

            it('should 400 if the credited user does not exist', () =>
                post({
                    url: `maps/${map.id}/credits`,
                    status: 400,
                    body: { type: MapCreditType.TESTER, userID: NULL_ID },
                    token: u1Token
                }));

            unauthorizedTest('maps/1/credits', post);
        });
    });

    describe('maps/credits/{mapCreditID}', () => {
        describe('GET', () => {
            let user, token, map, credit;
            const creditType = MapCreditType.AUTHOR;

            beforeAll(async () => {
                [[user, token], map] = await Promise.all([createAndLoginUser(), createMap()]);
                credit = await prisma.mapCredit.create({ data: { mapID: map.id, userID: user.id, type: creditType } });
            });

            afterAll(() => cleanup('user', 'map'));

            beforeEach(
                async () =>
                    (credit = await prisma.mapCredit.create({
                        data: { mapID: map.id, userID: user.id, type: creditType }
                    }))
            );

            afterEach(() => prisma.mapCredit.deleteMany());

            it('should return the specified map credit', async () => {
                const res = await get({
                    url: `maps/credits/${credit.id}`,
                    status: 200,
                    validate: MapCreditDto,
                    token: token
                });

                expect(res.body).toMatchObject({ type: creditType, userID: user.id, mapID: map.id });
            });

            it('should return the specified map credit with the user expand parameter', () =>
                expandTest({ url: `maps/credits/${credit.id}`, expand: 'user', validate: MapCreditDto, token: token }));

            it('should return a 404 if the map credit is not found', () =>
                get({ url: `maps/credits/${NULL_ID}`, status: 404, token: token }));

            unauthorizedTest('maps/credits/1', get);
        });

        describe('PATCH', () => {
            let u1, u1Token, u2, u2Token, map, credit;

            beforeAll(async () => {
                [[u1, u1Token], [u2, u2Token]] = await Promise.all([
                    createAndLoginUser({ data: { roles: { create: { mapper: true } } } }),
                    createAndLoginUser({ data: { roles: { create: { mapper: true } } } })
                ]);

                map = await createMap({ statusFlag: MapStatus.NEEDS_REVISION, submitter: { connect: { id: u1.id } } });
            });

            afterAll(() => cleanup('user', 'map'));

            beforeEach(
                async () =>
                    (credit = await prisma.mapCredit.create({
                        data: { mapID: map.id, userID: u1.id, type: MapCreditType.AUTHOR }
                    }))
            );

            afterEach(() => prisma.mapCredit.deleteMany());

            it("should update the specified map credit's user and type", async () => {
                await patch({
                    url: `maps/credits/${credit.id}`,
                    status: 204,
                    body: { userID: u2.id, type: MapCreditType.COAUTHOR },
                    token: u1Token
                });

                const updatedCredit = await prisma.mapCredit.findUnique({ where: { id: credit.id } });
                expect(updatedCredit).toMatchObject({ userID: u2.id, type: MapCreditType.COAUTHOR });
            });

            it("should just update the specified map credit's type", () =>
                patch({
                    url: `maps/credits/${credit.id}`,
                    status: 204,
                    body: { type: MapCreditType.SPECIAL_THANKS },
                    token: u1Token
                }));

            it("should just update the specified map credit's user", () =>
                patch({
                    url: `maps/credits/${credit.id}`,
                    status: 204,
                    body: { userID: u1.id },
                    token: u1Token
                }));

            it('should return 403 if the map was not submitted by that user', () =>
                patch({
                    url: `maps/credits/${credit.id}`,
                    status: 403,
                    body: { type: MapCreditType.COAUTHOR },
                    token: u2Token
                }));

            it('should return 404 if the map credit was not found', () =>
                patch({
                    url: `maps/credits/${NULL_ID}`,
                    status: 404,
                    body: { type: MapCreditType.COAUTHOR },
                    token: u1Token
                }));

            it('should 400 when the map credit type is invalid', () =>
                patch({ url: `maps/credits/${credit.id}`, status: 400, body: { type: 'Author' }, token: u1Token }));

            it('should 400 when the map credit user is invalid', () =>
                patch({
                    url: `maps/credits/${credit.id}`,
                    status: 400,
                    body: { userID: 'Momentum Man' },
                    token: u1Token
                }));

            it('should 400 when no update data is provided', () =>
                patch({
                    url: `maps/credits/${credit.id}`,
                    status: 400,
                    token: u1Token
                }));

            it('should 403 if the map is not in NEEDS_REVISION state', async () => {
                await prisma.map.update({ where: { id: map.id }, data: { statusFlag: MapStatus.APPROVED } });

                await patch({
                    url: `maps/credits/${credit.id}`,
                    status: 403,
                    body: { type: MapCreditType.COAUTHOR },
                    token: u1Token
                });

                await prisma.map.update({ where: { id: map.id }, data: { statusFlag: MapStatus.NEEDS_REVISION } });
            });

            it('should 403 if the user does not have the mapper role', async () => {
                await prisma.user.update({ where: { id: u1.id }, data: { roles: { update: { mapper: false } } } });

                await patch({
                    url: `maps/credits/${credit.id}`,
                    status: 403,
                    body: { type: MapCreditType.COAUTHOR },
                    token: u1Token
                });

                await prisma.user.update({ where: { id: u1.id }, data: { roles: { update: { mapper: true } } } });
            });

            it('should 400 if the credited user does not exist', () =>
                patch({ url: `maps/credits/${credit.id}`, status: 400, body: { userID: NULL_ID }, token: u1Token }));

            it("should update the activities when an author credit's user is changed", async () => {
                await prisma.activity.deleteMany();

                await prisma.activity.create({
                    data: { type: ActivityTypes.MAP_UPLOADED, userID: u1.id, data: map.id }
                });

                await patch({
                    url: `maps/credits/${credit.id}`,
                    status: 204,
                    body: { userID: u2.id },
                    token: u1Token
                });

                const originalActivity = await prisma.activity.findFirst({
                    where: { userID: u1.id, type: ActivityTypes.MAP_UPLOADED }
                });
                const newActivity = await prisma.activity.findFirst({
                    where: { userID: u2.id, type: ActivityTypes.MAP_UPLOADED }
                });
                expect(originalActivity).toBeNull();
                expect(newActivity).toMatchObject({ userID: u2.id, type: ActivityTypes.MAP_UPLOADED });
            });

            it("should update the activities when an author credit's type is changed", async () => {
                await prisma.activity.deleteMany();

                await prisma.activity.create({
                    data: { type: ActivityTypes.MAP_UPLOADED, userID: u1.id, data: map.id }
                });

                await patch({
                    url: `maps/credits/${credit.id}`,
                    status: 204,
                    body: { type: MapCreditType.COAUTHOR },
                    token: u1Token
                });

                const originalActivity = await prisma.activity.findFirst({
                    where: { userID: u1.id, type: ActivityTypes.MAP_UPLOADED }
                });
                expect(originalActivity).toBeNull();
            });

            it('should 409 if the user tries to update a credit to be identical to another credit', async () => {
                await prisma.mapCredit.create({ data: { mapID: map.id, userID: u2.id, type: MapCreditType.COAUTHOR } });

                await patch({
                    url: `maps/credits/${credit.id}`,
                    status: 409,
                    body: { userID: u2.id, type: MapCreditType.COAUTHOR },
                    token: u1Token
                });
            });

            unauthorizedTest('maps/credits/1', patch);
        });

        describe('DELETE', () => {
            let u1, u1Token, u2Token, map, credit;

            beforeAll(async () => {
                [[u1, u1Token], u2Token] = await Promise.all([
                    createAndLoginUser({ data: { roles: { create: { mapper: true } } } }),
                    loginNewUser({ data: { roles: { create: { mapper: true } } } })
                ]);

                map = await createMap({ statusFlag: MapStatus.NEEDS_REVISION, submitter: { connect: { id: u1.id } } });
            });

            afterAll(() => cleanup('user', 'map'));

            beforeEach(
                async () =>
                    (credit = await prisma.mapCredit.create({
                        data: { mapID: map.id, userID: u1.id, type: MapCreditType.AUTHOR }
                    }))
            );

            afterEach(() => prisma.mapCredit.deleteMany());

            it('should delete the specified map credit', async () => {
                await del({ url: `maps/credits/${credit.id}`, status: 204, token: u1Token });

                const deletedCredit = await prisma.mapCredit.findFirst();
                expect(deletedCredit).toBeNull();
            });

            it('should remove the activity when an author credit is deleted', async () => {
                await prisma.activity.create({
                    data: { type: ActivityTypes.MAP_UPLOADED, userID: u1.id, data: map.id }
                });

                await del({ url: `maps/credits/${credit.id}`, status: 204, token: u1Token });

                const activity = await prisma.activity.findFirst();
                expect(activity).toBeNull();
            });

            it('should return 403 if the map was not submitted by that user', () =>
                del({ url: `maps/credits/${credit.id}`, status: 403, token: u2Token }));

            it('should return 403 if the map is not in NEEDS_REVISION state', async () => {
                await prisma.map.update({ where: { id: map.id }, data: { statusFlag: MapStatus.APPROVED } });

                await del({ url: `maps/credits/${credit.id}`, status: 403, token: u1Token });

                await prisma.map.update({ where: { id: map.id }, data: { statusFlag: MapStatus.NEEDS_REVISION } });
            });

            it('should return 403 if the user does not have the mapper role', async () => {
                await prisma.user.update({ where: { id: u1.id }, data: { roles: { update: { mapper: false } } } });

                await del({ url: `maps/credits/${credit.id}`, status: 403, token: u1Token });

                await prisma.user.update({ where: { id: u1.id }, data: { roles: { update: { mapper: true } } } });
            });

            it('should return 404 if the map credit was not found', () =>
                del({ url: `maps/credits/${NULL_ID}`, status: 404, token: u1Token }));

            unauthorizedTest('maps/credits/1', del);
        });
    });

    describe('maps/{mapID}/zones', () => {
        describe('GET', () => {
            let token, map;
            beforeAll(
                async () =>
                    ([token, map] = await Promise.all([
                        loginNewUser(),
                        createMap({}, { zones: { createMany: { data: [{ zoneNum: 0 }, { zoneNum: 1 }] } } })
                    ]))
            );

            afterAll(() => cleanup('user', 'map'));

            it('should respond with the map zones', async () => {
                const res = await get({ url: `maps/${map.id}/zones`, status: 200, token: token });

                expect(res.body).toHaveLength(1);
                expect(res.body[0]).toBeValidDto(MapTrackDto);
                expect(res.body[0].zones).toHaveLength(2);
            });

            it('should 404 if the map does not exist', () =>
                get({ url: `maps/${NULL_ID}/zones`, status: 404, token: token }));

            unauthorizedTest('maps/1/zones', get);
        });
    });

    describe('maps/{mapID}/thumbnail', () => {
        describe('PUT', () => {
            let user, token, map;
            beforeAll(async () => {
                [user, token] = await createAndLoginUser({ data: { roles: { create: { mapper: true } } } });
                map = await createMap({
                    statusFlag: MapStatus.NEEDS_REVISION,
                    submitter: { connect: { id: user.id } }
                });
            });

            afterAll(() => cleanup('user', 'map'));

            it('should update the thumbnail for a map', () =>
                putAttach({ url: `maps/${map.id}/thumbnail`, status: 204, file: 'image_jpg.jpg', token: token }));

            it('should create a thumbnail if one does not exist already', async () => {
                await prisma.mapImage.deleteMany();

                let map = await prisma.map.findFirst();
                expect(map.thumbnailID).toBeNull();

                await putAttach({ url: `maps/${map.id}/thumbnail`, status: 204, file: 'image_png.png', token: token });

                map = await prisma.map.findFirst();
                expect(map.thumbnailID).toBeDefined();

                for (const size of ['small', 'medium', 'large'])
                    expect(await fileStore.exists(`img/${map.thumbnailID}-${size}.jpg`)).toBe(true);
            });

            it('should return a 400 if no thumbnail file is provided', () =>
                put({ url: `maps/${map.id}/thumbnail`, status: 400, token: token }));

            it('should 403 if the user is not the submitter of the map', async () => {
                await prisma.map.update({
                    where: { id: map.id },
                    data: { submitter: { create: { alias: 'Ron Weasley' } } }
                });

                await putAttach({ url: `maps/${map.id}/thumbnail`, status: 403, file: 'image_png.png', token: token });

                await prisma.map.update({ where: { id: map.id }, data: { submitterID: user.id } });
            });

            it('should 403 if the user is not a mapper', async () => {
                await prisma.user.update({ where: { id: user.id }, data: { roles: { update: { mapper: false } } } });

                await putAttach({ url: `maps/${map.id}/thumbnail`, status: 403, file: 'image_jpg.jpg', token: token });

                await prisma.user.update({ where: { id: user.id }, data: { roles: { update: { mapper: true } } } });
            });

            it('should 403 if the map is not in the NEEDS_REVISION state', async () => {
                await prisma.map.update({ where: { id: map.id }, data: { statusFlag: MapStatus.APPROVED } });

                await putAttach({ url: `maps/${map.id}/thumbnail`, status: 403, file: 'image_jpg.jpg', token: token });

                await prisma.map.update({ where: { id: map.id }, data: { statusFlag: MapStatus.NEEDS_REVISION } });
            });

            unauthorizedTest('maps/1/thumbnail', put);
        });
    });

    describe('maps/{mapID}/images', () => {
        describe('GET', () => {
            let token, map;
            beforeAll(async () => {
                [token, map] = await Promise.all([
                    loginNewUser(),
                    createMap({
                        images: {
                            createMany: {
                                data: [{}, {}]
                            }
                        }
                    })
                ]);
            });

            afterAll(() => cleanup('user', 'map'));

            it('should respond with a list of images', () =>
                get({
                    url: `maps/${map.id}/images`,
                    status: 200,
                    validateArray: { type: MapImageDto, length: 2 },
                    token: token
                }));

            it('should 404 if map does not exist', () =>
                get({ url: `maps/${NULL_ID}/images`, status: 404, token: token }));

            unauthorizedTest('maps/1/images', get);
        });

        describe('POST', () => {
            let user, token, map;
            beforeAll(async () => {
                [user, token] = await createAndLoginUser({ data: { roles: { create: { mapper: true } } } });
                map = await createMap({
                    statusFlag: MapStatus.NEEDS_REVISION,
                    submitter: { connect: { id: user.id } },
                    images: {}
                });
            });

            afterAll(() => cleanup('user', 'map'));

            afterEach(() => Promise.all([prisma.mapImage.deleteMany(), fileStore.deleteDirectory('img')]));

            it('should create a map image for the specified map', async () => {
                const res = await postAttach({
                    url: `maps/${map.id}/images`,
                    status: 201,
                    file: 'image_png.png',
                    validate: MapImageDto,
                    token: token
                });

                const updatedMap = await prisma.map.findFirst({ include: { images: true } });
                for (const size of ['small', 'medium', 'large']) {
                    expect(res.body[size]).toBeDefined();
                    expect(await fileStore.exists(`img/${updatedMap.images[0].id}-${size}.jpg`)).toBe(true);
                }
            });

            it('should 409 when the map image limit has been reached', async () => {
                await prisma.mapImage.createMany({
                    data: Array.from({ length: 5 }, () => ({ mapID: map.id }))
                });

                await postAttach({ url: `maps/${map.id}/images`, status: 409, file: 'image_png.png', token: token });
            });

            it('should 400 if the map image is invalid', () =>
                postAttach({ url: `maps/${map.id}/images`, status: 400, file: 'map.zon', token: token }));

            it('should 400 if no file is provided', () =>
                post({ url: `maps/${map.id}/images`, status: 400, token: token }));

            it('should 403 if the user is not a mapper', async () => {
                await prisma.user.update({ where: { id: user.id }, data: { roles: { update: { mapper: false } } } });

                await postAttach({ url: `maps/${map.id}/images`, status: 403, file: 'image_jpg.jpg', token: token });

                await prisma.user.update({ where: { id: user.id }, data: { roles: { update: { mapper: true } } } });
            });

            it('should 403 if the user is not the submitter of the map', async () => {
                await prisma.map.update({
                    where: { id: map.id },
                    data: { submitter: { create: { alias: 'George Weasley' } } }
                });

                await postAttach({ url: `maps/${map.id}/images`, status: 403, file: 'image_jpg.jpg', token: token });

                await prisma.map.update({ where: { id: map.id }, data: { submitter: { connect: { id: user.id } } } });
            });

            it('should 403 if the map is not in the NEEDS_REVISION state', async () => {
                await prisma.map.update({ where: { id: map.id }, data: { statusFlag: MapStatus.APPROVED } });

                await postAttach({ url: `maps/${map.id}/images`, status: 403, file: 'image_jpg.jpg', token: token });

                await prisma.map.update({ where: { id: map.id }, data: { statusFlag: MapStatus.NEEDS_REVISION } });
            });

            unauthorizedTest('maps/1/images', post);
        });
    });

    describe('maps/images/{imgID}', () => {
        describe('GET', () => {
            let token, map;

            beforeAll(async () => ([token, map] = await Promise.all([loginNewUser(), createMap()])));

            afterAll(() => cleanup('user', 'map'));

            it('should respond with image info', () =>
                get({ url: `maps/images/${map.images[0].id}`, status: 200, validate: MapImageDto, token: token }));

            it('should 404 when the image is not found', () =>
                get({ url: `maps/images/${NULL_ID}`, status: 404, token: token }));

            unauthorizedTest('maps/images/1', get);
        });

        describe('PUT', () => {
            let user, token, map, image, hash;
            beforeAll(async () => {
                [user, token] = await createAndLoginUser({ data: { roles: { create: { mapper: true } } } });
                map = await createMap({
                    statusFlag: MapStatus.NEEDS_REVISION,
                    submitter: { connect: { id: user.id } },
                    images: { create: {} }
                });
                image = map.images[0];

                const fileBuffer = readFileSync(__dirname + '/../files/image_jpg.jpg');
                hash = createSha1Hash(fileBuffer);

                for (const size of ['small', 'medium', 'large'])
                    await fileStore.add(`img/${image.id}-${size}.jpg`, fileBuffer);
            });

            afterAll(() => Promise.all([cleanup('user', 'map'), fileStore.deleteDirectory('img')]));

            it('should update the map image', async () => {
                await putAttach({ url: `maps/images/${image.id}`, status: 204, file: 'image_jpg.jpg', token: token });

                for (const size of ['small', 'medium', 'large']) {
                    expect(await fileStore.exists(`img/${image.id}-${size}.jpg`)).toBe(true);
                    expect(await fileStore.checkHash(`img/${image.id}-${size}.jpg`, hash)).toBe(false);
                }
            });

            it('should 404 when the image is not found', () =>
                putAttach({ url: `maps/images/${NULL_ID}`, status: 404, file: 'image_jpg.jpg', token: token }));

            it('should 400 when no map image is provided', () =>
                put({ url: `maps/images/${image.id}`, status: 400, token: token }));

            it('should 400 if the map image is invalid', () =>
                putAttach({ url: `maps/images/${image.id}`, status: 400, file: 'map.zon', token: token }));

            it('should 403 if the user is not a mapper', async () => {
                await prisma.user.update({ where: { id: user.id }, data: { roles: { update: { mapper: false } } } });

                await putAttach({ url: `maps/images/${image.id}`, status: 403, file: 'image_jpg.jpg', token: token });

                await prisma.user.update({ where: { id: user.id }, data: { roles: { update: { mapper: true } } } });
            });

            it('should 403 if the user is not the submitter of the map', async () => {
                await prisma.map.update({
                    where: { id: map.id },
                    data: { submitter: { create: { alias: 'Fred Weasley' } } }
                });

                await putAttach({ url: `maps/images/${image.id}`, status: 403, file: 'image_png.png', token: token });

                await prisma.map.update({ where: { id: map.id }, data: { submitter: { connect: { id: user.id } } } });
            });

            it('should 403 if the map is not in the NEEDS_REVISION state', async () => {
                await prisma.map.update({ where: { id: map.id }, data: { statusFlag: MapStatus.APPROVED } });

                await putAttach({ url: `maps/images/${image.id}`, status: 403, file: 'image_png.png', token: token });

                await prisma.map.update({ where: { id: map.id }, data: { statusFlag: MapStatus.NEEDS_REVISION } });
            });

            unauthorizedTest('maps/images/1', put);
        });

        describe('DELETE', () => {
            let user, token, map, image;

            beforeAll(async () => {
                [user, token] = await createAndLoginUser({ data: { roles: { create: { mapper: true } } } });
                map = await createMap({
                    statusFlag: MapStatus.NEEDS_REVISION,
                    submitter: { connect: { id: user.id } },
                    images: { create: {} }
                });
                image = map.images[0];

                const fileBuffer = readFileSync(__dirname + '/../files/image_jpg.jpg');
                for (const size of ['small', 'medium', 'large'])
                    await fileStore.add(`img/${image.id}-${size}.jpg`, fileBuffer);
            });

            afterAll(async () => {
                await cleanup('user', 'map', 'run');
                await fileStore.deleteDirectory('img');
            });

            it('should delete the map image', async () => {
                for (const size of ['small', 'medium', 'large'])
                    expect(await fileStore.exists(`img/${image.id}-${size}.jpg`)).toBe(true);

                await del({ url: `maps/images/${image.id}`, status: 204, token: token });

                const updatedMap = await prisma.map.findFirst({ include: { images: true } });

                expect(updatedMap.images).toHaveLength(0);

                for (const size of ['small', 'medium', 'large'])
                    expect(await fileStore.exists(`img/${image.id}-${size}.jpg`)).toBe(false);

                // We've just successfully deleted an image and want to have one for the remaining tests
                // (though they don't actually need the files to exist in the bucket). So create a new image
                // for the remaining ones. Much faster than `beforeEach`ing everything.
                image = await prisma.mapImage.create({ data: { mapID: map.id } });
            });

            it('should 404 when the image is not found', () =>
                del({ url: `maps/images/${NULL_ID}`, status: 404, token: token }));

            it('should 403 if the user is not a mapper', async () => {
                await prisma.user.update({ where: { id: user.id }, data: { roles: { update: { mapper: false } } } });

                await del({ url: `maps/images/${image.id}`, status: 403, token: token });

                await prisma.user.update({ where: { id: user.id }, data: { roles: { update: { mapper: true } } } });
            });

            it('should 403 if the user is not the submitter of the map', async () => {
                await prisma.map.update({
                    where: { id: map.id },
                    data: { submitter: { create: { alias: 'Bill Weasley' } } }
                });

                await del({ url: `maps/images/${image.id}`, status: 403, token: token });

                await prisma.map.update({ where: { id: map.id }, data: { submitter: { connect: { id: user.id } } } });
            });

            it('should 403 if the map is not in the NEEDS_REVISION state', async () => {
                await prisma.map.update({ where: { id: map.id }, data: { statusFlag: MapStatus.APPROVED } });

                await del({ url: `maps/images/${image.id}`, status: 403, token: token });

                await prisma.map.update({ where: { id: map.id }, data: { statusFlag: MapStatus.NEEDS_REVISION } });
            });

            unauthorizedTest('maps/images/1', del);
        });
    });

    describe('maps/{mapID}/runs', () => {
        describe('GET', () => {
            let u1, u1Token, u2, u3, map, nonPbRun;
            beforeAll(async () => {
                [[u1, u1Token], u2, u3, map] = await Promise.all([
                    createAndLoginUser(),
                    createUser(),
                    createUser(),
                    createMap()
                ]);
                // Flags are weird currently, seems like they're supposed to be bitflags but aren't treated as that,
                // probably changing in 0.10.0.
                await Promise.all([
                    createRunAndUmrForMap({
                        map: map,
                        user: u1,
                        rank: 1,
                        ticks: 10,
                        flags: 1,
                        createdAt: dateOffset(3)
                    }),
                    createRunAndUmrForMap({
                        map: map,
                        user: u2,
                        rank: 3,
                        ticks: 20,
                        flags: 1,
                        createdAt: dateOffset(2)
                    }),
                    createRunAndUmrForMap({
                        map: map,
                        user: u3,
                        rank: 2,
                        ticks: 30,
                        flags: 2,
                        createdAt: dateOffset(1)
                    }),
                    (nonPbRun = await createRun({ map: map, user: u1, ticks: 40, flags: 1, createdAt: dateOffset(0) }))
                ]);
            });

            afterAll(() => cleanup('user', 'map', 'run'));

            it('should return run files for the specified map', () =>
                get({
                    url: `maps/${map.id}/runs`,
                    status: 200,
                    validatePaged: { type: RunDto, count: 4 },
                    token: u1Token
                }));

            it('should respond with filtered map data using the take parameter', () =>
                takeTest({ url: `maps/${map.id}/runs`, validate: RunDto, token: u1Token }));

            it('should respond with filtered map data using the skip parameter', () =>
                skipTest({ url: `maps/${map.id}/runs`, validate: RunDto, token: u1Token }));

            it('should respond with a list of runs filtered by userID parameter', async () => {
                const res = await get({
                    url: `maps/${map.id}/runs`,
                    status: 200,
                    query: { userID: u2.id },
                    validatePaged: { type: RunDto, count: 1 },
                    token: u1Token
                });

                expect(res.body.response[0].userID).toBe(u2.id);
            });

            it('should respond with a list of runs filtered by a list of user ids', () =>
                get({
                    url: `maps/${map.id}/runs`,
                    status: 200,
                    query: { userIDs: `${u2.id},${u3.id}` },
                    validatePaged: { type: RunDto, count: 2 },
                    token: u1Token
                }));

            it('should respond with a list of runs filtered by flags', async () =>
                get({
                    url: `maps/${map.id}/runs`,
                    status: 200,
                    query: { flags: 1 },
                    validatePaged: { type: RunDto, count: 3 },
                    token: u1Token
                }));

            it('should respond with a list of runs with the map include', () =>
                expandTest({
                    url: `maps/${map.id}/runs`,
                    validate: RunDto,
                    expand: 'map',
                    paged: true,
                    token: u1Token
                }));

            it('should respond with a list of runs with the rank include', () =>
                expandTest({
                    url: `maps/${map.id}/runs`,
                    validate: RunDto,
                    expand: 'rank',
                    paged: true,
                    token: u1Token,
                    filter: (x) => x.id !== Number(nonPbRun.id)
                }));

            it('should respond with a list of runs with the zoneStats include', () =>
                expandTest({
                    url: `maps/${map.id}/runs`,
                    validate: RunDto,
                    expand: 'zoneStats',
                    paged: true,
                    token: u1Token
                }));

            it('should respond with a list of runs with the overallStats include', () =>
                expandTest({
                    url: `maps/${map.id}/runs`,
                    validate: RunDto,
                    expand: 'overallStats',
                    paged: true,
                    token: u1Token
                }));

            it('should respond with a list of runs with the mapWithInfo include', async () => {
                const res = await get({
                    url: `maps/${map.id}/runs`,
                    status: 200,
                    validatePaged: RunDto,
                    query: { expand: 'mapWithInfo' },
                    token: u1Token
                });

                for (const x of res.body.response) expect(x.map).toHaveProperty('info');
            });

            it('should respond with a list of runs that are personal bests', () =>
                get({
                    url: `maps/${map.id}/runs`,
                    status: 200,
                    query: { isPB: true, expand: 'rank' },
                    validatePaged: { type: RunDto, totalCount: 3, returnCount: 3 },
                    token: u1Token
                }));

            it('should respond with a list of runs sorted by date', () =>
                sortByDateTest({
                    url: `maps/${map.id}/runs`,
                    query: { order: 'date' },
                    validate: RunDto,
                    token: u1Token
                }));

            it('should respond with a list of runs sorted by time', () =>
                sortTest({
                    url: `maps/${map.id}/runs`,
                    query: { order: 'time' },
                    sortFn: (n1, n2) => n1.ticks - n2.ticks,
                    validate: RunDto,
                    token: u1Token
                }));

            unauthorizedTest('maps/1/runs', get);
        });
    });

    describe('maps/{mapID}/ranks', () => {
        describe('GET', () => {
            let u1, u1Token, u2, u3, map;
            beforeAll(async () => {
                [[u1, u1Token], u2, u3, map] = await Promise.all([
                    createAndLoginUser(),
                    createUser(),
                    createUser(),
                    createMap()
                ]);
                await Promise.all([
                    createRunAndUmrForMap({
                        map: map,
                        user: u1,
                        rank: 1,
                        ticks: 10,
                        flags: 1,
                        createdAt: dateOffset(3)
                    }),
                    createRunAndUmrForMap({
                        map: map,
                        user: u2,
                        rank: 2,
                        ticks: 20,
                        flags: 1,
                        createdAt: dateOffset(2)
                    }),
                    createRunAndUmrForMap({
                        map: map,
                        user: u3,
                        rank: 3,
                        ticks: 30,
                        flags: 2,
                        createdAt: dateOffset(1)
                    })
                ]);
            });

            afterAll(() => cleanup('user', 'map', 'run'));

            it("should return a list of a map's ranks", () =>
                get({
                    url: `maps/${map.id}/ranks`,
                    status: 200,
                    validatePaged: { type: UserMapRankDto, count: 3 },
                    token: u1Token
                }));

            it('should return only runs for a single player when given the query param playerID', async () => {
                const res = await get({
                    url: `maps/${map.id}/ranks`,
                    status: 200,
                    query: { playerID: u2.id },
                    validatePaged: { type: UserMapRankDto, count: 1 },
                    token: u1Token
                });

                expect(res.body.response[0]).toMatchObject({ mapID: map.id, userID: u2.id, flags: 1, rank: 2 });
            });

            it('should return only runs for a set of players when given the query param playerIDs', async () => {
                const res = await get({
                    url: `maps/${map.id}/ranks`,
                    status: 200,
                    query: { playerIDs: `${u1.id},${u2.id}` },
                    validatePaged: { type: UserMapRankDto, count: 2 },
                    token: u1Token
                });

                for (const rank of res.body.response) expect([u1.id, u2.id]).toContain(rank.userID);
            });

            it('should return only runs with specific flags when given the query param flags', async () => {
                const res = await get({
                    url: `maps/${map.id}/ranks`,
                    status: 200,
                    query: { flags: 1 },
                    validatePaged: { type: UserMapRankDto, count: 2 },
                    token: u1Token
                });

                for (const rank of res.body.response) expect([u1.id, u2.id]).toContain(rank.userID);
            });

            it('should order the list by date when given the query param orderByDate', () =>
                sortByDateTest({
                    url: `maps/${map.id}/ranks`,
                    query: { orderByDate: true },
                    validate: UserMapRankDto,
                    token: u1Token
                }));

            it('should be ordered by rank by default', () =>
                sortTest({
                    url: `maps/${map.id}/ranks`,
                    validate: UserMapRankDto,
                    sortFn: (a, b) => a.time - b.time,
                    token: u1Token
                }));

            it('should respond with filtered map data using the skip parameter', () =>
                skipTest({ url: `maps/${map.id}/ranks`, validate: UserMapRankDto, token: u1Token }));

            it('should respond with filtered map data using the take parameter', () =>
                takeTest({ url: `maps/${map.id}/ranks`, validate: UserMapRankDto, token: u1Token }));

            it('should return 404 for a nonexistent map', () =>
                get({ url: `maps/${NULL_ID}/ranks`, status: 404, token: u1Token }));

            unauthorizedTest('maps/1/ranks', get);
        });
    });

    describe('maps/{mapID}/ranks/{rankNumber}', () => {
        describe('GET', () => {
            let user, token, map;

            beforeAll(
                async () =>
                    ([[user, token], map] = await Promise.all([
                        createAndLoginUser(),
                        prisma.map.create({
                            data: {
                                name: 'surf_ronweasley',
                                statusFlag: MapStatus.APPROVED,
                                tracks: {
                                    createMany: {
                                        data: [
                                            { trackNum: 0, numZones: 2, isLinear: true, difficulty: 1 },
                                            { trackNum: 1, numZones: 1, isLinear: false, difficulty: 2 }
                                        ]
                                    }
                                }
                            }
                        })
                    ]))
            );

            afterAll(() => cleanup('user', 'map'));
            afterEach(() => cleanup('run'));

            it('should return the rank info for the rank and map specified', async () => {
                await createRunAndUmrForMap({ map: map, user: user, rank: 1, ticks: 1 });

                const res = await get({
                    url: `maps/${map.id}/ranks/1`,
                    status: 200,
                    validate: UserMapRankDto,
                    token: token
                });

                expect(res.body).toMatchObject({ rank: 1, mapID: map.id, userID: user.id });

                const run2 = await createRunAndUmrForMap({ map: map, rank: 2, ticks: 2 });

                const res2 = await get({
                    url: `maps/${map.id}/ranks/2`,
                    status: 200,
                    validate: UserMapRankDto,
                    token: token
                });

                expect(res2.body).toMatchObject({ rank: 2, mapID: map.id, userID: run2.user.id });
            });

            it('should return the rank info for the rank and map and flags specified', async () => {
                await createRunAndUmrForMap({ map: map, user: user, rank: 1, ticks: 1, flags: 0 });
                const flagRun = await createRunAndUmrForMap({ map: map, rank: 1, ticks: 1, flags: 1 });

                const res = await get({
                    url: `maps/${map.id}/ranks/1`,
                    status: 200,
                    validate: UserMapRankDto,
                    query: { flags: 1 },
                    token: token
                });

                // Check that we actually get the run with the special flags back, not `user`'s run with flags: 0
                expect(res.body).toMatchObject({
                    rank: 1,
                    flags: 1,
                    mapID: map.id,
                    userID: flagRun.user.id,
                    runID: Number(flagRun.id)
                });
            });

            it('should return the rank info for the rank and map and trackNum specified', async () => {
                await createRunAndUmrForMap({ map: map, user: user, rank: 1, ticks: 1, trackNum: 0 });
                const trackNumRun = await createRunAndUmrForMap({ map: map, rank: 1, ticks: 1, trackNum: 1 });

                const res = await get({
                    url: `maps/${map.id}/ranks/1`,
                    status: 200,
                    validate: UserMapRankDto,
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
                await createRunAndUmrForMap({ map: map, user: user, rank: 1, ticks: 1, zoneNum: 0 });
                const zoneNum = await createRunAndUmrForMap({ map: map, rank: 1, ticks: 1, zoneNum: 1 });

                const res = await get({
                    url: `maps/${map.id}/ranks/1`,
                    status: 200,
                    validate: UserMapRankDto,
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
                get({ url: `maps/${NULL_ID}/ranks/1`, status: 404, token: token }));

            it('should 404 for a nonexistent rank', () =>
                get({ url: `maps/${map.id}/ranks/${NULL_ID}`, status: 404, token: token }));

            unauthorizedTest('maps/1/ranks/1', get);
        });
    });

    describe('maps/{mapID}/ranks/around', () => {
        describe('GET', () => {
            let map, token, runs;

            beforeAll(async () => {
                [token, map] = await Promise.all([loginNewUser(), createMap()]);
                runs = await Promise.all(
                    Array.from({ length: 12 }, (_, i) =>
                        createRunAndUmrForMap({ map: map, rank: i + 1, ticks: (i + 1) * 100 })
                    )
                );
            });

            afterAll(() => cleanup('user', 'map', 'run'));

            it('should return a list of ranks around your rank', async () => {
                const user7Token = await login(runs[6].user);

                const res = await get({
                    url: `maps/${map.id}/ranks/around`,
                    status: 200,
                    token: user7Token,
                    validateArray: { type: UserMapRankDto, length: 11 }
                });

                // We're calling as user 7, so we expect ranks 2-6, our rank, then 8-12
                let rankIndex = 2;
                for (const umr of res.body) {
                    expect(umr).toBeValidDto(UserMapRankDto);
                    expect(umr.rank).toBe(rankIndex);
                    rankIndex++;
                }
                // Last tested was 12, then incremented once more, should be sitting on 13.
                expect(rankIndex).toBe(13);
            });

            it('should return 404 for a nonexistent map', () =>
                get({ url: `maps/${NULL_ID}/ranks/1`, status: 404, token: token }));

            it("should return 400 if rankNum isn't a number or around or friends", () =>
                get({ url: `maps/${map.id}/ranks/abcd`, status: 400, token: token }));

            unauthorizedTest('maps/1/ranks/around', get);
        });
    });
});
