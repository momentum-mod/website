import {
  mock,
  after,
  afterEach,
  before,
  beforeEach,
  describe,
  it
} from 'node:test';

import {
  assertValidDto,
  DbUtil,
  ParsedResponse,
  RequestUtil,
  resetKillswitches
} from '@momentum/test-utils';

import * as assert from 'node:assert/strict';
// noinspection DuplicatedCode

// Note that by importing and mocking these services service we're breaking a
// major rule of E2E testing. But we need to test code that relies on Steam's
// API, so our only sane option is to mock.
import { SteamService } from '../../backend/src/app/modules/steam/steam.service';
import { SteamOpenIDService } from '../../backend/src/app/modules/auth/steam/steam-openid.service';
import { Config } from '../../backend/src/app/config';

import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { PrismaClient } from '@momentum/db';

import {
  JWTResponseGameDto,
  JWTResponseWebDto
} from '../../backend/src/app/dto';
import {
  setupE2ETestEnvironment,
  teardownE2ETestEnvironment
} from './support/environment';
import { Role } from '@momentum/constants';
import { createHash } from 'node:crypto';

describe('Auth', () => {
  const testJwtService = new JwtService({
    secret: Config.jwt.secret,
    signOptions: { expiresIn: Config.jwt.expTime }
  });
  let app: NestFastifyApplication,
    prisma: PrismaClient,
    db: DbUtil,
    req: RequestUtil;

  before(async () => {
    const env = await setupE2ETestEnvironment();
    app = env.app;
    db = env.db;
    prisma = env.prisma;
    req = env.req;
  });

  after(async () => {
    await db.cleanup('user');
    await teardownE2ETestEnvironment(app, prisma);
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
        verifyAssertionSpy: ReturnType<typeof mock.method>,
        steamSummarySpy: ReturnType<typeof mock.method>,
        steamIsLimitedSpy: ReturnType<typeof mock.method>,
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

      before(() => {
        configService = app.get(ConfigService);

        verifyAssertionSpy = mock.method(
          app.get(SteamOpenIDService)['relyingParty'],
          'verifyAssertion'
        );
        verifyAssertionSpy.mock.mockImplementation((request, callback) =>
          callback(undefined, {
            authenticated: true,
            claimedIdentifier: `https://steamcommunity.com/openid/id/${steamID}`
          })
        );
        steamSummarySpy = mock.method(
          app.get(SteamService),
          'getSteamUserSummaryData'
        );
        steamSummarySpy.mock.mockImplementation(() =>
          Promise.resolve(steamData as any)
        );

        steamIsLimitedSpy = mock.method(
          app.get(SteamService),
          'isAccountLimited'
        );
        steamIsLimitedSpy.mock.mockImplementation(() => Promise.resolve(false));

        mock
          .method(configService, 'getOrThrow')
          .mock.mockImplementation((key) => {
            switch (key) {
              case 'steam.preventLimited':
                return true;
              case 'jwt.expTime':
                return '1m';
              case 'jwt.refreshExpTime':
                return '5m';
              case 'url.frontend':
                return 'dashboard.momentum-mod.org';
            }
          });
      });

      after(async () => {
        await mock.restoreAll();
      });

      describe('when given a valid login for a new user', () => {
        before(async () => {
          response = await request();
        });

        after(async () => {
          await db.cleanup('user');
        });

        it('should succeed and redirect to dashboard', () => {
          assert.equal(response.statusCode, 302);
          assert.equal(response.headers.location, 'dashboard.momentum-mod.org');
        });

        it('should create a new user', async () => {
          const userDB = await prisma.user.findFirst();
          assert.partialDeepStrictEqual(userDB, {
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
          assert.partialDeepStrictEqual(decodedAccessToken, {
            id: userDB.id,
            steamID: userDB.steamID.toString(),
            gameAuth: false
          });

          const decodedRefreshToken = testJwtService.decode(
            cookies.refreshToken
          ) as any;
          assert.equal(decodedRefreshToken.id, userDB.id);
        });
      });

      describe('when given a valid login for an existing user user', () => {
        let user;

        before(async () => {
          user = await db.createUser({
            data: {
              steamID: steamID,
              alias: steamData.personaname,
              avatar: steamData.avatarhash,
              country: steamData.loccountrycode
            }
          });

          response = await request();
        });

        after(async () => {
          await db.cleanup('user', 'deletedUser');
        });

        it('should succeed and redirect to dashboard', () => {
          assert.equal(response.statusCode, 302);
          assert.equal(response.headers.location, 'dashboard.momentum-mod.org');
        });

        it('should create a new user', async () => {
          const updatedUser = await prisma.user.findFirst();
          assert.partialDeepStrictEqual(updatedUser, {
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
          assert.partialDeepStrictEqual(decodedAccessToken, {
            id: userDB.id,
            steamID: userDB.steamID.toString(),
            gameAuth: false
          });

          const decodedRefreshToken = testJwtService.decode(
            cookies.refreshToken
          ) as any;
          assert.equal(decodedRefreshToken.id, userDB.id);
        });
      });

      it('should throw a ForbiddenException if the user has not set up their profile', async () => {
        steamSummarySpy.mock.mockImplementationOnce(async () => ({
          ...steamData,
          profilestate: 0
        }));
        const res = await request();
        assert.equal(res.statusCode, 403);
      });

      it('should throw a ForbiddenException if account with this steamID was deleted', async () => {
        const steamIDHash = createHash('sha256')
          .update(steamID.toString())
          .digest('hex');

        await prisma.deletedUser.create({
          data: { steamIDHash }
        });

        const res = await request();
        assert.equal(res.statusCode, 403);

        await prisma.deletedUser.delete({
          where: { steamIDHash }
        });
      });

      it('should create an account with a limited role if the user is a limited account and preventLimited is true', async () => {
        steamIsLimitedSpy.mock.mockImplementationOnce(async () => true);

        await request();

        assert.partialDeepStrictEqual(await prisma.user.findFirst(), {
          roles: Role.LIMITED
        });

        await db.cleanup('user');
      });

      it('should remove a limited role if the user is no longer a limited account', async () => {
        await db.createUser({
          data: {
            steamID: steamID,
            alias: steamData.personaname,
            avatar: steamData.avatarhash,
            country: steamData.loccountrycode,
            roles: Role.LIMITED
          }
        });

        await request();

        assert.partialDeepStrictEqual(await prisma.user.findFirst(), {
          roles: 0
        });

        await db.cleanup('user');
      });

      it('should create an account if the user is a limited account and preventLimited is false', async () => {
        steamIsLimitedSpy.mock.mockImplementationOnce(async () => true);
        mock
          .method(configService, 'getOrThrow')
          .mock.mockImplementationOnce((key) => {
            switch (key) {
              case 'steam.preventLimited':
                return false;
              case 'jwt.expTime':
                return '1m';
              case 'jwt.refreshExpTime':
                return '5m';
            }
          });

        steamIsLimitedSpy.mock.mockImplementationOnce(async () => true);

        await request();

        assert.partialDeepStrictEqual(await prisma.user.findFirst(), {
          steamID: steamID
        });

        await db.cleanup('user');
      });

      describe('when given a valid login, and killswitch is active', () => {
        it('should fail if trying to login a new user', async () => {
          const adminToken = await db.loginNewUser({
            data: { roles: Role.ADMIN }
          });

          await req.patch({
            url: 'admin/killswitch',
            status: 204,
            body: {
              NEW_SIGNUPS: true
            },
            token: adminToken
          });

          response = await request();

          assert.equal(response.statusCode, 409);

          await resetKillswitches(req, adminToken);

          db.cleanup('user');
        });
      });
    });
  });

  describe('auth/game', () => {
    const appID = 669270;
    const userAgent = `Valve/Steam HTTP Client 1.0 (${appID})`;

    let steamService: SteamService, configService: ConfigService;

    before(async () => {
      steamService = app.get(SteamService);
      configService = app.get(ConfigService);
    });

    describe('Online API', () => {
      beforeEach(async () => {
        await mock
          .method(configService, 'getOrThrow')
          .mock.mockImplementation((key) => {
            switch (key) {
              case 'steam.useSteamTicketLibrary':
                return false;
              case 'jwt.gameExpTime':
                return '1m';
            }
          });
      });

      afterEach(async () => {
        await db.cleanup('user');
      });

      after(async () => {
        await mock.restoreAll();
      });

      it('should create a new user and respond with a game JWT', async () => {
        const userSteamID = 1n;
        const userSteamSummary = {
          profilestate: 1,
          steamid: userSteamID,
          personaname: 'Dogathan',
          avatarhash: 'ac7305567f93a4c9eec4d857df993191c61fb240_full.jpg',
          loccountrycode: 'AQ'
        };

        mock
          .method(steamService, 'tryAuthenticateUserTicketOnline')
          .mock.mockImplementationOnce(async () => userSteamID);
        mock
          .method(steamService, 'getSteamUserSummaryData')
          .mock.mockImplementationOnce(async () => userSteamSummary as any);

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

        assert.equal(res.statusCode, 201);
        const body = JSON.parse(res.body);
        assertValidDto(body, JWTResponseGameDto);

        const decrypted = testJwtService.decode(body.token) as Record<
          string,
          any
        >;
        assert.equal(decrypted.steamID, userSteamID.toString());
        assert.equal(decrypted.exp - decrypted.iat, 60);

        const userDB = await prisma.user.findFirst();
        assert.partialDeepStrictEqual(userDB, {
          steamID: userSteamID,
          alias: userSteamSummary.personaname,
          country: userSteamSummary.loccountrycode,
          avatar: 'ac7305567f93a4c9eec4d857df993191c61fb240'
        });
      });

      it('should find an existing user and respond with a game JWT', async () => {
        const userDB = await prisma.user.create({
          data: {
            steamID: 1,
            alias: 'Dogathan',
            avatar: 'bbbbb5567f93a4c9eec4d857df993191c61fb240',
            country: 'QA'
          }
        });
        const userSteamSummary = {
          steamid: userDB.steamID,
          personaname: 'Manathan',
          avatarhash: 'bbbbb5567f93a4c9eec4d857df993191c61fb240_full.jpg',
          loccountrycode: 'QA'
        };

        mock
          .method(steamService, 'tryAuthenticateUserTicketOnline')
          .mock.mockImplementationOnce(async () => userDB.steamID);
        mock
          .method(steamService, 'getSteamUserSummaryData')
          .mock.mockImplementationOnce(async () => userSteamSummary as any);

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

        assert.equal(res.statusCode, 201);
        const body = JSON.parse(res.body);
        assertValidDto(body, JWTResponseGameDto);

        const decrypted = testJwtService.decode(body.token) as Record<
          string,
          any
        >;
        assert.equal(decrypted.steamID, userDB.steamID.toString());

        assert.equal(decrypted.exp - decrypted.iat, 60);
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

        assert.equal(res.statusCode, 400);
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

        assert.equal(res.statusCode, 400);
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

        assert.equal(res.statusCode, 400);
      });

      it('should 401 when Steam does not return a valid user ticket', async () => {
        mock
          .method(steamService, 'tryAuthenticateUserTicketOnline')
          .mock.mockImplementationOnce(async () => {
            throw new UnauthorizedException(
              'hi uhhhhh sorry its a tuesday you cant login'
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

        assert.equal(res.statusCode, 401);
      });

      it("should 401 when Steam returns a SteamID that doesn't match the ID in the header", async () => {
        mock
          .method(steamService, 'tryAuthenticateUserTicketOnline')
          .mock.mockImplementationOnce(async () => 2n);

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

        assert.equal(res.statusCode, 401);
      });
    });

    describe('Local Library', () => {
      beforeEach(async () => {
        await mock
          .method(configService, 'getOrThrow')
          .mock.mockImplementation((key) => {
            switch (key) {
              case 'steam.useSteamTicketLibrary':
                return true;
              case 'jwt.gameExpTime':
                return '1m';
              case 'appIDs':
                return [appID];
            }
          });
      });

      afterEach(async () => {
        await db.cleanup('user');
      });

      after(async () => {
        await mock.restoreAll();
      });

      it('should create a new user and respond with a game JWT', async () => {
        const userSteamID = 1n;
        const userSteamSummary = {
          profilestate: 1,
          steamid: userSteamID,
          personaname: 'Dogathan',
          avatarhash: 'ac7305567f93a4c9eec4d857df993191c61fb240_full.jpg',
          loccountrycode: 'AQ'
        };

        mock
          .method(steamService, 'tryAuthenticateUserTicketLocal')
          .mock.mockImplementationOnce(() => ({
            steamID: userSteamID,
            appID: appID
          }));
        mock
          .method(steamService, 'getSteamUserSummaryData')
          .mock.mockImplementationOnce(async () => userSteamSummary as any);

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

        assert.equal(res.statusCode, 201);
        const body = JSON.parse(res.body);
        assertValidDto(body, JWTResponseGameDto);

        const decrypted = testJwtService.decode(body.token) as Record<
          string,
          any
        >;
        assert.equal(decrypted.steamID, userSteamID.toString());
        assert.equal(decrypted.exp - decrypted.iat, 60);

        const userDB = await prisma.user.findFirst();
        assert.partialDeepStrictEqual(userDB, {
          steamID: userSteamID,
          alias: userSteamSummary.personaname,
          country: userSteamSummary.loccountrycode,
          avatar: 'ac7305567f93a4c9eec4d857df993191c61fb240'
        });
      });

      it('should find an existing user and respond with a game JWT', async () => {
        const userDB = await prisma.user.create({
          data: {
            steamID: 1,
            alias: 'Dogathan',
            avatar: 'bbbbb5567f93a4c9eec4d857df993191c61fb240',
            country: 'QA'
          }
        });
        const userSteamSummary = {
          steamid: userDB.steamID,
          personaname: 'The PriceMaster',
          avatarhash: 'bbbbb5567f93a4c9eec4d857df993191c61fb240_full.jpg',
          loccountrycode: 'US'
        };

        mock
          .method(steamService, 'tryAuthenticateUserTicketLocal')
          .mock.mockImplementationOnce(() => ({
            steamID: userDB.steamID,
            appID: appID
          }));
        mock
          .method(steamService, 'getSteamUserSummaryData')
          .mock.mockImplementationOnce(async () => userSteamSummary as any);

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

        assert.equal(res.statusCode, 201);
        const body = JSON.parse(res.body);
        assertValidDto(body, JWTResponseGameDto);

        const decrypted = testJwtService.decode(body.token) as Record<
          string,
          any
        >;
        assert.equal(decrypted.steamID, userDB.steamID.toString());

        assert.equal(decrypted.exp - decrypted.iat, 60);
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

        assert.equal(res.statusCode, 400);
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

        assert.equal(res.statusCode, 400);
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

        assert.equal(res.statusCode, 400);
      });

      it('should 401 when Steam does not return a valid user ticket', async () => {
        mock
          .method(steamService, 'tryAuthenticateUserTicketLocal')
          .mock.mockImplementationOnce(() => {
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

        assert.equal(res.statusCode, 401);
      });

      it("should 401 when Steam returns a SteamID that doesn't match the ID in the header", async () => {
        mock
          .method(steamService, 'tryAuthenticateUserTicketOnline')
          .mock.mockImplementationOnce(async () => 2n);

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

        assert.equal(res.statusCode, 401);
      });
    });
  });

  describe('auth/refresh', () => {
    afterEach(async () => {
      await db.cleanup('user');
    });

    it('should respond with a new token pair', async () => {
      const [user, token] = await db.createAndLoginUser();

      const originalRefreshToken = testJwtService.sign({ id: user.id });

      const res = await req.post({
        url: 'auth/refresh',
        skipApiPrefix: true,
        token,
        body: { refreshToken: originalRefreshToken },
        status: 201,
        validate: JWTResponseWebDto
      });

      assert.partialDeepStrictEqual(
        testJwtService.decode(res.body.accessToken) as Record<string, any>,
        {
          id: user.id,
          steamID: user.steamID.toString()
        }
      );

      assert.partialDeepStrictEqual(
        testJwtService.decode(res.body.refreshToken) as Record<string, any>,
        {
          id: user.id
        }
      );
    });
  });

  describe('auth/web', () => {
    describe('GET', () => {
      it('should redirect to steam login', async () => {
        const res = await req.get({
          url: 'auth/web',
          skipApiPrefix: true,
          status: 302
        });

        assert.match(
          res.headers.location,
          /^https:\/\/steamcommunity.com\/openid\/login.+/
        );
      });
    });
  });
});
