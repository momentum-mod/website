import { mock, after, before, describe, it } from 'node:test';
import { ParsedResponse, resetKillswitches } from '@momentum/test-utils';
import * as assert from 'node:assert/strict';

// Note that by importing and mocking these services service we're breaking a
// major rule of E2E testing. But we need to test code that relies on Steam's
// API, so our only sane option is to mock.
import { SteamService } from '../../backend/src/app/modules/steam/steam.service';
import { SteamOpenIDService } from '../../backend/src/app/modules/auth/steam/steam-openid.service';
import { Config } from '../../backend/src/app/config';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Role } from '@momentum/constants';
import { createHash } from 'node:crypto';
import {
  app,
  prisma,
  req,
  db,
  valkey,
  registerE2ETestFile
} from './support/e2e-environment';

describe('Auth', () => {
  registerE2ETestFile();
  const testJwtService = new JwtService({
    secret: Config.jwt.secret,
    signOptions: { expiresIn: Config.jwt.expTime }
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
        configSpy: ReturnType<typeof mock.method>,
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

        configSpy = mock.method(configService, 'getOrThrow');
        configSpy.mock.mockImplementation((key) => {
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
        configSpy.mock.mockImplementationOnce((key) => {
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

          await resetKillswitches(valkey);

          await db.cleanup('user');
        });
      });
    });
  });
});
