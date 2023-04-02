﻿import request from 'supertest';
import { DbUtil } from '@tests/util/db.util';
import { setupE2ETestEnvironment } from '@tests/e2e/environment';
import { Server } from 'node:http';
import { SteamWebAuthGuard } from '@modules/auth/guards/steam-web-auth.guard';
import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Config } from '@config/config';
import { JwtService } from '@nestjs/jwt';
import { SteamWebStrategy } from '@modules/auth/strategy/steam-web.strategy';
import { AuthModule } from '@modules/auth/auth.module';
import { UsersModule } from '@modules/users/users.module';
import { RepoModule } from '@modules/repo/repo.module';
import { SteamModule } from '@modules/steam/steam.module';
import { SteamAuthService } from '@modules/auth/steam-auth.service';
import { JwtStrategy } from '@modules/auth/strategy/jwt.strategy';
import { SteamService } from '@modules/steam/steam.service';
import { PrismaClient } from '@prisma/client';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { JWTResponseGameDto, JWTResponseWebDto } from '@common/dto/auth/jwt-response.dto';
import { PrismaService } from '@modules/repo/prisma.service';
import { RequestUtil } from '@test/util/request.util';

describe('Auth (E2E)', () => {
    const jwtService = new JwtService({ secret: Config.accessToken.secret });
    let app: NestFastifyApplication, server: Server, prisma: PrismaService, db: DbUtil, req: RequestUtil;

    beforeAll(async () => {
        const env = await setupE2ETestEnvironment();
        app = env.app;
        server = env.server;
        db = env.db;
        prisma = env.prisma;
        req = env.req;
    });

    describe('auth/steam', () => {
        describe('GET', () => {
            it('should redirect to steam login', async () => {
                await request(server)
                    .get('/auth/steam')
                    .expect(302)
                    .expect('Location', /^https:\/\/steamcommunity.com\/openid\/login.+/);
            });

            it('should login the user, set cookies, and redirect them when request passes the guard', async () => {
                const user = await db.createUser({
                    data: { alias: 'baseballbobby2004', steamID: '76561198237811446' }
                });

                // Override SteamWebAuthGuard to pass guard and hit controller logic
                jest.spyOn(app.get(SteamWebAuthGuard), 'canActivate').mockImplementationOnce(
                    (context: ExecutionContext) => {
                        const request = context.switchToHttp().getRequest();
                        request.user = { id: user.id, steamID: user.steamID };
                        return true;
                    }
                );

                const res = await request(server)
                    .get('/auth/steam')
                    .expect(302)
                    .expect('Location', /\/dashboard$/);

                const cookies = {} as any;
                for (const cookieString of res.headers['set-cookie']) {
                    const [k, v] = cookieString.split('=');
                    cookies[k] = v.slice(0, v.indexOf(';'));
                }

                const jwt = new JwtService({ secret: Config.accessToken.secret });

                const decodedAccessToken = jwt.decode(cookies.accessToken);
                expect(decodedAccessToken).toMatchObject({ id: user.id, steamID: user.steamID, gameAuth: false });

                const decodedRefreshToken = jwt.decode(cookies.refreshToken) as any;
                expect(decodedRefreshToken.id).toBe(user.id);

                await db.cleanup('user');
            });
        });
    });

    describe('auth/steam/user', () => {
        const appID = 669270;
        const userAgent = `Valve/Steam HTTP Client 1.0 (${appID})`;

        let steamService: SteamService, configService: ConfigService;

        beforeAll(async () => {
            steamService = app.get(SteamService);
            configService = app.get(ConfigService);
        });

        afterEach(() => db.cleanup('user'));

        describe('Online API', () => {
            beforeAll(() => {
                jest.spyOn(configService, 'get').mockImplementation((key) => {
                    switch (key) {
                        case 'steam.useSteamTicketLibrary':
                            return false;
                        case 'accessToken.gameExpTime':
                            return '1m';
                    }
                });
            });

            afterEach(() => jest.clearAllMocks());

            it('should create a new user and respond with a game JWT', async () => {
                const userSteamID = '1';
                const userSteamSummary = {
                    steamid: userSteamID,
                    personaname: 'Dogathan',
                    avatarhash: 'ac7305567f93a4c9eec4d857df993191c61fb240_full.jpg',
                    loccountrycode: 'AQ'
                };

                jest.spyOn(steamService, 'tryAuthenticateUserTicketOnline').mockResolvedValueOnce(userSteamID);
                jest.spyOn(steamService, 'getSteamUserSummaryData').mockResolvedValueOnce(userSteamSummary as any);

                const res = await app.inject({
                    method: 'post',
                    url: '/auth/steam/user',
                    payload: Buffer.alloc(10),
                    headers: { 'content-type': 'application/octet-stream', id: userSteamID, 'user-agent': userAgent }
                });

                expect(res.statusCode).toBe(201);
                const body = JSON.parse(res.body);
                expect(body).toBeValidDto(JWTResponseGameDto);

                const decrypted = jwtService.decode(body.token) as Record<string, any>;
                expect(decrypted.steamID).toBe(userSteamID);
                expect(decrypted.exp - decrypted.iat).toBe(60);

                const userDB = await prisma.user.findFirst();
                expect(userDB).toMatchObject({
                    steamID: userSteamID,
                    alias: userSteamSummary.personaname,
                    country: userSteamSummary.loccountrycode,
                    avatar: 'ac7305567f93a4c9eec4d857df993191c61fb240'
                });
            });

            it('should find an existing user and respond with a game JWT', async () => {
                const userDB = await prisma.user.create({ data: { steamID: '1', alias: 'Dogathan', country: 'QA' } });
                const userSteamSummary = {
                    steamid: userDB.steamID,
                    personaname: 'Manathan',
                    avatarhash: 'bbbbb5567f93a4c9eec4d857df993191c61fb240_full.jpg',
                    loccountrycode: 'QA'
                };

                jest.spyOn(steamService, 'tryAuthenticateUserTicketOnline').mockResolvedValueOnce(userDB.steamID);
                jest.spyOn(steamService, 'getSteamUserSummaryData').mockResolvedValueOnce(userSteamSummary as any);

                const res = await app.inject({
                    method: 'post',
                    url: '/auth/steam/user',
                    payload: Buffer.alloc(10),
                    headers: { 'content-type': 'application/octet-stream', id: userDB.steamID, 'user-agent': userAgent }
                });

                expect(res.statusCode).toBe(201);
                const body = JSON.parse(res.body);
                expect(body).toBeValidDto(JWTResponseGameDto);

                const decrypted = jwtService.decode(body.token) as Record<string, any>;
                expect(decrypted.steamID).toBe(userDB.steamID);

                expect(decrypted.exp - decrypted.iat).toBe(60);

                const updatedUserDB = await prisma.user.findFirst();
                expect(updatedUserDB).toMatchObject({
                    steamID: userDB.steamID,
                    alias: userSteamSummary.personaname,
                    country: userSteamSummary.loccountrycode,
                    avatar: 'bbbbb5567f93a4c9eec4d857df993191c61fb240'
                });
            });

            it('should 400 when header is missing ID', async () => {
                const res = await app.inject({
                    method: 'post',
                    url: '/auth/steam/user',
                    payload: Buffer.alloc(10),
                    headers: { 'content-type': 'application/octet-stream', 'user-agent': userAgent }
                });

                expect(res.statusCode).toBe(400);
            });

            it('should 400 when body is not a buffer', async () => {
                const res = await app.inject({
                    method: 'post',
                    url: '/auth/steam/user',
                    payload: 'Hello. I am not a buffer. How do you do?',
                    headers: { 'content-type': 'application/json', id: '1', 'user-agent': userAgent }
                });

                expect(res.statusCode).toBe(400);
            });

            it('should 400 when body is missing', async () => {
                const res = await app.inject({
                    method: 'post',
                    url: '/auth/steam/user',
                    headers: { 'content-type': 'application/octet-stream', id: '1', 'user-agent': userAgent }
                });

                expect(res.statusCode).toBe(400);
            });

            it('should 401 when Steam does not return a valid user ticket', async () => {
                jest.spyOn(steamService, 'tryAuthenticateUserTicketOnline').mockRejectedValueOnce(
                    new UnauthorizedException(
                        'hi uhhhhh sorry its a tuesday you cant login. no we cant hire a competent devops team'
                    )
                );

                const res = await app.inject({
                    method: 'post',
                    url: '/auth/steam/user',
                    payload: Buffer.alloc(10),
                    headers: { 'content-type': 'application/octet-stream', id: '1', 'user-agent': userAgent }
                });

                expect(res.statusCode).toBe(401);
            });

            it("should 401 when Steam returns a SteamID that doesn't match the ID in the header", async () => {
                jest.spyOn(steamService, 'tryAuthenticateUserTicketOnline').mockResolvedValueOnce('2');

                const res = await app.inject({
                    method: 'post',
                    url: '/auth/steam/user',
                    payload: Buffer.alloc(10),
                    headers: { 'content-type': 'application/octet-stream', id: '1', 'user-agent': userAgent }
                });

                expect(res.statusCode).toBe(401);
            });
        });

        describe('Local Library', () => {
            beforeAll(() => {
                jest.spyOn(configService, 'get').mockImplementation((key) => {
                    switch (key) {
                        case 'steam.useSteamTicketLibrary':
                            return true;
                        case 'accessToken.gameExpTime':
                            return '1m';
                        case 'appIDs':
                            return [appID];
                    }
                });
            });

            afterEach(() => jest.clearAllMocks());

            it('should create a new user and respond with a game JWT', async () => {
                const userSteamID = '1';
                const userSteamSummary = {
                    steamid: userSteamID,
                    personaname: 'Dogathan',
                    avatarhash: 'ac7305567f93a4c9eec4d857df993191c61fb240_full.jpg',
                    loccountrycode: 'AQ'
                };

                jest.spyOn(steamService, 'tryAuthenticateUserTicketLocal').mockReturnValueOnce({
                    steamID: userSteamID,
                    appID: appID
                });
                jest.spyOn(steamService, 'getSteamUserSummaryData').mockResolvedValueOnce(userSteamSummary as any);

                const res = await app.inject({
                    method: 'post',
                    url: '/auth/steam/user',
                    payload: Buffer.alloc(10),
                    headers: { 'content-type': 'application/octet-stream', id: userSteamID, 'user-agent': userAgent }
                });

                expect(res.statusCode).toBe(201);
                const body = JSON.parse(res.body);
                expect(body).toBeValidDto(JWTResponseGameDto);

                const decrypted = jwtService.decode(body.token) as Record<string, any>;
                expect(decrypted.steamID).toBe(userSteamID);
                expect(decrypted.exp - decrypted.iat).toBe(60);

                const userDB = await prisma.user.findFirst();
                expect(userDB).toMatchObject({
                    steamID: userSteamID,
                    alias: userSteamSummary.personaname,
                    country: userSteamSummary.loccountrycode,
                    avatar: 'ac7305567f93a4c9eec4d857df993191c61fb240'
                });
            });

            it('should find an existing user and respond with a game JWT', async () => {
                const userDB = await prisma.user.create({ data: { steamID: '1', alias: 'Dogathan', country: 'QA' } });
                const userSteamSummary = {
                    steamid: userDB.steamID,
                    personaname: 'The PriceMaster',
                    avatarhash: 'bbbbb5567f93a4c9eec4d857df993191c61fb240_full.jpg',
                    loccountrycode: 'US'
                };

                jest.spyOn(steamService, 'tryAuthenticateUserTicketLocal').mockReturnValueOnce({
                    steamID: userDB.steamID,
                    appID: appID
                });
                jest.spyOn(steamService, 'getSteamUserSummaryData').mockResolvedValueOnce(userSteamSummary as any);

                const res = await app.inject({
                    method: 'post',
                    url: '/auth/steam/user',
                    payload: Buffer.alloc(10),
                    headers: { 'content-type': 'application/octet-stream', id: userDB.steamID, 'user-agent': userAgent }
                });

                expect(res.statusCode).toBe(201);
                const body = JSON.parse(res.body);
                expect(body).toBeValidDto(JWTResponseGameDto);

                const decrypted = jwtService.decode(body.token) as Record<string, any>;
                expect(decrypted.steamID).toBe(userDB.steamID);

                expect(decrypted.exp - decrypted.iat).toBe(60);

                const updatedUserDB = await prisma.user.findFirst();
                expect(updatedUserDB).toMatchObject({
                    steamID: userDB.steamID,
                    alias: userSteamSummary.personaname,
                    country: userSteamSummary.loccountrycode,
                    avatar: 'bbbbb5567f93a4c9eec4d857df993191c61fb240'
                });
            });

            it('should 400 when header is missing ID', async () => {
                const res = await app.inject({
                    method: 'post',
                    url: '/auth/steam/user',
                    payload: Buffer.alloc(10),
                    headers: { 'content-type': 'application/octet-stream', 'user-agent': userAgent }
                });

                expect(res.statusCode).toBe(400);
            });

            it('should 400 when body is not a buffer', async () => {
                const res = await app.inject({
                    method: 'post',
                    url: '/auth/steam/user',
                    payload: "Hello again. I'm still not a buffer.",
                    headers: { 'content-type': 'application/json', id: '1', 'user-agent': userAgent }
                });

                expect(res.statusCode).toBe(400);
            });

            it('should 400 when body is missing', async () => {
                const res = await app.inject({
                    method: 'post',
                    url: '/auth/steam/user',
                    headers: { 'content-type': 'application/octet-stream', id: '1', 'user-agent': userAgent }
                });

                expect(res.statusCode).toBe(400);
            });

            it('should 401 when Steam does not return a valid user ticket', async () => {
                jest.spyOn(steamService, 'tryAuthenticateUserTicketLocal').mockImplementationOnce(() => {
                    throw new UnauthorizedException("hi its still tuesday. no we can't hire a competent devops person");
                });

                const res = await app.inject({
                    method: 'post',
                    url: '/auth/steam/user',
                    payload: Buffer.alloc(10),
                    headers: { 'content-type': 'application/octet-stream', id: '1', 'user-agent': userAgent }
                });

                expect(res.statusCode).toBe(401);
            });

            it("should 401 when Steam returns a SteamID that doesn't match the ID in the header", async () => {
                jest.spyOn(steamService, 'tryAuthenticateUserTicketOnline').mockResolvedValueOnce('2');

                const res = await app.inject({
                    method: 'post',
                    url: '/auth/steam/user',
                    payload: Buffer.alloc(10),
                    headers: { 'content-type': 'application/octet-stream', id: '1', 'user-agent': userAgent }
                });

                expect(res.statusCode).toBe(401);
            });
        });
    });

    describe('auth/refresh', () => {
        it('should respond with a new token pair', async () => {
            const [user, token] = await db.createAndLoginUser();
            const originalRefreshToken = jwtService.sign({ id: user.id });
            await prisma.userAuth.update({ where: { userID: user.id }, data: { refreshToken: originalRefreshToken } });

            const res = await req.post({
                url: '/auth/refresh',
                skipApiPrefix: true,
                token: token,
                body: { refreshToken: originalRefreshToken },
                status: 201,
                validate: JWTResponseWebDto
            });

            expect(jwtService.decode(res.body.accessToken) as Record<string, any>).toMatchObject({
                id: user.id,
                steamID: user.steamID
            });

            expect(jwtService.decode(res.body.refreshToken) as Record<string, any>).toMatchObject({
                id: user.id
            });

            const newUserAuth = await prisma.userAuth.findFirst();
            expect(newUserAuth.refreshToken).toBe(res.body.refreshToken);
            expect(newUserAuth.refreshToken).not.toBe(originalRefreshToken);
        });
    });
});

describe('Auth (Integration, with DB)', () => {
    describe('SteamWebStrategy', () => {
        let steamWebStrategy: SteamWebStrategy,
            prisma: PrismaClient,
            steamService: SteamService,
            configService: ConfigService;

        beforeAll(async () => {
            prisma = new PrismaClient();

            const module: TestingModule = await Test.createTestingModule({
                imports: [AuthModule, UsersModule, RepoModule, SteamModule, ConfigModule],
                providers: [SteamWebStrategy, SteamAuthService]
            })
                .overrideProvider(JwtStrategy)
                .useValue({})
                // Mock ConfigService so preventLimited defaults to true
                .overrideProvider(ConfigService)
                .useValue({ get: jest.fn(() => true) })
                // Mock SteamService so isAccountLimited defaults to false
                .overrideProvider(SteamService)
                .useValue({ isAccountLimited: jest.fn(() => Promise.resolve(false)) })
                .compile();

            steamWebStrategy = module.get(SteamWebStrategy);
            steamService = module.get(SteamService);
            configService = module.get(ConfigService);
        });

        afterEach(() => prisma.user.deleteMany());

        const steamData = {
            profilestate: 1,
            steamid: '1',
            personaname: 'bono',
            avatarhash: 'sausage',
            loccountrycode: 'IE'
        };

        it('should create and return a new user for an unrecognised SteamID', async () => {
            const user = await steamWebStrategy.validate('', { _json: steamData } as any);

            expect(user.steamID).toBe(steamData.steamid);

            const userDB = await prisma.user.findFirst();
            expect(userDB.alias).toBe('bono');
        });

        it('should return a user for an existing SteamID', async () => {
            await prisma.user.create({ data: { steamID: '123', alias: 'bono' } });

            const user = await steamWebStrategy.validate('', { _json: { ...steamData, steamID: '123' } } as any);

            expect(user.steamID).toBe(steamData.steamid);

            const userDB = await prisma.user.findFirst();
            expect(userDB).toMatchObject({ alias: 'bono', steamID: '123' });
        });

        it('should throw a ForbiddenException if the user has not set up their profile', async () =>
            await expect(
                steamWebStrategy.validate('', { _json: { ...steamData, profilestate: 0 } } as any)
            ).rejects.toThrow(ForbiddenException));

        it('should throw an UnauthorizedException if the user is a limited account and preventLimited is true', async () => {
            jest.spyOn(steamService, 'isAccountLimited').mockResolvedValueOnce(true);

            await expect(steamWebStrategy.validate('', { _json: steamData } as any)).rejects.toThrow(
                UnauthorizedException
            );
        });

        it('should create an account if the user is a limited account and preventLimited is false', async () => {
            jest.spyOn(steamService, 'isAccountLimited').mockResolvedValueOnce(true);
            jest.spyOn(configService, 'get').mockReturnValueOnce(false);

            const user = await steamWebStrategy.validate('', { _json: steamData } as any);

            expect(user.steamID).toBe(steamData.steamid);

            const userDB = await prisma.user.findFirst();
            expect(userDB.alias).toBe('bono');
        });
    });
});
// 		describe('POST /auth/refresh', () => {
//             it('should 401 when a bad refresh token is provided', () => {
//                 return chai.request(server)
//                 .post('/auth/refresh')
//                 .send({ refreshToken: 'xD.xD.xD' })
//                 .then(res => {
//                     expect(res).to.have.status(401);
//                     expect(res).to.be.json;
//                     expect(res.body).toHaveProperty('error');
//                 });
//             });
//             it('should respond with a new access token', () => {
//                 return chai.request(server)
//                 .post('/auth/refresh')
//                 .send({ refreshToken: testUser.auth.refreshToken })
//                 .then(res => {
//                     expect(res).to.have.status(200);
//                     expect(res).to.be.json;
//                     expect(typeof res.body).toBe('string');
//                 });
//             });
//         });
//
//         describe('POST /auth/revoke', () => {
//             it('should 400 when no auth header is provided', () => {
//                 return chai.request(server)
//                 .post('/auth/revoke')
//                 .then(res => {
//                     expect(res).to.have.status(400);
//                 });
//             });
//             it('should 401 when the auth header is invalid', () => {
//                 return chai.request(server)
//                 .post('/auth/revoke')
//                 .set('Authorization', 'Bearer xD.xD.xD')
//                 .then(res => {
//                     expect(res).to.have.status(401);
//                 });
//             });
//             it('should 204 when the auth header is valid', () => {
//                 return chai.request(server)
//                 .post('/auth/revoke')
//                 .set('Authorization', 'Bearer ' + accessToken)
//                 .then(res => {
//                     expect(res).to.have.status(204);
//                 });
//             });
//             it('should make the refresh token unusable on success', () => {
//                 return chai.request(server)
//                 .post('/auth/refresh')
//                 .send({ refreshToken: testUser.auth.refreshToken })
//                 .then(res => {
//                     expect(res).to.have.status(401);
//                     expect(res).to.be.json;
//                 });
//             });
//         });

//
// 		// Add/Fix tests for other types of authentication
// /*
// 		describe('GET /auth/twitter', () => {
// 			it('should redirect to twitter login', () => {
//                 return chai.request(server)
//                     .get('/auth/twitter')
//                     .then(res => {
//                         expect(res).to.redirect;
//                         expect(res).to.have.status(200);
//                     });
// 			});
// 		});
// 		describe('GET /auth/twitter/return', () => {
// 			it('should return 200 if twitter account is successfully linked', () => {
//                 return chai.request(server)
//                     .get('/auth/twitter/return')
//                     .then(res => {
//                         expect(res).to.redirect;
//                         expect(res).to.have.status(200);
//                     });
// 			});
// 		});
// 		describe('GET /auth/discord', () => {
// 			it('should redirect to discord oauth url', () => {
//                 return chai.request(server)
//                     .get('/auth/discord')
//                     .then(res => {
//                         expect(res).to.redirect;
//                         expect(res).to.have.status(200);
//                     });
// 			});
// 		});
//         describe('GET /auth/discord/return', () => {
//             it('should return 200 if discord account is successfully linked', () => {
//                 return chai.request(server)
//                     .get('/auth/discord/return')
//                     .then(res => {
//                         expect(res).to.redirect;
//                         expect(res).to.have.status(200);
//                     });
// 			});
// 		});
//         describe('GET /auth/twitch', () => {
//         	it('should redirect to twitch oauth url', () => {
//                 return chai.request(server)
//                     .get('/auth/twitch')
//                     .then(res => {
//                         expect(res).to.redirect;
//                         expect(res).to.have.status(200);
//                     });
// 			});
// 		});
//         describe('GET /auth/twitch/return', () => {
//             it('should return 200 if twitch account is successfully linked', () => {
//                 return chai.request(server)
//                     .get('/auth/twitch/return')
//                     .then(res => {
//                         expect(res).to.redirect;
//                         expect(res).to.have.status(200);
//                     });
// 			});
// 		});
//
// 		*/
