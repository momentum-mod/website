import { get } from '../util/request-handlers.util';
import { ActivityTypes } from '@common/enums/activity.enum';
import { PrismaService } from '@modules/repo/prisma.service';
import { MapCreditType } from '@common/enums/map.enum';
import { UserDto } from '@common/dto/user/user.dto';
import { ActivityDto } from '@common/dto/user/activity.dto';
import { ProfileDto } from '@common/dto/user/profile.dto';
import { FollowDto } from '@common/dto/user/follow.dto';
import { MapCreditDto } from '@common/dto/map/map-credit.dto';
import { RunDto } from '@common/dto/run/run.dto';
import { expandTest, skipTest, takeTest, unauthorizedTest } from '@tests/util/generic-e2e-tests.util';
import {
    cleanup,
    createAndLoginUser,
    createMap,
    createMaps,
    createRunAndUmrForMap,
    createUser,
    createUsers,
    NULL_ID
} from '@tests/util/db.util';
import { login } from '@tests/util/auth.util';

const prisma: PrismaService = global.prisma;

describe('Users', () => {
    describe('users/', () => {
        describe('GET', () => {
            let users, token;

            beforeAll(async () => {
                users = await createUsers(3);
                token = await login(users[0]);
            });

            afterAll(() => cleanup('user', 'map', 'run'));

            it('should respond with paged list of users', async () => {
                const res = await get({
                    url: 'users',
                    status: 200,
                    validatePaged: { type: UserDto, count: 3 },
                    token: token
                });

                // Quick check we're not sending back stuff that wasn't included.
                // Not doing these for all tests, once or twice can't hurt.
                for (const user of res.body.response) expect(user).not.toHaveProperty('profile');
            });

            it('should respond with a paged list of users with take parameter', () =>
                takeTest({ url: 'users', validate: UserDto, token: token }));

            it('should respond with a paged list of users with skip parameter', async () =>
                skipTest({ url: 'users', validate: UserDto, token: token }));

            it('should respond with a paged list of users with search by alias parameter', async () => {
                const res = await get({
                    url: 'users',
                    status: 200,
                    query: { search: users[0].alias },
                    validatePaged: { type: UserDto, count: 1 },
                    token: token
                });

                expect(res.body.response[0].id).toBe(users[0].id);
            });

            it('should respond with an empty a paged list of users using a search by parameter containing a nonexistent alias', () =>
                get({
                    url: 'users',
                    status: 200,
                    query: { search: 'Abstract Barry' },
                    validatePaged: { type: UserDto, count: 0 },
                    token: token
                }));

            it('should respond with a paged list of users with expanded profiles when using an expand parameter', () =>
                expandTest({ url: 'users', expand: 'profile', paged: true, token: token }));

            it('should respond with a paged list of users with expanded stats when using an expand parameter', () =>
                expandTest({ url: 'users', expand: 'userStats', paged: true, token: token }));

            it('should respond with an array of one user for a matching SteamID parameter', async () => {
                const res = await get({
                    url: 'users',
                    status: 200,
                    query: { steamID: users[0].steamID },
                    validatePaged: { type: UserDto, count: 1 },
                    token: token
                });

                expect(res.body.response[0].id).toBe(users[0].id);
            });

            it('should respond with an empty array for a nonexistent SteamID parameter', () =>
                get({
                    url: 'users',
                    status: 200,
                    query: { steamID: 3141592612921 },
                    validatePaged: { type: UserDto, count: 0 },
                    token: token
                }));

            it('should respond with an array of multiple users for multiple matching SteamID parameters', async () => {
                const res = await get({
                    url: 'users',
                    status: 200,
                    query: { steamIDs: users[0].steamID + ',' + users[1].steamID },
                    validatePaged: { type: UserDto, count: 2 },
                    token: token
                });

                for (const user of res.body.response)
                    expect([users[0].steamID, users[1].steamID]).toContain(user.steamID);
            });

            it('should respond with should respond with an empty array for multiple nonexistent SteamID parameters', () =>
                get({
                    url: 'users',
                    status: 200,
                    query: { steamIDs: [1111111111111111 + ',' + 2222222222222222] },
                    validatePaged: { type: UserDto, count: 0 },
                    token: token
                }));

            it('should respond with the specified user with with a corresponding map rank and run when given a mapRank mapid', async () => {
                const map = await createMap();
                const run = await createRunAndUmrForMap({ map: map, user: users[0], rank: 1, ticks: 1 });

                const res = await get({
                    url: 'users',
                    status: 200,
                    query: { mapRank: map.id, steamID: users[0].steamID },
                    token: token
                });

                expect(res.body.response[0].mapRank).toMatchObject({
                    mapID: map.id,
                    userID: users[0].id,
                    runID: Number(run.id),
                    rank: 1
                });
            });

            unauthorizedTest('users', get);
        });
    });

    describe('users/{userID}', () => {
        describe('GET', () => {
            let user, token;

            beforeAll(
                async () =>
                    ([user, token] = await createAndLoginUser({
                        data: { alias: 'Arthur Weasley', avatar: 'ac7305567f93a4c9eec4d857df993191c61fb240' }
                    }))
            );

            afterAll(() => cleanup('user', 'map', 'run'));

            it('should respond with the specified user', async () => {
                const res = await get({ url: `users/${user.id}`, status: 200, validate: UserDto, token: token });

                expect(res.body.alias).toBe('Arthur Weasley');
            });

            it('should respond with the specified user with a valid avatarURL', async () => {
                const res = await get({ url: `users/${user.id}`, status: 200, validate: UserDto, token: token });

                expect(res.body.avatarURL).toBe(
                    'https://avatars.cloudflare.steamstatic.com/ac7305567f93a4c9eec4d857df993191c61fb240_full.jpg'
                );
            });

            it('should respond with the specified user with expanded profile when using an expand parameter', () =>
                expandTest({ url: `users/${user.id}`, expand: 'profile', token: token }));

            it('should respond with the specified user with with a corresponding map rank and run when given a mapRank mapid', async () => {
                const map = await createMap();
                const run = await createRunAndUmrForMap({ map: map, user: user, rank: 1, ticks: 1 });

                const res = await get({
                    url: `users/${user.id}`,
                    status: 200,
                    query: { mapRank: map.id },
                    validate: UserDto,
                    token: token
                });

                expect(res.body.mapRank).toMatchObject({
                    mapID: map.id,
                    userID: user.id,
                    runID: Number(run.id),
                    rank: 1
                });
            });

            it('should 404 if the user is not found', () =>
                get({ url: `users/${NULL_ID}`, status: 404, token: token }));

            unauthorizedTest('users/1', get);
        });
    });

    describe('GET /api/users/{userID}/profile', () => {
        let user, token;

        beforeAll(
            async () =>
                ([user, token] = await createAndLoginUser({ data: { profile: { create: { bio: 'Sausages' } } } }))
        );

        afterAll(() => cleanup('user'));

        it('should respond with the specified users profile info', async () => {
            const res = await get({
                url: `users/${user.id}/profile`,
                status: 200,
                validate: ProfileDto,
                token: token
            });

            expect(res.body.bio).toBe('Sausages');
        });

        it('should 404 if the profile is not found', () =>
            get({ url: `users/${NULL_ID}/profile`, status: 404, token: token }));

        unauthorizedTest('users/1/profile', get);
    });

    describe('GET /api/users/{userID}/activities', () => {
        let user, token;

        beforeAll(async () => {
            [user, token] = await createAndLoginUser();
            await prisma.activity.createMany({
                data: [
                    { data: 1n, type: ActivityTypes.ALL, userID: user.id },
                    { data: 2n, type: ActivityTypes.ALL, userID: user.id },
                    { data: 2n, type: ActivityTypes.MAP_UPLOADED, userID: user.id }
                ]
            });
        });

        afterAll(() => cleanup('user'));

        it('should respond with a list of activities related to the specified user', () =>
            get({
                url: `users/${user.id}/activities`,
                status: 200,
                validatePaged: { type: ActivityDto, count: 3 },
                token: token
            }));

        it('should respond with a limited list of activities for the user when using the take query param', () =>
            takeTest({ url: `users/${user.id}/activities`, validate: ActivityDto, token: token }));

        it('should respond with a different list of activities for the user when using the skip query param', () =>
            skipTest({ url: `users/${user.id}/activities`, validate: ActivityDto, token: token }));

        it('should respond with a filtered list of activities for the user when using the type query param', async () => {
            const res = await get({
                url: `users/${user.id}/activities`,
                status: 200,
                query: { type: ActivityTypes.MAP_UPLOADED },
                validatePaged: { type: ActivityDto, count: 1 },
                token: token
            });

            expect(res.body.response[0].type).toBe(ActivityTypes.MAP_UPLOADED);
        });

        it('should respond with a filtered list of activities for the user when using the data query param', () =>
            get({
                url: `users/${user.id}/activities`,
                status: 200,
                query: { data: 2n },
                validatePaged: { type: ActivityDto, count: 2 },
                token: token
            }));

        it('should respond with an empty list of activities for the user when using the data query param with nonexistent data', () =>
            get({
                url: `users/${user.id}/activities`,
                status: 200,
                query: { data: NULL_ID },
                validatePaged: { type: ActivityDto, count: 0 },
                token: token
            }));

        unauthorizedTest('users/1/activities', get);
    });

    describe('users/{userID}/follows', () => {
        describe('GET', () => {
            let u1, u1Token, u2, u3;

            beforeAll(async () => {
                [[u1, u1Token], u2, u3] = await Promise.all([createAndLoginUser(), createUser(), createUser()]);
                await prisma.follow.createMany({
                    data: [
                        { followeeID: u1.id, followedID: u2.id },
                        { followeeID: u1.id, followedID: u3.id },
                        { followeeID: u3.id, followedID: u2.id }
                    ]
                });
            });

            afterAll(() => cleanup('user'));

            it('should respond with a list of users the specified user follows', async () => {
                const res = await get({
                    url: `users/${u1.id}/follows`,
                    status: 200,
                    validatePaged: { type: FollowDto, count: 2 },
                    token: u1Token
                });

                // Follow users always include profiles
                for (const follow of res.body.response) {
                    expect(follow.followee).toHaveProperty('profile');
                    expect(follow.followed).toHaveProperty('profile');
                }
            });

            it('should respond with a limited list of follows for the user when using the take query param', () =>
                takeTest({ url: `users/${u1.id}/follows`, validate: FollowDto, token: u1Token }));

            it('should respond with a different list of follows for the user when using the skip query param', () =>
                skipTest({ url: `users/${u1.id}/follows`, validate: FollowDto, token: u1Token }));

            it('should return an empty list for a user who isnt following anyone', () =>
                get({
                    url: `users/${u2.id}/follows`,
                    status: 200,
                    validatePaged: { type: FollowDto, count: 0 },
                    token: u1Token
                }));

            unauthorizedTest('users/1/follows', get);
        });
    });

    describe('users/{userID}/followers', () => {
        describe('GET', () => {
            let u1, u1Token, u2, u3;

            beforeAll(async () => {
                [[u1, u1Token], u2, u3] = await Promise.all([createAndLoginUser(), createUser(), createUser()]);
                await prisma.follow.createMany({
                    data: [
                        { followeeID: u1.id, followedID: u2.id },
                        { followeeID: u1.id, followedID: u3.id },
                        { followeeID: u3.id, followedID: u2.id }
                    ]
                });
            });

            afterAll(() => cleanup('user'));

            // These are just above, in reverse
            it('should respond with a list of users that follow the specified user', async () => {
                const res = await get({
                    url: `users/${u2.id}/followers`,
                    status: 200,
                    validatePaged: { type: FollowDto, count: 2 },
                    token: u1Token
                });

                for (const follow of res.body.response) {
                    expect(follow.followee).toHaveProperty('profile');
                    expect(follow.followed).toHaveProperty('profile');
                }
            });

            it('should respond with a limited list of followers for the user when using the take query param', () =>
                takeTest({ url: `users/${u2.id}/followers`, validate: FollowDto, token: u1Token }));

            it('should respond with a different list of followers for the user when using the skip query param', () =>
                skipTest({ url: `users/${u2.id}/followers`, validate: FollowDto, token: u1Token }));

            it('should return an empty list for a user who isnt following anyone', () =>
                get({
                    url: `users/${u2.id}/follows`,
                    status: 200,
                    validatePaged: { type: FollowDto, count: 0 },
                    token: u1Token
                }));

            it('should return an empty list for a user who isnt followed by anyone', () =>
                get({
                    url: `users/${u1.id}/followers`,
                    status: 200,
                    validatePaged: { type: FollowDto, count: 0 },
                    token: u1Token
                }));

            unauthorizedTest('users/1/followers', get);
        });
    });

    describe('users/{userID}/credits', () => {
        describe('GET', () => {
            let user, token;

            beforeAll(async () => {
                [user, token] = await createAndLoginUser();
                await createMaps(2, { credits: { create: { type: MapCreditType.AUTHOR, userID: user.id } } });
            });

            afterAll(() => cleanup('user', 'map'));

            it('should respond with a list of map credits for a specific user', () => {
                get({
                    url: `users/${user.id}/credits`,
                    status: 200,
                    validatePaged: { type: MapCreditDto, count: 2 },
                    token: token
                });
            });

            it('should respond with limited list of credits with take parameter', () =>
                takeTest({ url: `users/${user.id}/credits`, validate: MapCreditDto, token: token }));

            it('should respond with different list of credits with skip parameter', () =>
                skipTest({ url: `users/${user.id}/credits`, validate: MapCreditDto, token: token }));

            unauthorizedTest('users/1/credits', get);
        });
    });

    describe('users/{userID}/runs', () => {
        describe('GET', () => {
            let user, token;

            beforeAll(async () => {
                [user, token] = await createAndLoginUser();
                await Promise.all([createRunAndUmrForMap({ user: user }), createRunAndUmrForMap({ user: user })]);
            });

            afterAll(() => cleanup('user', 'map', 'run'));

            it('should respond with a list of runs for a specific user', () =>
                get({
                    url: `users/${user.id}/runs`,
                    status: 200,
                    validatePaged: { type: RunDto, count: 2 },
                    token: token
                }));

            it('should respond with limited list of runs with take parameter', () =>
                takeTest({ url: `users/${user.id}/runs`, validate: RunDto, token: token }));

            it('should respond with different list of runs with skip parameter', () =>
                skipTest({ url: `users/${user.id}/runs`, validate: RunDto, token: token }));

            unauthorizedTest('users/1/runs', get);
        });
    });
});
