import { PrismaService } from '@modules/repo/prisma.service';
import { post } from '../util/request-handlers.util';
import { ReportType, ReportCategory } from '@common/enums/report.enum';
import { ReportDto } from '@common/dto/report/report.dto';
import { createAndLoginUser } from '@tests/util/db.util';
import { unauthorizedTest } from '@tests/util/generic-e2e-tests.util';

const prisma: PrismaService = global.prisma;

describe('Reports', () => {
    afterAll(async () => {
        if ((await prisma.map.findFirst()) || (await prisma.user.findFirst()) || (await prisma.run.findFirst())) {
            1;
        }
    });

    describe('reports/', () => {
        describe('POST', () => {
            let user, token, report;

            beforeEach(async () => {
                [user, token] = await createAndLoginUser();
                report = {
                    data: 1,
                    type: ReportType.MAP_COMMENT_REPORT,
                    category: ReportCategory.SPAM,
                    message: "I just don't like it"
                };
            });

            afterEach(() => Promise.all([prisma.user.deleteMany(), prisma.report.deleteMany()]));

            it('should create a new report', async () => {
                const res = await post({
                    url: 'reports',
                    status: 201,
                    body: report,
                    validate: ReportDto,
                    token: token
                });

                expect(res.body).toMatchObject(report);
            });

            it('should 409 if the user has 5 or more pending reports in the last 24 hours', async () => {
                const spamReport = {
                    submitterID: user.id,
                    data: 1,
                    type: ReportType.MAP_COMMENT_REPORT,
                    category: ReportCategory.SPAM,
                    message: 'this map is imposile'
                };
                await prisma.report.createMany({ data: [spamReport, spamReport, spamReport, spamReport, spamReport] });

                await post({ url: 'reports', status: 409, body: report, token: token });
            });

            it('should create a new report if the pending reports are older than 24 hours', async () => {
                const oldReport = {
                    submitterID: user.id,
                    data: 1,
                    type: ReportType.MAP_COMMENT_REPORT,
                    category: ReportCategory.SPAM,
                    message: 'i dont like it - i will reevaluate in 25 hours',
                    createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000) // 25 hours ago
                };
                await prisma.report.createMany({ data: [oldReport, oldReport, oldReport, oldReport, oldReport] });

                await post({ url: 'reports', status: 201, body: report, validate: ReportDto, token: token });
            });

            it('should create a new report if recent reports are resolved', async () => {
                const reslvReport = {
                    submitterID: user.id,
                    data: 1,
                    type: ReportType.MAP_COMMENT_REPORT,
                    category: ReportCategory.SPAM,
                    message: 'why are my textures purble',
                    resolved: true
                };
                await prisma.report.createMany({
                    data: [reslvReport, reslvReport, reslvReport, reslvReport, reslvReport]
                });

                await post({ url: 'reports', status: 201, body: report, validate: ReportDto, token: token });
            });

            unauthorizedTest('reports', post);
        });
    });
});
