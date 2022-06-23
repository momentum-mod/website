import * as request from 'supertest';
import { readFileSync } from 'fs';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AuthService } from '../src/modules/auth/auth.service';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/repo/prisma.service';
import { EMapStatus, EMapCreditType, EMapType } from '../src/@common/enums/map.enum';
import { ERole } from '../src/@common/enums/user.enum';
import { Prisma } from '@prisma/client';

describe('Maps', () => {
    let app: INestApplication, server, testUser, testAdmin, testAdminGame, testMap, testMap2;

    const testUserData = {
        aliasLocked: false,
        country: 'US',
        steamID: '65465432154',
        alias: 'Ron Weasley',
        avatar: '',
        roles: ERole.VERIFIED | ERole.MAPPER,
        bans: 0,
        profiles: {
            create: [
                {
                    bio: 'Ronald Bilius "Ron" Weasley (b. 1 March, 1980) was an English pure-blood wizard, the sixth and youngest son of Arthur and Molly Weasley (née Prewett). He was also the younger brother of Bill, Charlie, Percy, Fred, George, and the elder brother of Ginny. Ron and his siblings lived at the The Burrow, on the outskirts of Ottery St Catchpole, Devon.\''
                }
            ]
        }
    };
    const testAdminData = {
        aliasLocked: false,
        country: 'US',
        steamID: '54132121685476543',
        alias: 'Fred Weasley',
        avatar: '',
        roles: ERole.ADMIN,
        bans: 0,
        profiles: {
            create: [
                {
                    bio: 'Ronald Bilius "Ron" Weasley (b. 1 March, 1980) was an English pure-blood wizard, the sixth and youngest son of Arthur and Molly Weasley (née Prewett). He was also the younger brother of Bill, Charlie, Percy, Fred, George, and the elder brother of Ginny. Ron and his siblings lived at the The Burrow, on the outskirts of Ottery St Catchpole, Devon.\''
                }
            ]
        }
    };
    const testAdminGameData = {
        aliasLocked: false,
        country: 'US',
        steamID: '5416876413213874',
        alias: 'George Weasley',
        avatar: '',
        roles: ERole.ADMIN,
        bans: 0,
        profiles: {
            create: [
                {
                    bio: "George Weasley (b. 1 April, 1978) was an English pure-blood wizard, the fifth son and the less dominant among the twins of Arthur Weasley and Molly Weasley (née Prewett), younger brother of Bill, Charlie and Percy, younger twin brother and best friend of the late Fred Weasley, and older brother to Ron and Ginny. George's first few years were marked by the height of the First Wizarding War and Lord Voldemort's first fall."
                }
            ]
        }
    };

    const testMapData: Prisma.MapCreateArgs = {
        data: {
            name: 'test_map_one',
            type: EMapType.TRICKSURF,
            statusFlag: EMapStatus.APPROVED,
            submitterID: testUser?.id,
            info: {
                create: {
                    description: 'My first map!!!!',
                    numTracks: 1,
                    creationDate: new Date()
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
                    type: +EMapCreditType.AUTHOR,
                    userID: testUser?.id
                }
            },
            images: {
                create: {
                    small: '',
                    medium: '',
                    large: ''
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
    };

    const testMap2Data: Prisma.MapCreateArgs = {
        data: {
            name: 'test_map_two',
            type: EMapType.BHOP,
            statusFlag: EMapStatus.APPROVED,
            submitterID: testUser?.id,
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
                    type: EMapCreditType.AUTHOR,
                    userID: testUser?.id
                }
            },
            images: {
                create: {
                    small: '',
                    medium: '',
                    large: ''
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
    };

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [AppModule]
        }).compile();

        app = moduleRef.createNestApplication();

        // TODO: I don't like having to put this in here...
        app.useGlobalPipes(new ValidationPipe({ transform: true }));

        await app.init();
        server = app.getHttpServer();

        const authService = app.get<AuthService>(AuthService);
        const repo = app.get<PrismaService>(PrismaService);

        // Create Users
        testUser = await repo.user.create({
            data: testUserData,
            // can we remove this once stuff is working? try it!
            include: {
                profile: true
            }
        });
        testAdmin = await repo.user.create({
            data: testAdminData,
            include: {
                profile: true
            }
        });
        testAdminGame = await repo.user.create({
            data: testAdminGameData,
            include: {
                profile: true
            }
        });

        // Create Maps (needs user ids)
        testMap = await repo.map.create(testMapData);

        testMap2 = await repo.map.create(testMap2Data);

        // login users
        testUser.access_token = (await authService.login(testUser)).access_token;
        testAdmin.access_token = (await authService.login(testAdmin)).access_token;
        testAdminGame.access_token = (await authService.login(testAdminGame)).access_token;
    });

    describe('POST /api/v1/maps', () => {
        it('should respond with 401 when no access token is provided', async () => {
            const res = await request(server).get('/api/v1/maps').expect('Content-Type', /json/).expect(401);

            expect(res.body).toHaveProperty('error');
            expect(res.body.error.code).toEqual(401);
            expect(typeof res.body.error.message).toBe('string');
        });

        it('should create a new map', async () => {
            const res = await request(server)
                .post('/api/v1/maps')
                .set('Authorization', 'Bearer ' + testUser.accessToken)
                .send({
                    name: 'test_map_5',
                    type: EMapType.SURF,
                    info: {
                        description: 'newmap_5',
                        numTracks: 1,
                        creationDate: new Date()
                    },
                    tracks: [
                        {
                            trackNum: 0,
                            numZones: 1,
                            isLinear: false,
                            difficulty: 5
                        }
                    ],
                    credits: [
                        {
                            userID: testUser.id,
                            type: EMapCreditType.AUTHOR
                        }
                    ]
                })
                .expect('Content-Type', /json/)
                .expect(200);

            expect(res.body).toHaveProperty('id');
            expect(res.body).toHaveProperty('name');
            expect(res.body.info).toHaveProperty('description');
        });
    });

    describe('GET /api/v1/maps', () => {
        it('should respond with 401 when no access token is provided', async () => {
            const res = await request(server).get('/api/v1/maps').expect('Content-Type', /json/).expect(401);

            expect(res.body).toHaveProperty('error');
            expect(res.body.error.code).toEqual(401);
            expect(typeof res.body.error.message).toBe('string');
        });

        it('should respond with map data', async () => {
            const res = await request(server)
                .get('/api/v1/maps/')
                .set('Authorization', 'Bearer ' + testAdmin.access_token)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(res.body).toHaveProperty('maps');
            expect(Array.isArray(res.body.maps)).toBe(true);
            expect(res.body.maps).toHaveLength(2);
            expect(res.body.count).toEqual(2);
            expect(res.body.maps[0]).toHaveProperty('name');
        });
        it('should respond with filtered map data using the limit parameter', async () => {
            const res = await request(server)
                .get('/api/v1/maps')
                .set('Authorization', 'Bearer ' + testUser.accessToken)
                .query({ limit: 1 })
                .expect('Content-Type', /json/)
                .expect(200);

            expect(res.body).toHaveProperty('maps');
            expect(Array.isArray(res.body.maps)).toBe(true);
            expect(res.body.maps).toHaveLength(1);
            expect(res.body.count).toEqual(2);
            expect(res.body.maps[0]).toHaveProperty('name');
        });

        it('should respond with filtered map data using the offset parameter', async () => {
            const res = await request(server)
                .get('/api/v1/maps')
                .set('Authorization', 'Bearer ' + testUser.accessToken)
                .query({ offset: 1 })
                .expect('Content-Type', /json/)
                .expect(200);

            expect(res.body).toHaveProperty('maps');
            expect(Array.isArray(res.body.maps)).toBe(true);
            expect(res.body.maps).toHaveLength(1);
            expect(res.body.count).toEqual(2);
            expect(res.body.maps[0]).toHaveProperty('name');
        });

        it('should respond with filtered map data using the search parameter', async () => {
            const res = await request(server)
                .get('/api/v1/maps')
                .set('Authorization', 'Bearer ' + testUser.accessToken)
                .query({ search: testMap.name })
                .expect('Content-Type', /json/)
                .expect(200);

            expect(res.body).toHaveProperty('maps');
            expect(Array.isArray(res.body.maps)).toBe(true);
            expect(res.body.maps).toHaveLength(1);
            expect(res.body.count).toEqual(1);
            expect(res.body.maps[0]).toHaveProperty('name');
        });

        it('should respond with filtered map data using the submitter id parameter', async () => {
            const res = await request(server)
                .get('/api/v1/maps')
                .set('Authorization', 'Bearer ' + testUser.accessToken)
                .query({ submitterID: testUser.id })
                .expect('Content-Type', /json/)
                .expect(200);

            expect(res.body).toHaveProperty('maps');
            expect(Array.isArray(res.body.maps)).toBe(true);
            expect(res.body.maps).toHaveLength(2);
            expect(res.body.count).toEqual(2);
            expect(res.body.maps[0]).toHaveProperty('name');
        });

        it('should respond with filtered map data based on the map type', async () => {
            const res = await request(server)
                .get('/api/v1/maps')
                .set('Authorization', 'Bearer ' + testUser.accessToken)
                .query({ type: testMap.type })
                .expect('Content-Type', /json/)
                .expect(200);

            expect(res.body).toHaveProperty('maps');
            expect(Array.isArray(res.body.maps)).toBe(true);
            expect(res.body.maps).toHaveLength(1);
            expect(res.body.maps[0]).toHaveProperty('name');
        });

        it('should respond with filtered map data using the expand info parameter', async () => {
            const res = await request(server)
                .get('/api/v1/maps')
                .set('Authorization', 'Bearer ' + testUser.accessToken)
                .query({ expand: 'info' })
                .expect('Content-Type', /json/)
                .expect(200);

            expect(res.body).toHaveProperty('maps');
            expect(Array.isArray(res.body.maps)).toBe(true);
            expect(res.body.maps).toHaveLength(2);
            expect(res.body.count).toEqual(2);
            expect(res.body.maps[0]).toHaveProperty('info');
            expect(res.body.maps[0].info).toHaveProperty('description');
        });

        it('should respond with filtered map data using the expand submitter parameter', async () => {
            const res = await request(server)
                .get('/api/v1/maps')
                .set('Authorization', 'Bearer ' + testUser.accessToken)
                .query({ expand: 'submitter' })
                .expect('Content-Type', /json/)
                .expect(200);

            expect(res.body).toHaveProperty('maps');
            expect(Array.isArray(res.body.maps)).toBe(true);
            expect(res.body.maps).toHaveLength(2);
            expect(res.body.count).toEqual(2);
            expect(res.body.maps[0]).toHaveProperty('submitter');
            expect(res.body.maps[0].submitter).toHaveProperty('roles');
        });

        it('should respond with filtered map data using the expand credits parameter', async () => {
            const res = await request(server)
                .get('/api/v1/maps')
                .set('Authorization', 'Bearer ' + testUser.accessToken)
                .query({ expand: 'credits' })
                .expect('Content-Type', /json/)
                .expect(200);

            expect(res.body).toHaveProperty('maps');
            expect(Array.isArray(res.body.maps)).toBe(true);
            expect(res.body.maps).toHaveLength(2);
            expect(res.body.count).toEqual(2);
            expect(res.body.maps[0]).toHaveProperty('credits');
            expect(res.body.maps[0].credits[0]).toHaveProperty('type');
        });
    });

    describe('GET /api/v1/maps/{mapID}', () => {
        it('should respond with 404 when the map is not found', async () => {
            const res = await request(server)
                .get('/api/v1/maps/1337')
                .set('Authorization', 'Bearer ' + testUser.accessToken)
                .expect('Content-Type', /json/)
                .expect(404);

            expect(res.body).toHaveProperty('error');
            expect(res.body.error.code).toEqual(404);
            expect(typeof res.body.error.message).toBe('string');
        });

        it('should respond with 401 when no access token is provided', async () => {
            const res = await request(server)
                .get('/api/v1/maps/' + testMap.id)
                .expect('Content-Type', /json/)
                .expect(401);

            expect(res.body).toHaveProperty('error');
            expect(res.body.error.code).toEqual(401);
            expect(typeof res.body.error.message).toBe('string');
        });

        it('should respond with map data', async () => {
            const res = await request(server)
                .get('/api/v1/maps/' + testMap.id)
                .set('Authorization', 'Bearer ' + testUser.accessToken)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(res.body).toHaveProperty('id');
        });

        it('should respond with map data while using the expand info parameter', async () => {
            const res = await request(server)
                .get('/api/v1/maps/' + testMap.id)
                .set('Authorization', 'Bearer ' + testUser.accessToken)
                .query({ expand: 'info' })
                .expect('Content-Type', /json/)
                .expect(200);

            expect(res.body).toHaveProperty('id');
            expect(res.body.info).toHaveProperty('description');
        });

        it('should respond with map data while using the expand submitter parameter', async () => {
            const res = await request(server)
                .get('/api/v1/maps/' + testMap.id)
                .set('Authorization', 'Bearer ' + testUser.accessToken)
                .query({ expand: 'submitter' })
                .expect('Content-Type', /json/)
                .expect(200);

            expect(res.body).toHaveProperty('id');
            expect(res.body).toHaveProperty('name');
            expect(res.body.submitter).toHaveProperty('roles');
        });

        it('should respond with map data while using the expand credits parameter', async () => {
            const res = await request(server)
                .get('/api/v1/maps/' + testMap.id)
                .set('Authorization', 'Bearer ' + testUser.accessToken)
                .query({ expand: 'credits' })
                .expect('Content-Type', /json/)
                .expect(200);

            expect(res.body).toHaveProperty('id');
            expect(res.body.credits[0]).toHaveProperty('type');
        });

        it('should respond with map data while using the expand images parameter', async () => {
            const res = await request(server)
                .get('/api/v1/maps/' + testMap.id)
                .set('Authorization', 'Bearer ' + testUser.accessToken)
                .query({ expand: 'images' })
                .expect('Content-Type', /json/)
                .expect(200);

            expect(res.body).toHaveProperty('id');
            expect(res.body.images[0]).toHaveProperty('small');
            expect(res.body.images[0]).toHaveProperty('medium');
            expect(res.body.images[0]).toHaveProperty('large');
        });

        it('should respond with map data while using the expand stats parameter', async () => {
            const res = await request(server)
                .get('/api/v1/maps/' + testMap.id)
                .set('Authorization', 'Bearer ' + testUser.accessToken)
                .query({ expand: 'stats' })
                .expect('Content-Type', /json/)
                .expect(200);

            expect(res.body).toHaveProperty('id');
            expect(res.body.stats).toHaveProperty('totalReviews');
        });
    });

    describe('GET /api/v1/maps/{mapID}/info', () => {
        it('should respond with map info', async () => {
            const res = await request(server)
                .get('/api/v1/maps/' + testMap.id + '/info')
                .set('Authorization', 'Bearer ' + testUser.accessToken)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(res.body).toHaveProperty('description');
        });

        it('should return 404 if the map is not found', async () => {
            const res = await request(server)
                .get('/api/v1/maps/00091919/info')
                .set('Authorization', 'Bearer ' + testUser.accessToken)
                .expect('Content-Type', /json/)
                .expect(404);

            expect(res.body).toHaveProperty('error');
            expect(res.body.error.code).toEqual(404);
            expect(typeof res.body.error.message).toBe('string');
        });

        it('should respond with 401 when no access token is provided', async () => {
            const res = await request(server)
                .get('/api/v1/maps/' + testMap.id + '/info')
                .expect('Content-Type', /json/)
                .expect(401);

            expect(res.body).toHaveProperty('error');
            expect(res.body.error.code).toEqual(401);
            expect(typeof res.body.error.message).toBe('string');
        });
    });

    describe('PATCH /api/v1/maps/{mapID}/info', () => {
        it('should respond with map info', async () => {
            await request(server)
                .patch('/api/v1/maps/' + testMap.id + '/info')
                .set('Authorization', 'Bearer ' + testUser.accessToken)
                .send({
                    description: 'testnewdesc'
                })
                .expect(204);
        });

        // swagger says this should return 404 if the map is not found,
        // but it won't get past the check for if the map was submitted
        // by that user or not
        it('should return 403 if the map was not submitted by that user', async () => {
            const res = await request(server)
                .patch('/api/v1/maps/00091919/info')
                .set('Authorization', 'Bearer ' + testUser.accessToken)
                .expect('Content-Type', /json/)
                .expect(403);

            expect(res.body).toHaveProperty('error');
            expect(res.body.error.code).toEqual(403);
            expect(typeof res.body.error.message).toBe('string');
        });

        it('should respond with 401 when no access token is provided', async () => {
            const res = await request(server)
                .patch('/api/v1/maps/' + testMap.id + '/info')
                .expect('Content-Type', /json/)
                .expect(401);

            expect(res.body).toHaveProperty('error');
            expect(res.body.error.code).toEqual(401);
            expect(typeof res.body.error.message).toBe('string');
        });
    });

    describe('GET /api/v1/maps/{mapID}/credits', () => {
        it('should respond with the specified maps credits', async () => {
            const res = await request(server)
                .get('/api/v1/maps/' + testMap.id + '/credits')
                .set('Authorization', 'Bearer ' + testUser.accessToken)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(res.body.mapCredits[0]).toHaveProperty('type');
        });

        it('should respond with the specified maps credits with the expand parameter', async () => {
            const res = await request(server)
                .get('/api/v1/maps/' + testMap.id + '/credits')
                .set('Authorization', 'Bearer ' + testUser.accessToken)
                .query({ expand: 'user' })
                .expect('Content-Type', /json/)
                .expect(200);

            expect(res.body.mapCredits[0]).toHaveProperty('type');
            expect(res.body.mapCredits[0].user).toHaveProperty('roles');
        });

        // should this return a 404 instead of a 200?
        it('should return 200 with an empty array', async () => {
            const res = await request(server)
                .get('/api/v1/maps/999999999999999/credits')
                .set('Authorization', 'Bearer ' + testUser.accessToken)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(res.body.mapCredits).toHaveLength(0);
        });

        it('should respond with 401 when no access token is provided', async () => {
            const res = await request(server)
                .get('/api/v1/maps/' + testMap.id + '/credits')
                .expect('Content-Type', /json/)
                .expect(401);

            expect(res.body).toHaveProperty('error');
            expect(res.body.error.code).toEqual(401);
            expect(typeof res.body.error.message).toBe('string');
        });
    });

    // Note: will only create one credit. if a map has an existing credit than it wont make another
    describe('POST /api/v1/maps/{mapID}/credits', () => {
        it('should create a map credit for the specified map', async () => {
            const res = await request(server)
                .post('/api/v1/maps/' + testMap.id + '/credits')
                .set('Authorization', 'Bearer ' + testUser.accessToken)
                .send({
                    type: EMapCreditType.SPECIAL_THANKS,
                    userID: testAdmin.id
                })
                .expect('Content-Type', /json/)
                .expect(200);

            expect(res.body).toHaveProperty('id');
            expect(res.body).toHaveProperty('type');
            expect(res.body).toHaveProperty('userID');
        });
        it('should respond with 401 when no access token is provided', async () => {
            const res = await request(server)
                .post('/api/v1/maps/' + testMap.id + '/credits')
                .expect('Content-Type', /json/)
                .expect(401);

            expect(res.body).toHaveProperty('error');
            expect(res.body.error.code).toEqual(401);
            expect(typeof res.body.error.message).toBe('string');
        });
    });

    describe('GET /api/v1/maps/{mapID}/credits/{mapCredID}', () => {
        it('should return the map credit of the specified map', async () => {
            const res = await request(server)
                .get('/api/v1/maps/' + testMap.id + '/credits/' + testMap.credits.id)
                .set('Authorization', 'Bearer ' + testUser.accessToken)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(res.body).toHaveProperty('id');
            expect(res.body).toHaveProperty('type');
        });

        it('should return the map credit of the specified map with an expand parameter', async () => {
            const res = await request(server)
                .get('/api/v1/maps/' + testMap.id + '/credits/' + testMap.credits.id)
                .set('Authorization', 'Bearer ' + testUser.accessToken)
                .query({ expand: 'user' })
                .expect('Content-Type', /json/)
                .expect(200);

            expect(res.body).toHaveProperty('id');
            expect(res.body).toHaveProperty('type');
            expect(res.body.user).toHaveProperty('roles');
        });

        it('should return a 404 if the map is not found', async () => {
            const res = await request(server)
                .get('/api/v1/maps/20090909/credits/222')
                .set('Authorization', 'Bearer ' + testUser.accessToken)
                .expect('Content-Type', /json/)
                .expect(404);

            expect(res.body).toHaveProperty('error');
            expect(res.body.error.code).toEqual(404);
            expect(typeof res.body.error.message).toBe('string');
        });

        it('should respond with 401 when no access token is provided', async () => {
            const res = await request(server)
                .get('/api/v1/maps/' + testMap.id + '/credits/' + testMap.credits.id)
                .expect('Content-Type', /json/)
                .expect(401);

            expect(res.body).toHaveProperty('error');
            expect(res.body.error.code).toEqual(401);
            expect(typeof res.body.error.message).toBe('string');
        });
    });

    describe('PATCH /api/v1/maps/{mapID}/credits/{mapCredID}', () => {
        it('should update the specified map credit', async () => {
            await request(server)
                .patch('/api/v1/maps/' + testMap.id + '/credits/' + testMap.credits.id)
                .set('Authorization', 'Bearer ' + testUser.accessToken)
                .send({
                    type: EMapCreditType.TESTER,
                    userID: testAdmin.id
                })
                .expect(204);
        });

        it('should return 403 if the map was not submitted by that user', async () => {
            const res = await request(server)
                .patch('/api/v1/maps/3938282929/credits/234532')
                .set('Authorization', 'Bearer ' + testUser.accessToken)
                .send({
                    type: EMapCreditType.AUTHOR,
                    userID: testAdmin.id
                })
                .expect('Content-Type', /json/)
                .expect(403);

            expect(res.body).toHaveProperty('error');
            expect(res.body.error.code).toEqual(403);
            expect(typeof res.body.error.message).toBe('string');
        });

        it('should respond with 401 when no access token is provided', async () => {
            const res = await request(server)
                .patch('/api/v1/maps/' + testMap.id + '/credits/' + testMap.credits.id)
                .expect('Content-Type', /json/)
                .expect(401);

            expect(res.body).toHaveProperty('error');
            expect(res.body.error.code).toEqual(401);
            expect(typeof res.body.error.message).toBe('string');
        });
    });

    describe('DELETE /api/v1/maps/{mapID}/credits{mapCredID}', () => {
        it('should delete the specified map credit', async () => {
            await request(server)
                .delete('/api/v1/maps/' + testMap.id + '/credits/' + testMap.credits.id)
                .set('Authorization', 'Bearer ' + testUser.accessToken)
                .expect('Content-Type', /json/)
                .expect(200);
        });

        it('should respond with 401 when no access token is provided', async () => {
            const res = await request(server)
                .delete('/api/v1/maps/' + testMap.id + '/credits/' + testMap.credits.id)
                .expect('Content-Type', /json/)
                .expect(401);
            expect(res.body).toHaveProperty('error');
            expect(res.body.error.code).toEqual(401);
            expect(typeof res.body.error.message).toBe('string');
        });
    });

    describe('PUT /maps/{mapID}/thumbnail', () => {
        it('should upload and update the thumbnail for a map', async () => {
            await request(server)
                .put('/api/v1/maps/' + testMap.id + '/thumbnail')
                .set('Authorization', 'Bearer ' + testUser.accessToken)
                .attach('thumbnailFile', readFileSync('test/testImage.jpg'), 'testImage.jpg')
                .expect(204);
        });

        it('should return a 400 if no thumbnail file is provided', async () => {
            const res = await request(server)
                .put('/api/v1/maps/' + testMap.id + '/thumbnail')
                .set('Authorization', 'Bearer ' + testUser.accessToken)
                .expect('Content-Type', /json/)
                .expect(400);

            expect(res.body).toHaveProperty('error');
            expect(res.body.error.code).toEqual(400);
            expect(typeof res.body.error.message).toBe('string');
        });

        it('should return a 403 if the submitter ID does not match the userId', async () => {
            const res = await request(server)
                .put('/api/v1/maps/12133122/thumbnail')
                .set('Authorization', 'Bearer ' + testUser.accessToken)
                .attach('thumbnailFile', readFileSync('test/testImage.jpg'), 'testImage.jpg')
                .expect('Content-Type', /json/)
                .expect(403);

            expect(res.body).toHaveProperty('error');
            expect(res.body.error.code).toEqual(403);
            expect(typeof res.body.error.message).toBe('string');
        });

        it('should respond with 401 when no access token is provided', async () => {
            const res = await request(server)
                .put('/api/v1/maps/' + testMap.id + '/thumbnail')
                .expect('Content-Type', /json/)
                .expect(401);

            expect(res.body).toHaveProperty('error');
            expect(res.body.error.code).toEqual(401);
            expect(typeof res.body.error.message).toBe('string');
        });
    });

    describe('POST /maps/{mapID}/images', () => {
        it('should create a map image for the specified map', async () => {
            await request(server)
                .post('/api/v1/maps/' + testMap.id + '/images')
                .set('Authorization', 'Bearer ' + testUser.accessToken)
                .attach('mapImageFile', readFileSync('test/testImage.jpg'), 'testImage.jpg')
                .expect('Content-Type', /json/)
                .expect(200);
        });
        it('should respond with 401 when no access token is provided', async () => {
            const res = await request(server)
                .post('/api/v1/maps/' + testMap.id + '/images')
                .expect('Content-Type', /json/)
                .expect(401);

            expect(res.body).toHaveProperty('error');
            expect(res.body.error.code).toEqual(401);
            expect(typeof res.body.error.message).toBe('string');
        });
    });

    describe('GET /api/v1/maps/{mapID}/upload', () => {
        it('should respond with the location for where to upload the map file', async () => {
            await request(server)
                .get('/api/v1/maps/' + testMap2.id + '/upload')
                .set('Authorization', 'Bearer ' + testUser.accessToken)
                .expect('Content-Type', /json/)
                .expect(204);
        });

        it('should respond with 401 when no access token is provided', async () => {
            const res = await request(server)
                .get('/api/v1/maps/' + testMap2.id + '/upload')
                .expect('Content-Type', /json/)
                .expect(401);

            expect(res.body).toHaveProperty('error');
            expect(res.body.error.code).toEqual(401);
            expect(typeof res.body.error.message).toBe('string');
        });
    });

    describe('POST /maps/{mapID}/upload', () => {
        it('should respond with a 400 when no map file is provided', async () => {
            const res = await request(server)
                .post('/api/v1/maps/' + testMap2.id + '/upload')
                .type('form')
                .set('Authorization', 'Bearer ' + testUser.accessToken)
                .send(null)
                .expect('Content-Type', /json/)
                .expect(404);

            expect(res.body).toHaveProperty('error');
            expect(res.body.error.code).toEqual(400);
            expect(typeof res.body.error.message).toBe('string');
        });

        it('should respond with a 403 when the submitterID does not match the userID', async () => {
            const res = await request(server)
                .post('/api/v1/maps/12133122/upload')
                .set('Authorization', 'Bearer ' + testUser.accessToken)
                .attach('mapFile', readFileSync('test/testMap.bsp'), 'testMap.bsp')
                .expect('Content-Type', /json/)
                .expect(403);

            expect(res.body).toHaveProperty('error');
            expect(res.body.error.code).toEqual(403);
            expect(typeof res.body.error.message).toBe('string');
        });

        it('should respond with a 409 when the map is not accepting uploads', async () => {
            const res = await request(server)
                .post('/api/v1/maps/' + testMap.id + '/upload')
                .set('Authorization', 'Bearer ' + testUser.accessToken)
                .attach('mapFile', readFileSync('test/testMap.bsp'), 'testMap.bsp')
                .expect('Content-Type', /json/)
                .expect(409);

            expect(res.body).toHaveProperty('error');
            expect(res.body.error.code).toEqual(409);
            expect(typeof res.body.error.message).toBe('string');
        });

        it('should upload the map file', async () => {
            await request(server)
                .post('/api/v1/maps/' + testMap2.id + '/upload')
                .set('Authorization', 'Bearer ' + testUser.accessToken)
                .attach('mapFile', readFileSync('test/testMap.bsp'), 'testMap.bsp')
                .expect('Content-Type', /json/)
                .expect(200);
        });

        it('should respond with 401 when no access token is provided', async () => {
            const res = await request(server)
                .post('/api/v1/maps/' + testMap2.id + '/upload')
                .expect('Content-Type', /json/)
                .expect(401);

            expect(res.body).toHaveProperty('error');
            expect(res.body.error.code).toEqual(401);
            expect(typeof res.body.error.message).toBe('string');
        });
    });

    describe('GET /api/v1/maps/{mapID}/download', () => {
        it('should respond with a 404 when the map is not found', async () => {
            const res = await request(server)
                .get('/api/v1/maps/12345/download')
                .set('Authorization', 'Bearer ' + testUser.accessToken)
                .expect('Content-Type', /json/)
                .expect(404);

            expect(res.body).toHaveProperty('error');
            expect(res.body.error.code).toEqual(404);
            expect(typeof res.body.error.message).toBe('string');
        });

        it('should download the map file', async () => {
            await request(server)
                .get('/api/v1/maps/' + testMap2.id + '/download')
                .set('Authorization', 'Bearer ' + testUser.accessToken)
                .expect('Content-Type', /json/)
                .expect(200);
        });

        it('should respond with 401 when no access token is provided', async () => {
            const res = await request(server)
                .get('/api/v1/maps/' + testMap2.id + '/download')
                .expect('Content-Type', /json/)
                .expect(401);

            expect(res.body).toHaveProperty('error');
            expect(res.body.error.code).toEqual(401);
            expect(typeof res.body.error.message).toBe('string');
        });
    });

    describe('GET /api/v1/maps/{mapID}/images', () => {
        it('should respond with a list of images', async () => {
            const res = await request(server)
                .get('/api/v1/maps/' + testMap.id + '/images')
                .set('Authorization', 'Bearer ' + testUser.accessToken)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(res.body.images[0]).toHaveProperty('small');
            expect(res.body.images[0]).toHaveProperty('medium');
            expect(res.body.images[0]).toHaveProperty('large');
            expect(res.body.images[0]).toHaveProperty('mapID');
        });

        it('should respond with 401 when no access token is provided', async () => {
            const res = await request(server)
                .get('/api/v1/maps/' + testMap.id + '/images')
                .expect('Content-Type', /json/)
                .expect(401);

            expect(res.body).toHaveProperty('error');
            expect(res.body.error.code).toEqual(401);
            expect(typeof res.body.error.message).toBe('string');
        });
    });

    describe('GET /api/v1/maps/{mapID}/images/{imgID}', () => {
        // Don't know why this is failing
        it('should respond with 404 when the image is not found', async () => {
            const res = await request(server)
                .get('/api/v1/maps/' + testMap.id + '/images/12345')
                .set('Authorization', 'Bearer ' + testUser.accessToken)
                .expect('Content-Type', /json/)
                .expect(404);

            expect(res.body).toHaveProperty('error');
            expect(res.body.error.code).toEqual(404);
            expect(res.body.error.message).toBe('string');
        });

        it('should respond with image info', async () => {
            const res = await request(server)
                .get('/api/v1/maps/' + testMap.id + '/images/' + testMap.images.id)
                .set('Authorization', 'Bearer ' + testUser.accessToken)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(res.body).toHaveProperty('URL');
            expect(res.body).toHaveProperty('mapID');
            expect(res.body.mapID).toEqual(testMap.id);
        });
        it('should respond with 401 when no access token is provided', async () => {
            const res = await request(server)
                .get('/api/v1/maps/' + testMap.id + '/images/' + testMap.images.id)
                .expect('Content-Type', /json/)
                .expect(401);

            expect(res.body).toHaveProperty('error');
            expect(res.body.error.code).toEqual(401);
            expect(res.body.error.message).toBe('string');
        });
    });

    describe('PUT /api/v1/maps/{mapID}/images/{imgID}', () => {
        it('should respond with 404 when the image is not found', async () => {
            const file = readFileSync('test/testImage2.jpg');
            const res = await request(server)
                .put('/api/v1/maps/' + testMap.id + '/images/99')
                .set('Authorization', 'Bearer ' + testUser.accessToken)
                .attach('mapImageFile', file, 'testImage2.jpg')
                .expect('Content-Type', /json/)
                .expect(200);

            expect(res.body).toHaveProperty('error');
            expect(res.body.error.code).toEqual(404);
            expect(typeof res.body.error.message).toBe('string');
        });

        it('should respond with 400 when no map image is provided', async () => {
            const res = await request(server)
                .put('/api/v1/maps/' + testMap.id + '/images/' + testMap.images[0].id)
                .type('form')
                .set('Authorization', 'Bearer ' + testUser.accessToken)
                .expect('Content-Type', /json/)
                .expect(400);

            expect(res.body).toHaveProperty('error');
            expect(res.body.error.code).toEqual(400);
            expect(typeof res.body.error.message).toBe('string');
        });

        it('should update the map image', async () => {
            await request(server)
                .put('/api/v1/maps/' + testMap.id + '/images/' + testMap.images[0].id)
                .set('Authorization', 'Bearer ' + testUser.accessToken)
                .attach('mapImageFile', readFileSync('test/testImage2.jpg'), 'testImage2.jpg')
                .expect('Content-Type', /json/)
                .expect(204);
        });

        it('should respond with 401 when no access token is provided', async () => {
            const res = await request(server)
                .put('/api/v1/maps/' + testMap.id + '/images/' + testMap.images.id)
                .expect('Content-Type', /json/)
                .expect(401);

            expect(res.body).toHaveProperty('error');
            expect(res.body.error.code).toEqual(401);
            expect(typeof res.body.error.message).toBe('string');
        });
    });

    describe('DELETE /api/v1/maps/{mapID}/images/{imgID}', () => {
        it('should delete the map image', async () => {
            await request(server)
                .delete('/api/v1/maps/' + testMap.id + '/images/' + testMap.images[0].id)
                .set('Authorization', 'Bearer ' + testUser.accessToken)
                .expect('Content-Type', /json/)
                .expect(204);
        });
        it('should respond with 401 when no access token is provided', async () => {
            const res = await request(server)
                .delete('/api/v1/maps/' + testMap.id + '/images/' + testMap.images.id)
                .expect('Content-Type', /json/)
                .expect(401);

            expect(res.body).toHaveProperty('error');
            expect(res.body.error.code).toEqual(401);
            expect(typeof res.body.error.message).toBe('string');
        });
    });

    describe('POST /api/v1/maps/{mapID}/runs', () => {
        it('should upload a run file', async () => {
            await request(server)
                .post('/api/v1/maps/' + testMap2.id + '/runs')
                .set('Authorization', 'Bearer ' + testUser.accessToken)
                .set('Content-Type', 'application/octet-stream')
                .send(readFileSync('test/testRun.momrec'))
                .expect('Content-Type', /json/)
                .expect(200);
        });
        it('should respond with 401 when no access token is provided', async () => {
            const res = await request(server)
                .post('/api/v1/maps/' + testMap2.id + '/runs')
                .set('Content-Type', 'application/octet-stream')
                .send(readFileSync('test/testRun.momrec'))
                .expect('Content-Type', /json/)
                .expect(401);

            expect(res.body).toHaveProperty('error');
            expect(res.body.error.code).toEqual(401);
            expect(res.body.error.message).toBe('string');
        });
    });

    describe('GET /api/v1/maps/{mapID}/runs', () => {
        it('should return run files for the specified map', async () => {
            await request(server)
                .post('/api/v1/maps/' + testMap2.id + '/runs')
                .set('Authorization', 'Bearer ' + testUser.accessToken)
                .set('Content-Type', 'application/octet-stream')
                .send(readFileSync('test/testRun.momrec'))
                .expect('Content-Type', /json/)
                .expect(200);

            const res2 = await request(server)
                .get('/api/v1/maps/' + testMap2.id + '/runs')
                .set('Authorization', 'Bearer ' + testUser.accessToken)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(res2.body).toHaveProperty('runs');
            expect(res2.body.runs).toHaveLength(2);
        });

        it('should respond with 401 when no access token is provided', async () => {
            const res = await request(server)
                .get('/api/v1/maps/' + testMap2.id + '/runs')
                .expect('Content-Type', /json/)
                .expect(401);

            expect(res.body).toHaveProperty('error');
            expect(res.body.error.code).toEqual(401);
            expect(res.body.error.message).toBe('string');
        });
    });

    describe('GET /api/v1/maps/{mapID}/runs/{runID}', () => {
        it('should return the specified run', async () => {
            const res = await request(server)
                .get('/api/v1/maps/' + testMap2.id + '/runs/1')
                .set('Authorization', 'Bearer ' + testUser.accessToken)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(res.body).toHaveProperty('rank');
        });

        it('should respond with 401 when no access token is provided', async () => {
            const res = await request(server)
                .get('/api/v1/maps/' + testMap2.id + '/runs/1')
                .expect('Content-Type', /json/)
                .expect(401);

            expect(res.body).toHaveProperty('error');
            expect(res.body.error.code).toEqual(401);
            expect(res.body.error.message).toBe('string');
        });
    });

    describe('GET /api/v1/maps/{mapID}/runs/{runID}/download', () => {
        it('should download the run', async () => {
            await request(server)
                .get('/api/v1/maps/' + testMap2.id + '/runs/1/download')
                .set('Authorization', 'Bearer ' + testUser.accessToken)
                .expect('Content-Type', /json/)
                .expect(200);
        });
        it('should respond with 401 when no access token is provided', async () => {
            const res = await request(server)
                .get('/api/v1/maps/' + testMap2.id + '/runs/1/download')
                .expect('Content-Type', /json/)
                .expect(401);

            expect(res.body).toHaveProperty('error');
            expect(res.body.error.code).toEqual(401);
            expect(res.body.error.message).toBe('string');
        });
    });

    describe('POST /api/v1/maps/:mapID/session', () => {
        it('should return 403 if not using a game API key', async () => {
            const res = await request(server)
                .post(`/api/v1/maps/${testMap2.id}/session`)
                .set('Authorization', 'Bearer ' + testUser.accessToken)
                .expect('Content-Type', /json/)
                .expect(403);

            expect(res.body).toHaveProperty('error');
            expect(res.body.error.code).toEqual(403);
            expect(typeof res.body.error.message).toBe('string');
        });

        it('should should not create a run session if not given a proper body', async () => {
            const res = await request(server)
                .post(`/api/v1/maps/${testMap2.id}/session`)
                .set('Authorization', 'Bearer ' + testAdminGame.accessToken)
                .send(null)
                .expect('Content-Type', /json/)
                .expect(400);

            expect(res.body).toHaveProperty('error');
            expect(res.body.error.code).toEqual(400);
            expect(typeof res.body.error.message).toBe('string');
        });

        it('should return a valid run session object', async () => {
            const res = await request(server)
                .post(`/api/v1/maps/${testMap.id}/session`)
                .set('Authorization', 'Bearer ' + testAdminGame.accessToken)
                .send({
                    trackNum: 0,
                    zoneNum: 0
                })
                .expect('Content-Type', /json/)
                .expect(200);

            expect(res.body).toHaveProperty('id');
        });

        it('should not create a valid run session if the map does not have the trackNum', async () => {
            const res = await request(server)
                .post(`/api/v1/maps/${testMap.id}/session`)
                .set('Authorization', 'Bearer ' + testAdminGame.accessToken)
                .send({
                    trackNum: 2,
                    zoneNum: 0
                })
                .expect('Content-Type', /json/)
                .expect(400);

            expect(res.body).toHaveProperty('error');
            expect(res.body.error.code).toEqual(400);
            expect(typeof res.body.error.message).toBe('string');
        });
    });

    describe('DELETE /api/v1/maps/:mapID/session', () => {
        it('should return 403 if not using a game API key', async () => {
            const res = await request(server)
                .delete(`/api/v1/maps/${testMap2.id}/session`)
                .set('Authorization', 'Bearer ' + testUser.accessToken)
                .expect('Content-Type', /json/)
                .expect(403);

            expect(res.body).toHaveProperty('error');
            expect(res.body.error.code).toEqual(403);
            expect(typeof res.body.error.message).toBe('string');
        });
    });

    describe('POST /api/v1/maps/:mapID/session/:sesID', () => {
        it('should return 403 if not using a game API key', async () => {
            const res = await request(server)
                .post(`/api/v1/maps/${testMap2.id}/session/1`)
                .set('Authorization', 'Bearer ' + testUser.accessToken)
                .expect('Content-Type', /json/)
                .expect(403);

            expect(res.body).toHaveProperty('error');
            expect(res.body.error.code).toEqual(403);
            expect(typeof res.body.error.message).toBe('string');
        });

        it('should update an existing run session with the zone and tick', async () => {
            const res = await request(server)
                .post(`/api/v1/maps/${testMap.id}/session`)
                .set('Authorization', 'Bearer ' + testAdminGame.accessToken)
                .send({
                    trackNum: 0,
                    zoneNum: 0
                })
                .expect('Content-Type', /json/)
                .expect(200);

            expect(res.body).toHaveProperty('id');

            const sesID = res.body.id;
            const res2 = await request(server)
                .post(`/api/v1/maps/${testMap.id}/session/${sesID}`)
                .set('Authorization', 'Bearer ' + testAdminGame.accessToken)
                .send({
                    zoneNum: 2,
                    tick: 510
                })
                .expect('Content-Type', /json/)
                .expect(200);

            expect(res2.body).toHaveProperty('id');
        });
    });

    describe('POST /api/v1/maps/:mapID/session/:sesID/end', () => {
        it('should return 403 if not using a game API key', async () => {
            const res = await request(server)
                .post(`/api/v1/maps/${testMap2.id}/session/1/end`)
                .set('Authorization', 'Bearer ' + testUser.accessToken)
                .expect('Content-Type', /json/)
                .expect(403);

            expect(res.body).toHaveProperty('error');
            expect(res.body.error.code).toEqual(403);
            expect(typeof res.body.error.message).toBe('string');
        });

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
