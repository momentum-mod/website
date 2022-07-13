// noinspection DuplicatedCode

import { Roles } from '../src/@common/enums/user.enum';
import { ReportCategory, ReportType } from '../src/@common/enums/report.enum';
import { MapCreditType, MapStatus, MapType } from '../src/@common/enums/map.enum';
import { PrismaService } from '../src/modules/repo/prisma.service';
import { del, get, patch, post } from './testutil';
import { AuthService } from '../src/modules/auth/auth.service';
import { ActivityTypes } from '../src/@common/enums/activity.enum';
import { UserDto } from '../src/@common/dto/user/user.dto';

describe('Admin', () => {
    let adminUser,
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
        map1,
        map2,
        map3;
    const testUser = {
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
    };

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

        const authService = global.auth as AuthService;
        global.accessToken = (await authService.login(adminUser)).access_token;
        nonAdminAccessToken = (await authService.login(nonAdminUser)).access_token;
        modUserToken = (await authService.login(modUser)).access_token;
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
    });

    describe('POST /api/v1/admin/users', () => {
        it('should successfully create a placeholder user', async () => {
            const res = await post('admin/users/', 201, { alias: 'Burger' });

            expect(res.body).toBeValidDto(UserDto);
            expect(res.body.alias).toBe('Burger');
        });

        it('should respond with 403 when the user requesting only is a moderator', () =>
            post('admin/users/', 403, { alias: 'Barry 2' }, modUserToken));

        it('should respond with 403 when the user requesting is not an admin', () =>
            post('admin/users/', 403, { alias: 'Barry 2' }, nonAdminAccessToken));

        it('should respond with 401 when no access token is provided', () => post('admin/users/', 401, {}, null));
    });

    describe('POST /api/v1/admin/users/merge', () => {
        it('should merge two accounts together', async () => {
            const res = await post('admin/users/merge', 201, {
                placeholderID: mergeUser1.id,
                userID: mergeUser2.id
            });

            expect(res.body).toBeValidDto(UserDto);
            expect(res.body.id).toBe(mergeUser2.id);
            expect(res.body.alias).toBe(mergeUser2.alias);

            // U1 was following MU1, that should be transferred to MU2.
            const u1Follows = await get(`users/${user1.id}/follows`, 200);

            expect(u1Follows.body.response.some((f) => f.followed.id === mergeUser2.id)).toBe(true);

            // U2 was following MU1 and MU2, the creation data should be earliest of the two and the \notifyOn flags combined.
            const u2Follows = await get(`users/${user2.id}/follows`, 200);
            const follow = u2Follows.body.response.find((f) => f.followed.id === mergeUser2.id);
            expect(new Date(follow.createdAt)).toEqual(new Date('12/24/2021'));
            expect(follow.notifyOn).toBe(ActivityTypes.MAP_APPROVED | ActivityTypes.MAP_UPLOADED);

            // MU2 was following MU1, that should be deleted
            const mu2follows = await get(`users/${mergeUser2.id}/follows`, 200);
            expect(mu2follows.body.response.some((f) => f.followed.id === mergeUser1.id)).toBe(false);

            // MU1's activities should have been transferred to MU2
            const mu2Activities = await get(`users/${mergeUser2.id}/activities`, 200);
            expect(mu2Activities.body.response[0].data).toBe('123456');

            // Placeholder should have been deleted
            await get(`users/${mergeUser1.id}`, 404);
        });

        it('should respond with 400 if the user to merge from is not a placeholder', () =>
            post('admin/users/merge', 400, {
                placeholderID: user1.id,
                userID: mergeUser2.id
            }));

        it('should respond with 400 if the user to merge from does not exist', () =>
            post('admin/users/merge', 400, {
                placeholderID: 9812364981265872,
                userID: mergeUser2.id
            }));

        it('should respond with 400 if the user to merge to does not exist', () =>
            post('admin/users/merge', 400, {
                placeholderID: mergeUser1.id,
                userID: 2368745234521
            }));

        it('should respond with 400 if the user to merge are the same user', () =>
            post('admin/users/merge', 400, {
                placeholderID: mergeUser1.id,
                userID: mergeUser1.id
            }));

        it('should respond with 403 when the user requesting is only a moderator', () =>
            post(
                'admin/users/merge',
                403,
                {
                    placeholderID: mergeUser1.id,
                    userID: mergeUser2.id
                },
                modUserToken
            ));

        it('should respond with 403 when the user requesting is not an admin', () =>
            post(
                'admin/users/merge',
                403,
                {
                    placeholderID: mergeUser1.id,
                    userID: mergeUser2.id
                },
                nonAdminAccessToken
            ));

        it('should respond with 401 when no access token is provided', () => post('admin/users/', 401, {}, null));
    });

    describe('PATCH /api/v1/admin/users/{userID}', () => {
        it("should successfully update a specific user's alias", async () => {
            await patch(`admin/users/${user1.id}`, 204, { alias: 'Barry 2' });

            const res = await get(`users/${user1.id}`, 200);

            expect(res.body.alias).toBe('Barry 2');
        });

        it("should respond with 409 when an admin tries to set a verified user's alias to something used by another verified user", () =>
            patch(`admin/users/${user1.id}`, 409, { alias: user2.alias }));

        it("should allow an admin to set a verified user's alias to something used by another unverified user", () =>
            patch(`admin/users/${user1.id}`, 204, { alias: modUser.alias }));

        it("should allow an admin to set a unverified user's alias to something used by another verified user", () =>
            patch(`admin/users/${modUser.id}`, 204, { alias: user2.alias }));

        it("should successfully update a specific user's bio", async () => {
            const bio = 'Im hungry';
            await patch(`admin/users/${user1.id}`, 204, { bio: bio });

            const res = await get(`users/${user1.id}/profile`, 200);

            expect(res.body.bio).toBe(bio);
        });

        it("should successfully update a specific user's bans", async () => {
            const bans = {
                avatar: true,
                leaderboards: true
            };

            await patch(`admin/users/${user1.id}`, 204, { bans: bans });

            const res = await get(`users/${user1.id}`, 200);

            expect(res.body.bans).toBe(bans);
        });

        it("should successfully update a specific user's roles", async () => {
            await patch(`admin/users/${user1.id}`, 204, { roles: { mapper: true } });

            const res = await get(`users/${user1.id}`, 200);

            expect(res.body.roles.mapper).toBe(true);
        });

        it('should allow an admin to make a regular user a moderator', () =>
            patch(`admin/users/${user1.id}`, 204, { roles: { moderator: true } }));

        it("should allow an admin to update a moderator's roles", () =>
            patch(`admin/users/${modUser.id}`, 204, { roles: { mapper: true } }));

        it('should allow an admin to remove a user as moderator', () =>
            patch(`admin/users/${modUser.id}`, 204, { roles: { moderator: false } }));

        it("should not allow an admin to update another admin's roles", () =>
            patch(`admin/users/${adminUser2.id}`, 403, { roles: { mapper: true } }));

        it('should allow an admin to update their own non-admin roles', () =>
            patch(`admin/users/${adminUser.id}`, 204, { roles: { mapper: true } }));

        it('should allow an admin to update their own moderator role', () =>
            patch(`admin/users/${adminUser.id}`, 204, { roles: { moderator: true } }));

        it('should allow an admin to update their own admin role', () =>
            patch(`admin/users/${adminUser.id}`, 204, { roles: { admin: false } }));

        it("should successfully allow a moderator to update a specific user's roles", () =>
            patch(`admin/users/${user1.id}`, 204, { roles: { mapper: true } }, modUserToken));

        it('should not allow a moderator to make another user a moderator', () =>
            patch(`admin/users/${user1.id}`, 403, { roles: { moderator: true } }, modUserToken));

        it("should not allow a moderator to update another moderator's roles", () =>
            patch(`admin/users/${modUser2.id}`, 403, { roles: { moderator: false } }, modUserToken));

        it("should not allow a moderator to update an admin's roles", () =>
            patch(`admin/users/${adminUser2.id}`, 403, { roles: { mapper: true } }, modUserToken));

        it('should allow a moderator to update their own non-mod roles', () =>
            patch(`admin/users/${modUser.id}`, 204, { roles: { mapper: true } }, modUserToken));

        it('should not allow a moderator to update their own mod role', () =>
            patch(`admin/users/${modUser.id}`, 403, { roles: { moderator: false } }, modUserToken));

        it('should respond with 403 when the user requesting is not an admin', () =>
            patch(`admin/users/${user1.id}`, 403, { alias: 'Barry 2' }, nonAdminAccessToken));

        it('should respond with 401 when no access token is provided', () =>
            patch(`admin/users/${user1.id}`, 401, {}, null));

        // it('should respond with 403 when authenticated from game', () => {
        //     return chai
        //         .request(server)
        //         .patch('/api/v1/admin/users/' + testUser.id)
        //         .set('Authorization', 'Bearer ' + adminGameAccessToken)
        //         .send({
        //             bans: user.Ban.BANNED_BIO
        //         })
        //         .then((res) => {
        //             expect(res).to.have.status(403);
        //             expect(res).to.be.json;
        //             expect(res.body).toHaveProperty('error');
        //             expect(res.body.error.code).toEqual(403);
        //             expect(typeof res.body.error.message).toBe('string');
        //         });
        // });
    });

    describe('DELETE /api/v1/admin/users/{userID}', () => {
        it('should delete a user', async () => {
            await del(`admin/users/${user1.id}`, 204);

            await get(`users/${user1.id}`, 404);
        });

        it('should respond with 403 when the user requesting only is a moderator', () =>
            del(`admin/users/${user1.id}`, 403, modUserToken));

        it('should respond with 403 when the user requesting is not an admin', () =>
            del(`admin/users/${user1.id}`, 403, nonAdminAccessToken));

        it('should respond with 401 when no access token is provided', () => del(`admin/users/${user1.id}`, 401, null));
    });

    // describe('GET /api/v1/admin/maps', () => {
    // 	it('should respond with 403 when not an admin', () => {
    // 		return chai.request(server)
    // 			.get('/api/v1/admin/maps/')
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
    // 			.get('/api/v1/admin/maps/')
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
    // 			.get('/api/v1/admin/maps/')
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
    // 			.get('/api/v1/admin/maps/')
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
    //                 .get('/api/v1/admin/maps/')
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
    //                 .get('/api/v1/admin/maps/')
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
    //                 .get('/api/v1/admin/maps/')
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
    //                 .get('/api/v1/admin/maps/')
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
    //                 .get('/api/v1/admin/maps/')
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
    //                 .get('/api/v1/admin/maps/')
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
    //                 .get('/api/v1/admin/maps/')
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
    //                 .get('/api/v1/admin/maps/')
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
    //                 .get('/api/v1/admin/maps/')
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
    // describe('PATCH /api/v1/admin/maps/{mapID}', () => {
    // 	it('should respond with 403 when not an admin', () => {
    // 		return chai.request(server)
    // 			.patch('/api/v1/admin/maps/' + testMap.id)
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
    // 			.patch('/api/v1/admin/maps/' + testMap.id)
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
    // 			.patch('/api/v1/admin/maps/' + testMap.id)
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
    // 			.patch('/api/v1/admin/maps/' + testMap.id)
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
    // describe('GET /api/v1/admin/reports', () => {
    // 	it('should respond with a list of reports', () => {
    // 		return chai.request(server)
    // 			.get('/api/v1/admin/reports')
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
    // 			.get('/api/v1/admin/reports')
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
    // describe('PATCH /api/v1/admin/reports/{reportID}', () => {
    // 	it('should update a report', () => {
    // 		return chai.request(server)
    // 			.patch('/api/v1/admin/reports/' + testReport.id)
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
    // describe('DELETE /api/v1/admin/maps/{mapID}', () => {
    // 	it('should delete a map', () => {
    // 		return chai.request(server)
    // 			.delete('/api/v1/admin/maps/' + testMap.id)
    // 			.set('Authorization', 'Bearer ' + adminAccessToken)
    // 			.then(res => {
    // 				expect(res).to.have.status(200);
    // 			});
    // 	});
    // });
    //
    // describe('PATCH /api/v1/admin/user-stats', () => {
    // 	it('should update all user stats', () => {
    // 		return chai.request(server)
    // 			.patch('/api/v1/admin/user-stats')
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
    // describe('GET /api/v1/admin/xpsys', () => {
    // 	it('should return the XP system variables', () => {
    // 		return chai.request(server)
    // 			.get('/api/v1/admin/xpsys')
    // 			.set('Authorization', 'Bearer ' + adminAccessToken)
    // 			.then(res => {
    // 				expect(res).to.have.status(200);
    // 			});
    // 	});
    // });
    //
    // describe('PUT /api/v1/admin/xpsys', () => {
    // 	it('should update the XP system variables', () => {
    // 		return chai.request(server)
    // 			.put('/api/v1/admin/xpsys')
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
