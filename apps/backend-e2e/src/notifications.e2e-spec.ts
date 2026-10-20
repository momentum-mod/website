import { after, afterEach, before, beforeEach, describe, it } from 'node:test';

import * as assert from 'node:assert/strict';
// noinspection DuplicatedCode

import { DbUtil, RequestUtil } from '@momentum/test-utils';

import { MMap, PrismaClient, User, Notification } from '@momentum/db';
import {
  setupE2ETestEnvironment,
  teardownE2ETestEnvironment
} from './support/environment';
import { MapStatus, NotificationType } from '@momentum/constants';
import { NotificationDto } from 'apps/backend/src/app/dto';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { RawServerDefault } from 'fastify';

describe('Notifications', () => {
  let app: NestFastifyApplication<RawServerDefault>,
    prisma: PrismaClient,
    req: RequestUtil,
    db: DbUtil;

  let user: User,
    userToken: string,
    map: MMap,
    user2: User,
    notifications: Notification[];

  before(async () => {
    const env = await setupE2ETestEnvironment();
    app = env.app;
    prisma = env.prisma;
    req = env.req;
    db = env.db;
  });

  after(async () => {
    await teardownE2ETestEnvironment(app, prisma);
  });

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
    notifications = await prisma.notification.createManyAndReturn({
      data: [
        {
          notifiedUserID: user.id,
          type: NotificationType.ANNOUNCEMENT,
          json: { message: 'Game will explode in 10 minutes' }
        },
        {
          notifiedUserID: user.id,
          type: NotificationType.ANNOUNCEMENT,
          json: { message: 'nvm game is fine' }
        },
        {
          notifiedUserID: user.id,
          type: NotificationType.ANNOUNCEMENT,
          json: { message: 'web dev needed urgently' }
        },
        {
          notifiedUserID: user.id,
          type: NotificationType.MAP_TESTING_INVITE,
          mapID: map.id,
          userID: user2.id
        },
        {
          notifiedUserID: user2.id, // Different user!
          type: NotificationType.ANNOUNCEMENT,
          json: { message: 'this is just for u <3' }
        }
      ]
    });
  });

  afterEach(async () => {
    await db.cleanup('notification', 'mMap', 'user');
  });

  // The GET endpoint uses PagedNotificationResponse which is an extension
  // of PagedResponse. Since this is only for a single endpoint, we just rely
  // on validatePaged rather than extending test utils.
  // But an extra check for unread count is added.
  describe('notifications/ GET', () => {
    it('should get a list of notifications', async () => {
      const res = await req.get({
        url: 'notifications',
        status: 200,
        validatePaged: { type: NotificationDto, count: 4 },
        token: userToken
      });
      assert.equal(res.body.totalUnreadCount, 4);
    });

    it('should get a list of notifications with correct totalUnreadCount', async () => {
      await prisma.notification.updateMany({
        where: { NOT: { id: notifications[0].id } },
        data: { isRead: true }
      });

      const res = await req.get({
        url: 'notifications',
        status: 200,
        validatePaged: { type: NotificationDto, count: 4 },
        token: userToken
      });
      assert.equal(res.body.totalUnreadCount, 1);
    });

    it('should respond with a paged list of notifications with the take parameter', async () => {
      await req.takeTest({
        url: 'notifications',
        validate: NotificationDto,
        token: userToken
      });
    });

    it('should respond with a paged list of notifications with the skip parameter', async () => {
      await req.skipTest({
        url: 'notifications',
        validate: NotificationDto,
        token: userToken
      });
    });

    it('should 401 when no access token is provided', async () => {
      await req.unauthorizedTest('notifications', 'get');
    });
  });

  describe('notifications/ DELETE', () => {
    it('should delete a list of notifications', async () => {
      const notifs = await prisma.notification.findMany({
        where: {
          notifiedUserID: user.id
        }
      });

      const toDelete = [notifs[0].id, notifs[1].id];

      await req.del({
        url: 'notifications',
        status: 204,
        query: { notificationIDs: toDelete.join(',') },
        token: userToken
      });

      const newNotifs = await prisma.notification.findMany({
        where: {
          notifiedUserID: user.id
        }
      });

      assert.partialDeepStrictEqual(newNotifs, [
        {
          notifiedUserID: user.id,
          type: NotificationType.ANNOUNCEMENT,
          json: { message: 'web dev needed urgently' }
        },

        {
          notifiedUserID: user.id,
          type: NotificationType.MAP_TESTING_INVITE,
          mapID: map.id,
          userID: user2.id
        }
      ]);
    });

    it('should not delete a map testing request notification', async () => {
      const notif = await prisma.notification.findFirst({
        where: {
          notifiedUserID: user.id,
          type: NotificationType.MAP_TESTING_INVITE
        }
      });

      await req.del({
        url: 'notifications',
        status: 204,
        query: { notificationIDs: notif.id.toString() },
        token: userToken
      });

      const notifs = await prisma.notification.findMany({
        where: {
          notifiedUserID: user.id
        }
      });

      assert.partialDeepStrictEqual(notifs, [
        {
          notifiedUserID: user.id,
          type: NotificationType.ANNOUNCEMENT,
          json: { message: 'Game will explode in 10 minutes' }
        },
        {
          notifiedUserID: user.id,
          type: NotificationType.ANNOUNCEMENT,
          json: { message: 'nvm game is fine' }
        },
        {
          notifiedUserID: user.id,
          type: NotificationType.ANNOUNCEMENT,
          json: { message: 'web dev needed urgently' }
        },
        {
          notifiedUserID: user.id,
          type: NotificationType.MAP_TESTING_INVITE,
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
        url: 'notifications',
        status: 204,
        query: { notificationIDs: notif.id.toString() },
        token: userToken
      });

      const newNotifs = await prisma.notification.findMany({
        where: {
          notifiedUserID: user2.id
        }
      });

      assert.partialDeepStrictEqual(newNotifs, [
        {
          notifiedUserID: user2.id,
          type: NotificationType.ANNOUNCEMENT,
          json: { message: 'this is just for u <3' }
        }
      ]);
    });

    it('should delete all non-testing request notifications', async () => {
      await req.del({
        url: 'notifications',
        status: 204,
        query: { all: true },
        token: userToken
      });

      const notifs = await prisma.notification.findMany({
        where: {
          notifiedUserID: user.id
        }
      });

      assert.partialDeepStrictEqual(notifs, [
        {
          notifiedUserID: user.id,
          type: NotificationType.MAP_TESTING_INVITE,
          mapID: map.id,
          userID: user2.id
        }
      ]);
    });

    it('should 400 if not given the correct query', async () => {
      await req.del({
        url: 'notifications',
        status: 400,
        query: { notificationIDs: '2,119,bob,1137' },
        token: userToken
      });
      await req.del({
        url: 'notifications',
        status: 400,
        query: { notificationIDs: 'guh' },
        token: userToken
      });
      await req.del({
        url: 'notifications',
        status: 400,
        query: { notTheRightQuery: '123,456' },
        token: userToken
      });
    });

    it('should 401 when no access token is provided', async () => {
      await req.unauthorizedTest('notifications', 'del');
    });
  });

  describe('notifications/markRead PATCH', () => {
    it('should mark a list of notifications as read', async () => {
      await req.patch({
        url: 'notifications/markRead',
        status: 204,
        query: { notificationIDs: [notifications[0].id, notifications[3].id] },
        token: userToken
      });

      const readNotifications = await prisma.notification.findMany({
        where: {
          notifiedUserID: user.id,
          id: { in: [notifications[0].id, notifications[3].id] }
        }
      });
      assert.equal(readNotifications.length, 2);
      assert.equal(readNotifications[0].isRead, true);
      assert.equal(readNotifications[1].isRead, true);

      assert.equal(
        (
          await prisma.notification.findMany({
            where: {
              notifiedUserID: user.id,
              isRead: false
            }
          })
        ).length,
        2
      );
    });

    it('should mark all notifications as read when all field is true', async () => {
      await req.patch({
        url: 'notifications/markRead',
        status: 204,
        query: { all: true },
        token: userToken
      });

      const alteredNotifications = await prisma.notification.findMany({
        where: { notifiedUserID: user.id }
      });
      assert.equal(alteredNotifications.length, 4);
      for (const notification of alteredNotifications) {
        assert.equal(notification.isRead, true);
      }
    });

    it("should only mark the given user's notifications as read", async () => {
      await req.patch({
        url: 'notifications/markRead',
        status: 204,
        query: { all: true },
        token: userToken
      });

      const user2Notifications = await prisma.notification.findMany({
        where: { notifiedUserID: user2.id }
      });
      assert.equal(user2Notifications.length, 1);
      assert.equal(user2Notifications[0].isRead, false);
    });
  });
});
