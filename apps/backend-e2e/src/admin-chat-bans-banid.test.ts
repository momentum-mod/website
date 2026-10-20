import { afterEach, beforeEach, describe, it } from 'node:test';
import { NULL_ID } from '@momentum/test-utils';
import * as assert from 'node:assert/strict';
import { AdminActivityType, ChatBanType, Role } from '@momentum/constants';
import { User } from '@momentum/db';
import {
  prisma,
  req,
  db,
  registerE2ETestFile
} from './support/e2e-environment';

describe('Admin', () => {
  registerE2ETestFile();

  async function expectAdminActivityWasCreated(
    userID: number,
    type: AdminActivityType
  ) {
    const activities = await prisma.adminActivity.findMany({
      where: { userID }
    });
    assert.ok(activities.some((activity) => activity.type === type));
  }

  const inAnHour = () => new Date(Date.now() + 60 * 60 * 1000);

  describe('admin/chat-bans/{banID}', () => {
    let admin: User, adminToken: string, target: User, u1Token: string, ban;

    beforeEach(async () => {
      [[admin, adminToken], [target, u1Token]] = await Promise.all([
        db.createAndLoginUser({ data: { roles: Role.ADMIN } }),
        db.createAndLoginUser()
      ]);

      ban = await prisma.chatBan.create({
        data: {
          type: ChatBanType.CHAT,
          reason: 'original reason',
          expiresAt: inAnHour(),
          targetID: target.id,
          issuerID: admin.id
        }
      });
    });

    afterEach(async () => {
      await db.cleanup('chatBan', 'user', 'adminActivity');
    });

    describe('PATCH', () => {
      it('should edit the ban expiration', async () => {
        const newExpiry = new Date(Date.now() + 48 * 60 * 60 * 1000);
        await req.patch({
          url: `admin/chat-bans/${ban.id}`,
          status: 204,
          body: { expiresAt: newExpiry.toISOString() },
          token: adminToken
        });

        const updated = await prisma.chatBan.findUnique({
          where: { id: ban.id }
        });
        assert.ok(
          Math.abs(updated.expiresAt.getTime() - newExpiry.getTime()) <
            0.5 * 10 ** -(-3)
        );
      });

      it('should make a ban permanent by setting expiresAt to null', async () => {
        await req.patch({
          url: `admin/chat-bans/${ban.id}`,
          status: 204,
          body: { expiresAt: null },
          token: adminToken
        });

        const updated = await prisma.chatBan.findUnique({
          where: { id: ban.id }
        });
        assert.equal(updated.expiresAt, null);
      });

      it('should edit the ban reason', async () => {
        await req.patch({
          url: `admin/chat-bans/${ban.id}`,
          status: 204,
          body: { reason: 'updated reason' },
          token: adminToken
        });

        const updated = await prisma.chatBan.findUnique({
          where: { id: ban.id }
        });
        assert.equal(updated.reason, 'updated reason');
      });

      it('should allow a moderator to edit the ban', async () => {
        const [, moderatorToken] = await db.createAndLoginUser({
          data: { roles: Role.MODERATOR }
        });

        await req.patch({
          url: `admin/chat-bans/${ban.id}`,
          status: 204,
          body: { reason: 'updated by moderator' },
          token: moderatorToken
        });

        const updated = await prisma.chatBan.findUnique({
          where: { id: ban.id }
        });
        assert.equal(updated.reason, 'updated by moderator');
      });

      it('should log a CHAT_BAN_UPDATE admin activity', async () => {
        await req.patch({
          url: `admin/chat-bans/${ban.id}`,
          status: 204,
          body: { reason: 'updated reason' },
          token: adminToken
        });

        await expectAdminActivityWasCreated(
          admin.id,
          AdminActivityType.CHAT_BAN_UPDATE
        );
      });

      it('should 404 if the ban does not exist', async () => {
        await req.patch({
          url: `admin/chat-bans/${NULL_ID}`,
          status: 404,
          body: { reason: 'updated reason' },
          token: adminToken
        });
      });

      it('should 403 if a non admin access token is given', async () => {
        await req.patch({
          url: `admin/chat-bans/${ban.id}`,
          status: 403,
          body: { reason: 'nope' },
          token: u1Token
        });
      });

      it('should 401 if no access token is given', async () => {
        await req.patch({ url: `admin/chat-bans/${ban.id}`, status: 401 });
      });
    });

    describe('DELETE', () => {
      it('should revoke (delete) a ban', async () => {
        await req.del({
          url: `admin/chat-bans/${ban.id}`,
          status: 204,
          token: adminToken
        });

        const deleted = await prisma.chatBan.findUnique({
          where: { id: ban.id }
        });
        assert.equal(deleted, null);
      });

      it('should allow a moderator to revoke a ban', async () => {
        const [, moderatorToken] = await db.createAndLoginUser({
          data: { roles: Role.MODERATOR }
        });

        await req.del({
          url: `admin/chat-bans/${ban.id}`,
          status: 204,
          token: moderatorToken
        });

        const deleted = await prisma.chatBan.findUnique({
          where: { id: ban.id }
        });
        assert.equal(deleted, null);
      });

      it('should log a CHAT_BAN_REVOKE admin activity', async () => {
        await req.del({
          url: `admin/chat-bans/${ban.id}`,
          status: 204,
          token: adminToken
        });

        await expectAdminActivityWasCreated(
          admin.id,
          AdminActivityType.CHAT_BAN_REVOKE
        );
      });

      it('should 404 if the ban does not exist', async () => {
        await req.del({
          url: `admin/chat-bans/${NULL_ID}`,
          status: 404,
          token: adminToken
        });
      });

      it('should 403 if a non admin access token is given', async () => {
        await req.del({
          url: `admin/chat-bans/${ban.id}`,
          status: 403,
          token: u1Token
        });
      });

      it('should 401 if no access token is given', async () => {
        await req.del({ url: `admin/chat-bans/${ban.id}`, status: 401 });
      });
    });
  });
});
