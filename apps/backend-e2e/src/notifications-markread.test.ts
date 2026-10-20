import { afterEach, beforeEach, describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { MMap, User, Notification } from '@momentum/db';
import { MapStatus, NotificationType } from '@momentum/constants';
import {
  prisma,
  req,
  db,
  registerE2ETestFile
} from './support/e2e-environment';

describe('Notifications', () => {
  registerE2ETestFile();

  let user: User,
    userToken: string,
    map: MMap,
    user2: User,
    notifications: Notification[];

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
