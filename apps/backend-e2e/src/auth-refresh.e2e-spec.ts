import { afterEach, describe, it } from 'node:test';
import * as assert from 'node:assert/strict';

// Note that by importing and mocking these services service we're breaking a
// major rule of E2E testing. But we need to test code that relies on Steam's
// API, so our only sane option is to mock.
import { Config } from '../../backend/src/app/config';
import { JwtService } from '@nestjs/jwt';
import { JWTResponseWebDto } from '../../backend/src/app/dto';
import { req, db, registerE2ETestFile } from './support/test-environment';

describe('Auth', () => {
  registerE2ETestFile();
  const testJwtService = new JwtService({
    secret: Config.jwt.secret,
    signOptions: { expiresIn: Config.jwt.expTime }
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
});
