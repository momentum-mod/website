import { afterEach, describe, it } from 'node:test';
import * as assert from 'node:assert/strict';

// Note that by importing and mocking these services service we're breaking a
// major rule of E2E testing. But we need to test code that relies on Steam's
// API, so our only sane option is to mock.
import { JwtService } from '@nestjs/jwt';
import { JWTResponseWebDto } from '../../backend/src/app/dto';
import { app, req, db, registerE2ETestFile } from './support/e2e-environment';

describe('Auth', () => {
  registerE2ETestFile();

  describe('auth/refresh', () => {
    afterEach(async () => {
      await db.cleanup('user');
    });

    it('should respond with a new token pair', async () => {
      const testJwtService = app.get(JwtService);
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
