import { PrismaService } from '@modules/repo/prisma.service';
import { ActivityTypes } from '@common/enums/activity.enum';
import { UserDto } from '@common/dto/user/user.dto';
import { ProfileDto } from '@common/dto/user/profile.dto';
import { FollowStatusDto } from '@common/dto/user/follow.dto';
import { ActivityDto } from '@common/dto/user/activity.dto';
import { MapLibraryEntryDto } from '@common/dto/map/map-library-entry';
import { NotificationDto } from '@common/dto/user/notification.dto';
import { del, get, getNoContent, patch, post, put } from '../util/request-handlers.util';
import { MapFavoriteDto } from '@common/dto/map/map-favorite.dto';
import { expandTest, searchTest, skipTest, takeTest, unauthorizedTest } from '@tests/util/generic-e2e-tests.util';
import { MapDto } from '@common/dto/map/map.dto';
import { MapSummaryDto } from '@common/dto/user/user-maps-summary.dto';
import { createAndLoginUser, createMap, createMaps, createUser, loginNewUser, NULL_ID } from '@tests/util/db.util';
import { randomString } from '@tests/util/random.util';
import { MapNotifyDto } from '@common/dto/map/map-notify.dto';

const prisma: PrismaService = global.prisma;

describe('User', () => {
    afterAll(async () => {
        if ((await prisma.map.findFirst()) || (await prisma.user.findFirst()) || (await prisma.run.findFirst())) {
            1;
        }
    });
    describe('user', () => {
        describe('GET', () => {
            let user, token;
            beforeAll(async () => {
                [user, token] = await createAndLoginUser({
                    data: { profile: { create: { bio: randomString() } } },
                    include: { profile: true }
                });
            });

            afterAll(() => prisma.user.deleteMany());

            it('should respond with user data', async () => {
                const res = await get({ url: 'user', status: 200, token: token, validate: UserDto });
                expect(res.body.alias).toBe(user.alias);
                expect(res.body).not.toHaveProperty('profile');
            });

            it('should respond with user data and expand profile data', () =>
                expandTest({ url: 'user', validate: UserDto, expand: 'profile', token: token }));

            // it('should respond with user data and expand user stats', async () => {
            //     const res = await request(global.server)
            //         .get('/api/user')
            //         .set('Authorization', 'Bearer ' + global.accessToken)
            //         .query({ expand: 'stats' })
            //         .expect(200)
            //         .expect('Content-Type', /json/);
            //     expect(res.body).toHaveProperty('id');
            //     expect(res.body.stats).toHaveProperty('totalJumps');
            //     expect(res.body.stats).toHaveProperty('id');
            // });

            unauthorizedTest('user', get);
        });

        describe('PATCH', () => {
            const prisma: PrismaService = global.prisma;

            afterEach(() => prisma.user.deleteMany());

            it("should update the authenticated user's alias", async () => {
                const [user, token] = await createAndLoginUser();
                const newAlias = 'Donkey Kong';

                await patch({ url: 'user', status: 204, body: { alias: newAlias }, token: token });

                const updatedUser = await prisma.user.findFirst({ where: { id: user.id }, include: { profile: true } });

                expect(updatedUser.alias).toBe(newAlias);
            });

            it("should update the authenticated user's profile", async () => {
                const [user, token] = await createAndLoginUser();
                const newBio = 'I Love Donkey Kong';

                await patch({ url: 'user', status: 204, body: { bio: newBio }, token: token });

                const updatedUser = await prisma.user.findFirst({ where: { id: user.id }, include: { profile: true } });

                expect(updatedUser.profile.bio).toBe(newBio);
            });

            it('should 403 when trying to update bio when bio banned', async () => {
                const [_, token] = await createAndLoginUser({ data: { bans: { create: { bio: true } } } });

                await patch({ url: 'user', status: 403, body: { bio: 'Gamer Words' }, token: token });
            });

            it('should 403 when trying to update bio when alias banned', async () => {
                const [_, token] = await createAndLoginUser({ data: { bans: { create: { alias: true } } } });

                await patch({ url: 'user', status: 403, body: { alias: 'Gamer Words' }, token: token });
            });

            it('should 409 when a verified user tries to set their alias to something used by another verified user', async () => {
                const [u1] = await createAndLoginUser({ data: { roles: { create: { verified: true } } } });
                const [_, u2Token] = await createAndLoginUser({ data: { roles: { create: { verified: true } } } });

                await patch({ url: 'user', status: 409, body: { alias: u1.alias }, token: u2Token });
            });

            it('should allow a verified user to set their alias to something used by an unverified user', async () => {
                const [_, u1Token] = await createAndLoginUser({ data: { roles: { create: { verified: true } } } });
                const [u2] = await createAndLoginUser();

                await patch({ url: 'user', status: 204, body: { alias: u2.alias }, token: u1Token });
            });

            it('should allow an unverified user to set their alias to something used by a verified user', async () => {
                const [_, u1Token] = await createAndLoginUser({ data: { roles: { create: { verified: false } } } });
                const [u2] = await createAndLoginUser();

                await patch({ url: 'user', status: 204, body: { alias: u2.alias }, token: u1Token });
            });

            unauthorizedTest('user', patch);
        });
    });

    describe('user/profile', () => {
        describe('GET', () => {
            it("should respond with authenticated user's profile info", async () => {
                const [user, token] = await createAndLoginUser({
                    data: { profile: { create: { bio: 'Hello' } } },
                    include: { profile: true }
                });

                const res = await get({ url: 'user/profile', status: 200, token: token, validate: ProfileDto });

                expect(res.body.bio).toBe((user as any).profile.bio);

                await prisma.user.deleteMany();
            });

            unauthorizedTest('user/profile', get);
        });

        // Come back to this after doing the Auth stuff for it, no point yet.
        // Note that I don't think this functionality was every written on the old API.

        /*
        describe('DELETE /api/user/profile/social/{type}', () => {
            it('should return 200 and unlink the twitter account from the authd user', () => {
                 const res = await request(global.server)
                .delete('/api/user/profile/social/' + 'twitter')
                .set('Authorization', 'Bearer ' + global.accessToken)
                .then(res => {
                    .expect(200)
                    .expect('Content-Type', /json/)
                });
            });
             it('should return 200 and unlink the discord account from the authd user', () => {
                 const res = await request(global.server)
                .delete('/api/user/profile/social/' + 'discord')
                .set('Authorization', 'Bearer ' + global.accessToken)
                .then(res => {
                    .expect(200)
                    .expect('Content-Type', /json/)
                });
            });
             it('should return 200 and unlink the twitch account from the authd user', () => {
                 const res = await request(global.server)
                .delete('/api/user/profile/social/' + 'twitch')
                .set('Authorization', 'Bearer ' + global.accessToken)
                .then(res => {
                    .expect(200)
                    .expect('Content-Type', /json/)
                });
            });
        }); 
        */
    });

    describe('user/follow/{userID}', () => {
        describe('GET', () => {
            let u1, u1Token, u2;

            beforeEach(async () => ([[u1, u1Token], u2] = await Promise.all([createAndLoginUser(), createUser()])));

            afterEach(() => prisma.user.deleteMany());

            it('should return relationships of the given and local user who follow each other', async () => {
                await prisma.follow.createMany({
                    data: [
                        { followeeID: u1.id, followedID: u2.id },
                        { followeeID: u2.id, followedID: u1.id }
                    ]
                });

                const res = await get({
                    url: `user/follow/${u2.id}`,
                    status: 200,
                    token: u1Token,
                    validate: FollowStatusDto
                });

                expect(res.body).toMatchObject({
                    local: { followed: { id: u2.id }, followee: { id: u1.id } },
                    target: { followed: { id: u1.id }, followee: { id: u2.id } }
                });
            });

            it('should return a relationship of the local user who follows the target, but not the opposite', async () => {
                await prisma.follow.create({ data: { followeeID: u1.id, followedID: u2.id } });

                const res = await get({
                    url: `user/follow/${u2.id}`,
                    status: 200,
                    token: u1Token,
                    validate: FollowStatusDto
                });

                expect(res.body.local).toMatchObject({ followed: { id: u2.id }, followee: { id: u1.id } });
                expect(res.body.target).toBeNull();
            });

            it('should return a relationship of the target user who follows the local user, but not the opposite', async () => {
                await prisma.follow.create({ data: { followeeID: u2.id, followedID: u1.id } });

                const res = await get({
                    url: `user/follow/${u2.id}`,
                    status: 200,
                    token: u1Token,
                    validate: FollowStatusDto
                });

                expect(res.body.target).toMatchObject({ followee: { id: u2.id }, followed: { id: u1.id } });
                expect(res.body.local).toBeNull();
            });

            it('should have neither sides of relationship if their neither relationship exists', async () => {
                const res = await get({
                    url: `user/follow/${u2.id}`,
                    status: 200,
                    token: u1Token,
                    validate: FollowStatusDto
                });

                expect(res.body.local).toBeNull();
                expect(res.body.target).toBeNull();
            });

            it('should 404 if the target user does not exist', () =>
                get({ url: 'user/follow/283745692345', status: 404, token: u1Token }));

            unauthorizedTest('user/follow/1', get);
        });

        describe('POST', () => {
            let u1, u1Token, u2;

            beforeEach(async () => ([[u1, u1Token], u2] = await Promise.all([createAndLoginUser(), createUser()])));

            afterEach(() => prisma.user.deleteMany());

            it("should 204 and add user to authenticated user's follow list", async () => {
                await post({ url: `user/follow/${u2.id}`, status: 204, token: u1Token });

                const follow = await prisma.follow.findFirst({ where: { followeeID: u1.id } });

                expect(follow.followedID).toBe(u2.id);
            });

            it('should 404 if the target user does not exist', () =>
                post({ url: `user/follow/${NULL_ID}`, status: 404, token: u1Token }));

            it('should 400 if the authenticated user is already following the target user', async () => {
                await prisma.follow.create({ data: { followeeID: u1.id, followedID: u2.id } });

                await post({ url: `user/follow/${u2.id}`, status: 400, token: u1Token });
            });

            unauthorizedTest('user/follow/1', post);
        });

        describe('PATCH', () => {
            let u1, u1Token, u2;

            beforeAll(async () => {
                u2 = await createUser();
                [u1, u1Token] = await createAndLoginUser({ data: { follows: { create: { followedID: u2.id } } } });
            });

            afterAll(() => prisma.user.deleteMany());

            it('should update the following status of the local user and the followed user', async () => {
                let follow = await prisma.follow.findFirst({ where: { followeeID: u1.id } });
                expect(follow.notifyOn).toBe(0);

                await patch({
                    url: `user/follow/${u2.id}`,
                    status: 204,
                    body: { notifyOn: ActivityTypes.REVIEW_MADE },
                    token: u1Token
                });

                follow = await prisma.follow.findFirst({ where: { followeeID: u1.id } });
                expect(follow.notifyOn).toBe(ActivityTypes.REVIEW_MADE);
            });

            it('should 400 if the body is invalid', () =>
                patch({ url: `user/follow/${u2.id}`, status: 400, body: { notifyOn: 'burger' }, token: u1Token }));

            it('should 404 if the target user does not exist', () =>
                patch({
                    url: `user/follow/${NULL_ID}`,
                    status: 404,
                    body: { notifyOn: ActivityTypes.REVIEW_MADE },
                    token: u1Token
                }));

            unauthorizedTest('user/follow/1', patch);
        });

        describe('DELETE', () => {
            let u1, u1Token, u2;

            beforeAll(async () => ([[u1, u1Token], u2] = await Promise.all([createAndLoginUser(), createUser()])));

            afterAll(() => prisma.user.deleteMany());

            it('should remove the user from the local users follow list', async () => {
                await prisma.follow.create({ data: { followedID: u2.id, followeeID: u1.id } });

                await del({
                    url: `user/follow/${u2.id}`,
                    status: 204,
                    token: u1Token
                });

                const follow = await prisma.follow.findFirst({ where: { followeeID: u1.id } });
                expect(follow).toBeNull();

                await prisma.follow.deleteMany();
            });

            it('should 404 if the target user is not followed by the local user ', () =>
                del({ url: `user/follow/${u2.id}`, status: 404, token: u1Token }));

            it('should 404 if the target user does not exist', () =>
                del({ url: `user/follow/${NULL_ID}`, status: 404, token: u1Token }));

            unauthorizedTest('user/follow/1', del);
        });
    });

    describe('user/notifyMap/{mapID}', () => {
        describe('GET ', () => {
            let user, token, map;

            beforeAll(async () => ([[user, token], map] = await Promise.all([createAndLoginUser(), createMap()])));

            afterAll(() => Promise.all([prisma.user.deleteMany(), prisma.map.deleteMany()]));

            it('should return a MapNotify DTO for a given user and map', async () => {
                const activityType = ActivityTypes.WR_ACHIEVED;
                await prisma.mapNotify.create({ data: { userID: user.id, mapID: map.id, notifyOn: activityType } });

                const res = await get({
                    url: `user/notifyMap/${map.id}`,
                    status: 200,
                    token: token,
                    validate: MapNotifyDto
                });

                expect(res.body.notifyOn).toBe(activityType);

                await prisma.mapNotify.deleteMany();
            });

            it('should 404 if the user does not have mapnotify for given map', () =>
                get({ url: `user/notifyMap/${map.id}`, status: 404, token: token }));

            it('should 404 if the target map does not exist', () =>
                get({ url: `user/notifyMap/${NULL_ID}`, status: 404, token: token }));

            unauthorizedTest('user/notifyMap/1', get);
        });

        describe('PUT ', () => {
            let user, token, map;

            beforeAll(async () => ([[user, token], map] = await Promise.all([createAndLoginUser(), createMap()])));

            afterAll(() => Promise.all([prisma.user.deleteMany(), prisma.map.deleteMany()]));

            it('should update map notification status with existing notifications', async () => {
                await prisma.mapNotify.create({
                    data: { userID: user.id, mapID: map.id, notifyOn: ActivityTypes.WR_ACHIEVED }
                });

                const newActivityType = ActivityTypes.PB_ACHIEVED;
                await put({
                    url: `user/notifyMap/${map.id}`,
                    status: 204,
                    body: { notifyOn: newActivityType },
                    token: token
                });

                const mapNotify = await prisma.mapNotify.findFirst({ where: { userID: user.id } });
                expect(mapNotify.notifyOn).toBe(newActivityType);

                await prisma.mapNotify.deleteMany();
            });

            it('should create new map notification status if no existing notifications', async () => {
                const activityType = ActivityTypes.REVIEW_MADE;
                await put({
                    url: `user/notifyMap/${map.id}`,
                    status: 204,
                    body: { notifyOn: activityType },
                    token: token
                });

                const mapNotify = await prisma.mapNotify.findFirst({ where: { userID: user.id } });
                expect(mapNotify.notifyOn).toBe(activityType);

                await prisma.mapNotify.deleteMany();
            });

            it('should 400 is the body is invalid', async () => {
                await put({
                    url: `user/notifyMap/${map.id}`,
                    status: 400,
                    body: { notifyOn: 'this is a sausage' },
                    token: token
                });
            });

            it('should 404 if the target map does not exist', () =>
                put({
                    url: `user/notifyMap/${NULL_ID}`,
                    status: 404,
                    body: { notifyOn: ActivityTypes.PB_ACHIEVED },
                    token: token
                }));

            unauthorizedTest('user/notifyMap/1', put);
        });

        describe('DELETE', () => {
            let user, token, map;

            beforeAll(async () => ([[user, token], map] = await Promise.all([createAndLoginUser(), createMap()])));

            afterAll(() => Promise.all([prisma.user.deleteMany(), prisma.map.deleteMany()]));

            it('should remove the user from map notifications list', async () => {
                await prisma.mapNotify.create({
                    data: { userID: user.id, mapID: map.id, notifyOn: ActivityTypes.REVIEW_MADE }
                });

                await del({ url: `user/notifyMap/${map.id}`, status: 204, token: token });

                const mapNotify = await prisma.mapNotify.findFirst({ where: { userID: user.id } });
                expect(mapNotify).toBeNull();
            });

            it('should 404 if the user is not following the map', () =>
                del({ url: `user/notifyMap/${map.id}`, status: 404, token: token }));

            it('should 404 if the target map does not exist', () =>
                del({ url: `user/notifyMap/${NULL_ID}`, status: 404, token: token }));

            unauthorizedTest('user/notifyMap/1', del);
        });
    });

    describe('user/activities', () => {
        describe('GET', () => {
            let user, token;

            beforeAll(async () => {
                [user, token] = await createAndLoginUser();
                await prisma.activity.createMany({
                    data: [
                        { userID: user.id, data: 1n, type: ActivityTypes.ALL },
                        { userID: user.id, data: 2n, type: ActivityTypes.ALL },
                        { userID: user.id, data: 2n, type: ActivityTypes.MAP_UPLOADED }
                    ]
                });
            });

            afterAll(() => prisma.user.deleteMany());

            it('should retrieve the local users activities', async () => {
                const res = await get({
                    url: 'user/activities',
                    status: 200,
                    token: token,
                    validatePaged: ActivityDto
                });

                for (const r of res.body.response) expect(r.user.alias).toBe(user.alias);
                expect(res.body.totalCount).toBe(3);
                expect(res.body.returnCount).toBe(3);
            });

            it('should respond with a limited list of activities for the local user when using the take query param', () =>
                takeTest({ url: 'user/activities', validate: ActivityDto, token: token }));

            it('should respond with a different list of activities for the local user when using the skip query param', () =>
                skipTest({ url: 'user/activities', validate: ActivityDto, token: token }));

            it('should respond with a filtered list of activities for the local user when using the type query param', async () => {
                const res = await get({
                    url: 'user/activities',
                    status: 200,
                    validatePaged: ActivityDto,
                    query: { type: ActivityTypes.MAP_UPLOADED },
                    token: token
                });

                expect(res.body).toMatchObject({
                    totalCount: 1,
                    returnCount: 1,
                    response: [{ type: ActivityTypes.MAP_UPLOADED }]
                });
            });

            it('should respond with a filtered list of activities for the local user when using the data query param', async () => {
                const res = await get({
                    url: 'user/activities',
                    status: 200,
                    validatePaged: ActivityDto,
                    query: { data: 2 },
                    token: token
                });

                expect(res.body).toMatchObject({ totalCount: 2, returnCount: 2 });
            });

            it('should respond with an empty list of activities for the local user when using the data query param with nonexistent data', async () => {
                const res = await get({
                    url: 'user/activities',
                    status: 200,
                    query: { data: NULL_ID },
                    token: token
                });

                expect(res.body).toMatchObject({ totalCount: 0, returnCount: 0 });
                expect(res.body.response).toBeInstanceOf(Array);
            });

            unauthorizedTest('user/activities', get);
        });
    });

    describe('user/activities/followed', () => {
        describe('GET', () => {
            let u1, u1Token, u2, u2Token;

            beforeAll(async () => {
                [[u1, u1Token], [u2, u2Token]] = await Promise.all([createAndLoginUser(), createAndLoginUser()]);
                await prisma.follow.create({ data: { followeeID: u1.id, followedID: u2.id } });
                await prisma.activity.createMany({
                    data: [
                        { userID: u2.id, data: 1n, type: ActivityTypes.WR_ACHIEVED },
                        { userID: u2.id, data: 2n, type: ActivityTypes.REVIEW_MADE }
                    ]
                });
            });

            afterAll(() => prisma.user.deleteMany());

            it('should retrieve a list of activities from the local users followed users', async () => {
                const res = await get({
                    url: 'user/activities/followed',
                    status: 200,
                    validatePaged: ActivityDto,
                    token: u1Token
                });

                expect(res.body).toMatchObject({
                    totalCount: 2,
                    returnCount: 2,
                    response: [{ user: { alias: u2.alias } }, { user: { alias: u2.alias } }]
                });
            });

            it('should respond with a limited list of activities for the u1 when using the take query param', () =>
                takeTest({ url: 'user/activities/followed', validate: ActivityDto, token: u1Token }));

            it('should respond with a different list of activities for the u1 when using the skip query param', () =>
                skipTest({ url: 'user/activities/followed', validate: ActivityDto, token: u1Token }));

            it('should respond with a filtered list of activities for the u1 when using the type query param', async () => {
                const res = await get({
                    url: 'user/activities/followed',
                    status: 200,
                    query: { type: ActivityTypes.WR_ACHIEVED },
                    validatePaged: ActivityDto,
                    token: u1Token
                });

                expect(res.body).toMatchObject({
                    totalCount: 1,
                    returnCount: 1,
                    response: [{ userID: u2.id, type: ActivityTypes.WR_ACHIEVED, data: 1 }]
                });
            });

            it('should respond with a filtered list of activities for the u1 when using the data query param', async () => {
                const res = await get({
                    url: 'user/activities/followed',
                    status: 200,
                    query: { data: 2 },
                    validatePaged: ActivityDto,
                    token: u1Token
                });

                expect(res.body).toMatchObject({
                    totalCount: 1,
                    returnCount: 1,
                    response: [{ userID: u2.id, data: 2, type: ActivityTypes.REVIEW_MADE }]
                });
            });

            it('should respond with an empty list of activities for the u1 when using the data query param with nonexistent data', async () => {
                const res = await get({
                    url: 'user/activities/followed',
                    status: 200,
                    query: { data: NULL_ID },
                    token: u1Token
                });

                expect(res.body).toMatchObject({ totalCount: 0, returnCount: 0 });
                expect(res.body.response).toBeInstanceOf(Array);
            });

            it('should respond with an empty list of activities for a u1 that is not following anyone', async () => {
                const res = await get({
                    url: 'user/activities/followed',
                    status: 200,
                    token: u2Token
                });

                expect(res.body).toMatchObject({ totalCount: 0, returnCount: 0 });
                expect(res.body.response).toBeInstanceOf(Array);
            });

            unauthorizedTest('user/activities/followed', get);
        });
    });

    describe('user/maps/library', () => {
        describe('GET', () => {
            let user, token;

            beforeAll(async () => {
                [user, token] = await createAndLoginUser();
                await createMaps(2, { libraryEntries: { create: { userID: user.id } } });
            });

            afterAll(() => Promise.all([prisma.user.deleteMany(), prisma.map.deleteMany()]));

            it('should retrieve the list of maps in the local users library', () =>
                get({
                    url: 'user/maps/library',
                    status: 200,
                    token: token,
                    validatePaged: { type: MapLibraryEntryDto, count: 2 }
                }));

            it('should retrieve a filtered list of maps in the local users library using the take query', () =>
                takeTest({ url: 'user/maps/library', validate: MapLibraryEntryDto, token: token }));

            it('should retrieve a filtered list of maps in the local users library using the skip query', () =>
                skipTest({ url: 'user/maps/library', validate: MapLibraryEntryDto, token: token }));

            unauthorizedTest('user/maps/library', get);
        });
    });

    describe('user/maps/library/{mapID}', () => {
        describe('GET', () => {
            let user, token, map;

            beforeAll(async () => ([[user, token], map] = await Promise.all([createAndLoginUser(), createMap()])));

            afterAll(() => Promise.all([prisma.user.deleteMany(), prisma.map.deleteMany()]));

            it('should 204 if a map exists in the local users library', async () => {
                await prisma.mapLibraryEntry.create({ data: { userID: user.id, mapID: map.id } });

                await getNoContent({ url: `user/maps/library/${map.id}`, status: 204, token: token });

                await prisma.mapLibraryEntry.deleteMany();
            });

            it('should 404 if the map is not in the local users library', () =>
                getNoContent({ url: `user/maps/library/${map.id}`, status: 404, token: token }));

            it('should 400 if the map is not in the database', () =>
                getNoContent({ url: `user/maps/library/${NULL_ID}`, status: 400, token: token }));

            unauthorizedTest('user/maps/library/1', get);
        });

        describe('PUT', () => {
            let user, token, map;

            beforeAll(async () => ([[user, token], map] = await Promise.all([createAndLoginUser(), createMap()])));

            afterAll(() => Promise.all([prisma.user.deleteMany(), prisma.map.deleteMany()]));

            it('should add a new map to the local users library', async () => {
                await put({ url: `user/maps/library/${map.id}`, status: 204, token: token });

                const entry = await prisma.mapLibraryEntry.findFirst({ where: { userID: user.id, mapID: map.id } });
                expect(entry).not.toBeNull();

                await prisma.mapLibraryEntry.deleteMany();
            });

            it("should 404 if the map doesn't exist", () =>
                put({ url: `user/maps/library/${NULL_ID}`, status: 404, token: token }));

            unauthorizedTest('user/maps/library/1', put);
        });

        describe('DELETE', () => {
            let user, token, map;

            beforeAll(async () => ([[user, token], map] = await Promise.all([createAndLoginUser(), createMap()])));

            afterAll(() => Promise.all([prisma.user.deleteMany(), prisma.map.deleteMany()]));

            it('should delete a map from the local users library', async () => {
                await prisma.mapLibraryEntry.create({ data: { userID: user.id, mapID: map.id } });

                await del({ url: `user/maps/library/${map.id}`, status: 204, token: token });

                const entry = await prisma.mapLibraryEntry.findFirst({ where: { userID: user.id, mapID: map.id } });
                expect(entry).toBeNull();
            });

            it('should 404 if the map is not in the local users library', () =>
                del({ url: `user/maps/library/${map.id}`, status: 404, token: token }));

            it('should 404 if the map is not in the database', () =>
                del({ url: `user/maps/library/${NULL_ID}`, status: 404, token: token }));

            unauthorizedTest('user/maps/library/1', del);
        });
    });

    describe('user/maps/favorites', () => {
        describe('GET', () => {
            let user, token;

            beforeAll(async () => {
                [user, token] = await createAndLoginUser();
                await Promise.all([
                    createMap({ name: 'ahop_aaaaaaaa', favorites: { create: { userID: user.id } } }),
                    createMap({ name: 'ahop_bbbbbbbb', favorites: { create: { userID: user.id } } })
                ]);
            });

            afterAll(() => Promise.all([prisma.user.deleteMany(), prisma.map.deleteMany()]));

            it('should retrieve the list of maps in the local users favorites', () =>
                get({
                    url: 'user/maps/favorites',
                    status: 200,
                    token: token,
                    validatePaged: { type: MapFavoriteDto, count: 2 }
                }));

            it('should retrieve a filtered list of maps in the local users favorites using the take query', () =>
                takeTest({
                    url: 'user/maps/favorites',
                    validate: MapFavoriteDto,
                    token: token
                }));

            it('should retrieve a filtered list of maps in the local users favorites using the skip query', () =>
                skipTest({
                    url: 'user/maps/favorites',
                    validate: MapFavoriteDto,
                    token: token
                }));

            it('should retrieve a list of maps in the local users favorites filtered using a search string', () =>
                searchTest({
                    url: 'user/maps/favorites',
                    token: token,
                    searchString: 'bbb',
                    searchMethod: 'contains',
                    searchPropertyName: 'map.name',
                    validate: { type: MapFavoriteDto, count: 1 }
                }));

            // These two need to check for eg map.submitter rather than submitter so no expandTest
            it('should retrieve a list of maps in the local users favorites with expanded submitter', async () => {
                const res = await get({
                    url: 'user/maps/favorites',
                    status: 200,
                    query: { expand: 'submitter' },
                    validatePaged: MapFavoriteDto,
                    token: token
                });

                for (const x of res.body.response) expect(x.map).toHaveProperty('submitter');
            });

            it('should retrieve a list of maps in the local users favorites with expanded thumbnail', async () => {
                const res = await get({
                    url: 'user/maps/favorites',
                    status: 200,
                    query: { expand: 'thumbnail' },
                    validatePaged: MapFavoriteDto,
                    token: token
                });

                for (const x of res.body.response) expect(x.map).toHaveProperty('thumbnail');
            });

            // TODO ??? this is silly.
            // come back to this once the stuff on maps/ is done
            // it('should retrieve a list of maps in the local users favorites ', async () => {
            //     const res = await get({
            //     url: 'user/maps/favorites', status:200, query: { expand: 'inFavorites' },token:user1Token});
            // });

            unauthorizedTest('user/maps/favorites', get);
        });
    });

    describe('user/maps/favorites/{mapID}', () => {
        describe('GET', () => {
            let user, token, map;

            beforeAll(async () => ([[user, token], map] = await Promise.all([createAndLoginUser(), createMap()])));

            afterAll(() => Promise.all([prisma.user.deleteMany(), prisma.map.deleteMany()]));

            it('should return a map favorites', async () => {
                await prisma.mapFavorite.create({ data: { userID: user.id, mapID: map.id } });

                const res = await get({ url: `user/maps/favorites/${map.id}`, token: token, status: 200 });

                expect(res.body).toMatchObject({ mapID: map.id, userID: user.id });

                await prisma.mapFavorite.deleteMany();
            });

            it('should return 404 if the map is not in library', () =>
                get({ url: `user/maps/favorites/${map.id}`, token: token, status: 404 }));

            it("should return 404 if the map doesn't exist", () =>
                get({ url: `user/maps/favorites/${NULL_ID}`, token: token, status: 404 }));

            unauthorizedTest('user/maps/favorites/1', get);
        });

        describe('PUT', () => {
            let user, token, map;

            beforeAll(async () => ([[user, token], map] = await Promise.all([createAndLoginUser(), createMap()])));

            afterAll(() => Promise.all([prisma.user.deleteMany(), prisma.map.deleteMany()]));

            it('should add a new map to the local users favorites', async () => {
                await put({ url: `user/maps/favorites/${map.id}`, status: 204, token: token });

                const favorite = await prisma.mapFavorite.findFirst({ where: { userID: user.id } });
                expect(favorite.mapID).toBe(map.id);
            });

            it("should 404 if the map doesn't exist", () =>
                put({ url: `user/maps/favorites/${NULL_ID}`, status: 404, token: token }));

            unauthorizedTest('user/maps/favorites/1', put);
        });

        describe('DELETE', () => {
            let user, token, map;

            beforeAll(async () => ([[user, token], map] = await Promise.all([createAndLoginUser(), createMap()])));

            afterAll(() => Promise.all([prisma.user.deleteMany(), prisma.map.deleteMany()]));

            it('should delete a map from the local users favorites', async () => {
                await prisma.mapFavorite.create({ data: { userID: user.id, mapID: map.id } });

                await del({
                    url: `user/maps/favorites/${map.id}`,
                    status: 204,
                    token: token
                });

                const favorite = await prisma.mapFavorite.findFirst({ where: { userID: user.id, mapID: map.id } });
                expect(favorite).toBeNull();
            });

            it('should 404 if the map is not in the local users favorites', () =>
                del({ url: `user/maps/favorites/${map.id}`, status: 404, token: token }));

            it('should 404 if the map is not in the database', () =>
                del({ url: `user/maps/favorites/${NULL_ID}`, status: 404, token: token }));

            unauthorizedTest('user/maps/favorites/1', del);
        });
    });

    describe('user/maps/submitted', () => {
        describe('GET', () => {
            let u1, u1Token, u2Token;

            beforeAll(async () => {
                [[u1, u1Token], u2Token] = await Promise.all([createAndLoginUser(), loginNewUser()]);
                await Promise.all([
                    createMap({ name: 'ahop_aaaaaaaa', submitter: { connect: { id: u1.id } } }),
                    createMap({ name: 'ahop_bbbbbbbb', submitter: { connect: { id: u1.id } } })
                ]);
            });

            afterAll(() => Promise.all([prisma.user.deleteMany(), prisma.map.deleteMany()]));

            it('should retrieve the list of maps that the user submitted', () =>
                get({
                    url: 'user/maps/submitted',
                    status: 200,
                    token: u1Token,
                    validatePaged: { type: MapDto, count: 2 }
                }));

            it('should retrieve an empty map list if the user has not submitted any maps', async () => {
                const res = await get({ url: 'user/maps/submitted', status: 200, token: u2Token });

                expect(res.body).toMatchObject({ returnCount: 0, totalCount: 0 });
            });

            it('should retrieve the users submitted maps when using the skip query parameter', () =>
                skipTest({ url: 'user/maps/submitted', validate: MapDto, token: u1Token }));

            it('should retrieve the users submitted maps when using the take query parameter', () =>
                takeTest({ url: 'user/maps/submitted', validate: MapDto, token: u1Token }));

            it('should retrieve the submitted maps with expanded info', () =>
                expandTest({
                    url: 'user/maps/submitted',
                    validate: MapDto,
                    paged: true,
                    expand: 'info',
                    token: u1Token
                }));

            it('should retrieve the submitted maps with expanded submitter', () =>
                expandTest({
                    url: 'user/maps/submitted',
                    validate: MapDto,
                    paged: true,
                    expand: 'submitter',
                    token: u1Token
                }));

            it('should retrieve the submitted maps with expanded credits', () =>
                expandTest({
                    url: 'user/maps/submitted',
                    validate: MapDto,
                    paged: true,
                    expand: 'credits',
                    token: u1Token
                }));

            it('should retrieve a map specified by a search query parameter', () =>
                searchTest({
                    url: 'user/maps/submitted',
                    token: u1Token,
                    validate: { type: MapDto, count: 1 },
                    searchPropertyName: 'name',
                    searchMethod: 'contains',
                    searchString: 'bbb'
                }));

            unauthorizedTest('user/maps/submitted', get);
        });
    });

    describe('user/maps/submitted/summary', () => {
        describe('GET', () => {
            let u1, u1Token, u2Token;

            beforeAll(async () => {
                [[u1, u1Token], u2Token] = await Promise.all([createAndLoginUser(), loginNewUser()]);
                await Promise.all([
                    createMap({ name: 'ahop_aaaaaaaa', submitter: { connect: { id: u1.id } } }),
                    createMap({ name: 'ahop_bbbbbbbb', submitter: { connect: { id: u1.id } } })
                ]);
            });

            afterAll(() => Promise.all([prisma.user.deleteMany(), prisma.map.deleteMany()]));

            it('should retrieve an array of objects that each contain a statusFlag and its count', async () => {
                const res = await get({ url: 'user/maps/submitted/summary', status: 200, token: u1Token });

                expect(res.body).toBeInstanceOf(Array);
                for (const item of res.body) expect(item).toBeValidDto(MapSummaryDto);
            });

            it('should retrieve an empty summary list', async () => {
                const res = await get({ url: 'user/maps/submitted/summary', status: 200, token: u2Token });

                expect(res.body).toBeInstanceOf(Array);
                expect(res.body.length).toBe(0);
            });

            unauthorizedTest('user/maps/submitted/summary', get);
        });
    });

    describe('user/notifications', () => {
        describe('GET', () => {
            let user, token, activities;

            beforeAll(async () => {
                [user, token] = await createAndLoginUser();

                activities = await Promise.all([
                    prisma.activity.create({ data: { data: 1n, type: ActivityTypes.ALL, userID: user.id } }),
                    prisma.activity.create({ data: { data: 2n, type: ActivityTypes.ALL, userID: user.id } })
                ]);

                await prisma.notification.create({
                    data: { userID: user.id, activityID: activities[0].id, read: false }
                });
                await prisma.notification.create({
                    data: { userID: user.id, activityID: activities[1].id, read: true }
                });
            });

            afterAll(() => prisma.user.deleteMany());

            it('should respond with a list of notifications for the local user', async () => {
                const res = await get({
                    url: 'user/notifications',
                    status: 200,
                    validatePaged: { type: NotificationDto, count: 2 },
                    token: token
                });

                expect(res.body.response).toMatchObject([{ read: false }, { read: true }]);
            });

            it('should respond with a limited list of notifications for the user when using the take query param', () =>
                takeTest({ url: 'user/notifications', validate: NotificationDto, token: token }));

            it('should respond with a different list of notifications for the user when using the skip query param', () =>
                skipTest({ url: 'user/notifications', validate: NotificationDto, token: token }));

            unauthorizedTest('user/notifications', get);
        });
    });

    describe('user/notifications/{notifID}', () => {
        describe('PATCH', () => {
            let user, token, notification;

            beforeAll(async () => {
                [user, token] = await createAndLoginUser();

                const activity = await prisma.activity.create({
                    data: { data: 1n, type: ActivityTypes.ALL, userID: user.id }
                });

                notification = await prisma.notification.create({
                    data: { userID: user.id, activityID: activity.id, read: false }
                });
            });

            afterAll(() => prisma.user.deleteMany());

            it('should update the notification', async () => {
                await patch({
                    url: `user/notifications/${notification.id}`,
                    status: 204,
                    body: { read: true },
                    token: token
                });

                const updatedNotification = await prisma.notification.findFirst({ where: { userID: user.id } });
                expect(updatedNotification.read).toBe(true);
            });

            it('should 400 if the body is invalid', () =>
                patch({
                    url: `user/notifications/${notification.id}`,
                    status: 400,
                    body: { read: 'horse' },
                    token: token
                }));

            it('should 404 if the notification does not exist', () =>
                patch({ url: `user/notifications/${NULL_ID}`, status: 404, body: { read: true }, token: token }));

            unauthorizedTest('user/notifications/1', patch);
        });

        describe('DELETE', () => {
            let user, token, notification;

            beforeAll(async () => {
                [user, token] = await createAndLoginUser();

                const activity = await prisma.activity.create({
                    data: { data: 1n, type: ActivityTypes.ALL, userID: user.id }
                });

                notification = await prisma.notification.create({
                    data: { userID: user.id, activityID: activity.id, read: false }
                });
            });

            afterAll(() => prisma.user.deleteMany());

            it('should delete the notification', async () => {
                await del({ url: `user/notifications/${notification.id}`, status: 204, token: token });

                const updatedNotification = await prisma.notification.findFirst({ where: { userID: user.id } });
                expect(updatedNotification).toBeNull();
            });

            it('should 404 if the notification does not exist', () =>
                del({ url: `user/notifications/${NULL_ID}`, status: 404, token: token }));

            unauthorizedTest('user/notifications/1', del);
        });
    });
});

/*
    Some lengthy tests we could port later, probably near the end of porting, once the activities/notifications system is implemented.
    it('should respond with notification data', async () => {
    
        // testUser follows testUser2
        const res1 = await serv
            .post('/api/user/follow')
            .set('Authorization', 'Bearer ' + global.accessToken)
            .send({
                userID: user2.id
            })
            .expect(200);
    
        // changes the follow relationship between testUser and testUser2 to notify when a map is approved
        const res2 = await serv
            .patch('/api/user/follow/' + user2.id)
            .set('Authorization', 'Bearer ' + global.accessToken)
            .send({
                notifyOn: 1 << activity.ACTIVITY_TYPES.MAP_APPROVED
            })
            .expect(204);
    
        // testUser2 creates a map
        const res3 = await serv
            .post('/api/maps')
            .set('Authorization', 'Bearer ' + global.accessToken2)
            .send({
                name: 'test_map_notif',
                type: EMapType.SURF,
                info: {
                    description: 'newmap_5',
                    numTracks: 1,
                    creationDate: new Date()
                },
                tracks: [
                    {
                        trackNum: 0,
                        numZones: 1,
                        isLinear: false,
                        difficulty: 5
                    }
                ],
                credits: [
                    {
                        userID: user2.id,
                        type: EMapCreditType.AUTHOR
                    }
                ]
            })
            .expect(200);
    
        // upload the map
        const res4 = await serv
            .post(new URL(res3.header.location).pathname)
            .set('Authorization', 'Bearer ' + global.accessToken2)
            .attach('mapFile', fs.readFileSync('test/testMap.bsp'), 'testMap.bsp')
            .status(200);
    
        // testadmin approves the map
        const res5 = await serv
            .patch('/api/admin/maps/' + res3.body.id)
            .set('Authorization', 'Bearer ' + adminAccessToken)
            .send({ statusFlag: EMapStatus.APPROVED })
            .status(204);
    
        // should get the notification that testUser2's map was approved
        const res6 = await serv
            .get('/api/user/notifications')
            .set('Authorization', 'Bearer ' + global.accessToken)
            .expect(200);
    
        expect(res6.body).toHaveProperty('notifications');
        expect(Array.isArray(res6.body.notifications)).toBe(true);
        expect(res6.body.notifications).toHaveLength(1);
    
        serv.close();
    });
    */

// Commented out until the 0.10.0 replay refactor
/*it.skip('should respond with notification data for map notifications', () => {});
    () => {
    // enable map notifications for the given map
     const res = await request(global.server)
        .put('/api/user/notifyMap/' + testMap.id)
        .set('Authorization', 'Bearer ' + global.accessToken)
        .send({
            notifyOn: activity.ACTIVITY_TYPES.WR_ACHIEVED
        })
        .then(res => {
            // upload a run session
             const res = await request(global.server)
                .post(`/api/maps/${testMap.id}/session`)
                .set('Authorization', 'Bearer ' + adminGameAccessToken)
                .send({
                    trackNum: 0,
                    zoneNum: 0,
                })
                .then(res2 => {
                    // update the run session
                    let sesID = res2.body.id;
                     const res = await request(global.server)
                        .post(`/api/maps/${testMap.id}/session/${sesID}`)
                        .set('Authorization', 'Bearer ' + adminGameAccessToken)
                        .send({
                            zoneNum: 2,
                            tick: 510,
                        })
                        .then(res3 => {
                            // end the run session
                             const res = await request(global.server)
                                .post(`/api/maps/${testMap.id}/session/1/end`)
                                .set('Authorization', 'Bearer ' + adminGameAccessToken)
                                .set('Content-Type', 'application/octet-stream')
                                .send(
                                    fs.readFileSync('test/testRun.momrec')
                                )
                                .then(res4 => {
                                    expect(res2).to.have.status(200);
                                    expect(res2).to.be.json;
                                    expect(res2.body).to.have.property('id');
                                    expect(res3).to.have.status(200);
                                    expect(res3).to.be.json;
                                    expect(res3.body).to.have.property('id');
                                    expect(res4).to.have.status(200);
                                })
                        });
                    });
            });
    });
*/
