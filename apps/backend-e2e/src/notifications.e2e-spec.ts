// noinspection DuplicatedCode

import { DbUtil, RequestUtil } from '@momentum/test-utils';
import { PrismaClient } from '@prisma/client';

import {
  setupE2ETestEnvironment,
  teardownE2ETestEnvironment
} from './support/environment';
import { MapStatus, NotificationType } from '@momentum/constants';
import { NotificationDto } from 'apps/backend/src/app/dto';

describe('Notifications', () => {
  let app, prisma: PrismaClient, req: RequestUtil, db: DbUtil;
  let user, userToken, map, user2;

  beforeAll(async () => {
    const env = await setupE2ETestEnvironment();
    app = env.app;
    prisma = env.prisma;
    req = env.req;
    db = env.db;
  });

  afterAll(async () => await teardownE2ETestEnvironment(app));

  beforeEach(async () => {
    [user, userToken] = await db.createAndLoginUser();
    user2 = await db.createUser();
    map = await db.createMap({
      name: 'the_map_hard_version',
      submitter: { connect: { id: user2.id } },
      status: MapStatus.PRIVATE_TESTING
    });
    // In the future, announcements won't ever be in db
    // they will just get pushed directly to user
    // these are here for testing purposes
    await prisma.notification.createMany({
      data: [
        {
          notifiedUserID: user.id,
          type: NotificationType.ANNOUNCEMENT,
          message: 'Game will explode in 10 minutes'
        },
        {
          notifiedUserID: user.id,
          type: NotificationType.ANNOUNCEMENT,
          message: 'nvm game is fine'
        },
        {
          notifiedUserID: user.id,
          type: NotificationType.ANNOUNCEMENT,
          message: 'web dev needed urgently'
        },
        {
          notifiedUserID: user.id,
          type: NotificationType.MAP_TEST_INVITE,
          mapID: map.id,
          userID: user2.id
        },
        {
          notifiedUserID: user2.id,
          type: NotificationType.ANNOUNCEMENT,
          message: 'this is just for u <3'
        }
      ]
    });
  });

  afterEach(() => db.cleanup('notification', 'mMap', 'user'));

  describe('notifications/ GET', () => {
    it('should get a list of notifications', async () =>
      req.get({
        url: 'notifications',
        status: 200,
        validatePaged: { type: NotificationDto, count: 4 },
        token: userToken
      }));

    it('should respond with a paged list of notifications with the take parameter', () =>
      req.takeTest({
        url: 'notifications',
        validate: NotificationDto,
        token: userToken
      }));

    it('should respond with a paged list of notifications with the skip parameter', () =>
      req.skipTest({
        url: 'notifications',
        validate: NotificationDto,
        token: userToken
      }));

    it('should 401 when no access token is provided', () =>
      req.unauthorizedTest('notifications', 'get'));
  });
});
