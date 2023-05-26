// noinspection DuplicatedCode

import { DbUtil, NULL_ID, RequestUtil } from '@momentum/backend/test-utils';
import { ActivityDto } from '@momentum/backend/dto';
import { ActivityType } from '@momentum/constants';
import { PrismaClient } from '@prisma/client';
import {
  setupE2ETestEnvironment,
  teardownE2ETestEnvironment
} from './support/environment';

describe('Activities', () => {
  let app, prisma: PrismaClient, req: RequestUtil, db: DbUtil;

  beforeAll(async () => {
    const env = await setupE2ETestEnvironment();
    prisma = env.prisma;
    app = env.app;
    req = env.req;
    db = env.db;
  });

  afterAll(() => teardownE2ETestEnvironment(app));

  describe('activities', () => {
    describe('GET', () => {
      let u1, u1Token, u2, _activity1, _activity2, activity3;

      beforeAll(async () => {
        [[u1, u1Token], u2] = await Promise.all([
          db.createAndLoginUser({
            data: { roles: { create: { verified: true, mapper: true } } },
            include: { roles: true }
          }),
          db.createUser({
            data: { roles: { create: { mapper: true } } },
            include: { roles: true }
          })
        ]);

        // Define these BEFORE insert for later checks, Prisma doesn't give us back our fookin created items.
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

      afterAll(() => db.cleanup('user'));

      it('should respond with an array of activities', async () => {
        const res = await req.get({
          url: 'activities',
          status: 200,
          token: u1Token,
          validatePaged: { type: ActivityDto, count: 3 }
        });

        expect(
          res.body.response.find(
            (data) => data.userID === u1.id && data.data === 122
          ).type
        ).toBe(ActivityType.MAP_APPROVED);
        expect(
          res.body.response.find(
            (data) => data.userID === u1.id && data.data === 123
          ).type
        ).toBe(ActivityType.WR_ACHIEVED);
        expect(
          res.body.response.find((data) => data.userID === u2.id).type
        ).toBe(ActivityType.REVIEW_MADE);
      });

      it('should respond with array of activities with userID parameter', async () => {
        const res = await req.get({
          url: 'activities',
          status: 200,
          query: { userID: u1.id },
          token: u1Token,
          validatePaged: { type: ActivityDto, count: 2 }
        });

        expect(res);
        expect(res.body.response.every((data) => data.userID == u1.id)).toBe(
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

        expect(res);
        expect(res.body.response.every((data) => data.data == '124')).toBe(
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

        expect(res);
        expect(
          res.body.response.filter(
            (d) => d.userID === u1.id || d.userID === u2.id
          ).length
        ).toBe(1);
      });

      it('should respond with array of all activities with type ALL paramater', async () => {
        const res = await req.get({
          url: 'activities',
          status: 200,
          query: { type: ActivityType.ALL },
          token: u1Token,
          validatePaged: { type: ActivityDto, count: 3 }
        });

        expect(res);
        expect(
          res.body.response.filter(
            (d) => d.userID === u1.id || d.userID === u2.id
          ).length
        ).toBe(3);
      });

      it('should respond with array of activities with take parameter', () =>
        req.takeTest({
          url: 'activities',
          validate: ActivityDto,
          token: u1Token
        }));

      it('should respond with array of users with skip parameter', async () =>
        req.skipTest({
          url: 'activities',
          validate: ActivityDto,
          token: u1Token
        }));

      it('should respond with an empty array for a nonexistent user', async () => {
        const res = await req.get({
          url: 'activities',
          status: 200,
          query: { userID: NULL_ID },
          token: u1Token,
          validatePaged: { type: ActivityDto, count: 0 }
        });

        expect(res);
        expect(res.body.response).toBeInstanceOf(Array);
      });

      it('should 400 when a bad type is passed', () =>
        req.get({
          url: 'activities',
          status: 400,
          query: { type: 'POTATO' },
          token: u1Token
        }));

      it('should 401 when no access token is provided', () =>
        req.unauthorizedTest('activities', 'get'));
    });
  });
});
