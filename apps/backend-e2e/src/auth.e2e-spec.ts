﻿// noinspection DuplicatedCode

// We're committing a cardinal sin of Nx here, but I *really* want to be able to
// do E2E tests for auth and the only way to do good ones is if we can mock the
// Steam service stuff. I just can't see a good way of doing these tests without
// "crossing module boundaries" like this.
/* eslint-disable @nx/enforce-module-boundaries */
import { SteamOpenIDService } from '../../backend/src/app/modules/auth/steam/steam-openid.service';
import { SteamService } from '../../backend/src/app/modules/steam/steam.service';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { PrismaClient } from '@prisma/client';
import {
  DbUtil,
  ParsedResponse,
  RequestUtil
} from '@momentum/backend/test-utils';
import { Config } from '@momentum/backend/config';
import { setupE2ETestEnvironment } from './support/environment';
import { JWTResponseGameDto, JWTResponseWebDto } from '@momentum/backend/dto';

describe('Auth', () => {
  const testJwtService = new JwtService({
    secret: Config.jwt.secret,
    signOptions: { expiresIn: Config.jwt.expTime }
  });
  let app: NestFastifyApplication,
    prisma: PrismaClient,
    db: DbUtil,
    req: RequestUtil;

  beforeAll(async () => {
    const env = await setupE2ETestEnvironment();
    app = env.app;
    db = env.db;
    prisma = env.prisma;
    req = env.req;
  });

  afterAll(() => db.cleanup('user'));

  describe('auth/web', () => {
    describe('GET', () => {
      it('should redirect to steam login', async () => {
        const res = await req.get({
          url: 'auth/web',
          skipApiPrefix: true,
          status: 302
        });
        expect(res.headers.location).toMatch(
          /^https:\/\/steamcommunity.com\/openid\/login.+/
        );
      });
    });
  });

  describe('auth/web/return', () => {
    describe('GET', () => {
      const steamID = 123n;
      const steamData = {
        profilestate: 1,
        steamid: steamID,
        personaname: 'bono',
        avatarhash: 'sausage',
        loccountrycode: 'IE'
      };

      let response: ParsedResponse,
        verifyAssertionSpy: jest.SpyInstance,
        steamSummarySpy: jest.SpyInstance,
        steamIsLimitedSpy: jest.SpyInstance,
        configService: ConfigService;

      const request = () =>
        req.get({
          url: 'auth/web/return',
          skipApiPrefix: true,
          query: {
            'openid.op_endpoint': 'https://steamcommunity.com/openid/login',
            'openid.ns': 'http://specs.openid.net/auth/2.0',
            'openid.claimed_id': 'https://steamcommunity.com/openid/id/123',
            'openid.identity': 'https://steamcommunity.com/openid/id/123'
          }
        });

      beforeAll(() => {
        configService = app.get(ConfigService);

        verifyAssertionSpy = jest.spyOn(
          app.get(SteamOpenIDService)['relyingParty'],
          'verifyAssertion'
        );
        verifyAssertionSpy.mockImplementation((request, callback) =>
          callback(undefined, {
            authenticated: true,
            claimedIdentifier: `https://steamcommunity.com/openid/id/${steamID}`
          })
        );
        steamSummarySpy = jest.spyOn(
          app.get(SteamService),
          'getSteamUserSummaryData'
        );
        steamSummarySpy.mockResolvedValue(steamData as any);

        steamIsLimitedSpy = jest.spyOn(
          app.get(SteamService),
          'isAccountLimited'
        );
        steamIsLimitedSpy.mockResolvedValue(false);

        jest.spyOn(configService, 'get').mockImplementation((key) => {
          switch (key) {
            case 'steam.preventLimited':
              return true;
            case 'jwt.expTime':
              return '1m';
            case 'jwt.refreshExpTime':
              return '5m';
          }
        });
      });

      afterAll(() => jest.resetAllMocks());

      describe('when given a valid login for a new user', () => {
        beforeAll(async () => {
          response = await request();
        });

        afterAll(() => db.cleanup('user'));

        it('should succeed and redirect to dashboard', () => {
          expect(response.statusCode).toBe(302);
          expect(response.headers.location).toBe('/dashboard');
        });

        it('should create a new user', async () => {
          const userDB = await prisma.user.findFirst();
          expect(userDB).toMatchObject({
            steamID: BigInt(steamID),
            alias: steamData.personaname,
            avatar: steamData.avatarhash,
            country: steamData.loccountrycode
          });
        });

        it('should set cookies on the response containing JWTs', async () => {
          const cookies = {} as any;
          for (const cookieString of response.headers['set-cookie'] as string) {
            const [k, v] = cookieString.split('=');
            cookies[k] = v.slice(0, v.indexOf(';'));
          }

          const userDB = await prisma.user.findFirst();

          const decodedAccessToken = testJwtService.decode(cookies.accessToken);
          expect(decodedAccessToken).toMatchObject({
            id: userDB.id,
            steamID: userDB.steamID.toString(),
            gameAuth: false
          });

          const decodedRefreshToken = testJwtService.decode(
            cookies.refreshToken
          ) as any;
          expect(decodedRefreshToken.id).toBe(userDB.id);
        });
      });

      describe('when given a valid login for an existing user user', () => {
        let user;

        beforeAll(async () => {
          user = await db.createUser({ data: { steamID: steamID } });

          response = await request();
        });

        afterAll(() => db.cleanup('user'));

        it('should succeed and redirect to dashboard', () => {
          expect(response.statusCode).toBe(302);
          expect(response.headers.location).toBe('/dashboard');
        });

        it('should create a new user', async () => {
          const updatedUser = await prisma.user.findFirst();
          expect(updatedUser).toMatchObject({
            id: user.id,
            steamID: BigInt(steamID),
            alias: steamData.personaname,
            avatar: steamData.avatarhash,
            country: steamData.loccountrycode
          });
        });

        it('should set cookies on the response containing JWTs', async () => {
          const cookies = {} as any;
          for (const cookieString of response.headers['set-cookie'] as string) {
            const [k, v] = cookieString.split('=');
            cookies[k] = v.slice(0, v.indexOf(';'));
          }

          const userDB = await prisma.user.findFirst();

          const decodedAccessToken = testJwtService.decode(cookies.accessToken);
          expect(decodedAccessToken).toMatchObject({
            id: userDB.id,
            steamID: userDB.steamID.toString(),
            gameAuth: false
          });

          const decodedRefreshToken = testJwtService.decode(
            cookies.refreshToken
          ) as any;
          expect(decodedRefreshToken.id).toBe(userDB.id);
        });
      });

      it('should throw a ForbiddenException if the user has not set up their profile', async () => {
        steamSummarySpy.mockResolvedValueOnce({
          ...steamData,
          profilestate: 0
        });
        const res = await request();
        expect(res.statusCode).toBe(403);
      });

      it('should throw a ForbiddenException if the user is a limited account and preventLimited is true', async () => {
        steamIsLimitedSpy.mockResolvedValueOnce(true);

        const res = await request();
        expect(res.statusCode).toBe(403);
      });

      it('should create an account if the user is a limited account and preventLimited is false', async () => {
        steamIsLimitedSpy.mockResolvedValueOnce(true);
        jest.spyOn(configService, 'get').mockImplementationOnce((key) => {
          switch (key) {
            case 'steam.preventLimited':
              return false;
            case 'jwt.expTime':
              return '1m';
            case 'jwt.refreshExpTime':
              return '5m';
          }
        });

        steamIsLimitedSpy.mockResolvedValueOnce(true);

        await request();

        expect(await prisma.user.findFirst()).toMatchObject({
          steamID: steamID
        });

        await db.cleanup('user');
      });
    });
  });

  describe('auth/game', () => {
    const appID = 669270;
    const userAgent = `Valve/Steam HTTP Client 1.0 (${appID})`;

    let steamService: SteamService, configService: ConfigService;

    beforeAll(async () => {
      steamService = app.get(SteamService);
      configService = app.get(ConfigService);
    });

    describe('Online API', () => {
      beforeEach(() =>
        jest.spyOn(configService, 'get').mockImplementation((key) => {
          switch (key) {
            case 'steam.useSteamTicketLibrary':
              return false;
            case 'jwt.gameExpTime':
              return '1m';
          }
        })
      );

      afterEach(() => db.cleanup('user'));

      afterAll(() => jest.resetAllMocks());

      it('should create a new user and respond with a game JWT', async () => {
        const userSteamID = 1n;
        const userSteamSummary = {
          steamid: userSteamID,
          personaname: 'Dogathan',
          avatarhash: 'ac7305567f93a4c9eec4d857df993191c61fb240_full.jpg',
          loccountrycode: 'AQ'
        };

        jest
          .spyOn(steamService, 'tryAuthenticateUserTicketOnline')
          .mockResolvedValueOnce(userSteamID);
        jest
          .spyOn(steamService, 'getSteamUserSummaryData')
          .mockResolvedValueOnce(userSteamSummary as any);

        const res = await app.inject({
          method: 'post',
          url: '/auth/game',
          payload: Buffer.alloc(10),
          headers: {
            'content-type': 'application/octet-stream',
            id: userSteamID.toString(),
            'user-agent': userAgent
          }
        });

        expect(res.statusCode).toBe(201);
        const body = JSON.parse(res.body);
        expect(body).toBeValidDto(JWTResponseGameDto);

        const decrypted = testJwtService.decode(body.token) as Record<
          string,
          any
        >;
        expect(decrypted.steamID).toBe(userSteamID.toString());
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
        const userDB = await prisma.user.create({
          data: { steamID: 1, alias: 'Dogathan', country: 'QA' }
        });
        const userSteamSummary = {
          steamid: userDB.steamID,
          personaname: 'Manathan',
          avatarhash: 'bbbbb5567f93a4c9eec4d857df993191c61fb240_full.jpg',
          loccountrycode: 'QA'
        };

        jest
          .spyOn(steamService, 'tryAuthenticateUserTicketOnline')
          .mockResolvedValueOnce(userDB.steamID);
        jest
          .spyOn(steamService, 'getSteamUserSummaryData')
          .mockResolvedValueOnce(userSteamSummary as any);

        const res = await app.inject({
          method: 'post',
          url: '/auth/game',
          payload: Buffer.alloc(10),
          headers: {
            'content-type': 'application/octet-stream',
            id: userDB.steamID.toString(),
            'user-agent': userAgent
          }
        });

        expect(res.statusCode).toBe(201);
        const body = JSON.parse(res.body);
        expect(body).toBeValidDto(JWTResponseGameDto);

        const decrypted = testJwtService.decode(body.token) as Record<
          string,
          any
        >;
        expect(decrypted.steamID).toBe(userDB.steamID.toString());

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
          url: '/auth/game',
          payload: Buffer.alloc(10),
          headers: {
            'content-type': 'application/octet-stream',
            'user-agent': userAgent
          }
        });

        expect(res.statusCode).toBe(400);
      });

      it('should 400 when body is not a buffer', async () => {
        const res = await app.inject({
          method: 'post',
          url: '/auth/game',
          payload: 'Hello. I am not a buffer. How do you do?',
          headers: {
            'content-type': 'application/json',
            id: '1',
            'user-agent': userAgent
          }
        });

        expect(res.statusCode).toBe(400);
      });

      it('should 400 when body is missing', async () => {
        const res = await app.inject({
          method: 'post',
          url: '/auth/game',
          headers: {
            'content-type': 'application/octet-stream',
            id: '1',
            'user-agent': userAgent
          }
        });

        expect(res.statusCode).toBe(400);
      });

      it('should 401 when Steam does not return a valid user ticket', async () => {
        jest
          .spyOn(steamService, 'tryAuthenticateUserTicketOnline')
          .mockRejectedValueOnce(
            new UnauthorizedException(
              'hi uhhhhh sorry its a tuesday you cant login'
            )
          );

        const res = await app.inject({
          method: 'post',
          url: '/auth/game',
          payload: Buffer.alloc(10),
          headers: {
            'content-type': 'application/octet-stream',
            id: '1',
            'user-agent': userAgent
          }
        });

        expect(res.statusCode).toBe(401);
      });

      it("should 401 when Steam returns a SteamID that doesn't match the ID in the header", async () => {
        jest
          .spyOn(steamService, 'tryAuthenticateUserTicketOnline')
          .mockResolvedValueOnce(2n);

        const res = await app.inject({
          method: 'post',
          url: '/auth/game',
          payload: Buffer.alloc(10),
          headers: {
            'content-type': 'application/octet-stream',
            id: '1',
            'user-agent': userAgent
          }
        });

        expect(res.statusCode).toBe(401);
      });
    });

    describe('Local Library', () => {
      beforeEach(() =>
        jest.spyOn(configService, 'get').mockImplementation((key) => {
          switch (key) {
            case 'steam.useSteamTicketLibrary':
              return true;
            case 'jwt.gameExpTime':
              return '1m';
            case 'appIDs':
              return [appID];
          }
        })
      );

      afterEach(async () => db.cleanup('user'));

      afterAll(() => jest.resetAllMocks());

      it('should create a new user and respond with a game JWT', async () => {
        const userSteamID = 1n;
        const userSteamSummary = {
          steamid: userSteamID,
          personaname: 'Dogathan',
          avatarhash: 'ac7305567f93a4c9eec4d857df993191c61fb240_full.jpg',
          loccountrycode: 'AQ'
        };

        jest
          .spyOn(steamService, 'tryAuthenticateUserTicketLocal')
          .mockReturnValueOnce({
            steamID: userSteamID,
            appID: appID
          });
        jest
          .spyOn(steamService, 'getSteamUserSummaryData')
          .mockResolvedValueOnce(userSteamSummary as any);

        const res = await app.inject({
          method: 'post',
          url: '/auth/game',
          payload: Buffer.alloc(10),
          headers: {
            'content-type': 'application/octet-stream',
            id: userSteamID.toString(),
            'user-agent': userAgent
          }
        });

        expect(res.statusCode).toBe(201);
        const body = JSON.parse(res.body);
        expect(body).toBeValidDto(JWTResponseGameDto);

        const decrypted = testJwtService.decode(body.token) as Record<
          string,
          any
        >;
        expect(decrypted.steamID).toBe(userSteamID.toString());
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
        const userDB = await prisma.user.create({
          data: { steamID: 1, alias: 'Dogathan', country: 'QA' }
        });
        const userSteamSummary = {
          steamid: userDB.steamID,
          personaname: 'The PriceMaster',
          avatarhash: 'bbbbb5567f93a4c9eec4d857df993191c61fb240_full.jpg',
          loccountrycode: 'US'
        };

        jest
          .spyOn(steamService, 'tryAuthenticateUserTicketLocal')
          .mockReturnValueOnce({
            steamID: userDB.steamID,
            appID: appID
          });
        jest
          .spyOn(steamService, 'getSteamUserSummaryData')
          .mockResolvedValueOnce(userSteamSummary as any);

        const res = await app.inject({
          method: 'post',
          url: '/auth/game',
          payload: Buffer.alloc(10),
          headers: {
            'content-type': 'application/octet-stream',
            id: userDB.steamID.toString(),
            'user-agent': userAgent
          }
        });

        expect(res.statusCode).toBe(201);
        const body = JSON.parse(res.body);
        expect(body).toBeValidDto(JWTResponseGameDto);

        const decrypted = testJwtService.decode(body.token) as Record<
          string,
          any
        >;
        expect(decrypted.steamID).toBe(userDB.steamID.toString());

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
          url: '/auth/game',
          payload: Buffer.alloc(10),
          headers: {
            'content-type': 'application/octet-stream',
            'user-agent': userAgent
          }
        });

        expect(res.statusCode).toBe(400);
      });

      it('should 400 when body is not a buffer', async () => {
        const res = await app.inject({
          method: 'post',
          url: '/auth/game',
          payload: "Hello again. I'm still not a buffer.",
          headers: {
            'content-type': 'application/json',
            id: '1',
            'user-agent': userAgent
          }
        });

        expect(res.statusCode).toBe(400);
      });

      it('should 400 when body is missing', async () => {
        const res = await app.inject({
          method: 'post',
          url: '/auth/game',
          headers: {
            'content-type': 'application/octet-stream',
            id: '1',
            'user-agent': userAgent
          }
        });

        expect(res.statusCode).toBe(400);
      });

      it('should 401 when Steam does not return a valid user ticket', async () => {
        jest
          .spyOn(steamService, 'tryAuthenticateUserTicketLocal')
          .mockImplementationOnce(() => {
            throw new UnauthorizedException(
              "hi its still tuesday. no we can't hire a competent devops person"
            );
          });

        const res = await app.inject({
          method: 'post',
          url: '/auth/game',
          payload: Buffer.alloc(10),
          headers: {
            'content-type': 'application/octet-stream',
            id: '1',
            'user-agent': userAgent
          }
        });

        expect(res.statusCode).toBe(401);
      });

      it("should 401 when Steam returns a SteamID that doesn't match the ID in the header", async () => {
        jest
          .spyOn(steamService, 'tryAuthenticateUserTicketOnline')
          .mockResolvedValueOnce(2n);

        const res = await app.inject({
          method: 'post',
          url: '/auth/game',
          payload: Buffer.alloc(10),
          headers: {
            'content-type': 'application/octet-stream',
            id: '1',
            'user-agent': userAgent
          }
        });

        expect(res.statusCode).toBe(401);
      });
    });
  });

  describe('auth/refresh', () => {
    afterEach(() => db.cleanup('user'));

    it('should respond with a new token pair', async () => {
      const [user, token] = await db.createAndLoginUser();

      const originalRefreshToken = testJwtService.sign({ id: user.id });

      await prisma.userAuth.create({
        data: { refreshToken: originalRefreshToken, userID: user.id }
      });

      const res = await req.post({
        url: 'auth/refresh',
        skipApiPrefix: true,
        token: token,
        body: { refreshToken: originalRefreshToken },
        status: 201,
        validate: JWTResponseWebDto
      });

      expect(
        testJwtService.decode(res.body.accessToken) as Record<string, any>
      ).toMatchObject({
        id: user.id,
        steamID: user.steamID.toString()
      });

      expect(
        testJwtService.decode(res.body.refreshToken) as Record<string, any>
      ).toMatchObject({
        id: user.id
      });

      const newUserAuth = await prisma.userAuth.findFirst();
      expect(newUserAuth.refreshToken).toBe(res.body.refreshToken);
      expect(newUserAuth.refreshToken).not.toBe(originalRefreshToken);
    });
  });
});
