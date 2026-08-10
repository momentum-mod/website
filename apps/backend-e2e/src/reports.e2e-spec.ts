// noinspection DuplicatedCode

import { ReportDto } from '../../backend/src/app/dto';

import { DbUtil, RequestUtil } from '@momentum/test-utils';
import {
  MAX_REPORT_MESSAGE_LENGTH,
  ReportCategory,
  ReportType
} from '@momentum/constants';
import { PrismaClient } from '@momentum/db';
import {
  setupE2ETestEnvironment,
  teardownE2ETestEnvironment
} from './support/environment';
import { arrayFrom } from '@momentum/util-fn';

describe('Reports', () => {
  let app, prisma: PrismaClient, req: RequestUtil, db: DbUtil;

  beforeAll(async () => {
    const env = await setupE2ETestEnvironment();
    app = env.app;
    prisma = env.prisma;
    req = env.req;
    db = env.db;
  });

  afterAll(() => teardownE2ETestEnvironment(app, prisma));

  describe('reports/', () => {
    describe('POST', () => {
      const report = {
        data: 1,
        type: ReportType.MAP_COMMENT_REPORT,
        category: ReportCategory.SPAM,
        message: "I just don't like it"
      };

      let user, token;

      beforeAll(async () => ([user, token] = await db.createAndLoginUser()));

      afterAll(() => db.cleanup('user'));
      afterEach(() => db.cleanup('report'));

      it('should create a new report', async () => {
        const res = await req.post({
          url: 'reports',
          status: 201,
          body: report,
          validate: ReportDto,
          token
        });

        expect(res.body).toMatchObject(report);
      });

      it('should 409 if the user has 5 or more pending reports in the last 24 hours', async () => {
        await prisma.report.createMany({
          data: arrayFrom(5, () => ({
            submitterID: user.id,
            data: 1,
            type: ReportType.MAP_COMMENT_REPORT,
            category: ReportCategory.SPAM,
            message: 'this map is imposile'
          }))
        });

        await req.post({
          url: 'reports',
          status: 409,
          body: report,
          token
        });
      });

      it('should create a new report if the pending reports are older than 24 hours', async () => {
        await prisma.report.createMany({
          data: arrayFrom(5, () => ({
            submitterID: user.id,
            data: 1,
            type: ReportType.MAP_COMMENT_REPORT,
            category: ReportCategory.SPAM,
            message: 'i dont like it - i will reevaluate in 25 hours',
            createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000) // 25 hours ago
          }))
        });

        await req.post({
          url: 'reports',
          status: 201,
          body: report,
          validate: ReportDto,
          token
        });
      });

      it('should create a new report if recent reports are resolved', async () => {
        await prisma.report.createMany({
          data: arrayFrom(5, () => ({
            submitterID: user.id,
            data: 1,
            type: ReportType.MAP_COMMENT_REPORT,
            category: ReportCategory.SPAM,
            message: 'why are my textures purble',
            resolved: true
          }))
        });

        await req.post({
          url: 'reports',
          status: 201,
          body: report,
          validate: ReportDto,
          token
        });
      });

      it('should 401 when no access token is provided', () =>
        req.unauthorizedTest('reports', 'post'));

      it('should 400 if the message exceeds the max length', () =>
        req.post({
          url: 'reports',
          status: 400,
          body: {
            ...report,
            message: 'a'.repeat(MAX_REPORT_MESSAGE_LENGTH + 1)
          },
          token
        }));

      it('should create a new report if the message is exactly the max length', () =>
        req.post({
          url: 'reports',
          status: 201,
          body: { ...report, message: 'a'.repeat(MAX_REPORT_MESSAGE_LENGTH) },
          validate: ReportDto,
          token
        }));

      describe('player reports via targetSteamID', () => {
        // Note: don't clean up the `user` table in here — that would delete the
        // shared reporter created in the parent beforeAll. Target users are
        // cleaned up by the parent afterAll('user').
        it('should resolve targetSteamID to the reported user ID', async () => {
          const target = await db.createUser();

          const res = await req.post({
            url: 'reports',
            status: 201,
            body: {
              targetSteamID: target.steamID.toString(),
              type: ReportType.PLAYER_REPORT,
              category: ReportCategory.OTHER,
              message: 'griefing in the lobby'
            },
            validate: ReportDto,
            token
          });

          expect(res.body.data).toBe(target.id);
        });

        it('should 404 if targetSteamID matches no user', () =>
          req.post({
            url: 'reports',
            status: 404,
            body: {
              targetSteamID: '76561199999999999',
              type: ReportType.PLAYER_REPORT,
              category: ReportCategory.OTHER,
              message: 'nobody home'
            },
            token
          }));

        it('should 400 if targetSteamID is used with a non-player report', async () => {
          const target = await db.createUser();

          await req.post({
            url: 'reports',
            status: 400,
            body: {
              targetSteamID: target.steamID.toString(),
              type: ReportType.MAP_COMMENT_REPORT,
              category: ReportCategory.OTHER,
              message: 'wrong report type'
            },
            token
          });
        });

        it('should 400 if neither data nor targetSteamID is provided', () =>
          req.post({
            url: 'reports',
            status: 400,
            body: {
              type: ReportType.PLAYER_REPORT,
              category: ReportCategory.OTHER,
              message: 'no target at all'
            },
            token
          }));

        it('should 409 if the user already has an unresolved report against the same player', async () => {
          const target = await db.createUser();
          const body = {
            targetSteamID: target.steamID.toString(),
            type: ReportType.PLAYER_REPORT,
            category: ReportCategory.OTHER,
            message: 'being annoying'
          };

          await req.post({ url: 'reports', status: 201, body, token });
          await req.post({ url: 'reports', status: 409, body, token });
        });

        it('should create a new report against the same player once the existing report is resolved', async () => {
          const target = await db.createUser();
          const body = {
            targetSteamID: target.steamID.toString(),
            type: ReportType.PLAYER_REPORT,
            category: ReportCategory.OTHER,
            message: 'being annoying'
          };

          const res = await req.post({
            url: 'reports',
            status: 201,
            body,
            validate: ReportDto,
            token
          });

          await prisma.report.update({
            where: { id: res.body.id },
            data: { resolved: true }
          });

          await req.post({ url: 'reports', status: 201, body, token });
        });

        it('should 409 if the user has submitted 5 or more player reports in the last hour, even if resolved', async () => {
          const targets = await db.createUsers(5);

          for (const target of targets) {
            const res = await req.post({
              url: 'reports',
              status: 201,
              body: {
                targetSteamID: target.steamID.toString(),
                type: ReportType.PLAYER_REPORT,
                category: ReportCategory.OTHER,
                message: 'spam test'
              },
              token
            });

            // Resolve immediately so this test isolates the hourly
            // player-report limit from the separate daily unresolved-reports
            // limit, which would otherwise also trip at 5.
            await prisma.report.update({
              where: { id: res.body.id },
              data: { resolved: true }
            });
          }

          const lastTarget = await db.createUser();

          await req.post({
            url: 'reports',
            status: 409,
            body: {
              targetSteamID: lastTarget.steamID.toString(),
              type: ReportType.PLAYER_REPORT,
              category: ReportCategory.OTHER,
              message: 'spam test'
            },
            token
          });
        });

        it('should create a new player report if the hourly reports are older than 1 hour', async () => {
          const targets = await db.createUsers(5);

          await prisma.report.createMany({
            data: targets.map((target) => ({
              submitterID: user.id,
              data: target.id,
              type: ReportType.PLAYER_REPORT,
              category: ReportCategory.OTHER,
              message: 'old spam test',
              // Resolved so these don't also trip the separate daily
              // unresolved-reports limit, which isn't what this test covers.
              resolved: true,
              createdAt: new Date(Date.now() - 61 * 60 * 1000) // 61 minutes ago
            }))
          });

          const target = await db.createUser();

          await req.post({
            url: 'reports',
            status: 201,
            body: {
              targetSteamID: target.steamID.toString(),
              type: ReportType.PLAYER_REPORT,
              category: ReportCategory.OTHER,
              message: 'spam test'
            },
            validate: ReportDto,
            token
          });
        });
      });
    });
  });
});
