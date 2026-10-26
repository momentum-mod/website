import { after, before, describe, it } from 'node:test';
import { futureDateOffset, NULL_ID } from '@momentum/test-utils';
import * as assert from 'node:assert/strict';
import { ActivityDto } from '../../backend/src/app/dto';
import { ActivityType } from '@momentum/constants';
import {
  prisma,
  req,
  db,
  registerE2ETestFile
} from './support/e2e-environment';

describe('User', () => {
  registerE2ETestFile();

  describe('user/activities/followed', () => {
    describe('GET', () => {
      let u1, u1Token, u2, u2Token;

      before(async () => {
        [[u1, u1Token], [u2, u2Token]] = await Promise.all([
          db.createAndLoginUser(),
          db.createAndLoginUser()
        ]);
        await prisma.follow.create({
          data: { followeeID: u1.id, followedID: u2.id }
        });
        await prisma.activity.createMany({
          data: [
            {
              userID: u2.id,
              data: 1n,
              type: ActivityType.WR_ACHIEVED,
              createdAt: futureDateOffset(2)
            },
            {
              userID: u2.id,
              data: 2n,
              type: ActivityType.REVIEW_MADE,
              createdAt: futureDateOffset(1)
            }
          ]
        });
      });

      after(async () => {
        await db.cleanup('user');
      });

      it('should retrieve a list of activities from the local users followed users', async () => {
        const res = await req.get({
          url: 'user/activities/followed',
          status: 200,
          validatePaged: ActivityDto,
          token: u1Token
        });

        assert.partialDeepStrictEqual(res.body, {
          totalCount: 2,
          returnCount: 2,
          data: [{ user: { alias: u2.alias } }, { user: { alias: u2.alias } }]
        });
      });

      it('should order the list by descending date', async () => {
        await req.sortByDateTest({
          url: 'user/activities/followed',
          validate: ActivityDto,
          token: u1Token
        });
      });

      it('should respond with a limited list of activities for the u1 when using the take query param', async () => {
        await req.takeTest({
          url: 'user/activities/followed',
          validate: ActivityDto,
          token: u1Token
        });
      });

      it('should respond with a different list of activities for the u1 when using the skip query param', async () => {
        await req.skipTest({
          url: 'user/activities/followed',
          validate: ActivityDto,
          token: u1Token
        });
      });

      it('should respond with a filtered list of activities for the u1 when using the type query param', async () => {
        const res = await req.get({
          url: 'user/activities/followed',
          status: 200,
          query: { type: ActivityType.WR_ACHIEVED },
          validatePaged: ActivityDto,
          token: u1Token
        });

        assert.partialDeepStrictEqual(res.body, {
          totalCount: 1,
          returnCount: 1,
          data: [{ userID: u2.id, type: ActivityType.WR_ACHIEVED, data: 1 }]
        });
      });

      it('should respond with a filtered list of activities for the u1 when using the data query param', async () => {
        const res = await req.get({
          url: 'user/activities/followed',
          status: 200,
          query: { data: 2 },
          validatePaged: ActivityDto,
          token: u1Token
        });

        assert.partialDeepStrictEqual(res.body, {
          totalCount: 1,
          returnCount: 1,
          data: [{ userID: u2.id, data: 2, type: ActivityType.REVIEW_MADE }]
        });
      });

      it('should respond with an empty list of activities for the u1 when using the data query param with nonexistent data', async () => {
        const res = await req.get({
          url: 'user/activities/followed',
          status: 200,
          query: { data: NULL_ID },
          token: u1Token
        });

        assert.partialDeepStrictEqual(res.body, {
          totalCount: 0,
          returnCount: 0
        });
        assert.ok(res.body.data instanceof Array);
      });

      it('should respond with an empty list of activities for a u1 that is not following anyone', async () => {
        const res = await req.get({
          url: 'user/activities/followed',
          status: 200,
          token: u2Token
        });

        assert.partialDeepStrictEqual(res.body, {
          totalCount: 0,
          returnCount: 0
        });
        assert.ok(res.body.data instanceof Array);
      });

      it('should 401 when no access token is provided', async () => {
        await req.unauthorizedTest('user/activities/followed', 'get');
      });
    });
  });
});
