// noinspection DuplicatedCode

import { EMapCreditType, EMapStatus, EMapType } from '../src/@common/enums/map.enum';
import { PrismaRepo } from '../src/modules/prisma/prisma.repo';
import { User } from '@prisma/client';
import { EBan, ERole } from '../src/@common/enums/user.enum';
import { TestUtil } from './util';
import { AuthService } from '../src/modules/auth/auth.service';
import { EActivityTypes } from '../src/@common/enums/activity.enum';

describe('user', () => {
    let user1, user2, user2Token, user3, user3Token, admin, adminGame, adminAccessToken, map;

    beforeAll(async () => {
        const prisma: PrismaRepo = global.prisma;

        user1 = global.testUser as User;

        admin = await prisma.user.create({
            data: {
                aliasLocked: false,
                steamID: '0909',
                alias: 'Arthur Weasley',
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

        user2 = await prisma.user.create({
            data: {
                steamID: '76561198131664084',
                alias: 'Bill Weasley',
                roles: ERole.VERIFIED,
                bans: EBan.BANNED_BIO | EBan.BANNED_ALIAS,
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
                steamID: '00000000000000002',
                alias: 'Percy Weasley',
                avatar: 'e4db45e6d6472d9e61b131a04ad2f18a299daafc_full.jpg',
                roles: ERole.MAPPER | ERole.VERIFIED,
                bans: 0,
                country: 'US',
                profile: {
                    create: {
                        bio: 'Percy Ignatius "Perce" Weasley (b. 22 August, 1976) was an English pure-blood wizard, the third child of Arthur and Molly Weasley (née Prewett). He was the younger brother of Bill and Charlie, the older brother of the late Fred Weasley, George, Ron and Ginny. He attended Hogwarts School of Witchcraft and Wizardry from 1987-1994, and was both a prefect and Head Boy.'
                    }
                }
            }
        });

        map = await prisma.map.create({
            data: {
                name: 'user_test_map',
                type: EMapType.UNKNOWN,
                statusFlag: EMapStatus.APPROVED,
                submitter: { connect: { id: user1.id } },
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
                            type: EMapCreditType.AUTHOR,
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

        adminGame = await prisma.user.create({
            data: {
                steamID: '5416876413213874',
                roles: ERole.ADMIN,
                bans: 0,
                country: 'US'
            }
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

        const authService: AuthService = global.authService as AuthService;
        user2Token = (await authService.login(user2)).access_token;
        user3Token = (await authService.login(user3)).access_token;
    });

    afterAll(async () => {
        const prisma: PrismaRepo = global.prisma;

        await prisma.user.deleteMany({ where: { id: { in: [user2.id, user3.id, admin.id, adminGame.id] } } });

        await prisma.map.delete({ where: { id: map.id } });
    });

    describe('GET /api/v1/user', () => {
        const expects = (res) => {
            ['id', 'alias', 'steamID', 'roles', 'bans', 'avatarURL', 'createdAt', 'updatedAt'].forEach((p) =>
                expect(res.body).toHaveProperty(p)
            );
        };

        it('should respond with user data', async () => {
            const res = await TestUtil.get('user', 200);

            expects(res);
            expect(res.body.alias).toBe(user1.alias);
            expect(res.body).not.toHaveProperty('profile');
        });

        it('should respond with user data and expand profile data', async () => {
            const res = await TestUtil.get('user', 200, { expand: 'profile' });

            expects(res);
            expect(res.body).toHaveProperty('id');
            expect(res.body.profile).toHaveProperty('bio');
            expect(res.body.profile.bio).toBe(user1.profile.bio);
        });

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

        it('should respond with 401 when no access token is provided', async () => {
            await TestUtil.get('user', 401, {}, null);
        });
    });

    describe('PATCH /api/v1/user', () => {
        it('should update the authenticated users profile', async () => {
            await TestUtil.patch(
                'user',
                204,
                {
                    alias: 'Donkey Kong',
                    bio: 'I love Donkey Kong'
                },
                user3Token
            );

            const res = await TestUtil.get('user', 200, { expand: 'profile' }, user3Token);
            expect(res.body.alias).toBe('Donkey Kong');
            expect(res.body.profile.bio).toBe('I love Donkey Kong');
        });

        // TODO: class-validator isnt working properly, see user.dto.ts. afterwards check it 400s

        it('should respond with 403 when trying to update bio when bio banned', async () => {
            await TestUtil.patch('user', 403, { bio: 'Gamer Words' }, user2Token);
        });

        it('should respond with 403 when trying to update alias when alias banned', async () => {
            await TestUtil.patch('user', 403, { alias: 'Gamer Words' }, user2Token);
        });

        it('should respond with 409 when a verified user tries to set their alias to something used by another verified user', async () => {
            await TestUtil.patch('user', 409, { alias: user2.alias }, user3Token);
        });

        it('should allow a verified user to set their alias to something used by an unverified user', async () => {
            await TestUtil.patch('user', 204, { alias: user1.alias }, user3Token);
        });
        it('should allow an unverified user to set their alias to something used by a verified user', async () => {
            await TestUtil.patch('user', 204, { alias: user2.alias });
        });

        it('should respond with 401 when no access token is provided', async () => {
            await TestUtil.patch('user', 401, {}, null);
        });
    });

    describe('GET /api/v1/user/profile', () => {
        it('should respond with authenticated users profile info', async () => {
            const res = await TestUtil.get('user/profile', 200);

            expect(res.body.bio).toBe(user1.profile.bio);
        });

        it('should respond with 401 when no access token is provided', async () => {
            await TestUtil.get('user/profile', 401, {}, null);
        });
    });

    // Come back to this test when the functionality is done

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

    describe('GET /api/v1/user/follow/{userID}', () => {
        it('should return relationships of the given and local user who follow each other', async () => {
            const res = await TestUtil.get(`user/follow/${user2.id}`, 200);

            expect(res.body.local.followedID).toBe(user2.id);
            expect(res.body.local.followeeID).toBe(user1.id);
            expect(res.body.target.followedID).toBe(user1.id);
            expect(res.body.target.followeeID).toBe(user2.id);
        });

        it('should return a relationship of the local user who follows the target, but not the opposite', async () => {
            const res = await TestUtil.get(`user/follow/${user3.id}`, 200);

            expect(res.body.local.followedID).toBe(user3.id);
            expect(res.body.local.followeeID).toBe(user1.id);
            expect(res.body).not.toHaveProperty('target');
        });

        it('should return a relationship of the target user who follows the local user, but not the opposite', async () => {
            const res = await TestUtil.get(`user/follow/${user1.id}`, 200, {}, user3Token);

            expect(res.body.target.followedID).toBe(user3.id);
            expect(res.body.target.followeeID).toBe(user1.id);
            expect(res.body).not.toHaveProperty('local');
        });

        it('should respond with the 200 code if the followed relationship does not exist', async () => {
            const res = await TestUtil.get(`user/follow/${user2.id}`, 200, {}, user3Token);
            expect(res.body).toEqual({});
        });

        it('should respond with 404 if the target user does not exist', async () => {
            await TestUtil.get(`user/follow/283745692345`, 404);
        });

        it('should respond with 401 when no access token is provided', async () => {
            await TestUtil.get(`user/follow/${user2.id}`, 401, {}, null);
        });
    });

    describe('POST /api/v1/user/follow/{userID}', () => {
        it('should respond with 204 and add user to authenticated users follow list', async () => {
            const res = await TestUtil.get(`user/follow/${user3.id}`, 200, {}, user2Token);

            expect(res.body).not.toHaveProperty('local');

            await TestUtil.post(`user/follow/${user3.id}`, 204, {}, user2Token);

            const res2 = await TestUtil.get(`user/follow/${user3.id}`, 200, {}, user2Token);

            expect(res2.body.local.followedID).toBe(user3.id);
            expect(res2.body.local.followeeID).toBe(user2.id);
        });

        it('should respond with 404 if the target user does not exist', async () => {
            await TestUtil.post('user/follow/178124314563', 404);
        });

        it('should respond with 401 when no access token is provided', async () => {
            await TestUtil.post(`user/follow/${user3.id}`, 401, {}, null);
        });
    });

    describe('PATCH /api/v1/user/follow/{userID}', () => {
        it('should update the following status of the local user and the followed user', async () => {
            const res = await TestUtil.get(`user/follow/${user2.id}`, 200, {});

            expect(res.body.local.notifyOn).toBe(0);

            await TestUtil.patch(`user/follow/${user2.id}`, 204, { notifyOn: EActivityTypes.REVIEW_MADE });

            const res2 = await TestUtil.get(`user/follow/${user2.id}`, 200, {});

            expect(res2.body.local.notifyOn).toBe(EActivityTypes.REVIEW_MADE);
        });

        it('should respond with 404 if the target user does not exist', async () => {
            await TestUtil.patch('user/follow/178124314563', 404, { notifyOn: EActivityTypes.REVIEW_MADE });
        });

        it('should respond with 401 when no access token is provided', async () => {
            await TestUtil.patch(`user/follow/${user3.id}`, 401, { notifyOn: EActivityTypes.REVIEW_MADE }, null);
        });
    });

    describe('DELETE /api/v1/user/follow/{userID}', () => {
        it('should remove the user from the local users follow list', async () => {
            const res = await TestUtil.get(`user/follow/${user3.id}`, 200, {}, user2Token);

            expect(res.body).toHaveProperty('local');
            expect(res.body.local.followedID).toBe(user3.id);
            expect(res.body.local.followeeID).toBe(user2.id);

            await TestUtil.delete(`user/follow/${user3.id}`, 204, user2Token);

            const res2 = await TestUtil.get(`user/follow/${user3.id}`, 200, {}, user2Token);

            expect(res2.body).not.toHaveProperty('local');
        });

        it('should respond with 404 if the target user does not exist', async () => {
            await TestUtil.delete('user/follow/178124314563', 404);
        });

        it('should respond with 401 when no access token is provided', async () => {
            await TestUtil.delete(`user/follow/${user3.id}`, 401, null);
        });
    });
    //
    // describe('PUT /api/v1/user/notifyMap/{mapID}', () => {
    //     it('should update map notification status or create new map notification status if no existing notifcations', async () => {
    //         const res = await request(global.server)
    //             .put('/api/v1/user/notifyMap/' + testMap.id)
    //             .set('Authorization', 'Bearer ' + global.accessToken)
    //             .send({
    //                 notifyOn: EActivityTypes.WR_ACHIEVED
    //             })
    //             .expect(200)
    //             .expect('Content-Type', /json/);
    //         expect(res.body).toHaveProperty('notifyOn');
    //     });
    //
    //     it('should respond with 401 when no access token is provided', () =>
    //         request(global.server)
    //             .put('/api/v1/user/notifyMap/' + testMap.id)
    //             .expect(401)
    //             .expect('Content-Type', /json/));
    // });
    //
    // describe('GET /api/v1/user/notifyMap/{mapID}', () => {
    //     it('should check the map notifcation status for a given user', () =>
    //         request(global.server)
    //             .get('/api/v1/user/notifyMap/' + testMap.id)
    //             .set('Authorization', 'Bearer ' + global.accessToken)
    //             .expect(200)
    //             .expect('Content-Type', /json/));
    //
    //     it('should respond with 401 when no access token is provided', () =>
    //         request(global.server)
    //             .get('/api/v1/user/notifyMap/' + testMap.id)
    //             .expect(401)
    //             .expect('Content-Type', /json/));
    // });
    //
    // describe('DELETE /api/v1/user/notifyMap/{mapID}', () => {
    //     it('should remove the user from map notifcations list', () =>
    //         request(global.server)
    //             .delete('/api/v1/user/notifyMap/' + testMap.id)
    //             .set('Authorization', 'Bearer ' + global.accessToken)
    //             .expect(200));
    //
    //     it('should respond with 401 when no access token is provided', () =>
    //         request(global.server)
    //             .delete('/api/v1/user/notifyMap' + testMap.id)
    //             .expect(401)
    //             .expect('Content-Type', /json/));
    // });
    //
    // describe('GET /api/v1/user/notifications', () => {
    //     it('should respond with notification data', async () => {
    //         // ?????
    //         // const serv = chai.keepOpen();
    //
    //         // testUser follows testUser2
    //         const res1 = await serv
    //             .post('/api/v1/user/follow')
    //             .set('Authorization', 'Bearer ' + global.accessToken)
    //             .send({
    //                 userID: user2.id
    //             })
    //             .expect(200);
    //
    //         // changes the follow relationship between testUser and testUser2 to notify when a map is approved
    //         const res2 = await serv
    //             .patch('/api/v1/user/follow/' + user2.id)
    //             .set('Authorization', 'Bearer ' + global.accessToken)
    //             .send({
    //                 notifyOn: 1 << activity.ACTIVITY_TYPES.MAP_APPROVED
    //             })
    //             .expect(204);
    //
    //         // testUser2 creates a map
    //         const res3 = await serv
    //             .post('/api/maps')
    //             .set('Authorization', 'Bearer ' + global.accessToken2)
    //             .send({
    //                 name: 'test_map_notif',
    //                 type: EMapType.SURF,
    //                 info: {
    //                     description: 'newmap_5',
    //                     numTracks: 1,
    //                     creationDate: new Date()
    //                 },
    //                 tracks: [
    //                     {
    //                         trackNum: 0,
    //                         numZones: 1,
    //                         isLinear: false,
    //                         difficulty: 5
    //                     }
    //                 ],
    //                 credits: [
    //                     {
    //                         userID: user2.id,
    //                         type: EMapCreditType.AUTHOR
    //                     }
    //                 ]
    //             })
    //             .expect(200);
    //
    //         // upload the map
    //         const res4 = await serv
    //             .post(new URL(res3.header.location).pathname)
    //             .set('Authorization', 'Bearer ' + global.accessToken2)
    //             .attach('mapFile', fs.readFileSync('test/testMap.bsp'), 'testMap.bsp')
    //             .status(200);
    //
    //         // testadmin approves the map
    //         const res5 = await serv
    //             .patch('/api/admin/maps/' + res3.body.id)
    //             .set('Authorization', 'Bearer ' + adminAccessToken)
    //             .send({ statusFlag: EMapStatus.APPROVED })
    //             .status(204);
    //
    //         // should get the notification that testUser2's map was approved
    //         const res6 = await serv
    //             .get('/api/v1/user/notifications')
    //             .set('Authorization', 'Bearer ' + global.accessToken)
    //             .expect(200);
    //
    //         expect(res6.body).toHaveProperty('notifications');
    //         expect(Array.isArray(res6.body.notifications)).toBe(true);
    //         expect(res6.body.notifications).toHaveLength(1);
    //
    //         serv.close();
    //     });
    //
    //     */
    //     // Commented out until the 0.10.0 replay refactor
    //     it.skip('should respond with notification data for map notifications', () => {}); /*() => {
    // 	// enable map notifications for the given map
    // 	 const res = await request(global.server)
    // 		.put('/api/v1/user/notifyMap/' + testMap.id)
    // 		.set('Authorization', 'Bearer ' + global.accessToken)
    // 		.send({
    // 			notifyOn: activity.ACTIVITY_TYPES.WR_ACHIEVED
    // 		})
    // 		.then(res => {
    // 			// upload a run session
    // 			 const res = await request(global.server)
    // 				.post(`/api/maps/${testMap.id}/session`)
    // 				.set('Authorization', 'Bearer ' + adminGameAccessToken)
    // 				.send({
    // 					trackNum: 0,
    // 					zoneNum: 0,
    // 				})
    // 				.then(res2 => {
    // 					// update the run session
    // 					let sesID = res2.body.id;
    // 					 const res = await request(global.server)
    // 						.post(`/api/maps/${testMap.id}/session/${sesID}`)
    // 						.set('Authorization', 'Bearer ' + adminGameAccessToken)
    // 						.send({
    // 							zoneNum: 2,
    // 							tick: 510,
    // 						})
    // 						.then(res3 => {
    // 							// end the run session
    // 							 const res = await request(global.server)
    // 								.post(`/api/maps/${testMap.id}/session/1/end`)
    // 								.set('Authorization', 'Bearer ' + adminGameAccessToken)
    // 								.set('Content-Type', 'application/octet-stream')
    // 								.send(
    // 									fs.readFileSync('test/testRun.momrec')
    // 								)
    // 								.then(res4 => {
    // 									expect(res2).to.have.status(200);
    // 									expect(res2).to.be.json;
    // 									expect(res2.body).to.have.property('id');
    // 									expect(res3).to.have.status(200);
    // 									expect(res3).to.be.json;
    // 									expect(res3.body).to.have.property('id');
    // 									expect(res4).to.have.status(200);
    // 								})
    // 						});
    // 					});
    // 			});
    // }); */
    //
    //     it('should respond with filtered notification data using the limit parameter', async () => {
    //         const res = await request(global.server)
    //             .get('/api/v1/user/notifications')
    //             .set('Authorization', 'Bearer ' + global.accessToken)
    //             .query({ limit: 1 })
    //             .expect(200);
    //         // TODO: looks like there's stuff missing here.
    //     });
    //
    //     it('should respond with filtered notification data using the offset parameter', async () => {
    //         const res = await request(global.server)
    //             .get('/api/v1/user/notifications')
    //             .set('Authorization', 'Bearer ' + global.accessToken)
    //             .query({ offset: 0, limit: 1 })
    //             .expect(200);
    //         // TODO: as agove
    //     });
    //
    //     describe('PATCH /api/v1/user/notifications/{notifID}', () => {
    //         it('should update the notification', async () => {
    //             const res = await request(global.server)
    //                 .get('/api/v1/user/notifications')
    //                 .set('Authorization', 'Bearer ' + global.accessToken);
    //
    //             const res2 = await request(global.server)
    //                 .patch('/api/v1/user/notifications/' + res.body.notifications[0].id)
    //                 .set('Authorization', 'Bearer ' + global.accessToken)
    //                 .send({ read: true })
    //                 .expect(204);
    //             // expect(res2).to.have.status(204);
    //         });
    //     });
    //
    //     describe('DELETE /api/v1/user/notifications/{notifID}', () => {
    //         it('should delete the notification', async () => {
    //             const res = await request(global.server)
    //                 .get('/api/v1/user/notifications')
    //                 .set('Authorization', 'Bearer ' + global.accessToken);
    //             await request(global.server)
    //                 .delete('/api/v1/user/notifications/' + res.body.notifications[0].id)
    //                 .set('Authorization', 'Bearer ' + global.accessToken)
    //                 .expect(200);
    //         });
    //     });
    //
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
    //
    //     describe('GET /api/v1/user/maps/library', () => {
    //         it('should retrieve the list of maps in the local users library', async () => {
    //             const res = await request(global.server)
    //                 .put('/api/v1/user/maps/library/' + testMap.id)
    //                 .set('Authorization', 'Bearer ' + global.accessToken)
    //                 .expect(200)
    //                 .expect('Content-Type', /json/);
    //
    //             const res2 = await request(global.server)
    //                 .get('/api/v1/user/maps/library')
    //                 .set('Authorization', 'Bearer ' + global.accessToken)
    //                 .expect(200)
    //                 .expect('Content-Type', /json/);
    //
    //             expect(Array.isArray(res2.body.entries)).toBe(true);
    //             expect(res2.body.entries).toHaveLength(2);
    //             expect(res2.body.entries[0]).toHaveProperty('userID');
    //             expect(res2.body.entries[0]).toHaveProperty('map');
    //         });
    //
    //         it('should retrieve a filtered list of maps in the local users library using the limit query', async () => {
    //             const res = await request(global.server)
    //                 .get('/api/v1/user/maps/library')
    //                 .set('Authorization', 'Bearer ' + global.accessToken)
    //                 .query({ limit: 1 })
    //                 .expect(200)
    //                 .expect('Content-Type', /json/);
    //
    //             expect(Array.isArray(res.body.entries)).toBe(true);
    //             expect(res.body.entries).toHaveLength(1);
    //             expect(res.body.entries[0]).toHaveProperty('userID');
    //             expect(res.body.entries[0]).toHaveProperty('map');
    //         });
    //
    //         it('should retrieve a filtered list of maps in the local users library using the offset query', async () => {
    //             const res = await request(global.server)
    //                 .get('/api/v1/user/maps/library')
    //                 .set('Authorization', 'Bearer ' + global.accessToken)
    //                 .query({ offset: 1 })
    //                 .expect(200)
    //                 .expect('Content-Type', /json/);
    //
    //             expect(Array.isArray(res.body.entries)).toBe(true);
    //             expect(res.body.entries).toHaveLength(1);
    //             expect(res.body.entries[0]).toHaveProperty('userID');
    //             expect(res.body.entries[0]).toHaveProperty('map');
    //         });
    //
    //         it('should respond with 401 when no access token is provided', () => {
    //             const res = await request(global.server)
    //                 .get('/api/v1/user/maps/library/')
    //                 .expect(401)
    //                 .expect('Content-Type', /json/);
    //         });
    //     });
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
    //     describe('GET /api/v1/user/activities', () => {
    //         it('should retrieve the local users activities', async () => {
    //             const res = await request(global.server)
    //                 .get('/api/v1/user/activities')
    //                 .set('Authorization', 'Bearer ' + global.accessToken2)
    //                 .expect(200);
    //             expect(Array.isArray(res.body.activities)).toBe(true);
    //             expect(res.body.activities).toHaveLength(4);
    //             expect(res.body.activities[0]).toHaveProperty('id');
    //         });
    //
    //         it('should retrieve the filtered local users activities using the limit parameter', async () => {
    //             const res = await request(global.server)
    //                 .get('/api/v1/user/activities')
    //                 .set('Authorization', 'Bearer ' + global.accessToken2)
    //                 .query({ limit: 1 })
    //                 .expect(200);
    //             expect(Array.isArray(res.body.activities)).toBe(true);
    //             expect(res.body.activities).toHaveLength(1);
    //             expect(res.body.activities[0]).toHaveProperty('id');
    //         });
    //
    //         it('should retrieve the filtered local users activities using the offset parameter', async () => {
    //             const res = await request(global.server)
    //                 .get('/api/v1/user/activities')
    //                 .set('Authorization', 'Bearer ' + global.accessToken2)
    //                 .query({ offset: 1 })
    //                 .expect(200);
    //             expect(Array.isArray(res.body.activities)).toBe(true);
    //             expect(res.body.activities).toHaveLength(3);
    //             expect(res.body.activities[0]).toHaveProperty('id');
    //         });
    //
    //         it('should retrieve the filtered local users activities using the type parameter', async () => {
    //             const res = await request(global.server)
    //                 .get('/api/v1/user/activities')
    //                 .set('Authorization', 'Bearer ' + global.accessToken2)
    //                 .query({ type: EActivityTypes.MAP_APPROVED })
    //                 .expect(200);
    //             expect(Array.isArray(res.body.activities)).toBe(true);
    //             expect(res.body.activities).toHaveLength(2);
    //             expect(res.body.activities[0]).toHaveProperty('id');
    //         });
    //
    //         it('should retrieve the filtered local users activities using the data parameter', async () => {
    //             const res = await request(global.server)
    //                 .get('/api/v1/user/activities')
    //                 .set('Authorization', 'Bearer ' + global.accessToken2)
    //                 .query({ data: 1337 })
    //                 .expect(200);
    //             expect(Array.isArray(res.body.activities)).toBe(true);
    //             expect(res.body.activities).toHaveLength(2);
    //             expect(res.body.activities[0]).toHaveProperty('id');
    //         });
    //
    //         it('should retrieve the local users activities along with an expand (user) parameter', async () => {
    //             const res = await request(global.server)
    //                 .get('/api/v1/user/activities')
    //                 .set('Authorization', 'Bearer ' + global.accessToken2)
    //                 .query({ expand: 'user' })
    //                 .expect(200);
    //             expect(Array.isArray(res.body.activities)).toBe(true);
    //             expect(res.body.activities).toHaveLength(4);
    //             expect(res.body.activities[0]).toHaveProperty('id');
    //             expect(res.body.activities[0].user).toHaveProperty('roles');
    //         });
    //
    //         it('should respond with 401 when no access token is provided', async () =>
    //             request(global.server).get('/api/v1/user/activities').expect(401).expect('Content-Type', /json/));
    //     });
    //
    //     describe('GET /api/v1/user/activities/followed', () => {
    //         it('should add user to authenticated users follow list', () =>
    //             request(global.server)
    //                 .post('/api/v1/user/follow')
    //                 .set('Authorization', 'Bearer ' + global.accessToken)
    //                 .send({
    //                     userID: user2.id
    //                 })
    //                 .expect(200)
    //                 .expect('Content-Type', /json/));
    //
    //         it('should retrieve a list of activities from the local users followed users', async () => {
    //             const res = await request(global.server)
    //                 .get('/api/v1/user/activities/followed')
    //                 .set('Authorization', 'Bearer ' + global.accessToken)
    //                 .expect(200);
    //             expect(Array.isArray(res.body.activities)).toBe(true);
    //             expect(res.body.activities).toHaveLength(4);
    //             expect(res.body.activities[0]).toHaveProperty('id');
    //         });
    //
    //         it('should retrieve a filtered list of activities from the local users followed users using the limit parameter', async () => {
    //             const res = await request(global.server)
    //                 // limit... is the limit I set -1. limit three returns 2 and limit two returns 1
    //                 .get('/api/v1/user/activities/followed')
    //                 .set('Authorization', 'Bearer ' + global.accessToken)
    //                 .query({ limit: 2 })
    //                 .expect(200);
    //             expect(Array.isArray(res.body.activities)).toBe(true);
    //             //     expect(res.body.activities).to.have.length(1);
    //             expect(res.body.activities[0]).toHaveProperty('id');
    //         });
    //
    //         it('should retrieve a filtered list of activities from the local users followed users using the offset parameter', async () => {
    //             const res = await request(global.server)
    //                 // same problem as offset i think
    //                 // length issue
    //                 .get('/api/v1/user/activities/followed')
    //                 .set('Authorization', 'Bearer ' + global.accessToken)
    //                 .query({ offset: 1 })
    //                 .expect(200);
    //             expect(Array.isArray(res.body.activities)).toBe(true);
    //             //     expect(res.body.activities).to.have.length(1);
    //             expect(res.body.activities[0]).toHaveProperty('id');
    //         });
    //
    //         it('should retrieve a filtered list of activities from the local users followed users using the type parameter', async () => {
    //             const res = await request(global.server)
    //                 .get('/api/v1/user/activities/followed')
    //                 .set('Authorization', 'Bearer ' + global.accessToken)
    //                 .query({ type: EActivityTypes.MAP_APPROVED })
    //                 .expect(200);
    //             expect(Array.isArray(res.body.activities)).toBe(true);
    //             expect(res.body.activities).toHaveLength(2);
    //             expect(res.body.activities[0]).toHaveProperty('id');
    //         });
    //
    //         it('should retrieve a filtered list of activities from the local users followed users using the data parameter', async () => {
    //             const res = await request(global.server)
    //                 .get('/api/v1/user/activities/followed')
    //                 .set('Authorization', 'Bearer ' + global.accessToken)
    //                 .query({ data: 1337 })
    //                 .expect(200);
    //             expect(Array.isArray(res.body.activities)).toBe(true);
    //             expect(res.body.activities).toHaveLength(2);
    //             expect(res.body.activities[0]).toHaveProperty('id');
    //         });
    //
    //         it('should respond with 401 when no access token is provided', () =>
    //             request(global.server)
    //                 .get('/api/v1/user/activities/followed')
    //                 .expect(401)
    //                 .expect('Content-Type', /json/));
    //     });
    // });
});
