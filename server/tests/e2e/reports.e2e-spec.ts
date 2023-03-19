import { post } from '../util/request-handlers.util';
import { ReportType, ReportCategory } from '@common/enums/report.enum';
import { ReportDto } from '@common/dto/report/report.dto';
import { loginNewUser } from '@tests/util/db.util';
import { unauthorizedTest } from '@tests/util/generic-e2e-tests.util';
import { cleanup } from '@tests/util/db.util';

describe('Reports', () => {
    describe('reports/', () => {
        describe('GET', () => {
            let token;

            beforeAll(async () => (token = await loginNewUser()));

            afterAll(() => cleanup('user', 'report'));

            it('should create a new report', async () => {
                const report = {
                    data: 1,
                    type: ReportType.MAP_COMMENT_REPORT,
                    category: ReportCategory.SPAM,
                    message: "I just don't like it"
                };

                const res = await post({
                    url: 'reports',
                    status: 201,
                    body: report,
                    validate: ReportDto,
                    token: token
                });

                expect(res.body).toMatchObject(report);
            });

            unauthorizedTest('reports', post);
        });
    });
});
