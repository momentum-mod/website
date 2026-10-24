import { after, before, describe, it } from 'node:test';
import { NULL_ID } from '@momentum/test-utils';
import * as assert from 'node:assert/strict';
import { ChatBanDto } from '../../backend/src/app/dto';
import { ChatBanType, Role } from '@momentum/constants';
import { User } from '@momentum/db';
import {
  prisma,
  req,
  db,
  registerE2ETestFile
} from './support/e2e-environment';

describe('Admin', () => {
  registerE2ETestFile();

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
  });
});
