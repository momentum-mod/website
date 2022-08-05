// noinspection DuplicatedCode

import { MapCreditType, MapStatus, MapType } from '../src/@common/enums/map.enum';
import { PrismaService } from '../src/modules/repo/prisma.service';
import { Roles } from '../src/@common/enums/user.enum';
import { AuthService } from '../src/modules/auth/auth.service';
import { ActivityTypes } from '../src/@common/enums/activity.enum';
import { UserDto } from '../src/@common/dto/user/user.dto';
import { ProfileDto } from '../src/@common/dto/user/profile.dto';
import { FollowStatusDto } from '../src/@common/dto/user/followers.dto';
import { ActivityDto } from '../src/@common/dto/user/activity.dto';
import { MapLibraryEntryDto } from '../src/@common/dto/map/map-library-entry';
import { NotificationDto } from '../src/@common/dto/user/notification.dto';
import { del, expandTest, get, patch, post, put, skipTest, takeTest } from './util/test-util';
import { MapFavoriteDto } from '../src/@common/dto/map/map-favorite.dto';

describe('User', () => {
    let user1, user2, user2Token, user3, user3Token, admin, adminGame, adminAccessToken, map1, map2, map3, activities;

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
                aliasLocked: false,
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
        global.accessToken = (await authService.login(user1)).access_token;
        user2Token = (await authService.login(user2)).access_token;
        user3Token = (await authService.login(user3)).access_token;
    });

    afterEach(async () => {
        const prisma: PrismaService = global.prisma;

        await prisma.user.deleteMany({ where: { id: { in: [user1.id, user2.id, user3.id, admin.id, adminGame.id] } } });

        await prisma.map.deleteMany({ where: { id: { in: [map1.id, map2.id, map3.id] } } });
    });

    describe('GET /api/v1/user', () => {
        const expects = (res) => expect(res.body).toBeValidDto(UserDto);

        it('should respond with user data', async () => {
            const res = await get('user', 200);

            expects(res);
            expect(res.body.alias).toBe(user1.alias);
            expect(res.body).not.toHaveProperty('profile');
        });

        it('should respond with user data and expand profile data', () => expandTest('user', expects, 'profile'));

        // it('should respond with user data and expand user stats', async () => {
        //     const res = await request(global.server)
        //         .get('/api/v1/user')
        //         .set('Authorization', 'Bearer ' + global.accessToken)
        //         .query({ expand: 'stats' })
        //         .expect(200)
        //         .expect('Content-Type', /json/);
        //     expect(res.body).toHaveProperty('id');
        //     expect(res.body.stats).toHaveProperty('totalJumps');
        //     expect(res.body.stats).toHaveProperty('id');
        // });

        it('should respond with 401 when no access token is provided', () => get('user', 401, {}, null));
    });

    describe('PATCH /api/v1/user', () => {
        it('should update the authenticated users profile', async () => {
            await patch(
                'user',
                204,
                {
                    alias: 'Donkey Kong',
                    bio: 'I love Donkey Kong'
                },
                user3Token
            );

            const res = await get('user', 200, { expand: 'profile' }, user3Token);
            expect(res.body.alias).toBe('Donkey Kong');
            expect(res.body.profile.bio).toBe('I love Donkey Kong');
        });

        it('should respond with 403 when trying to update bio when bio banned', () =>
            patch('user', 403, { bio: 'Gamer Words' }, user2Token));

        it('should respond with 403 when trying to update alias when alias banned', () =>
            patch('user', 403, { alias: 'Gamer Words' }, user2Token));

        it('should respond with 409 when a verified user tries to set their alias to something used by another verified user', () =>
            patch('user', 409, { alias: user2.alias }, user3Token));

        it('should allow a verified user to set their alias to something used by an unverified user', () =>
            patch('user', 204, { alias: user1.alias }, user3Token));

        it('should allow an unverified user to set their alias to something used by a verified user', () =>
            patch('user', 204, { alias: user2.alias }));

        it('should respond with 401 when no access token is provided', () => patch('user', 401, {}, null));
    });

    describe('GET /api/v1/user/profile', () => {
        it('should respond with authenticated users profile info', async () => {
            const res = await get('user/profile', 200);

            expect(res.body).toBeValidDto(ProfileDto);
            expect(res.body.bio).toBe(user1.profile.bio);
        });

        it('should respond with 401 when no access token is provided', () => get('user/profile', 401, {}, null));
    });

    // Come back to this after doing the Auth stuff for it, no point yet.
    // Note that I don't think this functionality was every written on the old API.

    /*
    describe('DELETE /api/v1/user/profile/social/{type}', () => {
        it('should return 200 and unlink the twitter account from the authd user', () => {
             const res = await request(global.server)
            .delete('/api/v1/user/profile/social/' + 'twitter')
            .set('Authorization', 'Bearer ' + global.accessToken)
            .then(res => {
                .expect(200)
                .expect('Content-Type', /json/)
            });
        });
         it('should return 200 and unlink the discord account from the authd user', () => {
             const res = await request(global.server)
            .delete('/api/v1/user/profile/social/' + 'discord')
            .set('Authorization', 'Bearer ' + global.accessToken)
            .then(res => {
                .expect(200)
                .expect('Content-Type', /json/)
            });
        });
         it('should return 200 and unlink the twitch account from the authd user', () => {
             const res = await request(global.server)
            .delete('/api/v1/user/profile/social/' + 'twitch')
            .set('Authorization', 'Bearer ' + global.accessToken)
            .then(res => {
                .expect(200)
                .expect('Content-Type', /json/)
            });
        });
    });
    */

    //TODO: YHER ARE BACKTICK STRINGS EVEREYWHERE WIOTHOUT THINGY VALUES, FIX
    describe('GET /api/v1/user/follow/{userID}', () => {
        it('should return relationships of the given and local user who follow each other', async () => {
            const res = await get(`user/follow/${user2.id}`, 200);

            expect(res.body).toBeValidDto(FollowStatusDto);
            expect(res.body.local.followed.id).toBe(user2.id);
            expect(res.body.local.followee.id).toBe(user1.id);
            expect(res.body.target.followed.id).toBe(user1.id);
            expect(res.body.target.followee.id).toBe(user2.id);
        });

        it('should return a relationship of the local user who follows the target, but not the opposite', async () => {
            const res = await get(`user/follow/${user3.id}`, 200);

            expect(res.body).toBeValidDto(FollowStatusDto);
            expect(res.body.local.followed.id).toBe(user3.id);
            expect(res.body.local.followee.id).toBe(user1.id);
            expect(res.body).not.toHaveProperty('target');
        });

        it('should return a relationship of the target user who follows the local user, but not the opposite', async () => {
            const res = await get(`user/follow/${user1.id}`, 200, {}, user3Token);

            expect(res.body).toBeValidDto(FollowStatusDto);
            expect(res.body.target.followed.id).toBe(user3.id);
            expect(res.body.target.followee.id).toBe(user1.id);
            expect(res.body).not.toHaveProperty('local');
        });

        it('should respond with empty object if the followed relationship does not exist', async () => {
            const res = await get(`user/follow/${user2.id}`, 200, {}, user3Token);
            expect(res.body).toEqual({});
        });

        it('should respond with 404 if the target user does not exist', () => get(`user/follow/283745692345`, 404));

        it('should respond with 401 when no access token is provided', () =>
            get(`user/follow/${user2.id}`, 401, {}, null));
    });

    describe('POST /api/v1/user/follow/{userID}', () => {
        it('should respond with 204 and add user to authenticated users follow list', async () => {
            const res = await get(`user/follow/${user3.id}`, 200, {}, user2Token);

            expect(res.body).not.toHaveProperty('local');

            await post(`user/follow/${user3.id}`, 204, {}, user2Token);

            const res2 = await get(`user/follow/${user3.id}`, 200, {}, user2Token);

            expect(res2.body.local.followed.id).toBe(user3.id);
            expect(res2.body.local.followee.id).toBe(user2.id);
        });

        it('should respond with 404 if the target user does not exist', () => post('user/follow/178124314563', 404));

        it('should respond with 401 when no access token is provided', () =>
            post(`user/follow/${user3.id}`, 401, {}, null));
    });

    describe('PATCH /api/v1/user/follow/{userID}', () => {
        it('should update the following status of the local user and the followed user', async () => {
            const res = await get(`user/follow/${user2.id}`, 200, {});

            expect(res.body.local.notifyOn).toBe(0);

            await patch(`user/follow/${user2.id}`, 204, { notifyOn: ActivityTypes.REVIEW_MADE });

            const res2 = await get(`user/follow/${user2.id}`, 200, {});

            expect(res2.body.local.notifyOn).toBe(ActivityTypes.REVIEW_MADE);
        });

        // TODO: what?
        it('should respond with 400 if the body is invalid', async () => {
            const res = await get(`user/follow/${user2.id}`, 200, { notifyOn: 'burger' });
        });

        it('should respond with 404 if the target user does not exist', () =>
            patch('user/follow/178124314563', 404, { notifyOn: ActivityTypes.REVIEW_MADE }));

        it('should respond with 401 when no access token is provided', () =>
            patch(`user/follow/${user3.id}`, 401, { notifyOn: ActivityTypes.REVIEW_MADE }, null));
    });

    describe('DELETE /api/v1/user/follow/{userID}', () => {
        it('should remove the user from the local users follow list', async () => {
            await del(`user/follow/${user2.id}`, 204);

            const res = await get(`user/follow/${user2.id}`, 200, {});

            expect(res.body).not.toHaveProperty('local');
        });

        it('should respond with 404 if the user is not followed by the local user ', () =>
            del(`user/follow/${user1.id}`, 404, user3Token));

        it('should respond with 404 if the target user does not exist', () => del(`user/follow/178124314563`, 404));

        it('should respond with 401 when no access token is provided', () => del(`user/follow/${user3.id}`, 401, null));
    });

    describe('GET /api/v1/user/notifyMap/{mapID}', () => {
        it('should return a mapnotify dto for a given user and map', async () => {
            const res = await get(`user/notifyMap/${map1.id}`, 200);

            expect(res.body.notifyOn).toBe(ActivityTypes.WR_ACHIEVED);
        });

        it('should respond with an empty object if the user does not have mapnotify for given map', async () => {
            const res = await get(`user/notifyMap/${map1.id}`, 200, {}, user2Token);

            expect(res.body).toEqual({});
        });

        it('should respond with 404 if the target map does not exist', () => get(`user/notifyMap/8732165478321`, 404));

        it('should respond with 401 when no access token is provided', () =>
            get(`user/notifyMap/${map1.id}`, 401, {}, null));
    });

    describe('PUT /api/v1/user/notifyMap/{mapID}', () => {
        it('should update map notification status with existing notifications', async () => {
            await put(`user/notifyMap/${map1.id}`, 204, { notifyOn: ActivityTypes.PB_ACHIEVED });

            const res = await get(`user/notifyMap/${map1.id}`, 200);

            expect(res.body.notifyOn).toBe(ActivityTypes.PB_ACHIEVED);
        });

        it('should create new map notification status if no existing notifications', async () => {
            await put(`user/notifyMap/${map1.id}`, 204, { notifyOn: ActivityTypes.PB_ACHIEVED });

            const res = await get(`user/notifyMap/${map1.id}`, 200);

            expect(res.body.notifyOn).toBe(ActivityTypes.PB_ACHIEVED);
        });

        // TODO: what???
        it('should respond with 400 is the body is invalid', async () => {
            await put(`user/notifyMap/8231734`, 404, { notifyOn: 'this is a sausage' });
        });

        it('should respond with 404 if the target map does not exist', () =>
            put(`user/notifyMap/8231734`, 404, { notifyOn: ActivityTypes.PB_ACHIEVED }));

        it('should respond with 401 when no access token is provided', () =>
            put(`user/notifyMap/${map1.id}`, 401, {}, null));
    });

    describe('DELETE /api/v1/user/notifyMap/{mapID}', () => {
        it('should remove the user from map notifcations list', async () => {
            await del(`user/notifyMap/${map1.id}`, 204);

            const res = await get(`user/notifyMap/${map1.id}`, 200, {});

            expect(res.body).toEqual({});
        });

        it('should respond with 404 if the user is not following the map', () =>
            del(`user/notifyMap/${map1.id}`, 404, user2Token));

        it('should respond with 404 if the target map does not exist', () => del(`user/notifyMap/324512341243`, 404));

        it('should respond with 401 when no access token is provided', () =>
            del(`user/notifyMap/${map1.id}`, 401, null));
    });

    describe('GET /api/v1/user/activities', () => {
        const expects = (res) => {
            expect(res.body).toBeValidPagedDto(ActivityDto);
            res.body.response.forEach((r) => expect(r.user.alias).toBe(user1.alias));
        };

        it('should retrieve the local users activities', async () => {
            const res = await get('user/activities', 200);

            expects(res);
            expect(res.body.totalCount).toBe(3);
            expect(res.body.returnCount).toBe(3);
        });

        it('should respond with a limited list of activities for the local user when using the take query param', () =>
            takeTest(`user/activities`, expects));

        it('should respond with a different list of activities for the local user when using the skip query param', () =>
            skipTest(`user/activities`, expects));

        it('should respond with a filtered list of activities for the local user when using the type query param', async () => {
            const res = await get(`user/activities`, 200, {
                type: ActivityTypes.MAP_UPLOADED
            });

            expects(res);
            expect(res.body.totalCount).toBe(1);
            expect(res.body.returnCount).toBe(1);
            expect(res.body.response[0].type).toBe(ActivityTypes.MAP_UPLOADED);
        });

        it('should respond with a filtered list of activities for the local user when using the data query param', async () => {
            const res = await get(`user/activities`, 200, {
                data: 101n
            });

            expects(res);
            expect(res.body.totalCount).toBe(2);
            expect(res.body.returnCount).toBe(2);
        });

        it('should respond with an empty list of activities for the local user when using the data query param with nonexistent data', async () => {
            const res = await get(`user/activities`, 200, {
                data: 1123412341n
            });
            expect(res.body.totalCount).toBe(0);
            expect(res.body.returnCount).toBe(0);
            expect(res.body.response).toBeInstanceOf(Array);
        });

        it('should respond with 401 when no access token is provided', () => get(`user/activities`, 401, {}, null));
    });

    describe('GET /api/v1/user/activities/followed', () => {
        const expects = (res) => expect(res.body).toBeValidPagedDto(ActivityDto);

        it('should retrieve a list of activities from the local users followed users', async () => {
            const res = await get('user/activities/followed', 200);

            expect(res.body.totalCount).toBe(2);
            expect(res.body.returnCount).toBe(2);

            expect(res.body.response[0].user.alias).toBe(user2.alias);
            expect(res.body.response[1].user.alias).toBe(user2.alias);
        });

        it('should respond with a limited list of activities for the user when using the take query param', () =>
            takeTest(`user/activities/followed`, expects));

        it('should respond with a different list of activities for the user when using the skip query param', () =>
            skipTest(`user/activities/followed`, expects));

        it('should respond with a filtered list of activities for the user when using the type query param', async () => {
            const res = await get(`user/activities/followed`, 200, {
                type: ActivityTypes.WR_ACHIEVED
            });

            expects(res);
            expect(res.body.totalCount).toBe(1);
            expect(res.body.returnCount).toBe(1);
            expect(res.body.response[0].type).toBe(ActivityTypes.WR_ACHIEVED);
        });

        it('should respond with a filtered list of activities for the user when using the data query param', async () => {
            const res = await get(`user/activities/followed`, 200, {
                data: 4n
            });

            expects(res);
            expect(res.body.totalCount).toBe(2);
            expect(res.body.returnCount).toBe(2);
        });

        it('should respond with an empty list of activities for the user when using the data query param with nonexistent data', async () => {
            const res = await get(`user/activities/followed`, 200, {
                data: 1123412341n
            });
            expect(res.body.totalCount).toBe(0);
            expect(res.body.returnCount).toBe(0);
            expect(res.body.response).toBeInstanceOf(Array);
        });

        it('should respond with an empty list of activities for a user that is not following anyone', async () => {
            const res = await get(`user/activities/followed`, 200, {}, user3Token);

            expect(res.body.totalCount).toBe(0);
            expect(res.body.returnCount).toBe(0);
            expect(res.body.response).toBeInstanceOf(Array);
        });

        it('should respond with 401 when no access token is provided', () =>
            get(`user/activities/followed`, 401, {}, null));
    });

    //     describe('PUT /api/v1/user/maps/library/{mapID}', () => {
    //         it('should add a new map to the local users library', async () => {
    //             const res = await request(global.server)
    //                 .put('/api/v1/user/maps/library/' + testMap2.id)
    //                 .set('Authorization', 'Bearer ' + global.accessToken)
    //                 .expect(200)
    //                 .expect('Content-Type', /json/);
    //             expect(res.body).toHaveProperty('id');
    //         });
    //
    //         it('should respond with 401 when no access token is provided', () =>
    //             request(global.server).post('/api/v1/user/maps/library').expect(401).expect('Content-Type', /json/));
    //     });

    describe('GET /api/v1/user/maps/library', () => {
        const expects = (res) => expect(res.body).toBeValidPagedDto(MapLibraryEntryDto);

        it('should retrieve the list of maps in the local users library', async () => {
            const res = await get('user/maps/library', 200);

            expect(res.body).toBeValidPagedDto(MapLibraryEntryDto);
            expect(res.body.totalCount).toBe(2);
            expect(res.body.returnCount).toBe(2);
            expect(res.body.response[0].user.id).toBe(user1.id);
            expect(res.body.response[0].map.id).toBe(map1.id);
        });

        it('should retrieve a filtered list of maps in the local users library using the take query', () =>
            takeTest(`user/maps/library`, expects));

        it('should retrieve a filtered list of maps in the local users library using the skip query', () =>
            skipTest(`user/maps/library`, expects));

        it('should respond with 401 when no access token is provided', () => get(`user/maps/library`, 401, {}, null));
    });

    describe('GET /api/v1/user/maps/favorites', () => {
        const expects = (res) => expect(res.body).toBeValidPagedDto(MapFavoriteDto);

        it('should retrieve the list of maps in the local users favorites', async () => {
            const res = await get('user/maps/favorites', 200);

            expects(res);
            expect(res.body.totalCount).toBe(2);
            expect(res.body.returnCount).toBe(2);
            expect(res.body.response[0].user.id).toBe(user1.id);
            expect(res.body.response[0].map.id).toBe(map1.id);
        });

        it('should retrieve a filtered list of maps in the local users favorites using the take query', () =>
            takeTest(`user/maps/favorites`, expects));

        it('should retrieve a filtered list of maps in the local users favorites using the skip query', () =>
            skipTest(`user/maps/favorites`, expects));

        it('should retrieve a list of maps in the local users favorites filtered using a search string', async () => {
            const res = await get('user/maps/favorites', 200, { search: map2.name.slice(0, 8) });

            expects(res);
            expect(res.body.returnCount).toBe(1);
            expect(res.body.totalCount).toBe(1);
            expect(res.body.response[0].map.id).toBe(map2.id);
        });

        it('should retrieve a list of maps in the local users favorites with expanded submitter', async () => {
            const res = await get('user/maps/favorites', 200, { expand: 'submitter' });

            expects(res);
            res.body.response.forEach((x) => expect(x.map).toHaveProperty('submitter'));
        });

        it('should retrieve a list of maps in the local users favorites with expanded thumbnail', async () => {
            const res = await get('user/maps/favorites', 200, { expand: 'thumbnail' });

            expects(res);
            res.body.response.forEach((x) => expect(x.map).toHaveProperty('thumbnail'));
        });

        // TODO ??? this is silly.
        // come back to this once the stuff on maps/ is done
        // it('should retrieve a list of maps in the local users favorites ', async () => {
        //     const res = await get('user/maps/favorites', 200, { expand: 'inFavorites' });
        // });

        it('should respond with 401 when no access token is provided', () => get(`user/maps/favorites`, 401, {}, null));
    });
    //
    //     describe('GET /api/v1/user/maps/library/{mapID}', () => {
    //         it('should check if a map exists in the local users library', async () => {
    //             const res = await request(global.server)
    //                 .put('/api/v1/user/maps/library/' + testMap3.id)
    //                 .set('Authorization', 'Bearer ' + global.accessToken)
    //                 .expect(200)
    //                 .expect('Content-Type', /json/);
    //             const res2 = await request(global.server)
    //                 .get('/api/v1/user/maps/library/' + testMap3.id)
    //                 .set('Authorization', 'Bearer ' + global.accessToken)
    //                 .expect(200)
    //                 .expect('Content-Type', /json/);
    //         });
    //
    //         it('should return 404 since the map is not in the local users library', () =>
    //             request(global.server)
    //                 .get('/api/v1/user/maps/library/89898')
    //                 .set('Authorization', 'Bearer ' + global.accessToken)
    //                 .expect(404)
    //                 .expect('Content-Type', /json/));
    //
    //         it('should respond with 401 when no access token is provided', () =>
    //             request(global.server)
    //                 .get('/api/v1/user/maps/library/' + testMap3.id)
    //                 .expect(401)
    //                 .expect('Content-Type', /json/));
    //     });
    //
    //     describe('DELETE /api/v1/user/maps/library/{mapID}', () => {
    //         it('should delete a library entry from the local users library', async () => {
    //             await request(global.server)
    //                 .delete('/api/v1/user/maps/library/' + testMap.id)
    //                 .set('Authorization', 'Bearer ' + global.accessToken)
    //                 .expect(200)
    //                 .expect('Content-Type', /json/);
    //             await request(global.server)
    //                 .get('/api/v1/user/maps/library/' + testMap.id)
    //                 .set('Authorization', 'Bearer ' + global.accessToken)
    //                 .expect(404)
    //                 .expect('Content-Type', /json/);
    //         });
    //
    //         it('should respond with 401 when no access token is provided', () =>
    //             request(global.server)
    //                 .delete('/api/v1/user/maps/library/' + testMap.id)
    //                 .expect(401)
    //                 .expect('Content-Type', /json/));
    //     });
    //
    //     describe('GET /api/v1/user/maps/submitted', () => {
    //         it('should retrieve a list of maps submitted by the local user', async () => {
    //             const res = await request(global.server)
    //                 .get('/api/v1/user/maps/submitted')
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
    //                 .get('/api/v1/user/maps/submitted')
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
    //                 .get('/api/v1/user/maps/submitted')
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
    //                 .get('/api/v1/user/maps/submitted')
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
    //                 .get('/api/v1/user/maps/submitted')
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
    //             request(global.server).get('/api/v1/user/maps/submitted').expect(401).expect('Content-Type', /json/));
    //     });
    //
    //     describe('/user/maps/submitted/summary', () => {
    //         it('should return a summary of maps submitted by the user', async () => {
    //             const res = await request(global.server)
    //                 .get('/api/v1/user/maps/submitted/summary')
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
    //                 .get('/api/v1/user/maps/submitted/summary')
    //                 .expect(401)
    //                 .expect('Content-Type', /json/));
    //     });
    //
    describe('GET /api/v1/user/notifications', () => {
        const expects = (res) => expect(res.body).toBeValidPagedDto(NotificationDto);

        it('should respond with a list of notifications for the local user', async () => {
            const res = await get('user/notifications', 200);

            expects(res);

            expect(res.body.totalCount).toBe(2);
            expect(res.body.returnCount).toBe(2);

            expect(res.body.response[0].read).toBe(false);
            expect(res.body.response[1].read).toBe(true);
        });

        it('should respond with a limited list of notifications for the user when using the take query param', () =>
            takeTest(`user/notifications`, expects));

        it('should respond with a different list of notifications for the user when using the skip query param', () =>
            skipTest(`user/notifications`, expects));

        it('should respond with 401 when no access token is provided', () => get(`user/notifications`, 401, {}, null));
    });

    describe('PATCH /api/v1/user/notifications/{notifID}', () => {
        it('should update the notification', async () => {
            const res = await get('user/notifications', 200);

            expect(res.body.response[0].read).toBe(false);

            await patch(`user/notifications/${res.body.response[0].id}`, 204, { read: true });

            const res2 = await get('user/notifications', 200);

            expect(res2.body.response[0].read).toBe(true);
        });

        it('should respond with 400 if the body is invalid', () =>
            patch(`user/notifications/32476671243`, 400, { read: 'horse' }));

        it('should respond with 404 if the notification does not exist', () =>
            patch(`user/notifications/32476671243`, 404, { read: true }));

        it('should respond with 401 when no access token is provided', () =>
            patch(`user/notifications/1`, 401, {}, null));
    });

    describe('DELETE /api/v1/user/notifications/{notifID}', () => {
        it('should delete the notification', async () => {
            const res = await get('user/notifications', 200);

            expect(res.body.response[0].read).toBe(false);

            await del(`user/notifications/${res.body.response[0].id}`, 204);

            const res2 = await get('user/notifications', 200);

            expect(res2.body.response[0].id).not.toBe(res.body.response[0].id);
        });

        it('should respond with 404 if the notification does not exist', () =>
            del(`user/notifications/324512341243`, 404));

        it('should respond with 401 when no access token is provided', () => del(`user/notifications/1`, 401, null));
    });

    /*
        Some lengthy tests we could port later, probably near the end of porting, once the activities/notifications system is implemented.
        it('should respond with notification data', async () => {
        
            // testUser follows testUser2
            const res1 = await serv
                .post('/api/v1/user/follow')
                .set('Authorization', 'Bearer ' + global.accessToken)
                .send({
                    userID: user2.id
                })
                .expect(200);
        
            // changes the follow relationship between testUser and testUser2 to notify when a map is approved
            const res2 = await serv
                .patch('/api/v1/user/follow/' + user2.id)
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
                .get('/api/v1/user/notifications')
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
            .put('/api/v1/user/notifyMap/' + testMap.id)
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
