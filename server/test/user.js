'use strict';
process.env.NODE_ENV = 'test';

const { forceSyncDB, User, Profile, Map, MapInfo, Activity, MapCredit, MapStats, MapImage, MapTrack, MapZone, UserStats } = require('../config/sqlize'),
	chai = require('chai'),
	chaiHttp = require('chai-http'),
	expect = chai.expect,
	server = require('../server.js'),
	auth = require('../src/models/auth'),
	user = require('../src/models/user'),
	map = require('../src/models/map'),
	activity = require('../src/models/activity'),
	fs = require('fs');

chai.use(chaiHttp);

describe('user', () => {

	let accessToken = null;
	let accessToken2 = null;
	let adminAccessToken = null;
	let adminGameAccessToken = null;
	const testUser = {
		id: 1,
		steamID: '76561198131664084',
		alias: 'cjshiner',
		avatarURL: 'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/e4/e4db45e6d6472d9e61b131a04ad2f18a299daafc_full.jpg',
		roles: user.Role.MAPPER,
		bans: 0,
		country: 'US',
		profile: {
			bio: '',
		},
		stats: {
			mapsCompleted: 3,
		},
	};
	const testUser2 = {
		id: 2,
		steamID: '00000000000000002',
		alias: 'test2',
		avatarURL: 'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/e4/e4db45e6d6472d9e61b131a04ad2f18a299daafc_full.jpg',
		roles: user.Role.MAPPER,
		bans: 0,
		country: 'US',
		profile: {
			bio: 'test2',
		}
	};
	const testUser3 = {
		id: 3,
		steamID: '00000000000000003',
		alias: 'test3',
		avatarURL: 'http://google.com',
		roles: user.Role.MAPPER,
		bans: 0,
		country: 'US',
		profile: {
			bio: 'test3',
		}
	};

	const testAdmin = {
		id: 4,
		steamID: '0909',
		alias: 'testAdmin',
		avatarURL: 'http://google.com',
		roles: user.Role.ADMIN,
		bans: 0,
		country: 'US',
		profile: {
			bio: 'testAdmin',
		}
	};

	const testAdminGame = {
		id: 5,
		steamID: '5416876413213874',
		roles: user.Role.ADMIN,
		bans: 0,
		country: 'US',
	};

	const testMap = {
		name: 'test_map_one',
		type: map.MAP_TYPE.UNKNOWN,
		id: 1,
		statusFlag: map.STATUS.APPROVED,
		submitterID: testUser.id,
		info: {
			description: 'My first map!!!!',
			numTracks: 1,
			creationDate: new Date(),
		},
		tracks: [{
			trackNum: 0,
			numZones: 1,
			isLinear: false,
			difficulty: 5,
			zones: [
				{
					zoneNum: 0,
					zoneType: 0,
				},
				{
					zoneNum: 1,
					zoneType: 1,
				}
			]
		}],
		credits: {
			id: 1,
			type: map.CreditType.AUTHOR,
			userID: testUser.id,
		},
		images: {
			id: 1,
			URL: 'https://media.moddb.com/cache/images/mods/1/29/28895/thumb_620x2000/Wallpaper.jpg'
		},
		stats: {
			id: 1,
			totalReviews: 1,
		}
	};

	const testMap2 = {
		id: 222,
		name: 'test_map_two',
		type: map.MAP_TYPE.BHOP,
		statusFlag: map.STATUS.APPROVED,
		submitterID: testUser.id,
		info: {
			description: 'My test map!!!!',
			numTracks: 1,
			creationDate: new Date(),
		},
		tracks: [{
			trackNum: 0,
			numZones: 1,
			isLinear: false,
			difficulty: 5,
		}],
		credits: {
			id: 2,
			type: map.CreditType.AUTHOR,
			userID: testUser.id,
		},
		images: {
			id: 3,
			URL: 'http://localhost:3002/img/maps/testmap.jpg'
		}
	};

	const testMap3 = {
		id: 444,
		name: 'test_map',
		type: map.MAP_TYPE.SURF,
		submitterID: testUser.id,
		statusFlag: map.STATUS.NEEDS_REVISION,
		info: {
			description: 'test3',
			numTracks: 1,
			creationDate: new Date(),
		},
		tracks: [{
			trackNum: 0,
			numZones: 1,
			isLinear: false,
			difficulty: 5,
		}],
		credits: {
			id: 3,
			type: map.CreditType.AUTHOR,
			userID: testUser.id,
		},
	};

	const testmappost = {
		id: 13333,
		name: 'test_map_post',
		info: {
			description: 'testpost',
			numTracks: 1,
			creationDate: new Date(),
		},
		tracks: [{
			trackNum: 0,
			numZones: 1,
			isLinear: false,
			difficulty: 5,
		}],
	};

	const testActivities = [
		{
			userID: testUser.id,
			data: 1337,
			type: activity.ACTIVITY_TYPES.ALL,
		},
		{
			userID: testUser2.id,
			data: 1337,
			type: activity.ACTIVITY_TYPES.MAP_APPROVED,
		},
		{
			userID: testUser2.id,
			data: 1337,
			type: activity.ACTIVITY_TYPES.ALL,
		}
	];


	before(() => {
		return forceSyncDB()
			.then(() => {
				testAdmin.roles |= user.Role.ADMIN;
				return auth.genAccessToken(testAdmin);
			})
			.then((token) => {
				adminAccessToken = token;
				return User.create(testAdmin,{
					include: [{
						model: Profile,
						as: 'profile',
					}]
				})
			})
			.then(() => {
				testAdminGame.roles |= user.Role.ADMIN;
				return auth.genAccessToken(testAdminGame, true);
			}).then((token) => {
				adminGameAccessToken = token;
				return User.create(testAdminGame);
			})
			.then(() => {
				return auth.genAccessToken(testUser2);
			})
			.then((token) => {
				accessToken2 = token;
				return User.create(testUser2, {
					include: [
						{  model: Profile, as: 'profile',},
					]
				})
			})
			.then(() => {
				return auth.genAccessToken(testUser);
			})
			.then((token) => {
				accessToken = token;
				return User.create(testUser, {
						include: [
							{  model: Profile, as: 'profile'},
							{  model: UserStats, as: 'stats'},
						]
				})
			})
			.then(() => {
				return Map.create(testMap, {
					include: [
						{  model: MapInfo, as: 'info',},
						{  model: MapCredit, as: 'credits'},
						{  model: MapTrack, as: 'tracks', include: [{ model: MapZone, as: 'zones' }] },
					]
				})
			})
			.then(user => {
				return Map.create(testMap2, {
					include: [
						{  model: MapInfo, as: 'info',},
						{  model: MapImage, as: 'images'},
						{  model: MapCredit, as: 'credits'},
					]
				})
			})
			.then(user => {
				return Map.create(testMap3, {
					include: [
						{  model: MapInfo, as: 'info',},
						{  model: MapCredit, as: 'credits'},
					]
				})
			}).then(() => {
					return User.create(testUser3, {
						include: [{
							model: Profile,
							as: 'profile',
						}]
					})
				.then(user => {
					testUser.id = user.id;
					return Activity.bulkCreate(testActivities);
				});
			});
	});

	describe('modules', () => {

	});

	describe('endpoints', () => {

		describe('GET /api/user', () => {
			it('should respond with user data', () => {
				return chai.request(server)
					.get('/api/user')
					.set('Authorization', 'Bearer ' + accessToken)
					.then(res => {
						expect(res).to.have.status(200);
						expect(res).to.be.json;
						expect(res.body).to.have.property('id');
						expect(res.body).to.have.property('createdAt');
					});
			});


			it('should respond with user data and expand profile data', () => {
				return chai.request(server)
					.get('/api/user')
					.set('Authorization', 'Bearer ' + accessToken)
					.query({ expand: "profile"})
					.then(res => {
						expect(res).to.have.status(200);
						expect(res).to.be.json;
						expect(res.body).to.have.property('id');
						expect(res.body.profile).to.have.property('bio');
					});
			});

			it('should respond with user data and expand user stats', () => {
				return chai.request(server)
					.get('/api/user')
					.set('Authorization', 'Bearer ' + accessToken)
					.query({expand: 'stats'})
					.then(res => {
						expect(res).to.have.status(200);
						expect(res).to.be.json;
						expect(res.body).to.have.property('id');
						expect(res.body.stats).to.have.property('totalJumps');
						expect(res.body.stats).to.have.property('id');
					});
			});

			it('should respond with 401 when no access token is provided', () => {
				return chai.request(server)
					.get('/api/user')
					.then(res => {
						expect(res).to.have.status(401);
						expect(res).to.be.json;
						expect(res.body).to.have.property('error');
						expect(res.body.error.code).equal(401);
						expect(res.body.error.message).to.be.a('string');
					});
			});
		});

		describe('PATCH /api/user', () => {
			it('should update the authenticated users profile', () => {
				return chai.request(server)
					.patch('/api/user')
					.set('Authorization', 'Bearer ' + accessToken)
					.send({
						alias: 'test2',
						profile: {
							bio: 'test',
						},
					})
					.then(res => {
						expect(res).to.have.status(204);
					});
			});
			it('should respond with 401 when no access token is provided', () => {
				return chai.request(server)
					.patch('/api/user')
					.then(res => {
						expect(res).to.have.status(401);
						expect(res).to.be.json;
						expect(res.body).to.have.property('error');
						expect(res.body.error.code).equal(401);
						expect(res.body.error.message).to.be.a('string');
					});
			});
		});

		describe('GET /api/user/profile', () => {
			it('should respond with authenticated users profile info', () => {
				return chai.request(server)
					.get('/api/user/profile')
					.set('Authorization', 'Bearer ' + accessToken)
					.then(res => {
						expect(res).to.have.status(200);
						expect(res).to.be.json;
						expect(res.body).to.have.property('id');
						expect(res.body).to.have.property('bio');
					});
			});
			it('should respond with 401 when no access token is provided', () => {
				return chai.request(server)
					.get('/api/user/profile/')
					.then(res => {
						expect(res).to.have.status(401);
						expect(res).to.be.json;
						expect(res.body).to.have.property('error');
						expect(res.body.error.code).equal(401);
						expect(res.body.error.message).to.be.a('string');
					});
			});
		});


		// Come back to this test when the functionality is done

		/*
		describe('DELETE /api/user/profile/social/{type}', () => {
			it('should return 200 and unlink the twitter account from the authd user', () => {
				return chai.request(server)
				.delete('/api/user/profile/social/' + 'twitter')
				.set('Authorization', 'Bearer ' + accessToken)
				.then(res => {
					expect(res).to.have.status(200);
					expect(res).to.be.json;
				});
			});
			 it('should return 200 and unlink the discord account from the authd user', () => {
				return chai.request(server)
				.delete('/api/user/profile/social/' + 'discord')
				.set('Authorization', 'Bearer ' + accessToken)
				.then(res => {
					expect(res).to.have.status(200);
					expect(res).to.be.json;
				});
			});
			 it('should return 200 and unlink the twitch account from the authd user', () => {
				return chai.request(server)
				.delete('/api/user/profile/social/' + 'twitch')
				.set('Authorization', 'Bearer ' + accessToken)
				.then(res => {
					expect(res).to.have.status(200);
					expect(res).to.be.json;
				});
			});
		});
		*/

		describe('GET /api/user/follow/{userID}', () => {
			it('should check the relationship of the given and local user', () => {
				return chai.request(server)
					.post('/api/user/follow')
					.set('Authorization', 'Bearer ' + accessToken)
					.send({
						userID: testUser2.id
					})
					.then(res => {
						return chai.request(server)
							.get('/api/user/follow/' + testUser2.id)
							.set('Authorization', 'Bearer ' + accessToken)
							.then(res2 => {
								expect(res).to.have.status(200);
								expect(res).to.be.json;
								expect(res2).to.have.status(200);
								expect(res2).to.be.json;
								expect(res2.body).to.have.property('local');
								expect(res2.body.local).to.have.property('followeeID');
							});
					});
			});

			it('should only respond with the 200 code since the followed relationship does not exist', () => {
				return chai.request(server)
					.get('/api/user/follow/12345')
					.set('Authorization', 'Bearer ' + accessToken)
					.then(res => {
						expect(res).to.have.status(200);
						expect(res).to.not.have.property('local');
					});

			});
			it('should respond with 401 when no access token is provided', () => {
				return chai.request(server)
					.get('/api/user/follow/' + testUser2.id)
					.then(res => {
						expect(res).to.have.status(401);
						expect(res).to.be.json;
						expect(res.body).to.have.property('error');
						expect(res.body.error.code).equal(401);
						expect(res.body.error.message).to.be.a('string');
					});
			});
		});




		describe('POST /api/user/follow', () => {
			it('should add user to authenticated users follow list', () => {
				return chai.request(server)
					.post('/api/user/follow')
					.set('Authorization', 'Bearer ' + accessToken)
					.send({
						userID: testUser3.id
					})
					.then(res => {
						expect(res).to.have.status(200);
						expect(res).to.be.json;
					});
			});
			it('should respond with 401 when no access token is provided', () => {
				return chai.request(server)
					.get('/api/user/maps/follow')
					.then(res => {
						expect(res).to.have.status(401);
						expect(res).to.be.json;
						expect(res.body).to.have.property('error');
						expect(res.body.error.code).equal(401);
						expect(res.body.error.message).to.be.a('string');
					});
			});
		});

		describe('PATCH /api/user/follow/{userID}', () => {
			it('should update the following status of the local user and the followed user', () => {
				return chai.request(server)
					.patch('/api/user/follow/' + testUser2.id)
					.set('Authorization', 'Bearer ' + accessToken)
					.send({
						notifyOn: activity.ACTIVITY_TYPES.ALL
					})
					.then(res => {
						expect(res).to.have.status(204);
					});
			});
			it('should respond with 401 when no access token is provided', () => {
				return chai.request(server)
					.get('/api/user/follow/' + testUser2.id)
					.then(res => {
						expect(res).to.have.status(401);
						expect(res).to.be.json;
						expect(res.body).to.have.property('error');
						expect(res.body.error.code).equal(401);
						expect(res.body.error.message).to.be.a('string');
					});
			});
		});

		describe('DELETE /api/user/follow/{userID}', () => {
			it('should remove the user from the local users follow list', () => {
				return chai.request(server)
					.post('/api/user/follow')
					.set('Authorization', 'Bearer ' + accessToken)
					.send({
						userID: testUser3.id
					})
					.then(res => {
						return chai.request(server)
							.get('/api/user/follow/' + testUser3.id)
							.set('Authorization', 'Bearer ' + accessToken)
							.then(res2 => {
								return chai.request(server)
									.delete('/api/user/follow/' + testUser3.id )
									.set('Authorization', 'Bearer ' + accessToken)
									.then(res3 => {
										expect(res).to.have.status(200);
										expect(res).to.be.json;
										expect(res2).to.have.status(200);
										expect(res2).to.be.json;
										expect(res2.body).to.have.property('local');
										expect(res2.body.local).to.have.property('followeeID');
										expect(res3).to.have.status(200);
									});
							});
					});
			});
			it('should respond with 401 when no access token is provided', () => {
				return chai.request(server)
					.get('/api/user/follow/' + testUser3.id)
					.then(res => {
						expect(res).to.have.status(401);
						expect(res).to.be.json;
						expect(res.body).to.have.property('error');
						expect(res.body.error.code).equal(401);
						expect(res.body.error.message).to.be.a('string');
					});
			});
		});

		describe('PUT /api/user/notifyMap/{mapID}', () => {
			it('should update map notification status or create new map notification status if no existing notifcations', () => {
				return chai.request(server)
					.put('/api/user/notifyMap/' + testMap.id)
					.set('Authorization', 'Bearer ' + accessToken)
					.send({
						notifyOn: activity.ACTIVITY_TYPES.WR_ACHIEVED
					})
					.then(res => {
						expect(res).to.have.status(200);
						expect(res).to.be.json;
						expect(res.body).to.have.property('notifyOn');
					});
			});
			it('should respond with 401 when no access token is provided', () => {
				return chai.request(server)
					.put('/api/user/notifyMap/' + testMap.id)
					.then(res => {
						expect(res).to.have.status(401);
						expect(res).to.be.json;
						expect(res.body).to.have.property('error');
						expect(res.body.error.code).equal(401);
						expect(res.body.error.message).to.be.a('string');
					});
			});
		});

		describe('GET /api/user/notifyMap/{mapID}', () => {
			it('should check the map notifcation status for a given user', () => {
				return chai.request(server)
					.get('/api/user/notifyMap/' + testMap.id)
					.set('Authorization', 'Bearer ' + accessToken)
					.then(res => {
						expect(res).to.have.status(200);
						expect(res).to.be.json;
					});
			});
			it('should respond with 401 when no access token is provided', () => {
				return chai.request(server)
					.get('/api/user/notifyMap/' + testMap.id)
					.then(res => {
						expect(res).to.have.status(401);
						expect(res).to.be.json;
						expect(res.body).to.have.property('error');
						expect(res.body.error.code).equal(401);
						expect(res.body.error.message).to.be.a('string');
					});
			});
		});

		describe('DELETE /api/user/notifyMap/{mapID}', () => {
			it('should remove the user from map notifcations list', () => {
				return chai.request(server)
					.delete('/api/user/notifyMap/' + testMap.id)
					.set('Authorization', 'Bearer ' + accessToken)
					.then(res => {
						expect(res).to.have.status(200);
					});
			});
			it('should respond with 401 when no access token is provided', () => {
				return chai.request(server)
					.delete('/api/user/notifyMap' + testMap.id)
					.then(res => {
						expect(res).to.have.status(401);
						expect(res).to.be.json;
						expect(res.body).to.have.property('error');
						expect(res.body.error.code).equal(401);
						expect(res.body.error.message).to.be.a('string');
					});
			});
		});

		describe('GET /api/user/notifications', () => {
			it('should respond with notification data', async function() {
				const serv = chai.request(server).keepOpen();

				// testUser follows testUser2
				const res1 = await serv.post('/api/user/follow')
					.set('Authorization', 'Bearer ' + accessToken)
					.send({
						userID: testUser2.id
					});

				// changes the follow relationship between testUser and testUser2 to notify when a map is approved
				const res2 = await serv.patch('/api/user/follow/' + testUser2.id)
					.set('Authorization', 'Bearer ' + accessToken)
					.send({
						notifyOn: 1 << activity.ACTIVITY_TYPES.MAP_APPROVED
					});

				// testUser2 creates a map
				const res3 = await serv.post('/api/maps')
					.set('Authorization', 'Bearer ' + accessToken2)
					.send({
						name: 'test_map_notif',
						type: map.MAP_TYPE.SURF,
						info: {
							description: 'newmap_5',
							numTracks: 1,
							creationDate: new Date(),
						},
						tracks: [{
							trackNum: 0,
							numZones: 1,
							isLinear: false,
							difficulty: 5,
						}],
						credits: [{
							userID: testUser2.id,
							type: map.CreditType.AUTHOR,
						}]
					});

				// upload the map
				const res4 = await serv.put(new URL( res3.header.location ).pathname)
					.set('Authorization', 'Bearer ' + accessToken2)
					.attach('mapFile', fs.readFileSync('test/testMap.bsp'), 'testMap.bsp');

				// testadmin approves the map
				const res5 = await serv.patch('/api/admin/maps/' + res3.body.id)
					.set('Authorization', 'Bearer ' + adminAccessToken)
					.send({ statusFlag: map.STATUS.APPROVED });

				// should get the notification that testUser2's map was approved
				const res6 = await serv.get('/api/user/notifications')
					.set('Authorization', 'Bearer ' + accessToken)
					.then(res6 => {
						expect(res1).to.have.status(200);
						expect(res2).to.have.status(204);
						expect(res3).to.have.status(200);
						expect(res4).to.have.status(200);
						expect(res5).to.have.status(204);
						expect(res6).to.have.status(200);
						expect(res6.body).to.have.property('notifications');
						expect(res6.body.notifications).to.be.an('array');
						expect(res6.body.notifications).to.have.length(1);
					}).finally(() => {});

				serv.close();
			});
		});
		// Commented out until the 0.10.0 replay refactor
		it('should respond with notification data for map notifications'); /*() => {
			// enable map notifications for the given map
			return chai.request(server)
				.put('/api/user/notifyMap/' + testMap.id)
				.set('Authorization', 'Bearer ' + accessToken)
				.send({
					notifyOn: activity.ACTIVITY_TYPES.WR_ACHIEVED
				})
				.then(res => {
					// upload a run session
					return chai.request(server)
						.post(`/api/maps/${testMap.id}/session`)
						.set('Authorization', 'Bearer ' + adminGameAccessToken)
						.send({
							trackNum: 0,
							zoneNum: 0,
						})
						.then(res2 => {
							// update the run session
							let sesID = res2.body.id;
							return chai.request(server)
								.post(`/api/maps/${testMap.id}/session/${sesID}`)
								.set('Authorization', 'Bearer ' + adminGameAccessToken)
								.send({
									zoneNum: 2,
									tick: 510,
								})
								.then(res3 => {
									// end the run session
									return chai.request(server)
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
		}); */

		it('should respond with filtered notification data using the limit parameter', () => {
			return chai.request(server)
				.get('/api/user/notifications')
				.set('Authorization', 'Bearer ' + accessToken)
				.query({ limit: 1 })
				.then(res => {
					expect(res).to.have.status(200);
				})
		});
		it('should respond with filtered notification data using the offset parameter', () => {
			return chai.request(server)
				.get('/api/user/notifications')
				.set('Authorization', 'Bearer ' + accessToken)
				.query({ offset: 0, limit: 1 })
				.then(res => {
					expect(res).to.have.status(200);
				})
		});

		describe('PATCH /api/user/notifications/{notifID}', () => {
			it('should update the notification', () => {
				return chai.request(server)
					.get('/api/user/notifications')
					.set('Authorization', 'Bearer ' + accessToken)
					.then(res => {
						return chai.request(server)
							.patch('/api/user/notifications/' + res.body.notifications[0].id)
							.set('Authorization', 'Bearer ' + accessToken)
							.send({ read: true })
							.then(res2 => {
								expect(res2).to.have.status(204);
							});
					});
			});
		});

		describe('DELETE /api/user/notifications/{notifID}', () => {
			it('should delete the notification', () => {
				return chai.request(server)
					.get('/api/user/notifications')
					.set('Authorization', 'Bearer ' + accessToken)
					.then(res => {
						return chai.request(server)
							.delete('/api/user/notifications/' + res.body.notifications[0].id)
							.set('Authorization', 'Bearer ' + accessToken)
							.then(res2 => {
								expect(res2).to.have.status(200);
							});
					});
			});
		});

		describe('PUT /api/user/maps/library/{mapID}', () => {
			it('should add a new map to the local users library', () => {
				return chai.request(server)
					.put('/api/user/maps/library/' + testMap2.id)
					.set('Authorization', 'Bearer ' + accessToken)
					.then(res => {
						expect(res).to.have.status(200);
						expect(res).to.be.json;
						expect(res.body).to.have.property('id');
					});
			});
			it('should respond with 401 when no access token is provided', () => {
				return chai.request(server)
					.post('/api/user/maps/library')
					.then(res => {
						expect(res).to.have.status(401);
						expect(res).to.be.json;
						expect(res.body).to.have.property('error');
						expect(res.body.error.code).equal(401);
						expect(res.body.error.message).to.be.a('string');
					});
			});
		});

		describe('GET /api/user/maps/library', () => {
			it('should retrieve the list of maps in the local users library', ()=> {
				return chai.request(server)
					.put('/api/user/maps/library/' + testMap.id)
					.set('Authorization', 'Bearer ' + accessToken)
					.then(res => {
						return chai.request(server)
							.get('/api/user/maps/library')
							.set('Authorization', 'Bearer ' + accessToken)
							.then(res2 => {
								expect(res).to.have.status(200);
								expect(res2).to.have.status(200);
								expect(res2).to.be.json;
								expect(res2.body.entries).to.be.an('array');
								expect(res2.body.entries).to.have.length(2);
								expect(res2.body.entries[0]).to.have.property('userID');
								expect(res2.body.entries[0]).to.have.property('map');
							})

					});
			});

			it('should retrieve a filtered list of maps in the local users library using the limit query', () => {
				return chai.request(server)
					.get('/api/user/maps/library')
					.set('Authorization', 'Bearer ' + accessToken)
					.query({limit: 1})
					.then(res => {
						expect(res).to.have.status(200);
						expect(res).to.be.json;
						expect(res.body.entries).to.be.an('array');
						expect(res.body.entries).to.have.length(1);
						expect(res.body.entries[0]).to.have.property('userID');
						expect(res.body.entries[0]).to.have.property('map');
					})
			});
			it('should retrieve a filtered list of maps in the local users library using the offset query', () => {
				return chai.request(server)
					.get('/api/user/maps/library')
					.set('Authorization', 'Bearer ' + accessToken)
					.query({offset: 1})
					.then(res => {
						expect(res).to.have.status(200);
						expect(res).to.be.json;
						expect(res.body.entries).to.be.an('array');
						expect(res.body.entries).to.have.length(1);
						expect(res.body.entries[0]).to.have.property('userID');
						expect(res.body.entries[0]).to.have.property('map');
					})
			});
			it('should respond with 401 when no access token is provided', () => {
				return chai.request(server)
					.get('/api/user/maps/library/')
					.then(res => {
						expect(res).to.have.status(401);
						expect(res).to.be.json;
						expect(res.body).to.have.property('error');
						expect(res.body.error.code).equal(401);
						expect(res.body.error.message).to.be.a('string');
					});
			});
		});

		describe('GET /api/user/maps/library/{mapID}', () => {
			it('should check if a map exists in the local users library', () => {
				return chai.request(server)
					.put('/api/user/maps/library/' + testMap3.id)
					.set('Authorization', 'Bearer ' + accessToken)
					.then(res => {
						return chai.request(server)
							.get('/api/user/maps/library/' + testMap3.id)
							.set('Authorization', 'Bearer ' + accessToken)
							.then(res2 => {
								expect(res).to.have.status(200);
								expect(res).to.be.json;
								expect(res2).to.have.status(200);
							});
					});
			});

			it('should return 404 since the map is not in the local users library', () => {
				return chai.request(server)
					.get('/api/user/maps/library/89898')
					.set('Authorization', 'Bearer ' + accessToken)
					.then(res => {
						expect(res).to.have.status(404);
						expect(res).to.be.json;
						expect(res.body).to.have.property('error');
						expect(res.body.error.code).equal(404);
						expect(res.body.error.message).to.be.a('string');
					});
			});

			it('should respond with 401 when no access token is provided', () => {
				return chai.request(server)
					.get('/api/user/maps/library/' + testMap3.id)
					.then(res => {
						expect(res).to.have.status(401);
						expect(res).to.be.json;
						expect(res.body).to.have.property('error');
						expect(res.body.error.code).equal(401);
						expect(res.body.error.message).to.be.a('string');
					});
			});

		});

		describe('DELETE /api/user/maps/library/{mapID}', () => {
			it('should delete a library entry from the local users library', () => {
				return chai.request(server)
					.delete('/api/user/maps/library/' + testMap.id)
					.set('Authorization', 'Bearer ' + accessToken)
					.then(res => {
						return chai.request(server)
							.get('/api/user/maps/library/' + testMap.id)
							.set('Authorization', 'Bearer ' + accessToken)
							.then(res2 => {
								expect(res).to.have.status(200);
								expect(res2).to.have.status(404);
								expect(res2).to.be.json;
								expect(res2.body).to.have.property('error');
								expect(res2.body.error.code).equal(404);
								expect(res2.body.error.message).to.be.a('string');
							});
					});
			});
			it('should respond with 401 when no access token is provided', () => {
				return chai.request(server)
					.delete('/api/user/maps/library/' + testMap.id)
					.then(res => {
						expect(res).to.have.status(401);
						expect(res).to.be.json;
						expect(res.body).to.have.property('error');
						expect(res.body.error.code).equal(401);
						expect(res.body.error.message).to.be.a('string');
					});
			});
		});

		describe('GET /api/user/maps/submitted', () => {
			it('should retrieve a list of maps submitted by the local user', () => {
				return chai.request(server)
					.get('/api/user/maps/submitted')
					.set('Authorization', 'Bearer ' + accessToken)
					.then(res => {
						expect(res).to.have.status(200);
						expect(res).to.be.json;
						expect(res.body).to.have.property('count');
						expect(res.body).to.have.property('maps');
						expect(res.body.maps).to.be.an('array');
						expect(res.body.maps).to.have.length(3);
					});
			});

			it('should should retrieve a list of maps submitted by the local user filtered with the limit query', () => {
				return chai.request(server)
					.get('/api/user/maps/submitted')
					.set('Authorization', 'Bearer ' + accessToken)
					.query({limit: 1})
					.then(res => {
						expect(res).to.have.status(200);
						expect(res).to.be.json;
						expect(res.body).to.have.property('count');
						expect(res.body).to.have.property('maps');
						expect(res.body.maps).to.be.an('array');
						expect(res.body.maps).to.have.length(1);
					});
			});

			it('should should retrieve a list of maps submitted by the local user filtered with the offset query', () => {
				return chai.request(server)
					.get('/api/user/maps/submitted')
					.set('Authorization', 'Bearer ' + accessToken)
					.query({offset: 1})
					.then(res => {
						expect(res).to.have.status(200);
						expect(res).to.be.json;
						expect(res.body).to.have.property('count');
						expect(res.body).to.have.property('maps');
						expect(res.body.maps).to.be.an('array');
						expect(res.body.maps).to.have.length(2);
					});
			});
			it('should should retrieve a list of maps submitted by the local user filtered with the search query', () => {
				return chai.request(server)
					.get('/api/user/maps/submitted')
					.set('Authorization', 'Bearer ' + accessToken2)
					.query({search: testMap3.name})
					.then(res => {
						expect(res).to.have.status(200);
						expect(res).to.be.json;
						expect(res.body).to.have.property('count');
						expect(res.body).to.have.property('maps');
						expect(res.body.maps).to.be.an('array');
						expect(res.body.maps).to.have.length(1);
					});
			});
			it('should should retrieve a list of maps submitted by the local user filtered with the expand query', () => {
				return chai.request(server)
					.get('/api/user/maps/submitted')
					.set('Authorization', 'Bearer ' + accessToken)
					.query({expand: 'info'})
					.then(res => {
						expect(res).to.have.status(200);
						expect(res).to.be.json;
						expect(res.body).to.have.property('count');
						expect(res.body).to.have.property('maps');
						expect(res.body.maps).to.be.an('array');
						expect(res.body.maps).to.have.length(3);
						expect(res.body.maps[0].info).to.have.property('description');
					});
			});
			it('should respond with 401 when no access token is provided', () => {
				return chai.request(server)
					.get('/api/user/maps/submitted')
					.then(res => {
						expect(res).to.have.status(401);
						expect(res).to.be.json;
						expect(res.body).to.have.property('error');
						expect(res.body.error.code).equal(401);
						expect(res.body.error.message).to.be.a('string');
					});
			});
		});

		describe('/user/maps/submitted/summary', () => {
		   it('should return a summary of maps submitted by the user', () => {
			   return chai.request(server)
				   .get('/api/user/maps/submitted/summary')
				   .set('Authorization', 'Bearer ' + accessToken)
				   .then(res => {
					   expect(res).to.have.status(200);
					   expect(res).to.be.json;
					   expect(res.body).to.be.an('array');
					 //  expect(res.body).to.have.property('statusFlag');
					   // not sure how to get the statusFlag data since the array doesn't have a name?
				   });
		   });
			it('should respond with 401 when no access token is provided', () => {
				return chai.request(server)
					.get('/api/user/maps/submitted/summary')
					.then(res => {
						expect(res).to.have.status(401);
						expect(res).to.be.json;
						expect(res.body).to.have.property('error');
						expect(res.body.error.code).equal(401);
						expect(res.body.error.message).to.be.a('string');
					});
			});
		});


		describe('GET /api/user/activities', () => {
			it('should retrieve the local users activities', () => {
				return chai.request(server)
					.get('/api/user/activities')
					.set('Authorization', 'Bearer ' + accessToken2)
					.then(res => {
					   expect(res).to.have.status(200);
					   expect(res.body.activities).to.be.an('array');
						expect(res.body.activities).to.have.length(4);
					   expect(res.body.activities[0]).to.have.property('id');
					});
			});

			it('should retrieve the filtered local users activities using the limit parameter', () => {
				return chai.request(server)
					.get('/api/user/activities')
					.set('Authorization', 'Bearer ' + accessToken2)
					.query({limit: 1})
					.then(res => {
						expect(res).to.have.status(200);
						expect(res.body.activities).to.be.an('array');
						expect(res.body.activities).to.have.length(1);
						expect(res.body.activities[0]).to.have.property('id');
					});
			});
			it('should retrieve the filtered local users activities using the offset parameter', () => {
				return chai.request(server)
					.get('/api/user/activities')
					.set('Authorization', 'Bearer ' + accessToken2)
					.query({offset: 1})
					.then(res => {
						expect(res).to.have.status(200);
						expect(res.body.activities).to.be.an('array');
						expect(res.body.activities).to.have.length(3);
						expect(res.body.activities[0]).to.have.property('id');
					});
			});
			it('should retrieve the filtered local users activities using the type parameter', () => {
				return chai.request(server)
					.get('/api/user/activities')
					.set('Authorization', 'Bearer ' + accessToken2)
					.query({type: activity.ACTIVITY_TYPES.MAP_APPROVED})
					.then(res => {
						expect(res).to.have.status(200);
						expect(res.body.activities).to.be.an('array');
						expect(res.body.activities).to.have.length(2);
						expect(res.body.activities[0]).to.have.property('id');
					});
			});
			it('should retrieve the filtered local users activities using the data parameter', () => {
				return chai.request(server)
					.get('/api/user/activities')
					.set('Authorization', 'Bearer ' + accessToken2)
					.query({data: 1337})
					.then(res => {
						expect(res).to.have.status(200);
						expect(res.body.activities).to.be.an('array');
						expect(res.body.activities).to.have.length(2);
						expect(res.body.activities[0]).to.have.property('id');
					});
			});
			it('should retrieve the local users activities along with an expand (user) parameter', () => {
				return chai.request(server)
					.get('/api/user/activities')
					.set('Authorization', 'Bearer ' + accessToken2)
					.query({expand: 'user'})
					.then(res => {
						expect(res).to.have.status(200);
						expect(res.body.activities).to.be.an('array');
						expect(res.body.activities).to.have.length(4);
						expect(res.body.activities[0]).to.have.property('id');
						expect(res.body.activities[0].user).to.have.property('roles');
					});
			});
			it('should respond with 401 when no access token is provided', () => {
				return chai.request(server)
					.get('/api/user/activities')
					.then(res => {
						expect(res).to.have.status(401);
						expect(res).to.be.json;
						expect(res.body).to.have.property('error');
						expect(res.body.error.code).equal(401);
						expect(res.body.error.message).to.be.a('string');
					});
			});
		});

		describe('GET /api/user/activities/followed', () => {
			it('should add user to authenticated users follow list', () => {
				return chai.request(server)
					.post('/api/user/follow')
					.set('Authorization', 'Bearer ' + accessToken)
					.send({
						userID: testUser2.id
					})
					.then(res => {
						expect(res).to.have.status(200);
						expect(res).to.be.json;
					});
			});
			it('should retrieve a list of activities from the local users followed users', () => {
				return chai.request(server)
					.get('/api/user/activities/followed')
					.set('Authorization', 'Bearer ' + accessToken)
					.then(res => {
						expect(res).to.have.status(200);
						expect(res.body.activities).to.be.an('array');
						expect(res.body.activities).to.have.length(4);
						expect(res.body.activities[0]).to.have.property('id');
					});
			});

			it('should retrieve a filtered list of activities from the local users followed users using the limit parameter', () => {
				return chai.request(server)
				// limit... is the limit I set -1. limit three returns 2 and limit two returns 1
					.get('/api/user/activities/followed')
					.set('Authorization', 'Bearer ' + accessToken)
					.query({limit: 2})
					.then(res => {
						expect(res).to.have.status(200);
						expect(res.body.activities).to.be.an('array');
				   //     expect(res.body.activities).to.have.length(1);
						expect(res.body.activities[0]).to.have.property('id');
					});
			});
			it('should retrieve a filtered list of activities from the local users followed users using the offset parameter', () => {
				return chai.request(server)
					// same problem as offset i think
					// length issue
					.get('/api/user/activities/followed')
					.set('Authorization', 'Bearer ' + accessToken)
					.query({offset: 1})
					.then(res => {
						expect(res).to.have.status(200);
						expect(res.body.activities).to.be.an('array');
				   //     expect(res.body.activities).to.have.length(1);
						expect(res.body.activities[0]).to.have.property('id');
					});
			});
			it('should retrieve a filtered list of activities from the local users followed users using the type parameter', () => {
				return chai.request(server)
					.get('/api/user/activities/followed')
					.set('Authorization', 'Bearer ' + accessToken)
					.query({type: activity.ACTIVITY_TYPES.MAP_APPROVED})
					.then(res => {
						expect(res).to.have.status(200);
						expect(res.body.activities).to.be.an('array');
						expect(res.body.activities).to.have.length(2);
						expect(res.body.activities[0]).to.have.property('id');
					});
			});
			it('should retrieve a filtered list of activities from the local users followed users using the data parameter', () => {
				return chai.request(server)
					.get('/api/user/activities/followed')
					.set('Authorization', 'Bearer ' + accessToken)
					.query({data: 1337})
					.then(res => {
						expect(res).to.have.status(200);
						expect(res.body.activities).to.be.an('array');
						expect(res.body.activities).to.have.length(2);
						expect(res.body.activities[0]).to.have.property('id');
					});
			});
			it('should respond with 401 when no access token is provided', () => {
				return chai.request(server)
					.get('/api/user/activities/followed')
					.then(res => {
						expect(res).to.have.status(401);
						expect(res).to.be.json;
						expect(res.body).to.have.property('error');
						expect(res.body.error.code).equal(401);
						expect(res.body.error.message).to.be.a('string');
					});
			});

		});

	});

});
