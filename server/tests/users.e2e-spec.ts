// noinspection DuplicatedCode

import * as request from 'supertest';
import { TestUtil } from './util';
import { EActivityTypes } from '../src/@common/enums/activity.enum';
import { PrismaRepo } from '../src/modules/prisma/prisma.repo';
import { User } from '@prisma/client';
import { EMapCreditType, EMapStatus, EMapType } from '../src/@common/enums/map.enum';

describe('Users', () => {
    let user1, user2, map1, map2, run1, run2;

    beforeAll(async () => {
        const prisma: PrismaRepo = global.prisma;

        user1 = global.testUser as User;

        user2 = await prisma.user.create({
            data: {
                aliasLocked: false,
                country: '',
                steamID: '123456',
                alias: 'Ginny Weasley',
                avatar: '9y7ashdf87yas98d7ftby',
                roles: 0,
                bans: 0,
                profile: {
                    create: {
                        bio: 'Ginevra Molly "Ginny" Potter (née Weasley) (b. 11 August, 1981), occasionally known as Gin by Harry Potter, was an English pure-blood witch, the youngest daughter of Arthur and Molly Weasley (née Prewett), and the youngest sister of Bill, Charlie, Percy, the late Fred, George and Ron. She was the first female to be born into the Weasley line for several generations. She and her older brothers grew up in The Burrow on the outskirts of Ottery St Catchpole in Devon.'
                    }
                }
            }
        });

        await prisma.activity.createMany({
            data: [
                {
                    data: 100n,
                    type: EActivityTypes.ALL,
                    userID: user1.id
                },
                {
                    data: 101n,
                    type: EActivityTypes.ALL,
                    userID: user1.id
                },
                {
                    data: 101n,
                    type: EActivityTypes.MAP_UPLOADED,
                    userID: user1.id
                }
            ]
        });

        await prisma.follow.create({
            data: {
                followeeID: user1.id,
                followedID: user2.id
            }
        });

        map1 = await prisma.map.create({
            data: {
                name: 'test_map_one',
                type: EMapType.SURF,
                statusFlag: EMapStatus.APPROVED,
                submitter: { connect: { id: user1.id } },
                credits: {
                    create: {
                        type: EMapCreditType.AUTHOR,
                        user: { connect: { id: user1.id } }
                    }
                }
            }
        });

        map2 = await prisma.map.create({
            data: {
                name: 'test_map_two',
                type: EMapType.SURF,
                statusFlag: EMapStatus.NEEDS_REVISION,
                submitter: { connect: { id: user1.id } },
                credits: {
                    create: {
                        type: EMapCreditType.AUTHOR,
                        user: { connect: { id: user1.id } }
                    }
                }
            }
        });

        run1 = await prisma.run.create({
            data: {
                map: { connect: { id: map1.id } },
                player: { connect: { id: user1.id } },
                trackNum: 1,
                zoneNum: 1,
                ticks: 10000,
                tickRate: 100,
                flags: 0,
                file: '',
                hash: ''
            }
        });

        run2 = await prisma.run.create({
            data: {
                map: { connect: { id: map2.id } },
                player: { connect: { id: user1.id } },
                trackNum: 1,
                zoneNum: 1,
                ticks: 10000,
                tickRate: 100,
                flags: 0,
                file: '',
                hash: ''
            }
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
        const expects = (res: request.Response) => {
            expect(res.body.response).toBeInstanceOf(Array);
            res.body.response.forEach((user) => {
                expect(user).toHaveProperty('alias');
                expect(user).toHaveProperty('createdAt');
            });
        };

        it('should respond with array of users', async () => {
            const res = await TestUtil.req('users', 200);

            expects(res);
            expect(res.body.totalCount).toBeGreaterThanOrEqual(2);
            expect(res.body.returnCount).toBeGreaterThanOrEqual(2);
            expect(res.body.response[0].alias).toBe(user1.alias);
        });

        it('should respond with array of users with take parameter', async () => {
            await TestUtil.takeTest('users', expects);
        });

        it('should respond with array of users with skip parameter', async () => {
            await TestUtil.skipTest('users', expects);
        });

        it('should respond with array of users with search by alias parameter', async () => {
            const res = await TestUtil.req('users', 200, { search: user2.alias });

            expects(res);
            expect(res.body.totalCount).toBe(1);
            expect(res.body.returnCount).toBe(1);
            expect(res.body.response[0].alias).toBe(user2.alias);
        });

        it('should respond with an empty array of users using a search by parameter containing a nonexistent alias', async () => {
            const res = await TestUtil.req('users', 200, { search: 'Abstract Barry' });

            expect(res.body.totalCount).toBe(0);
            expect(res.body.returnCount).toBe(0);
            expect(res.body.response).toBeInstanceOf(Array);
        });

        it('should respond with array of users with expanded profiles when using an expand parameter', async () => {
            const res = await TestUtil.req('users', 200, { expand: 'profile' });

            expects(res);
            expect(res.body.response[0].profile).toHaveProperty('bio');
        });

        it('should respond with should respond with an array of one user for a matching SteamID parameter', async () => {
            const res = await TestUtil.req('users', 200, { playerID: user1.steamID });

            expects(res);
            expect(res.body.totalCount).toBe(1);
            expect(res.body.returnCount).toBe(1);
        });

        it('should respond with should respond with an empty array for a nonexistent SteamID parameter', async () => {
            const res = await TestUtil.req('users', 200, { playerID: 3141592612921 });

            expect(res.body.totalCount).toBe(0);
            expect(res.body.returnCount).toBe(0);
            expect(res.body.response).toBeInstanceOf(Array);
        });

        it('should respond with should respond with an array of multiple users for multiple matching SteamID parameters', async () => {
            const res = await TestUtil.req('users', 200, { playerIDs: [user1.steamID + ',' + user2.steamID] });

            expects(res);
            expect(res.body.totalCount).toBe(2);
            expect(res.body.returnCount).toBe(2);
            expect(res.body.response[0].steamID).not.toBe(res.body.response[1].steamID);
        });

        it('should respond with should respond with an empty array for multiple nonexistent SteamID parameters', async () => {
            const res = await TestUtil.req('users', 200, { playerIDs: [21412341234 + ',' + 765474124] });

            expect(res.body.totalCount).toBe(0);
            expect(res.body.returnCount).toBe(0);
            expect(res.body.response).toBeInstanceOf(Array);
        });

        it('should respond with 401 when no access token is provided', () => {
            TestUtil.req('users', 401, {}, null);
        });
    });

    describe('GET /api/v1/users/{userID}', () => {
        const expects = (res) => {
            expect(res.body).toHaveProperty('alias');
            expect(res.body).toHaveProperty('createdAt');
        };

        it('should respond with the specified user', async () => {
            const res = await TestUtil.req(`users/${user1.id}`, 200);

            expects(res);
            expect(res.body.alias).toBe(user1.alias);
        });

        it('should respond with the specified user with a valid avatarURL', async () => {
            const res = await TestUtil.req(`users/${user2.id}`, 200);

            expects(res);
            expect(res.body).toHaveProperty('avatarURL');
            expect(res.body.avatarURL.includes('https://avatars.cloudflare.steamstatic.com/')).toBe(true);
        });

        it('should respond with the specified user with the expand parameter', async () => {
            const res = await TestUtil.req(`users/${user1.id}`, 200, { expand: 'profile' });

            expects(res);
            expect(res.body.profile).toHaveProperty('bio');
            expect(res.body.profile.bio).toBe(user1.profile.bio);
        });

        it('should respond with 401 when no access token is provided', async () => {
            await TestUtil.req(`users/${user1.id}`, 200);
        });

        it('should respond with 404 if the user is not found', async () => {
            await TestUtil.req('users/213445312', 404);
        });
    });

    describe('GET /api/v1/users/{userID}/profile', () => {
        const expects = (res) => {
            expect(res.body).toHaveProperty('bio');
            expect(res.body).toHaveProperty('createdAt');
        };

        it('should respond with the specified users profile info', async () => {
            const res = await TestUtil.req(`users/${user1.id}/profile`, 200);
            expects(res);
        });

        it('should respond with 401 when no access token is provided', async () => {
            await TestUtil.req(`users/${user1.id}/profile`, 401, {}, null);
        });

        it('should respond with 404 if the profile is not found', async () => {
            await TestUtil.req(`users/9000000000009/profile`, 404);
        });
    });

    describe('GET /api/v1/users/{userID}/activities', () => {
        const expects = (res) => {
            expect(res.body.response).toBeInstanceOf(Array);
            res.body.response.forEach((r) => {
                expect(r).toHaveProperty('data');
                expect(r.user).toHaveProperty('alias');
            });
        };

        it('should respond with a list of activities related to the specified user', async () => {
            const res = await TestUtil.req(`users/${user1.id}/activities`, 200);

            expects(res);
            expect(res.body.totalCount).toBe(3);
            expect(res.body.returnCount).toBe(3);
        });

        it('should respond with a limited list of activities for the user when using the take query param', async () => {
            await TestUtil.takeTest(`users/${user1.id}/activities`, expects);
        });

        it('should respond with a different list of activities for the user when using the skip query param', async () => {
            await TestUtil.skipTest(`users/${user1.id}/activities`, expects);
        });

        it('should respond with a filtered list of activities for the user when using the type query param', async () => {
            const res = await TestUtil.req(`users/${user1.id}/activities`, 200, {
                type: EActivityTypes.MAP_UPLOADED
            });

            expects(res);
            expect(res.body.totalCount).toBe(1);
            expect(res.body.returnCount).toBe(1);
            expect(res.body.response[0].type).toBe(EActivityTypes.MAP_UPLOADED);
        });

        it('should respond with a filtered list of activities for the user when using the data query param', async () => {
            const res = await TestUtil.req(`users/${user1.id}/activities`, 200, {
                data: 101n
            });

            expects(res);
            expect(res.body.totalCount).toBe(2);
            expect(res.body.returnCount).toBe(2);
        });

        it('should respond with an empty list of activities for the user when using the data query param with nonexistent data', async () => {
            const res = await TestUtil.req(`users/${user1.id}/activities`, 200, {
                data: 1123412341n
            });
            expect(res.body.totalCount).toBe(0);
            expect(res.body.returnCount).toBe(0);
            expect(res.body.response).toBeInstanceOf(Array);
        });

        it('should respond with 401 when no access token is provided', async () => {
            await TestUtil.req(`users/${user1.id}/activities`, 401, {}, null);
        });
    });

    describe('GET /api/v1/users/{userID}/follows', () => {
        it('should respond with a list of users the specified user follows', async () => {
            const res = await TestUtil.req(`users/${user1.id}/follows`, 200);

            expect(res.body.totalCount).toBe(1);
            expect(res.body.returnCount).toBe(1);
            expect(res.body.response).toBeInstanceOf(Array);
            expect(res.body.response[0]).toHaveProperty('notifyOn');
            expect(res.body.response[0].followee.alias).toBe(user1.alias);
            expect(res.body.response[0].followee.profile).toHaveProperty('bio');
            expect(res.body.response[0].followed.alias).toBe(user2.alias);
            expect(res.body.response[0].followed.profile).toHaveProperty('bio');
        });

        it('should respond with 401 when no access token is provided', async () => {
            await TestUtil.req(`users/${user1.id}/follows`, 401, {}, null);
        });
    });

    describe('GET /api/v1/users/{userID}/followers', () => {
        it('should respond with a list of users that follow the specified user', async () => {
            const res = await TestUtil.req(`users/${user2.id}/followers`, 200);

            expect(res.body.totalCount).toBe(1);
            expect(res.body.returnCount).toBe(1);
            expect(res.body.response).toBeInstanceOf(Array);
            expect(res.body.response[0]).toHaveProperty('notifyOn');
            expect(res.body.response[0].followee.alias).toBe(user1.alias);
            expect(res.body.response[0].followee.profile).toHaveProperty('bio');
            expect(res.body.response[0].followed.alias).toBe(user2.alias);
            expect(res.body.response[0].followed.profile).toHaveProperty('bio');
        });

        it('should respond with 401 when no access token is provided', async () => {
            await TestUtil.req(`users/${user1.id}/followers`, 401, {}, null);
        });
    });

    describe('GET /api/v1/users/{userID}/credits', () => {
        const expects = (res) => {
            expect(res.body.response).toBeInstanceOf(Array);
            res.body.response.forEach((c) => {
                expect(c).toHaveProperty('type');
                expect(c).toHaveProperty('createdAt');
                expect(c.user).toHaveProperty('alias');
                expect(c.user.profile).toHaveProperty('bio');
            });
        };
        it('should respond with a list of map credits for a specific user', async () => {
            const res = await TestUtil.req(`users/${user1.id}/credits`, 200);

            expect(res.body.totalCount).toBe(2);
            expect(res.body.returnCount).toBe(2);
            expects(res);
        });

        it('should respond with 401 when no access token is provided', async () => {
            await TestUtil.req(`users/${user1.id}/followers`, 401, {}, null);
        });
    });

    describe('GET /api/v1/users/{userID}/runs', () => {
        it('should respond with a list of runs for a specific user', async () => {
            const res = await TestUtil.req(`users/${user1.id}/runs`, 200);

            expect(res.body.totalCount).toBe(2);
            expect(res.body.returnCount).toBe(2);

            // TODO: more. more!!
        });

        it('should respond with 401 when no access token is provided', async () => {
            await TestUtil.req(`users/${user1.id}/runs`, 401, {}, null);
        });
    });
});
