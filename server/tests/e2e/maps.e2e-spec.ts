// noinspection DuplicatedCode
import * as request from 'supertest';
import { readFileSync } from 'fs';
import { AuthService } from '../../src/modules/auth/auth.service';
import { PrismaService } from '../../src/modules/repo/prisma.service';
import { MapStatus, MapCreditType, MapType } from '../../src/common/enums/map.enum';
import { MapDto } from '../../src/common/dto/map/map.dto';
import {
    del,
    expandTest,
    get,
    getNoContent,
    patch,
    post,
    postAttach,
    put,
    skipTest,
    takeTest
} from '../util/test-util';
import { MapInfoDto } from '../../src/common/dto/map/map-info.dto';
import { MapCreditDto } from '../../src/common/dto/map/map-credit.dto';
import { MapImageDto } from '../../src/common/dto/map/map-image.dto';
import { RunDto } from '../../src/common/dto/run/runs.dto';
import { MapRankDto } from '../../src/common/dto/map/map-rank.dto';
import { ActivityTypes } from '../../src/common/enums/activity.enum';
import axios from 'axios';
import { createHash } from 'crypto';
import { DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { UserDto } from '../../src/common/dto/user/user.dto';
import { MapTrackDto } from '../../src/common/dto/map/map-track.dto';

const hash = (buffer: Buffer) => createHash('sha1').update(buffer).digest('hex');

const s3Client = new S3Client({
    region: process.env.region,
    endpoint: process.env.endpointURL,
    credentials: {
        accessKeyId: process.env.accessKeyID,
        secretAccessKey: process.env.secretAccessKey
    }
});

describe('Maps', () => {
    let user,
        admin,
        user2,
        user3,
        run1,
        run2,
        run3,
        map1,
        map2,
        map3,
        map4,
        createMapObj: () => any,
        gameAdmin,
        gameAdminAccessToken,
        adminAccessToken,
        user2AccessToken,
        user3AccessToken;

    beforeEach(async () => {
        const prisma: PrismaService = global.prisma;

        // Create Users
        user = await prisma.user.create({
            data: {
                steamID: '65465432154',
                alias: 'User 1',
                roles: { create: { verified: true, mapper: true } }
            }
        });

        // Doesn't have mapper role, should fail
        user2 = await prisma.user.create({
            data: {
                steamID: '645363245235',
                alias: 'User 2'
            }
        });

        user3 = await prisma.user.create({
            data: {
                steamID: '754673452345',
                alias: 'User 3',
                roles: { create: { mapper: true } }
            }
        });

        admin = await prisma.user.create({
            data: {
                steamID: '54132121685476543',
                alias: 'Fred Weasley',
                roles: { create: { admin: true } }
            }
        });

        map1 = await prisma.map.create({
            data: {
                // Random name, ensures the BSP actually does get uploaded
                name: 'maps_test' + Math.floor(Math.random() * 100000000),
                type: MapType.SURF,
                statusFlag: MapStatus.NEEDS_REVISION,
                submitterID: user.id,
                info: {
                    create: {
                        description: 'My first map!!!!',
                        numTracks: 1,
                        creationDate: new Date(),
                        youtubeID: 'xV0WiaX7WFI'
                    }
                },
                tracks: {
                    create: {
                        trackNum: 0,
                        numZones: 1,
                        isLinear: false,
                        difficulty: 2,
                        zones: {
                            createMany: {
                                data: [
                                    {
                                        zoneNum: 0
                                    },
                                    {
                                        zoneNum: 1
                                    }
                                ]
                            }
                        }
                    }
                },
                credits: {
                    create: {
                        type: MapCreditType.AUTHOR,
                        userID: user.id
                    }
                },
                images: {
                    createMany: {
                        data: [
                            {
                                small: 'bing.com',
                                medium: 'bing.com',
                                large: 'bing.com'
                            },
                            {
                                small: 'bing.com',
                                medium: 'bing.com',
                                large: 'bing.com'
                            }
                        ]
                    }
                },
                stats: {
                    create: {
                        reviews: 1
                    }
                }
            },
            include: {
                info: true,
                credits: true,
                images: true,
                stats: true,
                tracks: {
                    include: {
                        zones: true
                    }
                }
            }
        });

        map1 = await prisma.map.update({
            where: { id: map1.id },
            data: { mainTrack: { connect: { id: map1.tracks[0].id } } }
        });

        const img = await prisma.mapImage.findFirst({ where: { mapID: map1.id } });

        map1 = await prisma.map.update({
            where: { id: map1.id },
            data: {
                thumbnail: {
                    connect: {
                        id: img.id
                    }
                }
            },
            include: {
                info: true,
                credits: true,
                images: true,
                stats: true,
                tracks: {
                    include: {
                        zones: true
                    }
                }
            }
        });

        map2 = await prisma.map.create({
            data: {
                name: 'maps_test2',
                type: MapType.CONC,
                statusFlag: MapStatus.APPROVED,
                submitterID: admin.id,
                info: {
                    create: {
                        description: 'My test map!!!!',
                        numTracks: 1,
                        creationDate: new Date(),
                        createdAt: new Date(),
                        updatedAt: new Date()
                    }
                },
                tracks: {
                    create: {
                        trackNum: 0,
                        numZones: 1,
                        isLinear: true,
                        difficulty: 8,
                        zones: {
                            createMany: {
                                data: [
                                    {
                                        zoneNum: 0
                                    },
                                    {
                                        zoneNum: 1
                                    }
                                ]
                            }
                        }
                    }
                },
                credits: {
                    create: {
                        type: MapCreditType.AUTHOR,
                        userID: user?.id
                    }
                }
            },
            include: {
                info: true,
                credits: true,
                images: true,
                tracks: {
                    include: {
                        zones: true
                    }
                }
            }
        });

        map2 = await prisma.map.update({
            where: { id: map2.id },
            data: { mainTrack: { connect: { id: map2.tracks[0].id } } }
        });

        map3 = await prisma.map.create({
            data: {
                name: 'maps_test3',
                type: MapType.CONC,
                statusFlag: MapStatus.APPROVED,
                submitterID: user3.id,
                info: {
                    create: {
                        description: 'My test map!!!!',
                        numTracks: 1,
                        creationDate: new Date(),
                        createdAt: new Date(),
                        updatedAt: new Date()
                    }
                },
                tracks: {
                    create: {
                        trackNum: 0,
                        numZones: 1,
                        isLinear: true,
                        difficulty: 5,
                        zones: {
                            createMany: {
                                data: [
                                    {
                                        zoneNum: 0
                                    },
                                    {
                                        zoneNum: 1
                                    }
                                ]
                            }
                        }
                    }
                },
                credits: {
                    create: {
                        type: MapCreditType.AUTHOR,
                        userID: user3.id
                    }
                }
            },
            include: {
                info: true,
                credits: true,
                images: true,
                tracks: {
                    include: {
                        zones: true
                    }
                }
            }
        });

        map3 = await prisma.map.update({
            where: { id: map3.id },
            data: { mainTrack: { connect: { id: map3.tracks[0].id } } },
            include: {
                info: true,
                credits: true,
                images: true,
                tracks: {
                    include: {
                        zones: true
                    }
                }
            }
        });

        map4 = await prisma.map.create({
            data: {
                name: 'maps_test4',
                type: MapType.CONC,
                statusFlag: MapStatus.NEEDS_REVISION,
                submitterID: user2.id,
                info: {
                    create: {
                        description: 'My test map!!!!',
                        numTracks: 1,
                        creationDate: new Date(),
                        createdAt: new Date(),
                        updatedAt: new Date()
                    }
                },
                tracks: {
                    create: {
                        trackNum: 0,
                        numZones: 1,
                        isLinear: false,
                        difficulty: 5,
                        zones: {
                            createMany: {
                                data: [
                                    {
                                        zoneNum: 0
                                    },
                                    {
                                        zoneNum: 1
                                    }
                                ]
                            }
                        }
                    }
                },
                credits: {
                    create: {
                        type: MapCreditType.AUTHOR,
                        userID: user2.id
                    }
                }
            },
            include: {
                info: true,
                credits: true,
                images: true,
                tracks: {
                    include: {
                        zones: true
                    }
                }
            }
        });

        map4 = await prisma.map.update({
            where: { id: map4.id },
            data: { mainTrack: { connect: { id: map4.tracks[0].id } } },
            include: {
                info: true,
                credits: true,
                images: true,
                tracks: {
                    include: {
                        zones: true
                    }
                }
            }
        });

        await prisma.map.createMany({
            data: Array(5)
                .fill(0)
                .map((_, i) => {
                    return {
                        name: `pending_test${i}`,
                        type: MapType.BHOP,
                        statusFlag: MapStatus.PENDING,
                        submitterID: user3.id,
                        // Creating these at the exact same time can break a skipTest
                        createdAt: new Date(Date.now() - i * 100)
                    };
                })
        });

        createMapObj = () => {
            return {
                name: 'test_map' + Math.floor(Math.random() * 10000000),
                type: MapType.SURF,
                info: {
                    description: 'mamp',
                    numTracks: 1,
                    creationDate: '2022-07-07T18:33:33.000Z'
                },
                credits: [
                    {
                        userID: user.id,
                        type: MapCreditType.AUTHOR
                    }
                ],
                tracks: Array(2)
                    .fill(0)
                    .map((_, i) => {
                        return {
                            trackNum: i,
                            numZones: 1,
                            isLinear: false,
                            difficulty: 5,
                            zones: Array(10)
                                .fill(0)
                                .map((_, j) => {
                                    return {
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
                                    };
                                })
                        };
                    })
            };
        };

        // admin has WR, user should have a rank 2 PB
        run1 = await prisma.run.create({
            data: {
                map: { connect: { id: map1.id } },
                user: { connect: { id: admin.id } },
                trackNum: 1,
                zoneNum: 1,
                ticks: 10000,
                tickRate: 100,
                flags: 0,
                file: '',
                time: 123123123,
                hash: '',
                rank: {
                    create: {
                        map: { connect: { id: map1.id } },
                        user: { connect: { id: admin.id } },
                        rank: 1,
                        gameType: MapType.SURF
                    }
                },
                overallStats: {
                    create: {
                        jumps: 1
                    }
                }
            }
        });

        run2 = await prisma.run.create({
            data: {
                map: { connect: { id: map1.id } },
                user: { connect: { id: user.id } },
                trackNum: 1,
                zoneNum: 1,
                ticks: 20000,
                tickRate: 100,
                flags: 123,
                file: '',
                hash: '',
                time: 20000000,
                rank: {
                    create: {
                        map: { connect: { id: map1.id } },
                        user: { connect: { id: user.id } },
                        rank: 2,
                        gameType: MapType.SURF
                    }
                },
                overallStats: {
                    create: {
                        jumps: 1
                    }
                }
            }
        });

        // Second run on map1 for user with no UMR so should not be included when filtering by isPB
        run3 = await prisma.run.create({
            data: {
                map: { connect: { id: map1.id } },
                user: { connect: { id: user.id } },
                trackNum: 1,
                zoneNum: 1,
                ticks: 20001,
                tickRate: 100,
                flags: 0,
                file: '',
                hash: '',
                time: 20000100,
                overallStats: {
                    create: {
                        jumps: 1
                    }
                }
            }
        });

        await prisma.mapLibraryEntry.create({
            data: {
                user: { connect: { id: user.id } },
                map: { connect: { id: map1.id } }
            }
        });

        await prisma.mapFavorite.create({
            data: {
                user: { connect: { id: user.id } },
                map: { connect: { id: map1.id } }
            }
        });

        const authService = global.auth as AuthService;
        global.accessToken = (await authService.login(user)).access_token;
        adminAccessToken = (await authService.login(admin)).access_token;
        user2AccessToken = (await authService.login(user2)).access_token;
        user3AccessToken = (await authService.login(user3)).access_token;
    });

    afterEach(async () => {
        const prisma: PrismaService = global.prisma;

        await prisma.user.deleteMany({
            where: { id: { in: [user.id, admin.id, user2.id, user3.id] } }
        });

        await prisma.map.deleteMany({
            where: {
                OR: [
                    { id: { in: [map1.id, map2.id, map3.id, map4.id] } },
                    { name: { startsWith: 'test_map' } },
                    { name: { startsWith: 'pending_test' } }
                ]
            }
        });

        await prisma.run.deleteMany({
            where: { id: { in: [run1.id, run2.id] } }
        });
    });

    describe('GET maps', () => {
        const expects = (res) => {
            expect(res.body).toBeValidPagedDto(MapDto);
            // Some tests don't set mainTrack & info, test just ones in this test
            res.body.response
                .filter((x) => x.name.startsWith('maps_test'))
                .forEach((x) => {
                    expect(x).toHaveProperty('mainTrack');
                    expect(x).toHaveProperty('info');
                });
        };
        const filter = (x) => x.id === map1.id;

        it('should respond with map data', async () => {
            const res = await get('maps', 200);

            expects(res);
            expect(res.body.totalCount).toBeGreaterThanOrEqual(4);
            expect(res.body.returnCount).toBeGreaterThanOrEqual(4);
        });

        it('should be ordered by date', async () => {
            const res = await get('maps', 200);

            expects(res);

            const sortedRes = [...res.body.response].sort(
                (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );

            expect(res.body.response).toEqual(sortedRes);
        });

        it('should respond with filtered map data using the take parameter', () => takeTest('maps', expects));

        it('should respond with filtered map data using the skip parameter', () => skipTest('maps', expects));

        it('should respond with filtered map data using the search parameter', async () => {
            const res = await get('maps', 200, { search: map1.name });

            expects(res);
            expect(res.body.totalCount).toEqual(1);
            expect(res.body.returnCount).toEqual(1);
            expect(res.body.response[0].name).toBe(map1.name);
        });

        it('should respond with filtered map data using the submitter id parameter', async () => {
            const res = await get('maps', 200, { submitterID: user.id });

            expects(res);
            expect(res.body.totalCount).toEqual(1);
            expect(res.body.returnCount).toEqual(1);
            expect(res.body.response[0].submitterID).toBe(map1.submitterID);
        });

        it('should respond with filtered map data based on the map type', async () => {
            const res = await get('maps', 200, { type: map1.type });
            const res2 = await get('maps', 200);

            expects(res);
            expect(res.body.totalCount).toBeLessThan(res2.body.totalCount);
            expect(res.body.returnCount).toBeLessThan(res2.body.returnCount);
            expect(res.body.response.filter((map) => map.name === map1.name).length).toBe(1);
            expect(res.body.response[0].type).toBe(map1.type);
        });

        it('should respond with expanded map data using the credits expand parameter', () =>
            expandTest('maps', expects, 'credits', true, filter));

        it('should respond with expanded map data using the thumbnail expand parameter', () =>
            expandTest('maps', expects, 'thumbnail', true, filter));

        it("should respond with expanded map data if the map is in the logged in user's library when using the inLibrary expansion", () =>
            expandTest('maps', expects, 'inLibrary', true, filter, 'libraryEntries'));

        it("should respond with expanded map data if the map is in the logged in user's library when using the inFavorites expansion", () =>
            expandTest('maps', expects, 'inFavorites', true, filter, 'favorites'));

        it("should respond with the map's WR when using the worldRecord expansion", async () => {
            const res = await get('maps', 200, { expand: 'worldRecord' });

            expects(res);

            const found = res.body.response.find((x) => x.hasOwnProperty('worldRecord'));
            expect(found).not.toBeNull();
            expect(found.worldRecord).toBeValidDto(MapRankDto);
            expect(found.worldRecord.rank).toBe(1);
            expect(found.worldRecord.user.id).toBe(admin.id);
        });

        it("should respond with the logged in user's PB when using the personalBest expansion", async () => {
            const res = await get('maps', 200, { expand: 'personalBest' });

            expects(res);

            const found = res.body.response.find((x) => x.hasOwnProperty('personalBest'));
            expect(found).not.toBeNull();
            expect(found.personalBest).toBeValidDto(MapRankDto);
            expect(found.personalBest.rank).toBe(2);
            expect(found.personalBest.user.id).toBe(user.id);
        });

        it('should respond properly with both personalBest and worldRecord expansions', async () => {
            const res = await get('maps', 200, { expand: 'worldRecord,personalBest' });

            expects(res);

            const found = res.body.response.find(
                (x) => x.hasOwnProperty('worldRecord') && x.hasOwnProperty('personalBest')
            );
            expect(found).not.toBeNull();
            expect(found.worldRecord).toBeValidDto(MapRankDto);
            expect(found.worldRecord.rank).toBe(1);
            expect(found.worldRecord.user.id).toBe(admin.id);
            expect(found.personalBest).toBeValidDto(MapRankDto);
            expect(found.personalBest.rank).toBe(2);
            expect(found.personalBest.user.id).toBe(user.id);
        });

        it('should respond with filtered maps when using the difficultyLow filter', async () => {
            const res = await get('maps', 200, { difficultyLow: 3, search: 'maps_test' });

            expect(res.body.totalCount).toBe(3);
            expect(res.body.returnCount).toBe(3);
        });

        it('should respond with filtered maps when using the difficultyHigh filter', async () => {
            const res = await get('maps', 200, { difficultyHigh: 6, search: 'maps_test' });

            expect(res.body.totalCount).toBe(3);
            expect(res.body.returnCount).toBe(3);
        });

        it('should respond with filtered maps when using both the difficultyLow and difficultyHigh filter', async () => {
            const res = await get('maps', 200, { difficultyLow: 3, difficultyHigh: 6, search: 'maps_test' });

            expect(res.body.totalCount).toBe(2);
            expect(res.body.returnCount).toBe(2);
        });

        it('should respond with filtered maps when the isLinear filter', async () => {
            const res = await get('maps', 200, {
                isLinear: true,
                search: 'maps_test'
            });

            expect(res.body.totalCount).toBe(2);
            expect(res.body.returnCount).toBe(2);
        });

        it('should respond with filtered maps when using both the difficultyLow, difficultyHigh and isLinear filters', async () => {
            const res = await get('maps', 200, {
                difficultyLow: 3,
                difficultyHigh: 6,
                isLinear: true,
                search: 'maps_test'
            });

            expect(res.body.totalCount).toBe(1);
            expect(res.body.returnCount).toBe(1);
        });

        it('should respond with 401 when no access token is provided', () => get('maps', 401, {}, null));
    });

    describe('POST maps', () => {
        it('should create a new map', async () => {
            const mapObj = createMapObj();

            // TODO: not sure it's handling properties right, do a more complex mapobj!
            await post('maps', 204, mapObj);

            const mapDB = await (global.prisma as PrismaService).map.findFirst({
                where: { name: mapObj.name },
                include: {
                    info: true,
                    stats: true,
                    credits: true,
                    mainTrack: true,
                    tracks: { include: { zones: { include: { triggers: { include: { properties: true } } } } } }
                }
            });

            expect(mapDB.name).toBe(mapObj.name);
            expect(mapDB).toHaveProperty('info');
            expect(mapDB.info.description).toBe(mapObj.info.description);
            expect(mapDB.info.numTracks).toBe(mapObj.info.numTracks);
            expect(mapDB.info.creationDate.toJSON()).toBe(mapObj.info.creationDate);
            expect(mapDB.submitterID).toBe(user.id);
            expect(mapDB.credits[0].userID).toBe(user.id);
            expect(mapDB.credits[0].type).toBe(MapCreditType.AUTHOR);
            expect(mapDB).toHaveProperty('tracks');
            expect(mapDB.tracks).toHaveLength(2);
            expect(mapDB.mainTrack.id).toBe(mapDB.tracks.find((track) => track.trackNum === 0).id);
            mapDB.tracks.forEach((track) => {
                expect(track.trackNum).toBeLessThanOrEqual(1);
                track.zones.forEach((zone) => {
                    expect(zone.zoneNum).toBeLessThanOrEqual(10);
                    zone.triggers.forEach((trigger) => {
                        expect(trigger.points).toBe('{"p1": "0", "p2": "0"}');
                        expect(trigger.properties.properties).toBe('{}');
                    });
                });
            });
        });

        it('should create map uploaded activities for the map authors', async () => {
            const mapObj = createMapObj();

            await post('maps', 204, mapObj);

            const mapDB = await (global.prisma as PrismaService).map.findFirst({ where: { name: mapObj.name } });

            const activity = await (global.prisma as PrismaService).activity.findFirst({ where: { userID: user.id } });

            expect(activity.type).toBe(ActivityTypes.MAP_UPLOADED);
            expect(activity.data).toBe(BigInt(mapDB.id));
        });

        it('set the Location property in the response header on creation', async () => {
            const mapObj = createMapObj();

            const res = await post('maps', 204, mapObj);

            const mapDB = await (global.prisma as PrismaService).map.findFirst({ where: { name: mapObj.name } });

            expect(res.get('Location')).toBe(`api/v1/maps/${mapDB.id}/upload`);
        });

        it('should respond with 400 if the map does not have any tracks', () =>
            post('maps', 400, { ...createMapObj, tracks: [] }));

        it('should respond with 400 if a map track have less than 2 zones', async () => {
            const mapObj = createMapObj();
            await post('maps', 400, {
                ...createMapObj,
                tracks: [{ ...mapObj.tracks[0], zones: mapObj.tracks[0].zones[0] }]
            });
        });

        it('should respond with 409 if a map with the same name exists', () =>
            post('maps', 409, { ...createMapObj(), name: map1.name }, user3AccessToken));

        it('should respond with 409 if the submitter already have 5 or more pending maps', () =>
            post('maps', 409, createMapObj(), user3AccessToken));

        it('should respond with 403 when the user does not have the mapper role', () =>
            post('maps', 403, createMapObj(), user2AccessToken));

        it('should respond with 401 when no access token is provided', () => post('maps', 401, createMapObj(), null));
    });

    describe('GET maps/{mapID}/upload', () => {
        it('should set the response header location to the map upload endpoint', async () => {
            const res = await getNoContent(`maps/${map1.id}/upload`, 204);

            expect(res.get('Location')).toBe(`api/v1/maps/${map1.id}/upload`);
        });

        it('should respond with a 403 when the submitterID does not match the userID', () =>
            getNoContent(`maps/${map1.id}/upload`, 403, {}, user2AccessToken));

        it('should respond with a 403 when the map is not accepting uploads', () =>
            getNoContent(`maps/${map1.id}/upload`, 403, {}, user2AccessToken));

        it('should respond with 401 when no access token is provided', () =>
            getNoContent(`maps/${map1.id}/upload`, 401, {}, null));
    });

    describe('POST /maps/{mapID}/upload', () => {
        it('should upload the map file', async () => {
            const inBuffer = readFileSync('./tests/files/map.bsp');
            const inHash = hash(inBuffer);

            const res = await postAttach(`maps/${map1.id}/upload`, 201, 'map.bsp');

            const url: string = res.body.downloadURL;
            expect(url.split('/').at(-1)).toBe(res.body.name + '.bsp');

            // This is failing sometimes, giving Backblaze a little time to process our file
            await new Promise((resolve) => setTimeout(resolve, 1000));

            const outBuffer = await axios
                .get(url, { responseType: 'arraybuffer' })
                .then((res) => Buffer.from(res.data, 'binary'));
            const outHash = hash(outBuffer);

            expect(inHash).toBe(res.body.hash);
            expect(outHash).toBe(res.body.hash);

            try {
                await s3Client.send(
                    new DeleteObjectCommand({
                        Bucket: process.env.STORAGE_BUCKET_NAME,
                        Key: `maps/${map1.name}.bsp`
                    })
                );
            } catch (err) {
                console.warn('WARNING: Failed to delete test map! Bucket likely now contains a junk map.');
            }
        });

        it('should respond with a 400 when no map file is provided', () => post(`maps/${map1.id}/upload`, 400, {}));

        it('should respond with a 403 when the submitterID does not match the userID', () =>
            postAttach(`maps/${map1.id}/upload`, 403, 'map.bsp', 'file', user2AccessToken));

        it('should respond with a 403 when the map is not accepting uploads', () =>
            postAttach(`maps/${map2.id}/upload`, 403, 'map.bsp', 'file', user2AccessToken));

        it('should respond with 401 when no access token is provided', () =>
            post(`maps/${map1.id}/upload`, 401, {}, null));
    });

    describe('The Big Chungie Create, Upload then Download Test', () =>
        it('should successfully create a map, upload it to the returned location, then download it', async () => {
            const res = await post('maps', 204, createMapObj());

            const inBuffer = readFileSync(__dirname + '/../files/map.bsp');
            const inHash = hash(inBuffer);

            const uploadURL = res.get('Location').replace('api/v1/', '');

            const res2 = await postAttach(uploadURL, 201, 'map.bsp');

            await new Promise((resolve) => setTimeout(resolve, 1000));

            const outBuffer = await axios
                .get(res2.body.downloadURL, { responseType: 'arraybuffer' })
                .then((res) => Buffer.from(res.data, 'binary'));
            const outHash = hash(outBuffer);

            expect(inHash).toBe(outHash);
        }));

    describe('GET maps/{mapID}', () => {
        const expects = (res) => expect(res.body).toBeValidDto(MapDto);
        const filter = (x) => x.id === map1.id;

        it('should respond with map data', async () => {
            const res = await get(`maps/${map1.id}`, 200);

            expects(res);
        });

        it('should respond with expanded map data using the credits expand parameter', () =>
            expandTest(`maps/${map1.id}`, expects, 'credits', false, filter));

        it('should respond with expanded map data using the info expand parameter', () =>
            expandTest(`maps/${map1.id}`, expects, 'info', false, filter));

        it('should respond with expanded map data using the submitter expand parameter', () =>
            expandTest(`maps/${map1.id}`, expects, 'submitter', false, filter));

        it('should respond with expanded map data using the images expand  parameter', () =>
            expandTest(`maps/${map1.id}`, expects, 'images', false, filter));

        it('should respond with expanded map data using the thumbnail expand  parameter', () =>
            expandTest(`maps/${map1.id}`, expects, 'thumbnail', false, filter));

        it('should respond with expanded map data using the stats expand info parameter', () =>
            expandTest(`maps/${map1.id}`, expects, 'stats', false, filter));

        it('should respond with expanded map data using the tracks expand info parameter', () =>
            expandTest(`maps/${map1.id}`, expects, 'tracks', false, filter));

        it("should respond with expanded map data if the map is in the logged in user's library when using the inLibrary expansion", () =>
            expandTest(`maps/${map1.id}`, expects, 'inLibrary', false, filter, 'libraryEntries'));

        it("should respond with expanded map data if the map is in the logged in user's library when using the inFavorites expansion", () =>
            expandTest(`maps/${map1.id}`, expects, 'inFavorites', false, filter, 'favorites'));

        it("should respond with the map's WR when using the worldRecord expansion", async () => {
            const res = await get(`maps/${map1.id}`, 200, { expand: 'worldRecord' });

            expects(res);

            expect(res.body.worldRecord).toBeValidDto(MapRankDto);
            expect(res.body.worldRecord.rank).toBe(1);
            expect(res.body.worldRecord.user.id).toBe(admin.id);
        });

        it("should respond with the logged in user's PB when using the personalBest expansion", async () => {
            const res = await get(`maps/${map1.id}`, 200, { expand: 'personalBest' });

            expects(res);

            expect(res.body.personalBest).toBeValidDto(MapRankDto);
            expect(res.body.personalBest.rank).toBe(2);
            expect(res.body.personalBest.user.id).toBe(user.id);
        });

        it('should respond properly with both personalBest and worldRecord expansions', async () => {
            const res = await get(`maps/${map1.id}`, 200, { expand: 'worldRecord,personalBest' });

            expects(res);

            expect(res.body.worldRecord).toBeValidDto(MapRankDto);
            expect(res.body.worldRecord.rank).toBe(1);
            expect(res.body.worldRecord.user.id).toBe(admin.id);
            expect(res.body.personalBest).toBeValidDto(MapRankDto);
            expect(res.body.personalBest.rank).toBe(2);
            expect(res.body.personalBest.user.id).toBe(user.id);
        });

        it('should respond with 404 when the map is not found', () => get('maps/6000000000', 404));

        it('should respond with 401 when no access token is provided', () => get('maps/' + map1.id, 401, {}, null));
    });

    describe('GET maps/{mapID}/info', () => {
        const expects = (res) => expect(res.body).toBeValidDto(MapInfoDto);

        it('should respond with map info', async () => {
            const res = await get(`maps/${map1.id}/info`, 200);

            expects(res);
        });

        it('should return 404 if the map is not found', () => get('maps/00091919/info', 404));

        it('should respond with 401 when no access token is provided', () =>
            get(`maps/${map1.id}/info`, 401, {}, null));
    });

    describe('PATCH maps/{mapID}/info', () => {
        const infoUpdate = {
            description: 'This map is EXTREME',
            youtubeID: '70vwJy1dQ0c',
            creationDate: '1999-02-06'
        };

        it('should update the map info', async () => {
            await patch(`maps/${map1.id}/info`, 204, infoUpdate);
            const newInfo = await (global.prisma as PrismaService).mapInfo.findUnique({ where: { mapID: map1.id } });

            expect(newInfo.creationDate).toEqual(new Date(infoUpdate.creationDate));
            expect(newInfo.description).toBe(infoUpdate.description);
            expect(newInfo.youtubeID).toBe(infoUpdate.youtubeID);
        });

        it('should return 400 if the date is invalid', () =>
            patch(`maps/${map1.id}/info`, 400, { creationDate: 'the other day' }));

        it('should return 400 if the youtube ID is invalid', () =>
            patch(`maps/${map1.id}/info`, 400, { youtubeID: 'https://www.youtube.com/watch?v=70vwJy1dQ0c' }));

        it('should return 400 if no update data is provided', () => patch(`maps/${map1.id}/info`, 400, {}));

        it('should return 404 if the map does not exist', () => patch('maps/1191137119/info', 404, infoUpdate));

        it('should return 403 if the map was not submitted by that user', () =>
            patch(`maps/${map1.id}/info`, 403, infoUpdate, user3AccessToken));

        it('should return 403 if the map is not in NEEDS_REVISION state', () =>
            patch(`maps/${map3.id}/info`, 403, infoUpdate, user3AccessToken));

        it('should return 403 if the user does not have the mapper role', () =>
            patch(`maps/${map4.id}/info`, 403, infoUpdate, user2AccessToken));

        it('should respond with 401 when no access token is provided', () =>
            patch(`maps/${map1.id}/info`, 401, infoUpdate, null));
    });

    describe('GET maps/{mapID}/credits', () => {
        const expects = (res) => res.body.forEach((x) => expect(x).toBeValidDto(MapCreditDto));

        it('should respond with the specified maps credits', async () => {
            const res = await get(`maps/${map1.id}/credits`, 200);
            expects(res);
            expect(res.body).toHaveLength(1);
        });

        it('should respond with the specified maps credits with the user expand parameter', async () => {
            const res = await get(`maps/${map1.id}/credits`, 200, { expand: 'user' });
            expects(res);
            res.body.forEach((x) => {
                expect(x.user).toBeValidDto(UserDto);
            });
        });

        it('should return 404 when no map credits found', () => get('maps/999999999999999/credits', 404));

        it('should respond with 401 when no access token is provided', () =>
            get(`maps/${map1.id}/credits`, 401, {}, null));
    });

    describe('POST maps/{mapID}/credits', () => {
        const newMapCredit = () => {
            return {
                type: MapCreditType.SPECIAL_THANKS,
                userID: admin.id
            };
        };

        const invalidMapCredit = {
            type: MapCreditType.COAUTHOR
        };

        const existingMapCredit = () => {
            return {
                type: map1.credits[0].type,
                userID: map1.credits[0].userID
            };
        };

        const noExistingUserMapCredit = {
            type: MapCreditType.SPECIAL_THANKS,
            userID: 11379991137
        };

        it('should create a map credit for the specified map', async () => {
            const res = await post(`maps/${map1.id}/credits`, 201, newMapCredit());
            expect(res.body).toBeValidDto(MapCreditDto);

            const changedMap = await (global.prisma as PrismaService).map.findUnique({
                where: {
                    id: map1.id
                },
                include: {
                    credits: true
                }
            });
            expect(changedMap.credits).toHaveLength(2);
            expect(changedMap.credits[1].userID).toBe(newMapCredit().userID);
            expect(changedMap.credits[1].type).toBe(newMapCredit().type);
        });

        it('should create an activity if a new author is added', async () => {
            await post(`maps/${map1.id}/credits`, 201, { type: MapCreditType.AUTHOR, userID: user3.id });
            const newActivity = await (global.prisma as PrismaService).activity.findFirst({
                where: {
                    userID: user3.id,
                    type: ActivityTypes.MAP_UPLOADED,
                    data: map1.id
                }
            });
            expect(newActivity);
        });

        it('should respond with 404 if the map is not found', () => post('maps/9999999/credits', 404, newMapCredit()));

        it('should respond with 403 if the user is not the map submitter', () =>
            post(`maps/${map1.id}/credits`, 403, newMapCredit(), user3AccessToken));

        it("should respond with 403 if the user doesn't have the mapper role", () =>
            post(`maps/${map4.id}/credits`, 403, newMapCredit(), user2AccessToken));

        it('should respond with 403 if the map is not in NEEDS_REVISION state', () =>
            post(`maps/${map3.id}/credits`, 403, newMapCredit(), user3AccessToken));

        it('should respond with 400 if the map credit object is invalid', () =>
            post(`maps/${map1.id}/credits`, 400, invalidMapCredit));

        it('should respond with 409 if the map credit already exists', () =>
            post(`maps/${map1.id}/credits`, 409, existingMapCredit()));

        it('should respond with 400 if the credited user does not exist', () =>
            post(`maps/${map1.id}/credits`, 400, noExistingUserMapCredit));

        it('should respond with 401 when no access token is provided', () =>
            post(`maps/${map1.id}/credits`, 401, newMapCredit(), null));
    });

    describe('GET maps/credits/{mapCreditID}', () => {
        const expects = (res) => expect(res.body).toBeValidDto(MapCreditDto);

        it('should return the specified map credit', async () => {
            const res = await get(`maps/credits/${map1.credits[0].id}`, 200);
            expects(res);
        });

        it('should return the specified map credit with the user expand parameter', () =>
            expandTest(`maps/credits/${map1.credits[0].id}`, expects, 'user'));

        it('should return a 404 if the map credit is not found', () => get('maps/credits/222', 404));

        it('should respond with 401 when no access token is provided', () =>
            get(`maps/credits/${map1.credits[0].id}`, 401, {}, null));
    });

    describe('PATCH maps/{mapID}/credits/{mapCreditID}', () => {
        const updatedMapCredit = () => {
            return {
                userID: user2.id,
                type: MapCreditType.TESTER
            };
        };
        it("should update the specified map credit's user and type", async () => {
            await patch(`maps/credits/${map1.credits[0].id}`, 204, updatedMapCredit());
            const updatedMap = await (global.prisma as PrismaService).map.findUnique({
                where: { id: map1.id },
                include: { credits: true }
            });
            expect(updatedMap.credits).toHaveLength(1);
            expect(updatedMap.credits[0].userID).toBe(user2.id);
            expect(updatedMap.credits[0].type).toBe(MapCreditType.TESTER);
        });

        it("should just update the specified map credit's type", () =>
            patch(`maps/credits/${map1.credits[0].id}`, 204, { type: MapCreditType.TESTER }));

        it("should just update the specified map credit's user", () =>
            patch(`maps/credits/${map1.credits[0].id}`, 204, { userID: user2.id }));

        it('should return 403 if the map was not submitted by that user', () =>
            patch(`maps/credits/${map1.credits[0].id}`, 403, updatedMapCredit(), user3AccessToken));

        it('should return 404 if the map credit was not found', () =>
            patch(`maps/credits/1024768`, 404, updatedMapCredit()));

        it('should respond with 400 when the map credit type is invalid', () =>
            patch(`maps/credits/${map1.credits[0].id}`, 400, { type: 'Author' }));

        it('should respond with 400 when the map credit user is invalid', () =>
            patch(`maps/credits/${map1.credits[0].id}`, 400, { userID: 'Momentum Man' }));

        it('should respond with 400 when no update data is provided', () =>
            patch(`maps/credits/${map1.credits[0].id}`, 400, {}));

        it('should respond with 403 if the map is not in NEEDS_REVISION state', () =>
            patch(`maps/credits/${map3.credits[0].id}`, 403, updatedMapCredit(), user3AccessToken));

        it('should respond with 403 if the user does not have the mapper role', () =>
            patch(`maps/credits/${map4.credits[0].id}`, 403, updatedMapCredit(), user2AccessToken));

        it('should respond with 400 if the credited user does not exist', () =>
            patch(`maps/credits/${map1.credits[0].id}`, 400, { userID: 123456789 }));

        it("should update the activities when an author credit's user is changed", async () => {
            await (global.prisma as PrismaService).activity.create({
                data: {
                    type: ActivityTypes.MAP_UPLOADED,
                    userID: map1.credits[0].userID,
                    data: map1.id
                }
            });

            await patch(`maps/credits/${map1.credits[0].id}`, 204, { userID: user2.id });

            const originalActivity = await (global.prisma as PrismaService).activity.findFirst({
                where: {
                    userID: user.id,
                    type: ActivityTypes.MAP_UPLOADED,
                    data: map1.id
                }
            });
            const newActivity = await (global.prisma as PrismaService).activity.findFirst({
                where: {
                    userID: user2.id,
                    type: ActivityTypes.MAP_UPLOADED,
                    data: map1.id
                }
            });
            expect(originalActivity).toBeNull();
            expect(newActivity);
        });

        it("should update the activities when an author credit's type is changed", async () => {
            await (global.prisma as PrismaService).activity.create({
                data: {
                    type: ActivityTypes.MAP_UPLOADED,
                    userID: map1.credits[0].userID,
                    data: map1.id
                }
            });

            await patch(`maps/credits/${map1.credits[0].id}`, 204, { type: MapCreditType.COAUTHOR });

            const originalActivity = await (global.prisma as PrismaService).activity.findFirst({
                where: {
                    userID: user.id,
                    type: ActivityTypes.MAP_UPLOADED,
                    data: map1.id
                }
            });
            expect(originalActivity).toBeNull();
        });

        it('should respond with 409 if the user tries to update a credit to be identical to another credit', async () => {
            const newCredit = await (global.prisma as PrismaService).mapCredit.create({
                data: {
                    user: { connect: { id: user3.id } },
                    map: { connect: { id: map1.id } },
                    type: MapCreditType.COAUTHOR
                }
            });
            await patch(`maps/credits/${newCredit.id}`, 409, { userID: user.id, type: MapCreditType.AUTHOR });
        });

        it('should respond with 401 when no access token is provided', () =>
            patch(`maps/credits/${map1.credits[0].id}`, 401, updatedMapCredit(), null));
    });

    describe('DELETE maps/credits/{mapCreditID}', () => {
        it('should delete the specified map credit', async () => {
            await del(`maps/credits/${map1.credits[0].id}`, 200);
            const updatedMap = await (global.prisma as PrismaService).map.findUnique({
                where: { id: map1.id },
                include: { credits: true }
            });
            expect(updatedMap.credits).toHaveLength(0);
        });

        it('should remove the activity when an author credit is deleted', async () => {
            await (global.prisma as PrismaService).activity.create({
                data: {
                    type: ActivityTypes.MAP_UPLOADED,
                    userID: map1.credits[0].userID,
                    data: map1.id
                }
            });
            await del(`maps/credits/${map1.credits[0].id}`, 200);
            const activity = await (global.prisma as PrismaService).activity.findFirst({
                where: {
                    userID: user.id,
                    type: ActivityTypes.MAP_UPLOADED,
                    data: map1.id
                }
            });
            expect(activity).toBeNull();
        });

        it('should return 403 if the map was not submitted by that user', () =>
            del(`maps/credits/${map1.credits[0].id}`, 403, user3AccessToken));

        it('should return 403 if the map is not in NEEDS_REVISION state', () =>
            del(`maps/credits/${map3.credits[0].id}`, 403, user3AccessToken));

        it('should return 403 if the user does not have the mapper role', () =>
            del(`maps/credits/${map4.credits[0].id}`, 403, user2AccessToken));

        it('should return 404 if the map credit was not found', () => del('maps/credits/1024768', 404));

        it('should respond with 401 when no access token is provided', () =>
            del(`maps/credits/${map1.credits.id}`, 401, null));
    });

    describe('GET /maps/{mapID}/zones', () => {
        const expects = (res) => res.body.forEach((x) => expect(x).toBeValidDto(MapTrackDto));
        it('should respond with the map zones', async () => {
            const res = await get(`maps/${map1.id}/zones`, 200);
            expects(res);
            expect(res.body).toHaveLength(1);
            expect(res.body[0]).toHaveProperty('zones');
        });

        it('should increase the maps plays by 1 (??)', async () => {
            const mapstats = await (global.prisma as PrismaService).mapStats.findFirst({
                where: {
                    mapID: map1.id
                }
            });
            expect(mapstats.plays).toBe(0);

            await get(`maps/${map1.id}/zones`, 200);
            const newstats = await (global.prisma as PrismaService).mapStats.findFirst({
                where: {
                    mapID: map1.id
                }
            });
            expect(newstats.plays).toBe(1);
        });

        it('should respond with 404 if the map does not exist', () => get('maps/987654321/zones', 404));

        it('should respond with 401 when no access token is provided', () =>
            get(`maps/${map1.id}/zones`, 401, {}, null));
    });

    describe('PUT /maps/{mapID}/thumbnail', () => {
        it('should upload and update the thumbnail for a map', async () => {
            await request(global.server)
                .put(`maps /${map1.id}/thumbnail`)
                .set('Accept', 'application/json')
                .set('Authorization', 'Bearer ' + global.accessToken)
                .attach('thumbnailFile', readFileSync('test/testImage.jpg'), 'testImage.jpg')
                .expect(204);
        });

        it('should return a 400 if no thumbnail file is provided', async () => {
            await request(global.server)
                .put(`maps /${map1.id}/thumbnail`)
                .set('Accept', 'application/json')
                .set('Authorization', 'Bearer ' + global.accessToken)
                .expect(400);
        });

        it('should return a 403 if the submitter ID does not match the userId', async () => {
            await request(global.server)
                .put(`maps /${map1.id}/thumbnail`)
                .set('Accept', 'application/json')
                .set('Authorization', 'Bearer ' + 1) // decide a sensible access token to use here
                .attach('thumbnailFile', readFileSync('test/testImage.jpg'), 'testImage.jpg')
                .expect(403);
        });

        it('should respond with 401 when no access token is provided', async () => {
            await request(global.server)
                .put(`maps /${map1.id}/thumbnail`)
                .set('Accept', 'application/json')
                .attach('thumbnailFile', readFileSync('test/testImage.jpg'), 'testImage.jpg')
                .expect(401);
        });
    });

    describe('POST /maps/{mapID}/images', () => {
        it('should create a map image for the specified map', async () => {
            await request(global.server)
                .post(`maps /${map1.id}/images`)
                .attach('mapImageFile', readFileSync('test/testImage.jpg'), 'testImage.jpg')
                .set('Accept', 'application/json')
                .set('Authorization', 'Bearer ' + global.accessToken)
                .expect(200);
        });

        it('should respond with 401 when no access token is provided', () => post(`maps /${map1.id}/images`, 401));
    });

    describe('GET maps/{mapID}/images', () => {
        it('should respond with a list of images', async () => {
            const res = await get(`maps/${map1.id}/images`, 200);

            expect(res.body.images[0]).toHaveProperty('small');
            expect(res.body.images[0]).toHaveProperty('medium');
            expect(res.body.images[0]).toHaveProperty('large');
            expect(res.body.images[0]).toHaveProperty('mapID');
        });

        it('should respond with 401 when no access token is provided', () => get(`maps/${map1.id}/images`, 401));
    });

    describe('GET maps/{mapID}/images/{imgID}', () => {
        // Don't know why this is failing
        it('should respond with 404 when the image is not found', () => get(`maps/${map1.id}/images/12345`, 404));

        it('should respond with image info', async () => {
            const res = await get(`maps /${map1.id}/images/${map1.images.id}`, 200);

            expect(res.body).toBeValidDto(MapImageDto);
            expect(res.body.mapID).toEqual(map1.id);
        });

        it('should respond with 401 when no access token is provided', () =>
            get(`maps /${map1.id}/images/${map1.images.id}`, 401));
    });

    describe('PUT maps/{mapID}/images/{imgID}', () => {
        it('should respond with 404 when the image is not found', async () => {
            const file = readFileSync('test/testImage2.jpg');
            const res = await request(global.server)
                .put(`maps /${map1.id}/images/99`)
                .attach('mapImageFile', file, 'testImage2.jpg')
                .expect(200);

            expect(res.body).toHaveProperty('error');
            expect(res.body.error.code).toEqual(404);
            expect(typeof res.body.error.message).toBe('string');
        });

        it('should respond with 400 when no map image is provided', async () => {
            const res = await request(global.server)
                .put(`maps/${map1.id}/images/${map1.images[0].id}`)
                .type('form')
                .expect(400);

            expect(res.body).toHaveProperty('error');
            expect(res.body.error.code).toEqual(400);
            expect(typeof res.body.error.message).toBe('string');
        });

        it('should update the map image', async () => {
            await request(global.server)
                .put(`maps /${map1.id}/images/${map1.images[0].id}`)
                .attach('mapImageFile', readFileSync('test/testImage2.jpg'), 'testImage2.jpg')
                .expect(204);
        });

        it('should respond with 401 when no access token is provided', () =>
            put(`maps /${map1.id}/images/${map1.images.id}`, 401));
    });

    describe('DELETE maps/{mapID}/images/{imgID}', () => {
        it('should delete the map image', () => del(`maps /${map1.id}/images/${map1.images[0].id}`, 204));

        it('should respond with 401 when no access token is provided', () =>
            del(`maps /${map1.id}/images/${map1.images.id}`, 401));
    });

    describe('GET maps/{mapID}/runs', () => {
        const expects = (res) => expect(res.body).toBeValidPagedDto(RunDto);

        it('should return run files for the specified map', async () => {
            const res = await get(`maps/${map1.id}/runs`, 200);

            expects(res);

            expect(res.body.totalCount).toBeGreaterThanOrEqual(2);
            expect(res.body.returnCount).toBeGreaterThanOrEqual(2);
        });

        it('should respond with filtered map data using the take parameter', () =>
            takeTest(`maps/${map1.id}/runs`, expects));

        it('should respond with filtered map data using the skip parameter', () =>
            skipTest(`maps/${map1.id}/runs`, expects));

        it('should respond with a list of runs filtered by userID parameter', async () => {
            const res = await get(`maps/${map1.id}/runs`, 200, { userID: user.id });

            expects(res);

            expect(res.body.totalCount).toBe(2);
            expect(res.body.returnCount).toBe(2);
            expect(res.body.response[0].userID).toBe(user.id);
        });

        it('should respond with a list of runs filtered by a list of user ids', async () => {
            const ids = user.id + ',' + admin.id;
            const res = await get(`maps/${map1.id}/runs`, 200, { userIDs: ids });

            expects(res);

            expect(res.body.totalCount).toBe(3);
            expect(res.body.returnCount).toBe(3);
            expect(ids).toContain(res.body.response[0].userID.toString());
        });

        it('should respond with a list of runs filtered by flags', async () => {
            const res = await get(`maps/${map1.id}/runs`, 200, { flags: 123 });

            expects(res);

            expect(res.body.totalCount).toBe(1);
            expect(res.body.response[0].flags).toBe(run2.flags); // This uses strict equality for now, but will change in 0.10.0
        });

        it('should respond with a list of runs with the map include', () => expandTest('runs', expects, 'map', true));

        it('should respond with a list of runs with the rank include', async () => {
            const res = await get(`maps/${map1.id}/runs`, 200, { expand: 'rank' });

            expects(res);

            expect(res.body.totalCount).toBeGreaterThanOrEqual(3);
            expect(res.body.returnCount).toBeGreaterThanOrEqual(3);
            expect(res.body.response.filter((x) => x.hasOwnProperty('rank')).length).toBe(2); // 2 test runs have a rank, so we should see 2 in the response
        });

        it('should respond with a list of runs with the zoneStats include', () =>
            expandTest(`maps/${map1.id}/runs`, expects, 'zoneStats', true));

        it('should respond with a list of runs with the overallStats include', () =>
            expandTest(`maps/${map1.id}/runs`, expects, 'overallStats', true));

        it('should respond with a list of runs with the mapWithInfo include', async () => {
            const res = await get(`maps/${map1.id}/runs`, 200, { expand: 'mapWithInfo' });

            expects(res);

            res.body.response.forEach((x) => expect(x.map).toHaveProperty('info'));
        });

        it('should respond with a list of runs that are personal bests', async () => {
            const res = await get(`maps/${map1.id}/runs`, 200, { isPB: true, expand: 'rank' });

            expects(res);

            expect(res.body.totalCount).toBeGreaterThanOrEqual(2);
            expect(res.body.returnCount).toBeGreaterThanOrEqual(2);
            res.body.response.forEach((x) => {
                expect(x).toHaveProperty('rank');
                expect(x.id).not.toBe(run3.id);
            });
        });

        it('should respond with a list of runs sorted by date', async () => {
            const res = await get(`maps/${map1.id}/runs`, 200, { order: 'date' });

            expects(res);

            const sortedRes = [...res.body.response];
            sortedRes.sort((n1, n2) => new Date(n2.createdAt).getTime() - new Date(n1.createdAt).getTime());

            expect(res.body.response).toEqual(sortedRes);
        });

        it('should respond with a list of runs sorted by time', async () => {
            const res = await get(`maps/${map1.id}/runs`, 200, { order: 'time' });

            expects(res);

            const sortedRes = [...res.body.response];
            sortedRes.sort((n1, n2) => n1.ticks - n2.ticks);

            expect(res.body.response).toEqual(sortedRes);
        });

        it('should respond with 401 when no access token is provided', () =>
            get(`maps/${map1.id}/runs`, 401, {}, null));
    });

    describe('GET maps/{mapID}/runs/{runID}', () => {
        it('should return the specified run', async () => {
            const res = await get(`maps /${map1.id}/runs/1`, 200);

            expect(res.body).toBeValidDto(RunDto);
        });

        it('should respond with 401 when no access token is provided', () => get(`maps/${map1.id}/runs/1`, 401));
    });

    describe('GET maps/{mapID}/runs/{runID}/download', () => {
        it('should download the run', async () => {
            await get(`maps /${map1.id}/runs/1/download`, 200);
        });

        it('should respond with 401 when no access token is provided', () =>
            get(`maps/${map1.id}/runs/1/download`, 401));
    });
});
