import { after, before, describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { ActivityDto } from '../../backend/src/app/dto';
import { futureDateOffset, NULL_ID } from '@momentum/test-utils';
import { ActivityType } from '@momentum/constants';
import {
  prisma,
  req,
  db,
  registerE2ETestFile
} from './support/e2e-environment';

describe('Users', () => {
  registerE2ETestFile();

  describe('GET /users/{userID}/activities', () => {
    let user, token;

    before(async () => {
      [user, token] = await db.createAndLoginUser();
      await prisma.activity.createMany({
        data: [
          {
            data: 1n,
            type: ActivityType.ALL,
            userID: user.id,
            createdAt: futureDateOffset(1)
          },
          {
            data: 2n,
            type: ActivityType.ALL,
            userID: user.id,
            createdAt: futureDateOffset(0)
          },
          {
            data: 2n,
            type: ActivityType.MAP_UPLOADED,
            userID: user.id,
            createdAt: futureDateOffset(2)
          }
        ]
      });
    });

    after(async () => {
      await db.cleanup('user');
    });

    it('should respond with a list of activities related to the specified user', async () => {
      await req.get({
        url: `users/${user.id}/activities`,
        status: 200,
        validatePaged: { type: ActivityDto, count: 3 },
        token
      });
    });

    it('should order the list by descending date', async () => {
      await req.sortByDateTest({
        url: `users/${user.id}/activities`,
        validate: ActivityDto,
        token
      });
    });

    it('should respond with a limited list of activities for the user when using the take query param', async () => {
      await req.takeTest({
        url: `users/${user.id}/activities`,
        validate: ActivityDto,
        token
      });
    });

    it('should respond with a different list of activities for the user when using the skip query param', async () => {
      await req.skipTest({
        url: `users/${user.id}/activities`,
        validate: ActivityDto,
        token
      });
    });

    it('should respond with a filtered list of activities for the user when using the type query param', async () => {
      const res = await req.get({
        url: `users/${user.id}/activities`,
        status: 200,
        query: { type: ActivityType.MAP_UPLOADED },
        validatePaged: { type: ActivityDto, count: 1 },
        token
      });

      assert.equal(res.body.data[0].type, ActivityType.MAP_UPLOADED);
    });

    it('should respond with a filtered list of activities for the user when using the data query param', async () => {
      await req.get({
        url: `users/${user.id}/activities`,
        status: 200,
        query: { data: 2n },
        validatePaged: { type: ActivityDto, count: 2 },
        token
      });
    });

    it('should respond with an empty list of activities for the user when using the data query param with nonexistent data', async () => {
      await req.get({
        url: `users/${user.id}/activities`,
        status: 200,
        query: { data: NULL_ID },
        validatePaged: { type: ActivityDto, count: 0 },
        token
      });
    });

    it('should not include REPORT_FILED activities', async () => {
      await prisma.activity.create({
        data: { type: ActivityType.REPORT_FILED, data: 119n, userID: user.id }
      });

      const res = await req.get({
        url: `users/${user.id}/activities`,
        status: 200,
        validatePaged: { type: ActivityDto, count: 3 },
        token
      });

      for (const act of res.body.data)
        assert.notEqual(act.type, ActivityType.REPORT_FILED);
    });
  });
});
