// noinspection DuplicatedCode
import { PrismaService } from '@modules/repo/prisma.service';
import { del, get, getNoContent, patch, post, put } from '../util/request-handlers.util';
import { AuthService } from '@modules/auth/auth.service';
import { ActivityTypes } from '@common/enums/activity.enum';
import { ReportType, ReportCategory } from '@common/enums/report.enum';
import { UserDto } from '@common/dto/user/user.dto';
import { XpSystemsDto } from '@/common/dto/xp-systems/xp-systems.dto';
import { RankXpParams, CosXpParams } from '@modules/xp-systems/xp-systems.interface';
import { ReportDto } from '@common/dto/report/report.dto';
import { skipTest, takeTest } from '../util/generic-e2e-tests.util';

describe('Admin', () => {
    let adminUser,
        adminUserToken,
        adminGameUserToken,
        adminUser2,
        modUser,
        modUser2,
        nonAdminUser,
        nonAdminAccessToken,
        modUserToken,
        user1,
        user2,
        mergeUser1,
        mergeUser2,
        report1;
    //report2;
    // map1,
    // map2,
    // map3;
    /*const testUser = {
        id: 1,
        steamID: '1254652365',
        roles: Roles.VERIFIED,
        bans: 0
    };

    const testAdmin = {
        id: 2,
        steamID: '9856321549856',
        roles: Roles.ADMIN,
        bans: 0
    };

    const testAdminGame = {
        id: 3,
        steamID: '5698752164498',
        roles: Roles.ADMIN,
        bans: 0
    };
    const testDeleteUser = {
        id: 4,
        steamID: '1351351321',
        roles: 0,
        bans: 0
    };
    let testMergeUser1;
    let testMergeUser2;

    const testMap = {
        name: 'test_map',
        type: MapType.UNKNOWN,
        id: 1,
        statusFlag: MapStatus.APPROVED,
        submitterID: testUser.id,
        info: {
            description: 'newmap_5',
            numTracks: 1,
            creationDate: new Date()
        },
        tracks: [
            {
                trackNum: 0,
                numZones: 1,
                difficulty: 2,
                isLinear: false
            }
        ],
        credits: {
            id: 1,
            type: MapCreditType.AUTHOR,
            userID: testUser.id
        }
    };

    const testMap2 = {
        id: 2,
        name: 'test_map2',
        submitterID: testUser.id,
        info: {
            description: 'My first map!!!!',
            numTracks: 1,
            creationDate: new Date()
        },
        tracks: [
            {
                trackNum: 0,
                numZones: 1,
                difficulty: 5,
                isLinear: true
            }
        ],
        credits: {
            id: 2,
            type: MapCreditType.AUTHOR,
            userID: testUser.id
        }
    };
    const testMap3 = {
        id: 3,
        name: 'test_map3',
        submitterID: testUser.id,
        info: {
            description: 'My first map!!!!',
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
        credits: {
            id: 3,
            type: MapCreditType.AUTHOR,
            userID: testUser.id
        }
    };
    const testMap4 = {
        id: 4,
        name: 'test_map4',
        submitterID: testUser.id,
        info: {
            description: 'My first map!!!!',
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
        credits: {
            id: 4,
            type: MapCreditType.AUTHOR,
            userID: testUser.id
        }
    };
    const testMap5 = {
        id: 5,
        name: 'test_map5',
        submitterID: testAdmin.id,
        info: {
            description: 'My first map!!!!',
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
        credits: {
            id: 5,
            type: MapCreditType.AUTHOR,
            userID: testAdmin.id
        }
    };
    const testMap6 = {
        id: 6,
        name: 'test_map6',
        submitterID: testAdmin.id,
        info: {
            description: 'My first map!!!!',
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
        credits: {
            id: 6,
            type: MapCreditType.AUTHOR,
            userID: testAdmin.id
        }
    };
    const uniqueMap = {
        id: 7,
        name: 'unique_map7',
        submitterID: testAdmin.id,
        info: {
            description: 'My first map!!!!',
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
        credits: {
            id: 7,
            type: MapCreditType.AUTHOR,
            userID: testAdmin.id
        }
    };
    const testReport = {
        id: 1,
        data: 1,
        type: ReportType.USER_PROFILE_REPORT,
        category: ReportCategory.OTHER,
        submitterID: testUser.id,
        message: 'I am who I am who am I?',
        resolved: false,
        resolutionMessage: ''
    };
    const testReport2 = {
        id: 2,
        data: 1,
        tpe: ReportType.MAP_REPORT,
        category: ReportCategory.OTHER,
        submitterID: testUser.id,
        message: 'What are you doing',
        resolved: true,
        resolutionMessage: 'idk what im doing'
    };*/

    beforeEach(async () => {
        const prisma: PrismaService = global.prisma;

        adminUser = await prisma.user.create({
            data: {
                steamID: '234523452345',
                alias: 'Admin User',
                avatar: '',
                roles: { create: { admin: true } },
                country: 'GB',
                profile: {
                    create: {
                        bio: 'Arthur Weasley (b. 6 February, 1950) was an English pure-blood wizard in the employ of the Ministry of Magic, as well as a member of the second Order of the Phoenix. He was a staunch believer in the equality of all magical and Muggle folk and was the head of the Weasley family.'
                    }
                }
            }
        });

        adminUser2 = await prisma.user.create({
            data: {
                steamID: '2385764545',
                alias: 'Admin User 2',
                avatar: '',
                roles: { create: { admin: true } },
                country: 'GB'
            }
        });

        modUser = await prisma.user.create({
            data: {
                steamID: '657856782',
                alias: 'Mod User',
                avatar: '',
                roles: { create: { moderator: true } },
                country: 'GB'
            }
        });

        modUser2 = await prisma.user.create({
            data: {
                steamID: '142341234',
                alias: 'Mod User 2',
                avatar: '',
                roles: { create: { moderator: true } },
                country: 'GB'
            }
        });

        nonAdminUser = await prisma.user.create({
            data: {
                steamID: '7863245554',
                alias: 'Non Admin User',
                profile: {
                    create: {
                        bio: 'Charles "Charlie" Weasley (b. 12 December, 1972) was an English pure-blood wizard, the second eldest son of Arthur and Molly Weasley (née Prewett), younger brother of Bill Weasley and the elder brother of Percy, the late Fred, George, Ron, and Ginny.'
                    }
                }
            }
        });

        user1 = await prisma.user.create({
            data: {
                steamID: '41234523452345',
                alias: 'U1',
                roles: { create: { verified: true } },
                bans: { create: { bio: true } },
                profile: {
                    create: {
                        bio: 'Feed me'
                    }
                }
            }
        });

        user2 = await prisma.user.create({
            data: {
                steamID: '12341234214521',
                alias: 'U2',
                roles: { create: { verified: true } }
            }
        });

        mergeUser1 = await prisma.user.create({
            data: {
                steamID: '612374578254',
                alias: 'MU1',
                roles: { create: { placeholder: true } }
            }
        });

        mergeUser2 = await prisma.user.create({
            data: {
                steamID: '5234523451',
                alias: 'MU2'
            }
        });

        await prisma.follow.createMany({
            data: [
                {
                    followeeID: user1.id,
                    followedID: mergeUser1.id
                },
                {
                    followeeID: user2.id,
                    followedID: mergeUser1.id,
                    notifyOn: ActivityTypes.MAP_APPROVED,
                    createdAt: new Date('12/24/2021')
                },
                {
                    followeeID: user2.id,
                    followedID: mergeUser2.id,
                    notifyOn: ActivityTypes.MAP_UPLOADED,
                    createdAt: new Date('12/25/2021')
                },
                {
                    followeeID: mergeUser2.id,
                    followedID: mergeUser1.id
                }
            ]
        });

        await prisma.activity.createMany({
            data: [
                {
                    type: ActivityTypes.REPORT_FILED,
                    userID: mergeUser1.id,
                    data: 123456n
                }
            ]
        });

        report1 = await prisma.report.create({
            data: {
                data: 1,
                type: ReportType.MAP_REPORT,
                category: ReportCategory.INAPPROPRIATE_CONTENT,
                message: 'report message',
                resolved: false,
                resolutionMessage: '',
                submitterID: user1.id
            }
        });

        await prisma.report.create({
            data: {
                data: 2,
                type: ReportType.USER_PROFILE_REPORT,
                category: ReportCategory.PLAGIARISM,
                message: 'report2 message',
                resolved: true,
                resolutionMessage: '2',
                submitterID: user2.id
            }
        });

        if ((await prisma.xpSystems.count()) === 0)
            await prisma.xpSystems.create({
                data: {
                    id: 1,
                    rankXP: {
                        top10: {
                            WRPoints: 3000,
                            rankPercentages: [1, 0.75, 0.68, 0.61, 0.57, 0.53, 0.505, 0.48, 0.455, 0.43]
                        },
                        groups: {
                            maxGroups: 4,
                            groupMinSizes: [10, 45, 125, 250],
                            groupExponents: [0.5, 0.56, 0.62, 0.68],
                            groupPointPcts: [0.2, 0.13, 0.07, 0.03],
                            groupScaleFactors: [1, 1.5, 2, 2.5]
                        },
                        formula: { A: 50000, B: 49 }
                    } as RankXpParams,

                    cosXP: {
                        levels: {
                            maxLevels: 500,
                            startingValue: 20000,
                            staticScaleStart: 101,
                            linearScaleInterval: 10,
                            staticScaleInterval: 25,
                            linearScaleBaseIncrease: 1000,
                            staticScaleBaseMultiplier: 1.5,
                            linearScaleIntervalMultiplier: 1,
                            staticScaleIntervalMultiplier: 0.5
                        },
                        completions: {
                            repeat: { tierScale: { bonus: 40, linear: 20, staged: 40, stages: 5 } },
                            unique: { tierScale: { linear: 2500, staged: 2500 } }
                        }
                    } as CosXpParams,
                    createdAt: new Date('12/24/2021'),
                    updatedAt: new Date('12/25/2021')
                }
            });

        const authService = global.auth as AuthService;
        adminUserToken = (await authService.loginWeb(adminUser)).accessToken;
        nonAdminAccessToken = (await authService.loginWeb(nonAdminUser)).accessToken;
        modUserToken = (await authService.loginWeb(modUser)).accessToken;
        adminGameUserToken = (await authService.loginGame(modUser)).token;
    });

    afterEach(async () => {
        const prisma: PrismaService = global.prisma;

        await prisma.user.deleteMany({
            where: {
                id: {
                    in: [
                        adminUser.id,
                        adminUser2.id,
                        modUser.id,
                        modUser2.id,
                        nonAdminUser.id,
                        mergeUser1.id,
                        mergeUser2.id,
                        user1.id,
                        user2.id
                    ]
                }
            }
        });

        await prisma.xpSystems.delete({
            where: { id: 1 }
        });
        await prisma.report.deleteMany();
    });

    describe('POST /api/admin/users', () => {
        it('should successfully create a placeholder user', async () => {
            const res = await post({
                url: 'admin/users/',
                status: 201,
                body: { alias: 'Burger' },
                token: adminUserToken
            });

            expect(res.body).toBeValidDto(UserDto);
            expect(res.body.alias).toBe('Burger');
        });

        it('should respond with 403 when the user requesting only is a moderator', () =>
            post({
                url: 'admin/users/',
                status: 403,
                body: { alias: 'Barry 2' },
                token: modUserToken
            }));

        it('should respond with 403 when the user requesting is not an admin', () =>
            post({
                url: 'admin/users/',
                status: 403,
                body: { alias: 'Barry 2' },
                token: nonAdminAccessToken
            }));

        it('should respond with 401 when no access token is provided', () =>
            post({
                url: 'admin/users/',
                status: 401
            }));
    });

    describe('POST /api/admin/users/merge', () => {
        it('should merge two accounts together', async () => {
            const res = await post({
                url: 'admin/users/merge',
                status: 201,
                body: {
                    placeholderID: mergeUser1.id,
                    userID: mergeUser2.id
                },
                token: adminUserToken
            });

            expect(res.body).toBeValidDto(UserDto);
            expect(res.body.id).toBe(mergeUser2.id);
            expect(res.body.alias).toBe(mergeUser2.alias);

            // U1 was following MU1, that should be transferred to MU2.
            const u1Follows = await get({
                url: `users/${user1.id}/follows`,
                status: 200,
                token: adminUserToken
            });

            expect(u1Follows.body.response.some((f) => f.followed.id === mergeUser2.id)).toBe(true);

            // U2 was following MU1 and MU2, the creation data should be earliest of the two and the \notifyOn flags combined.
            const u2Follows = await get({
                url: `users/${user2.id}/follows`,
                status: 200,
                token: adminUserToken
            });
            const follow = u2Follows.body.response.find((f) => f.followed.id === mergeUser2.id);
            expect(new Date(follow.createdAt)).toEqual(new Date('12/24/2021'));
            expect(follow.notifyOn).toBe(ActivityTypes.MAP_APPROVED | ActivityTypes.MAP_UPLOADED);

            // MU2 was following MU1, that should be deleted
            const mu2follows = await get({
                url: `users/${mergeUser2.id}/follows`,
                status: 200,
                token: adminUserToken
            });
            expect(mu2follows.body.response.some((f) => f.followed.id === mergeUser1.id)).toBe(false);

            // MU1's activities should have been transferred to MU2
            const mu2Activities = await get({
                url: `users/${mergeUser2.id}/activities`,
                status: 200,
                token: adminUserToken
            });
            expect(mu2Activities.body.response[0].data).toBe(123456);

            // Placeholder should have been deleted
            await get({
                url: `users/${mergeUser1.id}`,
                status: 404,
                token: adminUserToken
            });
        });

        it('should respond with 400 if the user to merge from is not a placeholder', () =>
            post({
                url: 'admin/users/merge',
                status: 400,
                body: {
                    placeholderID: user1.id,
                    userID: mergeUser2.id
                },
                token: adminUserToken
            }));

        it('should respond with 400 if the user to merge from does not exist', () =>
            post({
                url: 'admin/users/merge',
                status: 400,
                body: {
                    placeholderID: 9812364981265872,
                    userID: mergeUser2.id
                },
                token: adminUserToken
            }));

        it('should respond with 400 if the user to merge to does not exist', () =>
            post({
                url: 'admin/users/merge',
                status: 400,
                body: {
                    placeholderID: mergeUser1.id,
                    userID: 2368745234521
                },
                token: adminUserToken
            }));

        it('should respond with 400 if the user to merge are the same user', () =>
            post({
                url: 'admin/users/merge',
                status: 400,
                body: {
                    placeholderID: mergeUser1.id,
                    userID: mergeUser1.id
                },
                token: adminUserToken
            }));

        it('should respond with 403 when the user requesting is only a moderator', () =>
            post({
                url: 'admin/users/merge',
                status: 403,
                body: {
                    placeholderID: mergeUser1.id,
                    userID: mergeUser2.id
                },
                token: modUserToken
            }));

        it('should respond with 403 when the user requesting is not an admin', () =>
            post({
                url: 'admin/users/merge',
                status: 403,
                body: {
                    placeholderID: mergeUser1.id,
                    userID: mergeUser2.id
                },
                token: nonAdminAccessToken
            }));

        it('should respond with 401 when no access token is provided', () =>
            post({
                url: 'admin/users/',
                status: 401
            }));
    });

    describe('PATCH /api/admin/users/{userID}', () => {
        it("should successfully update a specific user's alias", async () => {
            await patch({
                url: `admin/users/${user1.id}`,
                status: 204,
                body: { alias: 'Barry 2' },
                token: adminUserToken
            });

            const res = await get({
                url: `users/${user1.id}`,
                status: 200,
                token: adminUserToken
            });

            expect(res.body.alias).toBe('Barry 2');
        });

        it("should respond with 409 when an admin tries to set a verified user's alias to something used by another verified user", () =>
            patch({
                url: `admin/users/${user1.id}`,
                status: 409,
                body: { alias: user2.alias },
                token: adminUserToken
            }));

        it("should allow an admin to set a verified user's alias to something used by another unverified user", () =>
            patch({
                url: `admin/users/${user1.id}`,
                status: 204,
                body: { alias: modUser.alias },
                token: adminUserToken
            }));

        it("should allow an admin to set a unverified user's alias to something used by another verified user", () =>
            patch({
                url: `admin/users/${modUser.id}`,
                status: 204,
                body: { alias: user2.alias },
                token: adminUserToken
            }));

        it("should successfully update a specific user's bio", async () => {
            const bio = 'Im hungry';
            await patch({
                url: `admin/users/${user1.id}`,
                status: 204,
                body: { bio: bio },
                token: adminUserToken
            });

            const res = await get({
                url: `users/${user1.id}/profile`,
                status: 200,
                token: adminUserToken
            });

            expect(res.body.bio).toBe(bio);
        });

        it("should successfully update a specific user's bans", async () => {
            const bans = {
                avatar: true,
                leaderboards: true
            };

            await patch({
                url: `admin/users/${user1.id}`,
                status: 204,
                body: { bans: bans },
                token: adminUserToken
            });

            const userDB = await (global.prisma as PrismaService).user.findFirst({
                where: { id: user1.id },
                include: { bans: true }
            });

            expect(userDB.bans).toBe(bans);
        });

        it("should successfully update a specific user's roles", async () => {
            await patch({
                url: `admin/users/${user1.id}`,
                status: 204,
                body: { roles: { mapper: true } },
                token: adminUserToken
            });

            const userDB = await (global.prisma as PrismaService).user.findFirst({
                where: { id: user1.id },
                include: { roles: true }
            });

            expect(userDB.roles.mapper).toBe(true);
        });

        it('should allow an admin to make a regular user a moderator', () =>
            patch({
                url: `admin/users/${user1.id}`,
                status: 204,
                body: { roles: { moderator: true } },
                token: adminUserToken
            }));

        it("should allow an admin to update a moderator's roles", () =>
            patch({
                url: `admin/users/${modUser.id}`,
                status: 204,
                body: { roles: { mapper: true } },
                token: adminUserToken
            }));

        it('should allow an admin to remove a user as moderator', () =>
            patch({
                url: `admin/users/${modUser.id}`,
                status: 204,
                body: { roles: { moderator: false } },
                token: adminUserToken
            }));

        it("should not allow an admin to update another admin's roles", () =>
            patch({
                url: `admin/users/${adminUser2.id}`,
                status: 403,
                body: { roles: { mapper: true } },
                token: adminUserToken
            }));

        it('should allow an admin to update their own non-admin roles', () =>
            patch({
                url: `admin/users/${adminUser.id}`,
                status: 204,
                body: { roles: { mapper: true } },
                token: adminUserToken
            }));

        it('should allow an admin to update their own moderator role', () =>
            patch({
                url: `admin/users/${adminUser.id}`,
                status: 204,
                body: { roles: { moderator: true } },
                token: adminUserToken
            }));

        it('should allow an admin to update their own admin role', () =>
            patch({
                url: `admin/users/${adminUser.id}`,
                status: 204,
                body: { roles: { admin: false } },
                token: adminUserToken
            }));

        it("should successfully allow a moderator to update a specific user's roles", () =>
            patch({
                url: `admin/users/${user1.id}`,
                status: 204,
                body: { roles: { mapper: true } },
                token: modUserToken
            }));

        it('should not allow a moderator to make another user a moderator', () =>
            patch({
                url: `admin/users/${user1.id}`,
                status: 403,
                body: { roles: { moderator: true } },
                token: modUserToken
            }));

        it("should not allow a moderator to update another moderator's roles", () =>
            patch({
                url: `admin/users/${modUser2.id}`,
                status: 403,
                body: { roles: { moderator: false } },
                token: modUserToken
            }));

        it("should not allow a moderator to update an admin's roles", () =>
            patch({
                url: `admin/users/${adminUser2.id}`,
                status: 403,
                body: { roles: { mapper: true } },
                token: modUserToken
            }));

        it('should allow a moderator to update their own non-mod roles', () =>
            patch({
                url: `admin/users/${modUser.id}`,
                status: 204,
                body: { roles: { mapper: true } },
                token: modUserToken
            }));

        it('should not allow a moderator to update their own mod role', () =>
            patch({
                url: `admin/users/${modUser.id}`,
                status: 403,
                body: { roles: { moderator: false } },
                token: modUserToken
            }));

        it('should respond with 403 when the user requesting is not an admin', () =>
            patch({
                url: `admin/users/${user1.id}`,
                status: 403,
                body: { alias: 'Barry 2' },
                token: nonAdminAccessToken
            }));

        it('should respond with 401 when no access token is provided', () =>
            patch({
                url: `admin/users/${user1.id}`,
                status: 401
            }));

        it('should respond with 403 when authenticated from game', () =>
            patch({
                url: `admin/users/${user1.id}`,
                status: 403,
                body: { roles: { mapper: true } },
                token: adminGameUserToken
            }));
    });

    describe('DELETE /api/admin/users/{userID}', () => {
        it('should delete a user', async () => {
            await del({
                url: `admin/users/${user1.id}`,
                status: 204,
                token: adminUserToken
            });

            await get({
                url: `users/${user1.id}`,
                status: 404,
                token: adminUserToken
            });
        });

        it('should respond with 403 when the user requesting only is a moderator', () =>
            del({
                url: `admin/users/${user1.id}`,
                status: 403,
                token: modUserToken
            }));

        it('should respond with 403 when the user requesting is not an admin', () =>
            del({
                url: `admin/users/${user1.id}`,
                status: 403,
                token: nonAdminAccessToken
            }));

        it('should respond with 401 when no access token is provided', () =>
            del({
                url: `admin/users/${user1.id}`,
                status: 401
            }));
    });

    describe('GET /api/admin/reports', () => {
        const expects = (res) => expect(res.body).toBeValidPagedDto(ReportDto);
        it('should return a list of reports', async () => {
            const reports = await get({
                url: 'admin/reports',
                status: 200,
                token: adminUserToken
            });
            expect(reports.body).toBeValidPagedDto(ReportDto);
            expect(reports.body).toHaveProperty('response');
            expect(reports.body.returnCount).toBe(2);
            expect(reports.body.response[0].data).toBe(Number(report1.data));
            expect(reports.body.response[0].type).toBe(report1.type);
            expect(reports.body.response[0].category).toBe(report1.category);
            expect(reports.body.response[0].message).toBe(report1.message);
            expect(reports.body.response[0].resolved).toBe(report1.resolved);
            expect(reports.body.response[0].resolutionMessage).toBe(report1.resolutionMessage);
            expect(reports.body.response[0].submitterID).toBe(report1.submitterID);
        });

        it('should only return resolved or non resolved based on query param resolved', async () => {
            const reportsResolved = await get({
                url: 'admin/reports',
                status: 200,
                query: {
                    resolved: true
                },
                token: adminUserToken
            });
            expect(reportsResolved.body).toBeValidPagedDto(ReportDto);
            expect(reportsResolved.body.returnCount).toBe(1);
            expect(reportsResolved.body.response[0].resolved).toBe(true);

            const reportsNonResolved = await get({
                url: 'admin/reports',
                status: 200,
                query: {
                    resolved: false
                },
                token: adminUserToken
            });
            expect(reportsNonResolved.body).toBeValidPagedDto(ReportDto);
            expect(reportsNonResolved.body.returnCount).toBe(1);
            expect(reportsNonResolved.body.response[0].resolved).toBe(false);
        });

        it('should limit the result set when using the take query param', () =>
            takeTest({
                url: 'admin/reports',
                test: expects,
                token: adminUserToken
            }));

        it('should skip some of the result set when using the skip query param', () =>
            skipTest({
                url: 'admin/reports',
                test: expects,
                token: adminUserToken
            }));

        it('should return 403 if a non admin access token is given', () =>
            getNoContent({
                url: 'admin/reports',
                status: 403,
                token: nonAdminAccessToken
            }));

        it('should return 401 if no access token is given', () =>
            getNoContent({
                url: 'admin/reports',
                status: 401
            }));
    });

    describe('PATCH /api/admin/reports/{reportID}', () => {
        it('should edit a report', async () => {
            await patch({
                url: `admin/reports/${report1.id}`,
                status: 204,
                body: {
                    resolved: true,
                    resolutionMessage: 'resolved'
                },
                token: adminUserToken
            });
            const changedReport = await (global.prisma as PrismaService).report.findFirst({
                where: {
                    id: report1.id
                }
            });
            expect(changedReport.resolved).toBe(true);
            expect(changedReport.resolutionMessage).toBe('resolved');
            expect(changedReport.resolverID).toBe(adminUser.id);
        });

        it('should return 404 if targeting a nonexistent report', () =>
            patch({
                url: 'admin/reports/9999999999',
                status: 404,
                body: {
                    resolved: true,
                    resolutionMessage: 'resolved'
                },
                token: adminUserToken
            }));

        it('should return 403 if a non admin access token is given', () =>
            patch({
                url: `admin/reports/${report1.id}`,
                status: 403,
                token: nonAdminAccessToken
            }));

        it('should return 401 if no access token is given', () =>
            patch({
                url: `admin/reports/${report1.id}`,
                status: 401
            }));
    });

    describe('GET /api/admin/xpsys', () => {
        const expects = (res) => expect(res.body).toBeValidDto(XpSystemsDto);

        it('should respond with the current XP System variables when the user is an admin', async () => {
            const res = await get({
                url: 'admin/xpsys/',
                status: 200,
                token: adminUserToken
            });

            expects(res);
        });

        it('should respond with the current XP System variables when the user is a moderator', async () => {
            const res = await get({
                url: 'admin/xpsys/',
                status: 200,
                token: modUserToken
            });

            expects(res);
        });

        it('should respond with 403 when the user requesting is not an admin', () =>
            get({
                url: 'admin/xpsys/',
                status: 403,
                token: nonAdminAccessToken
            }));

        it('should respond with 401 when no access token is provided', () =>
            get({
                url: 'admin/xpsys/',
                status: 401
            }));
    });

    describe('PUT /api/admin/xpsys', () => {
        const body = {
            rankXP: {
                top10: {
                    WRPoints: 3000,
                    rankPercentages: [1, 0.75, 0.68, 0.61, 0.57, 0.53, 0.505, 0.48, 0.455, 0.43]
                },
                groups: {
                    maxGroups: 4,
                    groupMinSizes: [10, 45, 125, 250],
                    groupExponents: [0.5, 0.56, 0.62, 0.68],
                    groupPointPcts: [0.2, 0.13, 0.07, 0.03],
                    groupScaleFactors: [1, 1.5, 2, 2.5]
                },
                formula: { A: 50000, B: 49 }
            },

            cosXP: {
                levels: {
                    maxLevels: 600,
                    startingValue: 20000,
                    staticScaleStart: 101,
                    linearScaleInterval: 10,
                    staticScaleInterval: 25,
                    linearScaleBaseIncrease: 1000,
                    staticScaleBaseMultiplier: 1.5,
                    linearScaleIntervalMultiplier: 1,
                    staticScaleIntervalMultiplier: 0.5
                },
                completions: {
                    repeat: { tierScale: { bonus: 40, linear: 20, staged: 40, stages: 5 } },
                    unique: { tierScale: { linear: 2500, staged: 2500 } }
                }
            }
        };

        it('should update the XP system variables', async () => {
            await put({
                url: 'admin/xpsys',
                status: 204,
                body: body,
                token: adminUserToken
            });

            const res = await get({
                url: 'admin/xpsys',
                status: 200,
                token: adminUserToken
            });

            expect(res.body).toBeValidDto(XpSystemsDto);
            expect(res.body.cosXP.levels.maxLevels).toBe(600);
            expect(res.body).toStrictEqual(body as XpSystemsDto);
        });

        it('should respond with 400 when updating the XP system variables with missing values', async () => {
            const incompleteBody = body;
            delete incompleteBody.rankXP.top10.rankPercentages;

            await put({
                url: 'admin/xpsys',
                status: 400,
                body: incompleteBody,
                token: adminUserToken
            });
        });

        it('should respond with 403 when the user requesting is a moderator', () =>
            put({
                url: 'admin/xpsys',
                status: 403,
                body: body,
                token: modUserToken
            }));

        it('should respond with 403 when the user requesting is not an admin', () =>
            put({
                url: 'admin/xpsys',
                status: 403,
                body: body,
                token: nonAdminAccessToken
            }));

        it('should respond with 401 when no access token is provided', () =>
            put({
                url: 'admin/xpsys',
                body: body,
                status: 401
            }));
    });

    // describe('GET /api/admin/maps', () => {
    // 	it('should respond with 403 when not an admin', () => {
    // 		return chai.request(server)
    // 			.get('/api/admin/maps/')
    // 			.set('Authorization', 'Bearer ' + accessToken)
    // 			.then(res => {
    // 				expect(res).to.have.status(403);
    // 				expect(res).to.be.json;
    // 				expect(res.body).toHaveProperty('error');
    // 				expect(res.body.error.code).toEqual(403);
    // 				expect(typeof res.body.error.message).toBe('string');
    // 			});
    // 	});
    // 	it('should respond with 403 when authenticated from game', () => {
    // 		return chai.request(server)
    // 			.get('/api/admin/maps/')
    // 			.set('Authorization', 'Bearer ' + adminGameAccessToken)
    // 			.then(res => {
    // 				expect(res).to.have.status(403);
    // 				expect(res).to.be.json;
    // 				expect(res.body).toHaveProperty('error');
    // 				expect(res.body.error.code).toEqual(403);
    // 				expect(typeof res.body.error.message).toBe('string');
    // 			});
    // 	});
    // 	it('should respond with 401 when no access token is provided', () => {
    // 		return chai.request(server)
    // 			.get('/api/admin/maps/')
    // 			.then(res => {
    // 				expect(res).to.have.status(401);
    // 				expect(res).to.be.json;
    // 				expect(res.body).toHaveProperty('error');
    // 				expect(res.body.error.code).toEqual(401);
    // 				expect(typeof res.body.error.message).toBe('string');
    // 			});
    // 	});
    // 	it('should respond with a list of maps', () => {
    // 		return chai.request(server)
    // 			.get('/api/admin/maps/')
    // 			.set('Authorization', 'Bearer ' + adminAccessToken)
    // 			.then(res => {
    // 				expect(res).to.have.status(200);
    // 				expect(res).to.be.json;
    // 				expect(res.body).toHaveProperty('maps');
    // 				expect(Array.isArray(res.body.maps)).toBe(true);
    // 				expect(res.body.maps).toHaveLength(7);
    // 				expect(res.body.maps[0]).toHaveProperty('name');
    // 			});
    // 	});
    // 	it(
    //         'should respond with a limited list of maps when using the limit query param',
    //         () => {
    //             return chai.request(server)
    //                 .get('/api/admin/maps/')
    //                 .set('Authorization', 'Bearer ' + adminAccessToken)
    //                 .query({limit: 2})
    //                 .then(res => {
    //                     expect(res).to.have.status(200);
    //                     expect(res).to.be.json;
    //                     expect(res.body).toHaveProperty('maps');
    //                     expect(Array.isArray(res.body.maps)).toBe(true);
    //                     expect(res.body.maps).toHaveLength(2);
    //                     expect(res.body.maps[0]).toHaveProperty('name');
    //                 });
    //         }
    //     );
    //
    // 	it(
    //         'should respond with a different list of maps when using the offset query param',
    //         () => {
    //             return chai.request(server)
    //                 .get('/api/admin/maps/')
    //                 .set('Authorization', 'Bearer ' + adminAccessToken)
    //                 .query({offset: 2})
    //                 .then(res => {
    //                     expect(res).to.have.status(200);
    //                     expect(res).to.be.json;
    //                     expect(res.body).toHaveProperty('maps');
    //                     expect(Array.isArray(res.body.maps)).toBe(true);
    //                     expect(res.body.maps).toHaveLength(5);
    //                     expect(res.body.maps[0]).toHaveProperty('name');
    //                 });
    //         }
    //     );
    // 	it(
    //         'should respond with a filtered list of maps when using the search query param',
    //         () => {
    //             return chai.request(server)
    //                 .get('/api/admin/maps/')
    //                 .set('Authorization', 'Bearer ' + adminAccessToken)
    //                 .query({search: 'uni'})
    //                 .then(res => {
    //                     expect(res).to.have.status(200);
    //                     expect(res).to.be.json;
    //                     expect(res.body).toHaveProperty('maps');
    //                     expect(Array.isArray(res.body.maps)).toBe(true);
    //                     expect(res.body.maps).toHaveLength(1);
    //                     expect(res.body.maps[0]).toHaveProperty('name');
    //                 });
    //         }
    //     );
    // 	it(
    //         'should respond with a filtered list of maps when using the submitterID query param',
    //         () => {
    //             return chai.request(server)
    //                 .get('/api/admin/maps/')
    //                 .set('Authorization', 'Bearer ' + adminAccessToken)
    //                 .query({submitterID: testUser.id})
    //                 .then(res => {
    //                     expect(res).to.have.status(200);
    //                     expect(res).to.be.json;
    //                     expect(res.body).toHaveProperty('maps');
    //                     expect(Array.isArray(res.body.maps)).toBe(true);
    //                     expect(res.body.maps).toHaveLength(4);
    //                     expect(res.body.maps[0]).toHaveProperty('name');
    //                 });
    //         }
    //     );
    //
    //
    // 	it(
    //         'should respond with a list of maps when using the expand info query param',
    //         () => {
    //             return chai.request(server)
    //                 .get('/api/admin/maps/')
    //                 .set('Authorization', 'Bearer ' + adminAccessToken)
    //                 .query({expand: 'info'})
    //                 .then(res => {
    //                     expect(res).to.have.status(200);
    //                     expect(res).to.be.json;
    //                     expect(res.body).toHaveProperty('maps');
    //                     expect(Array.isArray(res.body.maps)).toBe(true);
    //                     expect(res.body.maps).toHaveLength(7);
    //                     expect(res.body.maps[0]).toHaveProperty('name');
    //                     expect(res.body.maps[0]).toHaveProperty('info');
    //                     expect(res.body.maps[0].info).toHaveProperty('description');
    //                 });
    //         }
    //     );
    //
    // 	it(
    //         'should respond with a list of maps when using the expand submitter query param',
    //         () => {
    //             return chai.request(server)
    //                 .get('/api/admin/maps/')
    //                 .set('Authorization', 'Bearer ' + adminAccessToken)
    //                 .query({expand: 'submitter'})
    //                 .then(res => {
    //                     expect(res).to.have.status(200);
    //                     expect(res).to.be.json;
    //                     expect(res.body).toHaveProperty('maps');
    //                     expect(Array.isArray(res.body.maps)).toBe(true);
    //                     expect(res.body.maps).toHaveLength(7);
    //                     expect(res.body.maps[0]).toHaveProperty('name');
    //                     expect(res.body.maps[0].submitter).toHaveProperty('roles');
    //                 });
    //         }
    //     );
    //
    // 	it(
    //         'should respond with a list of maps when using the expand credits query param',
    //         () => {
    //             return chai.request(server)
    //                 .get('/api/admin/maps/')
    //                 .set('Authorization', 'Bearer ' + adminAccessToken)
    //                 .query({expand: 'credits'})
    //                 .then(res => {
    //                     expect(res).to.have.status(200);
    //                     expect(res).to.be.json;
    //                     expect(res.body).toHaveProperty('maps');
    //                     expect(Array.isArray(res.body.maps)).toBe(true);
    //                     expect(res.body.maps).toHaveLength(7);
    //                     expect(res.body.maps[0]).toHaveProperty('name');
    //                     expect(res.body.maps[0]).toHaveProperty('credits');
    //                     expect(res.body.maps[0].credits[0]).toHaveProperty('type');
    //                 });
    //         }
    //     );
    //
    //
    // 	it(
    //         'should respond with a filtered list of maps when using the status query param',
    //         () => {
    //             return chai.request(server)
    //                 .get('/api/admin/maps/')
    //                 .set('Authorization', 'Bearer ' + adminAccessToken)
    //                 .query({
    //                     status: map.STATUS.APPROVED
    //                 })
    //                 .then(res => {
    //                     expect(res).to.have.status(200);
    //                     expect(res).to.be.json;
    //                     expect(res.body).toHaveProperty('maps');
    //                     expect(Array.isArray(res.body.maps)).toBe(true);
    //                     expect(res.body.maps).toHaveLength(1);
    //                     expect(res.body.maps[0]).toHaveProperty('name');
    //                 });
    //         }
    //     );
    //
    //
    // 	it(
    //         'should respond with a filtered list of maps when using the priority query param',
    //         () => {
    //             return chai.request(server)
    //                 .get('/api/admin/maps/')
    //                 .set('Authorization', 'Bearer ' + adminAccessToken)
    //                 .query({
    //                     priority: true
    //                 })
    //                 .then(res => {
    //                     expect(res).to.have.status(200);
    //                     expect(res).to.be.json;
    //                     expect(res.body).toHaveProperty('maps');
    //                     expect(Array.isArray(res.body.maps)).toBe(true);
    //                     expect(res.body.maps).toHaveLength(3);
    //                     expect(res.body.maps[0]).toHaveProperty('name');
    //                 });
    //         }
    //     );
    //
    // });
    //
    // describe('PATCH /api/admin/maps/{mapID}', () => {
    // 	it('should respond with 403 when not an admin', () => {
    // 		return chai.request(server)
    // 			.patch('/api/admin/maps/' + testMap.id)
    // 			.set('Authorization', 'Bearer ' + accessToken)
    // 			.send({
    // 				statusFlag: 1,
    // 			})
    // 			.then(res => {
    // 				expect(res).to.have.status(403);
    // 				expect(res).to.be.json;
    // 				expect(res.body).toHaveProperty('error');
    // 				expect(res.body.error.code).toEqual(403);
    // 				expect(typeof res.body.error.message).toBe('string');
    // 			});
    // 	});
    // 	it('should respond with 403 when authenticated from game', () => {
    // 		return chai.request(server)
    // 			.patch('/api/admin/maps/' + testMap.id)
    // 			.set('Authorization', 'Bearer ' + adminGameAccessToken)
    // 			.send({
    // 				statusFlag: 1,
    // 			})
    // 			.then(res => {
    // 				expect(res).to.have.status(403);
    // 				expect(res).to.be.json;
    // 				expect(res.body).toHaveProperty('error');
    // 				expect(res.body.error.code).toEqual(403);
    // 				expect(typeof res.body.error.message).toBe('string');
    // 			});
    // 	});
    // 	it('should update a specific map', () => {
    // 		return chai.request(server)
    // 			.patch('/api/admin/maps/' + testMap.id)
    // 			.set('Authorization', 'Bearer ' + adminAccessToken)
    // 			.send({
    // 				statusFlag: 1,
    // 			})
    // 			.then(res => {
    // 				expect(res).to.have.status(204);
    // 			});
    // 	});
    // 	it('should respond with 401 when no access token is provided', () => {
    // 		return chai.request(server)
    // 			.patch('/api/admin/maps/' + testMap.id)
    // 			.then(res => {
    // 				expect(res).to.have.status(401);
    // 				expect(res).to.be.json;
    // 				expect(res.body).toHaveProperty('error');
    // 				expect(res.body.error.code).toEqual(401);
    // 				expect(typeof res.body.error.message).toBe('string');
    // 			});
    // 	});
    // });
    //
    // describe('GET /api/admin/reports', () => {
    // 	it('should respond with a list of reports', () => {
    // 		return chai.request(server)
    // 			.get('/api/admin/reports')
    // 			.set('Authorization', 'Bearer ' + adminAccessToken)
    // 			.then(res => {
    // 				expect(res).to.have.status(200);
    // 				expect(res).to.be.json;
    // 				expect(res.body).toHaveProperty('count');
    // 				expect(res.body.count).toBeInstanceOf(Number);
    // 				expect(res.body).toHaveProperty('reports');
    // 				expect(Array.isArray(res.body.reports)).toBe(true);
    // 			});
    // 	});
    // 	it('should limit the result set when using the limit query param', () => {
    // 		return chai.request(server)
    // 			.get('/api/admin/reports')
    // 			.set('Authorization', 'Bearer ' + adminAccessToken)
    // 			.query({limit: 1})
    // 			.then(res => {
    // 				expect(res.body.reports).toHaveLength(1);
    // 			});
    // 	});
    // 	it.skip('should offset the result set when using the offset query param', () => {});
    // 	it.skip('should filter with the resolved query param', () => {});
    // });
    //
    // describe('PATCH /api/admin/reports/{reportID}', () => {
    // 	it('should update a report', () => {
    // 		return chai.request(server)
    // 			.patch('/api/admin/reports/' + testReport.id)
    // 			.set('Authorization', 'Bearer ' + adminAccessToken)
    // 			.send({
    // 				resolved: true,
    // 				resolutionMessage: 'I gave the reporter the bepis they wanted',
    // 			})
    // 			.then(res => {
    // 				expect(res).to.have.status(204);
    // 			});
    // 	});
    // });
    //
    // describe('DELETE /api/admin/maps/{mapID}', () => {
    // 	it('should delete a map', () => {
    // 		return chai.request(server)
    // 			.delete('/api/admin/maps/' + testMap.id)
    // 			.set('Authorization', 'Bearer ' + adminAccessToken)
    // 			.then(res => {
    // 				expect(res).to.have.status(200);
    // 			});
    // 	});
    // });
    //
    // describe('PATCH /api/admin/user-stats', () => {
    // 	it('should update all user stats', () => {
    // 		return chai.request(server)
    // 			.patch('/api/admin/user-stats')
    // 			.set('Authorization', 'Bearer ' + adminAccessToken)
    // 			.send({
    // 				cosXP: 1337,
    // 			})
    // 			.then(res => {
    // 				expect(res).to.have.status(204);
    // 			});
    // 	});
    // });
    //
    // describe('GET /api/admin/xpsys', () => {
    // 	it('should return the XP system variables', () => {
    // 		return chai.request(server)
    // 			.get('/api/admin/xpsys')
    // 			.set('Authorization', 'Bearer ' + adminAccessToken)
    // 			.then(res => {
    // 				expect(res).to.have.status(200);
    // 			});
    // 	});
    // });
    //
    // describe('PUT /api/admin/xpsys', () => {
    // 	it('should update the XP system variables', () => {
    // 		return chai.request(server)
    // 			.put('/api/admin/xpsys')
    // 			.set('Authorization', 'Bearer ' + adminAccessToken)
    // 			.send({
    // 				rankXP: {
    // 					top10: {
    // 						WRPoints: 3500,
    // 						rankPercentages: [
    // 							1,
    // 							.75,
    // 							.68,
    // 							.61,
    // 							.57,
    // 							.53,
    // 							.505,
    // 							.48,
    // 							.455,
    // 							.43,
    // 						],
    // 					},
    // 					formula: {
    // 						A: 50000,
    // 						B: 49,
    // 					},
    // 					groups: {
    // 						maxGroups: 4,
    // 						groupScaleFactors: [
    // 							1,
    // 							1.5,
    // 							2,
    // 							2.5
    // 						],
    // 						groupExponents: [
    // 							0.5,
    // 							0.56,
    // 							0.62,
    // 							0.68
    // 						],
    // 						groupMinSizes: [
    // 							10,
    // 							45,
    // 							125,
    // 							250
    // 						],
    // 						groupPointPcts: [ // How much, of a % of WRPoints, does each group get
    // 							0.2,
    // 							0.13,
    // 							0.07,
    // 							0.03,
    // 						],
    // 					},
    // 				},
    // 				cosXP: {}
    // 			})
    // 			.then(res => {
    // 				expect(res).to.have.status(204);
    // 			});
    // 	});
    // });
});
