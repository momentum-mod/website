import { after, before, describe, it } from 'node:test';
import { NULL_ID } from '@momentum/test-utils';
import * as assert from 'node:assert/strict';
import { ActivityDto } from '../../backend/src/app/dto';
import { ActivityType } from '@momentum/constants';
import {
  prisma,
  req,
  db,
  registerE2ETestFile
} from './support/test-environment';

describe('User', () => {
  registerE2ETestFile();

  describe('user/activities', () => {
    describe('GET', () => {
      let user, token;

      before(async () => {
        [user, token] = await db.createAndLoginUser();
        await prisma.activity.createMany({
          data: [
            { userID: user.id, data: 1n, type: ActivityType.ALL },
            { userID: user.id, data: 2n, type: ActivityType.ALL },
            { userID: user.id, data: 2n, type: ActivityType.MAP_UPLOADED }
          ]
        });
      });

      after(async () => {
        await db.cleanup('user');
      });

      it('should retrieve the local users activities', async () => {
        const res = await req.get({
          url: 'user/activities',
          status: 200,
          token,
          validatePaged: ActivityDto
        });

        for (const r of res.body.data) assert.equal(r.user.alias, user.alias);
        assert.equal(res.body.totalCount, 3);
        assert.equal(res.body.returnCount, 3);
      });

      it('should respond with a limited list of activities for the local user when using the take query param', async () => {
        await req.takeTest({
          url: 'user/activities',
          validate: ActivityDto,
          token
        });
      });

      it('should respond with a different list of activities for the local user when using the skip query param', async () => {
        await req.skipTest({
          url: 'user/activities',
          validate: ActivityDto,
          token
        });
      });

      it('should respond with a filtered list of activities for the local user when using the type query param', async () => {
        const res = await req.get({
          url: 'user/activities',
          status: 200,
          validatePaged: ActivityDto,
          query: { type: ActivityType.MAP_UPLOADED },
          token
        });

        assert.partialDeepStrictEqual(res.body, {
          totalCount: 1,
          returnCount: 1,
          data: [{ type: ActivityType.MAP_UPLOADED }]
        });
      });

      it('should respond with a filtered list of activities for the local user when using the data query param', async () => {
        const res = await req.get({
          url: 'user/activities',
          status: 200,
          validatePaged: ActivityDto,
          query: { data: 2 },
          token
        });

        assert.partialDeepStrictEqual(res.body, {
          totalCount: 2,
          returnCount: 2
        });
      });

      it('should respond with an empty list of activities for the local user when using the data query param with nonexistent data', async () => {
        const res = await req.get({
          url: 'user/activities',
          status: 200,
          query: { data: NULL_ID },
          token
        });

        assert.partialDeepStrictEqual(res.body, {
          totalCount: 0,
          returnCount: 0
        });
        assert.ok(res.body.data instanceof Array);
      });

      it('should 401 when no access token is provided', async () => {
        await req.unauthorizedTest('user/activities', 'get');
      });
    });
  });
});
