// noinspection DuplicatedCode

import { ERole } from '../src/@common/enums/user.enum';
import { EReportCategory, EReportType } from '../src/@common/enums/report.enum';
import { EMapCreditType, EMapStatus, EMapType } from '../src/@common/enums/map.enum';
import { PrismaService } from '../src/modules/repo/prisma.service';
import { TestUtil } from './util';
import { AuthService } from '../src/modules/auth/auth.service';
import { EActivityTypes } from '../src/@common/enums/activity.enum';

describe('admin', () => {
    let adminUser, nonAdminUser, nonAdminAccessToken, user1, user2, mergeUser1, mergeUser2, map1, map2, map3;
    const testUser = {
        id: 1,
        steamID: '1254652365',
        roles: ERole.VERIFIED,
        bans: 0
    };

    const testAdmin = {
        id: 2,
        steamID: '9856321549856',
        roles: ERole.ADMIN,
        bans: 0
    };

    const testAdminGame = {
        id: 3,
        steamID: '5698752164498',
        roles: ERole.ADMIN,
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
        type: EMapType.UNKNOWN,
        id: 1,
        statusFlag: EMapStatus.APPROVED,
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
            type: EMapCreditType.AUTHOR,
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
            type: EMapCreditType.AUTHOR,
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
            type: EMapCreditType.AUTHOR,
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
            type: EMapCreditType.AUTHOR,
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
            type: EMapCreditType.AUTHOR,
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
            type: EMapCreditType.AUTHOR,
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
            type: EMapCreditType.AUTHOR,
            userID: testAdmin.id
        }
    };
    const testReport = {
        id: 1,
        data: 1,
        type: EReportType.USER_PROFILE_REPORT,
        category: EReportCategory.OTHER,
        submitterID: testUser.id,
        message: 'I am who I am who am I?',
        resolved: false,
        resolutionMessage: ''
    };
    const testReport2 = {
        id: 2,
        data: 1,
        tpe: EReportType.MAP_REPORT,
        category: EReportCategory.OTHER,
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
                roles: ERole.ADMIN,
                bans: 0,
                country: 'UK',
                profile: {
                    create: {
                        bio: 'Arthur Weasley (b. 6 February, 1950) was an English pure-blood wizard in the employ of the Ministry of Magic, as well as a member of the second Order of the Phoenix. He was a staunch believer in the equality of all magical and Muggle folk and was the head of the Weasley family.'
                    }
                }
            }
        });

        nonAdminUser = await prisma.user.create({
            data: {
                steamID: '7863245554',
                alias: 'Non Admin User',
                roles: 0,
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
                alias: 'U1'
            }
        });

        user2 = await prisma.user.create({
            data: {
                steamID: '12341234214521`',
                alias: 'U2'
            }
        });

        mergeUser1 = await prisma.user.create({
            data: {
                steamID: '612374578254',
                alias: 'MU1',
                roles: ERole.PLACEHOLDER
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
                    notifyOn: EActivityTypes.MAP_APPROVED,
                    createdAt: new Date('12/24/2021')
                },
                {
                    followeeID: user2.id,
                    followedID: mergeUser2.id,
                    notifyOn: EActivityTypes.MAP_UPLOADED,
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
                    type: EActivityTypes.REPORT_FILED,
                    userID: mergeUser1.id,
                    data: 123456n
                }
            ]
        });

        const authService = global.auth as AuthService;
        global.accessToken = (await authService.login(adminUser)).access_token;
        nonAdminAccessToken = (await authService.login(nonAdminUser)).access_token;
        // return forceSyncDB()
        // 	.then(() => {
        // 		return auth.genAccessToken(testUser);
        // 	}).then((token) => {
        // 		accessToken = token;
        // 		return User.create(testUser);
        // 	}).then(() => {
        // 		testAdmin.roles |= ERole.ADMIN;
        // 		return auth.genAccessToken(testAdmin);
        // 	}).then((token) => {
        // 		adminAccessToken = token;
        // 		return User.create(testAdmin);
        // 	}).then((testAd) => {
        // 		testMap5.submitterID = testAd.id;
        // 		testMap6.submitterID = testAd.id;
        // 		uniqueMap.submitterID = testAd.id;
        // 		testAdminGame.roles = ERole.ADMIN;
        // 		return auth.genAccessToken(testAdminGame, true);
        // 	}).then((token) => {
        // 		adminGameAccessToken = token;
        // 		return User.create(testAdminGame);
        // 	}).then(() => {
        // 		return User.create(testDeleteUser);
        // 	}).then(() => {
        // 		return Map.create(testMap, {
        // 			include: [
        // 				{model: MapInfo, as: 'info',},
        // 				{model: MapCredit, as: 'credits'}
        // 			],
        // 		});
        // 	}).then(() => {
        // 		return Map.create(testMap2, {
        // 			include: [
        // 				{model: MapInfo, as: 'info',},
        // 				{model: MapCredit, as: 'credits'}
        // 			],
        // 		});
        // 	}).then(() => {
        // 		return Map.create(testMap3, {
        // 			include: [
        // 				{model: MapInfo, as: 'info',},
        // 				{model: MapCredit, as: 'credits'}
        // 			],
        // 		});
        // 	}).then(() => {
        // 		return Map.create(testMap4, {
        // 			include: [
        // 				{model: MapInfo, as: 'info',},
        // 				{model: MapCredit, as: 'credits'}
        // 			],
        // 		});
        // 	}).then(() => {
        // 		return Map.create(testMap5, {
        // 			include: [
        // 				{model: MapInfo, as: 'info',},
        // 				{model: MapCredit, as: 'credits'}
        // 			],
        // 		});
        // 	}).then(() => {
        // 		return Map.create(testMap6, {
        // 			include: [
        // 				{model: MapInfo, as: 'info',},
        // 				{model: MapCredit, as: 'credits'}
        // 			],
        // 		});
        // 	}).then(() => {
        // 		return Map.create(uniqueMap, {
        // 			include: [
        // 				{model: MapInfo, as: 'info'},
        // 				{model: MapCredit, as: 'credits'}
        // 			],
        // 		});
        // 	}).then(() => {
        // 		uniqueMap.id = map.id;
        // 		return Report.bulkCreate([
        // 			testReport,
        // 			testReport2,
        // 		]);
        // 	}).then(() => {
        // 		// Create our default XP systems table if we don't already have it
        // 		return xpSystems.initXPSystems(XPSystems);
        // 	}).then(() => {
        // 		return user.createPlaceholder('Placeholder1');
        // 	}).then((usr) => {
        // 		testMergeUser1 = usr;
        // 		return user.createPlaceholder('Placeholder2');
        // 	}).then((usr2) => {
        // 		testMergeUser2 = usr2;
        // 		return Promise.resolve();
        // 	});
    });

    afterEach(async () => {
        const prisma: PrismaService = global.prisma;

        await prisma.user.deleteMany({
            where: { id: { in: [adminUser.id, nonAdminUser.id, mergeUser1.id, mergeUser2.id, user1.id, user2.id] } }
        });
    });

    describe('endpoints', () => {
        describe('POST /api/v1/admin/users', () => {
            it('should successfully create a placeholder user', async () => {
                const res = await TestUtil.post('admin/users/', 201, { alias: 'Burger' });
                // TODO: improve after i improve tests

                expect(res.body.alias).toBe('Burger');
            });

            it('should respond with 403 when the user requesting is not an admin', async () => {
                await TestUtil.post('admin/users/', 403, { alias: 'Barry 2' }, nonAdminAccessToken);
            });

            it('should respond with 401 when no access token is provided', async () => {
                await TestUtil.post('admin/users/', 401, {}, null);
            });
        });

        describe('POST /api/v1/admin/users/merge', () => {
            it('should merge two accounts together', async () => {
                const res = await TestUtil.post('admin/users/merge', 200, {
                    placeholderID: mergeUser1.id,
                    userID: mergeUser2.id
                });

                // TODO have all user props yaddayadda update this once improved --- figure that out!!
                expect(res.body.id).toBe(mergeUser2.id);
                expect(res.body.alias).toBe(mergeUser2.alias);

                // U1 was following MU1, that should be transferred to MU2.
                const u1Follows = await TestUtil.get(`users/${user1.id}/follows`, 200);

                expect(u1Follows.body.response.some((f) => f.followed.id === mergeUser2.id)).toBe(true);

                // U2 was following MU1 and MU2, the creation data should be earliest of the two and the \notifyOn flags combined.
                const u2Follows = await TestUtil.get(`users/${user2.id}/follows`, 200);
                const follow = u2Follows.body.response.find((f) => f.followed.id === mergeUser2.id);
                expect(new Date(follow.createdAt)).toEqual(new Date('12/24/2021'));
                expect(follow.notifyOn).toBe(EActivityTypes.MAP_APPROVED | EActivityTypes.MAP_UPLOADED);

                // MU2 was following MU1, that should be deleted
                const mu2follows = await TestUtil.get(`users/${mergeUser2.id}/follows`, 200);
                expect(mu2follows.body.response.some((f) => f.followed.id === mergeUser1.id)).toBe(false);

                // MU1's activities should have been transferred to MU2
                const mu2Activities = await TestUtil.get(`users/${mergeUser2.id}/activities`, 200);
                expect(mu2Activities.body.response[0].data).toBe('123456');

                // Placeholder should have been deleted
                await TestUtil.get(`users/${mergeUser1.id}`, 404);
            });

            it('should respond with 400 if the user to merge from is not a placeholder', async () => {
                await TestUtil.post('admin/users/merge', 400, {
                    placeholderID: user1.id,
                    userID: mergeUser2.id
                });
            });

            it('should respond with 400 if the user to merge from does not exist', async () => {
                await TestUtil.post('admin/users/merge', 400, {
                    placeholderID: 9812364981265872,
                    userID: mergeUser2.id
                });
            });

            it('should respond with 400 if the user to merge to does not exist', async () => {
                await TestUtil.post('admin/users/merge', 400, {
                    placeholderID: mergeUser1.id,
                    userID: 2368745234521
                });
            });

            it('should respond with 400 if the user to merge are the same user', async () => {
                await TestUtil.post('admin/users/merge', 400, {
                    placeholderID: mergeUser1.id,
                    userID: mergeUser1.id
                });
            });

            it('should respond with 403 when the user requesting is not an admin', async () => {
                const res = await TestUtil.post(
                    'admin/users/merge',
                    403,
                    {
                        placeholderID: mergeUser1.id,
                        userID: mergeUser2.id
                    },
                    nonAdminAccessToken
                );
            });

            it('should respond with 401 when no access token is provided', async () => {
                const res = await TestUtil.post('admin/users/', 401, {}, null);
            });
        });

        // describe('DELETE /api/v1/admin/users/{userID}', () => {
        // 	it('should delete a user', () => {
        // 		return chai.request(server)
        // 			.delete('/api/v1/admin/users/' + testDeleteUser.id)
        // 			.set('Authorization', 'Bearer ' + adminAccessToken)
        // 			.then(res => {
        // 				expect(res).to.have.status(200);
        // 			});
        // 	})
        // });
        //
        // describe('PATCH /api/v1/admin/users/{userID}', () => {
        // 	it('should respond with 403 when not an admin', () => {
        // 		return chai.request(server)
        // 			.patch('/api/v1/admin/users/' + testUser.id)
        // 			.set('Authorization', 'Bearer ' + accessToken)
        // 			.send({
        // 				bans: user.Ban.BANNED_BIO
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
        // 			.patch('/api/v1/admin/users/' + testUser.id)
        // 			.set('Authorization', 'Bearer ' + adminGameAccessToken)
        // 			.send({
        // 				bans: user.Ban.BANNED_BIO
        // 			})
        // 			.then(res => {
        // 				expect(res).to.have.status(403);
        // 				expect(res).to.be.json;
        // 				expect(res.body).toHaveProperty('error');
        // 				expect(res.body.error.code).toEqual(403);
        // 				expect(typeof res.body.error.message).toBe('string');
        // 			});
        // 	});
        //
        // 	it('should update a specific user', () => {
        // 		return chai.request(server)
        // 			.patch('/api/v1/admin/users/' + testUser.id)
        // 			.set('Authorization', 'Bearer ' + adminAccessToken)
        // 			.send({
        // 				bans: user.Ban.BANNED_BIO
        // 			})
        // 			.then(res => {
        // 				expect(res).to.have.status(204);
        // 			});
        // 	});
        // 	it('should respond with 401 when no access token is provided', () => {
        // 		return chai.request(server)
        // 			.patch('/api/v1/admin/users/' + testUser.id)
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
});
