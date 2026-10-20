import { afterEach, beforeEach, describe, it } from 'node:test';
import { NULL_ID } from '@momentum/test-utils';
import * as assert from 'node:assert/strict';
import {
  AdminActivityType,
  ChatBanType,
  ReportCategory,
  ReportType,
  Role
} from '@momentum/constants';
import { Report, User } from '@momentum/db';
import {
  prisma,
  req,
  db,
  registerE2ETestFile
} from './support/test-environment';

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

  describe('admin/reports/{reportID}', () => {
    describe('PATCH', () => {
      let admin: User,
        adminToken: string,
        u1: User,
        u1Token: string,
        r1: Report,
        _r2: Report;

      beforeEach(async () => {
        [[admin, adminToken], [u1, u1Token]] = await Promise.all([
          db.createAndLoginUser({
            data: { roles: Role.ADMIN }
          }),
          db.createAndLoginUser()
        ]);

        r1 = await prisma.report.create({
          data: {
            data: 1,
            type: ReportType.MAP_REPORT,
            category: ReportCategory.INAPPROPRIATE_CONTENT,
            message: 'report message',
            resolved: false,
            resolutionMessage: '',
            submitterID: u1.id
          }
        });

        _r2 = await prisma.report.create({
          data: {
            data: 2,
            type: ReportType.USER_PROFILE_REPORT,
            category: ReportCategory.PLAGIARISM,
            message: 'report2 message',
            resolved: true,
            resolutionMessage: '2',
            submitterID: u1.id
          }
        });
      });

      afterEach(async () => {
        await db.cleanup('user', 'report', 'adminActivity');
      });

      it('should edit a report', async () => {
        await req.patch({
          url: `admin/reports/${r1.id}`,
          status: 204,
          body: { resolved: true, resolutionMessage: 'resolved' },
          token: adminToken
        });

        const changedReport = await prisma.report.findFirst({
          where: { id: r1.id }
        });

        assert.equal(changedReport.resolved, true);
        assert.equal(changedReport.resolutionMessage, 'resolved');
        assert.equal(changedReport.resolverID, admin.id);
        await expectAdminActivityWasCreated(
          admin.id,
          AdminActivityType.REPORT_RESOLVE
        );
      });

      it('should return 404 if targeting a nonexistent report', async () => {
        await req.patch({
          url: `admin/reports/${NULL_ID}`,
          status: 404,
          body: { resolved: true, resolutionMessage: 'resolved' },
          token: adminToken
        });
      });

      it('should return 403 if a non admin access token is given', async () => {
        await req.patch({
          url: `admin/reports/${r1.id}`,
          status: 403,
          token: u1Token
        });
      });

      it('should return 401 if no access token is given', async () => {
        await req.patch({ url: `admin/reports/${r1.id}`, status: 401 });
      });
    });

    // Chat/voice bans are only created as a side effect of resolving a player
    // report, so most creation behaviour is tested through this endpoint.
    describe('PATCH - issuing chat/voice bans', () => {
      let admin: User,
        adminToken: string,
        submitter: User,
        target: User,
        playerReport,
        mapReport;

      beforeEach(async () => {
        [[admin, adminToken], submitter, target] = await Promise.all([
          db.createAndLoginUser({ data: { roles: Role.ADMIN } }),
          db.createUser(),
          db.createUser()
        ]);

        playerReport = await prisma.report.create({
          data: {
            data: target.id,
            type: ReportType.PLAYER_REPORT,
            category: ReportCategory.INAPPROPRIATE_CONTENT,
            message: 'was mean in chat',
            resolved: false,
            submitterID: submitter.id
          }
        });

        mapReport = await prisma.report.create({
          data: {
            data: 1,
            type: ReportType.MAP_REPORT,
            category: ReportCategory.SPAM,
            message: 'bad map',
            resolved: false,
            submitterID: submitter.id
          }
        });
      });

      afterEach(async () => {
        await db.cleanup('chatBan', 'report', 'user', 'adminActivity');
      });

      it('should create chat and voice bans when resolving a player report', async () => {
        const expiresAt = inAnHour();
        await req.patch({
          url: `admin/reports/${playerReport.id}`,
          status: 204,
          body: {
            resolved: true,
            resolutionMessage: 'banned',
            chatBans: [
              {
                type: ChatBanType.CHAT,
                expiresAt: expiresAt.toISOString(),
                reason: 'spamming chat'
              },
              { type: ChatBanType.VOICE, reason: 'mic spam' }
            ]
          },
          token: adminToken
        });

        const bans = await prisma.chatBan.findMany({
          where: { targetID: target.id },
          orderBy: { type: 'asc' }
        });

        assert.equal(bans.length, 2);

        const chatBan = bans.find((b) => b.type === ChatBanType.CHAT);
        assert.partialDeepStrictEqual(chatBan, {
          reason: 'spamming chat',
          issuerID: admin.id,
          reportID: playerReport.id
        });
        assert.ok(
          Math.abs(chatBan.expiresAt.getTime() - expiresAt.getTime()) <
            0.5 * 10 ** -(-3)
        );

        const voiceBan = bans.find((b) => b.type === ChatBanType.VOICE);
        // No expiresAt given => permanent
        assert.equal(voiceBan.expiresAt, null);
        assert.equal(voiceBan.reason, 'mic spam');
      });

      it('should allow a moderator to create bans when resolving a player report', async () => {
        const [moderator, moderatorToken] = await db.createAndLoginUser({
          data: { roles: Role.MODERATOR }
        });

        await req.patch({
          url: `admin/reports/${playerReport.id}`,
          status: 204,
          body: {
            resolved: true,
            resolutionMessage: 'banned',
            chatBans: [{ type: ChatBanType.CHAT }]
          },
          token: moderatorToken
        });

        const bans = await prisma.chatBan.findMany({
          where: { targetID: target.id }
        });
        assert.equal(bans.length, 1);
        assert.equal(bans[0].issuerID, moderator.id);
      });

      it('should log a CHAT_BAN_CREATE admin activity for each ban', async () => {
        await req.patch({
          url: `admin/reports/${playerReport.id}`,
          status: 204,
          body: {
            resolved: true,
            resolutionMessage: 'banned',
            chatBans: [{ type: ChatBanType.CHAT }]
          },
          token: adminToken
        });

        await expectAdminActivityWasCreated(
          admin.id,
          AdminActivityType.CHAT_BAN_CREATE
        );
      });

      it('should resolve a player report without any bans', async () => {
        await req.patch({
          url: `admin/reports/${playerReport.id}`,
          status: 204,
          body: { resolved: true, resolutionMessage: 'no action needed' },
          token: adminToken
        });

        const bans = await prisma.chatBan.findMany({
          where: { targetID: target.id }
        });
        assert.equal(bans.length, 0);
      });

      it('should 400 if bans are provided for a non-player report', async () => {
        await req.patch({
          url: `admin/reports/${mapReport.id}`,
          status: 400,
          body: {
            resolved: true,
            resolutionMessage: 'banned',
            chatBans: [{ type: ChatBanType.CHAT }]
          },
          token: adminToken
        });
      });

      it('should 400 if bans are provided without resolving the report', async () => {
        await req.patch({
          url: `admin/reports/${playerReport.id}`,
          status: 400,
          body: {
            resolved: false,
            chatBans: [{ type: ChatBanType.CHAT }]
          },
          token: adminToken
        });
      });
    });
  });
});
