import { after, afterEach, before, beforeEach, describe, it } from 'node:test';
import { matchesPartial, NULL_ID } from '@momentum/test-utils';
import * as assert from 'node:assert/strict';
import { ChatBanDto } from '../../backend/src/app/dto';
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
  const anHourAgo = () => new Date(Date.now() - 60 * 60 * 1000);

  describe('admin/chat-bans', () => {
    describe('GET', () => {
      let _admin: User,
        adminToken: string,
        issuer: User,
        target: User,
        u1Token: string,
        moderatorToken: string;

      before(async () => {
        [[_admin, adminToken], issuer, [target, u1Token], [, moderatorToken]] =
          await Promise.all([
            db.createAndLoginUser({ data: { roles: Role.ADMIN } }),
            db.createUser({ data: { roles: Role.MODERATOR } }),
            db.createAndLoginUser(),
            db.createAndLoginUser({ data: { roles: Role.MODERATOR } })
          ]);

        await prisma.chatBan.createMany({
          data: [
            {
              type: ChatBanType.CHAT,
              reason: 'active',
              expiresAt: inAnHour(),
              targetID: target.id,
              issuerID: issuer.id
            },
            {
              type: ChatBanType.VOICE,
              reason: 'expired',
              expiresAt: anHourAgo(),
              targetID: target.id,
              issuerID: issuer.id
            }
          ]
        });
      });

      after(async () => {
        await db.cleanup('chatBan', 'user');
      });

      it('should return only active bans by default', async () => {
        const res = await req.get({
          url: 'admin/chat-bans',
          status: 200,
          token: adminToken,
          validatePaged: { type: ChatBanDto, count: 1 }
        });

        assert.equal(res.body.data[0].reason, 'active');
      });

      it('should include expired bans when includeExpired is true', async () => {
        await req.get({
          url: 'admin/chat-bans',
          status: 200,
          query: { includeExpired: true },
          token: adminToken,
          validatePaged: { type: ChatBanDto, count: 2 }
        });
      });

      it('should filter by targetID', async () => {
        await req.get({
          url: 'admin/chat-bans',
          status: 200,
          query: { targetID: target.id, includeExpired: true },
          token: adminToken,
          validatePaged: { type: ChatBanDto, count: 2 }
        });
      });

      it('should return no bans for a targetID with none', async () => {
        await req.get({
          url: 'admin/chat-bans',
          status: 200,
          query: { targetID: NULL_ID, includeExpired: true },
          token: adminToken,
          validatePaged: { type: ChatBanDto, count: 0 }
        });
      });

      it('should limit the result set when using the take query param', async () => {
        await req.takeTest({
          url: 'admin/chat-bans',
          query: { includeExpired: true },
          validate: ChatBanDto,
          token: adminToken
        });
      });

      it('should skip some of the result set when using the skip query param', async () => {
        await req.skipTest({
          url: 'admin/chat-bans',
          query: { includeExpired: true },
          validate: ChatBanDto,
          token: adminToken
        });
      });

      it('should return bans with the issuer include', async () => {
        await req.expandTest({
          url: 'admin/chat-bans',
          validate: ChatBanDto,
          expand: 'issuer',
          query: { includeExpired: true },
          paged: true,
          token: adminToken
        });
      });

      it('should return bans with the target include', async () => {
        await req.expandTest({
          url: 'admin/chat-bans',
          validate: ChatBanDto,
          expand: 'target',
          query: { includeExpired: true },
          paged: true,
          token: adminToken
        });
      });

      it('should return 403 if a non admin access token is given', async () => {
        await req.get({
          url: 'admin/chat-bans',
          status: 403,
          token: u1Token
        });
      });

      it('should return chat bans for a moderator access token', async () => {
        await req.get({
          url: 'admin/chat-bans',
          status: 200,
          token: moderatorToken,
          validatePaged: { type: ChatBanDto, count: 1 }
        });
      });

      it('should 401 when no access token is provided', async () => {
        await req.unauthorizedTest('admin/chat-bans', 'get');
      });
    });

    describe('POST', () => {
      let admin: User,
        adminToken: string,
        target: User,
        u1Token: string,
        moderatorToken: string;

      beforeEach(async () => {
        [[admin, adminToken], [target, u1Token], [, moderatorToken]] =
          await Promise.all([
            db.createAndLoginUser({ data: { roles: Role.ADMIN } }),
            db.createAndLoginUser(),
            db.createAndLoginUser({ data: { roles: Role.MODERATOR } })
          ]);
      });

      afterEach(async () => {
        await db.cleanup('chatBan', 'user', 'adminActivity');
      });

      it('should issue a ban without a report', async () => {
        const expiresAt = inAnHour();
        const res = await req.post({
          url: 'admin/chat-bans',
          status: 201,
          body: {
            targetID: target.id,
            type: ChatBanType.VOICE,
            expiresAt: expiresAt.toISOString(),
            reason: 'mic spam'
          },
          validate: ChatBanDto,
          token: adminToken
        });

        assert.ok(
          matchesPartial(res.body, {
            type: ChatBanType.VOICE,
            reason: 'mic spam',
            targetID: target.id,
            issuerID: admin.id,
            reportID: null
          })
        );

        const ban = await prisma.chatBan.findUnique({
          where: { id: res.body.id }
        });
        assert.ok(
          Math.abs(ban.expiresAt.getTime() - expiresAt.getTime()) <
            0.5 * 10 ** -(-3)
        );
      });

      it('should issue a permanent ban when expiresAt is omitted', async () => {
        const res = await req.post({
          url: 'admin/chat-bans',
          status: 201,
          body: { targetID: target.id, type: ChatBanType.CHAT },
          validate: ChatBanDto,
          token: adminToken
        });

        assert.equal(res.body.expiresAt, null);
      });

      it('should allow a moderator to issue a ban', async () => {
        await req.post({
          url: 'admin/chat-bans',
          status: 201,
          body: { targetID: target.id, type: ChatBanType.CHAT },
          token: moderatorToken
        });
      });

      it('should log a CHAT_BAN_CREATE admin activity', async () => {
        await req.post({
          url: 'admin/chat-bans',
          status: 201,
          body: { targetID: target.id, type: ChatBanType.CHAT },
          token: adminToken
        });

        await expectAdminActivityWasCreated(
          admin.id,
          AdminActivityType.CHAT_BAN_CREATE
        );
      });

      it('should 404 if the target user does not exist', async () => {
        await req.post({
          url: 'admin/chat-bans',
          status: 404,
          body: { targetID: NULL_ID, type: ChatBanType.CHAT },
          token: adminToken
        });
      });

      it('should 400 for an invalid ban type', async () => {
        await req.post({
          url: 'admin/chat-bans',
          status: 400,
          body: { targetID: target.id, type: 99 },
          token: adminToken
        });
      });

      it('should 400 if the target is missing', async () => {
        await req.post({
          url: 'admin/chat-bans',
          status: 400,
          body: { type: ChatBanType.CHAT },
          token: adminToken
        });
      });

      it('should return 403 if a non admin access token is given', async () => {
        await req.post({
          url: 'admin/chat-bans',
          status: 403,
          body: { targetID: target.id, type: ChatBanType.CHAT },
          token: u1Token
        });
      });

      it('should 401 when no access token is provided', async () => {
        await req.unauthorizedTest('admin/chat-bans', 'post');
      });
    });
  });
});
