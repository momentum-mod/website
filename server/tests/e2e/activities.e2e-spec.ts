// noinspection DuplicatedCode

import * as request from 'supertest';
import { get } from '../util/request-handlers.util';
import { ActivityTypes } from '@common/enums/activity.enum';
import { PrismaService } from '@modules/repo/prisma.service';
import { AuthService } from '@modules/auth/auth.service';
import { ActivityDto } from '@common/dto/user/activity.dto';
import { skipTest, takeTest } from '@tests/util/generic-e2e-tests.util';

describe('Activities', () => {
    let user1, user1Token, user2, activity3;

    beforeAll(async () => {
        const prisma: PrismaService = global.prisma;

        user1 = await prisma.user.create({
            data: {
                steamID: '65465432199',
                alias: 'User 1',
                roles: { create: { verified: true, mapper: true } }
            }
        });

        user2 = await prisma.user.create({
            data: {
                steamID: '754673452399',
                alias: 'User 3',
                roles: { create: { mapper: true } }
            }
        });

        await prisma.activity.create({
            data: {
                userID: user1.id,
                data: 122,
                type: ActivityTypes.MAP_APPROVED
            }
        });

        await prisma.activity.create({
            data: {
                userID: user1.id,
                data: 123,
                type: ActivityTypes.WR_ACHIEVED
            }
        });

        activity3 = await prisma.activity.create({
            data: {
                userID: user2.id,
                data: 124,
                type: ActivityTypes.REVIEW_MADE
            }
        });

        const authService = global.auth as AuthService;
        user1Token = (await authService.loginWeb(user1)).accessToken;
    });

    describe('GET /api/activities', () => {
        const expects = (res: request.Response) => expect(res.body).toBeValidPagedDto(ActivityDto);
        it('should respond with an array of activities', async () => {
            const res = await get({
                url: 'activities',
                status: 200,
                token: user1Token
            });

            expects(res);
            expect(res.body.totalCount).toBeGreaterThanOrEqual(3);
            expect(res.body.response.find((data) => data.userID === user1.id && data.data === 122).type).toBe(
                ActivityTypes.MAP_APPROVED
            );
            expect(res.body.response.find((data) => data.userID === user1.id && data.data === 123).type).toBe(
                ActivityTypes.WR_ACHIEVED
            );
            expect(res.body.response.find((data) => data.userID === user2.id).type).toBe(ActivityTypes.REVIEW_MADE);
        });

        it('should respond with array of activities with userID parameter', async () => {
            const res = await get({
                url: 'activities',
                status: 200,
                query: { userID: user1.id },
                token: user1Token
            });

            expect(res);
            expect(res.body.totalCount).toBeGreaterThanOrEqual(2);
            expect(res.body.response.every((data) => data.userID == user1.id)).toBe(true);
        });

        it('should respond with array of activities with data parameter', async () => {
            const res = await get({
                url: 'activities',
                status: 200,
                query: { data: activity3.data },
                token: user1Token
            });

            expect(res);
            expect(res.body.totalCount).toBeGreaterThanOrEqual(1);
            expect(res.body.response.every((data) => data.data == '124')).toBe(true);
        });

        it('should respond with array of activities with type paramater', async () => {
            const res = await get({
                url: 'activities',
                status: 200,
                query: { type: ActivityTypes.MAP_APPROVED },
                token: user1Token
            });

            expect(res);
            expect(res.body.totalCount).toBeGreaterThanOrEqual(1);
            expect(
                res.body.response.filter((data) => data.userID === user1.id || data.userID === user2.id).length
            ).toBe(1);
        });

        it('should respond with array of all activities with type ALL paramater', async () => {
            const res = await get({
                url: 'activities',
                status: 200,
                query: { type: ActivityTypes.ALL },
                token: user1Token
            });

            expect(res);
            expect(res.body.totalCount).toBeGreaterThanOrEqual(3);
            expect(
                res.body.response.filter((data) => data.userID === user1.id || data.userID === user2.id).length
            ).toBe(3);
        });

        it('should respond with array of activities with take parameter', () =>
            takeTest({
                url: 'activities',
                test: expects,
                token: user1Token
            }));

        it('should respond with array of users with skip parameter', async () =>
            skipTest({
                url: 'activities',
                test: expects,
                token: user1Token
            }));

        it('should respond with an empty array for a nonexistent user', async () => {
            const res = await get({
                url: 'activities',
                status: 200,
                query: { userID: 9999999999 },
                token: user1Token
            });

            expect(res);
            expect(res.body.totalCount).toBe(0);
            expect(res.body.response).toBeInstanceOf(Array);
        });

        it('should respond with 400 when a bad type is passed', () =>
            get({
                url: 'activities',
                status: 400,
                query: { type: 'POTATO' },
                token: user1Token
            }));

        it('should respond with 401 when no access token is provided', () =>
            get({
                url: 'activities',
                status: 401
            }));
    });
});
