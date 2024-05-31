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

  describe('notifications/markAsRead DELETE', () => {
    it('should delete a list of notifications', async () => {
      const notifs = await prisma.notification.findMany({
        where: {
          notifiedUserID: user.id
        }
      });

      const toDelete = [notifs[0].id, notifs[1].id];

      await req.del({
        url: 'notifications/markAsRead',
        status: 204,
        query: { notifIDs: toDelete.join(',') },
        token: userToken
      });

      const newNotifs = await prisma.notification.findMany({
        where: {
          notifiedUserID: user.id
        }
      });

      expect(newNotifs).toMatchObject([
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
        }
      ]);
    });
    it('should not delete a map testing request notification', async () => {
      const notif = await prisma.notification.findFirst({
        where: {
          notifiedUserID: user.id,
          type: NotificationType.MAP_TEST_INVITE
        }
      });

      await req.del({
        url: 'notifications/markAsRead',
        status: 204,
        query: { notifIDs: notif.id.toString() },
        token: userToken
      });

      const notifs = await prisma.notification.findMany({
        where: {
          notifiedUserID: user.id
        }
      });

      expect(notifs).toMatchObject([
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
        }
      ]);
    });

    it('should not delete a notification targeting another user', async () => {
      const notif = await prisma.notification.findFirst({
        where: {
          notifiedUserID: user2.id
        }
      });
      await req.del({
        url: 'notifications/markAsRead',
        status: 204,
        query: { notifIDs: notif.id.toString() },
        token: userToken
      });

      const newNotifs = await prisma.notification.findMany({
        where: {
          notifiedUserID: user2.id
        }
      });

      expect(newNotifs).toMatchObject([
        {
          notifiedUserID: user2.id,
          type: NotificationType.ANNOUNCEMENT,
          message: 'this is just for u <3'
        }
      ]);
    });

    it('should delete all non-testing request notifications', async () => {
      await req.del({
        url: 'notifications/markAsRead',
        status: 204,
        query: { all: true },
        token: userToken
      });

      const notifs = await prisma.notification.findMany({
        where: {
          notifiedUserID: user.id
        }
      });

      expect(notifs).toMatchObject([
        {
          notifiedUserID: user.id,
          type: NotificationType.MAP_TEST_INVITE,
          mapID: map.id,
          userID: user2.id
        }
      ]);
    });

    it('should 400 if not given the correct query', async () => {
      await req.del({
        url: 'notifications/markAsRead',
        status: 400,
        query: { notifIDs: '2,119,bob,1137' },
        token: userToken
      });
      await req.del({
        url: 'notifications/markAsRead',
        status: 400,
        query: { notifIDs: 'guh' },
        token: userToken
      });
      await req.del({
        url: 'notifications/markAsRead',
        status: 400,
        query: { notTheRightQuery: '123,456' },
        token: userToken
      });
    });

    it('should 401 when no access token is provided', () =>
      req.unauthorizedTest('notifications/markAsRead', 'del'));
  });
});
