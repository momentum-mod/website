import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';

// Note that by importing and mocking these services service we're breaking a
// major rule of E2E testing. But we need to test code that relies on Steam's
// API, so our only sane option is to mock.

import { req, registerE2ETestFile } from './support/test-environment';

describe('Auth', () => {
  registerE2ETestFile();

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
