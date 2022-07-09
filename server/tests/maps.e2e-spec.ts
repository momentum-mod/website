// noinspection DuplicatedCode
import * as request from 'supertest';
import { readFileSync } from 'fs';
import { AuthService } from '../src/modules/auth/auth.service';
import { PrismaService } from '../src/modules/repo/prisma.service';
import { MapStatus, MapCreditType, MapType } from '../src/@common/enums/map.enum';
import { Roles } from '../src/@common/enums/user.enum';
import { MapDto } from '../src/@common/dto/map/map.dto';
import { del, expandTest, get, patch, post, put, skipTest, takeTest } from './testutil';
import { MapInfoDto } from '../src/@common/dto/map/map-info.dto';
import { MapCreditDto } from '../src/@common/dto/map/map-credit.dto';
import { MapImageDto } from '../src/@common/dto/map/map-image.dto';
import { RunDto } from '../src/@common/dto/run/runs.dto';
import { MapRankDto } from '../src/@common/dto/map/map-rank.dto';
import { ActivityTypes } from '../src/@common/enums/activity.enum';

describe('Maps', () => {
    let user,
        admin,
        user2,
        user3,
        run1,
        run2,
        map,
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
                roles: Roles.VERIFIED | Roles.MAPPER,
                profile: { create: {} }
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
                roles: Roles.MAPPER
            }
        });

        admin = await prisma.user.create({
            data: {
                steamID: '54132121685476543',
                alias: 'Fred Weasley',
                roles: Roles.ADMIN,
                profile: { create: {} }
            }
        });

        map = await prisma.map.create({
            data: {
                name: 'maps_test1',
                type: MapType.SURF,
                statusFlag: MapStatus.APPROVED,
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

        map = await prisma.map.update({
            where: { id: map.id },
            data: { mainTrack: { connect: { id: map.tracks[0].id } } }
        });

        const img = await prisma.mapImage.findFirst({ where: { mapID: map.id } });

        map = await prisma.map.update({
            where: { id: map.id },
            data: {
                thumbnail: {
                    connect: {
                        id: img.id
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
            data: { mainTrack: { connect: { id: map3.tracks[0].id } } }
        });

        map4 = await prisma.map.create({
            data: {
                name: 'maps_test4',
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
            data: { mainTrack: { connect: { id: map4.tracks[0].id } } }
        });

        await prisma.map.createMany({
            data: Array(5)
                .fill(0)
                .map((_, i) => {
                    return {
                        name: `pending_test${i}`,
                        type: MapType.BHOP,
                        statusFlag: MapStatus.PENDING,
                        submitterID: user3.id
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
                map: { connect: { id: map.id } },
                player: { connect: { id: admin.id } },
                trackNum: 1,
                zoneNum: 1,
                ticks: 10000,
                tickRate: 100,
                flags: 0,
                file: '',
                hash: '',
                rank: {
                    create: {
                        map: { connect: { id: map.id } },
                        user: { connect: { id: admin.id } },
                        rank: 1,
                        gameType: MapType.SURF
                    }
                }
            }
        });

        run2 = await prisma.run.create({
            data: {
                map: { connect: { id: map.id } },
                player: { connect: { id: user.id } },
                trackNum: 1,
                zoneNum: 1,
                ticks: 20000,
                tickRate: 100,
                flags: 0,
                file: '',
                hash: '',
                rank: {
                    create: {
                        map: { connect: { id: map.id } },
                        user: { connect: { id: user.id } },
                        rank: 2,
                        gameType: MapType.SURF
                    }
                }
            }
        });

        await prisma.mapLibraryEntry.create({
            data: {
                user: { connect: { id: user.id } },
                map: { connect: { id: map.id } }
            }
        });

        await prisma.mapFavorite.create({
            data: {
                user: { connect: { id: user.id } },
                map: { connect: { id: map.id } }
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
                    { id: { in: [map.id, map2.id, map3.id, map4.id] } },
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
        const filter = (x) => x.id === map.id;

        it('should respond with map data', async () => {
            const res = await get('maps', 200);

            expects(res);
            expect(res.body.totalCount).toBeGreaterThanOrEqual(4);
            expect(res.body.returnCount).toBeGreaterThanOrEqual(4);
        });

        it('should respond with filtered map data using the take parameter', () => takeTest('maps', expects));

        it('should respond with filtered map data using the skip parameter', () => skipTest('maps', expects));

        it('should respond with filtered map data using the search parameter', async () => {
            const res = await get('maps', 200, { search: map.name });

            expects(res);
            expect(res.body.totalCount).toEqual(1);
            expect(res.body.returnCount).toEqual(1);
            expect(res.body.response[0].name).toBe(map.name);
        });

        it('should respond with filtered map data using the submitter id parameter', async () => {
            const res = await get('maps', 200, { submitterID: user.id });

            expects(res);
            expect(res.body.totalCount).toEqual(1);
            expect(res.body.returnCount).toEqual(1);
            expect(res.body.response[0].submitterID).toBe(map.submitterID);
        });

        it('should respond with filtered map data based on the map type', async () => {
            const res = await get('maps', 200, { type: map.type });

            expects(res);
            expect(res.body.totalCount).toEqual(1);
            expect(res.body.returnCount).toEqual(1);
            expect(res.body.response[0].type).toBe(map.type);
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

            await post('maps', 204, mapObj);

            const map = await (global.prisma as PrismaService).map.findFirst({
                where: { name: mapObj.name },
                include: {
                    info: true,
                    stats: true,
                    credits: true,
                    mainTrack: true,
                    tracks: { include: { zones: { include: { triggers: { include: { properties: true } } } } } }
                }
            });

            expect(map.name).toBe(mapObj.name);
            expect(map).toHaveProperty('info');
            expect(map.info.description).toBe(mapObj.info.description);
            expect(map.info.numTracks).toBe(mapObj.info.numTracks);
            expect(map.info.creationDate.toJSON()).toBe(mapObj.info.creationDate);
            expect(map.submitterID).toBe(user.id);
            expect(map.credits[0].userID).toBe(user.id);
            expect(map.credits[0].type).toBe(MapCreditType.AUTHOR);
            expect(map).toHaveProperty('tracks');
            expect(map.tracks).toHaveLength(2);
            expect(map.mainTrack.id).toBe(map.tracks.find((track) => track.trackNum === 0).id);
            map.tracks.forEach((track) => {
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

        it('should create map upload activities for the map authors', async () => {
            const mapObj = createMapObj();

            await post('maps', 204, mapObj);

            const map = await (global.prisma as PrismaService).map.findFirst({ where: { name: mapObj.name } });

            const activity = await (global.prisma as PrismaService).activity.findFirst({ where: { userID: user.id } });

            expect(activity.type).toBe(ActivityTypes.MAP_UPLOADED);
            expect(activity.data).toBe(BigInt(map.id));
        });

        it('set the Location property in the response header on creation', async () => {
            const mapObj = createMapObj();

            const res = await post('maps', 204, mapObj);

            const map = await (global.prisma as PrismaService).map.findFirst({ where: { name: mapObj.name } });

            expect(res.get('Location')).toBe(`api/v1/maps/${map.id}/upload`);
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
            post('maps', 409, { ...createMapObj(), name: map.name }, user3AccessToken));

        it('should respond with 409 if the submitter already have 5 or more pending maps', () =>
            post('maps', 409, createMapObj(), user3AccessToken));

        it('should respond with 403 when the user does not have the mapper role', () =>
            post('maps', 403, mapObj, user2AccessToken));

        it('should respond with 401 when no access token is provided', () => post('maps', 401, mapObj, null));
    });

    describe('GET maps/{mapID}', () => {
        const expects = (res) => expect(res.body).toBeValidDto(MapDto);
        const filter = (x) => x.id === map.id;

        it('should respond with map data', async () => {
            const res = await get(`maps/${map.id}`, 200);

            expects(res);
        });

        it('should respond with expanded map data using the credits expand parameter', () =>
            expandTest(`maps/${map.id}`, expects, 'credits', false, filter));

        it('should respond with expanded map data using the info expand parameter', () =>
            expandTest(`maps/${map.id}`, expects, 'info', false, filter));

        it('should respond with expanded map data using the submitter expand parameter', () =>
            expandTest(`maps/${map.id}`, expects, 'submitter', false, filter));

        it('should respond with expanded map data using the images expand  parameter', () =>
            expandTest(`maps/${map.id}`, expects, 'images', false, filter));

        it('should respond with expanded map data using the thumbnail expand  parameter', () =>
            expandTest(`maps/${map.id}`, expects, 'thumbnail', false, filter));

        it('should respond with expanded map data using the stats expand info parameter', () =>
            expandTest(`maps/${map.id}`, expects, 'stats', false, filter));

        it('should respond with expanded map data using the tracks expand info parameter', () =>
            expandTest(`maps/${map.id}`, expects, 'tracks', false, filter));

        it("should respond with expanded map data if the map is in the logged in user's library when using the inLibrary expansion", () =>
            expandTest(`maps/${map.id}`, expects, 'inLibrary', false, filter, 'libraryEntries'));

        it("should respond with expanded map data if the map is in the logged in user's library when using the inFavorites expansion", () =>
            expandTest(`maps/${map.id}`, expects, 'inFavorites', false, filter, 'favorites'));

        it("should respond with the map's WR when using the worldRecord expansion", async () => {
            const res = await get(`maps/${map.id}`, 200, { expand: 'worldRecord' });

            expects(res);

            expect(res.body.worldRecord).toBeValidDto(MapRankDto);
            expect(res.body.worldRecord.rank).toBe(1);
            expect(res.body.worldRecord.user.id).toBe(admin.id);
        });

        it("should respond with the logged in user's PB when using the personalBest expansion", async () => {
            const res = await get(`maps/${map.id}`, 200, { expand: 'personalBest' });

            expects(res);

            expect(res.body.personalBest).toBeValidDto(MapRankDto);
            expect(res.body.personalBest.rank).toBe(2);
            expect(res.body.personalBest.user.id).toBe(user.id);
        });

        it('should respond properly with both personalBest and worldRecord expansions', async () => {
            const res = await get(`maps/${map.id}`, 200, { expand: 'worldRecord,personalBest' });

            expects(res);

            expect(res.body.worldRecord).toBeValidDto(MapRankDto);
            expect(res.body.worldRecord.rank).toBe(1);
            expect(res.body.worldRecord.user.id).toBe(admin.id);
            expect(res.body.personalBest).toBeValidDto(MapRankDto);
            expect(res.body.personalBest.rank).toBe(2);
            expect(res.body.personalBest.user.id).toBe(user.id);
        });

        it('should respond with 404 when the map is not found', () => get('maps/6000000000', 404));

        it('should respond with 401 when no access token is provided', () => get('maps/' + map.id, 401, {}, null));
    });

    describe('GET maps/{mapID}/info', () => {
        const expects = (res) => expect(res.body).toBeValidDto(MapInfoDto);

        it('should respond with map info', async () => {
            const res = await get(`maps/${map.id}/info`, 200);

            expects(res);
        });

        it('should return 404 if the map is not found', () => get('maps/00091919/info', 404));

        it('should respond with 401 when no access token is provided', () => get(`maps/${map.id}/info`, 401));
    });

    describe('PATCH maps/{mapID}/info', () => {
        // TODO: bad name
        it('should respond with map info', async () => {
            const res = await patch(`maps/${map.id}/info`, 204, {
                description: 'testnewdesc'
            });
        });

        // old comments below. wtf is going on here
        // swagger says this should return 404 if the map is not found,
        // but it won't get past the check for if the map was submitted
        // by that user or not
        it('should return 403 if the map was not submitted by that user', () => patch('maps/00091919/info', 403));

        it('should respond with 401 when no access token is provided', () => patch(`maps/${map.id}/info`, 401));
    });

    describe('GET maps/{mapID}/credits', () => {
        const expects = (res) => expect(res.body).toBeValidDto(MapCreditDto);

        it('should respond with the specified maps credits', async () => {
            const res = await get(`maps/${map.id}/credits`, 200);

            expects(res);
        });

        it('should respond with the specified maps credits with the user expand parameter', () =>
            expandTest(`maps/${map.id}/credits`, expects, 'user'));

        // should this return a 404 instead of a 200?
        // i agree with the ancient comment - tom
        it('should return 200 with an empty array', async () => {
            const res = await get('maps/999999999999999/credits', 200);

            expect(res.body.mapCredits).toHaveLength(0);
        });

        it('should respond with 401 when no access token is provided', () => get(`maps/${map.id}/credits`, 401));
    });

    // Note: will only create one credit. if a map has an existing credit than it wont make another
    // ^ WHY????????
    describe('POST maps/{mapID}/credits', () => {
        it('should create a map credit for the specified map', async () => {
            const res = await post(`maps/${map.id}/credits`, 200, {
                type: MapCreditType.SPECIAL_THANKS,
                userID: admin.id
            });

            expect(res.body).toBeValidDto(MapCreditDto);
        });

        it('should respond with 401 when no access token is provided', () => post(`maps/${map.id}/credits`, 401));
    });

    describe('GET maps/{mapID}/credits/{mapCreditID}', () => {
        const expects = (res) => expect(res.body).toBeValidDto(MapCreditDto);

        it('should return the map credit of the specified map', async () => {
            // ????????? whjat is this url??????
            const res = await get(`maps/${map.id}/credits/${map.credits.id}`, 200);

            expects(res);
        });

        it('should return the map credit of the specified map with the user expand parameter', () =>
            expandTest(`maps/${map.id}/credits/${map.credits.id}`, expects, 'user'));

        it('should return a 404 if the map is not found', () => get('maps/20090909/credits/222', 404));

        it('should respond with 401 when no access token is provided', () =>
            get(`maps/${map.id}/credits/${map.credits.id}`, 401));
    });

    describe('PATCH maps/{mapID}/credits/{mapCreditID}', () => {
        it('should update the specified map credit', async () => {
            const res = await patch(` maps /${map.id}/credits/${map.credits.id}`, 204, {
                type: MapCreditType.TESTER,
                userID: admin.id
            });
        });

        it('should return 403 if the map was not submitted by that user', () =>
            patch('maps/3938282929/credits/234532', 403, {
                type: MapCreditType.AUTHOR,
                userID: admin.id
            }));

        it('should respond with 401 when no access token is provided', () =>
            patch(`maps/${map.id}/credits/${map.credits.id}`, 401));
    });

    describe('DELETE maps/{mapID}/credits/{mapCreditID}', () => {
        it('should delete the specified map credit', async () => {
            await del(`maps /${map.id}/credits/${map.credits.id}`, 200);
        });

        it('should respond with 401 when no access token is provided', () =>
            del(`maps/${map.id}/credits/${map.credits.id}`, 401));
    });

    describe('PUT /maps/{mapID}/thumbnail', () => {
        it('should upload and update the thumbnail for a map', async () => {
            await request(global.server)
                .put(`maps /${map.id}/thumbnail`)
                .set('Accept', 'application/json')
                .set('Authorization', 'Bearer ' + global.accessToken)
                .attach('thumbnailFile', readFileSync('test/testImage.jpg'), 'testImage.jpg')
                .expect(204);
        });

        it('should return a 400 if no thumbnail file is provided', async () => {
            await request(global.server)
                .put(`maps /${map.id}/thumbnail`)
                .set('Accept', 'application/json')
                .set('Authorization', 'Bearer ' + global.accessToken)
                .expect(400);
        });

        it('should return a 403 if the submitter ID does not match the userId', async () => {
            await request(global.server)
                .put(`maps /${map.id}/thumbnail`)
                .set('Accept', 'application/json')
                .set('Authorization', 'Bearer ' + 1) // decide a sensible access token to use here
                .attach('thumbnailFile', readFileSync('test/testImage.jpg'), 'testImage.jpg')
                .expect(403);
        });

        it('should respond with 401 when no access token is provided', async () => {
            await request(global.server)
                .put(`maps /${map.id}/thumbnail`)
                .set('Accept', 'application/json')
                .attach('thumbnailFile', readFileSync('test/testImage.jpg'), 'testImage.jpg')
                .expect(401);
        });
    });

    describe('POST /maps/{mapID}/images', () => {
        it('should create a map image for the specified map', async () => {
            await request(global.server)
                .post(`maps /${map.id}/images`)
                .attach('mapImageFile', readFileSync('test/testImage.jpg'), 'testImage.jpg')
                .set('Accept', 'application/json')
                .set('Authorization', 'Bearer ' + global.accessToken)
                .expect(200);
        });

        it('should respond with 401 when no access token is provided', () => post(`maps /${map.id}/images`, 401));
    });

    describe('GET maps/{mapID}/upload', () => {
        it('should respond with the location for where to upload the map file', () =>
            get(`maps/${map.id}/upload`, 204));

        it('should respond with 401 when no access token is provided', () => get(`maps/${map.id}/upload`, 401));
    });

    describe('POST /maps/{mapID}/upload', () => {
        it('should respond with a 400 when no map file is provided', () =>
            request(global.server).post(`maps/${map.id}/upload`).type('form').send(null).expect(404));

        it('should respond with a 403 when the submitterID does not match the userID', () =>
            request(global.server)
                .post(`maps/12133122/upload`)
                .attach('mapFile', readFileSync('test/map1.bsp'), 'map1.bsp')
                .expect(403));

        // ??? isnt this the same as below?
        it('should respond with a 409 when the map is not accepting uploads', () =>
            request(global.server)
                .post(`maps/${map.id}/upload`)
                .attach('mapFile', readFileSync('test/map1.bsp'), 'map1.bsp')
                .expect(409));

        it('should upload the map file', () =>
            request(global.server)
                .post(`maps/${map.id}/upload`)
                .attach('mapFile', readFileSync('test/map1.bsp'), 'map1.bsp')
                .expect(200));

        it('should respond with 401 when no access token is provided', () => post(`maps/${map.id}/upload`, 401, null));
    });

    describe('GET maps/{mapID}/download', () => {
        it('should respond with a 404 when the map is not found', () => get('maps/12345/download', 404));

        // ???? this is all???
        it('should download the map file', async () => {
            const res = await get(`maps/${map.id}/download`, 200);
        });

        it('should respond with 401 when no access token is provided', () => get(`maps/${map.id}/download`, 401));
    });

    describe('GET maps/{mapID}/images', () => {
        it('should respond with a list of images', async () => {
            const res = await get(`maps/${map.id}/images`, 200);

            expect(res.body.images[0]).toHaveProperty('small');
            expect(res.body.images[0]).toHaveProperty('medium');
            expect(res.body.images[0]).toHaveProperty('large');
            expect(res.body.images[0]).toHaveProperty('mapID');
        });

        it('should respond with 401 when no access token is provided', () => get(`maps/${map.id}/images`, 401));
    });

    describe('GET maps/{mapID}/images/{imgID}', () => {
        // Don't know why this is failing
        it('should respond with 404 when the image is not found', () => get(`maps/${map.id}/images/12345`, 404));

        it('should respond with image info', async () => {
            const res = await get(`maps /${map.id}/images/${map.images.id}`, 200);

            expect(res.body).toBeValidDto(MapImageDto);
            expect(res.body.mapID).toEqual(map.id);
        });

        it('should respond with 401 when no access token is provided', () =>
            get(`maps /${map.id}/images/${map.images.id}`, 401));
    });

    describe('PUT maps/{mapID}/images/{imgID}', () => {
        it('should respond with 404 when the image is not found', async () => {
            const file = readFileSync('test/testImage2.jpg');
            const res = await request(global.server)
                .put(`maps /${map.id}/images/99`)
                .attach('mapImageFile', file, 'testImage2.jpg')
                .expect(200);

            expect(res.body).toHaveProperty('error');
            expect(res.body.error.code).toEqual(404);
            expect(typeof res.body.error.message).toBe('string');
        });

        it('should respond with 400 when no map image is provided', async () => {
            const res = await request(global.server)
                .put(`maps/${map.id}/images/${map.images[0].id}`)
                .type('form')
                .expect(400);

            expect(res.body).toHaveProperty('error');
            expect(res.body.error.code).toEqual(400);
            expect(typeof res.body.error.message).toBe('string');
        });

        it('should update the map image', async () => {
            await request(global.server)
                .put(`maps /${map.id}/images/${map.images[0].id}`)
                .attach('mapImageFile', readFileSync('test/testImage2.jpg'), 'testImage2.jpg')
                .expect(204);
        });

        it('should respond with 401 when no access token is provided', () =>
            put(`maps /${map.id}/images/${map.images.id}`, 401));
    });

    describe('DELETE maps/{mapID}/images/{imgID}', () => {
        it('should delete the map image', () => del(`maps /${map.id}/images/${map.images[0].id}`, 204));

        it('should respond with 401 when no access token is provided', () =>
            del(`maps /${map.id}/images/${map.images.id}`, 401));
    });

    describe('POST maps/{mapID}/runs', () => {
        it('should upload a run file', async () => {
            await request(global.server)
                .post(`maps/${map.id}/runs`)
                .set('Content-Type', 'application/octet-stream')
                .send(readFileSync('test/testRun.momrec'))
                .expect(200);
        });

        it('should respond with 401 when no access token is provided', () =>
            request(global.server)
                .post(`maps /${map.id}/runs`)
                .set('Content-Type', 'application/octet-stream')
                .send(readFileSync('test/testRun.momrec'))
                .expect(401));
    });

    describe('GET maps/{mapID}/runs', () => {
        it('should return run files for the specified map', async () => {
            // why do this???
            await request(global.server)
                .post(`maps /${map.id}/runs`)
                .set('Content-Type', 'application/octet-stream')
                .send(readFileSync('test/testRun.momrec'))
                .expect(401);

            const res = await get(` maps/${map.id}/runs`, 200);

            expect(res.body).toBeValidPagedDto(RunDto);
            expect(res.body.totalCount).toBe(2);
            expect(res.body.returnCount).toBe(2);
        });

        // TODO: skip/take tests i guess

        it('should respond with 401 when no access token is provided', () => get(`maps/${map.id}/runs`, 401));
    });

    describe('GET maps/{mapID}/runs/{runID}', () => {
        it('should return the specified run', async () => {
            const res = await get(`maps /${map.id}/runs/1`, 200);

            expect(res.body).toBeValidDto(RunDto);
        });

        it('should respond with 401 when no access token is provided', () => get(`maps/${map.id}/runs/1`, 401));
    });

    describe('GET maps/{mapID}/runs/{runID}/download', () => {
        it('should download the run', async () => {
            await get(`maps /${map.id}/runs/1/download`, 200);
        });

        it('should respond with 401 when no access token is provided', () =>
            get(`maps/${map.id}/runs/1/download`, 401));
    });

    describe('POST maps/:mapID/session', () => {
        it('should return 403 if not using a game API key', async () => post(`maps /${map.id}/session`, 403));

        // bunch of tests were using "testAdminGame.accessToken", no idea why it has to be an admin
        it('should should not create a run session if not given a proper body', () =>
            post(`maps/${map.id}/session`, 400, null, gameAdminAccessToken));

        it('should return a valid run session object', async () => {
            const res = await post(
                `maps/${map.id}/session`,
                200,
                {
                    trackNum: 0,
                    zoneNum: 0
                },
                gameAdminAccessToken
            );

            // TODO: dto for this
            expect(res.body).toHaveProperty('id');
        });

        it('should not create a valid run session if the map does not have the trackNum', () =>
            post(
                `maps/${map.id}/session`,
                400,
                {
                    trackNum: 2,
                    zoneNum: 0
                },
                gameAdminAccessToken
            ));
    });

    describe('DELETE maps/:mapID/session', () => {
        // ?????????????????????
        // NICE JOB EVERYONE GREAT TESTS (╬▔皿▔)╯
        it('should return 403 if not using a game API key', () => del(`maps/${map.id}/session`, 403));
    });

    describe('POST maps/:mapID/session/:sesID', () => {
        it('should return 403 if not using a game API key', () => post(`maps/${map.id}/session/1`, 403));

        it('should update an existing run session with the zone and tick', async () => {
            const res = await post(
                `maps/${map.id}/session`,
                200,
                {
                    trackNum: 0,
                    zoneNum: 0
                },
                gameAdminAccessToken
            );

            expect(res.body).toHaveProperty('id');

            const sesID = res.body.id;
            const res2 = await post(
                `maps/${map.id}/session/${sesID}`,
                200,
                {
                    zoneNum: 2,
                    tick: 510
                },
                gameAdminAccessToken
            );

            expect(res2.body).toHaveProperty('id');
        });
    });

    describe('POST maps/:mapID/session/:sesID/end', () => {
        it('should return 403 if not using a game API key', () => post(`maps/${map.id}/session/1/end`, 403));

        it.skip('should successfully submit a valid run to the leaderboards', () => {
            return;
        });
        it.skip('should reject if there is no body', () => {
            return;
        });
        it.skip('should reject the run if the track', () => {
            return;
        });
        it.skip('should reject the run if there are timestamps for an IL run', () => {
            return;
        });
        it.skip('should reject the run if the run does not have the proper number of timestamps', () => {
            return;
        });
        it.skip('should reject the run if the run was done out of order', () => {
            return;
        });
        it.skip('should reject the run if there was no timestamps for a track with >1 zones', () => {
            return;
        });
        it.skip('should reject the run if the magic of the replay does not match', () => {
            return;
        });
        it.skip('should reject the run if the SteamID in the replay does not match the submitter', () => {
            return;
        });
        it.skip('should reject the run if the hash of the map stored in the replay does not match the stored hash of the DB map', () => {
            return;
        });
        it.skip('should reject the run if the name of the map does not match the name of the map in the DB', () => {
            return;
        });
        it.skip('should reject the run if the run time in ticks is 0 or negative', () => {
            return;
        });
        it.skip('should reject the run if the replays track number is invalid for the map', () => {
            return;
        });
        it.skip('should reject the run if the replays zone number is invalid for the map', () => {
            return;
        });
        it.skip('should reject the run if the run date is too old (5+ seconds old)', () => {
            return;
        });
        it.skip('should reject the run if the run date is in the future', () => {
            return;
        });
        it.skip('should reject the run if the tickrate is not acceptable', () => {
            return;
        });
        it.skip('should reject the run if the run does not fall within the run session timestamps', () => {
            return;
        });
        it.skip('should reject the run if the run does not have stats', () => {
            return;
        });
        it.skip('should reject the run if the run has no run frames', () => {
            return;
        });
        // TODO make sure all cases are covered
    });
});
