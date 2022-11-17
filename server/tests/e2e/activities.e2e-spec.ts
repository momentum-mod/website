// noinspection DuplicatedCode

import * as request from 'supertest';
import { get, skipTest, takeTest } from '../util/test-util';
import { ActivityTypes } from '@common/enums/activity.enum';
import { PrismaService } from '@modules/repo/prisma.service';
import { AuthService } from '@modules/auth/auth.service';
import { ActivityDto } from '@common/dto/user/activity.dto';

describe('activities', () => {
    let user1, user2, activity3;

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
        global.accessToken = (await authService.login(user1)).access_token;
    });

    describe('GET /api/v1/activities', () => {
        const expects = (res: request.Response) => expect(res.body).toBeValidPagedDto(ActivityDto);
        it('should respond with an array of activities', async () => {
            const res = await get('activities', 200);

            expects(res);
            expect(res.body.totalCount).toBeGreaterThanOrEqual(3);
            expect(res.body.response.find((data) => data.userID === user1.id && data.data === '122').type).toBe(
                ActivityTypes.MAP_APPROVED
            );
            expect(res.body.response.find((data) => data.userID === user1.id && data.data === '123').type).toBe(
                ActivityTypes.WR_ACHIEVED
            );
            expect(res.body.response.find((data) => data.userID === user2.id).type).toBe(ActivityTypes.REVIEW_MADE);
        });

        it('should respond with array of activities with userID parameter', async () => {
            const res = await get('activities', 200, { userID: user1.id });

            expect(res);
            expect(res.body.totalCount).toBeGreaterThanOrEqual(2);
            expect(res.body.response.every((data) => data.userID == user1.id)).toBe(true);
        });

        it('should respond with array of activities with data parameter', async () => {
            const res = await get('activities', 200, { data: activity3.data });

            expect(res);
            expect(res.body.totalCount).toBeGreaterThanOrEqual(1);
            expect(res.body.response.every((data) => data.data == '124')).toBe(true);
        });

        it('should respond with array of activities with type paramater', async () => {
            const res = await get('activities', 200, { type: ActivityTypes.MAP_APPROVED });

            expect(res);
            expect(res.body.totalCount).toBeGreaterThanOrEqual(1);
            expect(
                res.body.response.filter((data) => data.userID === user1.id || data.userID === user2.id).length
            ).toBe(1);
        });

        it('should respond with array of all activities with type ALL paramater', async () => {
            const res = await get('activities', 200, { type: ActivityTypes.ALL });

            expect(res);
            expect(res.body.totalCount).toBeGreaterThanOrEqual(3);
            expect(
                res.body.response.filter((data) => data.userID === user1.id || data.userID === user2.id).length
            ).toBe(3);
        });

        it('should respond with array of activities with take parameter', () => takeTest('activities', expects));

        it('should respond with array of users with skip parameter', async () => skipTest('activities', expects));

        it('should respond with an empty array for a nonexistent user', async () => {
            const res = await get('activities', 200, { userID: 9999999999 });

            expect(res);
            expect(res.body.totalCount).toBe(0);
            expect(res.body.response).toBeInstanceOf(Array);
        });

        it('should respond with 400 when a bad type is passed', () => get('activities', 400, { type: 'POTATO' }));

        it('should respond with 401 when no access token is provided', () => get('activities', 401, {}, null));
    });
});
