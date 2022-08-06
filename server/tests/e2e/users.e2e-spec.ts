// noinspection DuplicatedCode

import * as request from 'supertest';
import { expandTest, get, skipTest, takeTest } from '../util/test-util';
import { ActivityTypes } from '../../src/@common/enums/activity.enum';
import { PrismaService } from '../../src/modules/repo/prisma.service';
import { MapCreditType, MapStatus, MapType } from '../../src/@common/enums/map.enum';
import { AuthService } from '../../src/modules/auth/auth.service';
import { UserDto } from '../../src/@common/dto/user/user.dto';
import { ActivityDto } from '../../src/@common/dto/user/activity.dto';
import { ProfileDto } from '../../src/@common/dto/user/profile.dto';
import { FollowDto } from '../../src/@common/dto/user/followers.dto';
import { MapCreditDto } from '../../src/@common/dto/map/map-credit.dto';
import { RunDto } from '../../src/@common/dto/run/runs.dto';

describe('Users', () => {
    let user1, user2, user3, map1, map2, run1;

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
                gameType: MapType.SURF,
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
                gameType: MapType.SURF,
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
                hash: ''
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
                hash: ''
            }
        });

        const authService: AuthService = global.auth as AuthService;
        global.accessToken = (await authService.login(user1)).access_token;
    });

    afterEach(async () => {
        const prisma: PrismaService = global.prisma;

        await prisma.user.deleteMany({ where: { id: { in: [user1.id, user2.id, user3.id] } } });

        await prisma.map.deleteMany({ where: { id: { in: [map1.id, map2.id] } } });
    });

    describe(`GET /api/v1/users`, () => {
        const expects = (res: request.Response) => expect(res.body).toBeValidPagedDto(UserDto);

        it('should respond with array of users', async () => {
            const res = await get('users', 200);

            expects(res);
            expect(res.body.totalCount).toBeGreaterThanOrEqual(2);
            expect(res.body.returnCount).toBeGreaterThanOrEqual(2);
            expect(res.body.response[0]).not.toHaveProperty('profile');
        });

        it('should respond with array of users with take parameter', () => takeTest('users', expects));

        it('should respond with array of users with skip parameter', async () => skipTest('users', expects));

        it('should respond with array of users with search by alias parameter', async () => {
            const res = await get('users', 200, { search: user2.alias });

            expects(res);
            expect(res.body.totalCount).toBe(1);
            expect(res.body.returnCount).toBe(1);
            expect(res.body.response[0].alias).toBe(user2.alias);
        });

        it('should respond with an empty array of users using a search by parameter containing a nonexistent alias', async () => {
            const res = await get('users', 200, { search: 'Abstract Barry' });

            expect(res.body.totalCount).toBe(0);
            expect(res.body.returnCount).toBe(0);
            expect(res.body.response).toBeInstanceOf(Array);
        });

        it('should respond with array of users with expanded profiles when using an expand parameter', () =>
            expandTest('users', expects, 'profile', true, (u) => u.steamID === user1.steamID));

        it('should respond with an array of one user for a matching SteamID parameter', async () => {
            const res = await get('users', 200, { steamID: user1.steamID });

            expects(res);
            expect(res.body.totalCount).toBe(1);
            expect(res.body.returnCount).toBe(1);
        });

        it('should respond with an empty array for a nonexistent SteamID parameter', async () => {
            const res = await get('users', 200, { steamID: 3141592612921 });

            expect(res.body.totalCount).toBe(0);
            expect(res.body.returnCount).toBe(0);
            expect(res.body.response).toBeInstanceOf(Array);
        });

        it('should respond with an array of multiple users for multiple matching SteamID parameters', async () => {
            const res = await get('users', 200, { steamIDs: [user1.steamID + ',' + user2.steamID] });

            expects(res);
            expect(res.body.totalCount).toBe(2);
            expect(res.body.returnCount).toBe(2);
            expect(res.body.response[0].steamID).not.toBe(res.body.response[1].steamID);
        });

        it('should respond with should respond with an empty array for multiple nonexistent SteamID parameters', async () => {
            const res = await get('users', 200, { steamIDs: [21412341234 + ',' + 765474124] });

            expect(res.body.totalCount).toBe(0);
            expect(res.body.returnCount).toBe(0);
            expect(res.body.response).toBeInstanceOf(Array);
        });

        it('should respond with the specified user with with a corresponding map rank and run when given a mapRank mapid', async () => {
            const res = await get(`users`, 200, { mapRank: map1.id, steamID: user1.steamID });

            expects(res);
            expect(res.body.response[0]).toHaveProperty('mapRank');
            expect(res.body.response[0].mapRank.mapID).toBe(map1.id);
            expect(res.body.response[0].mapRank.userID).toBe(user1.id);
            expect(res.body.response[0].mapRank.runID).toBe(run1.id.toString());
            expect(res.body.response[0].mapRank.rank).toBe(1);
        });

        it('should respond with 401 when no access token is provided', () => get('users', 401, {}, null));
    });

    describe('GET /api/v1/users/{userID}', () => {
        const expects = (res) => expect(res.body).toBeValidDto(UserDto);

        it('should respond with the specified user', async () => {
            const res = await get(`users/${user1.id}`, 200);

            expects(res);
            expect(res.body.alias).toBe(user1.alias);
            expect(res.body).not.toHaveProperty('profile');
        });

        it('should respond with the specified user with a valid avatarURL', async () => {
            const res = await get(`users/${user2.id}`, 200);

            expects(res);
            expect(res.body).toHaveProperty('avatarURL');
            expect(res.body.avatarURL).toEqual(expect.stringContaining('https://avatars.cloudflare.steamstatic.com/'));
        });

        it('should respond with the specified user with expanded profile when using an expand parameter', () =>
            expandTest(`users/${user1.id}`, expects, 'profile'));

        it('should respond with the specified user with with a corresponding map rank and run when given a mapRank mapid', async () => {
            const res = await get(`users/${user1.id}`, 200, { mapRank: map1.id });

            expects(res);
            expect(res.body).toHaveProperty('mapRank');
            expect(res.body.mapRank.mapID).toBe(map1.id);
            expect(res.body.mapRank.userID).toBe(user1.id);
            expect(res.body.mapRank.runID).toBe(run1.id.toString());
            expect(res.body.mapRank.rank).toBe(1);
        });

        it('should respond with 401 when no access token is provided', () => get(`users/${user1.id}`, 401, {}, null));

        it('should respond with 404 if the user is not found', () => get('users/213445312', 404));
    });

    describe('GET /api/v1/users/{userID}/profile', () => {
        const expects = (res) => expect(res.body).toBeValidDto(ProfileDto);

        it('should respond with the specified users profile info', async () => {
            const res = await get(`users/${user1.id}/profile`, 200);
            expects(res);
        });

        it('should respond with 401 when no access token is provided', async () => {
            await get(`users/${user1.id}/profile`, 401, {}, null);
        });

        it('should respond with 404 if the profile is not found', async () => {
            await get(`users/9000000000009/profile`, 404);
        });
    });

    describe('GET /api/v1/users/{userID}/activities', () => {
        const expects = (res) => {
            expect(res.body).toBeValidPagedDto(ActivityDto);
            res.body.response.forEach((r) => expect(r.user.alias).toBe(user1.alias));
        };

        it('should respond with a list of activities related to the specified user', async () => {
            const res = await get(`users/${user1.id}/activities`, 200);

            expects(res);
            expect(res.body.totalCount).toBe(3);
            expect(res.body.returnCount).toBe(3);
        });

        it('should respond with a limited list of activities for the user when using the take query param', () =>
            takeTest(`users/${user1.id}/activities`, expects));

        it('should respond with a different list of activities for the user when using the skip query param', () =>
            skipTest(`users/${user1.id}/activities`, expects));

        it('should respond with a filtered list of activities for the user when using the type query param', async () => {
            const res = await get(`users/${user1.id}/activities`, 200, {
                type: ActivityTypes.MAP_UPLOADED
            });

            expects(res);
            expect(res.body.totalCount).toBe(1);
            expect(res.body.returnCount).toBe(1);
            expect(res.body.response[0].type).toBe(ActivityTypes.MAP_UPLOADED);
        });

        it('should respond with a filtered list of activities for the user when using the data query param', async () => {
            const res = await get(`users/${user1.id}/activities`, 200, {
                data: 101n
            });

            expects(res);
            expect(res.body.totalCount).toBe(2);
            expect(res.body.returnCount).toBe(2);
        });

        it('should respond with an empty list of activities for the user when using the data query param with nonexistent data', async () => {
            const res = await get(`users/${user1.id}/activities`, 200, {
                data: 1123412341n
            });
            expect(res.body.totalCount).toBe(0);
            expect(res.body.returnCount).toBe(0);
            expect(res.body.response).toBeInstanceOf(Array);
        });

        it('should respond with 401 when no access token is provided', async () =>
            get(`users/${user1.id}/activities`, 401, {}, null));
    });

    describe('GET /api/v1/users/{userID}/follows', () => {
        const expects = (res) => expect(res.body).toBeValidPagedDto(FollowDto);

        it('should respond with a list of users the specified user follows', async () => {
            const res = await get(`users/${user1.id}/follows`, 200);

            expects(res);
            expect(res.body.totalCount).toBe(2);
            expect(res.body.returnCount).toBe(2);
            expect(res.body.response[0].followee.alias).toBe(user1.alias);
            expect(res.body.response[0].followee.profile).toHaveProperty('bio');
            expect(res.body.response[0].followed.alias).toBe(user2.alias);
            expect(res.body.response[0].followed.profile).toHaveProperty('bio');
        });

        it('should respond with a limited list of follows for the user when using the take query param', () =>
            takeTest(`users/${user1.id}/follows`, expects));

        it('should respond with a different list of follows for the user when using the skip query param', () =>
            skipTest(`users/${user1.id}/follows`, expects));

        it('should return an empty list for a user who isnt following anyone', async () => {
            const res = await get(`users/${user2.id}/follows`, 200);

            expect(res.body.totalCount).toBe(0);
            expect(res.body.returnCount).toBe(0);
        });

        it('should respond with 401 when no access token is provided', () =>
            get(`users/${user1.id}/follows`, 401, {}, null));
    });

    describe('GET /api/v1/users/{userID}/followers', () => {
        const expects = (res) => expect(res.body).toBeValidPagedDto(FollowDto);

        it('should respond with a list of users that follow the specified user', async () => {
            const res = await get(`users/${user2.id}/followers`, 200);

            expect(res);
            expect(res.body.totalCount).toBe(2);
            expect(res.body.returnCount).toBe(2);
            expect(res.body.response[0].followee.alias).toBe(user1.alias);
            expect(res.body.response[0].followee.profile).toHaveProperty('bio');
            expect(res.body.response[0].followed.alias).toBe(user2.alias);
            expect(res.body.response[0].followed.profile).toHaveProperty('bio');
        });

        it('should respond with a limited list of followers for the user when using the take query param', () =>
            takeTest(`users/${user2.id}/followers`, expects));

        it('should respond with a different list of followers for the user when using the skip query param', () =>
            skipTest(`users/${user2.id}/followers`, expects));

        it('should return an empty list for a user who isnt followed by anyone', async () => {
            const res = await get(`users/${user1.id}/followers`, 200);

            expect(res.body.totalCount).toBe(0);
            expect(res.body.returnCount).toBe(0);
        });

        it('should respond with 401 when no access token is provided', () =>
            get(`users/${user1.id}/followers`, 401, {}, null));
    });

    describe('GET /api/v1/users/{userID}/credits', () => {
        const expects = (res) => expect(res.body).toBeValidPagedDto(MapCreditDto);
        it('should respond with a list of map credits for a specific user', async () => {
            const res = await get(`users/${user1.id}/credits`, 200);

            expect(res.body.totalCount).toBe(2);
            expect(res.body.returnCount).toBe(2);
            expects(res);
        });

        it('should respond with limited list of credits with take parameter', () =>
            takeTest(`users/${user1.id}/credits`, expects));

        it('should respond with different list of credits with skip parameter', () =>
            skipTest(`users/${user1.id}/credits`, expects));

        it('should respond with 401 when no access token is provided', () =>
            get(`users/${user1.id}/followers`, 401, {}, null));
    });

    describe('GET /api/v1/users/{userID}/runs', () => {
        const expects = (res) => {
            expect(res.body).toBeValidPagedDto(RunDto);
            res.body.response.forEach((r) => expect(r.time).toBe(r.ticks * r.tickRate));
        };

        it('should respond with a list of runs for a specific user', async () => {
            const res = await get(`users/${user1.id}/runs`, 200);

            expects(res);
            expect(res.body.totalCount).toBe(2);
            expect(res.body.returnCount).toBe(2);
            expect(res.body.response[0].user.id).toEqual(user1.id);
            expect(res.body.response[0].map.id).toEqual(map1.id);
        });

        it('should respond with limited list of runs with take parameter', () =>
            takeTest(`users/${user1.id}/runs`, expects));

        it('should respond with different list of runs with skip parameter', () =>
            skipTest(`users/${user1.id}/runs`, expects));

        it('should respond with 401 when no access token is provided', () =>
            get(`users/${user1.id}/runs`, 401, {}, null));
    });
});
