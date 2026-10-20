import { after, afterEach, before, describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { NotificationType, Role } from '@momentum/constants';
import {
  prisma,
  req,
  db,
  registerE2ETestFile
} from './support/test-environment';

describe('Admin', () => {
  registerE2ETestFile();

  describe('admin/announcement', () => {
    describe('POST', () => {
      let adminToken: string, modToken: string, u1Token: string;
      before(async () => {
        [adminToken, modToken, u1Token] = await Promise.all([
          db.loginNewUser({ data: { roles: Role.ADMIN } }),
          db.loginNewUser({ data: { roles: Role.MODERATOR } }),
          db.loginNewUser()
        ]);
      });

      afterEach(async () => {
        await db.cleanup('notification');
      });
      after(async () => {
        await db.cleanup('user');
      });

      it('should post an announcement to all users', async () => {
        const horseTime = "It's Horse Time!";
        await req.post({
          url: 'admin/announcement',
          status: 201,
          body: { message: horseTime },
          token: adminToken
        });

        const [userCount, notificationsCount] = await Promise.all([
          prisma.user.count(),
          prisma.notification.count({
            where: {
              type: NotificationType.ANNOUNCEMENT,
              json: {
                path: ['message'],
                equals: horseTime
              }
            }
          })
        ]);
        assert.equal(notificationsCount, userCount);
      });

      it('should 403 for moderators', async () => {
        await req.post({
          url: 'admin/announcement',
          status: 403,
          body: { message: "It's Horse Time!" },
          token: modToken
        });
      });

      it('should 403 for regular users', async () => {
        await req.post({
          url: 'admin/announcement',
          status: 403,
          body: { message: "It's Horse Time!" },
          token: u1Token
        });
      });
    });
  });
});
