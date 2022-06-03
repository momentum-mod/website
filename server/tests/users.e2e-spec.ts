// noinspection DuplicatedCode

import * as request from 'supertest';
import { EActivityTypes } from '../src/@common/enums/activity.enum';
import { UsersTestObjects } from './objects/users';
import { PrismaRepo } from '../src/modules/prisma/prisma.repo';
import { Prisma, User } from '@prisma/client';
import { EMapCreditType } from '../src/@common/enums/map.enum';

describe('Users', () => {
    let user1, user2, map1, map2;

    beforeAll(async () => {
        const prisma: PrismaRepo = global.prisma;

        user1 = global.testUser as User;

        user2 = await prisma.user.create({
            data: UsersTestObjects.user2
        });

        await prisma.activity.createMany({
            data: UsersTestObjects.activities.map((testActivity) => {
                return { ...testActivity, userID: user1.id };
            })
        });

        await prisma.follow.create({
            data: {
                followeeID: user1.id,
                followedID: user2.id
            }
        });

        [UsersTestObjects.map1, UsersTestObjects.map2].forEach((map) => {
            map.submitter = { connect: { id: user1.id } };
            map.credits = {
                create: {
                    type: EMapCreditType.AUTHOR,
                    user: { connect: { id: user1.id } }
                }
            };
        });

        map1 = await prisma.map.create({
            data: UsersTestObjects.map1
        });

        map2 = await prisma.map.create({
            data: UsersTestObjects.map2
        });
    });

    afterAll(async () => {
        const prisma: PrismaRepo = global.prisma;

        await prisma.user.delete({
            where: {
                id: user2.id
            }
        });
        await prisma.map.deleteMany({ where: { id: { in: [map1.id, map2.id] } } });
    });

    describe(`GET /api/v1/users`, () => {
        it('should respond with array of users', async () => {
            const res = await request(global.server)
                .get('/api/v1/users')
                .set('Authorization', 'Bearer ' + global.accessToken)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(res.body.totalCount).toBeGreaterThanOrEqual(2);
            expect(res.body.returnCount).toBeGreaterThanOrEqual(2);
            expect(res.body.response).toBeInstanceOf(Array);
            expect(res.body.response[0]).toHaveProperty('alias');
            expect(res.body.response[0].alias).toBe(user1.alias);
        });

        it('should respond with array of users with take parameter', async () => {
            const res = await request(global.server)
                .get('/api/v1/users')
                .set('Authorization', 'Bearer ' + global.accessToken)
                .query({
                    take: 1
                })
                .expect('Content-Type', /json/)
                .expect(200);

            expect(res.body.totalCount).toBeGreaterThanOrEqual(2);
            expect(res.body.returnCount).toBe(1);
            expect(res.body.response).toBeInstanceOf(Array);
            expect(res.body.response[0]).toHaveProperty('alias');
            expect(res.body.response[0].alias).toBe(user1.alias);
        });

        it('should respond with array of users with skip parameter', async () => {
            const res = await request(global.server)
                .get('/api/v1/users')
                .set('Authorization', 'Bearer ' + global.accessToken)
                .query({ skip: 0, take: 1 })
                .expect('Content-Type', /json/)
                .expect(200);

            const res2 = await request(global.server)
                .get('/api/v1/users')
                .set('Authorization', 'Bearer ' + global.accessToken)
                .query({ skip: 1, take: 1 })
                .expect('Content-Type', /json/)
                .expect(200);

            expect(res.body.totalCount).toBeGreaterThanOrEqual(2);
            expect(res.body.returnCount).toBe(1);
            expect(res.body.response).toBeInstanceOf(Array);
            expect(res.body.response[0]).toHaveProperty('alias');

            expect(res2.body.totalCount).toBeGreaterThanOrEqual(1);
            expect(res2.body.returnCount).toBe(1);
            expect(res2.body.response).toBeInstanceOf(Array);
            expect(res2.body.response[0]).toHaveProperty('alias');

            expect(res.body.response[0].id).not.toBe(res2.body.response[0].id);
        });

        it('should respond with array of users with search by alias parameter', async () => {
            const res = await request(global.server)
                .get('/api/v1/users')
                .set('Authorization', 'Bearer ' + global.accessToken)
                .query({
                    search: user2.alias
                })
                .expect('Content-Type', /json/)
                .expect(200);

            expect(res.body.totalCount).toBe(1);
            expect(res.body.returnCount).toBe(1);
            expect(res.body.response).toBeInstanceOf(Array);
            expect(res.body.response[0]).toHaveProperty('alias');
            expect(res.body.response[0].alias).toBe(user2.alias);
        });

        it('should respond with an empty array of users using a search by parameter containing a nonexistent alias', async () => {
            const res = await request(global.server)
                .get('/api/v1/users')
                .set('Authorization', 'Bearer ' + global.accessToken)
                .query({
                    search: 'Abstract Barry'
                })
                .expect('Content-Type', /json/)
                .expect(200);

            expect(res.body.totalCount).toBe(0);
            expect(res.body.returnCount).toBe(0);
            expect(res.body.response).toBeInstanceOf(Array);
        });

        it('should respond with array of users with expanded profiles when using an expand parameter', async () => {
            const res = await request(global.server)
                .get('/api/v1/users')
                .set('Authorization', 'Bearer ' + global.accessToken)
                .query({
                    expand: 'profile'
                })
                .expect('Content-Type', /json/)
                .expect(200);

            expect(res.body.totalCount).toBeGreaterThanOrEqual(2);
            expect(res.body.returnCount).toBeGreaterThanOrEqual(2);
            expect(res.body.response).toBeInstanceOf(Array);
            expect(res.body.response[0]).toHaveProperty('alias');
            expect(res.body.response[0].profile).toHaveProperty('bio');
        });

        it('should respond with should respond with an array of one user for a matching SteamID parameter', async () => {
            const res = await request(global.server)
                .get('/api/v1/users')
                .set('Authorization', 'Bearer ' + global.accessToken)
                .query({
                    playerID: user1.steamID
                })
                .expect('Content-Type', /json/)
                .expect(200);
            expect(res.body.totalCount).toBe(1);
            expect(res.body.returnCount).toBe(1);
            expect(res.body.response).toBeInstanceOf(Array);
            expect(res.body.response[0]).toHaveProperty('alias');
            expect(res.body.response[0].steamID).toBe(user1.steamID);
        });

        it('should respond with should respond with an empty array for a nonexistent SteamID parameter', async () => {
            const res = await request(global.server)
                .get('/api/v1/users')
                .set('Authorization', 'Bearer ' + global.accessToken)
                .query({
                    playerID: 3141592612921
                })
                .expect('Content-Type', /json/)
                .expect(200);
            expect(res.body.totalCount).toBe(0);
            expect(res.body.returnCount).toBe(0);
            expect(res.body.response).toBeInstanceOf(Array);
            expect(res.body.response.length).toBe(0);
        });

        it('should respond with should respond with an array of multiple users for multiple matching SteamID parameters', async () => {
            const res = await request(global.server)
                .get('/api/v1/users')
                .set('Authorization', 'Bearer ' + global.accessToken)
                .query({
                    playerIDs: [user1.steamID + ',' + user2.steamID]
                })
                .expect('Content-Type', /json/)
                .expect(200);
            expect(res.body.totalCount).toBe(2);
            expect(res.body.returnCount).toBe(2);
            expect(res.body.response).toBeInstanceOf(Array);
            expect(res.body.response[0]).toHaveProperty('alias');
            expect(res.body.response[0]).toHaveProperty('steamID');
            expect(res.body.response[0].steamID).toBe(user1.steamID);
            expect(res.body.response[1]).toHaveProperty('steamID');
            expect(res.body.response[1].steamID).toBe(user2.steamID);
            expect(res.body.response[0].steamID).not.toBe(res.body.response[1].steamID);
        });

        it('should respond with should respond with an empty array for multiple nonexistent SteamID parameters', async () => {
            const res = await request(global.server)
                .get('/api/v1/users')
                .set('Authorization', 'Bearer ' + global.accessToken)
                .query({
                    playerIDs: [21412341234 + ',' + 765474124]
                })
                .expect('Content-Type', /json/)
                .expect(200);
            expect(res.body.totalCount).toBe(0);
            expect(res.body.returnCount).toBe(0);
            expect(res.body.response).toBeInstanceOf(Array);
        });

        it('should respond with 401 when no access token is provided', async () => {
            return request(global.server).get('/api/v1/users').expect(401);
        });
    });

    describe('GET /api/v1/users/{userID}', () => {
        it('should respond with the specified user', async () => {
            const res = await request(global.server)
                .get('/api/v1/users/' + user1.id)
                .set('Authorization', 'Bearer ' + global.accessToken)
                .expect('Content-Type', /json/)
                .expect(200);
            expect(res.body).toHaveProperty('alias');
            expect(res.body.alias).toBe(user1.alias);
        });

        it('should respond with the specified user with the expand parameter', async () => {
            const res = await request(global.server)
                .get('/api/v1/users/' + user1.id)
                .set('Authorization', 'Bearer ' + global.accessToken)
                .query({
                    expand: 'profile'
                })
                .expect('Content-Type', /json/)
                .expect(200);
            expect(res.body).toHaveProperty('alias');
            expect(res.body.profile).toHaveProperty('bio');
            expect(res.body.profile.bio).toBe(user1.profile.bio);
        });

        it('should respond with 401 when no access token is provided', async () => {
            return request(global.server)
                .get('/api/v1/users/' + user1.id)
                .expect(401);
        });

        it('should respond with 404 if the user is not found', () =>
            request(global.server)
                .get('/api/v1/users/314159265359')
                .set('Authorization', 'Bearer ' + global.accessToken)
                .expect('Content-Type', /json/)
                .expect(404));
    });

    describe('GET /api/v1/users/{userID}/profile', () => {
        it('should respond with the specified users profile info', async () => {
            const res = await request(global.server)
                .get('/api/v1/users/' + user1.id + '/profile')
                .set('Authorization', 'Bearer ' + global.accessToken)
                .expect(200)
                .expect('Content-Type', /json/);
            expect(res.body).toHaveProperty('bio');
        });

        it('should respond with 401 when no access token is provided', () =>
            request(global.server)
                .get('/api/v1/users/' + user1.id + '/profile')
                .expect(401)
                .expect('Content-Type', /json/));

        it('should respond with 404 if the profile is not found', () =>
            request(global.server)
                .get('/api/v1/users/90000000000000009/profile')
                .set('Authorization', 'Bearer ' + global.accessToken)
                .expect(404));
    });

    describe('GET /api/v1/users/{userID}/activities', () => {
        it('should respond with a list of activities related to the specified user', async () => {
            const res = await request(global.server)
                .get('/api/v1/users/' + user1.id + '/activities')
                .set('Authorization', 'Bearer ' + global.accessToken)
                .expect(200)
                .expect('Content-Type', /json/);
            expect(res.body.totalCount).toBe(3);
            expect(res.body.returnCount).toBe(3);
            expect(res.body.response).toBeInstanceOf(Array);
            expect(res.body.response[0]).toHaveProperty('data');
            expect(res.body.response[0].user).toHaveProperty('alias');
        });

        it('should respond with a limited list of activities for the user when using the take query param', async () => {
            const res = await request(global.server)
                .get('/api/v1/users/' + user1.id + '/activities')
                .set('Authorization', 'Bearer ' + global.accessToken)
                .query({ take: 1 })
                .expect(200)
                .expect('Content-Type', /json/);
            expect(res.body.totalCount).toBe(3);
            expect(res.body.returnCount).toBe(1);
            expect(res.body.response).toBeInstanceOf(Array);
            expect(res.body.response[0]).toHaveProperty('data');
            expect(res.body.response[0].user).toHaveProperty('alias');
        });

        it('should respond with a different list of activities for the user when using the skip query param', async () => {
            const res = await request(global.server)
                .get('/api/v1/users/' + user1.id + '/activities')
                .set('Authorization', 'Bearer ' + global.accessToken)
                .query({ skip: 0, take: 1 })
                .expect(200)
                .expect('Content-Type', /json/);
            const res2 = await request(global.server)
                .get('/api/v1/users/' + user1.id + '/activities')
                .set('Authorization', 'Bearer ' + global.accessToken)
                .query({ skip: 1, take: 1 })
                .expect(200)
                .expect('Content-Type', /json/);
            expect(res.body.totalCount).toBe(3);
            expect(res.body.returnCount).toBe(1);
            expect(res.body.response).toBeInstanceOf(Array);
            expect(res.body.response[0]).toHaveProperty('data');
            expect(res.body.response[0].user).toHaveProperty('alias');
            expect(res2.body.totalCount).toBe(3);
            expect(res2.body.returnCount).toBe(1);
            expect(res2.body.response).toBeInstanceOf(Array);
            expect(res2.body.response[0]).toHaveProperty('data');
            expect(res.body.response[0].user).toHaveProperty('alias');
            expect(res.body.response[0].id).not.toBe(res2.body.response[0].id);
        });

        it('should respond with a filtered list of activities for the user when using the type query param', async () => {
            const res = await request(global.server)
                .get('/api/v1/users/' + user1.id + '/activities')
                .set('Authorization', 'Bearer ' + global.accessToken)
                .query({
                    type: EActivityTypes.MAP_UPLOADED
                })
                .expect(200)
                .expect('Content-Type', /json/);
            expect(res.body.totalCount).toBe(1);
            expect(res.body.returnCount).toBe(1);
            expect(res.body.response).toBeInstanceOf(Array);
            expect(res.body.response[0]).toHaveProperty('data');
            expect(res.body.response[0].user).toHaveProperty('alias');
            expect(res.body.response[0].type).toBe(EActivityTypes.MAP_UPLOADED);
        });

        it('should respond with a filtered list of activities for the user when using the data query param', async () => {
            const res = await request(global.server)
                .get('/api/v1/users/' + user1.id + '/activities')
                .set('Authorization', 'Bearer ' + global.accessToken)
                .query({ data: 101n })
                .expect(200)
                .expect('Content-Type', /json/);
            expect(res.body.totalCount).toBe(2);
            expect(res.body.returnCount).toBe(2);
            expect(res.body.response).toBeInstanceOf(Array);
            expect(res.body.response[0]).toHaveProperty('data');
            expect(res.body.response[0].user).toHaveProperty('alias');
        });

        it('should respond with an empty list of activities for the user when using the data query param with nonexistent data', async () => {
            const res = await request(global.server)
                .get('/api/v1/users/' + user1.id + '/activities')
                .set('Authorization', 'Bearer ' + global.accessToken)
                .query({ data: 1234213n })
                .expect(200)
                .expect('Content-Type', /json/);
            expect(res.body.totalCount).toBe(0);
            expect(res.body.returnCount).toBe(0);
            expect(res.body.response).toBeInstanceOf(Array);
        });

        it('should respond with 401 when no access token is provided', () =>
            request(global.server)
                .get('/api/v1/users/' + user1.id + '/activities')
                .expect(401));
    });

    describe('GET /api/v1/users/{userID}/follows', () => {
        it('should respond with a list of users the specified user follows', async () => {
            const res = await request(global.server)
                .get('/api/v1/users/' + user1.id + '/follows')
                .set('Authorization', 'Bearer ' + global.accessToken)
                .expect(200)
                .expect('Content-Type', /json/);
            expect(res.body.totalCount).toBe(1);
            expect(res.body.returnCount).toBe(1);
            expect(res.body.response).toBeInstanceOf(Array);
            expect(res.body.response[0]).toHaveProperty('notifyOn');
            expect(res.body.response[0].followee.alias).toBe(user1.alias);
            expect(res.body.response[0].followee.profile).toHaveProperty('bio');
            expect(res.body.response[0].followed.alias).toBe(user2.alias);
            expect(res.body.response[0].followed.profile).toHaveProperty('bio');
        });

        it('should respond with 401 when no access token is provided', () =>
            request(global.server)
                .get('/api/v1/users/' + user1.id + '/follows')
                .expect(401)
                .expect('Content-Type', /json/));
    });

    describe('GET /api/v1/users/{userID}/followers', () => {
        it('should respond with a list of users that follow the specified user', async () => {
            const res = await request(global.server)
                .get('/api/v1/users/' + user2.id + '/followers')
                .set('Authorization', 'Bearer ' + global.accessToken)
                .expect(200)
                .expect('Content-Type', /json/);
            expect(res.body.totalCount).toBe(1);
            expect(res.body.returnCount).toBe(1);
            expect(res.body.response).toBeInstanceOf(Array);
            expect(res.body.response[0]).toHaveProperty('notifyOn');
            expect(res.body.response[0].followee.alias).toBe(user1.alias);
            expect(res.body.response[0].followee.profile).toHaveProperty('bio');
            expect(res.body.response[0].followed.alias).toBe(user2.alias);
            expect(res.body.response[0].followed.profile).toHaveProperty('bio');
        });

        it('should respond with 401 when no access token is provided', () =>
            request(global.server)
                .get('/api/v1/users/' + user2.id + '/followers')
                .expect(401)
                .expect('Content-Type', /json/));
    });

    describe('GET /api/v1/users/{userID}/credits', () => {
        it('should respond with a list of map credits for a specific user', async () => {
            const res = await request(global.server)
                .get('/api/v1/users/' + user1.id + '/credits')
                .set('Authorization', 'Bearer ' + global.accessToken)
                .expect(200)
                .expect('Content-Type', /json/);
            expect(res.body.totalCount).toBe(2);
            expect(res.body.returnCount).toBe(2);
            expect(res.body.response).toBeInstanceOf(Array);
            expect(res.body.response[0]).toHaveProperty('type');
            // TODO: improve these tests in future. don't wanna go touching alex's mapcreditdto while he's working on it
        });

        it('should respond with 401 when no access token is provided', () =>
            request(global.server)
                .get('/api/v1/users/' + user1.id + '/credits')
                .expect(401)
                .expect('Content-Type', /json/));
    });
});
