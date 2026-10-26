import { mock, after, afterEach, before, describe, it } from 'node:test';
import { assertValidDto } from '@momentum/test-utils';
import * as assert from 'node:assert/strict';

// Note that by importing and mocking these services service we're breaking a
// major rule of E2E testing. But we need to test code that relies on Steam's
// API, so our only sane option is to mock.
import { SteamService } from '../../backend/src/app/modules/steam/steam.service';
import { Config } from '../../backend/src/app/config';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { JWTResponseGameDto } from '../../backend/src/app/dto';
import {
  app,
  prisma,
  db,
  registerE2ETestFile
} from './support/e2e-environment';

describe('Auth', () => {
  registerE2ETestFile();
  const testJwtService = new JwtService({
    secret: Config.jwt.secret,
    signOptions: { expiresIn: Config.jwt.expTime }
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
      before(async () => {
        mock
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
          realAlias: userSteamSummary.personaname,
          customAlias: null,
          alias: userSteamSummary.personaname,
          country: userSteamSummary.loccountrycode,
          avatar: 'ac7305567f93a4c9eec4d857df993191c61fb240'
        });
      });

      it('should find an existing user and respond with a game JWT', async () => {
        const userDB = await prisma.user.create({
          data: {
            steamID: 1,
            realAlias: 'Dogathan',
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

        assert.partialDeepStrictEqual(
          await prisma.user.findUnique({ where: { id: userDB.id } }),
          {
            realAlias: userSteamSummary.personaname,
            alias: userSteamSummary.personaname
          }
        );
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
      before(async () => {
        mock
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
          realAlias: userSteamSummary.personaname,
          customAlias: null,
          alias: userSteamSummary.personaname,
          country: userSteamSummary.loccountrycode,
          avatar: 'ac7305567f93a4c9eec4d857df993191c61fb240'
        });
      });

      it('should find an existing user and respond with a game JWT', async () => {
        const userDB = await prisma.user.create({
          data: {
            steamID: 1,
            realAlias: 'Dogathan',
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

        assert.partialDeepStrictEqual(
          await prisma.user.findUnique({ where: { id: userDB.id } }),
          {
            realAlias: userSteamSummary.personaname,
            alias: userSteamSummary.personaname
          }
        );
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
});
