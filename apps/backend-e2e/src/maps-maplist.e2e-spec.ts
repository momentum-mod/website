import { after, before, describe, it } from 'node:test';
import { any, matchesPartial } from '@momentum/test-utils';
import * as assert from 'node:assert/strict';

// See auth.e2e-spec.ts for justification of this sin

import { MapListVersionDto } from '../../backend/src/app/dto/map/map-list-version.dto';
import { req, db, registerE2ETestFile } from './support/test-environment';

describe('Maps Part 2', () => {
  registerE2ETestFile();

  describe('maps/maplist', () => {
    describe('GET', () => {
      let token;
      before(async () => {
        await (token = await db.loginNewUser());
      });
      after(async () => {
        await db.cleanup('user');
      });

      it('should respond with map lists', async () => {
        // We really don't have to test much here, since these values are just
        // stored in memory. Tests doing map submission and approval test this
        // system more thoroughly.
        const res = await req.get({
          url: 'maps/maplistversion',
          status: 200,
          validate: MapListVersionDto,
          token
        });

        assert.ok(
          matchesPartial(res.body, {
            approved: any(Number),
            submissions: any(Number)
          })
        );
      });

      it('should 401 when no access token is provided', async () => {
        await req.unauthorizedTest('maps/maplistversion', 'get');
      });
    });
  });
});
