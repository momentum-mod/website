// noinspection DuplicatedCode
import { readFileSync } from 'node:fs';
import { AuthService } from '@modules/auth/auth.service';
import { PrismaService } from '@modules/repo/prisma.service';
import { MapStatus, MapCreditType, MapType } from '@common/enums/map.enum';
import { MapDto } from '@common/dto/map/map.dto';
import { del, get, getNoContent, patch, post, postAttach, put, putAttach } from '../util/request-handlers.util';
import { MapInfoDto } from '@common/dto/map/map-info.dto';
import { MapCreditDto } from '@common/dto/map/map-credit.dto';
import { RunDto } from '@common/dto/run/run.dto';
import { MapRankDto } from '@common/dto/map/map-rank.dto';
import { ActivityTypes } from '@common/enums/activity.enum';
import axios from 'axios';
import { createHash } from 'node:crypto';
import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { UserDto } from '@common/dto/user/user.dto';
import { MapTrackDto } from '@common/dto/map/map-track.dto';
import { expandTest, skipTest, takeTest } from '@tests/util/generic-e2e-tests.util';
import { MapImageDto } from '@common/dto/map/map-image.dto';
import { Config } from '@config/config';
import { UserMapRankDto } from '@common/dto/run/user-map-rank.dto';

const hash = (buffer: Buffer) => createHash('sha1').update(buffer).digest('hex');

const s3Client = new S3Client({
    region: Config.storage.region,
    endpoint: Config.storage.endpointUrl,
    credentials: {
        accessKeyId: Config.storage.accessKeyID,
        secretAccessKey: Config.storage.secretAccessKey
    }
});

describe('Maps', () => {
    let user1,
        user1Token,
        admin,
        // adminAccessToken,
        // gameAdmin,
        // gameAdminAccessToken,
        user2,
        user2Token,
        user3,
        user3Token,
        run1,
        run2,
        run3,
        run4,
        run5,
        run6,
        map1,
        map2,
        map3,
        map4,
        createMapObj: () => any;

    beforeEach(async () => {
        const prisma: PrismaService = global.prisma;

        // Create Users
        user1 = await prisma.user.create({
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
                submitterID: user1.id,
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
                        userID: user1.id
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
                        reviews: 1,
                        baseStats: {
                            create: {}
                        }
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
                        userID: user1?.id
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
                },
                stats: {
                    create: {
                        downloads: 0
                    }
                }
            },
            include: {
                info: true,
                credits: true,
                stats: true,
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
            data: Array.from({ length: 5 }, (_, i) => {
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

        const pendingMaps = await prisma.map.findMany({ where: { name: { startsWith: 'pending_test' } } });

        await prisma.mapCredit.createMany({
            data: pendingMaps.map((m) => {
                return {
                    type: MapCreditType.AUTHOR,
                    mapID: m.id,
                    userID: user3.id
                };
            })
        });

        await prisma.map.create({
            data: {
                name: 'rejected_map1',
                type: MapType.SURF,
                statusFlag: MapStatus.REJECTED,
                submitterID: user3.id,
                createdAt: new Date()
            }
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
                        userID: user1.id,
                        type: MapCreditType.AUTHOR
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
                                points: '{"p1": "0", "p2": "0"}',
                                properties: {
                                    properties: '{}'
                                }
                            }
                        ]
                    }))
                }))
            };
        };

        // admin has WR, user should have a rank 2 PB
        run1 = await prisma.run.create({
            data: {
                map: { connect: { id: map1.id } },
                user: { connect: { id: admin.id } },
                trackNum: 0,
                zoneNum: 0,
                ticks: 10000,
                tickRate: 100,
                flags: 0,
                file: '',
                time: 123123123,
                hash: 'bb7b1901d99e8b26bb91d2debdb7d7f24b3158cf',
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
                user: { connect: { id: user1.id } },
                trackNum: 0,
                zoneNum: 0,
                ticks: 20000,
                tickRate: 100,
                flags: 123,
                file: '',
                hash: '35a3a113d817ad904d471ffffb6a966cb241a350',
                time: 20000000,
                rank: {
                    create: {
                        map: { connect: { id: map1.id } },
                        user: { connect: { id: user1.id } },
                        rank: 2,
                        gameType: MapType.SURF,
                        flags: 123
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
                user: { connect: { id: user1.id } },
                trackNum: 1,
                zoneNum: 1,
                ticks: 20001,
                tickRate: 100,
                flags: 0,
                file: '',
                hash: '3176dd209e4fc2d4a96dacdaaeed5b42032a3ed4',
                time: 20000100,
                overallStats: {
                    create: {
                        jumps: 1
                    }
                }
            }
        });

        run4 = await prisma.run.create({
            data: {
                map: { connect: { id: map1.id } },
                user: { connect: { id: user2.id } },
                trackNum: 0,
                zoneNum: 0,
                ticks: 200000,
                tickRate: 100,
                flags: 123,
                file: '',
                hash: 'dbda2aef9e84233875372bf0509c15cb2126e23c',
                time: 200000000,
                rank: {
                    create: {
                        map: { connect: { id: map1.id } },
                        user: { connect: { id: user2.id } },
                        rank: 3,
                        gameType: MapType.SURF,
                        flags: 123
                    }
                },
                overallStats: {
                    create: {
                        jumps: 1
                    }
                }
            }
        });

        run5 = await prisma.run.create({
            data: {
                map: { connect: { id: map1.id } },
                user: { connect: { id: user2.id } },
                trackNum: 3,
                zoneNum: 0,
                ticks: 2000000,
                tickRate: 100,
                flags: 0,
                file: '',
                hash: '94517207d6864215269c5fab0cc9e928272372bd',
                time: 2000000000,
                rank: {
                    create: {
                        map: { connect: { id: map1.id } },
                        user: { connect: { id: user2.id } },
                        rank: 4,
                        gameType: MapType.SURF,
                        flags: 0
                        //trackNum: 3
                    }
                },
                overallStats: {
                    create: {
                        jumps: 1
                    }
                }
            }
        });

        run6 = await prisma.run.create({
            data: {
                map: { connect: { id: map1.id } },
                user: { connect: { id: user3.id } },
                trackNum: 0,
                zoneNum: 3,
                ticks: 20000000,
                tickRate: 100,
                flags: 0,
                file: '',
                hash: 'e6f3985a030e1f8e5301acd0e2da80d19b32d114',
                time: 2000000000,
                rank: {
                    create: {
                        map: { connect: { id: map1.id } },
                        user: { connect: { id: user3.id } },
                        rank: 5,
                        gameType: MapType.SURF,
                        flags: 0
                        //zoneNum: 3
                    }
                },
                overallStats: {
                    create: {
                        jumps: 1
                    }
                }
            }
        });

        await prisma.mapLibraryEntry.create({
            data: {
                user: { connect: { id: user1.id } },
                map: { connect: { id: map1.id } }
            }
        });

        await prisma.mapFavorite.create({
            data: {
                user: { connect: { id: user1.id } },
                map: { connect: { id: map1.id } }
            }
        });

        const authService = global.auth as AuthService;
        user1Token = (await authService.loginWeb(user1)).accessToken;
        user2Token = (await authService.loginWeb(user2)).accessToken;
        user3Token = (await authService.loginWeb(user3)).accessToken;
    });

    afterEach(async () => {
        const prisma: PrismaService = global.prisma;

        await prisma.user.deleteMany({
            where: { id: { in: [user1.id, admin.id, user2.id, user3.id] } }
        });

        await prisma.map.deleteMany({
            where: {
                OR: [
                    { id: { in: [map1.id, map2.id, map3.id, map4.id] } },
                    { name: { startsWith: 'test_map' } },
                    { name: { startsWith: 'pending_test' } },
                    { name: { startsWith: 'rejected_map' } }
                ]
            }
        });

        await prisma.run.deleteMany({
            where: { id: { in: [run1.id, run2.id, run3.id, run4.id, run5.id, run6.id] } }
        });
    });

    describe('GET maps', () => {
        const expects = (res) => {
            expect(res.body).toBeValidPagedDto(MapDto);
            // Some tests don't set mainTrack & info, test just ones in this test
            for (const x of res.body.response.filter((x) => x.name.startsWith('maps_test'))) {
                expect(x).toHaveProperty('mainTrack');
                expect(x).toHaveProperty('info');
            }
        };

        it('should respond with map data', async () => {
            const res = await get({
                url: 'maps',
                status: 200,
                token: user1Token
            });

            expects(res);
            expect(res.body.totalCount).toBeGreaterThanOrEqual(4);
            expect(res.body.returnCount).toBeGreaterThanOrEqual(4);
        });

        it('should be ordered by date', async () => {
            const res = await get({
                url: 'maps',
                status: 200,
                token: user1Token
            });

            expects(res);

            const sortedRes = [...res.body.response].sort(
                (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );

            expect(res.body.response).toEqual(sortedRes);
        });

        it('should respond with filtered map data using the take parameter', () =>
            takeTest({
                url: 'maps',
                test: expects,
                token: user1Token
            }));

        it('should respond with filtered map data using the skip parameter', () =>
            skipTest({
                url: 'maps',
                test: expects,
                token: user1Token
            }));

        it('should respond with filtered map data using the search parameter', async () => {
            const res = await get({
                url: 'maps',
                status: 200,
                query: { search: map1.name },
                token: user1Token
            });

            expects(res);
            expect(res.body.totalCount).toEqual(1);
            expect(res.body.returnCount).toEqual(1);
            expect(res.body.response[0].name).toBe(map1.name);
        });

        it('should respond with filtered map data using the submitter id parameter', async () => {
            const res = await get({
                url: 'maps',
                status: 200,
                query: { submitterID: user1.id },
                token: user1Token
            });

            expects(res);
            expect(res.body.totalCount).toEqual(1);
            expect(res.body.returnCount).toEqual(1);
            expect(res.body.response[0].submitterID).toBe(map1.submitterID);
        });

        it('should respond with filtered map data based on the map type', async () => {
            const res = await get({
                url: 'maps',
                status: 200,
                query: { type: map1.type, take: 100 },
                token: user1Token
            });
            const res2 = await get({
                url: 'maps',
                status: 200,
                query: { take: 100 },
                token: user1Token
            });

            expects(res);
            expect(res.body.totalCount).toBeLessThan(res2.body.totalCount);
            expect(res.body.returnCount).toBeLessThan(res2.body.returnCount);
            expect(res.body.response.filter((map) => map.name === map1.name).length).toBe(1);
            expect(res.body.response[0].type).toBe(map1.type);
        });

        it('should respond with expanded map data using the credits expand parameter', () =>
            expandTest({
                url: 'maps',
                test: expects,
                expand: 'credits',
                query: { search: map1.name },
                paged: true,
                token: user1Token
            }));

        it('should respond with expanded map data using the thumbnail expand parameter', () =>
            expandTest({
                url: 'maps',
                test: expects,
                expand: 'thumbnail',
                query: { search: map1.name },
                paged: true,
                token: user1Token
            }));

        it("should respond with expanded map data if the map is in the logged in user's library when using the inLibrary expansion", () =>
            expandTest({
                url: 'maps',
                test: expects,
                expand: 'inLibrary',
                query: { search: map1.name },
                paged: true,
                expectedPropertyName: 'libraryEntries',
                token: user1Token
            }));

        it("should respond with expanded map data if the map is in the logged in user's library when using the inFavorites expansion", () =>
            expandTest({
                url: 'maps',
                test: expects,
                expand: 'inFavorites',
                query: { search: map1.name },
                expectedPropertyName: 'favorites',
                paged: true,
                token: user1Token
            }));

        it("should respond with the map's WR when using the worldRecord expansion", async () => {
            const res = await get({
                url: 'maps',
                status: 200,
                query: {
                    expand: 'worldRecord',
                    search: map1.name
                },
                token: user1Token
            });

            expects(res);

            const found = res.body.response.find((x) => Object.hasOwn(x, 'worldRecord'));
            expect(found).not.toBeNull();
            expect(found.worldRecord).toBeValidDto(MapRankDto);
            expect(found.worldRecord.rank).toBe(1);
            expect(found.worldRecord.user.id).toBe(admin.id);
        });

        it("should respond with the logged in user's PB when using the personalBest expansion", async () => {
            const res = await get({
                url: 'maps',
                status: 200,
                query: {
                    expand: 'personalBest',
                    search: map1.name
                },
                token: user1Token
            });

            expects(res);

            const found = res.body.response.find((x) => Object.hasOwn(x, 'personalBest'));
            expect(found).not.toBeNull();
            expect(found.personalBest).toBeValidDto(MapRankDto);
            expect(found.personalBest.rank).toBe(2);
            expect(found.personalBest.user.id).toBe(user1.id);
        });

        it('should respond properly with both personalBest and worldRecord expansions', async () => {
            const res = await get({
                url: 'maps',
                status: 200,
                query: {
                    expand: 'worldRecord,personalBest',
                    search: map1.name
                },
                token: user1Token
            });

            expects(res);

            const found = res.body.response.find(
                (x) => Object.hasOwn(x, 'worldRecord') && Object.hasOwn(x, 'personalBest')
            );
            expect(found).not.toBeNull();
            expect(found.worldRecord).toBeValidDto(MapRankDto);
            expect(found.worldRecord.rank).toBe(1);
            expect(found.worldRecord.user.id).toBe(admin.id);
            expect(found.personalBest).toBeValidDto(MapRankDto);
            expect(found.personalBest.rank).toBe(2);
            expect(found.personalBest.user.id).toBe(user1.id);
        });

        it('should respond with filtered maps when using the difficultyLow filter', async () => {
            const res = await get({
                url: 'maps',
                status: 200,
                query: { difficultyLow: 3, search: 'maps_test' },
                token: user1Token
            });

            expect(res.body.totalCount).toBe(3);
            expect(res.body.returnCount).toBe(3);
        });

        it('should respond with filtered maps when using the difficultyHigh filter', async () => {
            const res = await get({
                url: 'maps',
                status: 200,
                query: { difficultyHigh: 6, search: 'maps_test' },
                token: user1Token
            });

            expect(res.body.totalCount).toBe(3);
            expect(res.body.returnCount).toBe(3);
        });

        it('should respond with filtered maps when using both the difficultyLow and difficultyHigh filter', async () => {
            const res = await get({
                url: 'maps',
                status: 200,
                query: { difficultyLow: 3, difficultyHigh: 6, search: 'maps_test' },
                token: user1Token
            });

            expect(res.body.totalCount).toBe(2);
            expect(res.body.returnCount).toBe(2);
        });

        it('should respond with filtered maps when the isLinear filter', async () => {
            const res = await get({
                url: 'maps',
                status: 200,
                query: {
                    isLinear: true,
                    search: 'maps_test'
                },
                token: user1Token
            });

            expect(res.body.totalCount).toBe(2);
            expect(res.body.returnCount).toBe(2);

            const res2 = await get({
                url: 'maps',
                status: 200,
                query: {
                    isLinear: false,
                    search: 'maps_test'
                },
                token: user1Token
            });

            expect(res2.body.response[0].mainTrack.isLinear).toBe(false);
        });

        it('should respond with filtered maps when using both the difficultyLow, difficultyHigh and isLinear filters', async () => {
            const res = await get({
                url: 'maps',
                status: 200,
                query: {
                    difficultyLow: 3,
                    difficultyHigh: 6,
                    isLinear: true,
                    search: 'maps_test'
                },
                token: user1Token
            });

            expect(res.body.totalCount).toBe(1);
            expect(res.body.returnCount).toBe(1);
        });

        it('should respond with 401 when no access token is provided', () =>
            get({
                url: 'maps',
                status: 401
            }));
    });

    describe('POST maps', () => {
        it('should create a new map', async () => {
            const mapObj = createMapObj();

            // TODO: not sure it's handling properties right, do a more complex mapobj!
            await post({
                url: 'maps',
                status: 204,
                body: mapObj,
                token: user1Token
            });

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
            expect(mapDB.submitterID).toBe(user1.id);
            expect(mapDB.credits[0].userID).toBe(user1.id);
            expect(mapDB.credits[0].type).toBe(MapCreditType.AUTHOR);
            expect(mapDB).toHaveProperty('tracks');
            expect(mapDB.tracks).toHaveLength(2);
            expect(mapDB.mainTrack.id).toBe(mapDB.tracks.find((track) => track.trackNum === 0).id);
            for (const track of mapDB.tracks) {
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
            const mapObj = createMapObj();

            await post({
                url: 'maps',
                status: 204,
                body: mapObj,
                token: user1Token
            });

            const mapDB = await (global.prisma as PrismaService).map.findFirst({ where: { name: mapObj.name } });

            const activity = await (global.prisma as PrismaService).activity.findFirst({ where: { userID: user1.id } });

            expect(activity.type).toBe(ActivityTypes.MAP_UPLOADED);
            expect(activity.data).toBe(BigInt(mapDB.id));
        });

        it('set the Location property in the response header on creation', async () => {
            const mapObj = createMapObj();

            const res = await post({
                url: 'maps',
                status: 204,
                body: mapObj,
                token: user1Token
            });

            const mapDB = await (global.prisma as PrismaService).map.findFirst({ where: { name: mapObj.name } });

            expect(res.get('Location')).toBe(`api/v1/maps/${mapDB.id}/upload`);
        });

        it('should respond with 400 if the map does not have any tracks', () =>
            post({
                url: 'maps',
                status: 400,
                body: { ...createMapObj, tracks: [] },
                token: user1Token
            }));

        it('should respond with 400 if a map track has less than 2 zones', async () => {
            const mapObj = createMapObj();
            await post({
                url: 'maps',
                status: 400,
                body: {
                    ...createMapObj(),
                    tracks: [{ ...mapObj.tracks[0], zones: mapObj.tracks[0].zones[0] }]
                },
                token: user1Token
            });
        });

        it('should respond with 409 if a map with the same name exists', () =>
            post({
                url: 'maps',
                status: 409,
                body: { ...createMapObj(), name: map1.name },
                token: user3Token
            }));

        it('should respond with 409 if the submitter already have 5 or more pending maps', () =>
            post({
                url: 'maps',
                status: 409,
                body: createMapObj(),
                token: user3Token
            }));

        it('should respond with 403 when the user does not have the mapper role', () =>
            post({
                url: 'maps',
                status: 403,
                body: createMapObj(),
                token: user2Token
            }));

        it('should respond with 401 when no access token is provided', () =>
            post({
                url: 'maps',
                status: 401,
                body: createMapObj()
            }));
    });

    describe('GET maps/{mapID}/upload', () => {
        it('should set the response header location to the map upload endpoint', async () => {
            const res = await getNoContent({ url: `maps/${map1.id}/upload`, status: 204, token: user1Token });

            expect(res.get('Location')).toBe(`api/v1/maps/${map1.id}/upload`);
        });

        it('should respond with a 403 when the submitterID does not match the userID', () =>
            get({ url: `maps/${map1.id}/upload`, status: 403, token: user2Token }));

        it('should respond with a 403 when the map is not accepting uploads', () =>
            get({ url: `maps/${map1.id}/upload`, status: 403, token: user2Token }));

        it('should respond with 401 when no access token is provided', () =>
            get({ url: `maps/${map1.id}/upload`, status: 401 }));
    });

    describe('POST /maps/{mapID}/upload', () => {
        it('should upload the map file', async () => {
            const inBuffer = readFileSync('./tests/files/map.bsp');
            const inHash = hash(inBuffer);

            const res = await postAttach({
                url: `maps/${map1.id}/upload`,
                status: 201,
                file: 'map.bsp',
                token: user1Token
            });

            const url: string = res.body.downloadURL;
            expect(url.split('/').at(-1)).toBe(res.body.name + '.bsp');

            // This is failing sometimes, giving MinIO a little time to process our file
            await new Promise((resolve) => setTimeout(resolve, 100));

            const outBuffer = await axios
                .get(url, { responseType: 'arraybuffer' })
                .then((res) => Buffer.from(res.data, 'binary'));
            const outHash = hash(outBuffer);

            expect(inHash).toBe(res.body.hash);
            expect(outHash).toBe(res.body.hash);

            try {
                await s3Client.send(
                    new DeleteObjectCommand({
                        Bucket: Config.storage.bucketName,
                        Key: `maps/${map1.name}.bsp`
                    })
                );
            } catch {
                console.warn('WARNING: Failed to delete test map! Bucket likely now contains a junk map.');
            }
        });

        it('should respond with a 400 when no map file is provided', () =>
            post({
                url: `maps/${map1.id}/upload`,
                status: 400,
                token: user1Token
            }));

        it('should respond with a 403 when the submitterID does not match the userID', () =>
            postAttach({
                url: `maps/${map1.id}/upload`,
                status: 403,
                file: 'map.bsp',
                token: user2Token
            }));

        it('should respond with a 403 when the map is not accepting uploads', () =>
            postAttach({
                url: `maps/${map2.id}/upload`,
                status: 403,
                file: 'map.bsp',
                token: user2Token
            }));

        it('should respond with 401 when no access token is provided', () =>
            post({
                url: `maps/${map1.id}/upload`,
                status: 401
            }));
    });

    describe('The Big Chungie Create, Upload then Download Test', () =>
        it('should successfully create a map, upload it to the returned location, then download it', async () => {
            const res = await post({
                url: 'maps',
                status: 204,
                body: createMapObj(),
                token: user1Token
            });

            const inBuffer = readFileSync(__dirname + '/../files/map.bsp');
            const inHash = hash(inBuffer);

            const uploadURL = res.get('Location').replace('api/v1/', '');

            const res2 = await postAttach({ url: uploadURL, status: 201, file: 'map.bsp', token: user1Token });

            await new Promise((resolve) => setTimeout(resolve, 1000));

            const outBuffer = await axios
                .get(res2.body.downloadURL, { responseType: 'arraybuffer' })
                .then((res) => Buffer.from(res.data, 'binary'));
            const outHash = hash(outBuffer);

            expect(inHash).toBe(outHash);
        }));

    describe('GET maps/{mapID}/download', () => {
        it("should respond with the map's bsp file", async () => {
            const mapFile = readFileSync(__dirname + '/../files/map.bsp');
            try {
                await s3Client.send(
                    new PutObjectCommand({
                        Bucket: Config.storage.bucketName,
                        Key: `${Config.storage.bucketName}/maps/${map4.name}.bsp`,
                        Body: mapFile
                    })
                );
            } catch {
                console.warn('WARNING: Failed to upload test map! maps/{mapID}/download tests will fail.');
            }

            const prevStats = await (global.prisma as PrismaService).mapStats.findFirst({
                where: {
                    mapID: map4.id
                }
            });

            const res = await get({
                url: `maps/${map4.id}/download`,
                status: 200,
                token: user1Token,
                contentType: 'application/octet-stream'
            });

            const newStats = await (global.prisma as PrismaService).mapStats.findFirst({
                where: {
                    mapID: map4.id
                }
            });

            const inHash = hash(mapFile);
            const outHash = hash(res.body);

            expect(inHash).toEqual(outHash);
            expect(prevStats.downloads + 1).toEqual(newStats.downloads);

            try {
                await s3Client.send(
                    new DeleteObjectCommand({
                        Bucket: Config.storage.bucketName,
                        Key: `${Config.storage.bucketName}/maps/${map4.name}.bsp`
                    })
                );
            } catch {
                console.warn('WARNING: Failed to delete test map! Bucket likely now contains a junk map.');
            }
        });

        it("should respond with 404 when the map's bsp file is not found", async () =>
            get({
                url: `maps/${map3.id}/download`,
                status: 404,
                token: user1Token,
                contentType: 'application/octet-stream; charset=utf-8'
            }));

        it('should respond with 404 when the map is not found', () =>
            get({
                url: 'maps/6000000000/download',
                status: 404,
                token: user1Token,
                contentType: 'application/octet-stream; charset=utf-8'
            }));

        it('should respond with 401 when no access token is provided', () =>
            get({
                url: `maps/${map4.id}/download`,
                status: 401
            }));
    });

    describe('GET maps/{mapID}', () => {
        const expects = (res) => expect(res.body).toBeValidDto(MapDto);
        const filter = (x) => x.id === map1.id;

        it('should respond with map data', async () => {
            const res = await get({
                url: `maps/${map1.id}`,
                status: 200,
                token: user1Token
            });

            expects(res);
        });

        it('should respond with expanded map data using the credits expand parameter', () =>
            expandTest({
                url: `maps/${map1.id}`,
                test: expects,
                expand: 'credits',
                filter: filter,
                token: user1Token
            }));

        it('should respond with expanded map data using the info expand parameter', () =>
            expandTest({
                url: `maps/${map1.id}`,
                test: expects,
                expand: 'info',
                filter: filter,
                token: user1Token
            }));

        it('should respond with expanded map data using the submitter expand parameter', () =>
            expandTest({
                url: `maps/${map1.id}`,
                test: expects,
                expand: 'submitter',
                filter: filter,
                token: user1Token
            }));

        it('should respond with expanded map data using the images expand  parameter', () =>
            expandTest({
                url: `maps/${map1.id}`,
                test: expects,
                expand: 'images',
                filter: filter,
                token: user1Token
            }));

        it('should respond with expanded map data using the thumbnail expand  parameter', () =>
            expandTest({
                url: `maps/${map1.id}`,
                test: expects,
                expand: 'thumbnail',
                filter: filter,
                token: user1Token
            }));

        it('should respond with expanded map data using the stats expand info parameter', () =>
            expandTest({
                url: `maps/${map1.id}`,
                test: expects,
                expand: 'stats',
                filter: filter,
                token: user1Token
            }));

        it('should respond with expanded map data using the tracks expand info parameter', () =>
            expandTest({
                url: `maps/${map1.id}`,
                test: expects,
                expand: 'tracks',
                filter: filter,
                token: user1Token
            }));

        it("should respond with expanded map data if the map is in the logged in user's library when using the inLibrary expansion", () =>
            expandTest({
                url: `maps/${map1.id}`,
                test: expects,
                expand: 'inLibrary',
                filter: filter,
                expectedPropertyName: 'libraryEntries',
                token: user1Token
            }));

        it("should respond with expanded map data if the map is in the logged in user's library when using the inFavorites expansion", () =>
            expandTest({
                url: `maps/${map1.id}`,
                test: expects,
                expand: 'inFavorites',
                filter: filter,
                expectedPropertyName: 'favorites',
                token: user1Token
            }));

        it("should respond with the map's WR when using the worldRecord expansion", async () => {
            const res = await get({
                url: `maps/${map1.id}`,
                status: 200,
                query: { expand: 'worldRecord' },
                token: user1Token
            });

            expects(res);

            expect(res.body.worldRecord).toBeValidDto(MapRankDto);
            expect(res.body.worldRecord.rank).toBe(1);
            expect(res.body.worldRecord.user.id).toBe(admin.id);
        });

        it("should respond with the logged in user's PB when using the personalBest expansion", async () => {
            const res = await get({
                url: `maps/${map1.id}`,
                status: 200,
                query: { expand: 'personalBest' },
                token: user1Token
            });

            expects(res);

            expect(res.body.personalBest).toBeValidDto(MapRankDto);
            expect(res.body.personalBest.rank).toBe(2);
            expect(res.body.personalBest.user.id).toBe(user1.id);
        });

        it('should respond properly with both personalBest and worldRecord expansions', async () => {
            const res = await get({
                url: `maps/${map1.id}`,
                status: 200,
                query: { expand: 'worldRecord,personalBest' },
                token: user1Token
            });

            expects(res);

            expect(res.body.worldRecord).toBeValidDto(MapRankDto);
            expect(res.body.worldRecord.rank).toBe(1);
            expect(res.body.worldRecord.user.id).toBe(admin.id);
            expect(res.body.personalBest).toBeValidDto(MapRankDto);
            expect(res.body.personalBest.rank).toBe(2);
            expect(res.body.personalBest.user.id).toBe(user1.id);
        });

        it('should respond with 404 when the map is not found', () =>
            get({
                url: 'maps/6000000000',
                status: 404,
                token: user1Token
            }));

        it('should respond with 401 when no access token is provided', () =>
            get({
                url: 'maps/' + map1.id,
                status: 401
            }));
    });

    describe('PATCH maps/{mapID}', () => {
        const statusUpdate = {
            statusFlag: MapStatus.READY_FOR_RELEASE
        };

        it('should update the status flag', async () => {
            await patch({
                url: `maps/${map1.id}`,
                status: 204,
                body: statusUpdate,
                token: user1Token
            });
            const newStatus = await (global.prisma as PrismaService).map.findUnique({ where: { id: map1.id } });

            expect(newStatus.statusFlag).toEqual(statusUpdate.statusFlag);
        });

        it('should update the status flag and create MAP_APPROVED activities', async () => {
            const pendingMap = await (global.prisma as PrismaService).map.findFirst({
                where: { name: { startsWith: 'pending_test' } }
            });

            await patch({
                url: `maps/${pendingMap.id}`,
                status: 204,
                body: { statusFlag: MapStatus.APPROVED },
                token: user3Token
            });

            const activities = await (global.prisma as PrismaService).activity.findMany({
                where: {
                    userID: user3.id,
                    type: ActivityTypes.MAP_APPROVED
                }
            });

            expect(activities).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        type: ActivityTypes.MAP_APPROVED,
                        userID: user3.id,
                        data: BigInt(pendingMap.id)
                    })
                ])
            );
        });

        it('should return 400 if the status Flag is invalid', () =>
            patch({
                url: `maps/${map1.id}`,
                status: 400,
                body: { statusFlag: 'shouldnt exist' },
                token: user1Token
            }));

        it("should return 400 if the map's status is rejected", async () => {
            const map = await (global.prisma as PrismaService).map.findFirst({
                where: { name: 'rejected_map1' }
            });

            await patch({
                url: `maps/${map.id}`,
                status: 400,
                body: statusUpdate,
                token: user3Token
            });
        });

        it('should return 403 if the map was not submitted by that user', () =>
            patch({
                url: `maps/${map1.id}`,
                status: 403,
                body: statusUpdate,
                token: user3Token
            }));

        it('should return 403 if the user does not have the mapper role', () =>
            patch({
                url: `maps/${map4.id}`,
                status: 403,
                body: statusUpdate,
                token: user2Token
            }));

        it('should respond with 404 when the map is not found', () =>
            patch({
                url: 'maps/1191137119',
                status: 404,
                body: statusUpdate,
                token: user1Token
            }));

        it('should respond with 401 when no access token is provided', () =>
            patch({
                url: `maps/${map1.id}`,
                status: 401,
                body: statusUpdate
            }));
    });

    describe('GET maps/{mapID}/info', () => {
        const expects = (res) => expect(res.body).toBeValidDto(MapInfoDto);

        it('should respond with map info', async () => {
            const res = await get({
                url: `maps/${map1.id}/info`,
                status: 200,
                token: user1Token
            });

            expects(res);
        });

        it('should return 404 if the map is not found', () =>
            get({
                url: 'maps/00091919/info',
                status: 404,
                token: user1Token
            }));

        it('should respond with 401 when no access token is provided', () =>
            get({
                url: `maps/${map1.id}/info`,
                status: 401
            }));
    });

    describe('PATCH maps/{mapID}/info', () => {
        const infoUpdate = {
            description: 'This map is EXTREME',
            youtubeID: '70vwJy1dQ0c',
            creationDate: '1999-02-06'
        };

        it('should update the map info', async () => {
            await patch({
                url: `maps/${map1.id}/info`,
                status: 204,
                body: infoUpdate,
                token: user1Token
            });
            const newInfo = await (global.prisma as PrismaService).mapInfo.findUnique({ where: { mapID: map1.id } });

            expect(newInfo.creationDate).toEqual(new Date(infoUpdate.creationDate));
            expect(newInfo.description).toBe(infoUpdate.description);
            expect(newInfo.youtubeID).toBe(infoUpdate.youtubeID);
        });

        it('should return 400 if the date is invalid', () =>
            patch({
                url: `maps/${map1.id}/info`,
                status: 400,
                body: { creationDate: 'its chewsday init' },
                token: user1Token
            }));

        it('should return 400 if the youtube ID is invalid', () =>
            patch({
                url: `maps/${map1.id}/info`,
                status: 400,
                body: { youtubeID: 'https://www.youtube.com/watch?v=70vwJy1dQ0c' },
                token: user1Token
            }));

        it('should return 400 if no update data is provided', () =>
            patch({
                url: `maps/${map1.id}/info`,
                status: 400,
                token: user1Token
            }));

        it('should return 404 if the map does not exist', () =>
            patch({
                url: 'maps/1191137119/info',
                status: 404,
                body: infoUpdate,
                token: user1Token
            }));

        it('should return 403 if the map was not submitted by that user', () =>
            patch({
                url: `maps/${map1.id}/info`,
                status: 403,
                body: infoUpdate,
                token: user3Token
            }));

        it('should return 403 if the map is not in NEEDS_REVISION state', () =>
            patch({
                url: `maps/${map3.id}/info`,
                status: 403,
                body: infoUpdate,
                token: user3Token
            }));

        it('should return 403 if the user does not have the mapper role', () =>
            patch({
                url: `maps/${map4.id}/info`,
                status: 403,
                body: infoUpdate,
                token: user2Token
            }));

        it('should respond with 401 when no access token is provided', () =>
            patch({
                url: `maps/${map1.id}/info`,
                status: 401,
                body: infoUpdate
            }));
    });

    describe('GET maps/{mapID}/credits', () => {
        const expects = (res) => {
            for (const x of res.body) expect(x).toBeValidDto(MapCreditDto);
        };

        it('should respond with the specified maps credits', async () => {
            const res = await get({
                url: `maps/${map1.id}/credits`,
                status: 200,
                token: user1Token
            });
            expects(res);
            expect(res.body).toHaveLength(1);
        });

        it('should respond with the specified maps credits with the user expand parameter', async () => {
            const res = await get({
                url: `maps/${map1.id}/credits`,
                status: 200,
                query: { expand: 'user' },
                token: user1Token
            });
            expects(res);
            for (const x of res.body) {
                expect(x.user).toBeValidDto(UserDto);
            }
        });

        it('should return 404 when no map credits found', () =>
            get({
                url: 'maps/999999999999999/credits',
                status: 404,
                token: user1Token
            }));

        it('should respond with 401 when no access token is provided', () =>
            get({
                url: `maps/${map1.id}/credits`,
                status: 401
            }));
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
            const res = await post({
                url: `maps/${map1.id}/credits`,
                status: 201,
                body: newMapCredit(),
                token: user1Token
            });
            expect(res.body).toBeValidDto(MapCreditDto);

            const changedMap = await (global.prisma as PrismaService).map.findUnique({
                where: { id: map1.id },
                include: { credits: true }
            });
            expect(changedMap.credits).toHaveLength(2);
            expect(changedMap.credits[1].userID).toBe(newMapCredit().userID);
            expect(changedMap.credits[1].type).toBe(newMapCredit().type);
        });

        it('should create an activity if a new author is added', async () => {
            await post({
                url: `maps/${map1.id}/credits`,
                status: 201,
                body: { type: MapCreditType.AUTHOR, userID: user3.id },
                token: user1Token
            });
            const newActivity = await (global.prisma as PrismaService).activity.findFirst({
                where: {
                    userID: user3.id,
                    type: ActivityTypes.MAP_UPLOADED,
                    data: map1.id
                }
            });
            expect(newActivity);
        });

        it('should respond with 404 if the map is not found', () =>
            post({
                url: 'maps/9999999/credits',
                status: 404,
                body: newMapCredit(),
                token: user1Token
            }));

        it('should respond with 403 if the user is not the map submitter', () =>
            post({
                url: `maps/${map1.id}/credits`,
                status: 403,
                body: newMapCredit(),
                token: user3Token
            }));

        it("should respond with 403 if the user doesn't have the mapper role", () =>
            post({
                url: `maps/${map4.id}/credits`,
                status: 403,
                body: newMapCredit(),
                token: user2Token
            }));

        it('should respond with 403 if the map is not in NEEDS_REVISION state', () =>
            post({
                url: `maps/${map3.id}/credits`,
                status: 403,
                body: newMapCredit(),
                token: user3Token
            }));

        it('should respond with 400 if the map credit object is invalid', () =>
            post({
                url: `maps/${map1.id}/credits`,
                status: 400,
                body: invalidMapCredit,
                token: user1Token
            }));

        it('should respond with 409 if the map credit already exists', () =>
            post({
                url: `maps/${map1.id}/credits`,
                status: 409,
                body: existingMapCredit(),
                token: user1Token
            }));

        it('should respond with 400 if the credited user does not exist', () =>
            post({
                url: `maps/${map1.id}/credits`,
                status: 400,
                body: noExistingUserMapCredit,
                token: user1Token
            }));

        it('should respond with 401 when no access token is provided', () =>
            post({
                url: `maps/${map1.id}/credits`,
                status: 401,
                body: newMapCredit()
            }));
    });

    describe('GET maps/credits/{mapCreditID}', () => {
        const expects = (res) => expect(res.body).toBeValidDto(MapCreditDto);

        it('should return the specified map credit', async () => {
            const res = await get({
                url: `maps/credits/${map1.credits[0].id}`,
                status: 200,
                token: user1Token
            });
            expects(res);
        });

        it('should return the specified map credit with the user expand parameter', () =>
            expandTest({
                url: `maps/credits/${map1.credits[0].id}`,
                test: expects,
                expand: 'user',
                token: user1Token
            }));

        it('should return a 404 if the map credit is not found', () =>
            get({
                url: 'maps/credits/222',
                status: 404,
                token: user1Token
            }));

        it('should respond with 401 when no access token is provided', () =>
            get({
                url: `maps/credits/${map1.credits[0].id}`,
                status: 401
            }));
    });

    describe('PATCH maps/{mapID}/credits/{mapCreditID}', () => {
        const updatedMapCredit = () => {
            return {
                userID: user2.id,
                type: MapCreditType.TESTER
            };
        };

        it("should update the specified map credit's user and type", async () => {
            await patch({
                url: `maps/credits/${map1.credits[0].id}`,
                status: 204,
                body: updatedMapCredit(),
                token: user1Token
            });
            const updatedMap = await (global.prisma as PrismaService).map.findUnique({
                where: { id: map1.id },
                include: { credits: true }
            });
            expect(updatedMap.credits).toHaveLength(1);
            expect(updatedMap.credits[0].userID).toBe(user2.id);
            expect(updatedMap.credits[0].type).toBe(MapCreditType.TESTER);
        });

        it("should just update the specified map credit's type", () =>
            patch({
                url: `maps/credits/${map1.credits[0].id}`,
                status: 204,
                body: { type: MapCreditType.TESTER },
                token: user1Token
            }));

        it("should just update the specified map credit's user", () =>
            patch({
                url: `maps/credits/${map1.credits[0].id}`,
                status: 204,
                body: { userID: user2.id },
                token: user1Token
            }));

        it('should return 403 if the map was not submitted by that user', () =>
            patch({
                url: `maps/credits/${map1.credits[0].id}`,
                status: 403,
                body: updatedMapCredit(),
                token: user3Token
            }));

        it('should return 404 if the map credit was not found', () =>
            patch({
                url: 'maps/credits/1024768',
                status: 404,
                body: updatedMapCredit(),
                token: user1Token
            }));

        it('should respond with 400 when the map credit type is invalid', () =>
            patch({
                url: `maps/credits/${map1.credits[0].id}`,
                status: 400,
                body: { type: 'Author' },
                token: user1Token
            }));

        it('should respond with 400 when the map credit user is invalid', () =>
            patch({
                url: `maps/credits/${map1.credits[0].id}`,
                status: 400,
                body: { userID: 'Momentum Man' },
                token: user1Token
            }));

        it('should respond with 400 when no update data is provided', () =>
            patch({
                url: `maps/credits/${map1.credits[0].id}`,
                status: 400,
                token: user1Token
            }));

        it('should respond with 403 if the map is not in NEEDS_REVISION state', () =>
            patch({
                url: `maps/credits/${map3.credits[0].id}`,
                status: 403,
                body: updatedMapCredit(),
                token: user3Token
            }));

        it('should respond with 403 if the user does not have the mapper role', () =>
            patch({
                url: `maps/credits/${map4.credits[0].id}`,
                status: 403,
                body: updatedMapCredit(),
                token: user2Token
            }));

        it('should respond with 400 if the credited user does not exist', () =>
            patch({
                url: `maps/credits/${map1.credits[0].id}`,
                status: 400,
                body: { userID: 123456789 },
                token: user1Token
            }));

        it("should update the activities when an author credit's user is changed", async () => {
            await (global.prisma as PrismaService).activity.create({
                data: {
                    type: ActivityTypes.MAP_UPLOADED,
                    userID: map1.credits[0].userID,
                    data: map1.id
                }
            });

            await patch({
                url: `maps/credits/${map1.credits[0].id}`,
                status: 204,
                body: { userID: user2.id },
                token: user1Token
            });

            const originalActivity = await (global.prisma as PrismaService).activity.findFirst({
                where: {
                    userID: user1.id,
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

            await patch({
                url: `maps/credits/${map1.credits[0].id}`,
                status: 204,
                body: { type: MapCreditType.COAUTHOR },
                token: user1Token
            });

            const originalActivity = await (global.prisma as PrismaService).activity.findFirst({
                where: {
                    userID: user1.id,
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
            await patch({
                url: `maps/credits/${newCredit.id}`,
                status: 409,
                body: { userID: user1.id, type: MapCreditType.AUTHOR },
                token: user1Token
            });
        });

        it('should respond with 401 when no access token is provided', () =>
            patch({
                url: `maps/credits/${map1.credits[0].id}`,
                status: 401,
                body: updatedMapCredit()
            }));
    });

    describe('DELETE maps/credits/{mapCreditID}', () => {
        it('should delete the specified map credit', async () => {
            await del({
                url: `maps/credits/${map1.credits[0].id}`,
                status: 200,
                token: user1Token
            });
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
            await del({
                url: `maps/credits/${map1.credits[0].id}`,
                status: 200,
                token: user1Token
            });
            const activity = await (global.prisma as PrismaService).activity.findFirst({
                where: {
                    userID: user1.id,
                    type: ActivityTypes.MAP_UPLOADED,
                    data: map1.id
                }
            });
            expect(activity).toBeNull();
        });

        it('should return 403 if the map was not submitted by that user', () =>
            del({
                url: `maps/credits/${map1.credits[0].id}`,
                status: 403,
                token: user3Token
            }));

        it('should return 403 if the map is not in NEEDS_REVISION state', () =>
            del({
                url: `maps/credits/${map3.credits[0].id}`,
                status: 403,
                token: user3Token
            }));

        it('should return 403 if the user does not have the mapper role', () =>
            del({
                url: `maps/credits/${map4.credits[0].id}`,
                status: 403,
                token: user2Token
            }));

        it('should return 404 if the map credit was not found', () =>
            del({
                url: 'maps/credits/1024768',
                status: 404,
                token: user1Token
            }));

        it('should respond with 401 when no access token is provided', () =>
            del({
                url: `maps/credits/${map1.credits.id}`,
                status: 401
            }));
    });

    describe('GET /maps/{mapID}/zones', () => {
        const expects = (res) => {
            for (const x of res.body) expect(x).toBeValidDto(MapTrackDto);
        };
        it('should respond with the map zones', async () => {
            const res = await get({
                url: `maps/${map1.id}/zones`,
                status: 200,
                token: user1Token
            });
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

            await get({
                url: `maps/${map1.id}/zones`,
                status: 200,
                token: user1Token
            });
            const newstats = await (global.prisma as PrismaService).mapStats.findFirst({
                where: {
                    mapID: map1.id
                }
            });
            expect(newstats.plays).toBe(1);
        });

        it('should respond with 404 if the map does not exist', () =>
            get({
                url: 'maps/987654321/zones',
                status: 404,
                token: user1Token
            }));

        it('should respond with 401 when no access token is provided', () =>
            get({
                url: `maps/${map1.id}/zones`,
                status: 401
            }));
    });

    describe('PUT /maps/{mapID}/thumbnail', () => {
        it('should update the thumbnail for a map', () =>
            putAttach({ url: `maps/${map1.id}/thumbnail`, status: 204, file: 'image2.jpg', token: user1Token }));

        it('should create a thumbnail if one does not exist already', async () => {
            await (global.prisma as PrismaService).mapImage.delete({ where: { id: map1.thumbnailID } });
            const map1NoThumb = await (global.prisma as PrismaService).map.findFirst({ where: { id: map1.id } });
            expect(map1NoThumb.thumbnailID).toBeNull();

            await putAttach({ url: `maps/${map1.id}/thumbnail`, status: 204, file: 'image.jpg', token: user1Token });
            const map1NewThumb = await (global.prisma as PrismaService).map.findFirst({ where: { id: map1.id } });
            expect(map1NewThumb.thumbnailID).toBeDefined();
        });

        it('should return a 400 if no thumbnail file is provided', () =>
            put({ url: `maps/${map1.id}/thumbnail`, status: 400, token: user1Token }));

        it('should respond with 403 if the user is not the submitter of the map', () =>
            putAttach({ url: `maps/${map1.id}/thumbnail`, status: 403, file: 'image.jpg', token: user3Token }));

        it('should respond with 403 if the user is not a mapper', () =>
            putAttach({ url: `maps/${map4.id}/thumbnail`, status: 403, file: 'image.jpg', token: user2Token }));

        it('should respond with 401 when no access token is provided', () =>
            put({ url: `maps/${map1.id}/thumbnail`, status: 401 }));
    });

    describe('POST /maps/{mapID}/images', () => {
        it('should create a map image for the specified map', async () => {
            const res = await postAttach({
                url: `maps/${map1.id}/images`,
                status: 201,
                file: 'image.jpg',
                token: user1Token
            });
            const urls = [res.body.small, res.body.medium, res.body.large];
            for (const url of urls) expect(url).toBeDefined();
        });

        it('should respond with 409 when the map image limit has been reached', async () => {
            await postAttach({ url: `maps/${map1.id}/images`, status: 201, file: 'image.jpg', token: user1Token });
            await postAttach({ url: `maps/${map1.id}/images`, status: 201, file: 'image.jpg', token: user1Token });
            await postAttach({ url: `maps/${map1.id}/images`, status: 201, file: 'image.jpg', token: user1Token });
            await postAttach({ url: `maps/${map1.id}/images`, status: 201, file: 'image.jpg', token: user1Token });
            await postAttach({ url: `maps/${map1.id}/images`, status: 409, file: 'image.jpg', token: user1Token });
        }, 10000);

        it('should respond with 400 if the map image is invalid', () =>
            postAttach({ url: `maps/${map1.id}/images`, status: 400, file: 'map.zon', token: user1Token }));

        it('should respond with 400 if no file is provided', () =>
            post({ url: `maps/${map1.id}/images`, status: 400, token: user1Token }));

        it('should respond with 403 if the user is not a mapper', () =>
            postAttach({ url: `maps/${map4.id}/images`, status: 403, file: 'image2.jpg', token: user2Token }));

        it('should respond with 403 if the user is not the submitter of the map', () =>
            postAttach({ url: `maps/${map1.id}/images`, status: 403, file: 'image.jpg', token: user3Token }));

        it('should respond with 401 when no access token is provided', () =>
            post({ url: `maps/${map1.id}/images`, status: 401 }));
    });

    describe('GET maps/{mapID}/images', () => {
        const expects = (res) => {
            for (const x of res.body) expect(x).toBeValidDto(MapImageDto);
        };
        it('should respond with a list of images', async () => {
            const res = await get({ url: `maps/${map1.id}/images`, status: 200, token: user1Token });
            expects(res);
            expect(res.body).toHaveLength(2);
        });

        it('should respond with 404 if map does not exist', () =>
            get({ url: 'maps/11235813/images', status: 404, token: user1Token }));

        it('should respond with 401 when no access token is provided', () =>
            get({ url: `maps/${map1.id}/images`, status: 401 }));
    });

    describe('GET maps/images/{imgID}', () => {
        it('should respond with 404 when the image is not found', () =>
            get({ url: `maps/${map1.id}/images/12345`, status: 404, token: user1Token }));

        it('should respond with image info', async () => {
            const res = await get({ url: `maps/images/${map1.images[0].id}`, status: 200, token: user1Token });
            expect(res.body).toBeValidDto(MapImageDto);
        });

        it('should respond with 401 when no access token is provided', () =>
            get({ url: `maps/images/${map1.images.id}`, status: 401 }));
    });

    describe('PUT maps/images/{imgID}', () => {
        it('should update the map image', async () => {
            const oldImage = await (global.prisma as PrismaService).mapImage.findUnique({
                where: { id: map1.images[0].id }
            });
            await putAttach({ url: `maps/images/${oldImage.id}`, status: 204, file: 'image2.jpg', token: user1Token });
        });

        it('should respond with 404 when the image is not found', () =>
            putAttach({ url: 'maps/images/113707311', status: 404, file: 'image2.jpg', token: user1Token }));

        it('should respond with 400 when no map image is provided', () =>
            put({ url: `maps/images/${map1.images[0].id}`, status: 400, token: user1Token }));

        it('should respond with 400 if the map image is invalid', () =>
            putAttach({ url: `maps/images/${map1.images[0].id}`, status: 400, file: 'map.zon', token: user1Token }));

        it('should respond with 400 if no file is provided', () =>
            put({ url: `maps/images/${map1.images[0].id}`, status: 400, token: user1Token }));

        it('should respond with 403 if the user is not a mapper', () =>
            putAttach({ url: `maps/images/${map1.images[0].id}`, status: 403, file: 'image2.jpg', token: user2Token }));

        it('should respond with 403 if the user is not the submitter of the map', () =>
            putAttach({ url: `maps/images/${map1.images[0].id}`, status: 403, file: 'image.jpg', token: user3Token }));

        it('should respond with 401 when no access token is provided', () =>
            put({ url: `maps/images/${map1.images[0].id}`, status: 401 }));
    });

    describe('DELETE maps/images/{imgID}', () => {
        it('should delete the map image', async () => {
            await del({ url: `maps/images/${map1.images[0].id}`, status: 204, token: user1Token });
            const updatedMap = await (global.prisma as PrismaService).map.findUnique({
                where: { id: map1.id },
                include: { images: true }
            });
            expect(updatedMap.images).toHaveLength(1);
        });

        it('should respond with 403 if the user is not a mapper', () =>
            del({ url: `maps/images/${map1.images[0].id}`, status: 403, token: user2Token }));

        it('should respond with 403 if the user is not the submitter of the map', () =>
            del({ url: `maps/images/${map1.images[0].id}`, status: 403, token: user3Token }));

        it('should respond with 401 when no access token is provided', () =>
            del({ url: `maps/images/${map1.images[0].id}`, status: 401 }));
    });

    describe('GET maps/{mapID}/runs', () => {
        const expects = (res) => expect(res.body).toBeValidPagedDto(RunDto);

        it('should return run files for the specified map', async () => {
            const res = await get({
                url: `maps/${map1.id}/runs`,
                status: 200,
                token: user1Token
            });

            expects(res);

            expect(res.body.totalCount).toBeGreaterThanOrEqual(2);
            expect(res.body.returnCount).toBeGreaterThanOrEqual(2);
        });

        it('should respond with filtered map data using the take parameter', () =>
            takeTest({
                url: `maps/${map1.id}/runs`,
                test: expects,
                token: user1Token
            }));

        it('should respond with filtered map data using the skip parameter', () =>
            skipTest({
                url: `maps/${map1.id}/runs`,
                test: expects,
                token: user1Token
            }));

        it('should respond with a list of runs filtered by userID parameter', async () => {
            const res = await get({
                url: `maps/${map1.id}/runs`,
                status: 200,
                query: { userID: user1.id },
                token: user1Token
            });

            expects(res);

            expect(res.body.totalCount).toBe(2);
            expect(res.body.returnCount).toBe(2);
            expect(res.body.response[0].userID).toBe(user1.id);
        });

        it('should respond with a list of runs filtered by a list of user ids', async () => {
            const ids = user1.id + ',' + admin.id;
            const res = await get({
                url: `maps/${map1.id}/runs`,
                status: 200,
                query: { userIDs: ids },
                token: user1Token
            });

            expects(res);

            expect(res.body.totalCount).toBe(3);
            expect(res.body.returnCount).toBe(3);
            expect(ids).toContain(res.body.response[0].userID.toString());
        });

        it('should respond with a list of runs filtered by flags', async () => {
            const res = await get({
                url: `maps/${map1.id}/runs`,
                status: 200,
                query: { flags: 123 },
                token: user1Token
            });

            expects(res);

            expect(res.body.totalCount).toBe(1);
            expect(res.body.response[0].flags).toBe(run2.flags); // This uses strict equality for now, but will change in 0.10.0
        });

        it('should respond with a list of runs with the map include', () =>
            expandTest({
                url: 'runs',
                test: expects,
                expand: 'map',
                paged: true,
                token: user1Token
            }));

        it('should respond with a list of runs with the rank include', async () => {
            const res = await get({
                url: `maps/${map1.id}/runs`,
                status: 200,
                query: { expand: 'rank' },
                token: user1Token
            });

            expects(res);

            expect(res.body.totalCount).toBeGreaterThanOrEqual(3);
            expect(res.body.returnCount).toBeGreaterThanOrEqual(3);
            expect(res.body.response.filter((x) => Object.hasOwn(x, 'rank')).length).toBe(3); // 3 test runs have a rank, so we should see 2 in the response
        });

        it('should respond with a list of runs with the zoneStats include', () =>
            expandTest({
                url: `maps/${map1.id}/runs`,
                test: expects,
                expand: 'zoneStats',
                paged: true,
                token: user1Token
            }));

        it('should respond with a list of runs with the overallStats include', () =>
            expandTest({
                url: `maps/${map1.id}/runs`,
                test: expects,
                expand: 'overallStats',
                paged: true,
                token: user1Token
            }));

        it('should respond with a list of runs with the mapWithInfo include', async () => {
            const res = await get({
                url: `maps/${map1.id}/runs`,
                status: 200,
                query: { expand: 'mapWithInfo' },
                token: user1Token
            });

            expects(res);

            for (const x of res.body.response) expect(x.map).toHaveProperty('info');
        });

        it('should respond with a list of runs that are personal bests', async () => {
            const res = await get({
                url: `maps/${map1.id}/runs`,
                status: 200,
                query: { isPB: true, expand: 'rank' },
                token: user1Token
            });

            expects(res);

            expect(res.body.totalCount).toBeGreaterThanOrEqual(2);
            expect(res.body.returnCount).toBeGreaterThanOrEqual(2);
            for (const x of res.body.response) {
                expect(x).toHaveProperty('rank');
                expect(x.id).not.toBe(run3.id);
            }
        });

        it('should respond with a list of runs sorted by date', async () => {
            const res = await get({
                url: `maps/${map1.id}/runs`,
                status: 200,
                query: { order: 'date' },
                token: user1Token
            });

            expects(res);

            const sortedRes = [...res.body.response];
            sortedRes.sort((n1, n2) => new Date(n2.createdAt).getTime() - new Date(n1.createdAt).getTime());

            expect(res.body.response).toEqual(sortedRes);
        });

        it('should respond with a list of runs sorted by time', async () => {
            const res = await get({
                url: `maps/${map1.id}/runs`,
                status: 200,
                query: { order: 'time' },
                token: user1Token
            });

            expects(res);

            const sortedRes = [...res.body.response];
            sortedRes.sort((n1, n2) => n1.ticks - n2.ticks);

            expect(res.body.response).toEqual(sortedRes);
        });

        it('should respond with 401 when no access token is provided', () =>
            get({
                url: `maps/${map1.id}/runs`,
                status: 401
            }));
    });

    // describe('GET maps/{mapID}/runs/{runID}', () => {
    //     it('should return the specified run', async () => {
    //         const res = await get({
    //             url: `maps/${map1.id}/runs/1`,
    //             status: 200,
    //             token: user1Token
    //         });
    //
    //         expect(res.body).toBeValidDto(RunDto);
    //     });
    //
    //     it('should respond with 401 when no access token is provided', () =>
    //         get({
    //             url: `maps/${map1.id}/runs/1`,
    //             status: 401
    //         }));
    // });

    // describe('GET maps/{mapID}/runs/{runID}/download', () => {
    //     it('should download the run', async () => {
    //         await get({
    //             url: `maps/${map1.id}/runs/1/download`,
    //             status: 200,
    //             token: user1Token
    //         });
    //     });
    //
    //     it('should respond with 401 when no access token is provided', () =>
    //         get({
    //             url: `maps/${map1.id}/runs/1/download`,
    //             status: 401
    //         }));
    // });

    describe('GET /api/maps/{mapID}/ranks', () => {
        const expects = (res) => expect(res.body).toBeValidPagedDto(UserMapRankDto);

        it("should return a list of a map's ranks", async () => {
            const res = await get({
                url: `maps/${map1.id}/ranks`,
                status: 200,
                token: user1Token
            });

            expects(res);
            expect(res.body.totalCount).toBe(5);
            expect(res.body.returnCount).toBe(5);
            expect(res.body.response[0]).toMatchObject({
                mapID: map1.id,
                userID: admin.id,
                runID: Number(run1.id),
                gameType: MapType.SURF,
                flags: 0,
                rank: 1
            });
        });

        it('should return only runs for a single player when given the query param playerID', async () => {
            const res = await get({
                url: `maps/${map1.id}/ranks`,
                status: 200,
                token: user1Token,
                query: { playerID: user1.id }
            });

            expects(res);
            expect(res.body.totalCount).toBe(1);
            expect(res.body.returnCount).toBe(1);
            expect(res.body.response[0]).toMatchObject({
                mapID: map1.id,
                userID: user1.id,
                runID: Number(run2.id),
                gameType: MapType.SURF,
                flags: 123,
                rank: 2
            });
        });

        it('should return only runs for a set of players when given the query param playerIDs', async () => {
            const res = await get({
                url: `maps/${map1.id}/ranks`,
                status: 200,
                token: user1Token,
                query: { playerIDs: `${admin.id},${user2.id}` }
            });

            expects(res);
            expect(res.body.totalCount).toBe(3);
            expect(res.body.returnCount).toBe(3);

            for (const rank of res.body.response) {
                expect([admin.id, user2.id]).toContain(rank.userID);
                expect(rank.mapID).toBe(map1.id);
            }
        });

        it('should return only runs with specific flags when given the query param flags', async () => {
            const res = await get({
                url: `maps/${map1.id}/ranks`,
                status: 200,
                token: user1Token,
                query: { flags: 123 }
            });

            expects(res);
            expect(res.body.totalCount).toBe(2);
            expect(res.body.returnCount).toBe(2);

            for (const rank of res.body.response) expect(rank.flags).toBe(123);
        });

        it('should order the list by date when given the query param orderByDate', async () => {
            const ascRanks = await get({
                url: `maps/${map1.id}/ranks`,
                status: 200,
                token: user1Token,
                query: { orderByDate: true }
            });

            const sortedAscRanks = [...ascRanks.body.response].sort(
                (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );

            expect(ascRanks.body.response).toEqual(sortedAscRanks);

            const descRanks = await get({
                url: `maps/${map1.id}/ranks`,
                status: 200,
                token: user1Token,
                query: { orderByDate: false }
            });

            const sortedDescRanks = [...descRanks.body.response].sort(
                (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            );

            expect(descRanks.body.response).toEqual(sortedDescRanks);
        });

        it('should work with a skip query', () =>
            skipTest({
                url: `maps/${map1.id}/ranks`,
                test: expect,
                token: user1Token
            }));

        it('should work with a take query', () =>
            takeTest({
                url: `maps/${map1.id}/ranks`,
                test: expect,
                token: user1Token
            }));

        it('should return 404 for a nonexistent map', () =>
            getNoContent({
                url: 'maps/9999999999999/ranks',
                status: 404,
                token: user1Token
            }));

        it('should return 401 without a token', () =>
            getNoContent({
                url: `maps/${map1.id}/ranks`,
                status: 401
            }));
    });

    describe('GET /api/maps/{mapID}/ranks/{rankNumber}', () => {
        const expects = (res) => expect(res.body).toBeValidDto(UserMapRankDto);

        it('should return the rank info for the rank and map specified', async () => {
            const res = await get({
                url: `maps/${map1.id}/ranks/1`,
                status: 200,
                token: user1Token
            });

            expects(res);
            expect(res.body).toMatchObject({
                rank: 1,
                mapID: map1.id,
                userID: admin.id,
                runID: Number(run1.id)
            });
        });

        it('should return the rank info for the rank and map and flags specified', async () => {
            const res = await get({
                url: `maps/${map1.id}/ranks/2`,
                status: 200,
                token: user1Token,
                query: { flags: 123 }
            });

            expects(res);
            expect(res.body).toMatchObject({
                rank: 2,
                flags: 123,
                mapID: map1.id,
                userID: user1.id,
                runID: Number(run2.id)
            });
        });

        it('should return the rank info for the rank and map and trackNum specified', async () => {
            const res = await get({
                url: `maps/${map1.id}/ranks/4`,
                status: 200,
                token: user1Token,
                query: { trackNum: 3 }
            });

            expects(res);
            expect(res.body).toMatchObject({
                trackNum: 3,
                // The ranks here don't really make sense, there's no faster runs on this track.
                // Sufficient for this test though (and similar for below).
                rank: 4,
                userID: user2.id,
                mapID: map1.id,
                runID: Number(run5.id)
            });
        });

        it('should return the rank info for the rank and map and zoneNum specified', async () => {
            const res = await get({
                url: `maps/${map1.id}/ranks/5`,
                status: 200,
                token: user1Token,
                query: { zoneNum: 3 }
            });

            expects(res);
            expect(res.body).toMatchObject({
                zoneNum: 3,
                rank: 5,
                userID: user3.id,
                mapID: map1.id,
                runID: Number(run6.id)
            });
        });

        it('should return 404 for a nonexistent map', () =>
            getNoContent({
                url: 'maps/9999999999999/ranks/1',
                status: 404,
                token: user1Token
            }));

        it('should return 404 for a nonexistent rank', () =>
            getNoContent({
                url: `maps/${map1.id}/ranks/999999`,
                status: 404,
                token: user1Token
            }));
        it('should return 401 without a token', () =>
            getNoContent({
                url: `maps/${map1.id}/ranks/1`,
                status: 401
            }));
    });

    describe('GET /api/maps/{mapID}/ranks/around', () => {
        it('should return a list of ranks around your rank', async () => {
            const prisma: PrismaService = global.prisma;

            const users = await Promise.all(
                Array.from({ length: 12 }, (_, i) =>
                    prisma.user.create({
                        data: {
                            steamID: Math.random().toString().slice(2),
                            alias: `User${i + 1}`,
                            roles: { create: { verified: true, mapper: true } }
                        }
                    })
                )
            );

            // Prisma unfortunately doesn't seem clever enough to let us do nested User -> Run -> UMR creation;
            // UMR needs a User to connect.
            await Promise.all(
                users.map((user, i) =>
                    prisma.run.create({
                        data: {
                            map: { connect: { id: map4.id } },
                            user: { connect: { id: user.id } },
                            trackNum: 0,
                            zoneNum: 0,
                            ticks: i + 1,
                            tickRate: 100,
                            flags: 0,
                            file: '',
                            time: (i + 1) * 100,
                            hash: '4fa6024f12494d3a99d8bda9b7a55f7d140f328' + i.toString(16),
                            rank: {
                                create: {
                                    map: { connect: { id: map4.id } },
                                    user: { connect: { id: user.id } },
                                    rank: i + 1,
                                    gameType: MapType.SURF
                                }
                            },
                            overallStats: { create: { jumps: 1 } }
                        }
                    })
                )
            );

            const authService = global.auth as AuthService;
            const user7Token = (await authService.loginWeb(users[6])).accessToken;

            try {
                const res = await get({
                    url: `maps/${map4.id}/ranks/around`,
                    status: 200,
                    token: user7Token
                });

                let prevRank = 1;
                expect(res.body).toBeInstanceOf(Array);
                expect(res.body.length).toBe(11);

                for (const umr of res.body) {
                    expect(umr).toBeValidDto(MapRankDto);
                    expect(umr.rank).toBe(prevRank + 1);
                    prevRank++;
                }
            } finally {
                // User deletion doesn't cascade delete Runs, their UserID set to null instead.
                prisma.run.deleteMany({ where: { mapID: map4.id } });
                prisma.user.deleteMany({ where: { id: { in: users.map((user) => user.id) } } });
            }
        });

        it('should return 404 for a nonexistent map', () =>
            get({
                url: 'maps/9999999999999/ranks/1',
                status: 404,
                token: user1Token
            }));

        it("should return 400 if rankNum isn't a number or around or friends", () =>
            get({
                url: `maps/${map1.id}/ranks/abcd`,
                status: 400,
                token: user1Token
            }));

        it('should return 401 without a token', () =>
            get({
                url: `maps/${map1.id}/ranks/1`,
                status: 401
            }));
    });
});
