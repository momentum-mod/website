'use strict';
process.env.NODE_ENV = 'test';

const {forceSyncDB, Map, MapInfo, MapCredit, User, Report, XPSystems} = require('../config/sqlize'),
	chai = require('chai'),
	chaiHttp = require('chai-http'),
	expect = chai.expect,
	server = require('../server.js'),
	auth = require('../src/models/auth'),
	map = require('../src/models/map'),
	user = require('../src/models/user'),
	xpSystems = require('../src/models/xp-systems'),
	report = require('../src/models/report');

chai.use(chaiHttp);

describe('admin', () => {

	let accessToken = null;
	let adminAccessToken = null;
	let adminGameAccessToken = null;
	const testUser = {
		id: 1,
		steamID: '1254652365',
		roles: user.Role.VERIFIED,
		bans: 0,
	};

	const testAdmin = {
		id: 2,
		steamID: '9856321549856',
		roles: user.Role.ADMIN,
		bans: 0,
	};

	const testAdminGame = {
		id: 3,
		steamID: '5698752164498',
		roles: user.Role.ADMIN,
		bans: 0,
	};
	const testDeleteUser = {
		id: 4,
		steamID: '1351351321',
		roles: 0,
		bans: 0,
	};
	let testMergeUser1;
	let testMergeUser2;

	const testMap = {
		name: 'test_map',
		type: map.MAP_TYPE.UNKNOWN,
		id: 1,
		statusFlag: map.STATUS.APPROVED,
		submitterID: testUser.id,
		info: {
			description: 'newmap_5',
			numTracks: 1,
			creationDate: new Date(),
		},
		tracks: [{
			trackNum: 0,
			numZones: 1,
			difficulty: 2,
			isLinear: false,
		}],
		credits: {
			id: 1,
			type: map.CreditType.AUTHOR,
			userID: testUser.id,
		},
	};

	const testMap2 ={
		id: 2,
		name: 'test_map2',
		submitterID: testUser.id,
		info: {
			description: 'My first map!!!!',
			numTracks: 1,
			creationDate: new Date(),
		},
		tracks: [{
			trackNum: 0,
			numZones: 1,
			difficulty: 5,
			isLinear: true,
		}],
		credits: {
			id: 2,
			type: map.CreditType.AUTHOR,
			userID: testUser.id,
		},
	};
	const testMap3 ={
		id: 3,
		name: 'test_map3',
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
		}],
		credits: {
			id: 3,
			type: map.CreditType.AUTHOR,
			userID: testUser.id,
		},
	};
	const testMap4 ={
		id: 4,
		name: 'test_map4',
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
		}],
		credits: {
			id: 4,
			type: map.CreditType.AUTHOR,
			userID: testUser.id,
		},
	};
	const testMap5 ={
		id: 5,
		name: 'test_map5',
		submitterID: testAdmin.id,
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
		}],
		credits: {
			id: 5,
			type: map.CreditType.AUTHOR,
			userID: testAdmin.id,
		},
	};
	const testMap6 ={
		id: 6,
		name: 'test_map6',
		submitterID: testAdmin.id,
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
		}],
		credits: {
			id: 6,
			type: map.CreditType.AUTHOR,
			userID: testAdmin.id,
		},
	};
	const uniqueMap ={
		id: 7,
		name: 'unique_map7',
		submitterID: testAdmin.id,
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
		}],
		credits: {
			id: 7,
			type: map.CreditType.AUTHOR,
			userID: testAdmin.id,
		},
	};
	const testReport = {
		id: 1,
		data: 1,
		type: report.ReportType.USER_PROFILE_REPORT,
		category: report.ReportCategory.OTHER,
		submitterID: testUser.id,
		message: 'I am who I am who am I?',
		resolved: false,
		resolutionMessage: '',
	};
	const testReport2 = {
		id: 2,
		data: 1,
		tpe: report.ReportType.MAP_REPORT,
		category: report.ReportCategory.OTHER,
		submitterID: testUser.id,
		message: 'What are you doing',
		resolved: true,
		resolutionMessage: 'idk what im doing',
	};

	before(() => {
		return forceSyncDB()
			.then(() => {
				return auth.genAccessToken(testUser);
			}).then((token) => {
				accessToken = token;
				return User.create(testUser);
			}).then(() => {
				testAdmin.roles |= user.Role.ADMIN;
				return auth.genAccessToken(testAdmin);
			}).then((token) => {
				adminAccessToken = token;
				return User.create(testAdmin);
			}).then((testAd) => {
				testMap5.submitterID = testAd.id;
				testMap6.submitterID = testAd.id;
				uniqueMap.submitterID = testAd.id;
				testAdminGame.roles = user.Role.ADMIN;
				return auth.genAccessToken(testAdminGame, true);
			}).then((token) => {
				adminGameAccessToken = token;
				return User.create(testAdminGame);
			}).then(() => {
				return User.create(testDeleteUser);
			}).then(() => {
				return Map.create(testMap, {
					include: [
						{model: MapInfo, as: 'info',},
						{model: MapCredit, as: 'credits'}
					],
				});
			}).then(() => {
				return Map.create(testMap2, {
					include: [
						{model: MapInfo, as: 'info',},
						{model: MapCredit, as: 'credits'}
					],
				});
			}).then(() => {
				return Map.create(testMap3, {
					include: [
						{model: MapInfo, as: 'info',},
						{model: MapCredit, as: 'credits'}
					],
				});
			}).then(() => {
				return Map.create(testMap4, {
					include: [
						{model: MapInfo, as: 'info',},
						{model: MapCredit, as: 'credits'}
					],
				});
			}).then(() => {
				return Map.create(testMap5, {
					include: [
						{model: MapInfo, as: 'info',},
						{model: MapCredit, as: 'credits'}
					],
				});
			}).then(() => {
				return Map.create(testMap6, {
					include: [
						{model: MapInfo, as: 'info',},
						{model: MapCredit, as: 'credits'}
					],
				});
			}).then(() => {
				return Map.create(uniqueMap, {
					include: [
						{model: MapInfo, as: 'info'},
						{model: MapCredit, as: 'credits'}
					],
				});
			}).then(() => {
				uniqueMap.id = map.id;
				return Report.bulkCreate([
					testReport,
					testReport2,
				]);
			}).then(() => {
				// Create our default XP systems table if we don't already have it
				return xpSystems.initXPSystems(XPSystems);
			}).then(() => {
				return user.createPlaceholder('Placeholder1');
			}).then((usr) => {
				testMergeUser1 = usr;
				return user.createPlaceholder('Placeholder2');
			}).then((usr2) => {
				testMergeUser2 = usr2;
				return Promise.resolve();
			});
	});

	describe('modules', () => {

	});

	describe('endpoints', () => {

		describe('POST /api/admin/users', () => {
			it('should create a placeholder user', () => {
				return chai.request(server)
					.post('/api/admin/users')
					.set('Authorization', 'Bearer ' + adminAccessToken)
					.send({
						alias: 'Placeholder3'
					})
					.then(res => {
						expect(res).to.have.status(200);
						expect(res).to.be.json;
						expect(res.body).to.have.property('alias');
						expect(res.body.alias).equal('Placeholder3');
					});
			});
		});

		describe('POST /api/admin/users/merge', () => {
			it('should merge two accounts together', () => {
				return chai.request(server)
					.post('/api/admin/users/merge')
					.set('Authorization', 'Bearer ' + adminAccessToken)
					.send({
						placeholderID: testMergeUser1.id,
						realID: testUser.id,
					})
					.then(res => {
						expect(res).to.have.status(200);
					});
			})
		});

		describe('DELETE /api/admin/users/{userID}', () => {
			it('should delete a user', () => {
				return chai.request(server)
					.delete('/api/admin/users/' + testDeleteUser.id)
					.set('Authorization', 'Bearer ' + adminAccessToken)
					.then(res => {
						expect(res).to.have.status(200);
					});
			})
		});

		describe('PATCH /api/admin/users/{userID}', () => {
			it('should respond with 403 when not an admin', () => {
				return chai.request(server)
					.patch('/api/admin/users/' + testUser.id)
					.set('Authorization', 'Bearer ' + accessToken)
					.send({
						bans: user.Ban.BANNED_BIO
					})
					.then(res => {
						expect(res).to.have.status(403);
						expect(res).to.be.json;
						expect(res.body).to.have.property('error');
						expect(res.body.error.code).equal(403);
						expect(res.body.error.message).to.be.a('string');
					});
			});
			it('should respond with 403 when authenticated from game', () => {
				return chai.request(server)
					.patch('/api/admin/users/' + testUser.id)
					.set('Authorization', 'Bearer ' + adminGameAccessToken)
					.send({
						bans: user.Ban.BANNED_BIO
					})
					.then(res => {
						expect(res).to.have.status(403);
						expect(res).to.be.json;
						expect(res.body).to.have.property('error');
						expect(res.body.error.code).equal(403);
						expect(res.body.error.message).to.be.a('string');
					});
			});

			it('should update a specific user', () => {
				return chai.request(server)
					.patch('/api/admin/users/' + testUser.id)
					.set('Authorization', 'Bearer ' + adminAccessToken)
					.send({
						bans: user.Ban.BANNED_BIO
					})
					.then(res => {
						expect(res).to.have.status(204);
					});
			});
			it('should respond with 401 when no access token is provided', () => {
				return chai.request(server)
					.patch('/api/admin/users/' + testUser.id)
					.then(res => {
						expect(res).to.have.status(401);
						expect(res).to.be.json;
						expect(res.body).to.have.property('error');
						expect(res.body.error.code).equal(401);
						expect(res.body.error.message).to.be.a('string');
					});
			});
		});

		describe('GET /api/admin/maps', () => {
			it('should respond with 403 when not an admin', () => {
				return chai.request(server)
					.get('/api/admin/maps/')
					.set('Authorization', 'Bearer ' + accessToken)
					.then(res => {
						expect(res).to.have.status(403);
						expect(res).to.be.json;
						expect(res.body).to.have.property('error');
						expect(res.body.error.code).equal(403);
						expect(res.body.error.message).to.be.a('string');
					});
			});
			it('should respond with 403 when authenticated from game', () => {
				return chai.request(server)
					.get('/api/admin/maps/')
					.set('Authorization', 'Bearer ' + adminGameAccessToken)
					.then(res => {
						expect(res).to.have.status(403);
						expect(res).to.be.json;
						expect(res.body).to.have.property('error');
						expect(res.body.error.code).equal(403);
						expect(res.body.error.message).to.be.a('string');
					});
			});
			it('should respond with 401 when no access token is provided', () => {
				return chai.request(server)
					.get('/api/admin/maps/')
					.then(res => {
						expect(res).to.have.status(401);
						expect(res).to.be.json;
						expect(res.body).to.have.property('error');
						expect(res.body.error.code).equal(401);
						expect(res.body.error.message).to.be.a('string');
					});
			});
			it('should respond with a list of maps', () => {
				return chai.request(server)
					.get('/api/admin/maps/')
					.set('Authorization', 'Bearer ' + adminAccessToken)
					.then(res => {
						expect(res).to.have.status(200);
						expect(res).to.be.json;
						expect(res.body).to.have.property('maps');
						expect(res.body.maps).to.be.an('array');
						expect(res.body.maps).to.have.length(7);
						expect(res.body.maps[0]).to.have.property('name');
					});
			});
			it('should respond with a limited list of maps when using the limit query param', () => {
				return chai.request(server)
					.get('/api/admin/maps/')
					.set('Authorization', 'Bearer ' + adminAccessToken)
					.query({limit: 2})
					.then(res => {
						expect(res).to.have.status(200);
						expect(res).to.be.json;
						expect(res.body).to.have.property('maps');
						expect(res.body.maps).to.be.an('array');
						expect(res.body.maps).to.have.length(2);
						expect(res.body.maps[0]).to.have.property('name');
					});
			});

			it('should respond with a different list of maps when using the offset query param', () => {
				return chai.request(server)
					.get('/api/admin/maps/')
					.set('Authorization', 'Bearer ' + adminAccessToken)
					.query({offset: 2})
					.then(res => {
						expect(res).to.have.status(200);
						expect(res).to.be.json;
						expect(res.body).to.have.property('maps');
						expect(res.body.maps).to.be.an('array');
						expect(res.body.maps).to.have.length(5);
						expect(res.body.maps[0]).to.have.property('name');
					});
			});
			it('should respond with a filtered list of maps when using the search query param', () => {
				return chai.request(server)
					.get('/api/admin/maps/')
					.set('Authorization', 'Bearer ' + adminAccessToken)
					.query({search: 'uni'})
					.then(res => {
						expect(res).to.have.status(200);
						expect(res).to.be.json;
						expect(res.body).to.have.property('maps');
						expect(res.body.maps).to.be.an('array');
						expect(res.body.maps).to.have.length(1);
						expect(res.body.maps[0]).to.have.property('name');
					});
			});
			it('should respond with a filtered list of maps when using the submitterID query param', () => {
				return chai.request(server)
					.get('/api/admin/maps/')
					.set('Authorization', 'Bearer ' + adminAccessToken)
					.query({submitterID: testUser.id})
					.then(res => {
						expect(res).to.have.status(200);
						expect(res).to.be.json;
						expect(res.body).to.have.property('maps');
						expect(res.body.maps).to.be.an('array');
						expect(res.body.maps).to.have.length(4);
						expect(res.body.maps[0]).to.have.property('name');
					});
			});


			it('should respond with a list of maps when using the expand info query param', () => {
				return chai.request(server)
					.get('/api/admin/maps/')
					.set('Authorization', 'Bearer ' + adminAccessToken)
					.query({expand: 'info'})
					.then(res => {
						expect(res).to.have.status(200);
						expect(res).to.be.json;
						expect(res.body).to.have.property('maps');
						expect(res.body.maps).to.be.an('array');
						expect(res.body.maps).to.have.length(7);
						expect(res.body.maps[0]).to.have.property('name');
						expect(res.body.maps[0]).to.have.property('info');
						expect(res.body.maps[0].info).to.have.property('description');
					});
			});

			it('should respond with a list of maps when using the expand submitter query param', () => {
				return chai.request(server)
					.get('/api/admin/maps/')
					.set('Authorization', 'Bearer ' + adminAccessToken)
					.query({expand: 'submitter'})
					.then(res => {
						expect(res).to.have.status(200);
						expect(res).to.be.json;
						expect(res.body).to.have.property('maps');
						expect(res.body.maps).to.be.an('array');
						expect(res.body.maps).to.have.length(7);
						expect(res.body.maps[0]).to.have.property('name');
						expect(res.body.maps[0].submitter).to.have.property('roles');
					});
			});

			it('should respond with a list of maps when using the expand credits query param', () => {
				return chai.request(server)
					.get('/api/admin/maps/')
					.set('Authorization', 'Bearer ' + adminAccessToken)
					.query({expand: 'credits'})
					.then(res => {
						expect(res).to.have.status(200);
						expect(res).to.be.json;
						expect(res.body).to.have.property('maps');
						expect(res.body.maps).to.be.an('array');
						expect(res.body.maps).to.have.length(7);
						expect(res.body.maps[0]).to.have.property('name');
						expect(res.body.maps[0]).to.have.property('credits');
						expect(res.body.maps[0].credits[0]).to.have.property('type');
					});
			});


			it('should respond with a filtered list of maps when using the status query param', () => {
				return chai.request(server)
					.get('/api/admin/maps/')
					.set('Authorization', 'Bearer ' + adminAccessToken)
					.query({
						status: map.STATUS.APPROVED
					})
					.then(res => {
						expect(res).to.have.status(200);
						expect(res).to.be.json;
						expect(res.body).to.have.property('maps');
						expect(res.body.maps).to.be.an('array');
						expect(res.body.maps).to.have.length(1);
						expect(res.body.maps[0]).to.have.property('name');
					});
			});


			it('should respond with a filtered list of maps when using the priority query param', () => {
				return chai.request(server)
					.get('/api/admin/maps/')
					.set('Authorization', 'Bearer ' + adminAccessToken)
					.query({
						priority: true
					})
					.then(res => {
						expect(res).to.have.status(200);
						expect(res).to.be.json;
						expect(res.body).to.have.property('maps');
						expect(res.body.maps).to.be.an('array');
						expect(res.body.maps).to.have.length(3);
						expect(res.body.maps[0]).to.have.property('name');
					});
			});

		});

		describe('PATCH /api/admin/maps/{mapID}', () => {
			it('should respond with 403 when not an admin', () => {
				return chai.request(server)
					.patch('/api/admin/maps/' + testMap.id)
					.set('Authorization', 'Bearer ' + accessToken)
					.send({
						statusFlag: 1,
					})
					.then(res => {
						expect(res).to.have.status(403);
						expect(res).to.be.json;
						expect(res.body).to.have.property('error');
						expect(res.body.error.code).equal(403);
						expect(res.body.error.message).to.be.a('string');
					});
			});
			it('should respond with 403 when authenticated from game', () => {
				return chai.request(server)
					.patch('/api/admin/maps/' + testMap.id)
					.set('Authorization', 'Bearer ' + adminGameAccessToken)
					.send({
						statusFlag: 1,
					})
					.then(res => {
						expect(res).to.have.status(403);
						expect(res).to.be.json;
						expect(res.body).to.have.property('error');
						expect(res.body.error.code).equal(403);
						expect(res.body.error.message).to.be.a('string');
					});
			});
			it('should update a specific map', () => {
				return chai.request(server)
					.patch('/api/admin/maps/' + testMap.id)
					.set('Authorization', 'Bearer ' + adminAccessToken)
					.send({
						statusFlag: 1,
					})
					.then(res => {
						expect(res).to.have.status(204);
					});
			});
			it('should respond with 401 when no access token is provided', () => {
				return chai.request(server)
					.patch('/api/admin/maps/' + testMap.id)
					.then(res => {
						expect(res).to.have.status(401);
						expect(res).to.be.json;
						expect(res.body).to.have.property('error');
						expect(res.body.error.code).equal(401);
						expect(res.body.error.message).to.be.a('string');
					});
			});
		});

		describe('GET /api/admin/reports', () => {
			it('should respond with a list of reports', () => {
				return chai.request(server)
					.get('/api/admin/reports')
					.set('Authorization', 'Bearer ' + adminAccessToken)
					.then(res => {
						expect(res).to.have.status(200);
						expect(res).to.be.json;
						expect(res.body).to.have.property('count');
						expect(res.body.count).to.be.a('number');
						expect(res.body).to.have.property('reports');
						expect(res.body.reports).to.be.an('array');
					});
			});
			it('should limit the result set when using the limit query param', () => {
				return chai.request(server)
					.get('/api/admin/reports')
					.set('Authorization', 'Bearer ' + adminAccessToken)
					.query({limit: 1})
					.then(res => {
						expect(res.body.reports).to.have.lengthOf(1);
					});
			});
			it('should offset the result set when using the offset query param');
			it('should filter with the resolved query param');
		});

		describe('PATCH /api/admin/reports/{reportID}', () => {
			it('should update a report', () => {
				return chai.request(server)
					.patch('/api/admin/reports/' + testReport.id)
					.set('Authorization', 'Bearer ' + adminAccessToken)
					.send({
						resolved: true,
						resolutionMessage: 'I gave the reporter the bepis they wanted',
					})
					.then(res => {
						expect(res).to.have.status(204);
					});
			});
		});

		describe('DELETE /api/admin/maps/{mapID}', () => {
			it('should delete a map', () => {
				return chai.request(server)
					.delete('/api/admin/maps/' + testMap.id)
					.set('Authorization', 'Bearer ' + adminAccessToken)
					.then(res => {
						expect(res).to.have.status(200);
					});
			});
		});

		describe('PATCH /api/admin/user-stats', () => {
			it('should update all user stats', () => {
				return chai.request(server)
					.patch('/api/admin/user-stats')
					.set('Authorization', 'Bearer ' + adminAccessToken)
					.send({
						cosXP: 1337,
					})
					.then(res => {
						expect(res).to.have.status(204);
					});
			});
		});

		describe('GET /api/admin/xpsys', () => {
			it('should return the XP system variables', () => {
				return chai.request(server)
					.get('/api/admin/xpsys')
					.set('Authorization', 'Bearer ' + adminAccessToken)
					.then(res => {
						expect(res).to.have.status(200);
					});
			});
		});

		describe('PUT /api/admin/xpsys', () => {
			it('should update the XP system variables', () => {
				return chai.request(server)
					.put('/api/admin/xpsys')
					.set('Authorization', 'Bearer ' + adminAccessToken)
					.send({
						rankXP: {
							top10: {
								WRPoints: 3500,
								rankPercentages: [
									1,
									.75,
									.68,
									.61,
									.57,
									.53,
									.505,
									.48,
									.455,
									.43,
								],
							},
							formula: {
								A: 50000,
								B: 49,
							},
							groups: {
								maxGroups: 4,
								groupScaleFactors: [
									1,
									1.5,
									2,
									2.5
								],
								groupExponents: [
									0.5,
									0.56,
									0.62,
									0.68
								],
								groupMinSizes: [
									10,
									45,
									125,
									250
								],
								groupPointPcts: [ // How much, of a % of WRPoints, does each group get
									0.2,
									0.13,
									0.07,
									0.03,
								],
							},
						},
						cosXP: {}
					})
					.then(res => {
						expect(res).to.have.status(204);
					});
			});
		});
	});

});
