// noinspection DuplicatedCode

import * as request from 'supertest';
import { get } from '../util/request-handlers.util';
import { ActivityTypes } from '@common/enums/activity.enum';
import { PrismaService } from '@modules/repo/prisma.service';
import { MapCreditType, MapStatus, MapType } from '@common/enums/map.enum';
import { AuthService } from '@modules/auth/auth.service';
import { UserDto } from '@common/dto/user/user.dto';
import { ActivityDto } from '@common/dto/user/activity.dto';
import { ProfileDto } from '@common/dto/user/profile.dto';
import { FollowDto } from '@common/dto/user/followers.dto';
import { MapCreditDto } from '@common/dto/map/map-credit.dto';
import { RunDto } from '@common/dto/run/run.dto';
import { expandTest, skipTest, takeTest } from '@tests/util/generic-e2e-tests.util';

describe('Users', () => {
    let user1, user1Token, user2, user3, map1, map2, run1;

    beforeEach(async () => {
        const prisma: PrismaService = global.prisma;

        user1 = await prisma.user.create({
            data: {
                steamID: '532521245234',
                country: 'GB',
                alias: 'Ron Weasley',
                roles: { create: { admin: true } },
                avatar: 'aaaaaa.jpg',
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
                steamID: '123456789',
                alias: 'Greg Rice',
                country: 'GB',
                avatar: 'ashoinudfgtbasidf87asdf',
                profile: {
                    create: {
                        bio: "Holy shit, it's Greg Rice!"
                    }
                }
            }
        });

        user3 = await prisma.user.create({
            data: {
                steamID: '4234256789',
                alias: 'George Weasley',
                country: 'GB',
                avatar: '123z4li12t34z1234',
                profile: {
                    create: {
                        bio: "George Weasley (b. 1 April, 1978) was an English pure-blood wizard, the fifth son and the less dominant among the twins of Arthur Weasley and Molly Weasley (née Prewett), younger brother of Bill, Charlie and Percy, younger twin brother and best friend of the late Fred Weasley, and older brother to Ron and Ginny. George's first few years were marked by the height of the First Wizarding War and Lord Voldemort's first fall."
                    }
                }
            }
        });

        await prisma.activity.createMany({
            data: [
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
                }
            ]
        });

        await prisma.follow.createMany({
            data: [
                {
                    followeeID: user1.id,
                    followedID: user2.id
                },
                {
                    followeeID: user1.id,
                    followedID: user3.id
                },
                {
                    followeeID: user3.id,
                    followedID: user2.id
                }
            ]
        });

        map1 = await prisma.map.create({
            data: {
                name: 'test_map_one',
                type: MapType.SURF,
                statusFlag: MapStatus.APPROVED,
                submitter: { connect: { id: user1.id } },
                credits: {
                    create: {
                        type: MapCreditType.AUTHOR,
                        user: { connect: { id: user1.id } }
                    }
                }
            }
        });

        map2 = await prisma.map.create({
            data: {
                name: 'test_map_two',
                type: MapType.SURF,
                statusFlag: MapStatus.NEEDS_REVISION,
                submitter: { connect: { id: user1.id } },
                credits: {
                    create: {
                        type: MapCreditType.AUTHOR,
                        user: { connect: { id: user1.id } }
                    }
                }
            }
        });

        run1 = await prisma.run.create({
            data: {
                map: { connect: { id: map1.id } },
                user: { connect: { id: user1.id } },
                trackNum: 1,
                zoneNum: 1,
                ticks: 10000,
                tickRate: 100,
                time: 1000000,
                flags: 0,
                file: '',
                hash: '7e020271296998570130e9be83f8ce44b39b843b'
            }
        });

        await prisma.userMapRank.create({
            data: {
                user: { connect: { id: user1.id } },
                map: { connect: { id: map1.id } },
                rank: 1,
                gameType: MapType.SURF,
                run: {
                    connect: {
                        id: run1.id
                    }
                }
            }
        });

        await prisma.run.create({
            data: {
                map: { connect: { id: map2.id } },
                user: { connect: { id: user1.id } },
                trackNum: 1,
                zoneNum: 1,
                ticks: 10000,
                tickRate: 100,
                time: 1000000,
                flags: 0,
                file: '',
                hash: '7e16b5527c77ea58bac36dddda6f5b444f32e81b'
            }
        });

        const authService: AuthService = global.auth as AuthService;
        user1Token = (await authService.loginWeb(user1)).accessToken;
    });

    afterEach(async () => {
        const prisma: PrismaService = global.prisma;

        await prisma.user.deleteMany({ where: { id: { in: [user1.id, user2.id, user3.id] } } });

        await prisma.map.deleteMany({ where: { id: { in: [map1.id, map2.id] } } });
    });

    describe(`GET /api/users`, () => {
        const expects = (res: request.Response) => expect(res.body).toBeValidPagedDto(UserDto);

        it('should respond with array of users', async () => {
            const res = await get({
                url: 'users',
                status: 200,
                token: user1Token
            });

            expects(res);
            expect(res.body.totalCount).toBeGreaterThanOrEqual(2);
            expect(res.body.returnCount).toBeGreaterThanOrEqual(2);
            expect(res.body.response[0]).not.toHaveProperty('profile');
        });

        it('should respond with array of users with take parameter', () =>
            takeTest({
                url: 'users',
                test: expects,
                token: user1Token
            }));

        it('should respond with array of users with skip parameter', async () =>
            skipTest({
                url: 'users',
                test: expects,
                token: user1Token
            }));

        it('should respond with array of users with search by alias parameter', async () => {
            const res = await get({
                url: 'users',
                status: 200,
                query: { search: user2.alias },
                token: user1Token
            });

            expects(res);
            expect(res.body.totalCount).toBe(1);
            expect(res.body.returnCount).toBe(1);
            expect(res.body.response[0].alias).toBe(user2.alias);
        });

        it('should respond with an empty array of users using a search by parameter containing a nonexistent alias', async () => {
            const res = await get({
                url: 'users',
                status: 200,
                query: { search: 'Abstract Barry' },
                token: user1Token
            });

            expect(res.body.totalCount).toBe(0);
            expect(res.body.returnCount).toBe(0);
            expect(res.body.response).toBeInstanceOf(Array);
        });

        it('should respond with array of users with expanded profiles when using an expand parameter', () =>
            expandTest({
                url: 'users',
                test: expects,
                expand: 'profile',
                paged: true,
                filter: (u) => u.steamID === user1.steamID,
                token: user1Token
            }));

        it('should respond with an array of one user for a matching SteamID parameter', async () => {
            const res = await get({
                url: 'users',
                status: 200,
                query: { steamID: user1.steamID },
                token: user1Token
            });

            expects(res);
            expect(res.body.totalCount).toBe(1);
            expect(res.body.returnCount).toBe(1);
        });

        it('should respond with an empty array for a nonexistent SteamID parameter', async () => {
            const res = await get({
                url: 'users',
                status: 200,
                query: { steamID: 3141592612921 },
                token: user1Token
            });

            expect(res.body.totalCount).toBe(0);
            expect(res.body.returnCount).toBe(0);
            expect(res.body.response).toBeInstanceOf(Array);
        });

        it('should respond with an array of multiple users for multiple matching SteamID parameters', async () => {
            const res = await get({
                url: 'users',
                status: 200,
                query: { steamIDs: [user1.steamID + ',' + user2.steamID] },
                token: user1Token
            });

            expects(res);
            expect(res.body.totalCount).toBe(2);
            expect(res.body.returnCount).toBe(2);
            expect(res.body.response[0].steamID).not.toBe(res.body.response[1].steamID);
        });

        it('should respond with should respond with an empty array for multiple nonexistent SteamID parameters', async () => {
            const res = await get({
                url: 'users',
                status: 200,
                query: { steamIDs: [21412341234 + ',' + 765474124] },
                token: user1Token
            });

            expect(res.body.totalCount).toBe(0);
            expect(res.body.returnCount).toBe(0);
            expect(res.body.response).toBeInstanceOf(Array);
        });

        it('should respond with the specified user with with a corresponding map rank and run when given a mapRank mapid', async () => {
            const res = await get({
                url: `users`,
                status: 200,
                query: { mapRank: map1.id, steamID: user1.steamID },
                token: user1Token
            });

            expects(res);
            expect(res.body.response[0]).toHaveProperty('mapRank');
            expect(res.body.response[0].mapRank.mapID).toBe(map1.id);
            expect(res.body.response[0].mapRank.userID).toBe(user1.id);
            expect(res.body.response[0].mapRank.runID).toBe(Number(run1.id));
            expect(res.body.response[0].mapRank.rank).toBe(1);
        });

        it('should respond with 401 when no access token is provided', () =>
            get({
                url: 'users',
                status: 401
            }));
    });

    describe('GET /api/users/{userID}', () => {
        const expects = (res) => expect(res.body).toBeValidDto(UserDto);

        it('should respond with the specified user', async () => {
            const res = await get({
                url: `users/${user1.id}`,
                status: 200,
                token: user1Token
            });

            expects(res);
            expect(res.body.alias).toBe(user1.alias);
            expect(res.body).not.toHaveProperty('profile');
        });

        it('should respond with the specified user with a valid avatarURL', async () => {
            const res = await get({
                url: `users/${user2.id}`,
                status: 200,
                token: user1Token
            });
            expects(res);
            expect(res.body).toHaveProperty('avatarURL');
            expect(res.body.avatarURL).toEqual(expect.stringContaining('https://avatars.cloudflare.steamstatic.com/'));
        });

        it('should respond with the specified user with expanded profile when using an expand parameter', () =>
            expandTest({
                url: `users/${user1.id}`,
                test: expects,
                expand: 'profile',
                token: user1Token
            }));

        it('should respond with the specified user with with a corresponding map rank and run when given a mapRank mapid', async () => {
            const res = await get({
                url: `users/${user1.id}`,
                status: 200,
                query: { mapRank: map1.id },
                token: user1Token
            });

            expects(res);
            expect(res.body).toHaveProperty('mapRank');
            expect(res.body.mapRank.mapID).toBe(map1.id);
            expect(res.body.mapRank.userID).toBe(user1.id);
            expect(res.body.mapRank.runID).toBe(Number(run1.id));
            expect(res.body.mapRank.rank).toBe(1);
        });

        it('should respond with 404 if the user is not found', () =>
            get({
                url: 'users/213445312',
                status: 404,
                token: user1Token
            }));
    });

    it('should respond with 401 when no access token is provided', () =>
        get({
            url: `users/${user1.id}`,
            status: 401
        }));

    describe('GET /api/users/{userID}/profile', () => {
        const expects = (res) => expect(res.body).toBeValidDto(ProfileDto);

        it('should respond with the specified users profile info', async () => {
            const res = await get({
                url: `users/${user1.id}/profile`,
                status: 200,
                token: user1Token
            });
            expects(res);
        });

        it('should respond with 401 when no access token is provided', async () => {
            await get({
                url: `users/${user1.id}/profile`,
                status: 401
            });
        });

        it('should respond with 404 if the profile is not found', async () => {
            await get({
                url: `users/9000000000009/profile`,
                status: 404,
                token: user1Token
            });
        });
    });

    describe('GET /api/users/{userID}/activities', () => {
        const expects = (res) => {
            expect(res.body).toBeValidPagedDto(ActivityDto);
            for (const r of res.body.response) expect(r.user.alias).toBe(user1.alias);
        };

        it('should respond with a list of activities related to the specified user', async () => {
            const res = await get({
                url: `users/${user1.id}/activities`,
                status: 200,
                token: user1Token
            });

            expects(res);
            expect(res.body.totalCount).toBe(3);
            expect(res.body.returnCount).toBe(3);
        });

        it('should respond with a limited list of activities for the user when using the take query param', () =>
            takeTest({
                url: `users/${user1.id}/activities`,
                test: expects,
                token: user1Token
            }));

        it('should respond with a different list of activities for the user when using the skip query param', () =>
            skipTest({
                url: `users/${user1.id}/activities`,
                test: expects,
                token: user1Token
            }));

        it('should respond with a filtered list of activities for the user when using the type query param', async () => {
            const res = await get({
                url: `users/${user1.id}/activities`,
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

        it('should respond with a filtered list of activities for the user when using the data query param', async () => {
            const res = await get({
                url: `users/${user1.id}/activities`,
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

        it('should respond with an empty list of activities for the user when using the data query param with nonexistent data', async () => {
            const res = await get({
                url: `users/${user1.id}/activities`,
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

        it('should respond with 401 when no access token is provided', async () =>
            get({
                url: `users/${user1.id}/activities`,
                status: 401
            }));
    });

    describe('GET /api/users/{userID}/follows', () => {
        const expects = (res) => expect(res.body).toBeValidPagedDto(FollowDto);

        it('should respond with a list of users the specified user follows', async () => {
            const res = await get({
                url: `users/${user1.id}/follows`,
                status: 200,
                token: user1Token
            });

            expects(res);
            expect(res.body.totalCount).toBe(2);
            expect(res.body.returnCount).toBe(2);
            expect(res.body.response[0].followee.alias).toBe(user1.alias);
            expect(res.body.response[0].followee.profile).toHaveProperty('bio');
            expect(res.body.response[0].followed.alias).toBe(user2.alias);
            expect(res.body.response[0].followed.profile).toHaveProperty('bio');
        });

        it('should respond with a limited list of follows for the user when using the take query param', () =>
            takeTest({
                url: `users/${user1.id}/follows`,
                test: expects,
                token: user1Token
            }));

        it('should respond with a different list of follows for the user when using the skip query param', () =>
            skipTest({
                url: `users/${user1.id}/follows`,
                test: expects,
                token: user1Token
            }));

        it('should return an empty list for a user who isnt following anyone', async () => {
            const res = await get({
                url: `users/${user2.id}/follows`,
                status: 200,
                token: user1Token
            });

            expect(res.body.totalCount).toBe(0);
            expect(res.body.returnCount).toBe(0);
        });

        it('should respond with 401 when no access token is provided', () =>
            get({
                url: `users/${user1.id}/follows`,
                status: 401
            }));
    });

    describe('GET /api/users/{userID}/followers', () => {
        const expects = (res) => expect(res.body).toBeValidPagedDto(FollowDto);

        it('should respond with a list of users that follow the specified user', async () => {
            const res = await get({
                url: `users/${user2.id}/followers`,
                status: 200,
                token: user1Token
            });

            expect(res);
            expect(res.body.totalCount).toBe(2);
            expect(res.body.returnCount).toBe(2);
            expect(res.body.response[0].followee.alias).toBe(user1.alias);
            expect(res.body.response[0].followee.profile).toHaveProperty('bio');
            expect(res.body.response[0].followed.alias).toBe(user2.alias);
            expect(res.body.response[0].followed.profile).toHaveProperty('bio');
        });

        it('should respond with a limited list of followers for the user when using the take query param', () =>
            takeTest({
                url: `users/${user2.id}/followers`,
                test: expects,
                token: user1Token
            }));

        it('should respond with a different list of followers for the user when using the skip query param', () =>
            skipTest({
                url: `users/${user2.id}/followers`,
                test: expects,
                token: user1Token
            }));

        it('should return an empty list for a user who isnt followed by anyone', async () => {
            const res = await get({
                url: `users/${user1.id}/followers`,
                status: 200,
                token: user1Token
            });

            expect(res.body.totalCount).toBe(0);
            expect(res.body.returnCount).toBe(0);
        });

        it('should respond with 401 when no access token is provided', () =>
            get({
                url: `users/${user1.id}/followers`,
                status: 401
            }));
    });

    describe('GET /api/users/{userID}/credits', () => {
        const expects = (res) => expect(res.body).toBeValidPagedDto(MapCreditDto);
        it('should respond with a list of map credits for a specific user', async () => {
            const res = await get({
                url: `users/${user1.id}/credits`,
                status: 200,
                token: user1Token
            });

            expect(res.body.totalCount).toBe(2);
            expect(res.body.returnCount).toBe(2);
            expects(res);
        });

        it('should respond with limited list of credits with take parameter', () =>
            takeTest({
                url: `users/${user1.id}/credits`,
                test: expects,
                token: user1Token
            }));

        it('should respond with different list of credits with skip parameter', () =>
            skipTest({
                url: `users/${user1.id}/credits`,
                test: expects,
                token: user1Token
            }));

        it('should respond with 401 when no access token is provided', () =>
            get({
                url: `users/${user1.id}/followers`,
                status: 401
            }));
    });

    describe('GET /api/users/{userID}/runs', () => {
        const expects = (res) => {
            expect(res.body).toBeValidPagedDto(RunDto);
            for (const r of res.body.response) expect(r.time).toBe(r.ticks * r.tickRate);
        };

        it('should respond with a list of runs for a specific user', async () => {
            const res = await get({
                url: `users/${user1.id}/runs`,
                status: 200,
                token: user1Token
            });

            expects(res);
            expect(res.body.totalCount).toBe(2);
            expect(res.body.returnCount).toBe(2);
            expect(res.body.response[0].user.id).toEqual(user1.id);
            expect(res.body.response[0].map.id).toEqual(map1.id);
        });

        it('should respond with limited list of runs with take parameter', () =>
            takeTest({
                url: `users/${user1.id}/runs`,
                test: expects,
                token: user1Token
            }));

        it('should respond with different list of runs with skip parameter', () =>
            skipTest({
                url: `users/${user1.id}/runs`,
                test: expects,
                token: user1Token
            }));

        it('should respond with 401 when no access token is provided', () =>
            get({
                url: `users/${user1.id}/runs`,
                status: 401
            }));
    });
});
