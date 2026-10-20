import { after, before, describe, it } from 'node:test';
import { assertValidDto } from '@momentum/test-utils';
import * as assert from 'node:assert/strict';
import { MapSummaryDto } from '../../backend/src/app/dto';
import { req, db, registerE2ETestFile } from './support/e2e-environment';

describe('User', () => {
  registerE2ETestFile();

  describe('user/maps/summary', () => {
    describe('GET', () => {
      let u1, u1Token, u2Token;

      before(async () => {
        [[u1, u1Token], u2Token] = await Promise.all([
          db.createAndLoginUser(),
          db.loginNewUser()
        ]);
        await Promise.all([
          db.createMap({
            name: 'ahop_aaaaaaaa',
            submitter: { connect: { id: u1.id } }
          }),
          db.createMap({
            name: 'ahop_bbbbbbbb',
            submitter: { connect: { id: u1.id } }
          })
        ]);
      });

      after(async () => {
        await db.cleanup('user', 'mMap');
      });

      it('should retrieve an array of objects that each contain a status and its count', async () => {
        const res = await req.get({
          url: 'user/maps/summary',
          status: 200,
          token: u1Token
        });

        assert.ok(res.body instanceof Array);
        for (const item of res.body) assertValidDto(item, MapSummaryDto);
      });

      it('should retrieve an empty summary list', async () => {
        const res = await req.get({
          url: 'user/maps/summary',
          status: 200,
          token: u2Token
        });

        assert.ok(res.body instanceof Array);
        assert.equal(res.body.length, 0);
      });

      it('should 401 when no access token is provided', async () => {
        await req.unauthorizedTest('user/maps/summary', 'get');
      });
    });
  });
});
