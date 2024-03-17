// noinspection DuplicatedCode

import { ReportDto } from '../../backend/src/app/dto';

import { DbUtil, RequestUtil } from '@momentum/test-utils';
import { ReportCategory, ReportType } from '@momentum/constants';
import { PrismaClient } from '@prisma/client';
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

  afterAll(() => teardownE2ETestEnvironment(app));

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
    });
  });
});
