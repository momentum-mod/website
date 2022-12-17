// noinspection DuplicatedCode

import { MapCreditType, MapStatus, MapType } from '@common/enums/map.enum';
import { PrismaService } from '@modules/repo/prisma.service';
import { AuthService } from '@modules/auth/auth.service';
import { ActivityTypes } from '@common/enums/activity.enum';
import { UserDto } from '@common/dto/user/user.dto';
import { ProfileDto } from '@common/dto/user/profile.dto';
import { FollowStatusDto } from '@common/dto/user/followers.dto';
import { ActivityDto } from '@common/dto/user/activity.dto';
import { MapLibraryEntryDto } from '@common/dto/map/map-library-entry';
import { NotificationDto } from '@common/dto/user/notification.dto';
import { del, get, getNoContent, patch, post, put } from '../util/request-handlers.util';
import { MapFavoriteDto } from '@common/dto/map/map-favorite.dto';
import { expandTest, skipTest, takeTest } from '@tests/util/generic-e2e-tests.util';

describe('User', () => {
    let user1,
        user1Token,
        user2,
        user2Token,
        user3,
        user3Token,
        admin,
        adminGame,
        /* adminAccessToken */ map1,
        map2,
        map3,
        activities;

    beforeEach(async () => {
        const prisma: PrismaService = global.prisma;

        user1 = await prisma.user.create({
            data: {
                steamID: '7836468',
                country: 'GB',
                alias: 'Ron Weasley',
                avatar: '',
                roles: { create: { admin: true } },
                profile: {
                    create: {
                        bio: 'Ronald Bilius "Ron" Weasley (b. 1 March, 1980) was an English pure-blood wizard, the sixth and youngest son of Arthur and Molly Weasley (née Prewett). He was also the younger brother of Bill, Charlie, Percy, Fred, George, and the elder brother of Ginny. Ron and his siblings lived at the The Burrow, on the outskirts of Ottery St Catchpole, Devon.\''
                    }
                }
            },
            include: {
                profile: true
            }
        });

        user2 = await prisma.user.create({
            data: {
                steamID: '96433563',
                alias: 'Bill Weasley',
                roles: { create: { verified: true } },
                bans: { create: { bio: true, alias: true } },
                country: 'US',
                profile: {
                    create: {
                        bio: 'William Arthur "Bill" Weasley (b. 29 November, 1970) was an English pure-blood wizard, the first child of Arthur and Molly Weasley (née Prewett) and the eldest brother of Charlie, Percy, the late Fred, George, Ron, and Ginny. He attended Hogwarts School of Witchcraft and Wizardry from 1982 to 1989 and was Sorted into Gryffindor House. Bill was both a Prefect and Head Boy.'
                    }
                },
                userStats: {
                    create: {
                        mapsCompleted: 3
                    }
                }
            }
        });

        user3 = await prisma.user.create({
            data: {
                steamID: '86546575',
                alias: 'Percy Weasley',
                avatar: 'e4db45e6d6472d9e61b131a04ad2f18a299daafc_full.jpg',
                roles: { create: { mapper: true, verified: true } },
                country: 'US',
                profile: {
                    create: {
                        bio: 'Percy Ignatius "Perce" Weasley (b. 22 August, 1976) was an English pure-blood wizard, the third child of Arthur and Molly Weasley (née Prewett). He was the younger brother of Bill and Charlie, the older brother of the late Fred Weasley, George, Ron and Ginny. He attended Hogwarts School of Witchcraft and Wizardry from 1987-1994, and was both a prefect and Head Boy.'
                    }
                }
            }
        });

        admin = await prisma.user.create({
            data: {
                steamID: '733345322',
                alias: 'Arthur Weasley',
                avatar: '',
                roles: { create: { admin: true } },
                profile: {
                    create: {
                        bio: 'Arthur Weasley (b. 6 February, 1950) was an English pure-blood wizard in the employ of the Ministry of Magic, as well as a member of the second Order of the Phoenix. He was a staunch believer in the equality of all magical and Muggle folk and was the head of the Weasley family.'
                    }
                }
            }
        });

        adminGame = await prisma.user.create({
            data: {
                steamID: '444444444444444',
                alias: 'Ginny Weasley',
                roles: { create: { admin: true } },
                country: 'US'
            }
        });

        map1 = await prisma.map.create({
            data: {
                name: 'user_test_map',
                type: MapType.UNKNOWN,
                statusFlag: MapStatus.APPROVED,
                submitterID: user1.id,
                info: {
                    create: {
                        description: 'My first map!!!!',
                        numTracks: 1,
                        creationDate: new Date()
                    }
                },
                tracks: {
                    create: [
                        {
                            trackNum: 0,
                            numZones: 1,
                            isLinear: false,
                            difficulty: 5,
                            zones: {
                                create: [
                                    {
                                        zoneNum: 0
                                    },
                                    {
                                        zoneNum: 1
                                    }
                                ]
                            }
                        }
                    ]
                },
                credits: {
                    create: [
                        {
                            type: MapCreditType.AUTHOR,
                            user: { connect: { id: user1.id } }
                        }
                    ]
                },
                images: {
                    create: {
                        small: 'https://media.moddb.com/cache/images/mods/1/29/28895/thumb_620x2000/Wallpaper.jpg'
                    }
                },
                stats: {
                    create: {
                        reviews: 1
                    }
                }
            }
        });

        map2 = await prisma.map.create({
            data: {
                name: 'surf_whatisapromise',
                type: MapType.SURF,
                statusFlag: MapStatus.APPROVED
            }
        });

        map3 = await prisma.map.create({
            data: {
                name: 'surf_tendies',
                type: MapType.SURF,
                submitterID: user1.id,
                statusFlag: MapStatus.APPROVED
            }
        });

        await prisma.mapLibraryEntry.createMany({
            data: [
                {
                    userID: user1.id,
                    mapID: map1.id
                },
                {
                    userID: user1.id,
                    mapID: map2.id
                }
            ]
        });

        await prisma.mapFavorite.createMany({
            data: [
                {
                    userID: user1.id,
                    mapID: map1.id
                },
                {
                    userID: user1.id,
                    mapID: map2.id
                }
            ]
        });

        await prisma.follow.createMany({
            data: [
                // 1 and 2 follow each other, 1 follows 3 but 3 doesn't follow 1 back
                {
                    followeeID: user1.id,
                    followedID: user2.id
                },
                {
                    followeeID: user2.id,
                    followedID: user1.id
                },
                {
                    followeeID: user1.id,
                    followedID: user3.id
                }
            ]
        });

        activities = await Promise.all(
            [
                {
                    data: 100n,
                    type: ActivityTypes.ALL,
                    userID: user1.id
                },
                {
                    data: 101n,
                    type: ActivityTypes.ALL,
                    userID: user1.id
                },
                {
                    data: 101n,
                    type: ActivityTypes.MAP_UPLOADED,
                    userID: user1.id
                },
                {
                    data: 4n,
                    type: ActivityTypes.WR_ACHIEVED,
                    userID: user2.id
                },
                {
                    data: 4n,
                    type: ActivityTypes.REVIEW_MADE,
                    userID: user2.id
                }
            ].map(
                async (activity) =>
                    await prisma.activity.create({
                        data: activity
                    })
            )
        );

        await prisma.notification.createMany({
            data: [
                { userID: user1.id, activityID: activities[0].id, read: false },
                { userID: user1.id, activityID: activities[1].id, read: true }
            ]
        });

        await prisma.mapNotify.create({
            data: {
                notifyOn: ActivityTypes.WR_ACHIEVED,
                user: { connect: { id: user1.id } },
                map: { connect: { id: map1.id } }
            }
        });

        const authService = global.auth as AuthService;
        user1Token = (await authService.loginWeb(user1)).accessToken;
        user2Token = (await authService.loginWeb(user2)).accessToken;
        user3Token = (await authService.loginWeb(user3)).accessToken;
    });

    afterEach(async () => {
        const prisma: PrismaService = global.prisma;

        await prisma.user.deleteMany({ where: { id: { in: [user1.id, user2.id, user3.id, admin.id, adminGame.id] } } });

        await prisma.map.deleteMany({ where: { id: { in: [map1.id, map2.id, map3.id] } } });
    });

    describe('GET /api/user', () => {
        const expects = (res) => expect(res.body).toBeValidDto(UserDto);

        it('should respond with user data', async () => {
            const res = await get({
                url: 'user',
                status: 200,
                token: user1Token
            });

            expects(res);
            expect(res.body.alias).toBe(user1.alias);
            expect(res.body).not.toHaveProperty('profile');
        });

        it('should respond with user data and expand profile data', () =>
            expandTest({
                url: 'user',
                test: expects,
                expand: 'profile',
                token: user1Token
            }));

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

        it('should respond with 401 when no access token is provided', () =>
            get({
                url: 'user',
                status: 401
            }));
    });

    describe('PATCH /api/user', () => {
        it('should update the authenticated users profile', async () => {
            await patch({
                url: 'user',
                status: 204,
                body: {
                    alias: 'Donkey Kong',
                    bio: 'I love Donkey Kong'
                },
                token: user3Token
            });

            const user = await (global.prisma as PrismaService).user.findFirst({
                where: { id: user3.id },
                include: { profile: true }
            });

            expect(user.alias).toBe('Donkey Kong');
            expect(user.profile.bio).toBe('I love Donkey Kong');
        });

        it('should respond with 403 when trying to update bio when bio banned', () =>
            patch({
                url: 'user',
                status: 403,
                body: { bio: 'Gamer Words' },
                token: user2Token
            }));

        it('should respond with 403 when trying to update alias when alias banned', () =>
            patch({
                url: 'user',
                status: 403,
                body: { alias: 'Gamer Words' },
                token: user2Token
            }));

        it('should respond with 409 when a verified user tries to set their alias to something used by another verified user', () =>
            patch({
                url: 'user',
                status: 409,
                body: { alias: user2.alias },
                token: user3Token
            }));

        it('should allow a verified user to set their alias to something used by an unverified user', () =>
            patch({
                url: 'user',
                status: 204,
                body: { alias: user1.alias },
                token: user3Token
            }));

        it('should allow an unverified user to set their alias to something used by a verified user', () =>
            patch({
                url: 'user',
                status: 204,
                body: { alias: user2.alias },
                token: user1Token
            }));

        it('should respond with 401 when no access token is provided', () =>
            patch({
                url: 'user',
                status: 401
            }));
    });

    describe('GET /api/user/profile', () => {
        it('should respond with authenticated users profile info', async () => {
            const res = await get({
                url: 'user/profile',
                status: 200,
                token: user1Token
            });

            expect(res.body).toBeValidDto(ProfileDto);
            expect(res.body.bio).toBe(user1.profile.bio);
        });

        it('should respond with 401 when no access token is provided', () =>
            get({
                url: 'user/profile',
                status: 401
            }));
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

    describe('GET /api/user/follow/{userID}', () => {
        it('should return relationships of the given and local user who follow each other', async () => {
            const res = await get({
                url: `user/follow/${user2.id}`,
                status: 200,
                token: user1Token
            });

            expect(res.body).toBeValidDto(FollowStatusDto);
            expect(res.body.local.followed.id).toBe(user2.id);
            expect(res.body.local.followee.id).toBe(user1.id);
            expect(res.body.target.followed.id).toBe(user1.id);
            expect(res.body.target.followee.id).toBe(user2.id);
        });

        it('should return a relationship of the local user who follows the target, but not the opposite', async () => {
            const res = await get({
                url: `user/follow/${user3.id}`,
                status: 200,
                token: user1Token
            });

            expect(res.body).toBeValidDto(FollowStatusDto);
            expect(res.body.local.followed.id).toBe(user3.id);
            expect(res.body.local.followee.id).toBe(user1.id);
            expect(res.body).not.toHaveProperty('target');
        });

        it('should return a relationship of the target user who follows the local user, but not the opposite', async () => {
            const res = await get({
                url: `user/follow/${user1.id}`,
                status: 200,
                token: user3Token
            });

            expect(res.body).toBeValidDto(FollowStatusDto);
            expect(res.body.target.followed.id).toBe(user3.id);
            expect(res.body.target.followee.id).toBe(user1.id);
            expect(res.body).not.toHaveProperty('local');
        });

        it('should respond with empty object if the followed relationship does not exist', async () => {
            const res = await get({
                url: `user/follow/${user2.id}`,
                status: 200,
                token: user3Token
            });
            expect(res.body).toEqual({});
        });

        it('should respond with 404 if the target user does not exist', () =>
            get({
                url: `user/follow/283745692345`,
                status: 404,
                token: user1Token
            }));

        it('should respond with 401 when no access token is provided', () =>
            get({
                url: `user/follow/${user2.id}`,
                status: 401
            }));
    });

    describe('POST /api/user/follow/{userID}', () => {
        it('should respond with 204 and add user to authenticated users follow list', async () => {
            const res = await get({
                url: `user/follow/${user3.id}`,
                status: 200,
                token: user2Token
            });

            expect(res.body).not.toHaveProperty('local');

            await post({
                url: `user/follow/${user3.id}`,
                status: 204,
                token: user2Token
            });

            const res2 = await get({
                url: `user/follow/${user3.id}`,
                status: 200,
                token: user2Token
            });

            expect(res2.body.local.followed.id).toBe(user3.id);
            expect(res2.body.local.followee.id).toBe(user2.id);
        });

        it('should respond with 404 if the target user does not exist', () =>
            post({
                url: 'user/follow/178124314563',
                status: 404,
                token: user1Token
            }));

        it('should respond with 401 when no access token is provided', () =>
            post({
                url: `user/follow/${user3.id}`,
                status: 401,
                token: user1Token
            }));
    });

    describe('PATCH /api/user/follow/{userID}', () => {
        it('should update the following status of the local user and the followed user', async () => {
            const res = await get({
                url: `user/follow/${user2.id}`,
                status: 200,
                token: user1Token
            });

            expect(res.body.local.notifyOn).toBe(0);

            await patch({
                url: `user/follow/${user2.id}`,
                status: 204,
                body: { notifyOn: ActivityTypes.REVIEW_MADE },
                token: user1Token
            });

            const res2 = await get({
                url: `user/follow/${user2.id}`,
                status: 200,
                token: user1Token
            });

            expect(res2.body.local.notifyOn).toBe(ActivityTypes.REVIEW_MADE);
        });

        it('should respond with 400 if the body is invalid', () =>
            patch({
                url: `user/follow/${user2.id}`,
                status: 200,
                body: { notifyOn: 'burger' },
                token: user1Token
            }));

        it('should respond with 404 if the target user does not exist', () =>
            patch({
                url: 'user/follow/178124314563',
                status: 404,
                body: { notifyOn: ActivityTypes.REVIEW_MADE },
                token: user1Token
            }));

        it('should respond with 401 when no access token is provided', () =>
            patch({
                url: `user/follow/${user3.id}`,
                status: 401,
                body: { notifyOn: ActivityTypes.REVIEW_MADE }
            }));
    });

    describe('DELETE /api/user/follow/{userID}', () => {
        it('should remove the user from the local users follow list', async () => {
            await del({
                url: `user/follow/${user2.id}`,
                status: 204,
                token: user1Token
            });

            const res = await get({
                url: `user/follow/${user2.id}`,
                status: 200,
                token: user1Token
            });

            expect(res.body).not.toHaveProperty('local');
        });

        it('should respond with 404 if the user is not followed by the local user ', () =>
            del({
                url: `user/follow/${user1.id}`,
                status: 404,
                token: user3Token
            }));

        it('should respond with 404 if the target user does not exist', () =>
            del({
                url: `user/follow/178124314563`,
                status: 404,
                token: user1Token
            }));

        it('should respond with 401 when no access token is provided', () =>
            del({
                url: `user/follow/${user3.id}`,
                status: 401
            }));
    });

    describe('GET /api/user/notifyMap/{mapID}', () => {
        it('should return a mapnotify dto for a given user and map', async () => {
            const res = await get({
                url: `user/notifyMap/${map1.id}`,
                status: 200,
                token: user1Token
            });

            expect(res.body.notifyOn).toBe(ActivityTypes.WR_ACHIEVED);
        });

        it('should respond with an empty object if the user does not have mapnotify for given map', async () => {
            const res = await get({
                url: `user/notifyMap/${map1.id}`,
                status: 200,
                token: user2Token
            });

            expect(res.body).toEqual({});
        });

        it('should respond with 404 if the target map does not exist', () =>
            get({
                url: `user/notifyMap/8732165478321`,
                status: 404,
                token: user1Token
            }));

        it('should respond with 401 when no access token is provided', () =>
            get({
                url: `user/notifyMap/${map1.id}`,
                status: 401
            }));
    });

    describe('PUT /api/user/notifyMap/{mapID}', () => {
        it('should update map notification status with existing notifications', async () => {
            await put({
                url: `user/notifyMap/${map1.id}`,
                status: 204,
                body: { notifyOn: ActivityTypes.PB_ACHIEVED },
                token: user1Token
            });

            const res = await get({
                url: `user/notifyMap/${map1.id}`,
                status: 200,
                token: user1Token
            });

            expect(res.body.notifyOn).toBe(ActivityTypes.PB_ACHIEVED);
        });

        it('should create new map notification status if no existing notifications', async () => {
            await put({
                url: `user/notifyMap/${map1.id}`,
                status: 204,
                body: { notifyOn: ActivityTypes.PB_ACHIEVED },
                token: user1Token
            });

            const res = await get({
                url: `user/notifyMap/${map1.id}`,
                status: 200,
                token: user1Token
            });

            expect(res.body.notifyOn).toBe(ActivityTypes.PB_ACHIEVED);
        });

        it('should respond with 400 is the body is invalid', async () => {
            await put({
                url: `user/notifyMap/8231734`,
                status: 404,
                body: { notifyOn: 'this is a sausage' },
                token: user1Token
            });
        });

        it('should respond with 404 if the target map does not exist', () =>
            put({
                url: `user/notifyMap/8231734`,
                status: 404,
                body: { notifyOn: ActivityTypes.PB_ACHIEVED },
                token: user1Token
            }));

        it('should respond with 401 when no access token is provided', () =>
            put({
                url: `user/notifyMap/${map1.id}`,
                status: 401
            }));
    });

    describe('DELETE /api/user/notifyMap/{mapID}', () => {
        it('should remove the user from map notifcations list', async () => {
            await del({
                url: `user/notifyMap/${map1.id}`,
                status: 204,
                token: user1Token
            });

            const res = await get({
                url: `user/notifyMap/${map1.id}`,
                status: 200,
                token: user1Token
            });

            expect(res.body).toEqual({});
        });

        it('should respond with 404 if the user is not following the map', () =>
            del({
                url: `user/notifyMap/${map1.id}`,
                status: 404,
                token: user2Token
            }));

        it('should respond with 404 if the target map does not exist', () =>
            del({
                url: `user/notifyMap/324512341243`,
                status: 404,
                token: user1Token
            }));

        it('should respond with 401 when no access token is provided', () =>
            del({
                url: `user/notifyMap/${map1.id}`,
                status: 401
            }));
    });

    describe('GET /api/user/activities', () => {
        const expects = (res) => {
            expect(res.body).toBeValidPagedDto(ActivityDto);
            for (const r of res.body.response) expect(r.user.alias).toBe(user1.alias);
        };

        it('should retrieve the local users activities', async () => {
            const res = await get({
                url: 'user/activities',
                status: 200,
                token: user1Token
            });

            expects(res);
            expect(res.body.totalCount).toBe(3);
            expect(res.body.returnCount).toBe(3);
        });

        it('should respond with a limited list of activities for the local user when using the take query param', () =>
            takeTest({
                url: `user/activities`,
                test: expects,
                token: user1Token
            }));

        it('should respond with a different list of activities for the local user when using the skip query param', () =>
            skipTest({
                url: `user/activities`,
                test: expects,
                token: user1Token
            }));

        it('should respond with a filtered list of activities for the local user when using the type query param', async () => {
            const res = await get({
                url: `user/activities`,
                status: 200,
                query: {
                    type: ActivityTypes.MAP_UPLOADED
                },
                token: user1Token
            });

            expects(res);
            expect(res.body.totalCount).toBe(1);
            expect(res.body.returnCount).toBe(1);
            expect(res.body.response[0].type).toBe(ActivityTypes.MAP_UPLOADED);
        });

        it('should respond with a filtered list of activities for the local user when using the data query param', async () => {
            const res = await get({
                url: `user/activities`,
                status: 200,
                query: {
                    data: 101n
                },
                token: user1Token
            });

            expects(res);
            expect(res.body.totalCount).toBe(2);
            expect(res.body.returnCount).toBe(2);
        });

        it('should respond with an empty list of activities for the local user when using the data query param with nonexistent data', async () => {
            const res = await get({
                url: `user/activities`,
                status: 200,
                query: {
                    data: 1123412341n
                },
                token: user1Token
            });
            expect(res.body.totalCount).toBe(0);
            expect(res.body.returnCount).toBe(0);
            expect(res.body.response).toBeInstanceOf(Array);
        });

        it('should respond with 401 when no access token is provided', () =>
            get({
                url: `user/activities`,
                status: 401
            }));
    });

    describe('GET /api/user/activities/followed', () => {
        const expects = (res) => expect(res.body).toBeValidPagedDto(ActivityDto);

        it('should retrieve a list of activities from the local users followed users', async () => {
            const res = await get({
                url: 'user/activities/followed',
                status: 200,
                token: user1Token
            });

            expect(res.body.totalCount).toBe(2);
            expect(res.body.returnCount).toBe(2);

            expect(res.body.response[0].user.alias).toBe(user2.alias);
            expect(res.body.response[1].user.alias).toBe(user2.alias);
        });

        it('should respond with a limited list of activities for the user when using the take query param', () =>
            takeTest({
                url: `user/activities/followed`,
                test: expects,
                token: user1Token
            }));

        it('should respond with a different list of activities for the user when using the skip query param', () =>
            skipTest({
                url: `user/activities/followed`,
                test: expects,
                token: user1Token
            }));

        it('should respond with a filtered list of activities for the user when using the type query param', async () => {
            const res = await get({
                url: `user/activities/followed`,
                status: 200,
                query: {
                    type: ActivityTypes.WR_ACHIEVED
                },
                token: user1Token
            });

            expects(res);
            expect(res.body.totalCount).toBe(1);
            expect(res.body.returnCount).toBe(1);
            expect(res.body.response[0].type).toBe(ActivityTypes.WR_ACHIEVED);
        });

        it('should respond with a filtered list of activities for the user when using the data query param', async () => {
            const res = await get({
                url: `user/activities/followed`,
                status: 200,
                query: {
                    data: 4n
                },
                token: user1Token
            });

            expects(res);
            expect(res.body.totalCount).toBe(2);
            expect(res.body.returnCount).toBe(2);
        });

        it('should respond with an empty list of activities for the user when using the data query param with nonexistent data', async () => {
            const res = await get({
                url: `user/activities/followed`,
                status: 200,
                query: {
                    data: 1123412341n
                },
                token: user1Token
            });
            expect(res.body.totalCount).toBe(0);
            expect(res.body.returnCount).toBe(0);
            expect(res.body.response).toBeInstanceOf(Array);
        });

        it('should respond with an empty list of activities for a user that is not following anyone', async () => {
            const res = await get({
                url: `user/activities/followed`,
                status: 200,
                token: user3Token
            });

            expect(res.body.totalCount).toBe(0);
            expect(res.body.returnCount).toBe(0);
            expect(res.body.response).toBeInstanceOf(Array);
        });

        it('should respond with 401 when no access token is provided', () =>
            get({
                url: `user/activities/followed`,
                status: 401
            }));
    });

    //     describe('PUT /api/user/maps/library/{mapID}', () => {
    //         it('should add a new map to the local users library', async () => {
    //             const res = await request(global.server)
    //                 .put('/api/user/maps/library/' + testMap2.id)
    //                 .set('Authorization', 'Bearer ' + global.accessToken)
    //                 .expect(200)
    //                 .expect('Content-Type', /json/);
    //             expect(res.body).toHaveProperty('id');
    //         });
    //
    //         it('should respond with 401 when no access token is provided', () =>
    //             request(global.server).post('/api/user/maps/library').expect(401).expect('Content-Type', /json/));
    //     });

    describe('GET /api/user/maps/library', () => {
        const expects = (res) => expect(res.body).toBeValidPagedDto(MapLibraryEntryDto);

        it('should retrieve the list of maps in the local users library', async () => {
            const res = await get({
                url: 'user/maps/library',
                status: 200,
                token: user1Token
            });

            expect(res.body).toBeValidPagedDto(MapLibraryEntryDto);
            expect(res.body.totalCount).toBe(2);
            expect(res.body.returnCount).toBe(2);
            expect(res.body.response[0].user.id).toBe(user1.id);
            expect(res.body.response[0].map.id).toBe(map1.id);
        });

        it('should retrieve a filtered list of maps in the local users library using the take query', () =>
            takeTest({
                url: `user/maps/library`,
                test: expects,
                token: user1Token
            }));

        it('should retrieve a filtered list of maps in the local users library using the skip query', () =>
            skipTest({
                url: `user/maps/library`,
                test: expects,
                token: user1Token
            }));

        it('should respond with 401 when no access token is provided', () =>
            get({
                url: `user/maps/library`,
                status: 401
            }));
    });

    describe('GET /api/user/maps/favorites', () => {
        const expects = (res) => expect(res.body).toBeValidPagedDto(MapFavoriteDto);

        it('should retrieve the list of maps in the local users favorites', async () => {
            const res = await get({
                url: 'user/maps/favorites',
                status: 200,
                token: user1Token
            });

            expects(res);
            expect(res.body.totalCount).toBe(2);
            expect(res.body.returnCount).toBe(2);
            expect(res.body.response[0].user.id).toBe(user1.id);
            expect(res.body.response[0].map.id).toBe(map1.id);
        });

        it('should retrieve a filtered list of maps in the local users favorites using the take query', () =>
            takeTest({
                url: `user/maps/favorites`,
                test: expects,
                token: user1Token
            }));

        it('should retrieve a filtered list of maps in the local users favorites using the skip query', () =>
            skipTest({
                url: `user/maps/favorites`,
                test: expects,
                token: user1Token
            }));

        it('should retrieve a list of maps in the local users favorites filtered using a search string', async () => {
            const res = await get({
                url: 'user/maps/favorites',
                status: 200,
                query: { search: map2.name.slice(0, 8) },
                token: user1Token
            });

            expects(res);
            expect(res.body.returnCount).toBe(1);
            expect(res.body.totalCount).toBe(1);
            expect(res.body.response[0].map.id).toBe(map2.id);
        });

        it('should retrieve a list of maps in the local users favorites with expanded submitter', async () => {
            const res = await get({
                url: 'user/maps/favorites',
                status: 200,
                query: { expand: 'submitter' },
                token: user1Token
            });

            expects(res);
            for (const x of res.body.response) expect(x.map).toHaveProperty('submitter');
        });

        it('should retrieve a list of maps in the local users favorites with expanded thumbnail', async () => {
            const res = await get({
                url: 'user/maps/favorites',
                status: 200,
                query: { expand: 'thumbnail' },
                token: user1Token
            });

            expects(res);
            for (const x of res.body.response) expect(x.map).toHaveProperty('thumbnail');
        });

        // TODO ??? this is silly.
        // come back to this once the stuff on maps/ is done
        // it('should retrieve a list of maps in the local users favorites ', async () => {
        //     const res = await get({
        //     url: 'user/maps/favorites', status:200, query: { expand: 'inFavorites' },token:user1Token});
        // });

        it('should respond with 401 when no access token is provided', () =>
            get({
                url: `user/maps/favorites`,
                status: 401
            }));
    });

    describe('GET /api/user/maps/library/{mapID}', () => {
        it('should check if a map exists in the local users library', () => {
            getNoContent({
                url: `user/maps/library/${map1.id}`,
                status: 204,
                token: user1Token
            });
        });

        it('should return 404 since the map is not in the local users library', () => {
            getNoContent({
                url: `user/maps/library/${map3.id}`,
                status: 404,
                token: user1Token
            });
        });

        it('should return 400 if the map is not in the database', () => {
            getNoContent({
                url: `user/maps/library/999999999`,
                status: 400,
                token: user1Token
            });
        });
    });

    //
    //     describe('DELETE /api/user/maps/library/{mapID}', () => {
    //         it('should delete a library entry from the local users library', async () => {
    //             await request(global.server)
    //                 .delete('/api/user/maps/library/' + testMap.id)
    //                 .set('Authorization', 'Bearer ' + global.accessToken)
    //                 .expect(200)
    //                 .expect('Content-Type', /json/);
    //             await request(global.server)
    //                 .get('/api/user/maps/library/' + testMap.id)
    //                 .set('Authorization', 'Bearer ' + global.accessToken)
    //                 .expect(404)
    //                 .expect('Content-Type', /json/);
    //         });
    //
    //         it('should respond with 401 when no access token is provided', () =>
    //             request(global.server)
    //                 .delete('/api/user/maps/library/' + testMap.id)
    //                 .expect(401)
    //                 .expect('Content-Type', /json/));
    //     });
    //
    //     describe('GET /api/user/maps/submitted', () => {
    //         it('should retrieve a list of maps submitted by the local user', async () => {
    //             const res = await request(global.server)
    //                 .get('/api/user/maps/submitted')
    //                 .set('Authorization', 'Bearer ' + global.accessToken)
    //                 .expect(200)
    //                 .expect('Content-Type', /json/);
    //             expect(res.body).toHaveProperty('count');
    //             expect(res.body).toHaveProperty('maps');
    //             expect(Array.isArray(res.body.maps)).toBe(true);
    //             expect(res.body.maps).toHaveLength(3);
    //         });
    //
    //         it('should should retrieve a list of maps submitted by the local user filtered with the limit query', async () => {
    //             const res = await request(global.server)
    //                 .get('/api/user/maps/submitted')
    //                 .set('Authorization', 'Bearer ' + global.accessToken)
    //                 .query({ limit: 1 })
    //                 .expect(200)
    //                 .expect('Content-Type', /json/);
    //             expect(res.body).toHaveProperty('count');
    //             expect(res.body).toHaveProperty('maps');
    //             expect(Array.isArray(res.body.maps)).toBe(true);
    //             expect(res.body.maps).toHaveLength(1);
    //         });
    //
    //         it('should should retrieve a list of maps submitted by the local user filtered with the offset query', async () => {
    //             const res = await request(global.server)
    //                 .get('/api/user/maps/submitted')
    //                 .set('Authorization', 'Bearer ' + global.accessToken)
    //                 .query({ offset: 1 })
    //                 .expect(200)
    //                 .expect('Content-Type', /json/);
    //             expect(res.body).toHaveProperty('count');
    //             expect(res.body).toHaveProperty('maps');
    //             expect(Array.isArray(res.body.maps)).toBe(true);
    //             expect(res.body.maps).toHaveLength(2);
    //         });
    //
    //         it('should should retrieve a list of maps submitted by the local user filtered with the search query', async () => {
    //             const res = await request(global.server)
    //                 .get('/api/user/maps/submitted')
    //                 .set('Authorization', 'Bearer ' + global.accessToken2)
    //                 .query({ search: testMap3.name })
    //                 .expect(200)
    //                 .expect('Content-Type', /json/);
    //             expect(res.body).toHaveProperty('count');
    //             expect(res.body).toHaveProperty('maps');
    //             expect(Array.isArray(res.body.maps)).toBe(true);
    //             expect(res.body.maps).toHaveLength(1);
    //         });
    //
    //         it('should should retrieve a list of maps submitted by the local user filtered with the expand query', async () => {
    //             const res = await request(global.server)
    //                 .get('/api/user/maps/submitted')
    //                 .set('Authorization', 'Bearer ' + global.accessToken)
    //                 .query({ expand: 'info' })
    //                 .expect(200)
    //                 .expect('Content-Type', /json/);
    //             expect(res.body).toHaveProperty('count');
    //             expect(res.body).toHaveProperty('maps');
    //             expect(Array.isArray(res.body.maps)).toBe(true);
    //             expect(res.body.maps).toHaveLength(3);
    //             expect(res.body.maps[0].info).toHaveProperty('description');
    //         });
    //
    //         it('should respond with 401 when no access token is provided', () =>
    //             request(global.server).get('/api/user/maps/submitted').expect(401).expect('Content-Type', /json/));
    //     });
    //
    //     describe('/user/maps/submitted/summary', () => {
    //         it('should return a summary of maps submitted by the user', async () => {
    //             const res = await request(global.server)
    //                 .get('/api/user/maps/submitted/summary')
    //                 .set('Authorization', 'Bearer ' + global.accessToken)
    //                 .expect(200)
    //                 .expect('Content-Type', /json/);
    //             expect(Array.isArray(res.body)).toBe(true);
    //             //  expect(res.body).to.have.property('statusFlag');
    //             // not sure how to get the statusFlag data since the array doesn't have a name?
    //         });
    //
    //         it('should respond with 401 when no access token is provided', () =>
    //             request(global.server)
    //                 .get('/api/user/maps/submitted/summary')
    //                 .expect(401)
    //                 .expect('Content-Type', /json/));
    //     });
    //
    describe('GET /api/user/notifications', () => {
        const expects = (res) => expect(res.body).toBeValidPagedDto(NotificationDto);

        it('should respond with a list of notifications for the local user', async () => {
            const res = await get({
                url: 'user/notifications',
                status: 200,
                token: user1Token
            });

            expects(res);

            expect(res.body.totalCount).toBe(2);
            expect(res.body.returnCount).toBe(2);

            expect(res.body.response[0].read).toBe(false);
            expect(res.body.response[1].read).toBe(true);
        });

        it('should respond with a limited list of notifications for the user when using the take query param', () =>
            takeTest({
                url: `user/notifications`,
                test: expects,
                token: user1Token
            }));

        it('should respond with a different list of notifications for the user when using the skip query param', () =>
            skipTest({
                url: `user/notifications`,
                test: expects,
                token: user1Token
            }));

        it('should respond with 401 when no access token is provided', () =>
            get({
                url: `user/notifications`,
                status: 401
            }));
    });

    describe('PATCH /api/user/notifications/{notifID}', () => {
        it('should update the notification', async () => {
            const res = await get({
                url: 'user/notifications',
                status: 200,
                token: user1Token
            });

            expect(res.body.response[0].read).toBe(false);

            await patch({
                url: `user/notifications/${res.body.response[0].id}`,
                status: 204,
                body: { read: true },
                token: user1Token
            });

            const res2 = await get({
                url: 'user/notifications',
                status: 200,
                token: user1Token
            });

            expect(res2.body.response[0].read).toBe(true);
        });

        it('should respond with 400 if the body is invalid', () =>
            patch({
                url: `user/notifications/32476671243`,
                status: 400,
                body: { read: 'horse' },
                token: user1Token
            }));

        it('should respond with 404 if the notification does not exist', () =>
            patch({
                url: `user/notifications/32476671243`,
                status: 404,
                body: { read: true },
                token: user1Token
            }));

        it('should respond with 401 when no access token is provided', () =>
            patch({
                url: `user/notifications/1`,
                status: 401
            }));
    });

    describe('DELETE /api/user/notifications/{notifID}', () => {
        it('should delete the notification', async () => {
            const res = await get({
                url: 'user/notifications',
                status: 200,
                token: user1Token
            });

            expect(res.body.response[0].read).toBe(false);

            await del({
                url: `user/notifications/${res.body.response[0].id}`,
                status: 204,
                token: user1Token
            });

            const res2 = await get({
                url: 'user/notifications',
                status: 200,
                token: user1Token
            });

            expect(res2.body.response[0].id).not.toBe(res.body.response[0].id);
        });

        it('should respond with 404 if the notification does not exist', () =>
            del({
                url: `user/notifications/324512341243`,
                status: 404,
                token: user1Token
            }));

        it('should respond with 401 when no access token is provided', () =>
            del({
                url: `user/notifications/1`,
                status: 401
            }));
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
});
