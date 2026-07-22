// noinspection DuplicatedCode

import { ChatBanDto, UserDto } from '../../backend/src/app/dto';

import { DbUtil, NULL_ID, RequestUtil } from '@momentum/test-utils';
import {
  AdminActivityType,
  ChatBanType,
  ReportCategory,
  ReportType,
  Role
} from '@momentum/constants';
import { PrismaClient, User } from '@momentum/db';
import {
  setupE2ETestEnvironment,
  teardownE2ETestEnvironment
} from './support/environment';

describe('Chat Bans', () => {
  let app, prisma: PrismaClient, req: RequestUtil, db: DbUtil;

  const inAnHour = () => new Date(Date.now() + 60 * 60 * 1000);
  const anHourAgo = () => new Date(Date.now() - 60 * 60 * 1000);

  async function expectAdminActivityWasCreated(
    userID: number,
    type: AdminActivityType
  ) {
    const activities = await prisma.adminActivity.findMany({
      where: { userID }
    });
    expect(activities.some((activity) => activity.type === type)).toBeTruthy();
  }

  beforeAll(async () => {
    const env = await setupE2ETestEnvironment();
    app = env.app;
    prisma = env.prisma;
    req = env.req;
    db = env.db;
  });

  afterAll(() => teardownE2ETestEnvironment(app, prisma));

  // Chat/voice bans are only created as a side effect of resolving a player
  // report, so most creation behaviour is tested through this endpoint.
  describe('admin/reports/{reportID} - issuing chat/voice bans', () => {
    describe('PATCH', () => {
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

      afterEach(() => db.cleanup('chatBan', 'report', 'user', 'adminActivity'));

      it('should create chat and voice bans when resolving a player report', async () => {
        const expiresAt = inAnHour();
        await req.patch({
          url: `admin/reports/${playerReport.id}`,
          status: 204,
          body: {
            resolved: true,
            resolutionMessage: 'banned',
            bans: [
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

        expect(bans).toHaveLength(2);

        const chatBan = bans.find((b) => b.type === ChatBanType.CHAT);
        expect(chatBan).toMatchObject({
          reason: 'spamming chat',
          issuerID: admin.id,
          reportID: playerReport.id
        });
        expect(chatBan.expiresAt.getTime()).toBeCloseTo(
          expiresAt.getTime(),
          -3
        );

        const voiceBan = bans.find((b) => b.type === ChatBanType.VOICE);
        // No expiresAt given => permanent
        expect(voiceBan.expiresAt).toBeNull();
        expect(voiceBan.reason).toBe('mic spam');
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
            bans: [{ type: ChatBanType.CHAT }]
          },
          token: moderatorToken
        });

        const bans = await prisma.chatBan.findMany({
          where: { targetID: target.id }
        });
        expect(bans).toHaveLength(1);
        expect(bans[0].issuerID).toBe(moderator.id);
      });

      it('should log a CHAT_BAN_CREATE admin activity for each ban', async () => {
        await req.patch({
          url: `admin/reports/${playerReport.id}`,
          status: 204,
          body: {
            resolved: true,
            resolutionMessage: 'banned',
            bans: [{ type: ChatBanType.CHAT }]
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
        expect(bans).toHaveLength(0);
      });

      it('should 400 if bans are provided for a non-player report', () =>
        req.patch({
          url: `admin/reports/${mapReport.id}`,
          status: 400,
          body: {
            resolved: true,
            resolutionMessage: 'banned',
            bans: [{ type: ChatBanType.CHAT }]
          },
          token: adminToken
        }));

      it('should 400 if bans are provided without resolving the report', () =>
        req.patch({
          url: `admin/reports/${playerReport.id}`,
          status: 400,
          body: {
            resolved: false,
            bans: [{ type: ChatBanType.CHAT }]
          },
          token: adminToken
        }));
    });
  });

  describe('user - active chat bans in GET /user', () => {
    let user: User, token: string;

    beforeAll(async () => {
      [user, token] = await db.createAndLoginUser();

      await prisma.chatBan.createMany({
        data: [
          {
            type: ChatBanType.CHAT,
            reason: 'active permanent',
            expiresAt: null,
            targetID: user.id
          },
          {
            type: ChatBanType.VOICE,
            reason: 'active timed',
            expiresAt: inAnHour(),
            targetID: user.id
          },
          {
            type: ChatBanType.CHAT,
            reason: 'expired',
            expiresAt: anHourAgo(),
            targetID: user.id
          }
        ]
      });
    });

    afterAll(() => db.cleanup('chatBan', 'user'));

    it("should embed the local user's active chat bans", async () => {
      const res = await req.get({
        url: 'user',
        status: 200,
        validate: UserDto,
        token
      });

      expect(res.body.chatBans).toBeDefined();
      // Two active bans, the expired one excluded
      expect(res.body.chatBans).toHaveLength(2);
      expect(res.body.chatBans.map((b) => b.type).sort()).toEqual(
        [ChatBanType.CHAT, ChatBanType.VOICE].sort()
      );
      expect(res.body.chatBans.some((b) => b.reason === 'expired')).toBe(false);
    });

    it('should not expose chat bans of another user via GET /users/{id}', async () => {
      const res = await req.get({
        url: `users/${user.id}`,
        status: 200,
        validate: UserDto,
        token
      });

      expect(res.body.chatBans).toBeUndefined();
    });
  });

  describe('admin/chat-bans', () => {
    describe('GET', () => {
      let _admin: User,
        adminToken: string,
        issuer: User,
        target: User,
        u1Token: string,
        moderatorToken: string;

      beforeAll(async () => {
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

      afterAll(() => db.cleanup('chatBan', 'user'));

      it('should return only active bans by default', async () => {
        const res = await req.get({
          url: 'admin/chat-bans',
          status: 200,
          token: adminToken,
          validatePaged: { type: ChatBanDto, count: 1 }
        });

        expect(res.body.data[0].reason).toBe('active');
      });

      it('should include expired bans when includeExpired is true', () =>
        req.get({
          url: 'admin/chat-bans',
          status: 200,
          query: { includeExpired: true },
          token: adminToken,
          validatePaged: { type: ChatBanDto, count: 2 }
        }));

      it('should filter by targetID', () =>
        req.get({
          url: 'admin/chat-bans',
          status: 200,
          query: { targetID: target.id, includeExpired: true },
          token: adminToken,
          validatePaged: { type: ChatBanDto, count: 2 }
        }));

      it('should return no bans for a targetID with none', () =>
        req.get({
          url: 'admin/chat-bans',
          status: 200,
          query: { targetID: NULL_ID, includeExpired: true },
          token: adminToken,
          validatePaged: { type: ChatBanDto, count: 0 }
        }));

      it('should limit the result set when using the take query param', () =>
        req.takeTest({
          url: 'admin/chat-bans',
          query: { includeExpired: true },
          validate: ChatBanDto,
          token: adminToken
        }));

      it('should skip some of the result set when using the skip query param', () =>
        req.skipTest({
          url: 'admin/chat-bans',
          query: { includeExpired: true },
          validate: ChatBanDto,
          token: adminToken
        }));

      it('should return bans with the issuer include', () =>
        req.expandTest({
          url: 'admin/chat-bans',
          validate: ChatBanDto,
          expand: 'issuer',
          query: { includeExpired: true },
          paged: true,
          token: adminToken
        }));

      it('should return bans with the target include', () =>
        req.expandTest({
          url: 'admin/chat-bans',
          validate: ChatBanDto,
          expand: 'target',
          query: { includeExpired: true },
          paged: true,
          token: adminToken
        }));

      it('should return 403 if a non admin access token is given', () =>
        req.get({
          url: 'admin/chat-bans',
          status: 403,
          token: u1Token
        }));

      it('should return chat bans for a moderator access token', () =>
        req.get({
          url: 'admin/chat-bans',
          status: 200,
          token: moderatorToken,
          validatePaged: { type: ChatBanDto, count: 1 }
        }));

      it('should 401 when no access token is provided', () =>
        req.unauthorizedTest('admin/chat-bans', 'get'));
    });
  });

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

    afterEach(() => db.cleanup('chatBan', 'user', 'adminActivity'));

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
        expect(updated.expiresAt.getTime()).toBeCloseTo(
          newExpiry.getTime(),
          -3
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
        expect(updated.expiresAt).toBeNull();
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
        expect(updated.reason).toBe('updated reason');
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
        expect(updated.reason).toBe('updated by moderator');
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

      it('should 404 if the ban does not exist', () =>
        req.patch({
          url: `admin/chat-bans/${NULL_ID}`,
          status: 404,
          body: { reason: 'updated reason' },
          token: adminToken
        }));

      it('should 403 if a non admin access token is given', () =>
        req.patch({
          url: `admin/chat-bans/${ban.id}`,
          status: 403,
          body: { reason: 'nope' },
          token: u1Token
        }));

      it('should 401 if no access token is given', () =>
        req.patch({ url: `admin/chat-bans/${ban.id}`, status: 401 }));
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
        expect(deleted).toBeNull();
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
        expect(deleted).toBeNull();
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

      it('should 404 if the ban does not exist', () =>
        req.del({
          url: `admin/chat-bans/${NULL_ID}`,
          status: 404,
          token: adminToken
        }));

      it('should 403 if a non admin access token is given', () =>
        req.del({
          url: `admin/chat-bans/${ban.id}`,
          status: 403,
          token: u1Token
        }));

      it('should 401 if no access token is given', () =>
        req.del({ url: `admin/chat-bans/${ban.id}`, status: 401 }));
    });
  });
});
