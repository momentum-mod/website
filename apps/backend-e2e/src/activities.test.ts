import { after, before, describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { ActivityDto } from '../../backend/src/app/dto';
import { NULL_ID } from '@momentum/test-utils';
import { ActivityType, Role } from '@momentum/constants';
import * as Bitflags from '@momentum/bitflags';
import {
  prisma,
  req,
  db,
  registerE2ETestFile
} from './support/e2e-environment';

describe('Activities', () => {
  registerE2ETestFile();

  describe('activities', () => {
    describe('GET', () => {
      let u1, u1Token, u2, _activity1, _activity2, activity3;

      before(async () => {
        [[u1, u1Token], u2] = await Promise.all([
          db.createAndLoginUser({
            data: { roles: Bitflags.join(Role.VERIFIED, Role.MAPPER) }
          }),
          db.createUser({
            data: { roles: Role.MAPPER }
          })
        ]);

        // Define these BEFORE insert for later checks, Prisma doesn't give us
        // back our fookin created items.
        [_activity1, _activity2, activity3] = [
          { userID: u1.id, data: 122, type: ActivityType.MAP_APPROVED },
          { userID: u1.id, data: 123, type: ActivityType.WR_ACHIEVED },
          { userID: u2.id, data: 124, type: ActivityType.REVIEW_MADE }
        ];

        await prisma.activity.createMany({
          data: [
            { userID: u1.id, data: 122, type: ActivityType.MAP_APPROVED },
            { userID: u1.id, data: 123, type: ActivityType.WR_ACHIEVED },
            { userID: u2.id, data: 124, type: ActivityType.REVIEW_MADE }
          ]
        });
      });

      after(async () => {
        await db.cleanup('user');
      });

      it('should respond with an array of activities', async () => {
        const res = await req.get({
          url: 'activities',
          status: 200,
          token: u1Token,
          validatePaged: { type: ActivityDto, count: 3 }
        });

        assert.equal(
          res.body.data.find(
            (data) => data.userID === u1.id && data.data === 122
          ).type,
          ActivityType.MAP_APPROVED
        );
        assert.equal(
          res.body.data.find(
            (data) => data.userID === u1.id && data.data === 123
          ).type,
          ActivityType.WR_ACHIEVED
        );
        assert.equal(
          res.body.data.find((data) => data.userID === u2.id).type,
          ActivityType.REVIEW_MADE
        );
      });

      it('should respond with array of activities with userID parameter', async () => {
        const res = await req.get({
          url: 'activities',
          status: 200,
          query: { userID: u1.id },
          token: u1Token,
          validatePaged: { type: ActivityDto, count: 2 }
        });
        assert.equal(
          res.body.data.every((data) => data.userID == u1.id),
          true
        );
      });

      it('should respond with array of activities with data parameter', async () => {
        const res = await req.get({
          url: 'activities',
          status: 200,
          query: { data: activity3.data },
          token: u1Token,
          validatePaged: { type: ActivityDto, count: 1 }
        });
        assert.equal(
          res.body.data.every((data) => data.data == '124'),
          true
        );
      });

      it('should respond with array of activities with type paramater', async () => {
        const res = await req.get({
          url: 'activities',
          status: 200,
          query: { type: ActivityType.MAP_APPROVED },
          token: u1Token,
          validatePaged: { type: ActivityDto, count: 1 }
        });
        assert.equal(
          res.body.data.filter((d) => d.userID === u1.id || d.userID === u2.id)
            .length,
          1
        );
      });

      it('should respond with array of all activities with type ALL paramater', async () => {
        const res = await req.get({
          url: 'activities',
          status: 200,
          query: { type: ActivityType.ALL },
          token: u1Token,
          validatePaged: { type: ActivityDto, count: 3 }
        });
        assert.equal(
          res.body.data.filter((d) => d.userID === u1.id || d.userID === u2.id)
            .length,
          3
        );
      });

      it('should respond with array of activities with take parameter', async () => {
        await req.takeTest({
          url: 'activities',
          validate: ActivityDto,
          token: u1Token
        });
      });

      it('should respond with array of users with skip parameter', async () => {
        await req.skipTest({
          url: 'activities',
          validate: ActivityDto,
          token: u1Token
        });
      });

      it('should respond with an empty array for a nonexistent user', async () => {
        const res = await req.get({
          url: 'activities',
          status: 200,
          query: { userID: NULL_ID },
          token: u1Token,
          validatePaged: { type: ActivityDto, count: 0 }
        });
        assert.ok(res.body.data instanceof Array);
      });

      it('should 400 when a bad type is passed', async () => {
        await req.get({
          url: 'activities',
          status: 400,
          query: { type: 'POTATO' },
          token: u1Token
        });
      });

      it('should 401 when no access token is provided', async () => {
        await req.unauthorizedTest('activities', 'get');
      });
    });
  });
});
