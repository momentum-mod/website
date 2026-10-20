import { after, afterEach, before, beforeEach, describe, it } from 'node:test';
import { NULL_ID } from '@momentum/test-utils';
import * as assert from 'node:assert/strict';

// See auth.e2e-spec.ts for justification of this sin
import { MapCreditDto } from '../../backend/src/app/dto';
import { MapCreditType, MapStatus } from '@momentum/constants';
import {
  prisma,
  req,
  db,
  registerE2ETestFile
} from './support/test-environment';

describe('Maps Part 2', () => {
  registerE2ETestFile();

  describe('maps/{mapID}/credits/{userID}', () => {
    describe('GET', () => {
      let user, token, map, u2Token;
      const creditType = MapCreditType.AUTHOR;

      before(async () => {
        [[user, token], map, u2Token] = await Promise.all([
          db.createAndLoginUser(),
          db.createMap(),
          db.loginNewUser()
        ]);
      });

      after(async () => {
        await db.cleanup('user', 'mMap');
      });

      beforeEach(async () => {
        await prisma.mapCredit.create({
          data: { mapID: map.id, userID: user.id, type: creditType }
        });
      });

      afterEach(async () => {
        await prisma.mapCredit.deleteMany();
      });

      it('should return the specified map credit', async () => {
        const res = await req.get({
          url: `maps/${map.id}/credits/${user.id}`,
          status: 200,
          validate: MapCreditDto,
          token
        });

        assert.partialDeepStrictEqual(res.body, {
          type: creditType,
          userID: user.id,
          mapID: map.id
        });
      });

      it('should return the specified map credit with the user expand parameter', async () => {
        await req.expandTest({
          url: `maps/${map.id}/credits/${user.id}`,
          expand: 'user',
          validate: MapCreditDto,
          token
        });
      });

      // Test that permissions checks are getting called
      it('should 403 if the user does not have permission to access to the map', async () => {
        await prisma.mMap.update({
          where: { id: map.id },
          data: { status: MapStatus.PRIVATE_TESTING }
        });

        await req.get({
          url: `maps/${map.id}/credits/${user.id}`,
          status: 403,
          token: u2Token
        });

        await prisma.mMap.update({
          where: { id: map.id },
          data: { status: MapStatus.APPROVED }
        });
      });

      it('should return a 404 if the map is not found', async () => {
        await req.get({
          url: `maps/${NULL_ID}/credits/${user.id}`,
          status: 404,
          token
        });
      });

      it('should return a 404 if the user is not found', async () => {
        await req.get({
          url: `maps/${map.id}/credits/${NULL_ID}`,
          status: 404,
          token
        });
      });
    });
  });
});
