import { after, before, describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { ReportDto } from '../../backend/src/app/dto';
import { ReportCategory, ReportType, Role } from '@momentum/constants';
import { Report, User } from '@momentum/db';
import {
  prisma,
  req,
  db,
  registerE2ETestFile
} from './support/test-environment';

describe('Admin', () => {
  registerE2ETestFile();

  describe('admin/reports', () => {
    describe('GET', () => {
      let adminToken: string,
        u1: User,
        u1Token: string,
        _r1: Report,
        r2: Report;

      before(async () => {
        [adminToken, [u1, u1Token]] = await Promise.all([
          db.loginNewUser({ data: { roles: Role.ADMIN } }),
          db.createAndLoginUser()
        ]);

        _r1 = await prisma.report.create({
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

        r2 = await prisma.report.create({
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

      after(async () => {
        await db.cleanup('user', 'report');
      });

      it('should return a list of reports, most recent first', async () => {
        const reports = await req.get({
          url: 'admin/reports',
          status: 200,
          token: adminToken,
          validatePaged: { type: ReportDto, count: 2 }
        });
        assert.ok(Object.hasOwn(reports.body, 'data'));
        assert.equal(reports.body.data[0].data, Number(r2.data));
        assert.equal(reports.body.data[0].type, r2.type);
        assert.equal(reports.body.data[0].category, r2.category);
        assert.equal(reports.body.data[0].message, r2.message);
        assert.equal(reports.body.data[0].resolved, r2.resolved);
        assert.equal(
          reports.body.data[0].resolutionMessage,
          r2.resolutionMessage
        );
        assert.equal(reports.body.data[0].submitterID, r2.submitterID);
      });

      it('should only return resolved or non resolved based on query param resolved', async () => {
        const reportsResolved = await req.get({
          url: 'admin/reports',
          status: 200,
          query: { resolved: true },
          token: adminToken,
          validatePaged: { type: ReportDto, count: 1 }
        });

        assert.equal(reportsResolved.body.data[0].resolved, true);

        const reportsNonResolved = await req.get({
          url: 'admin/reports',
          status: 200,
          query: { resolved: false },
          token: adminToken,
          validatePaged: { type: ReportDto, count: 1 }
        });

        assert.equal(reportsNonResolved.body.data[0].resolved, false);
      });

      it('should limit the result set when using the take query param', async () => {
        await req.takeTest({
          url: 'admin/reports',
          validate: ReportDto,
          token: adminToken
        });
      });

      it('should skip some of the result set when using the skip query param', async () => {
        await req.skipTest({
          url: 'admin/reports',
          validate: ReportDto,
          token: adminToken
        });
      });

      it('should return a list of reports with the submitter include', async () => {
        await req.expandTest({
          url: 'admin/reports',
          validate: ReportDto,
          expand: 'submitter',
          paged: true,
          token: adminToken
        });
      });

      it('should return a list of reports with the resolver include', async () => {
        await req.expandTest({
          url: 'admin/reports',
          validate: ReportDto,
          expand: 'submitter',
          paged: true,
          token: adminToken
        });
      });

      it('should return 403 if a non admin access token is given', async () => {
        await req.get({
          url: 'admin/reports',
          status: 403,
          token: u1Token
        });
      });

      it('should 401 when no access token is provided', async () => {
        await req.unauthorizedTest('admin/reports', 'get');
      });
    });
  });
});
