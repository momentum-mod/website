// noinspection DuplicatedCode

import { get } from '../util/request-handlers.util';
import { ActivityTypes } from '@common/enums/activity.enum';
import { PrismaService } from '@modules/repo/prisma.service';
import { ActivityDto } from '@common/dto/user/activity.dto';
import { skipTest, takeTest, unauthorizedTest } from '@tests/util/generic-e2e-tests.util';
import { createAndLoginUser, NULL_ID } from '../util/db.util';

describe('Activities', () => {
    let prisma: PrismaService;
    beforeAll(() => (prisma = global.prisma));

    describe('activities', () => {
        describe('GET', () => {
            let u1, u1Token, u2, u2Token;
            let activity1, activity2, activity3;
            beforeAll(async () => {
                [[u1, u1Token], [u2, u2Token]] = await Promise.all([
                    createAndLoginUser({
                        data: { roles: { create: { verified: true, mapper: true } } },
                        include: { roles: true }
                    }),
                    createAndLoginUser({ data: { roles: { create: { mapper: true } } }, include: { roles: true } })
                ]);

                [activity1, activity2, activity3] = [
                    { userID: u1.id, data: 122, type: ActivityTypes.MAP_APPROVED },
                    { userID: u1.id, data: 123, type: ActivityTypes.WR_ACHIEVED },
                    { userID: u2.id, data: 124, type: ActivityTypes.REVIEW_MADE }
                ];

                await prisma.activity.createMany({ data: [activity1, activity2, activity3] });
            });

            afterAll(() => Promise.all([prisma.user.deleteMany(), prisma.activity.deleteMany()]));

            it('should respond with an array of activities', async () => {
                const res = await get({
                    url: 'activities',
                    status: 200,
                    token: u1Token,
                    validatePaged: { type: ActivityDto, totalCount: 3, returnCount: 3 }
                });

                expect(res.body.response.find((data) => data.userID === u1.id && data.data === 122).type).toBe(
                    ActivityTypes.MAP_APPROVED
                );
                expect(res.body.response.find((data) => data.userID === u1.id && data.data === 123).type).toBe(
                    ActivityTypes.WR_ACHIEVED
                );
                expect(res.body.response.find((data) => data.userID === u2.id).type).toBe(ActivityTypes.REVIEW_MADE);
            });

            it('should respond with array of activities with userID parameter', async () => {
                const res = await get({
                    url: 'activities',
                    status: 200,
                    query: { userID: u1.id },
                    token: u1Token,
                    validatePaged: { type: ActivityDto, totalCount: 2, returnCount: 2 }
                });

                expect(res);
                expect(res.body.response.every((data) => data.userID == u1.id)).toBe(true);
            });

            it('should respond with array of activities with data parameter', async () => {
                const res = await get({
                    url: 'activities',
                    status: 200,
                    query: { data: activity3.data },
                    token: u1Token,
                    validatePaged: { type: ActivityDto, totalCount: 1, returnCount: 1 }
                });

                expect(res);
                expect(res.body.response.every((data) => data.data == '124')).toBe(true);
            });

            it('should respond with array of activities with type paramater', async () => {
                const res = await get({
                    url: 'activities',
                    status: 200,
                    query: { type: ActivityTypes.MAP_APPROVED },
                    token: u1Token,
                    validatePaged: { type: ActivityDto, totalCount: 1, returnCount: 1 }
                });

                expect(res);
                expect(res.body.response.filter((d) => d.userID === u1.id || d.userID === u2.id).length).toBe(1);
            });

            it('should respond with array of all activities with type ALL paramater', async () => {
                const res = await get({
                    url: 'activities',
                    status: 200,
                    query: { type: ActivityTypes.ALL },
                    token: u1Token,
                    validatePaged: { type: ActivityDto, totalCount: 3, returnCount: 3 }
                });

                expect(res);
                expect(res.body.response.filter((d) => d.userID === u1.id || d.userID === u2.id).length).toBe(3);
            });

            it('should respond with array of activities with take parameter', () =>
                takeTest({ url: 'activities', validate: ActivityDto, token: u1Token }));

            it('should respond with array of users with skip parameter', async () =>
                skipTest({ url: 'activities', validate: ActivityDto, token: u1Token }));

            it('should respond with an empty array for a nonexistent user', async () => {
                const res = await get({
                    url: 'activities',
                    status: 200,
                    query: { userID: NULL_ID },
                    token: u1Token,
                    validatePaged: { type: ActivityDto, totalCount: 0, returnCount: 0 }
                });

                expect(res);
                expect(res.body.response).toBeInstanceOf(Array);
            });

            it('should 400 when a bad type is passed', () =>
                get({ url: 'activities', status: 400, query: { type: 'POTATO' }, token: u1Token }));

            unauthorizedTest('activities', get);
        });
    });
});
