import { PrismaService } from '@modules/repo/prisma.service';
import { del, get, patch, post, put } from '../util/request-handlers.util';
import { ActivityTypes } from '@common/enums/activity.enum';
import { ReportType, ReportCategory } from '@common/enums/report.enum';
import { UserDto } from '@common/dto/user/user.dto';
import { XpSystemsDto } from '@/common/dto/xp-systems/xp-systems.dto';
import { RankXpParams, CosXpParams } from '@modules/xp-systems/xp-systems.interface';
import { ReportDto } from '@common/dto/report/report.dto';
import { skipTest, takeTest, unauthorizedTest } from '../util/generic-e2e-tests.util';
import { pick } from 'lodash';
import { cleanup, createAndLoginUser, createUser, loginNewUser, NULL_ID } from '../util/db.util';
import { gameLogin } from '../util/auth.util';

const prisma: PrismaService = global.prisma;

describe('Admin', () => {
    describe('admin/users', () => {
        describe('POST', () => {
            let modToken, adminToken, nonAdminToken;

            beforeAll(async () => {
                [modToken, adminToken, nonAdminToken] = await Promise.all([
                    loginNewUser({ data: { roles: { create: { moderator: true } } } }),
                    loginNewUser({ data: { roles: { create: { admin: true } } } }),
                    loginNewUser()
                ]);
            });

            afterAll(() => cleanup('user'));

            it('should successfully create a placeholder user', async () => {
                const res = await post({
                    url: 'admin/users/',
                    status: 201,
                    body: { alias: 'Burger' },
                    token: adminToken,
                    validate: UserDto
                });

                expect(res.body.alias).toBe('Burger');
            });

            it('should 403 when the user requesting only is a moderator', () =>
                post({
                    url: 'admin/users/',
                    status: 403,
                    body: { alias: 'Barry 2' },
                    token: modToken
                }));

            it('should 403 when the user requesting is not an admin', () =>
                post({
                    url: 'admin/users/',
                    status: 403,
                    body: { alias: 'Barry 2' },
                    token: nonAdminToken
                }));

            unauthorizedTest('admin/users', post);
        });
    });

    describe('admin/users/merge', () => {
        describe('POST', () => {
            let u1, u1Token, u2, mu1, mu2, adminToken, modToken;

            beforeEach(async () => {
                [[u1, u1Token], u2, mu1, mu2, adminToken, modToken] = await Promise.all([
                    createAndLoginUser(),
                    createUser(),
                    createUser({ data: { roles: { create: { placeholder: true } } } }),
                    createUser(),
                    loginNewUser({ data: { roles: { create: { admin: true } } } }),
                    loginNewUser({ data: { roles: { create: { moderator: true } } } })
                ]);

                await prisma.follow.createMany({
                    data: [
                        { followeeID: u1.id, followedID: mu1.id },
                        {
                            followeeID: u2.id,
                            followedID: mu1.id,
                            notifyOn: ActivityTypes.MAP_APPROVED,
                            createdAt: new Date('12/24/2021')
                        },
                        {
                            followeeID: u2.id,
                            followedID: mu2.id,
                            notifyOn: ActivityTypes.MAP_UPLOADED,
                            createdAt: new Date('12/25/2021')
                        },
                        { followeeID: mu2.id, followedID: mu1.id }
                    ]
                });

                await prisma.activity.create({
                    data: { type: ActivityTypes.REPORT_FILED, userID: mu1.id, data: 123456n }
                });
            });

            afterAll(() => cleanup('user'));

            it('should merge two accounts together', async () => {
                const res = await post({
                    url: 'admin/users/merge',
                    status: 201,
                    body: { placeholderID: mu1.id, userID: mu2.id },
                    token: adminToken,
                    validate: UserDto
                });

                expect(res.body.id).toBe(mu2.id);
                expect(res.body.alias).toBe(mu2.alias);

                // U1 was following MU1, that should be transferred to MU2.
                const u1Follows = await get({
                    url: `users/${u1.id}/follows`,
                    status: 200,
                    token: adminToken
                });

                expect(u1Follows.body.response.some((f) => f.followed.id === mu2.id)).toBe(true);

                // U2 was following MU1 and MU2, the creation data should be earliest of the two and the \notifyOn flags combined.
                const u2Follows = await get({
                    url: `users/${u2.id}/follows`,
                    status: 200,
                    token: adminToken
                });
                const follow = u2Follows.body.response.find((f) => f.followed.id === mu2.id);
                expect(new Date(follow.createdAt)).toEqual(new Date('12/24/2021'));
                expect(follow.notifyOn).toBe(ActivityTypes.MAP_APPROVED | ActivityTypes.MAP_UPLOADED);

                // MU2 was following MU1, that should be deleted
                const mu2follows = await get({
                    url: `users/${mu2.id}/follows`,
                    status: 200,
                    token: adminToken
                });
                expect(mu2follows.body.response.some((f) => f.followed.id === mu1.id)).toBe(false);

                // MU1's activities should have been transferred to MU2
                const mu2Activities = await get({
                    url: `users/${mu2.id}/activities`,
                    status: 200,
                    token: adminToken
                });
                expect(mu2Activities.body.response[0].data).toBe(123456);

                // Placeholder should have been deleted
                await get({
                    url: `users/${mu1.id}`,
                    status: 404,
                    token: adminToken
                });
            });

            it('should 400 if the user to merge from is not a placeholder', () =>
                post({
                    url: 'admin/users/merge',
                    status: 400,
                    body: { placeholderID: u1.id, userID: mu2.id },
                    token: adminToken
                }));

            it('should 400 if the user to merge from does not exist', () =>
                post({
                    url: 'admin/users/merge',
                    status: 400,
                    body: { placeholderID: NULL_ID, userID: mu2.id },
                    token: adminToken
                }));

            it('should 400 if the user to merge to does not exist', () =>
                post({
                    url: 'admin/users/merge',
                    status: 400,
                    body: { placeholderID: mu1.id, userID: NULL_ID },
                    token: adminToken
                }));

            it('should 400 if the user to merge are the same user', () =>
                post({
                    url: 'admin/users/merge',
                    status: 400,
                    body: { placeholderID: mu1.id, userID: mu1.id },
                    token: adminToken
                }));

            it('should 403 when the user requesting is only a moderator', () =>
                post({
                    url: 'admin/users/merge',
                    status: 403,
                    body: { placeholderID: mu1.id, userID: mu2.id },
                    token: modToken
                }));

            it('should 403 when the user requesting is not an admin', () =>
                post({
                    url: 'admin/users/merge',
                    status: 403,
                    body: { placeholderID: mu1.id, userID: mu2.id },
                    token: u1Token
                }));

            unauthorizedTest('admin/users/merge', post);
        });
    });

    describe('admin/users/{userID}', () => {
        describe('PATCH', () => {
            let admin, adminToken, adminGameToken, admin2, u1, u1Token, u2, u3, mod, modToken, mod2;

            beforeEach(async () => {
                [[admin, adminToken], admin2, [u1, u1Token], u2, u3, [mod, modToken], mod2] = await Promise.all([
                    createAndLoginUser({ data: { roles: { create: { admin: true } } } }),
                    createUser({ data: { roles: { create: { admin: true } } } }),
                    createAndLoginUser(),
                    createUser({ data: { roles: { create: { verified: true } } } }),
                    createUser({ data: { roles: { create: { verified: true } } } }),
                    createAndLoginUser({ data: { roles: { create: { moderator: true } } } }),
                    createUser({ data: { roles: { create: { moderator: true } } } })
                ]);
                adminGameToken = await gameLogin(admin);
            });

            afterAll(() => cleanup('user'));

            it("should successfully update a specific user's alias", async () => {
                await patch({
                    url: `admin/users/${u1.id}`,
                    status: 204,
                    body: { alias: 'Barry 2' },
                    token: adminToken
                });

                const res = await get({ url: `users/${u1.id}`, status: 200, token: adminToken });

                expect(res.body.alias).toBe('Barry 2');
            });

            it("should 409 when an admin tries to set a verified user's alias to something used by another verified user", () =>
                patch({
                    url: `admin/users/${u2.id}`,
                    status: 409,
                    body: { alias: u3.alias },
                    token: adminToken
                }));

            it("should allow an admin to set a verified user's alias to something used by another unverified user", () =>
                patch({
                    url: `admin/users/${u1.id}`,
                    status: 204,
                    body: { alias: mod.alias },
                    token: adminToken
                }));

            it("should allow an admin to set a unverified user's alias to something used by another verified user", () =>
                patch({
                    url: `admin/users/${mod.id}`,
                    status: 204,
                    body: { alias: u2.alias },
                    token: adminToken
                }));

            it("should successfully update a specific user's bio", async () => {
                const bio = "I'm hungry";
                await patch({
                    url: `admin/users/${u1.id}`,
                    status: 204,
                    body: { bio: bio },
                    token: adminToken
                });

                const res = await get({
                    url: `users/${u1.id}/profile`,
                    status: 200,
                    token: adminToken
                });

                expect(res.body.bio).toBe(bio);
            });

            it("should successfully update a specific user's bans", async () => {
                const bans = {
                    avatar: true,
                    leaderboards: true
                };

                await patch({
                    url: `admin/users/${u1.id}`,
                    status: 204,
                    body: { bans: bans },
                    token: adminToken
                });

                const userDB = await prisma.user.findFirst({
                    where: { id: u1.id },
                    include: { bans: true }
                });

                expect(pick(userDB.bans as any, Object.keys(bans))).toStrictEqual(bans);
            });

            it("should successfully update a specific user's roles", async () => {
                await patch({
                    url: `admin/users/${u1.id}`,
                    status: 204,
                    body: { roles: { mapper: true } },
                    token: adminToken
                });

                const userDB = await prisma.user.findFirst({
                    where: { id: u1.id },
                    include: { roles: true }
                });

                expect(userDB.roles.mapper).toBe(true);
            });

            it('should allow an admin to make a regular user a moderator', () =>
                patch({
                    url: `admin/users/${u1.id}`,
                    status: 204,
                    body: { roles: { moderator: true } },
                    token: adminToken
                }));

            it("should allow an admin to update a moderator's roles", () =>
                patch({
                    url: `admin/users/${mod.id}`,
                    status: 204,
                    body: { roles: { mapper: true } },
                    token: adminToken
                }));

            it('should allow an admin to remove a user as moderator', () =>
                patch({
                    url: `admin/users/${mod.id}`,
                    status: 204,
                    body: { roles: { moderator: false } },
                    token: adminToken
                }));

            it("should not allow an admin to update another admin's roles", () =>
                patch({
                    url: `admin/users/${admin2.id}`,
                    status: 403,
                    body: { roles: { mapper: true } },
                    token: adminToken
                }));

            it('should allow an admin to update their own non-admin roles', () =>
                patch({
                    url: `admin/users/${admin.id}`,
                    status: 204,
                    body: { roles: { mapper: true } },
                    token: adminToken
                }));

            it('should allow an admin to update their own moderator role', () =>
                patch({
                    url: `admin/users/${admin.id}`,
                    status: 204,
                    body: { roles: { moderator: true } },
                    token: adminToken
                }));

            it('should allow an admin to update their own admin role', () =>
                patch({
                    url: `admin/users/${admin.id}`,
                    status: 204,
                    body: { roles: { admin: false } },
                    token: adminToken
                }));

            it("should successfully allow a moderator to update a specific user's roles", () =>
                patch({
                    url: `admin/users/${u1.id}`,
                    status: 204,
                    body: { roles: { mapper: true } },
                    token: modToken
                }));

            it('should not allow a moderator to make another user a moderator', () =>
                patch({
                    url: `admin/users/${u1.id}`,
                    status: 403,
                    body: { roles: { moderator: true } },
                    token: modToken
                }));

            it("should not allow a moderator to update another moderator's roles", () =>
                patch({
                    url: `admin/users/${mod2.id}`,
                    status: 403,
                    body: { roles: { moderator: false } },
                    token: modToken
                }));

            it("should not allow a moderator to update an admin's roles", () =>
                patch({
                    url: `admin/users/${admin2.id}`,
                    status: 403,
                    body: { roles: { mapper: true } },
                    token: modToken
                }));

            it('should allow a moderator to update their own non-mod roles', () =>
                patch({
                    url: `admin/users/${mod.id}`,
                    status: 204,
                    body: { roles: { mapper: true } },
                    token: modToken
                }));

            it('should not allow a moderator to update their own mod role', () =>
                patch({
                    url: `admin/users/${mod.id}`,
                    status: 403,
                    body: { roles: { moderator: false } },
                    token: modToken
                }));

            it('should 403 when the user requesting is not an admin', () =>
                patch({
                    url: `admin/users/${u1.id}`,
                    status: 403,
                    body: { alias: 'Barry 2' },
                    token: u1Token
                }));

            it('should 403 when authenticated from game', () =>
                patch({
                    url: `admin/users/${u1.id}`,
                    status: 403,
                    body: { roles: { mapper: true } },
                    token: adminGameToken
                }));

            it('should 401 when no access token is provided', () =>
                patch({ url: `admin/users/${u1.id}`, status: 401 }));

            unauthorizedTest('admin/users/1', patch);
        });

        describe('DELETE', () => {
            let u1, u1Token, adminToken, modToken;

            beforeEach(async () => {
                [[u1, u1Token], adminToken, modToken] = await Promise.all([
                    createAndLoginUser(),
                    loginNewUser({ data: { roles: { create: { admin: true } } } }),
                    loginNewUser({ data: { roles: { create: { moderator: true } } } })
                ]);
            });

            afterEach(() => prisma.user.deleteMany());

            it('should delete a user', async () => {
                await del({ url: `admin/users/${u1.id}`, status: 204, token: adminToken });

                await get({ url: `users/${u1.id}`, status: 404, token: adminToken });
            });

            it('should 403 when the user requesting only is a moderator', () =>
                del({ url: `admin/users/${u1.id}`, status: 403, token: modToken }));

            it('should 403 when the user requesting is not an admin', () =>
                del({ url: `admin/users/${u1.id}`, status: 403, token: u1Token }));

            it('should 401 when no access token is provided', () => del({ url: `admin/users/${u1.id}`, status: 401 }));

            unauthorizedTest('admin/users/1', del);
        });
    });

    describe('admin/reports', () => {
        describe('GET', () => {
            let adminToken, u1, u1Token, r1, _r2;

            beforeAll(async () => {
                [adminToken, [u1, u1Token]] = await Promise.all([
                    loginNewUser({ data: { roles: { create: { admin: true } } } }),
                    createAndLoginUser()
                ]);

                r1 = await prisma.report.create({
                    data: {
                        data: 1,
                        type: ReportType.MAP_REPORT,
                        category: ReportCategory.INAPPROPRIATE_CONTENT,
                        message: 'report message',
                        resolved: false,
                        resolutionMessage: '',
                        submitterID: u1.id
                    }
                });

                _r2 = await prisma.report.create({
                    data: {
                        data: 2,
                        type: ReportType.USER_PROFILE_REPORT,
                        category: ReportCategory.PLAGIARISM,
                        message: 'report2 message',
                        resolved: true,
                        resolutionMessage: '2',
                        submitterID: u1.id
                    }
                });
            });

            afterAll(() => cleanup('user', 'report'));

            it('should return a list of reports', async () => {
                const reports = await get({
                    url: 'admin/reports',
                    status: 200,
                    token: adminToken,
                    validatePaged: { type: ReportDto, count: 2 }
                });
                expect(reports.body).toHaveProperty('response');
                expect(reports.body.response[0].data).toBe(Number(r1.data));
                expect(reports.body.response[0].type).toBe(r1.type);
                expect(reports.body.response[0].category).toBe(r1.category);
                expect(reports.body.response[0].message).toBe(r1.message);
                expect(reports.body.response[0].resolved).toBe(r1.resolved);
                expect(reports.body.response[0].resolutionMessage).toBe(r1.resolutionMessage);
                expect(reports.body.response[0].submitterID).toBe(r1.submitterID);
            });

            it('should only return resolved or non resolved based on query param resolved', async () => {
                const reportsResolved = await get({
                    url: 'admin/reports',
                    status: 200,
                    query: { resolved: true },
                    token: adminToken,
                    validatePaged: { type: ReportDto, count: 1 }
                });

                expect(reportsResolved.body.response[0].resolved).toBe(true);

                const reportsNonResolved = await get({
                    url: 'admin/reports',
                    status: 200,
                    query: { resolved: false },
                    token: adminToken,
                    validatePaged: { type: ReportDto, count: 1 }
                });

                expect(reportsNonResolved.body.response[0].resolved).toBe(false);
            });

            it('should limit the result set when using the take query param', () =>
                takeTest({
                    url: 'admin/reports',
                    validate: ReportDto,
                    token: adminToken
                }));

            it('should skip some of the result set when using the skip query param', () =>
                skipTest({
                    url: 'admin/reports',
                    validate: ReportDto,
                    token: adminToken
                }));

            it('should return 403 if a non admin access token is given', () =>
                get({
                    url: 'admin/reports',
                    status: 403,
                    token: u1Token
                }));

            unauthorizedTest('admin/reports', get);
        });
    });

    describe('admin/reports/{reportID}', () => {
        describe('PATCH', () => {
            let admin, adminToken, u1, u1Token, r1, _r2;

            beforeEach(async () => {
                [[admin, adminToken], [u1, u1Token]] = await Promise.all([
                    createAndLoginUser({ data: { roles: { create: { admin: true } } } }),
                    createAndLoginUser()
                ]);

                r1 = await prisma.report.create({
                    data: {
                        data: 1,
                        type: ReportType.MAP_REPORT,
                        category: ReportCategory.INAPPROPRIATE_CONTENT,
                        message: 'report message',
                        resolved: false,
                        resolutionMessage: '',
                        submitterID: u1.id
                    }
                });

                _r2 = await prisma.report.create({
                    data: {
                        data: 2,
                        type: ReportType.USER_PROFILE_REPORT,
                        category: ReportCategory.PLAGIARISM,
                        message: 'report2 message',
                        resolved: true,
                        resolutionMessage: '2',
                        submitterID: u1.id
                    }
                });
            });

            afterEach(() => cleanup('user', 'report'));

            it('should edit a report', async () => {
                await patch({
                    url: `admin/reports/${r1.id}`,
                    status: 204,
                    body: { resolved: true, resolutionMessage: 'resolved' },
                    token: adminToken
                });

                const changedReport = await prisma.report.findFirst({ where: { id: r1.id } });

                expect(changedReport.resolved).toBe(true);
                expect(changedReport.resolutionMessage).toBe('resolved');
                expect(changedReport.resolverID).toBe(admin.id);
            });

            it('should return 404 if targeting a nonexistent report', () =>
                patch({
                    url: `admin/reports/${NULL_ID}`,
                    status: 404,
                    body: { resolved: true, resolutionMessage: 'resolved' },
                    token: adminToken
                }));

            it('should return 403 if a non admin access token is given', () =>
                patch({ url: `admin/reports/${r1.id}`, status: 403, token: u1Token }));

            it('should return 401 if no access token is given', () =>
                patch({ url: `admin/reports/${r1.id}`, status: 401 }));
        });
    });

    describe('admin/xpsys', () => {
        let adminToken, modToken, u1Token;

        beforeEach(async () => {
            [adminToken, modToken, u1Token] = await Promise.all([
                loginNewUser({ data: { roles: { create: { admin: true } } } }),
                loginNewUser({ data: { roles: { create: { moderator: true } } } }),
                loginNewUser()
            ]);

            await prisma.xpSystems.deleteMany();
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
        });

        afterEach(() => cleanup('user'));
        afterAll(() => cleanup('xpSystems'));

        describe('GET', () => {
            it('should respond with the current XP System variables when the user is an admin', () =>
                get({
                    url: 'admin/xpsys/',
                    status: 200,
                    token: adminToken,
                    validate: XpSystemsDto
                }));

            it('should respond with the current XP System variables when the user is a moderator', () =>
                get({
                    url: 'admin/xpsys/',
                    status: 200,
                    token: modToken,
                    validate: XpSystemsDto
                }));

            it('should 403 when the user requesting is not an admin', () =>
                get({
                    url: 'admin/xpsys/',
                    status: 403,
                    token: u1Token
                }));

            unauthorizedTest('admin/xpsys', get);
        });

        describe('PUT', () => {
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
                await put({ url: 'admin/xpsys', status: 204, body: body, token: adminToken });

                const res = await get({ url: 'admin/xpsys', status: 200, token: adminToken, validate: XpSystemsDto });

                expect(res.body.cosXP.levels.maxLevels).toBe(600);
                expect(res.body).toStrictEqual(body as XpSystemsDto);
            });

            it('should 400 when updating the XP system variables with missing values', async () => {
                const incompleteBody = body;
                delete incompleteBody.rankXP.top10.rankPercentages;

                await put({ url: 'admin/xpsys', status: 400, body: incompleteBody, token: adminToken });
            });

            it('should 403 when the user requesting is a moderator', () =>
                put({ url: 'admin/xpsys', status: 403, body: body, token: modToken }));

            it('should 403 when the user requesting is not an admin', () =>
                put({ url: 'admin/xpsys', status: 403, body: body, token: u1Token }));

            unauthorizedTest('admin/xpsys', get);
        });
    });
});
