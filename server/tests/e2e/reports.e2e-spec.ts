import { post } from '../util/request-handlers.util';
import { ReportType, ReportCategory } from '@common/enums/report.enum';
import { ReportDto } from '@common/dto/report/report.dto';
import { createAndLoginUser } from '@tests/util/db.util';
import { unauthorizedTest } from '@tests/util/generic-e2e-tests.util';
import { cleanup } from '@tests/util/db.util';
import { PrismaService } from '@modules/repo/prisma.service';

const prisma: PrismaService = global.prisma;

describe('Reports', () => {
    describe('reports/', () => {
        describe('POST', () => {
            const report = {
                data: 1,
                type: ReportType.MAP_COMMENT_REPORT,
                category: ReportCategory.SPAM,
                message: "I just don't like it"
            };

            let user, token;

            beforeAll(async () => ([user, token] = await createAndLoginUser()));

            afterAll(() => cleanup('user'));
            afterEach(() => cleanup('report'));

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
                await prisma.report.createMany({
                    data: Array.from({ length: 5 }, () => ({
                        submitterID: user.id,
                        data: 1,
                        type: ReportType.MAP_COMMENT_REPORT,
                        category: ReportCategory.SPAM,
                        message: 'this map is imposile'
                    }))
                });

                await post({ url: 'reports', status: 409, body: report, token: token });
            });

            it('should create a new report if the pending reports are older than 24 hours', async () => {
                await prisma.report.createMany({
                    data: Array.from({ length: 5 }, () => ({
                        submitterID: user.id,
                        data: 1,
                        type: ReportType.MAP_COMMENT_REPORT,
                        category: ReportCategory.SPAM,
                        message: 'i dont like it - i will reevaluate in 25 hours',
                        createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000) // 25 hours ago
                    }))
                });

                await post({ url: 'reports', status: 201, body: report, validate: ReportDto, token: token });
            });

            it('should create a new report if recent reports are resolved', async () => {
                await prisma.report.createMany({
                    data: Array.from({ length: 5 }, () => ({
                        submitterID: user.id,
                        data: 1,
                        type: ReportType.MAP_COMMENT_REPORT,
                        category: ReportCategory.SPAM,
                        message: 'why are my textures purble',
                        resolved: true
                    }))
                });

                await post({ url: 'reports', status: 201, body: report, validate: ReportDto, token: token });
            });

            unauthorizedTest('reports', post);
        });
    });
});
